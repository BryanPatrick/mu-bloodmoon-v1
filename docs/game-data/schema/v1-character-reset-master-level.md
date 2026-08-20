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

## Why `SqlServerGameDatabaseReader` still can't query this

Every row above needs an identity/join column (which character this
`ResetCount` belongs to) to be meaningful. No such column is OBSERVED or
CONFIRMED — see `join-keys-unknown.md`. The real reader throws
`SchemaDiscoveryRequiredException` for exactly this reason; the fake test
reader (`BloodMoon.GameBridgeAgent.Tests/Fakes/FakeGameDatabaseReader.cs`)
fabricates `characterId`/`characterName` because it is test data, not a
schema claim.
