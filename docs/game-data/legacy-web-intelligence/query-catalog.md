# Query catalog — consolidated reference

One table per row, every table found in the legacy web app, with its key
columns and how it joins to everything else. Full detail (query text,
call sites, confidence) lives in the per-domain files; this is the
lookup-table view. "DB" is `account` or `game` (both physically the same
`MuOnline` SQL Server database on this install, per `constants.php`'s
`WEB_DB` constant) or `web` (the CMS's own `DmN_*` tables, same database).

| Table | DB | Key column(s) | Joins to | Domain |
|---|---|---|---|---|
| `MEMB_INFO` | account | `memb___id` (login), `memb_guid` (AdminCP URL id) | — | account.md |
| `MEMB_STAT` | account | `memb___id` | `MEMB_INFO.memb___id`, `AccountCharacter.Id` | account.md, online-status.md |
| `DmN_Ban_List` | web | `name`, `type` | — (correlated to `MEMB_INFO.memb___id` / `Character.Name` by app logic, not FK) | account.md |
| `Character` | game | `AccountId` (= `memb___id`, string), identity col configurable (`"id"` this install) | `MEMB_INFO`/`MEMB_STAT` via `AccountId`; `GuildMember.Name`; `MasterSkillTree.Name`; `Ranking*.Name` | character.md |
| `AccountCharacter` | game | `Id` (= `memb___id`), `GameIDC` (= active `Character.Name`) | `MEMB_STAT.memb___id`, `Character.Name` | character.md |
| `MasterSkillTree` | game | `Name` (= `Character.Name`) | `Character` | character.md |
| `RankingBloodCastle` | game | `Name` | `Character.Name` | rankings.md |
| `RankingDevilSquare` | game | `Name` | `Character.Name` | rankings.md |
| `RankingChaosCastle` | game | `Name` | `Character.Name` | rankings.md |
| `RankingCastleSiege` | game | `Name` | none observed | rankings.md — **`KillScore`, not `Score`** |
| `RankingDuel` | game | `Name` | `Character.Name` | rankings.md |
| `C_PlayerKiller_Info` | game | `Killer`, `Victim` | — | rankings.md — conditional, existence-guarded |
| `Guild` | game | `G_Name` | `GuildMember.G_Name`, `MuCastle_DATA.owner_guild`, `MuCastle_REG_SIEGE.REG_SIEGE_GUILD` | guild.md |
| `GuildMember` | game | `Name` (= `Character.Name`), `G_Name` | `Guild`, `Character` | guild.md |
| `MuCastle_DATA` | game | `owner_guild` | `Guild.G_Name` | guild.md |
| `MuCastle_REG_SIEGE` | game | `REG_SIEGE_GUILD` | `Guild.G_Name` | guild.md |
| `Warehouse` | game | `AccountId`/`AccountID` | `MEMB_INFO`/`MEMB_STAT` via account id | inventory-warehouse.md — WRITE_PATH |
| `DmN_Web_Storage` | web | `account`, `server` | — | inventory-warehouse.md — WRITE_PATH |
| `DmN_Market` | web | `seller`, `char` | — | inventory-warehouse.md — WRITE_PATH |
| `DmN_Warehouse_Delete_Log` | web | `account`, `server` | — (audit log) | inventory-warehouse.md |
| `CashShopData` | account | `AccountID` | `MEMB_INFO` (open question: does it hold username or a different id?) | currencies.md |
| `DmN_Shop_Credits` | web | `memb___id`, `server` | `MEMB_INFO.memb___id` | currencies.md |
| `T_InGameShop_Point` | game | `AccountID`(?) | unconfirmed active preset | currencies.md — not confirmed active for this install |
| `T_MasterLevelSystem` | game | `CHAR_NAME` | unconfirmed active preset | character.md — not confirmed active for this install |
| `DmN_Account_Logs` | web | (account identifier + action) | — (audit log) | currencies.md |

## Stored procedures (see `stored-procedures.md` for full detail)

`DmN_Check_Acc_MD5` (dead code, `MD5=0`), `WZ_GetItemSerial`,
`WZ_GetItemSerial2`, `WZ_PeriodItemInsert`, `IGC_PeriodItemInsertEx`,
`WZ_CONNECT_MEMB`, `WZ_DISCONNECT_MEMB` (both game-server-invoked,
inferred), plus the DDL-capable `drop_procedure()`/`insert_sql_data()`
admin routines and the `DmN_Update_Killer_Ranking` trigger.

## The identity chain, end to end

```
Login (username + password)
  → MEMB_INFO.memb___id  [account identity]
  → $_SESSION['user']['username'] = memb___id
  → Character.AccountId = memb___id  [character ownership, string comparison]
  → Character.Name  [character identity, also joined by GuildMember/MasterSkillTree/Ranking*]
  → AccountCharacter.Id = memb___id, AccountCharacter.GameIDC = Character.Name  [currently-active character]
```

This is the real candidate chain for Account Linking's future join key —
`memb___id` (a string username) end to end, not a numeric id anywhere in
the chain. See `docs/game-data/account-linking-contract.md` for why this
is still LEGACY_CODE_OBSERVED evidence, not a decision.
