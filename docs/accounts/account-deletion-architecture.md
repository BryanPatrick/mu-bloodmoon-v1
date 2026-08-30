---
status: DRAFT_FOR_REVIEW
category: accounts
audience: internal (product + engineering + legal review)
lastVerified: 2026-08-30
---

# Account Deletion Architecture — Phase 14 Part D

Two modes, deliberately non-interchangeable, implemented this phase with real code and tests. **No production deletion was executed.** The real 9 accounts were only read (see [`pre-beta-account-review.md`](pre-beta-account-review.md)).

## The load-bearing finding that shapes this whole design

`Account` has **16 relations with `onDelete: Cascade`** at the database level (grepped directly from `prisma/schema.prisma`) — including, among others, purchase/recharge history, marketplace orders, moderation records, VIP grants, and terms acceptances. **A raw `prisma.account.delete()` (or an equivalent `DELETE FROM Account`) would silently cascade-destroy every one of those records.** That is unacceptable for a real player's financial/legal/moderation history — this is not a hypothetical risk, it is the schema's actual configured behavior, confirmed by direct inspection, not assumed.

**A second, opposite-direction finding, caught by a real failing test rather than assumed**: exactly one direct `accountId`-keyed relation — `AccountCurrency.account` — is **not** `onDelete: Cascade` (the schema's implicit default, `RESTRICT`, applies). This means `PRE_BETA_PURGE`'s real cascading delete would itself **fail** on any account with a currency row (i.e. virtually every account) unless `AccountCurrency` rows are deleted first — found when the first version of `executePreBetaPurge()` threw a real FK-violation error in its own e2e test. Fixed in code (`account-deletion.service.ts` deletes `AccountCurrency` rows immediately before `account.delete()`), not left as a gap. One further RESTRICT relation exists (`GmOccurrenceNote.authorId`) but is safe by construction: both deletion modes already refuse non-`PLAYER` roles before reaching this point, and only staff accounts author GM occurrence notes.

This is why the two modes below are built the way they are:

- **`NORMAL_ACCOUNT_DELETION` never issues a real SQL `DELETE` against the `Account` row.** It anonymizes the row *in place* — the same primary key survives, so every cascade-configured FK stays satisfied and nothing is silently destroyed. The Account row itself becomes the tombstone.
- **`PRE_BETA_PURGE`** is the only mode allowed to use a real, cascading delete — and only after confirming (see the eligibility check below) the account has no financial/legal weight that cascade would destroy.

## Mode 1: `NORMAL_ACCOUNT_DELETION`

For real players, post-launch. In-place anonymization, not row deletion.

**What happens to the `Account` row**:
- `username`, `name`, `email` → replaced with a deterministic, non-reversible tombstone value (`deleted-<accountId>`), never reused, never colliding with the unique constraints those columns still carry.
- `passwordHash`, `personalIdHash`, `twoFactorSecret`, `twoFactorPending` → set to `null`. **Never preserved, never logged, never included in any tombstone record** — this is the explicit exclusion the phase spec requires.
- `status` → a new terminal value is needed (see "Schema gap" below) or, minimally this phase, `status: 'BLOCKED'` combined with a new `deletedAt` timestamp marking it distinct from an ordinary block.
- `role`/`accountPhase` → left as-is (harmless once the account can no longer authenticate).

**What happens to related data** (the dependency map, next section) — mostly nothing, by design: cascade-configured children stay intact because the row they point to still exists. A handful of tables get explicit, deliberate action beyond "leave alone" — see the map.

**The tombstone record** (separate from the Account row itself — `AccountDeletionRecord`, new this phase): minimal, operational metadata only —

| Field | Included? | Why |
|---|---|---|
| `accountId`, `deletionMode`, `requestedBy`, `requestedAt`, `completedAt` | YES | Operational necessity — who did this, when |
| `reason` (free text, admin-entered) | YES | Support/dispute context |
| Original `username`/`email` (hashed, not plaintext) | YES, hashed only | Needed to answer "was this email ever an account" for future registration/fraud checks, without retaining the reversible PII itself — mirrors `BetaRewardEntitlement.normalizedEmailHash`'s already-established pattern |
| `passwordHash`, `twoFactorSecret`, session tokens, 2FA recovery codes | **NEVER** | Explicit instruction — these are deleted outright, not tombstoned, not hashed-and-kept |
| Real name, personal ID (`personalIdHash`'s *source*, if ever available in plaintext elsewhere) | **NEVER** | Same |

`LEGAL_REVIEW_REQUIRED` fields (flagged, not decided by this phase): retention period for the tombstone record itself (how long does "was this email ever an account" need to be answerable — 90 days? a year? indefinitely?); whether Brazilian LGPD requires a player-facing confirmation/export step before deletion; whether financial records (`purchases`, `recharges`) need a *minimum* retention period for tax purposes independent of the account's own lifecycle.
`PRIVACY_REVIEW_REQUIRED` fields: whether `ipAddress`/`userAgent` on `AccountSession`/`AuditEvent` rows tied to the deleted account should also be scrubbed after some period, or whether their operational/security value (abuse investigation) justifies longer retention than the account itself.

## Mode 2: `PRE_BETA_PURGE`

For the disposable pre-launch seed/test accounts only. A real, cascading delete — but gated hard.

**Eligibility check (all must hold, or the purge is refused)**:
1. `accountPhase = 'PRE_BETA'` (never `OPEN_BETA`/`OFFICIAL` — no date-range inference, ever).
2. `role = 'PLAYER'` (never `GM`/`ADMIN`/`SUPER_ADMIN` — refused by construction, not a filter that can be bypassed).
3. **Zero real financial weight**: no `RechargeIntent` with `status IN ('PAID', 'REFUNDED')`, no `PurchaseIntent` with a completed/paid state, `AccountCurrency.balance = 0` for every currency (or the operator explicitly acknowledges a nonzero balance is being discarded — logged, not silent). This is the check that makes cascade-delete safe here: if any of these fail, `PRE_BETA_PURGE` refuses and tells the caller to use `NORMAL_ACCOUNT_DELETION` instead.
4. Belongs to the specific `betaCycleId` the caller named — never "all PRE_BETA accounts," matching the existing `cleanupDryRun`'s scoping discipline from Phase 13.

**What happens**: after the eligibility check passes and dry-run confirms `WOULD_DELETE`, the account is deleted via `prisma.account.delete()` — the real cascade is *intentional* here, because eligibility already proved there's nothing valuable in the cascade path.

**The purge record** (`PurgeBatchRecord`, new this phase, distinct model from `AccountDeletionRecord`): `betaCycleId`, `requestedBy`, `executedAt`, `accountCount`, `accountIdsPurged` (a JSON array of IDs — safe to keep since these were never real players; **no user-identifying tombstone at all**, per the explicit "PRE_BETA_PURGE has only an operational purge-batch audit record" instruction). This is intentionally a *different shape* from `AccountDeletionRecord` — conflating the two was the exact mistake the phase spec called out to avoid.

## Dependency map (18 systems)

| # | System (schema relations) | Real Account relations | NORMAL mode | PRE_BETA_PURGE |
|---|---|---|---|---|
| 1 | Wallet / currency balances | `currencies`, `walletLedgerEntries`, `walletLedgerCounterparty` | **PRESERVE** ledger rows (financial audit trail — `WalletLedgerEntry.accountId` is already nullable/`SetNull`, confirmed in Phase 13); zero out live `AccountCurrency.balance` | DELETE (cascade) — only reached if balance was already confirmed 0 by the eligibility check |
| 2 | Audit events | `auditEvents` (as actor) | **PRESERVE** — compliance trail must outlive the account; row stays intact because the Account row itself isn't deleted | DELETE (cascade) |
| 3 | Purchases / recharges (payments) | `purchases`, `recharges` | **PRESERVE** — legal/tax record; this is exactly why NORMAL mode never cascade-deletes | BLOCKS eligibility if any real payment exists (see check #3 above) |
| 4 | Characters (portal-side link) | `characters: AccountCharacter[]` | **DETACH** portal link; **BLOCK** any automatic deletion of the real GameServer character — that requires its own allowlisted GameBridge operation and separate explicit confirmation, never implied by an account-deletion request | DETACH/DELETE portal link; same BLOCK on the real GameServer side |
| 5 | Guilds (leadership) | `guildsFounded` | **BLOCK** — cannot delete an account that currently founder-owns a guild with other members; requires leadership transfer or guild disbandment first (a real product rule this phase surfaces but does not build a transfer flow for) | Same BLOCK, though pre-Beta test accounts founding a real guild is itself worth flagging as unusual in the review |
| 6 | Guilds (membership) | `guildMemberships` | **DETACH** — leaving a guild on deletion is safe and expected | DELETE (cascade) |
| 7 | Marketplace | `marketListings`, `marketOrders`, `marketplaceReports` (as reporter) | **PRESERVE** order/escrow history; **BLOCK** if an `ACTIVE`/`PENDING` listing or order exists (an in-flight trade can't just vanish — must resolve/cancel first) | Same BLOCK check applies even pre-Beta, since marketplace state is shared/multiplayer |
| 8 | Community | `communityProfile`, `communityPosts`, `communityComments`, `communityReactions`, `communityReports` (both directions), `achievementGrants`, `badgeGrants`, `questProgress` | **ANONYMIZE** posts/comments (author becomes a tombstoned account, thread integrity for other users preserved); **DELETE** purely personal rows (reactions, quest progress, achievement/badge grants) | DELETE (cascade) |
| 9 | GameBridge jobs | `bridgeJobs` | **DETACH** — already `accountId String?` with `onDelete: SetNull` (confirmed in schema); moot for NORMAL mode since the row survives anyway | DELETE (cascade) |
| 10 | Account permissions | `permissions` | DELETE — pure account-scoped config, no downstream value | DELETE (cascade) |
| 11 | Support tickets | `supportTickets` (owner), `assignedTickets` (assignee) | **PRESERVE** as owner (dispute/support history); N/A as assignee (deletion flow already refuses staff accounts) | DELETE (cascade) |
| 12 | Moderation | `moderationActions` (target), `moderationIssued` (actor) | **PRESERVE** — exactly the record type that must survive account deletion (ban-evasion tracking, future dispute context) | DELETE (cascade) — acceptable only because eligibility already excludes any account with real standing |
| 13 | Sessions / password reset / 2FA recovery | `sessions`, `passwordResetTokens`, `twoFactorRecoveryCodes` | **DELETE outright** — pure security artifacts, explicitly excluded from any tombstone | DELETE (cascade) |
| 14 | Admin tasks / GM occurrences / GM events | `adminTasks*`, `adminTaskComments`, `adminTaskEvidence`, `gmOccurrences*`, `gmEventDefinitionsCreated`, `gmEventRuns*`, `gmEventResults*` | **N/A in practice** — only populated for staff accounts, which ordinary deletion already refuses by role; if ever hit, PRESERVE (operational record) | DELETE (cascade) |
| 15 | Game account identity/credential | `gameIdentity`, `gameCredential` | **DETACH** portal-side link; **BLOCK** any automatic real GameServer login/credential removal — same allowlisted-operation requirement as Characters (#4), the single most sensitive dependency in this map | Same BLOCK |
| 16 | Terms acceptances | `termsAcceptances` | **PRESERVE** — legal/consent record, same reasoning as `BetaRewardEntitlement`'s deliberate survive-deletion design | DELETE (cascade) |
| 17 | VIP entitlement/grants | `vipEntitlement`, and via it `VipGrant[]` | **PRESERVE** grant history (real currency was spent); expire the live entitlement | DELETE (cascade) — acceptable only if the eligibility check's zero-balance rule extends to "no VIP ever purchased," which it does not yet explicitly check (**gap, flagged below**) |
| 18 | Beta reward entitlements | `BetaRewardEntitlement.originalAccountId` (nullable, no hard FK) | Already correctly designed to **PRESERVE** independent of account deletion (Phase 13) — nothing new needed | Same — already survives by design |

**Gap found while building this map, not yet fixed**: the `PRE_BETA_PURGE` eligibility check (above) verifies zero currency balance and no completed payments, but does **not** yet check for an existing `VipGrant` history (#17) — a pre-Beta test account that was granted VIP via an admin test purchase would still pass eligibility today even though real WCOIN was debited to grant it. **Fixed in code this phase** (see `account-deletion.service.ts`'s `assessPreBetaPurgeEligibility()` — the implementation includes this check even though the map above was drafted before noticing the gap, corrected before writing code rather than shipping the gap).

## Allowlisted GameBridge deletion operations — explicit, narrow, no arbitrary SQL

Two new `GameBridgeOperation` enum values, both intentionally narrow:

- **`ANONYMIZE_GAME_ACCOUNT`** — for `NORMAL_ACCOUNT_DELETION`. Payload: `{ accountId, legacyLogin }` only. Never carries a raw SQL statement, a table name, or a column name — the GameBridge Agent (when it exists) interprets this as one specific, pre-defined operation, not a generic command.
- **`PURGE_GAME_ACCOUNT`** — for `PRE_BETA_PURGE`. Payload: `{ accountId, legacyLogin, betaCycleId }`. Same constraint.

Both follow the exact job-queue shape already proven for `GRANT_VIP` in Part C (`GameBridgeJob` row, `idempotencyKey`-guarded, claimed atomically, retried with backoff) — no new queue mechanism was invented. **Neither operation has a real consumer yet**, for the identical reason `GRANT_VIP` doesn't: there is no sanctioned write path into the production MuOnline SQL Server anywhere in this project. Creating the job row is real and tested; a worker to actually execute it against the GameServer is future work gated on the same external blocker as VIP delivery.

## Explicit safety rules (enforced in code, not just documented)

- Never deletes/purges via role `GM`/`ADMIN`/`SUPER_ADMIN` through the ordinary flow — refused by a `role === 'PLAYER'` check that runs before anything else, not a filter that could be bypassed by other parameters.
- Never selects targets by email search alone, or by `createdAt` range alone — every deletion/purge call takes an explicit `accountId` (single-account) or an explicit `betaCycleId`-scoped batch (`PRE_BETA_PURGE` only) — there is no "delete everyone matching X" code path.
- Never bulk-deletes all `OPEN_BETA` accounts without an explicit, named cycle scope — `PRE_BETA_PURGE` only ever operates on `accountPhase = 'PRE_BETA'`, and `OPEN_BETA`/`OFFICIAL` accounts can only go through `NORMAL_ACCOUNT_DELETION` (anonymize, never cascade-delete).
- Dry-run is mandatory before either mode can execute for real — `dryRun()` reports `WOULD_DELETE` / `WOULD_PRESERVE` / `BLOCKED` / `UNKNOWN_DEPENDENCY` per dependency-map row, and the real execution path re-validates the same checks rather than trusting a stale dry-run result.
- Idempotent — calling either mode twice on an already-processed account is a safe no-op (checked via `AccountDeletionRecord`/`PurgeBatchRecord` existence), not a duplicate/erroring second attempt.

## Schema additions this phase

- `AccountDeletionRecord` (NORMAL mode tombstone metadata — see table above for exact fields).
- `PurgeBatchRecord` (PRE_BETA_PURGE operational record — batch-shaped, no per-user tombstone).
- `GameBridgeOperation` gains `ANONYMIZE_GAME_ACCOUNT` and `PURGE_GAME_ACCOUNT`.
- `Account.status` gains no new enum value this phase (using existing `BLOCKED` + a new `deletedAt` timestamp field is sufficient to distinguish "deleted" from "ordinarily blocked" without a schema-wide enum migration) — flagged as a minimal, deliberate choice, not an oversight; a dedicated `DELETED` status is one migration away if product wants a cleaner signal later.

## Beta end-of-cycle deletion workflow — engineered this phase, not executed

The operational sequence a real Beta-cycle wind-down would follow, built (dry-run, eligibility, execution primitives) but never run against real data this phase:

1. Beta cycle ends (product decision, external to this system).
2. Admin calls `GET beta/registration-notice`-adjacent reporting / Phase 13's `cleanupDryRun(betaCycleId)` to get the full `WOULD_DELETE`/`BLOCKED`/`UNKNOWN_DEPENDENCY` picture for every `OPEN_BETA` account in that cycle.
3. Admin cross-references against `GET admin/accounts/deletion/pre-beta-purge/dry-run?betaCycleId=...` (this phase) for any accounts that are `PRE_BETA` rather than `OPEN_BETA` (test/seed accounts never promoted).
4. For every account flagged `WOULD_DELETE` by both checks: confirm no `BetaRewardEntitlement` claim is still pending (Phase 13's `claimMyEntitlements` window should be closed by policy before this step).
5. Snapshot: `BetaRewardEntitlement` rows are already durable and hashed-email-linked (Phase 13) — no extra snapshot step needed, by design.
6. Admin builds an explicit `accountIds` list (never "all matching accounts") from the reviewed dry-run output.
7. `executePreBetaPurge(actor, betaCycleId, accountIds)` re-validates eligibility per account in real time (not trusting the stale dry-run) and refuses the whole batch if any single account fails.
8. On success: real cascading delete per account (`AccountCurrency` rows removed first, per the confirmed RESTRICT-relation finding), one `PurgeBatchRecord` for the whole batch.
9. `ANONYMIZE_GAME_ACCOUNT`/`PURGE_GAME_ACCOUNT` `GameBridgeJob` rows are queued for any account with a `GameAccountIdentity` — real GameServer-side cleanup remains pending the same GameBridge Agent blocker noted throughout this phase.
10. Audit record written (`admin.account.purge.pre-beta`) referencing the batch, not individual accounts (matching `PurgeBatchRecord`'s deliberately batch-shaped design).
11. Any account that failed eligibility stays untouched — no partial purge of a blocked batch, no silent skip; the caller sees exactly which accounts blocked and why (`reasons[]`).
12. Post-purge reconciliation: re-run the dry-run once more — an empty `WOULD_DELETE` result for the cycle confirms completion; any remaining `BLOCKED` rows are accounts requiring `NORMAL_ACCOUNT_DELETION` instead (real players who somehow ended up flagged, or accounts with financial/legal weight the eligibility check correctly caught).

Steps 2, 3, 6, 7, 8, 9, 10, 11 all have real, tested code behind them this phase. Steps 1, 4, 5, 12 are process/timing steps around that code, not missing implementation.

See [`pre-beta-account-review.md`](pre-beta-account-review.md) for the real, read-only review of the 9 actual accounts against this design.
