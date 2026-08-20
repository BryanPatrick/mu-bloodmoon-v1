# Missing identity/join columns — SCHEMA_REQUIRED_BUT_UNKNOWN

Every real query in `SqlServerGameDatabaseReader` needs to know *which
character* a value row belongs to. Nothing in `docs/game-vps-sqlserver-transition.md`
confirms this. This file exists so nobody — human or agent — quietly
assumes one of the columns below just because it is typical of MU Online
schemas.

| Needed for | Candidate column(s) | Classification | Why it's not safe to use yet |
|---|---|---|---|
| Identifying a character row | `Character.Name`, a `Character.Id`/`CharacterID` primary key | INFERRED | Common in stock MU schemas, but this server has been customized (per `docs/game-vps-sqlserver-transition.md`'s own caveats) — the real column name, type and uniqueness are unverified. |
| Linking a character to an account | `Character.AccountID`, `Character.AccountName` | INFERRED | Same caveat — and this is also the exact kind of column `docs/game-data/account-linking-contract.md` explicitly says must not be assumed. |
| Joining `MasterSkillTree` to a character | An FK column, commonly `MasterSkillTree.Name` or `.CharacterID` | UNKNOWN | No AdminCP-observed evidence at all — `docs/game-vps-sqlserver-transition.md` names the table only for `MasterLevel`. |
| Joining `Ranking*` tables to a character | An FK column per table, commonly `.Name` | UNKNOWN | Same — the audit only observed the `Score` columns. |

**Rule, unconditional:** none of the INFERRED candidates above may appear
in a real SQL query anywhere in this repo. `SqlServerGameDatabaseReader`
throws `SchemaDiscoveryRequiredException` naming exactly these gaps instead
of guessing (proven by `SqlServerGameDatabaseReaderTests`).

## What resolves this

A dedicated, future **read-only schema discovery** pass against the real
SQL Server once access exists: enumerate the actual tables, columns, types,
nullability, primary keys and foreign key relationships for `Character`,
`MasterSkillTree` and the four `Ranking*` tables. Only that pass may
promote an entry here to CONFIRMED (or replace it with the real answer).
Not part of Phase 1.

## Update — legacy web intelligence sweep (Phase 2A prep)

A read-only audit of the vendor-supplied legacy web/AdminCP source found
real, executing code that answers most of the rows above — see
`docs/game-data/legacy-web-intelligence/` (`character.md`, `guild.md`,
`query-catalog.md`). Summary, each classified **LEGACY_CODE_CONFIRMED**
(not yet promoted to CONFIRMED in this file, which stays reserved for live
introspection):

| Needed for | This table's prior status | Legacy code evidence |
|---|---|---|
| Identifying a character row | INFERRED | `Character`'s identity column is per-install config (`serverlist.json.identity_column_character`, `"id"` for this install), read at runtime via `get_char_id_col()` — not a fixed literal. `Character.Name` is confirmed usable as an alternate lookup key throughout. |
| Linking a character to an account | INFERRED (`Character.AccountID`/`AccountName` guessed) | **Resolved as `Character.AccountId`** (note: `Id`, not `ID`) — a **string username**, compared with `Collate Database_Default` against `MEMB_INFO.memb___id`/`MEMB_STAT.memb___id`. Proven by data flow (the value is round-tripped through `get_ip_logs()`/`get_char_list()` as the account identifier), not by column naming. |
| Joining `MasterSkillTree` to a character | UNKNOWN | **Resolved as `MasterSkillTree.Name = Character.Name`.** |
| Joining `Ranking*` tables to a character | UNKNOWN | **Resolved as `Ranking*.Name = Character.Name`** for BloodCastle/DevilSquare/ChaosCastle/Duel. `RankingCastleSiege` has no observed join to `Character` in the legacy code. |

None of this is promoted to CONFIRMED or used in
`SqlServerGameDatabaseReader` yet — the vendor may have changed schema
since either backup was taken, and Phase 1's rule stands: only live
introspection promotes evidence to CONFIRMED. This does, however, make a
**narrowed, targeted** discovery pass possible — see
`docs/game-data/schema/discovery/mu-schema-discovery-v2.sql`, which queries
metadata for exactly these named tables instead of pattern-matching an
unknown schema.

## Update — REAL_SQL_METADATA, live discovery (2026-08-20)

The join keys above are now **CONFIRMED** against the real, live production
SQL Server (via the pre-existing `bm-sql` RemoteOps bridge — see
`references/game-data/sql-discovery/live-20260820/`). This is the strongest
possible evidence tier: real, current, live introspection, not a backup and
not legacy code.

| Row above | Resolution | EVIDENCE_SOURCE |
|---|---|---|
| Identifying a character row | **CONFIRMED: `Character.Name`** (`varchar(10)`, `Latin1_General_CI_AS` — case-insensitive) is the real, database-declared PRIMARY KEY (`PK_Character`). The `id` int column the legacy web app's config pointed at also exists, but this pass found no PK/UNIQUE constraint on it. | REAL_SQL_METADATA |
| Linking a character to an account | **CONFIRMED: `Character.AccountID`** (`varchar(10)`, same collation) matches `MEMB_INFO.memb___id` in type and content shape. **Important correction**: this is a **LOGICAL_APPLICATION_JOIN, not a physical foreign key** — the entire live database has exactly one FK in total (`FK_CustomQuest_Character`, unrelated), confirmed by an unfiltered `sys.foreign_keys` scan. Nothing at the database level prevents an orphaned `AccountID` value. | REAL_SQL_METADATA |
| Joining `MasterSkillTree` to a character | **CONFIRMED: `MasterSkillTree.Name = Character.Name`** — both columns are `varchar(10)`, `MasterSkillTree.Name` is that table's real PK. | REAL_SQL_METADATA |
| Joining `Ranking*` tables to a character | **CONFIRMED: `Ranking*.Name = Character.Name`** for BloodCastle/DevilSquare/ChaosCastle/CastleSiege/Duel — `Name` is the real PK on every one of the five ranking tables (`RankingDuel` was also confirmed to exist, not previously in this file). | REAL_SQL_METADATA |

**A related, important correction found in the same pass**: `MEMB_INFO`'s
real primary key is `memb_guid` (`int`), **not** `memb___id`. The username
(`memb___id`) is what the whole application layer treats as "the account,"
but the database itself never declares it unique. See
`docs/game-data/account-linking-contract.md`'s updated stability analysis.

Full raw evidence, normalized schema, and the legacy-vs-real comparison:
`references/game-data/sql-discovery/live-20260820/`.
