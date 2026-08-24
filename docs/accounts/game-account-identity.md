# GameAccountIdentity — Phase 3B

The Portal-side half of the Unified Blood Moon Account model. Lives in
`apps/api/prisma/schema.prisma`, service in
`apps/api/src/modules/game-account-identity/`.

## Model

```prisma
model GameAccountIdentity {
  id                     String                 @id @default(uuid())
  accountId              String                 @unique
  membGuid               Int?                   @unique
  legacyLogin            String?                @unique @db.VarChar(10)
  provisioningStatus     GameProvisioningStatus @default(PENDING)
  provisioningRequestId  String                 @unique
  provisionedAt          DateTime?
  lastErrorCode          String?                @db.VarChar(191)
  lastAttemptAt          DateTime?
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt
  account                Account                @relation(fields: [accountId], references: [id], onDelete: Cascade)
}
```

- `accountId` — `@unique`: one game identity per Blood Moon Account, ever.
- `membGuid` — `Int?`, `@unique`: null until real provisioning succeeds;
  once set, unique across all identities (defense in depth — the real
  MU schema's own uniqueness on this column is already confirmed real,
  see `docs/game-data/account-identity.md`).
- `legacyLogin` — `String?(10)`, `@unique`: same shape as
  `MEMB_INFO.memb___id`, generated internally, never a copy of
  `Account.username` (which is unconstrained). Unique here as defense in
  depth, since the real MU schema does **not** enforce uniqueness on
  `memb___id` at the DB level (`account-linking-contract.md`'s original
  finding, still true).
- `provisioningRequestId` — `@unique`, generated exactly once, the
  idempotency anchor for the future `CREATE_GAME_ACCOUNT` command.
- No password/credential field of any kind — see
  `docs/game-data/unified-account.md`'s Password strategy section for
  why a generated game credential, if one is ever needed, must live in
  its own, separately-scoped store.

## State machine

```
enum GameProvisioningStatus { PENDING, PROVISIONING, ACTIVE, FAILED }
```

```
PENDING ------> PROVISIONING ------> ACTIVE
                     |
                     v
                  FAILED --------> PROVISIONING (retry)
```

Enforced by a fixed allow-list in `GameAccountIdentityService` (no
arbitrary transition is possible):

| From | May go to |
|---|---|
| `PENDING` | `PROVISIONING` |
| `PROVISIONING` | `ACTIVE`, `FAILED` |
| `ACTIVE` | *(none — terminal)* |
| `FAILED` | `PROVISIONING` (retry) |

Every other transition (`PENDING → ACTIVE`, `PENDING → FAILED`,
`ACTIVE → anything`) throws `InvalidProvisioningTransitionError` (409).

## GAME_READY semantics

`GameAccountIdentityService.isGameReady(identity)` is the single
authority: `true` only when `provisioningStatus === 'ACTIVE'` **and**
`membGuid !== null`. No separate `gameReady` boolean column exists on
the model — that would be a second, potentially-desyncing source of
truth for the same fact. Every caller (the Launcher's `/me` routes, and
any future consumer) calls this method rather than re-deriving readiness
from `provisioningStatus` itself.

## Idempotency (Part H)

`provisioningRequestId` is generated **once**, in
`buildPendingCreateInput()`, at row creation. `retry()` reuses the
existing row and its existing `provisioningRequestId` — it never
generates a new one and never creates a second row. `ensurePendingForAccount()`
is itself idempotent: calling it twice for the same account returns the
same row both times (verified in
`apps/api/test/game-account-identity.e2e-spec.ts`). This is the
foundation Phase 3C's `CREATE_GAME_ACCOUNT` retry logic will build on —
a retried command carrying the same `provisioningRequestId` must be safe
to receive twice without ever provisioning a second MU account.

## Tests

`apps/api/test/game-account-identity.e2e-spec.ts` (11 tests, against the
real local database — this project has no mocked-Prisma unit tests
anywhere, so this follows the established convention): idempotent
creation, `accountId`/`provisioningRequestId`/`membGuid`/`legacyLogin`
uniqueness at the real DB level, every valid transition, three distinct
invalid-transition rejections, and the FAILED→retry→same-request-ID
proof.
