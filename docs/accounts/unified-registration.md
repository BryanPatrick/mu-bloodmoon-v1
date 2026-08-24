# Unified registration activation (Phase 3D-B)

Wires the already-built Phase 3D-A provisioning primitives
(`GameAccountProvisioningService.dispatch()`/`.reconcile()`,
`docs/accounts/game-account-provisioning.md`) into the real public
`POST /auth/register` path. This file documents the activation, not the
underlying command/transport/credential mechanics -- those stay owned by
`docs/accounts/game-account-provisioning.md`,
`docs/game-data/production-command-transport.md`, and
`docs/security/game-credential-envelope.md`, none of which this phase
edits.

## What changed in `register()`

`AuthService.register()` (`apps/api/src/modules/auth/auth.service.ts`) was
already atomically creating `Account` + `GameAccountIdentity(PENDING)` via
one Prisma nested-write, gated by `GAME_ACCOUNT_PROVISIONING_ON_REGISTER`
(Phase 3B). Two things were added this phase:

1. **A best-effort post-commit dispatch.** After the account row exists,
   if a `gameIdentity` was created *and* the command transport is
   configured (`GAME_DATA_WORKER_URL` + `GAME_COMMAND_PORTAL_SECRET` both
   set), `register()` fires `gameAccountProvisioning.dispatch(account.id)`
   without awaiting it. Any failure is caught and logged, never thrown --
   the HTTP response never waits on Cloudflare/Agent/SQL. When the
   transport isn't configured, the call is skipped entirely (not
   attempted) rather than fired and left to fail, so an unconfigured
   environment (every local/test run today) never generates a real
   credential or flips the identity to `PROVISIONING` for nothing.
2. **Safe response fields.** `RegisterResponse` now includes `gameReady`
   and `provisioningStatus` (`NONE | PENDING | PROVISIONING | ACTIVE |
   FAILED`), mirroring `/launcher/me`'s existing convention. Never
   `legacyLogin`, `membGuid`, the credential envelope, `commandId`, or
   `provisioningRequestId`.

## Why the immediate dispatch is not the safety net

Part I's crash scenario -- the process dies after the Account +
GameAccountIdentity transaction commits but before the dispatch call lands
-- is handled by the reconciliation worker
(`docs/operations/provisioning-reconciliation.md`), not by this call. The
post-commit dispatch is purely a latency optimization (provisioning starts
immediately instead of waiting for the next reconciliation tick); every
identity it might miss is still found and dispatched by the worker's own
periodic scan, which finds PENDING rows unconditionally.

## Duplicate / concurrent registration

Unchanged from before this phase: `Account.username`/`Account.email` are
both `@unique`, so a duplicate or concurrent registration with the same
email/username fails with `409` at the database constraint, before a
second `GameAccountIdentity` could ever be created. `GameAccountIdentity`
is itself `@unique` on `accountId`, so even if `register()` were somehow
called twice for the same already-existing account, at most one identity
row can exist.

## Feature flag lifecycle

`GAME_ACCOUNT_PROVISIONING_ON_REGISTER` stays `OFF` (unset) in every
environment until a separate, explicit production activation step
(`docs/operations/provisioning-reconciliation.md`'s activation checklist).
Turning it `OFF` again disables new provisioning dispatch immediately
without touching `/auth/login` or any existing account/identity row --
Portal authentication has no dependency on this flag.
