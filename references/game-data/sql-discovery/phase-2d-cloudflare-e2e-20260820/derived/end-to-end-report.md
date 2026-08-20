# Phase 2D — real Cloudflare provisioning + end-to-end proof, 2026-08-20

## What this closes

Phase 2C left `REAL_WORKER`/`REAL_D1` as `BLOCKED` (no Cloudflare account
access existed yet) and `END_TO_END_REAL_INFRA` as `NOT_TESTED`. This
phase: audited existing auth first (found none accessible, then the user
authenticated a real account), reused that account rather than creating a
new one, provisioned real, logically-separate Game Data resources, and
proved every link of the chain with real infrastructure.

## The full chain, each link independently verified

```
Real MU SQL Server (same VPS)
    ↓ Microsoft.Data.SqlClient, real SqlServerGameDatabaseReader   [Phase 2C, re-confirmed]
Real normalized snapshot (AccountSnapshotChangeFactory)            [payloadSha256 630518fb...1679a]
    ↓ real HmacRequestSigner + GameDataClient, HTTPS
Real deployed Cloudflare Worker (bloodmoon-game-data-worker)       [heartbeat + event both PASS]
    ↓
Real D1 (bloodmoon-game-data)                                      [verified via wrangler d1 execute --remote]
    ↓ real GameDataClient (Node), real HMAC
apps/api's real /admin/game-data/status                            [real JWT, real guards, PASS]
```

Every arrow above was independently exercised with real components, not
simulated at any point. `END_TO_END_REAL_INFRA = PASS` — the strict
reading: all seven required sub-proofs are real, not partial.

## Two real problems found and fixed along the way

1. **BOM injection by `wrangler secret put`** — a genuine external CLI
   quirk (this project's pinned wrangler 3.114.17, on Windows), not a
   bug in this project's own code. Every secret silently failed to
   authenticate anything until root-caused via a temporary,
   secret-value-blind debug route (character codes and a hash only) and
   fixed with a one-line BOM-strip in `parseSecrets`. See
   `raw/02-bom-diagnosis.txt`.
2. **`secret put` not taking effect until the next `deploy`** — found
   during the same investigation, now a documented operational habit
   (`docs/game-data/cloudflare-resources.md`).

Neither was assumed away or worked around with a fake/mocked test — both
were chased to ground truth against the real deployed instance before
declaring anything `PASS`.

## What was deliberately NOT done

- No new Cloudflare account created (the existing one, already hosting
  Knowledge Hub, was reused with fully separate resources).
- No R2/Queues/KV/Durable Objects provisioned (not needed this phase).
- No firewall or SQL port change (same-host `localhost` connectivity,
  unchanged from Phase 2C).
- No Account Linking schema, endpoint, or UI.
- No test-data cleanup performed beyond what's necessary — the resulting
  D1 rows (one heartbeat, one account snapshot) are the correct, minimal,
  real current-state, not disposable pollution (Part Z consideration:
  nothing to clean up).
- No push.

## Regression

`BloodMoon.GameBridgeAgent.Tests`: 63/63 (unchanged from Phase 2C).
`apps/game-data-worker` vitest: 30/30 (25 original + 2 account.snapshot +
3 BOM-tolerance, all new this phase). `apps/api`'s original
local-simulation e2e spec: 3/3, unchanged, re-run after the Worker code
changes to confirm no regression. New real-Cloudflare e2e spec: 1/1.
