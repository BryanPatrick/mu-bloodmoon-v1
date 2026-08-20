# Account, Guild, Currencies, Warehouse — real SQL metadata

New in this update (2026-08-20) — Phase 1 had zero schema evidence for any
of these domains. All entries below are `SCHEMA_CONFIRMED`,
`EVIDENCE_SOURCE: REAL_SQL_METADATA`, from live introspection via the
pre-existing `bm-sql` RemoteOps bridge. Full raw evidence:
`references/game-data/sql-discovery/live-20260820/`.

## Account

`MEMB_INFO` — **primary key is `memb_guid` (`int`), not `memb___id`**. See
`docs/game-data/account-linking-contract.md` for why this matters.

| Column | Type | Note |
|---|---|---|
| `memb_guid` | `int` | real PK |
| `memb___id` | `varchar(10)`, case-insensitive | login username; no DB-level uniqueness |
| `memb__pwd` | `varchar(10)` | |
| `mail_addr` | `varchar(50)` | |
| `bloc_code` | `char(1)` | block/ban flag |
| `ctl1_code` | `char(1)` | GM/staff flag |
| `Admin`, `AccountLevel` | `int` | |
| `last_login`, `last_login_ip` | `datetime` / `varchar(50)` | |
| `activated`, `activation_id` | `int` / `varchar(50)` | |

`MEMB_STAT` — PK is `memb___id` (`varchar(10)`). Columns: `ConnectStat`
(`tinyint`, 1=online), `ServerName`, `IP`, `ConnectTM`, `DisConnectTM`,
`OnlineHours`.

`AccountCharacter` — PK is `Id` (`varchar(10)`, = `memb___id`). Columns:
`Number` (`int`), `GameID1`...`GameID10` (`varchar(10)` each — ten
character-slot columns, not previously known), `GameIDC` (`varchar(10)`,
currently-active character — the only one the legacy web code read),
`MoveCnt`, `ExtClass`, `ExtWarehouse`.

`DmN_Ban_List` (web-side ban ledger) — PK `id` (`int`). `name` (`varchar(10)`),
`type` (`int`, 1=account/2=character per legacy code), `time` (`int` —
likely a Unix timestamp, not `datetime`), `is_permanent`, `reason` (`text`).

## Character identity (see also `join-keys-unknown.md`)

`Character`'s real PK is **`Name`** (`varchar(10)`, case-insensitive). The
`id` (`int`) column exists but has no confirmed unique/PK constraint. The
account link, `Character.AccountID` (`varchar(10)`, matches `memb___id`'s
type exactly), is a **logical application join, not a physical FK** — the
entire live database has exactly one foreign key total
(`FK_CustomQuest_Character`, unrelated to accounts).

## Guild

`Guild` — PK `G_Name` (`varchar(8)`). Columns: `G_Mark` (`varbinary(32)`),
`G_Score` (`int`), `G_Master` (`varchar(10)`), `G_Count`, `G_Notice`
(`varchar(60)`), `Number`, `G_Type`, `G_Rival`, `G_Union` (all `int`),
`MemberCount` (`int`).

`GuildMember` — PK `Name` (`varchar(10)`) — **a character can only belong
to one guild**, enforced by this being the whole primary key. Columns:
`G_Name` (`varchar(8)`, FK-shaped but not a physical FK), `G_Level`
(`tinyint`), `G_Status` (`tinyint`, not previously known).

`MuCastle_DATA` (castle siege ownership, real columns are
`UPPER_SNAKE_CASE`, not the lowercase aliases the legacy PHP code used) —
PK `MAP_SVR_GROUP` (`int`). Columns: `SIEGE_START_DATE`, `SIEGE_END_DATE`
(`datetime`), `SIEGE_GUILDLIST_SETTED`, `SIEGE_ENDED`, `CASTLE_OCCUPY`
(`bit`), `OWNER_GUILD` (`varchar(8)`, → `Guild.G_Name`, logical join),
`MONEY` (`money`), `TAX_RATE_CHAOS`, `TAX_RATE_STORE`, `TAX_HUNT_ZONE` (`int`).

`MuCastle_REG_SIEGE` — no PK; a **unique index** `IX_ATTACK_GUILD_SUBKEY`
on `(MAP_SVR_GROUP, REG_SIEGE_GUILD)` — a guild can register once per siege
map group. Columns: `REG_MARKS` (`int`), `IS_GIVEUP` (`tinyint`), `SEQ_NUM` (`int`).

## Currencies

`CashShopData` — PK `AccountID` (`varchar(10)`). Columns exactly as
observed: `WCoinC`, `WCoinP`, `GoblinPoint` (all `int`).

`DmN_Shop_Credits` (web DB) — no PK found. Columns: `memb___id`
(`varchar(20)` — note: wider than `MEMB_INFO.memb___id`'s `varchar(10)`),
`credits`, `credits2`, `credits3` (`bigint` each), `server` (`varchar(50)`),
`credits4` (`int`). Only `credits4` was observed wired to anything by the
legacy web sweep (webshop credit type 4 / "WebZen"); `credits`/`credits2`/`credits3`
exist but their live usage is unconfirmed.

`Character.Money` (in-game carried Zen) and `warehouse.Money` (vault Zen)
both confirmed `int`, distinct columns on distinct tables, as the legacy
sweep described.

## Warehouse / Inventory (schema only — WRITE_PATH, never queried for real content)

`warehouse` (real table name is lowercase; SQL Server's default collation
makes this immaterial to the legacy code's `Warehouse` references) — PK
`AccountID` (`varchar(10)`). `Items` is `varbinary(3840)` (the real blob
size — previously unknown). `Money` (`int`), `EndUseDate`
(`smalldatetime`), `DbVersion` (`tinyint`), and a `pw` (`smallint`) column
not referenced anywhere the legacy sweep looked.

`Character.Inventory` is `varbinary(3776)` (real blob size, previously
unknown). `Character.MagicList` = `varbinary(180)`, `Character.EffectList`
= `varbinary(416)`, `Character.Quest` = `varbinary(50)`.

No content of any blob was ever read — only its declared type/length. See
`docs/game-data/legacy-web-intelligence/inventory-warehouse.md` for the
write-path mechanics (never to be reused).

## Confirmed NOT to exist — classification `ABSENT_IN_CURRENT_SCHEMA`

`C_PlayerKiller_Info`, `T_InGameShop_Point`, `T_MasterLevelSystem` — all
absent from the live database (checked directly, not merely unconfirmed —
see `docs/game-data/schema/README.md`'s classification tiers). This settles
the legacy sweep's open question about which credits/master-level engine
preset is active: it is definitively the `CashShopData`/`MasterSkillTree`-based
DEFAULT preset, not an IGCN-family alternate.

None of the 7 stored procedures the legacy code sweep found call sites for
(`DmN_Check_Acc_MD5`, `WZ_GetItemSerial`, `WZ_GetItemSerial2`,
`WZ_PeriodItemInsert`, `IGC_PeriodItemInsertEx`, `WZ_CONNECT_MEMB`,
`WZ_DISCONNECT_MEMB`) are installed on the live server.
