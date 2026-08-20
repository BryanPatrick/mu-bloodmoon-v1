# Ranking leaderboard fields

Source: `docs/game-vps-sqlserver-transition.md`, re-confirmed unchanged this
session.

| Table.Column | Type (assumed) | Nullable | Meaning | Classification | Read/Write |
|---|---|---|---|---|---|
| `RankingBloodCastle.Score` | int | assumed no | Blood Castle leaderboard score | OBSERVED | READ-ONLY |
| `RankingDevilSquare.Score` | int | assumed no | Devil Square leaderboard score | OBSERVED | READ-ONLY |
| `RankingChaosCastle.Score` | int | assumed no | Chaos Castle leaderboard score | OBSERVED | READ-ONLY |
| `RankingCastleSiege.Score` | int | assumed no | Castle Siege leaderboard score | OBSERVED | READ-ONLY |

Four separate tables, one per leaderboard — not a single table with a
`leaderboard` discriminator column. The Worker's `ranking_state` D1 table
normalizes this into one row shape with a `leaderboard` field (`BloodCastle`
/ `DevilSquare` / `ChaosCastle` / `CastleSiege`), which is a Phase 1
platform-side normalization, not a claim about the source schema.

`rank` (a leaderboard position, e.g. "#3") is not itself an OBSERVED or
CONFIRMED column and is not stored — it is computed at read time by sorting
`Score`, once there is a real reader to populate `ranking_state` at all.

## Sample shape (fabricated, illustrative only — never real data)

```json
{
  "leaderboard": "BloodCastle",
  "characterId": "UNKNOWN-see-join-keys-unknown.md",
  "characterName": "UNKNOWN-see-join-keys-unknown.md",
  "score": 48210
}
```

Same `BLOCKED_BY_SCHEMA_DISCOVERY` status as the reset/master-level fields
— no identity/join column is confirmed for these tables either.

## Update — legacy web intelligence sweep (Phase 2A prep)

The legacy web/AdminCP audit (`docs/game-data/legacy-web-intelligence/rankings.md`)
found real, executing code confirming `RankingBloodCastle.Name`,
`RankingDevilSquare.Name`, `RankingChaosCastle.Name` all join to
`Character.Name` — LEGACY_CODE_CONFIRMED, not yet SCHEMA_CONFIRMED.

**⚠️ CONTRADICTS_CURRENT_ASSUMPTION for `RankingCastleSiege`**: the legacy
code's active config for this install queries
**`RankingCastleSiege.KillScore`**, not `Score` as listed in the table
above. The row above is left unchanged (never silently overwritten) — but
this specific table's column name needs re-verification before Phase 2A
treats it the same way as the other three. See
`docs/game-data/legacy-web-intelligence/rankings.md` for the exact query
text.

## Update — REAL_SQL_METADATA, live discovery (2026-08-20)

**Promoted to SCHEMA_CONFIRMED** (`references/game-data/sql-discovery/live-20260820/`).
Live introspection resolves the contradiction above: `RankingCastleSiege`
really does use `KillScore`, not `Score` — the legacy code was right, the
original Phase 1 OBSERVED entry (row above, left unchanged per the
never-overwrite rule) was the one that needed correcting. `RankingCastleSiege`
also has `DeathScore` (`int`) and `CrownTime` (`int`), resolving the legacy
`table_config.json`'s previously-blank `column2` slot.

| Table | Real columns | PK | Type |
|---|---|---|---|
| `RankingBloodCastle` | `Name`, `Score` | `Name` | `Score int` |
| `RankingDevilSquare` | `Name`, `Score` | `Name` | `Score int` |
| `RankingChaosCastle` | `Name`, `Score` | `Name` | `Score int` |
| `RankingCastleSiege` | `Name`, `KillScore`, `DeathScore`, `CrownTime` | `Name` | all `int` |
| `RankingDuel` | `Name`, `WinScore`, `LoseScore` | `Name` | all `int` |

All five tables' PK is `Name` (`varchar(10)`), confirming
`Ranking*.Name = Character.Name` as the real join for every one of them —
including `RankingDuel`, previously only LEGACY_CODE_CONFIRMED.
