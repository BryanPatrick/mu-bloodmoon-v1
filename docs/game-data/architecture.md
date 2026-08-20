# Game Data Platform — architecture (Phase 1)

Approved in the Global Portal Audit and re-confirmed unchanged this phase:

```
SQL Server → GameBridge Agent (.NET 8, outbound-only HTTPS)
           → Cloudflare (Worker + D1)
           → apps/api (sole server-to-server consumer)
           → Web / Launcher (unchanged REST contract)
```

Web and Launcher never talk to Cloudflare or SQL Server directly. `apps/api`
remains the single product authority. This is a project separate from the
portal app and from the unrelated external "Knowledge Hub" project — never
assume shared Cloudflare infrastructure with either.

## Components

- **`apps/game-bridge-agent`** (.NET 8 Worker Service) — polls the game
  database (currently schema-blocked, see `docs/game-data/schema/`),
  detects changes against its own local state, and pushes signed event
  envelopes to the Worker over HTTPS. Read-only by construction — see
  `docs/game-data/security-boundaries.md`.
- **`apps/game-data-worker`** (Cloudflare Worker + D1) — ingestion,
  validation, replay protection, dedupe, current-state persistence and
  heartbeat. Nothing here is reachable from a browser.
- **`apps/api/src/modules/game-data`** — `GameDataClient` reads the Worker's
  current state over its own, independent HMAC scope. One admin-only
  diagnostic endpoint; no public/product surface yet.

## Read-only, absolutely

`GAME_WRITES_PERFORMED` is always `0`. `IGameDatabaseReader` has no
write-capable member — not "unused," genuinely absent from the interface.

## Technology decisions carried over from the audit, re-confirmed

- **Workers**: use. **D1**: use, current-state only, never unlimited raw
  telemetry (see the D1 schema in `apps/game-data-worker/db/schema.sql`).
- **Queues**: `QUEUES = APPROVED FOR FUTURE, PHASE_1 = NOT_REQUIRED`. At
  this phase's scale — one Agent, low-frequency polling, synchronous
  validate-and-UPSERT — a Queue adds operational surface with no present
  benefit. Revisit if fan-out or volume grows.
- **R2**: deferred. Current-state is proven first; no event-history/archive
  storage exists yet.
- **KV / Durable Objects**: not used, not evaluated further this phase.

## Event identity, sequencing and idempotency

- **`eventId`** is generated once, when a change is actually persisted to
  the Agent's local outbox — never reconstructed deterministically from the
  payload on each poll. A retry of a failed send reuses the exact same
  persisted `eventId`.
- **`sourceSequence`** is a monotonic counter the Agent persists locally,
  scoped to `(source, serverId)` — not globally comparable. The Worker's
  current-state UPSERT only applies a write when the incoming sequence is
  greater than what is stored for that entity *from the same source*, so a
  delayed/out-of-order event can never regress current state. Phase 1 has
  exactly one Agent; multi-agent/failover comparison logic is explicitly
  not implemented, only the schema shape (`source`/`server_id` columns) is
  in place for it.
- **Event deduplication** (`event_dedupe`, D1) and **request replay
  protection** (`request_nonce`, D1) are separate concerns: the first is
  business-level ("did we already apply this event"), the second is
  transport-level ("did we already see this exact signed request"). Both
  use an INSERT-first, UNIQUE-constraint-is-the-authority pattern — never a
  prior SELECT — so they stay correct under concurrent requests.
- **The outbox never silently drops a pending event.** Hitting its hard cap
  holds back *new* changes entirely (including the observed-state write) —
  existing pending events keep draining and retrying. Only successfully
  sent events are ever pruned, and only after a retention window.

## Heartbeat terminology — read this before wiring anything to the home page

`BRIDGE_HEALTHY` / `BRIDGE_STALE` / `BRIDGE_OFFLINE` describes **Agent
connectivity** — whether the Agent has recently reported in. It is **not**
`GAME_SERVER_STATUS` and must never be treated as one. The home page's
server-status badge (`apps/api/src/modules/launcher/launcher.service.ts`,
shipped in the Global Portal Audit's P1.2 fix) is **not touched** in this
phase: its `statusSource` stays `MANUAL`/`UNKNOWN` only. `LIVE` is reserved
for a future phase that has a real basis for claiming live game-server
status — Agent heartbeat alone is not that basis.

## Local verification vs. real infrastructure

No real MU SQL Server and no real Cloudflare account exist in this
environment. Everything above is built for real production use, but
*verified* two different ways depending on the layer:

- The Worker is verified against `@cloudflare/vitest-pool-workers` (a real
  local `workerd` runtime + a real local D1), and separately against a
  real, locally-run `wrangler dev` process driven by an apps/api e2e test —
  both are genuine executions of the real code, not mocks, but both are
  still local simulation, not a provisioned Cloudflare account.
- The Agent's database layer is verified against a fake `IGameDatabaseReader`
  test double, since `SqlServerGameDatabaseReader` cannot honestly query
  anything yet (see `docs/game-data/schema/`) and no SQL Server was
  installed locally (a deliberate choice — see `docs/game-data/phase-1-report.md`).

See `docs/game-data/phase-1-report.md` for the exact, non-conflated status
fields (`END_TO_END_LOCAL_SIMULATION` vs `REAL_MU_SQL_CONNECTION` vs
`REAL_CLOUDFLARE_CONNECTION` vs `END_TO_END_REAL_INFRA`).

## Update — Phase 2B real account read models (2026-08-20)

The paragraphs above described Phase 1's status verbatim, kept unedited per
the never-silently-overwrite rule. As of this date, `SqlServerGameDatabaseReader`
is **no longer entirely schema-blocked**: 10 new account-scoped methods
(account/character/master-level/guild/rankings/currencies/online-status)
are real, parameterized implementations against schema confirmed
`REAL_SQL_METADATA` on 2026-08-20 — see
`docs/game-data/read-models/account-snapshot.md` for the full contract.
Phase 1's original bulk-poll methods
(`GetCharacterResetSnapshotsAsync`/`GetRankingSnapshotsAsync`) are
untouched and remain `BLOCKED_BY_SCHEMA_DISCOVERY` — this was a deliberate,
additive addition, not an architecture redesign.

The distinction in "Local verification vs. real infrastructure" above
still holds with one refinement: the 10 new methods' SQL query text and
logic *were* validated against real live data (via the pre-existing
`bm-sql` bridge, the same read-only access already approved — see
`references/game-data/sql-discovery/phase-2b-readmodel-validation-20260820/`),
but `Microsoft.Data.SqlClient` has still never physically opened a
connection from this codebase to the real server — no such connection is
possible from the current dev environment without opening a new,
unauthorized network path (`D:\MU\docs\remoteops-runbook.md` is explicit
that SQL is reached only through `bm-sql`/SSH; port 1433 is never opened).
`REAL_MU_SQL_CONNECTION` (via `bm-sql`, for validation) and
`REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION` (the Agent's own ADO.NET
connection, physically executed) are two different claims — only the
first is `PASS` as of this update.

## Update — Phase 2C real Agent↔SQL connectivity (2026-08-20)

The paragraph immediately above is now out of date on its final claim,
kept unedited per the never-silently-overwrite rule.
`REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION` is now **`PASS`**: a real
`Microsoft.Data.SqlClient` connection, using the Agent's own real
`SqlServerGameDatabaseReader`/`AccountSnapshotReader` code, was proven
against the live server. See `docs/game-data/deployment-topology.md` for
the full method (same-host `localhost` connectivity, no tunnel, no new
port) and
`references/game-data/sql-discovery/phase-2c-real-connectivity-20260820/`
for raw evidence, including a determinism proof (two independent real
reads, identical payload hash) and a real invalid-credential failure-mode
test. `apps/game-bridge-agent/tools/ConnectivityProbe` is the harness that
proved this — a one-shot diagnostic tool, not a production deployment; no
Windows Service was installed on the VPS this phase. Cloudflare
provisioning (Worker/D1/real event flow) remains unattempted — no
Cloudflare account or credential exists yet for this project — so
`END_TO_END_REAL_INFRA` stays `NOT_TESTED`.
