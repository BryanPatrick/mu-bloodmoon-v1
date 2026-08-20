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
