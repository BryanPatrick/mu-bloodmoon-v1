# Real Cloudflare resources (Phase 2D)

New in this update (2026-08-20). Documents what was actually provisioned —
no tokens, no secret values, ever.

## Account

Same Cloudflare account that already hosts the unrelated "AI Knowledge
Hub" project (`D:\MU\hub`) — reused deliberately per Phase 2D's explicit
instruction not to assume a new account is needed, confirmed via
`wrangler whoami` to be a single, unambiguous account (one account listed,
matching the project owner's own email). **Game Data's resources are
logically separate from Knowledge Hub's** — distinct Worker, distinct D1
database, distinct secrets, no shared bindings, nothing renamed or
repurposed from the Knowledge Hub project.

| | Knowledge Hub (untouched) | Game Data Platform (this phase) |
|---|---|---|
| Worker | `ai-knowledge-hub` | `bloodmoon-game-data-worker` |
| D1 | `ai-knowledge-hub-db` | `bloodmoon-game-data` |
| R2 | `ai-knowledge-hub-storage` | none (deferred, not needed) |

## Worker

- **Name**: `bloodmoon-game-data-worker`
- **URL**: `https://bloodmoon-game-data-worker.bryanelrick22.workers.dev`
- **Source**: `apps/game-data-worker/` (existing Phase 1 implementation,
  not rewritten — see "What changed" below for the one real addition)
- **Deployed**: 2026-08-20, from the working tree at the time (pre-commit;
  see the Phase 2D commit for the exact source snapshot)
- **Bindings**: `DB` → D1 database `bloodmoon-game-data`
- **Secrets** (`wrangler secret put`, values never logged/committed):
  `AGENT_SECRETS_JSON` (map of Agent clientId → HMAC secret — currently
  one entry, `gamebridge-agent-01`), `API_READ_SECRETS_JSON` (map of
  read-scope clientId → HMAC secret — currently one entry, `apps-api`,
  matching the hardcoded `CLIENT_ID` constant in
  `apps/api/src/modules/game-data/game-data.client.ts`)

## D1

- **Name**: `bloodmoon-game-data`
- **Database ID**: `cf84e6fe-7ea6-4f0b-a2f2-313ec3c0dab6` (not secret —
  D1 database IDs are opaque identifiers, not credentials — recorded here
  and in `apps/game-data-worker/wrangler.toml` for operational reference)
- **Migrations applied** (both, confirmed via `wrangler d1 migrations
  apply --remote`):
  - `0001_init.sql` (Phase 1: `request_nonce`, `event_dedupe`,
    `character_reset_state`, `ranking_state`, `agent_heartbeats`)
  - `0002_account_snapshot_state.sql` (Phase 2D addition: see below)
- **Schema validated real** via `wrangler d1 execute --remote` against
  `sqlite_master` — exactly the 7 application tables above, zero
  Account Linking schema, zero extra tables.

## What changed in the Worker's code this phase (and why)

Two small, narrowly-scoped additions — not an architecture rewrite:

1. **`account.snapshot` event-type support** (`src/ingest.ts` +
   `db/migrations/0002_account_snapshot_state.sql`). Phase 1 only wired
   `character.reset-state`/`ranking.state` — but those event types' real
   SQL readers remain `BLOCKED_BY_SCHEMA_DISCOVERY` (Phase 1/2B), so no
   real event of either type can currently exist. `account.snapshot`
   (Phase 2B/2C's real, account-scoped read model) is the *only* event
   type real SQL data can currently produce. Wiring it in used the exact
   same atomic sequence-guarded UPSERT pattern already established for
   the other two event types — same shape, third instance, not a new
   pattern. See `docs/game-data/read-models/account-snapshot.md`.
2. **BOM-tolerant secret parsing** (`src/index.ts`'s `parseSecrets`). A
   real, reproducible characteristic of this project's pinned
   `wrangler@3.114.17` on Windows: `wrangler secret put`, reading a value
   piped over stdin, prepends a UTF-8 BOM (U+FEFF) to the stored secret
   regardless of how the piped string itself was encoded on the sending
   side — confirmed by direct inspection (a temporary debug route that
   reported the raw secret's first character code and a SHA-256 hash,
   removed after diagnosis; never exposed a secret value). Every
   `clientId` was reading as unknown until this was found and fixed.
   `parseSecrets` now strips a single leading BOM before `JSON.parse`.
   See `test/hmac.spec.ts`'s BOM-tolerance tests.

## Operational gotcha worth recording

**`wrangler secret put` does not take effect for the currently-serving
Worker version until the next `wrangler deploy`** (confirmed empirically
this phase, on this wrangler version — a fresh `secret put` with no
redeploy kept serving the *previous* secret value, sometimes for several
requests even after a redeploy, consistent with normal edge-propagation
lag on top of the redeploy requirement). Always run `wrangler deploy`
immediately after `wrangler secret put` and allow a few seconds before
relying on the new value.

## No new external exposure

No firewall rule was created or modified anywhere. No SQL port was
opened. Cloudflare Worker routes are the only new internet-reachable
surface, and every route except errors/404 requires a valid HMAC
signature (see `docs/game-data/security-boundaries.md`) — confirmed via
real rejected requests in
`references/game-data/sql-discovery/phase-2d-cloudflare-e2e-20260820/`.

## Deferred, not provisioned (unchanged from Phase 1's decision)

`R2 = DEFERRED`, `QUEUES = DEFERRED`, `KV = DEFERRED`,
`DURABLE_OBJECTS = DEFERRED` — none of Phase 2D's real E2E proof needed
them, and provisioning them without a present need would violate this
phase's own explicit instruction.
