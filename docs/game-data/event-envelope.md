# Event envelope (Phase 1)

```
eventId          string   — generated once, at persistence time; stable across retries
eventType        string   — "character.reset-state" | "ranking.state"
schemaVersion    int      — 1
source           string   — the Agent's id (e.g. "gamebridge-agent-01")
serverId         string   — which game server (e.g. "bloodmoon-s6")
sourceSequence   long     — monotonic, scoped to (source, serverId), never globally comparable
accountId        string?  — present when the game data is confirmed account-scoped (currently never, see schema/join-keys-unknown.md)
characterId      string?  — present when known (currently a schema-blocked field, see schema/join-keys-unknown.md)
observedAt       string   — when the Agent observed this value via polling
payload          object   — event-type-specific fields (see below)
receivedAt       string   — assigned by Cloudflare on ingest; never trusted from the Agent, never sent by the Agent
```

`observedAt`, not `occurredAt`: Phase 1 infers change by polling and
comparing to last-known state, not from a real event timestamp the game
emits. The name says so honestly. If the game ever provides a true event
timestamp in a later phase, that becomes a genuine `occurredAt` field
alongside (not replacing) `observedAt`.

## Payloads

- `character.reset-state`: `{ characterId, characterName, resetCount, masterResetCount, masterLevel }`
- `ranking.state`: `{ leaderboard, characterId, characterName, score }`

`characterId`/`characterName` are forward-looking contract fields — see
`docs/game-data/schema/join-keys-unknown.md` for why the real Agent cannot
populate them yet.

## On the wire

The Agent sends `payloadJson` (a JSON-encoded string), matching
`System.Text.Json`'s Web/camelCase serialization of
`BloodMoon.GameBridgeAgent.Ingestion.EventEnvelope`. The Worker parses it
again before applying current-state (`apps/game-data-worker/src/ingest.ts`).
