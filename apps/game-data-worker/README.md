# Blood Moon Game Data Worker

Cloudflare Worker + D1. Part of the Game Data Platform Phase 1 (read-only
foundation) — see `docs/game-data/architecture.md`. A project separate from
the portal app and from the unrelated external "Knowledge Hub" project;
never assume shared infrastructure with either.

**Server-to-server only.** Nothing here is reachable from a browser. Every
route requires a valid, route-bound HMAC signature (`src/auth/hmac.ts`) —
there are two independent secret scopes: `AGENT_SECRETS_JSON` (the
GameBridge Agent's write credential, for `/ingest/*`) and
`API_READ_SECRETS_JSON` (apps/api's read credential, for
`/internal/state/status`). A credential from one scope can never reach the
other's routes (see `test/read.spec.ts`).

## Routes

- `POST /ingest/events` — event envelope ingestion. INSERT-first
  `event_dedupe` check (a UNIQUE-constraint conflict is treated as an
  idempotent "already processed" success, not an error). Current-state
  UPSERT is guarded atomically in SQL by `sourceSequence` (scoped to
  `source`) — a delayed/out-of-order event can never regress current state.
- `POST /ingest/heartbeat` — Agent connectivity heartbeat. Never
  `GAME_SERVER_STATUS` — see `docs/game-data/architecture.md`.
- `GET /internal/state/status` — the only thing apps/api ever calls.
  Returns `{ bridgeStatus, lastHeartbeatAt }`, derived at read time from
  `agent_heartbeats.last_seen_at`. Nothing else.

## D1

Current-state and small bounded metadata only — never unlimited raw
telemetry (see `db/schema.sql`). `request_nonce` (transport-level replay
protection) and `event_dedupe` (business-level event deduplication) are
deliberately separate tables solving different problems; both use
INSERT-first as their concurrency authority, never a prior SELECT.

**Queue**: evaluated, not used this phase — `QUEUES = APPROVED FOR FUTURE,
PHASE_1 = NOT_REQUIRED`. At this scale (one Agent, low-frequency polling,
synchronous validate-and-UPSERT) a Queue adds operational surface with no
present benefit. **R2**: deferred — current-state is proven first.

## Testing

`npm run test` uses `@cloudflare/vitest-pool-workers` — tests run inside the
real `workerd` runtime against a real local D1 (SQLite), entirely offline.
No Cloudflare account is required for this. This is real verification, not
a mock, but it is still **local simulation**, never a substitute for
`REAL_CLOUDFLARE_CONNECTION` against a provisioned account.

## Secrets

Never committed. `wrangler secret put AGENT_SECRETS_JSON` /
`wrangler secret put API_READ_SECRETS_JSON` only, once a real Cloudflare
account exists. Local tests supply their own throwaway secrets via
`vitest.config.ts`'s Miniflare bindings.
