# Provisioning reconciliation worker (Phase 3D-B)

`apps/api/src/modules/game-provisioning-reconciliation/`. A standalone
module -- it imports `GameAccountIdentityModule` only for its already
public exports (`GameAccountProvisioningService`) and never edits any
Phase 3D-A file. All new persistent state this worker needs lives in its
own `GameProvisioningAttempt` table (plain `accountId`/
`provisioningRequestId` columns, joined by value, no Prisma relation to
`GameAccountIdentity`/`GameAccountCredential`).

## Why it exists

`POST /auth/register`'s post-commit dispatch call
(`docs/accounts/unified-registration.md`) is best-effort only. Without a
separate recovery path, a process crash between the Account+
GameAccountIdentity commit and the dispatch call landing would leave that
account permanently `PENDING`. `GameProvisioningReconciliationService`
periodically scans for exactly that case, and for two others:

- `PENDING` identities (never successfully dispatched yet, for any reason).
- `PROVISIONING` identities whose `lastAttemptAt` is stale (>5 minutes) --
  the in-flight command may already have succeeded or failed; a stale row
  gets a `reconcile()` check, not a fresh `dispatch()`.
- `FAILED` identities under the automatic-attempt ceiling -- retried via
  `dispatch()`, which itself reuses the existing `commandId`/
  `legacyLogin` if one was already allocated (never a second MU account).

Every action goes through `GameAccountProvisioningService.dispatch()` or
`.reconcile()` -- this worker never talks to the command transport,
credential envelope, or MU SQL directly, and never invents a new
`provisioningRequestId`.

## Backoff and attempt ceiling

Each automatic attempt is logged to `GameProvisioningAttempt`
(`accountId`, `provisioningRequestId`, `attemptNumber`, `outcome`,
`errorCode`, `attemptedAt`). Backoff schedule, keyed by attempts already
logged for that `provisioningRequestId`: immediate, 30s, 2min, 10min,
30min (capped), each with +/-20% jitter. After **8** automatic attempts on
a `FAILED` identity, the worker stops retrying it automatically -- it
remains inspectable/retryable via the admin endpoint below, using the same
`provisioningRequestId`, indefinitely (Part M: failure is never resolved
by deleting the account or the identity).

## Scheduling

Runs only when `GAME_PROVISIONING_RECONCILIATION_ENABLED=true`, on a
`setInterval` (default 30s, `GAME_PROVISIONING_RECONCILIATION_INTERVAL_MS`
to override), started in `onModuleInit`/cleared in `onModuleDestroy`. Off
by default -- no background timer runs in tests or in any environment that
hasn't explicitly opted in. `runOnce()` is also directly callable (used by
the e2e suite and available for a manual/ops trigger) without needing the
timer.

## Admin operational view

`GET /admin/game-provisioning` (permission `admin.game-provisioning.view`)
-- every non-`ACTIVE` identity with its attempt count, `createdAt`,
`lastAttemptAt`, and the same safe `lastErrorCode` `GameAccountIdentity`
already carries. Never the credential, ciphertext, or a raw SQL error.

`POST /admin/game-provisioning/:accountId/retry` (permission
`admin.game-provisioning.manage`) -- the one manual action. Bypasses
backoff and the attempt ceiling (an explicit human click is not the
"don't auto-retry forever" case the ceiling guards against) but still only
ever calls `dispatch()`/`reconcile()` -- there is no generic game-command
endpoint here or anywhere else.

## Activation checklist (production)

1. Local implementation + full regression green (this document's worker,
   `docs/accounts/unified-registration.md`'s register() change).
2. Controlled production deploy, migration review, backup
   (`docs/operations/local-test-database-isolation.md` covers the local
   side only -- production migration/backup are a separate, explicit step
   or this phase, tracked in the final report, not this doc).
3. `GAME_ACCOUNT_PROVISIONING_ON_REGISTER` and
   `GAME_PROVISIONING_RECONCILIATION_ENABLED` both flipped to `true` in
   production configuration only, after a controlled QA registration
   through the real public `/auth/register` path confirms the full chain
   end to end.
4. Rollback: either flag back to unset/`false` immediately halts new
   dispatch/reconciliation without touching `/auth/login`, existing
   accounts, or existing MU rows.

## Update (security hardening phase) -- production runner + concurrency guard

Production does not run the in-process `setInterval` loop described
above (`GAME_PROVISIONING_RECONCILIATION_ENABLED` stays unset/off there
by design). Instead, `apps/api/src/reconcile.ts` -- a standalone
`NestFactory.createApplicationContext` entry point, same shape as
`migrate-two-factor-keys.ts`/`provisioning-health.ts` -- runs one bounded
`runOnce()` pass per invocation, triggered by a cPanel cron job. This
avoids a long-lived background timer inside a process a hosting
environment can restart/recycle at any time, in favor of a simple,
observable, individually-logged unit of work per tick.

`runOnce()`/`manualRetry()` are both wrapped in a real MySQL
`GET_LOCK(...)`/`RELEASE_LOCK(...)` mutual-exclusion guard
(`withReconciliationLock`, a dedicated single-connection `PrismaClient` so
the lock isn't pinned to a connection the application's normal pool might
recycle mid-hold). `GET_LOCK` uses a 0-second timeout -- non-blocking, so
a second concurrent invocation (overlapping cron tick, an accidental
second app instance, a manual trigger racing the scheduled one) returns
an empty/`BUSY` result immediately rather than queueing or double-running
the batch. A crashed process still releases the lock automatically when
MySQL closes its connection. Verified by reading the deployed
implementation directly, not just this description.
