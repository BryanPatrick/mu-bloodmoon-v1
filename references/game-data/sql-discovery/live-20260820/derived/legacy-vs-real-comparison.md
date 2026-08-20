# Legacy web code claims vs. real live SQL Server — comparison

Source: `../normalized/real-schema.json` (derived from `../raw/*.txt`), compared
against `docs/game-data/legacy-web-intelligence/`.

## Confirmed exactly as the legacy code claimed

- `Character.ResetCount`, `Character.MasterResetCount` — exist, `int`.
- `MasterSkillTree.MasterLevel`, joined by `MasterSkillTree.Name = Character.Name` — both `varchar(10)`, both PK'd on `Name`.
- `RankingBloodCastle/DevilSquare/ChaosCastle.Score`, joined by `Name = Character.Name` — all PK'd on `Name`.
- `RankingCastleSiege.KillScore` (not `Score`) — exactly as the legacy code's contradiction flagged.
- `CashShopData.AccountID/WCoinC/WCoinP/GoblinPoint` — exact match, `AccountID` is the real PK.
- `Guild.G_Name/G_Mark/G_Master/G_Score/G_Union` — all exist as named.
- `GuildMember.Name/G_Name/G_Status` — all exist; `GuildMember.Name` is the real PK (a character is in exactly one guild).
- `warehouse.Items/Money` (real table name is lowercase) — exists, `AccountID` is the real PK.
- `T_InGameShop_Point`, `T_MasterLevelSystem` (alternate-engine presets) confirmed **not to exist** — settles the legacy sweep's open question: the DEFAULT config (CashShopData/MasterSkillTree-based) is definitively the live one.

## Corrected or refined beyond what the legacy code showed

- **`Character`'s real primary key is `Name`**, not the `id` column the legacy web app's per-install config pointed `identity_column_character` at. `id` exists on the table but has no confirmed unique/PK constraint from this pass.
- **`MEMB_INFO`'s real primary key is `memb_guid` (int)**, not `memb___id`. The username (`memb___id`) is what the whole legacy application treats as "the account identity," but the database itself does not declare it unique.
- **`AccountCharacter` has `GameID1`...`GameID10` plus `GameIDC`** — the legacy web code only ever read `GameIDC` (the active character); the other nine per-slot columns are real and unused by anything the sweep found.
- **`RankingCastleSiege` also has `DeathScore` and `CrownTime`** — resolves the legacy `table_config.json`'s blank `column2` entry for this leaderboard.
- **`MuCastle_DATA`/`MuCastle_REG_SIEGE` columns are `UPPER_SNAKE_CASE`** (`OWNER_GUILD`, `SIEGE_START_DATE`, ...), not the lowercase aliases the legacy PHP `SELECT` statements used.
- **`DmN_Shop_Credits` has `credits`/`credits2`/`credits3`/`credits4`** — only `credits4` was observed wired to anything (webshop credit type 4). The other three exist but weren't observed in use by the legacy sweep.
- Real blob sizes, previously unknown: `Character.Inventory` = 3776 bytes, `warehouse.Items` = 3840 bytes, `Character.MagicList` = 180 bytes, `Character.EffectList` = 416 bytes, `Character.Quest` = 50 bytes.
- `Character` also has a `resets`/`grand_resets` column pair **in addition to** `ResetCount`/`MasterResetCount` — both pairs exist; the sweep only ever saw the app read `ResetCount`/`MasterResetCount` as the "real" values (via `table_config.json`), the other pair's purpose is unconfirmed.

## Confirmed NOT to exist on the live server

- `C_PlayerKiller_Info`, `T_InGameShop_Point`, `T_MasterLevelSystem`.
- None of the 7 stored procedures the legacy sweep found call sites for (`DmN_Check_Acc_MD5`, `WZ_GetItemSerial`, `WZ_GetItemSerial2`, `WZ_PeriodItemInsert`, `IGC_PeriodItemInsertEx`, `WZ_CONNECT_MEMB`, `WZ_DISCONNECT_MEMB`) are installed. Either the game engine's compiled binaries update `MEMB_STAT.ConnectStat` directly without a stored procedure, or these were never installed on this server (the legacy code itself treated `WZ_CONNECT_MEMB`/`WZ_DISCONNECT_MEMB` as installable/optional via a setup routine, consistent with their absence).

## The single biggest correction: the account↔character join is not physical

The entire live database has **exactly one** foreign key:
`FK_CustomQuest_Character` (`CustomQuest.Name` → `Character.Name`). Nothing
enforces `Character.AccountID = MEMB_INFO.memb___id` at the database level
— it is purely an application-level string comparison, exactly the shape
the legacy PHP code used, but never backed by a database constraint.
Classified `ACCOUNT_CHARACTER_JOIN_TYPE = LOGICAL_APPLICATION_JOIN`, not
`PHYSICAL_FOREIGN_KEY`.
