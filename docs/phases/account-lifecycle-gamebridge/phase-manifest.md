# Phase manifest: account-lifecycle-gamebridge

```
PHASE_ID: account-lifecycle-gamebridge
TITLE: Real GameBridge delivery for ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT
OBJECTIVE: Recover AccountLifecycleBridgeService (the real sender that
  closes the "queued but never delivered" gap for both operations,
  present since Phase 14) and the account-deletion-domain changes it
  depends on, without duplicating already-protected AccountDeletionFeedback
  work or carrying in anything from Blood Coin/VIP/Legacy Catalog/
  Progression/Launcher.
SCOPE: see Fase 2 classification below.
NON_SCOPE: Survey (audited separately, not extracted -- see the Batch 3
  final report). The Payment-Risk-era test hardening in
  account-deletion.e2e-spec.ts (WalletLedgerEntry/PurchaseIntent
  preservation assertions, "PHASE P Part 16") -- real, but a different
  concern (financial-retention testing) than lifecycle-bridge; excluded,
  privacy-feedback-release's original test content used instead. .env.example
  documentation for ACCOUNT_LIFECYCLE_BRIDGE_ENABLED/_INTERVAL_MS/_BATCH_SIZE
  -- a real, small, pre-existing gap in the source material itself
  (confirmed absent even in openbeta's own dirty tree), not introduced or
  fixed by this phase.
BASE: two required parents, neither alone sufficient (see Fase 1):
  A) open-beta/privacy-feedback-release @ 427eb834 (account-deletion
     domain incl. AccountDeletionFeedback/exitFeedbackSummary)
  B) feature/vip-delivery-and-gamebridge-sync @ b27dfcc9 (GameCommandTransportClient
     extended with GameCommandEnvelope union -- a hard compile-time
     dependency: AccountLifecycleBridgeService calls
     transport.create({commandType:'ANONYMIZE_GAME_ACCOUNT'|'PURGE_GAME_ACCOUNT'}),
     a type the OLDER client on privacy-feedback-release does not accept)
  Chosen approach: branch from (B), layer (A)'s account-deletion files on
  top -- confirmed safe (all 6 account-deletion files on the VIP branch
  were byte-identical to the common ancestor e90c29df, never touched
  there; zero import from the accounts module anywhere in vip/vip-sync).
DEPENDENCIES: PaymentRiskService/GameCommandTransportClient/GameBridgeJob
  (already provided by the base, never re-copied).
TESTS: 3/3 suites, 37/37 tests PASS (account-deletion-request,
  account-deletion, account-lifecycle-bridge -- jest --config
  ./test/jest-e2e.json --runInBand --testPathPatterns="test/account-deletion|test/account-lifecycle-bridge",
  against bloodmoon_local_claude, 2026-09-08). apps/api typecheck clean,
  0 errors, first attempt. GameBridge Agent's own C# tests:
  AGENT_TESTS = IMPLEMENTED_NOT_EXECUTABLE (no .NET SDK in this
  environment, same confirmed gap as launcher-play-gate and
  vip-delivery-and-gamebridge-sync this batch) -- not run, not claimed
  PASS.
KNOWN_DEBT:
  - ENV_EXAMPLE_UNDOCUMENTED: ACCOUNT_LIFECYCLE_BRIDGE_ENABLED/_INTERVAL_MS/_BATCH_SIZE
    are read by the service but absent from apps/api/.env.example --
    pre-existing in the source material, not fixed here.
  - AGENT_TESTS_NOT_RUN: see TESTS above.
  - PAYMENT_RISK_TEST_HARDENING_LEFT_UNPROTECTED: the
    WalletLedgerEntry/PurchaseIntent preservation-test extension found in
    openbeta's dirty account-deletion.e2e-spec.ts (unrelated to
    lifecycle-bridge) was deliberately not carried into this branch --
    still genuinely unprotected in openbeta, flagged for a future,
    correctly-scoped batch.
LAST_UPDATED: 2026-09-08
```

## Fase 1 -- base decision (recap)

`ACCOUNT_LIFECYCLE_REQUIRED_PARENTS` = privacy-feedback-release (A) + vip-delivery-and-gamebridge-sync (B), confirmed both required via direct source read (B's extended `GameCommandEnvelope` type is a hard TypeScript compile dependency for `account-lifecycle-bridge.service.ts`'s own `transport.create()` calls). `COMMON_ANCESTOR` = e90c29df. No intermediate base was needed beyond the chosen branch itself -- confirmed via diff that (B)'s copy of every account-deletion file was untouched since the common ancestor, so layering (A)'s newer versions on top was zero-risk.

## Fase 2 -- 10-way classification

| Category | Files |
|---|---|
| 1. Account deletion domain | `account-deletion.{contract,controller,service}.ts`, `account-deletion-request.{controller,service}.ts`, `accounts.module.ts`, `AccountDeletionFeedback` schema model, its 2 migrations, `privacidade.vue`, `usePrivacyApi.ts`, `docs/accounts/account-deletion-architecture.md`, `docs/privacy/*.md` |
| 2. GameBridge transport | `game-command-transport.client.ts` (already on base branch, not modified further this phase) |
| 3. Lifecycle bridge | `account-lifecycle-bridge.service.ts` (NEW_UNIQUE) |
| 4. Anonymize | `AnonymizeGameAccountCommand`/writer methods (already on base branch from the VIP phase's Agent-signature work; unchanged here) |
| 5. Purge | `executePreBetaPurge()`'s new `PURGE_GAME_ACCOUNT` `GameBridgeJob` queueing (MODIFIED_FOR_BRIDGE, in `account-deletion.service.ts`) |
| 6. Audit/logging | send/complete/fail `AuditEvent` triplet inside `account-lifecycle-bridge.service.ts`, correlated via `commandId` |
| 7. Retries/failure behavior | backoff schedule + `MAX_ATTEMPTS` + stale-PROCESSING recovery, all inside `account-lifecycle-bridge.service.ts` |
| 8. Tests | `account-lifecycle-bridge.e2e-spec.ts` (NEW_UNIQUE), `account-deletion.e2e-spec.ts`/`account-deletion-request.e2e-spec.ts` (DEPENDENCY_FROM_PRIVACY, privacy-feedback-release's own versions used) |
| 9. Docs | `account-deletion-architecture.md` (openbeta's fully-integrated version taken wholesale), `docs/privacy/*.md` (DEPENDENCY_FROM_PRIVACY) |
| 10. Permissions/config | `adminAccountsPurgeManage` (API + web mirror), `ACCOUNT_LIFECYCLE_BRIDGE_ENABLED`/`_INTERVAL_MS`/`_BATCH_SIZE` env vars (read, not newly introduced) |

Per-file tags: `account-deletion-request.controller.ts`/`account-deletion.contract.ts`/`account-deletion-request.e2e-spec.ts`/`account-deletion.e2e-spec.ts`/the 2 migrations/`privacidade.vue`/`usePrivacyApi.ts` = **DEPENDENCY_FROM_PRIVACY** (byte-identical to privacy-feedback-release, confirmed via diff). `account-deletion-request.service.ts`/`account-deletion.controller.ts`/`account-deletion.service.ts`/`accounts.module.ts`/schema.prisma's `GameBridgeOperation` comment = **MODIFIED_FOR_BRIDGE** (real diff applied on top of the privacy base, each read in full before applying). `account-lifecycle-bridge.service.ts`/`account-lifecycle-bridge.e2e-spec.ts`/`docs/privacy/*` = **NEW_UNIQUE**. `game-command-transport.client.ts`/`GameCommandTransportClient` export = **DEPENDENCY_FROM_GAMEBRIDGE** (already satisfied by the base branch, not modified further). The `account-deletion.contract.ts` reorder and the Payment-Risk-era test extension = **UNRELATED** (excluded/no-op, see NON_SCOPE). No **DUPLICATE** classification was needed -- nothing was copied twice.

## Fase 3 -- security checklist

| Check | Finding |
|---|---|
| Idempotência | Confirmed by the service's own comment and design: both stored procedures are idempotent (`ALREADY_ANONYMIZED`/`ALREADY_PURGED`), so re-dispatching under a fresh `commandId` after a retry can never double-execute. |
| Retry | `BACKOFF_SCHEDULE_MS = [0, 30s, 2m, 10m, 30m]`, `MAX_ATTEMPTS = 8`, ±20% jitter. |
| Failure handling | `FAILED_FINAL`/`EXPIRED` transport states drive a real retry-or-give-up decision; after `MAX_ATTEMPTS` the job is marked `FAILED` (visible), never silently dropped. |
| Partial success | Not modeled -- each job is one atomic stored-procedure call; no partial-success state exists for either operation, matching their all-or-nothing nature. |
| Audit | Real `AuditService.record()` calls on send/complete/fail (`gamebridge.anonymize.*`/`gamebridge.purge.*`), every one correlated via `commandId`. |
| Correlation ID | `commandId` used consistently as `correlationId` across every audit event and the `GameBridgeJob.result` dispatch record. |
| Command signature/auth | Inherited from `GameCommandTransportClient` (HMAC-signed, already confirmed in the vip-delivery-and-gamebridge-sync phase this batch) -- not re-verified here since it's an unmodified shared dependency. |
| Timeout | `COMMAND_EXPIRY_MS = 1h` per command; `EXPIRED` is an explicit, handled terminal state (triggers a fresh-commandId retry, not silence). |
| Offline GameBridge behavior | `dispatchOne()`'s catch block on `transport.create()` failure resets the job to `PENDING` with backoff and a stored error -- never marks dispatched. |
| Duplicate command protection | `updateMany({where:{id, status:'PENDING'}, data:{status:'PROCESSING',...}})`'s `claim.count !== 1` check is a real, DB-level optimistic lock against double-dispatch of the same job. |
| Account state transitions | `PENDING -> PROCESSING -> COMPLETED / FAILED` (or back to `PENDING` on retry) -- a well-defined, finite state machine. |
| No false success | Confirmed structurally: `COMPLETED` is only ever set inside `reconcileOne()` after a real `transport.get(commandId)` poll returns `state.status === 'SUCCEEDED'` -- `create()` succeeding only ever means "queued", never "delivered". |

## Fase 4 -- privacy/deletion semantics

```
REQUEST_DELETE:  Portal-authority. AccountDeletionRequest (REQUESTED -> CONFIRMED -> EXECUTED/CANCELLED),
                 driven entirely by AccountDeletionRequestService -- the player is never a GameBridge
                 caller at any point in this flow.
ANONYMIZE:       Portal-authority for the DECISION (executeNormalDeletion), GameBridge-authority for
                 GAME-SIDE EXECUTION once AccountLifecycleBridgeService dispatches it. Portal's own
                 Account row is anonymized synchronously in the same transaction that queues the
                 GameBridgeJob; the GameServer-side effect is asynchronous and independently tracked.
PURGE:           Same split as ANONYMIZE, but Portal-side is a real hard delete (tx.account.delete()),
                 not an anonymize-in-place -- irreversible on the Portal side regardless of whether the
                 GameBridge-side PURGE_GAME_ACCOUNT command ever succeeds.

PORTAL_ACCOUNT_STATE:   authoritative in AccountDeletionRequest/AccountDeletionRecord/PurgeBatchRecord --
                        this is the real, immediate, transactional truth of what happened to the Portal row.
GAME_ACCOUNT_STATE:     authoritative only on the real GameServer (not observed by this codebase at all --
                        no read path exists); the Agent's stored procedures remain reviewed but unexecuted.
BRIDGE_COMMAND_STATE:   authoritative in GameBridgeJob.status + the dispatch record in .result --
                        AccountLifecycleBridgeService's own PENDING/PROCESSING/COMPLETED/FAILED state
                        machine, polled via GameCommandTransportClient.get().
FINALIZATION_STATE:     no single component owns this -- COMPLETED on the GameBridgeJob is the closest
                        proxy for "the GameServer side is done", but nothing in this codebase currently
                        reconciles that back into AccountDeletionRecord/PurgeBatchRecord as a combined
                        "fully finalized" flag. Honest gap, not fabricated as resolved.
```

Never mixed: `REQUEST_DELETE` never triggers a GameBridge command directly (only `executeNormalDeletion`/`executePreBetaPurge`, which run after confirmation/eligibility, do that); `ANONYMIZE` and `PURGE` remain structurally distinct operations end to end (separate `GameBridgeOperation` enum values, separate command types, separate stored procedures, separate audit-action names).

## Fase 5 -- fail-closed classification

```
CLASSIFICATION = FAIL_CLOSED
ACCOUNT_LIFECYCLE_FALSE_SUCCESS = NO
```
Proven at two independent layers, both read directly from source (not assumed):
- **Portal transport layer**: `game-command-transport.client.ts`'s `request()` throws `Error('GAME_COMMAND_TRANSPORT_NOT_CONFIGURED')` synchronously when `GAME_DATA_WORKER_URL`/`GAME_COMMAND_PORTAL_SECRET` are unset -- caught by `dispatchOne()`'s try/catch, which resets the job to `PENDING` with backoff and a stored error. Never marks dispatched, never marks completed.
- **Agent execution layer**: `GameCommandWorker.cs` gates both command types on `AgentOptions.AnonymizeEnabled`/`PurgeEnabled` (both default `false`) -- when off, the worker returns `Failure(command, "FAILED_FINAL", "COMMAND_TYPE_DISABLED")`, an explicit, visible failure, never a silent no-op treated as success.

No STOP condition triggered -- clean to commit.
