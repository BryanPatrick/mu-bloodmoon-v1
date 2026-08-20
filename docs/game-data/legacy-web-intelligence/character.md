# Character — legacy evidence

## Core table: `Character` (game DB)

**The account↔character join, resolved (this is the headline finding):**

```
Character.AccountId  =  MEMB_INFO.memb___id  /  MEMB_STAT.memb___id
```

`AccountId` is a **string username**, compared with `Collate Database_Default`
against the same `memb___id` value used for login and session identity —
**not** a numeric foreign key to a separate `Account.Id`-style primary key.
Proven by direct data flow, not naming convention: `get_character_data()`
returns a row containing `AccountId`, and the AdminCP character-edit view
feeds that value straight into `get_ip_logs($character_data['AccountId'])`
and `get_char_list($character_data['AccountId'], ...)` — the exact same
identifier used everywhere else as the account's username.

**Character identity column is per-install config, not fixed.** This
install's `application/data/serverlist.json` sets
`identity_column_character = "id"`, read at runtime via `get_char_id_col($server)`
and substituted into queries as `[id]`. Confirmed active — do not assume
`Name` or a literal `Id` column without checking this config value again
against the live server.

## Full column list observed (`get_character_data()` / `update_character()`, both SELECT and UPDATE, so both read and write paths agree on the set)

`AccountId, Name, cLevel, LevelUpPoint, Class, Experience, Strength, Dexterity, Vitality, Energy, Money, MapNumber, MapPosX, MapPosY, PkCount, PkLevel, PkTime, CtlCode, ResetCount, MasterResetCount, Leadership`

Plus, from the player-facing model (`model.character.php`):
`RuudMoney` (aliased `Ruud`), `MagicList`, `Quest` (IMAGE/blob), `Inventory` (IMAGE/blob), `last_reset_time`.

| Column | Meaning | Confidence |
|---|---|---|
| `Name` | Character name, also usable as an alternate lookup key (`WHERE [id_col]=:char OR Name=:char`) | LEGACY_CODE_CONFIRMED |
| `Class` | Class code | LEGACY_CODE_CONFIRMED |
| `cLevel` | Character level | LEGACY_CODE_CONFIRMED |
| `ResetCount` | Reset count — **matches Phase 1's `Character.ResetCount` OBSERVED entry** | LEGACY_CODE_CONFIRMED, config-resolved (`table_config.json` → `resets.column`) |
| `MasterResetCount` | Master/grand reset count — **matches Phase 1's `Character.MasterResetCount`** | LEGACY_CODE_CONFIRMED, config-resolved (`grand_resets.column`) |
| `MapNumber`, `MapPosX`, `MapPosY` | Location | LEGACY_CODE_CONFIRMED |
| `CtlCode` | Character-level ban flag (1 = banned) — separate from `MEMB_INFO.bloc_code` | LEGACY_CODE_CONFIRMED (`ban_char()`/`check_banned_char()`) |
| `Money` | In-game carried Zen (distinct from the vault's `Warehouse.Money`) | LEGACY_CODE_CONFIRMED |
| `Inventory`, `Quest` | Binary blobs (`CONVERT(IMAGE, ...)`), one blob per character, not one row per item | LEGACY_CODE_CONFIRMED — see `inventory-warehouse.md` |

## Master level — separate table, config-confirmed active

```
MasterSkillTree.MasterLevel, joined by MasterSkillTree.Name = Character.Name
```
`load_master_level()`: `SELECT MasterLevel AS mlevel FROM MasterSkillTree WHERE Name=:char` — this is the **active, configured** path for this install (`table_config.json` → `master_level.table/column/identifier_column`). Two alternate-engine code paths also exist in the same codebase (`T_MasterLevelSystem.MASTER_LEVEL` keyed by `CHAR_NAME`, and `Character.mLevel` directly) but are **not** the resolved config for this install — noted as LOW relevance, not to be used.

## `AccountCharacter` — a different table than it sounds like

This is a **game-DB** table (not to be confused with the portal's own
`AccountCharacter` Prisma model in `apps/api`, which is an unrelated
locally-generated concept). Columns: `Id` (= `memb___id`), `GameIDC`
(= the currently-selected/active `Character.Name`). Used for online-status
and "which character is this account currently playing" lookups:

```
AccountCharacter.Id = MEMB_STAT.memb___id
AccountCharacter.GameIDC = Character.Name (the active character)
```

`delete_account_character($account)` also confirms a write path:
`DELETE FROM AccountCharacter WHERE Id=:account`.

## Guild membership — joined by Name, not AccountId

```
GuildMember.Name = Character.Name
```
No `AccountId` column exists on `GuildMember` — see `guild.md`.

## Cross-reference against `docs/game-data/schema/`

| Field | Prior status | New status | Note |
|---|---|---|---|
| `Character.ResetCount` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** | Now config-confirmed active for this install, not just AdminCP-behavior-inferred |
| `Character.MasterResetCount` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** | Same |
| `MasterSkillTree.MasterLevel` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** | Join key (`Name`) now known |
| Character join/identity key | UNKNOWN (`join-keys-unknown.md`) | **NEW_LEGACY_EVIDENCE** | `AccountId` (string username) for account link; identity column is `"id"` per this install's config — still not `SCHEMA_CONFIRMED` until validated live |
| `Character.Name` | INFERRED candidate | **NEW_LEGACY_EVIDENCE, strongly supported** | Used as both display name and an alternate lookup key throughout |
