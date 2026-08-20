# Security boundaries (Phase 1)

Each claim below is backed by a specific, named test — not asserted on
faith.

## Nothing is reachable from a browser

Every Worker route requires a valid, route-bound HMAC signature.
`test/read.spec.ts`'s "an unauthenticated request to the read endpoint is
rejected, not served" and `test/hmac.spec.ts`'s "rejects a request with no
signature headers at all" prove there is no anonymous path into the Worker.

## A signature is bound to its exact request

`test/hmac.spec.ts` proves a signature captured for `POST /ingest/events`
is rejected when replayed against `POST /ingest/heartbeat`, and vice versa
— the canonical string includes method, path, query and a body hash, so a
signature cannot be moved to a different route.

## Two independent credential scopes, never interchangeable

The GameBridge Agent's write credential (`AGENT_SECRETS_JSON`) and apps/api's
read credential (`API_READ_SECRETS_JSON`) are separate secret maps.
`test/read.spec.ts` proves the write scope cannot reach the read endpoint
and the read scope cannot reach ingest.

## The Agent has no portal-DB credential

`apps/game-bridge-agent`'s configuration surface (`AgentOptions`) holds only
a SQL Server connection string, a Worker base URL and an Agent-scoped HMAC
secret — grep-provable: nothing in `apps/game-bridge-agent` references
`DATABASE_URL`, a Prisma client, or any portal MySQL credential.

## apps/api and the Worker have no SQL Server credential

Grep-provable: `MU_DATABASE_URL`/`SqlServerConnectionString` and equivalents
appear only in `apps/game-bridge-agent`'s configuration. Neither
`apps/api/src/modules/game-data` nor `apps/game-data-worker` reference a SQL
Server connection string anywhere.

## Real writes are impossible by construction, not by discipline

`IGameDatabaseReader` (`apps/game-bridge-agent/GameDatabase/IGameDatabaseReader.cs`)
has no write-capable member. `SqlServerGameDatabaseReaderTests`'s reflection
check proves this for both the interface and the real implementation —
there is no `Insert`/`Update`/`Delete`/`Execute*NonQuery` method to
accidentally call. `GAME_WRITES_PERFORMED` stays `0`.

## Diagnostic endpoint never leaks internals

`GET /admin/game-data/status` returns exactly `{ bridgeStatus,
lastHeartbeatAt }` — no Worker URL, no HMAC material, no SQL Server detail,
under any condition including "platform not configured," which resolves to
a controlled `UNKNOWN`/`null`, never a 500 or a stack trace.
