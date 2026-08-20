# GameBridge Agent

.NET 8 Worker Service. Part of the Game Data Platform Phase 1 (read-only
foundation) — see `docs/game-data/architecture.md` for the full picture.

**Read-only, absolutely.** `IGameDatabaseReader` has no write-capable member
(`SqlServerGameDatabaseReaderTests` proves this by reflection). Nothing in
this Agent ever writes to the MU game database. `GAME_WRITES_PERFORMED` must
always be `0`.

**Schema discipline.** `docs/game-vps-sqlserver-transition.md` confirms only
9 value columns, none of them a join/identity key. `SqlServerGameDatabaseReader`
does not guess one — every real method throws `SchemaDiscoveryRequiredException`
naming exactly which columns block it (`BLOCKED_BY_SCHEMA_DISCOVERY`). See
`docs/game-data/schema/join-keys-unknown.md`. This is correct Phase 1 behavior,
not a bug: it stays this way until a real, read-only schema discovery pass
confirms the missing columns against the live database.

## How it works

`AgentWorker` polls on an interval: read snapshots from `IGameDatabaseReader`
→ `ChangeDetector` compares them against `AgentLocalStore`'s last-committed
`observed_state` → changed entities get a new `eventId` (UUID) and the next
`sourceSequence`, persisted to a local SQLite outbox in one transaction →
the outbox is drained over HTTPS to the Cloudflare Worker, HMAC-signed
per request → a heartbeat reports buffer depth/state.

**A PENDING outbox event is never evicted by capacity.** Hitting the hard
cap holds back *new* changes (and their `observed_state` write) entirely —
existing PENDING events keep draining/retrying. Only `SENT` (terminal) rows
age out. See `AgentLocalStoreTests`/`AgentWorkerTests` for the exact proof.

## Configuration

`appsettings.json` holds non-secret defaults. Real values for
`WorkerBaseUrl`, `HmacSecret` and `SqlServerConnectionString` (a SELECT-only
credential) come from environment variables
(`BLOODMOON_AGENT_Agent__WorkerBaseUrl`, etc.) or a local, gitignored
`appsettings.Local.json` — never committed. See `appsettings.example.json`
for the full shape.

## Build / test / publish

```
npm run game-bridge-agent:build
npm run game-bridge-agent:test
npm run game-bridge-agent:publish
```

Mirrors `apps/launcher`'s build convention (`scripts/build-game-bridge-agent.ps1`,
`win-x64` self-contained single-file publish) since this Agent runs on the
same Windows game VPS.

## What this phase does not do

No real SQL Server connection (none exists in this environment; none was
installed — a fake `IGameDatabaseReader` proves the pipeline instead). No
Queue, no R2. No account linking. No writes, ever.
