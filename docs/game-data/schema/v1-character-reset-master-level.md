# Character reset / master level fields

Source: `docs/game-vps-sqlserver-transition.md` ("Achados do AdminCP
atual"), re-read and re-confirmed unchanged this session.

| Table.Column | Type (assumed) | Nullable | Meaning | Classification | Read/Write |
|---|---|---|---|---|---|
| `Character.ResetCount` | int | assumed no | Number of resets performed on the character | OBSERVED | READ-ONLY |
| `Character.MasterResetCount` | int | assumed no | Number of master resets performed | OBSERVED | READ-ONLY |
| `MasterSkillTree.MasterLevel` | int | assumed no | Master level, stored in a separate table from `Character` | OBSERVED | READ-ONLY |

Type/nullability are marked "assumed" — the AdminCP's behavior confirms the
column exists and holds an integer-like reset/level count, not its exact
SQL type or nullability. Those require a real schema introspection pass.

## Sample shape (fabricated, illustrative only — never real data)

```json
{
  "characterId": "UNKNOWN-see-join-keys-unknown.md",
  "characterName": "UNKNOWN-see-join-keys-unknown.md",
  "resetCount": 18,
  "masterResetCount": 2,
  "masterLevel": 137
}
```

## Why `SqlServerGameDatabaseReader` still can't query this (implementation status)

The schema-level blocker is now resolved: `Character.Name` is a confirmed
real PK, and `ResetCount`/`MasterResetCount`/`MasterSkillTree.MasterLevel`
are all confirmed real columns with a confirmed real join. **Writing the
actual query is a separate, not-yet-done task** — this document records
schema readiness, not an implementation change. `SqlServerGameDatabaseReader`
still throws `SchemaDiscoveryRequiredException` as of this writing; see
`docs/game-data/phase-2a-real-sql-report.md`'s `REAL_SELECT_QUERIES_READY`
field for the readiness classification, and Part L of that report for why
implementation was deliberately deferred. The fake test reader
(`BloodMoon.GameBridgeAgent.Tests/Fakes/FakeGameDatabaseReader.cs`) still
fabricates `characterId`/`characterName` for its own purposes — that
remains test data, not a schema claim.

## Update — legacy web intelligence sweep (Phase 2A prep)

A read-only audit of the vendor-supplied legacy web/AdminCP source (see
`docs/game-data/legacy-web-intelligence/character.md`) found real code that
builds and executes `SELECT`/`UPDATE` statements against exactly this
table and these two columns, with the join key resolved:
`Character.AccountId = MEMB_INFO.memb___id` (a string username), and the
character identity column set to `"id"` for this install via
`serverlist.json`. This is classified **LEGACY_CODE_CONFIRMED** — a rung
above AdminCP-behavior-inferred OBSERVED. `MasterSkillTree.Name = Character.Name`
is the confirmed join for the master-level row too.

## Update — REAL_SQL_METADATA, live discovery (2026-08-20)

**Promoted to SCHEMA_CONFIRMED.** Live introspection via the pre-existing
`bm-sql` RemoteOps bridge (`references/game-data/sql-discovery/live-20260820/`)
confirms, against the current production database:

| Column | Type | Nullable | Note |
|---|---|---|---|
| `Character.ResetCount` | `int` | yes | Confirmed exists, exactly as OBSERVED predicted. `Character.resets` (also `int`) exists too — a second, separate column not read by anything the legacy sweep found. |
| `Character.MasterResetCount` | `int` | yes | Confirmed. `Character.grand_resets` (`int`) also exists, same caveat as above. |
| `MasterSkillTree.MasterLevel` | `int` | yes | Confirmed, table PK is `MasterSkillTree.Name` (`varchar(10)`). |

**Join key, now confirmed real**: `Character.Name` (`varchar(10)`,
`Latin1_General_CI_AS`) is the table's actual declared PRIMARY KEY — not
the `id` column the legacy web app's per-install config used. See
`docs/game-data/schema/join-keys-unknown.md`'s update for the full
identity-chain finding, including the important correction that
`Character.AccountID` is a logical, not physical, join to `MEMB_INFO`.
