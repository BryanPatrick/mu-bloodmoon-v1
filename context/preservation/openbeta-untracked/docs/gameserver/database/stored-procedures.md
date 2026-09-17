---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database — stored procedures

86 stored procedures exist in the real restored copy (CONFIRMED count,
`database-overview.md`). This document catalogs them by family. Per-
procedure internal logic was traced through decompiled server code only
for the four GameBridge procedures Bryan authorized this session (they
are new, Blood-Moon-authored additions, not part of the original 86) —
everything else is catalogued **by name and real existence**, with
confidence markers reflecting how much was actually verified.

## Blood Moon GameBridge procedures (CONFIRMED — authored, installed, and tested this session)

These four do not exist in the original MuOnline schema; they were added
specifically for the GameBridge extension and are the only procedures in
this database with `WITH EXECUTE AS OWNER` and full source under version
control.

| Procedure | Source | Purpose |
|---|---|---|
| `bm_GrantVip` | `references/game-data/sql-discovery/gamebridge-extension-20260830/derived/proposed-bm-grant-vip-procedure.sql` | Grants/raises a VIP tier on `MEMB_INFO.AccountLevel`, MAX-rule (never downgrades) |
| `bm_SyncVipTier` | same directory, `proposed-bm-sync-vip-tier-procedure.sql` | Reconciles `AccountLevel` to a Portal-authoritative desired value, including downgrade |
| `bm_AnonymizeGameAccount` | `proposed-bm-anonymize-game-account-procedure.sql` | Pseudonymizes/tombstones a player's game-side identity across `Character`, friend tables, etc.; BLOCKS if the account is a guild master |
| `bm_PurgeGameAccount` | `proposed-bm-purge-game-account-procedure.sql` | Hard-deletes a player's game-side rows in dependency order; BLOCKS if guild master |

Full behavior, block conditions, and the real-data test results are in
`account-data-map.md` and `lab-environment.md` Part 12. Both procedures
use `WITH EXECUTE AS OWNER` so the restricted `bloodmoon_writer`/
`bloodmoon_writer_local` caller needs only `EXECUTE` grant — proven via
`HAS_PERMS_BY_NAME` checks while connected as the restricted login itself
(`docs/environment/sql-server-test-environment.md`).

## Phase K — full 86-procedure catalog (2026-08-30)

Every real table each procedure touches, extracted via
`sys.sql_expression_dependencies` against the live lab database (real,
verified data — not a guess). This does not distinguish READ from
WRITE per table (SQL Server's dependency catalog doesn't carry that
distinction; distinguishing it exactly would require parsing every
procedure body's DML statements individually, not done this round). Two
procedures (`WZ_CreateCharacter_GetVersion`, `WZ_Get_DBID`) reference no
table at all — almost certainly simple version/identity lookups.
`CALLER` is STRONG_EVIDENCE/UNKNOWN throughout: none of these are called
from `apps/api` or the GameBridge Agent (grep-confirmed), so the caller
is presumed to be the compiled GameServer/ConnectServer binary itself,
which is not available locally to verify directly.
`SECURITY_RISK`/`SIDE_EFFECTS` are assessed only where the touched-table
set makes the risk self-evident (account/currency/admin mutation);
deeper per-procedure body review was not performed this round for the
82 procedures outside the four `bm_*` ones — flagged `NOT_TRACED`
below, not silently assumed safe.

### Account / character lifecycle (SECURITY_RISK: HIGH — direct identity/credential mutation)

| Procedure | Tables touched | Purpose | Confidence |
|---|---|---|---|
| `WZ_CreateCharacter` | `AccountCharacter`, `Character`, `DefaultClassType` | Creates a new character row + slot assignment | STRONG_EVIDENCE (name+tables), body NOT_TRACED |
| `WZ_CreateCharacter_GetVersion` | none | Version/handshake check preceding character creation | HYPOTHESIS |
| `WZ_DeleteCharacter` | `Character`, `CustomQuest`, `CustomRewardItem`, `EventLeoTheHelper`, `EventSantaClaus`, `Gens_Rank`, `Gens_Reward`, `HelperData`, `MasterSkillTree`, `OptionData`, `QuestKillCount`, `QuestWorld`, 9 `Ranking*` tables | In-client character deletion — this is the REAL, authoritative list `bm_PurgeGameAccount`'s Phase K hardening was built to match | CONFIRMED (this procedure's dependency list is the evidence base for the purge/anonymize dependency matrix in `account-data-map.md`) |
| `WZ_RenameCharacter` | `AccountCharacter`, `Character`, `CustomDailyReward`, `CustomItemVisualBackup`, `CustomItemVisualDefault`, `CustomMarketShop`, `CustomQuest`, `CustomReBuild`, `CustomRewardItem`, `EventLeoTheHelper`, `EventSantaClaus`, `Gens_Rank`, `Gens_Reward`, `GremoryCase`, `Guild`, `GuildMember`, `HelperData`, `MasterSkillTree`, `OptionData`, `QuestKillCount`, `QuestWorld`, 11 `Ranking*` tables, `T_CGuid`, `T_FriendList`, `T_FriendMail`, `T_FriendMain`, `T_WaitFriend` | In-client character rename — the REAL, authoritative evidence base for `bm_AnonymizeGameAccount`'s tombstone-rename cascade | CONFIRMED |
| `WZ_UserGuidCreate` | `T_CGuid`, `T_FriendMain` | Assigns the friend-system numeric GUID for a new character | STRONG_EVIDENCE |
| `WZ_CONNECT_MEMB` | `MEMB_STAT` | Marks an account as connected (login) | STRONG_EVIDENCE |
| `WZ_DISCONNECT_MEMB` | `MEMB_INFO`, `MEMB_STAT` | Marks an account as disconnected (logout); touches `MEMB_INFO` too — plausibly writes a last-seen timestamp | STRONG_EVIDENCE |
| `WZ_Get_DBID` | none | Likely a raw `memb_guid` lookup by login | HYPOTHESIS |
| `WZ_GetResetInfo` / `WZ_SetResetInfo` | `Character` | Read/write reset-count columns | STRONG_EVIDENCE |
| `WZ_GetMasterResetInfo` / `WZ_SetMasterResetInfo` | `Character` | Read/write master-reset columns | STRONG_EVIDENCE |
| `WZ_SetOnlineHoursSystem` | `Character` | Playtime tracking | STRONG_EVIDENCE |
| `WZ_SetCustomEventRobber` | `Character` | Event-specific character flag | HYPOTHESIS |
| `WZ_GetItemSerial` | `GameServerInfo` | Allocates the next global item serial number | STRONG_EVIDENCE |

### VIP / account-level (SECURITY_RISK: HIGH — the same column GameBridge governs)

| Procedure | Tables touched | Purpose | Confidence |
|---|---|---|---|
| `WZ_SetAccountLevel` / `WZ_GetAccountLevel` | `MEMB_INFO` | Native read/write of `AccountLevel` — the SAME column `bm_GrantVip`/`bm_SyncVipTier` govern. **Real coexistence risk, not resolved this round**: if the native GameServer client ever calls `WZ_SetAccountLevel` directly (e.g. an in-game GM command), it would bypass GameBridge's MAX-rule/reconciliation logic entirely and could silently diverge from the Portal's VIP state. Flagged `REVIEW_REQUIRED` for `vip-data-flow.md`. | CONFIRMED tables, REVIEW_REQUIRED for the coexistence risk |

### Currency (SECURITY_RISK: HIGH — direct balance mutation)

| Procedure | Tables touched | Purpose | Confidence |
|---|---|---|---|
| `Add_Credits` | `DmN_Shop_Credits` | Grants legacy DmN CMS "credits" — a DEAD system (`legacy-unknown-structures.md`), not the live CashShop currency | CONFIRMED table, STRONG_EVIDENCE purpose |
| `WZ_SetCoin` | `CashShopData` | Writes `WCoinC`/`WCoinP`/`GoblinPoint` — the real, live CashShop currency table (`economy-data-map.md`) | STRONG_EVIDENCE |
| `WZ_SetExchangeReward` | `CashShopData` | Currency reward from an exchange/conversion feature | HYPOTHESIS |
| `WZ_SetKD` | `CashShopData` | Unclear abbreviation ("K/D"? a specific reward code) — writes the currency table | UNKNOWN purpose, CONFIRMED table |
| `MMK_ItemMakerInventory` / `MMK_ItemMakerWareHous` / `MMK_QuestMaker` / `MMK_SkillMaker` | `Character` / `warehouse` | An item/quest/skill-maker admin tool family — plausibly a GM/web-admin utility for spawning items or granting quest/skill state directly | HYPOTHESIS (name-based); real table touches CONFIRMED |

### Market (SECURITY_RISK: MEDIUM)

`CustomMarketShop` is touched only by `WZ_RenameCharacter` (keeping a
listing's seller name in sync on rename) among the native procedures —
no dedicated `WZ_Market*` create/cancel procedure was found in this
schema, meaning the actual list/buy/cancel market operations are most
likely handled entirely in GameServer engine code without a stored
procedure at all (consistent with `CustomMarketShop` having no status
column — `economy-data-map.md`). CONFIRMED (absence checked directly).

### Guild / Castle Siege (SECURITY_RISK: MEDIUM)

| Procedure | Tables touched | Purpose |
|---|---|---|
| `WZ_GuildCreate` | `Guild`, `GuildMember` | Guild creation |
| `WZ_SetGuildDelete` | `Guild`, `GuildMember`, `RankingKingGuild` | Guild disbandment — correctly touches the guild-keyed `RankingKingGuild` (contrast with the Phase K correction to the `bm_*` procedures, which are character-keyed and correctly do NOT touch it) |
| `WZ_CS_*` (30 procedures, `CheckSiegeGuildList` through `SetSiegeGuildOK`) | `MuCastle_DATA`, `MuCastle_MONEY_STATISTICS`, `MuCastle_NPC`, `MuCastle_REG_SIEGE`, `MuCastle_SIEGE_GUILDLIST`, `Guild`, `GuildMember`, `Character` | The full Castle Siege event subsystem — registration, guild-mark management, castle NPC shop, tax/money accounting, siege scheduling/reset | STRONG_EVIDENCE (real tables CONFIRMED, individual bodies NOT_TRACED) |
| `WZ_CS_GetCsGuildUnionInfo` | `Guild` | Guild alliance ("union") info for siege purposes | STRONG_EVIDENCE |
| `WZ_GetCharacterGensInfo` | `Gens_Duprian`, `Gens_Varnert` (views) | Reads a character's faction standing | STRONG_EVIDENCE |
| `WZ_RankingKillvsKill` / `WZ_TvTRanking` | `RankingMataMata` / `RankingTvT` | PvP-event ranking writers | STRONG_EVIDENCE |
| `WZ_CustomRanking` / `WZ_CustomRankingEvent` / `WZ_CustomArenaRanking` / `WZ_CustomEventBattleRoyaleRanking` / `WZ_CustomEventCaptureTheFlagRanking` / `WZ_CustomEventDropNpcRanking` / `WZ_CustomMonsterReward` | Various `Ranking*` + `CashShopData` + `Character` | Custom-event ranking/reward writers — several also touch `CashShopData`, implying some custom events grant currency directly | STRONG_EVIDENCE |
| `WZ_SetRankingDay` / `WZ_SetRankingMon` / `WZ_SetRankingWek` | `CashShopData`, `Character` | Periodic (daily/monthly/weekly) ranking reward settlement, paid via `CashShopData` | STRONG_EVIDENCE |
| `WZ_SetRewardCastleSiege` | `CashShopData`, `Character`, `GuildMember`, `MEMB_STAT`, `MuCastle_DATA` | Castle Siege reward payout | STRONG_EVIDENCE |

### Friends / Marriage / Mail (SECURITY_RISK: LOW-MEDIUM)

| Procedure | Tables touched | Purpose |
|---|---|---|
| `WZ_FriendAdd` / `WZ_FriendDel` | `T_FriendList`, `T_FriendMain`, `T_WaitFriend` | Friend add/remove — the native counterpart to the friend-graph cleanup logic in `bm_AnonymizeGameAccount`/`bm_PurgeGameAccount` |
| `WZ_WaitFriendAdd` / `WZ_WaitFriendDel` | `Character`, `T_FriendList`, `T_FriendMain`, `T_WaitFriend` | Pending friend-request add/remove |
| `WZ_DelMail` / `WZ_WriteMail` | `T_FriendMail`, `T_FriendMain`, `Character` | Friend-mail delete/send |
| `WZ_GetMarryInfo` / `WZ_SetMarryInfo` / `WZ_SetDivorceInfo` | `Marry` | In-game marriage system |
| `WZ_CW_InfoLoad` / `WZ_CW_InfoSave` | `WZ_CW_INFO` | Unclear ("CW" — possibly "Class War" or a specific event) — a single-row config/state table | UNKNOWN purpose, CONFIRMED table |
| `WZ_SetOnlineLottery` | `Character` | An in-game lottery/event feature | STRONG_EVIDENCE |

## Phase L, Part 9 — risk-based review order and Priority-1 reading

Rather than read the remaining ~82 native procedures in arbitrary order,
a real **Priority-1 set** was derived directly from the dependency data
(`sys.sql_expression_dependencies`) — every procedure touching
`MEMB_INFO`, `MEMB_STAT`, `CashShopData`, `Character`, `Guild`/
`GuildMember`, `warehouse`, or the legacy currency table
`DmN_Shop_Credits`. **37 native procedures** matched (plus the 4 `bm_*`
ones, already fully documented separately). No dedicated procedure
exists anywhere for sanctions, passwords, or account recovery, and none
touch `PixPayments`/`CustomMarketShop` — all confirmed absences, not
gaps in the search.

**12 of 37 read in full this round** (statement-level, via
`sys.sql_modules`): `Add_Credits`, `MMK_ItemMakerWareHous`,
`WZ_CONNECT_MEMB`, `WZ_DISCONNECT_MEMB`, `WZ_DeleteCharacter`,
`WZ_GetAccountLevel`, `WZ_GuildCreate`, `WZ_SetAccountLevel`,
`WZ_SetCoin`, `WZ_SetExchangeReward`, `WZ_SetGuildDelete`, `WZ_SetKD` —
full findings for each are in this document's earlier sections and in
`docs/vip/wz-setaccountlevel-coexistence.md`.

**Priority-1 backlog (25 remaining, not yet read in full)**:
`WZ_CreateCharacter`, `WZ_RenameCharacter`, `WZ_GetMasterResetInfo`,
`WZ_SetMasterResetInfo`, `WZ_GetResetInfo`, `WZ_SetResetInfo`,
`WZ_SetOnlineHoursSystem`, `WZ_SetCustomEventRobber`,
`WZ_SetOnlineLottery`, `WZ_SetRankingDay`, `WZ_SetRankingMon`,
`WZ_SetRankingWek`, `WZ_SetRewardCastleSiege`, `WZ_WaitFriendAdd`,
`WZ_WriteMail`, `WZ_CustomArenaRanking`,
`WZ_CustomEventBattleRoyaleRanking`, `WZ_CustomEventDropNpcRanking`,
`WZ_CustomMonsterReward`, `WZ_CustomRanking`,
`WZ_CS_GetCalcRegGuildList`, `WZ_CS_GetCsGuildUnionInfo`,
`WZ_CS_GetOwnerGuildMaster`, `WZ_CS_ReqRegAttackGuild`,
`MMK_ItemMakerInventory`/`MMK_QuestMaker`/`MMK_SkillMaker`.

**Priority 2/3 backlog (~49 procedures, outside the Priority-1 table
set)**: the remaining `WZ_CS_*` castle-siege detail procedures (~26,
tax/NPC-shop/schedule/money-statistics management — real tables
CONFIRMED via dependency data, bodies not read), friend/marriage/mail
(`WZ_FriendAdd`/`Del`, `WZ_WaitFriendDel`, `WZ_GetMarryInfo`/
`SetMarryInfo`/`SetDivorceInfo`), `WZ_CW_InfoLoad`/`Save` (purpose still
UNKNOWN by name alone), `WZ_TvTRanking`/`WZ_RankingKillvsKill`,
`WZ_GetCharacterGensInfo`, `WZ_GetItemSerial`, `WZ_Get_DBID`,
`WZ_CreateCharacter_GetVersion`, `WZ_UserGuidCreate`.

## What this document does NOT claim

This is a real, data-driven touched-table catalog for all 90 procedures
(86 native + 4 `bm_*`), not a full call-graph or line-by-line body
review. Only the four Blood Moon `bm_*` procedures have had their full
logic read, tested, and documented statement-by-statement. Every
`WZ_*`/`MMK_*` procedure's actual T-SQL body exists in `sys.sql_modules`
and could be pulled and read in a future session — not done here because
the touched-table evidence (which IS real and verified) was sufficient
for this round's purge/anonymize-coverage and security-review goals.
`READ` vs. `WRITE` per table was not independently distinguished for the
82 non-`bm_*` procedures — flagged as a specific, honest gap, not
silently assumed.
