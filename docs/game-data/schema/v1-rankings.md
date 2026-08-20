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
