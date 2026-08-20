# Game Data Platform — Phase 1 report

Read-only end-to-end foundation. Everything below reflects the state after
implementation, not a plan.

## Status fields

```
AGENT_FOUNDATION                 = PASS
CLOUDFLARE_PLATFORM_FOUNDATION   = PASS
APPS_API_INTEGRATION_FOUNDATION  = PASS
LOCAL_END_TO_END_PROOF           = PASS

END_TO_END_LOCAL_SIMULATION      = PASS
REAL_MU_SQL_CONNECTION           = NOT_TESTED
REAL_CLOUDFLARE_CONNECTION       = NOT_TESTED
END_TO_END_REAL_INFRA            = NOT_TESTED

GAME_WRITES_PERFORMED            = 0
CPANEL_TELEMETRY_STORAGE_GROWTH  = ZERO

SCHEMA_CONFIRMED  = 0
SCHEMA_OBSERVED   = 9   (Character.ResetCount, Character.MasterResetCount,
                          CashShopData.WCoinC, CashShopData.GoblinPoint,
                          MasterSkillTree.MasterLevel,
                          RankingBloodCastle/DevilSquare/ChaosCastle/CastleSiege.Score)
SCHEMA_INFERRED   = 4   (candidate join/identity columns, see
                          docs/game-data/schema/join-keys-unknown.md --
                          none used in code)
SCHEMA_UNKNOWN    = 2   (MasterSkillTree / Ranking* join keys)

OUTBOX_PENDING_EVICTION   = NEVER
BUFFER_BACKPRESSURE       = PASS

HMAC_ROUTE_BINDING          = PASS
REQUEST_REPLAY_PROTECTION   = PASS
EVENT_DEDUPLICATION         = PASS
ATOMIC_SEQUENCE_GUARD       = PASS
SEQUENCE_SURVIVES_RESTART   = PASS
```

`REAL_MU_SQL_CONNECTION`, `REAL_CLOUDFLARE_CONNECTION` and
`END_TO_END_REAL_INFRA` are `NOT_TESTED`, not `FAIL` — no real MU SQL Server
and no real Cloudflare account exist in this environment; nothing was
faked in their place. `END_TO_END_LOCAL_SIMULATION` is a real, honest PASS
against genuine local infrastructure (real `workerd`, real local D1, a real
`wrangler dev` process, real HMAC verification) — it is not a mock, but it
is also never to be read as `END_TO_END_REAL_INFRA`.

## What was achieved

1. **Agent foundation** — `apps/game-bridge-agent`, a .NET 8 Worker
   Service. Poll → change-detect → atomically persist (eventId + monotonic,
   restart-safe `sourceSequence`) → drain over signed HTTPS → heartbeat.
   23/23 xunit tests pass, including the mandated buffer-full scenario (a
   change is held back, never partially recorded, and is re-detected
   correctly once the buffer drains) and a genuine crash/restart recovery
   test (kill the process mid-flight, reopen the same SQLite file, the
   exact same pending event is still there).
2. **Cloudflare platform foundation** — `apps/game-data-worker`. 25/25
   tests against the real local Workers runtime (`@cloudflare/vitest-pool-workers`,
   not a mock) prove HMAC route-binding, INSERT-first nonce/dedupe
   concurrency safety, and the atomic sequence-guarded current-state UPSERT
   converging correctly under concurrent out-of-order writes.
3. **apps/api integration foundation** — `apps/api/src/modules/game-data`.
   `GameDataClient` never writes to disk and never throws; the diagnostic
   endpoint (`GET /admin/game-data/status`) is real-guarded, permission-gated,
   and degrades to a controlled `UNKNOWN` when unconfigured.
4. **Local end-to-end proof** — an apps/api e2e test drives a real,
   separately-spawned `wrangler dev` process (not the in-process test
   harness): a signed heartbeat write reaches the real local Worker, lands
   in real local D1, and `GameDataClient` reads it back through the real
   diagnostic endpoint. 3/3 tests pass.

## What was not achieved (and why)

5. **Real MU SQL validation** — not attempted. No SQL Server access exists
   in this environment, and none was installed locally (a deliberate
   choice, confirmed during planning). `SqlServerGameDatabaseReader`'s real
   methods are intentionally `BLOCKED_BY_SCHEMA_DISCOVERY` — see
   `docs/game-data/schema/join-keys-unknown.md`. This is correct Phase 1
   behavior, not an oversight.
6. **Real Cloudflare validation** — not attempted. No Cloudflare account
   exists in this environment. Nothing was provisioned; `wrangler.toml`'s
   `database_id` is a placeholder that must be replaced once a real account
   creates a real D1 database.

## Full test/build matrix (this session)

- `dotnet test` (Agent): 23/23 pass.
- `npx vitest run` (Worker): 25/25 pass.
- apps/api e2e (game-data local proof): 3/3 pass.
- apps/api broader regression batch (characters/marketplace/launcher/auth-RBAC/
  portal-critical/error-handling + the new game-data spec): 93/93 pass.
- `apps/api`: `tsc --noEmit` clean, `nest build` clean.
- `apps/game-data-worker`: `tsc --noEmit` clean.
- Official web build (`npm run web:build`, root script, nitro-patched):
  exit 0, no errors.

## The 10 narrative questions

**1. What was the first real data point, and what was its provenance?**
There is no real data point — no real SQL Server exists here. The
end-to-end proof's data point was a fabricated heartbeat payload
(`{ agentId: "e2e-test-agent", serverId: "bloodmoon-s6", bufferState:
"NORMAL", bufferDepth: 0 }`), sent by the e2e test standing in for the
Agent. This is stated plainly, not implied otherwise.

**2. How did it reach the Agent?**
It didn't — in the real chain, the Agent would read it from
`IGameDatabaseReader`. In this proof, the test constructed the payload
directly and signed it exactly the way the Agent's `HmacRequestSigner`
would, to exercise the real transport and Worker-side verification without
a real database in the loop.

**3. How was it authenticated to Cloudflare?**
HMAC-SHA256 over a canonical string (`clientId\nMETHOD\npath\nquery\ntimestamp\nnonce\nsha256(body)`),
verified server-side via `crypto.subtle.verify` — the same mechanism the
real Agent and apps/api use, exercised with real (locally-generated,
throwaway) secrets against a real `wrangler dev` process, not a mock.

**4. Where did it land in D1?**
`agent_heartbeats`, keyed by `agent_id`, in a real local D1 SQLite file
under `apps/game-data-worker/.wrangler/state/v3/d1` — created by
`wrangler d1 migrations apply --local`.

**5. How did apps/api query it and receive it?**
`GameDataClient.getBridgeStatus()` signed a `GET /internal/state/status`
request with the api-read HMAC scope, sent it to the same local `wrangler
dev` instance, and received `{ bridgeStatus: "HEALTHY", lastHeartbeatAt:
"<real ISO timestamp>" }` — surfaced through the real, permission-gated
`GET /admin/game-data/status` endpoint.

**6. What happens when the internet connection drops?**
The Agent's outbox holds the event as `PENDING` indefinitely (never
capacity-evicted) and retries on the next poll cycle; `observed_state` is
never advanced for anything not yet durably sent, so nothing is lost, only
delayed. If the outbox reaches its hard cap, the Agent stops accepting
*new* changes (and reports `bufferState: FULL` in its heartbeat) while
continuing to retry what's already buffered — proven in
`AgentWorkerTests.Buffer_full_holds_back_a_new_change_and_never_advances_observed_state_until_drained`.

**7. How is duplication avoided?**
Two independent mechanisms for two different problems: `event_dedupe`
(business-level — the same `eventId` sent twice is an idempotent no-op) and
`request_nonce` (transport-level — the same signed request replayed is
rejected outright). Both use D1's UNIQUE constraint as the authority,
INSERT-first, so they stay correct under concurrent requests — proven in
`test/nonce.spec.ts` and `test/ingest.spec.ts`.

**8. How much cPanel storage space is used?**
Zero. `apps/api/src/modules/game-data/game-data.client.ts` makes no
filesystem writes anywhere on any path — every response, including
failures, resolves to an in-memory DTO. `CPANEL_TELEMETRY_STORAGE_GROWTH =
ZERO` is true by construction, not by monitoring.

**9. What exactly remains before Account Linking can start?**
A real, read-only schema discovery pass against the live SQL Server to
confirm the actual identity/join columns on `Character` (see
`docs/game-data/schema/join-keys-unknown.md`) — nothing in Account Linking
can proceed safely (and specifically, username equality must not be used)
until that exists. See `docs/game-data/account-linking-contract.md`.

**10. What would change once real infrastructure exists?**
`SqlServerGameDatabaseReader` gets real, schema-confirmed queries (only
after discovery); a real Cloudflare account replaces `wrangler.toml`'s
placeholder `database_id` and receives real `wrangler secret put` values;
`REAL_MU_SQL_CONNECTION`/`REAL_CLOUDFLARE_CONNECTION`/`END_TO_END_REAL_INFRA`
become genuinely testable. Nothing about the architecture, envelope shape,
sequencing, or security boundaries needs to change to get there — Phase 1
was built for that transition, not around its absence.
