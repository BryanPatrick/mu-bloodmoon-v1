---
status: LEGAL_REVIEW_REQUIRED
category: payments/legal
audience: internal (product + legal review)
lastVerified: 2026-09-17
---

# Financial Retention Policy — Phase 15

`FINANCIAL_RETENTION_POLICY = UNRESOLVED`. This does not block a disabled,
inert deployment review. It does block public payment enablement. It does not
by itself block webhook registration because the minimized inbox and financial
audit are preserved and this phase introduces no deletion behavior.

Bryan's instruction: financial records (`RechargeIntent`, `PurchaseIntent`) may carry an independent retention obligation and must never be deleted alongside the account; unnecessary personal data on them can be anonymized/unlinked; the architecture must not depend on a legal decision that hasn't been made yet.

## Historical Phase 15 assessment (superseded for Asaas by Phase 5 below)

- `NORMAL_ACCOUNT_DELETION` never deletes `RechargeIntent`/`PurchaseIntent` rows — confirmed in [`account-deletion-architecture.md`](../accounts/account-deletion-architecture.md)'s dependency map (#3, `PRESERVE`) and in `account-deletion.service.ts`'s transaction (no `rechargeIntent`/`purchaseIntent` mutation appears anywhere in `executeNormalDeletion`).
- `PRE_BETA_PURGE` refuses to purge any account with a `PAID`/`REFUND_PENDING`/`REFUNDED` `RechargeIntent` or a `PAID`/`DELIVERING`/`COMPLETED`/`REFUND_PENDING`/`REFUNDED` `PurchaseIntent` (tested — `PRE_BETA_PURGE_REFUSES_PAID_RECHARGE_HISTORY`) — so a real cascading delete can never reach financial records either.

Both of these facts hold **independent of any retention-duration decision** — they're structural (the deletion code doesn't touch these tables at all), not time-based. This is the sense in which "architecture doesn't depend on the legal decision" is already true today, not a future promise.

## What's still open (genuinely `LEGAL_REVIEW_REQUIRED`, not decided here)

1. **Retention duration.** How long must `RechargeIntent`/`PurchaseIntent` rows survive after the owning account is deleted — a fixed statutory period (Brazilian tax/accounting law), or indefinite? Not answered by this document; no code enforces a duration because none is known yet.
2. **What counts as "unnecessary personal data" on a financial record that can be anonymized/unlinked, vs. what must stay linked for audit purposes.** `RechargeIntent`/`PurchaseIntent` carry `accountId` (a link, not raw PII) plus payment-provider fields (`externalReference`, `paymentIdempotencyKey`, `externalOrderId`, `paymentMethod`) — none of these are direct personal data (name/email/address) today; they're provider-side transaction identifiers. If Bryan/legal decide even these need scrubbing after some period, that's a new requirement, not implied by anything built so far.
3. **Whether "unlink" means nulling `accountId`** (breaking the FK, matching the existing `WalletLedgerEntry`/`GameBridgeJob`/`AuditEvent` nullable-FK pattern already used elsewhere in this schema) or something else. Not decided — flagged as the natural technical shape if/when this is approved, not implemented.

## Configurability requirement (per Bryan: no hardcoded numbers)

If/when a retention duration is confirmed, the correct implementation shape (not built this phase, since no duration exists to configure yet) is a single admin-configurable setting — most naturally a new field on an existing config table (e.g. alongside `MarketplaceEconomyConfig`, or a small dedicated `FinancialRetentionConfig` row) — read by a scheduled process that only *unlinks* (never deletes) rows older than the configured threshold. Explicitly not a magic number in code, matching the same discipline already applied to VIP pricing (Phase 15's `VipProductConfig` seed) and the WC tax rates (Phase 13).

## BillingProfile (added 2026-09-17, Asaas local-hardening phase)

`BillingProfile` (encrypted `legalName`/`cpfCnpj`, see
[`billing-pii-encryption.md`](billing-pii-encryption.md)) carries the
same open retention-duration question as `RechargeIntent`/`PurchaseIntent`
above, plus one structural difference this phase found and did **not**
resolve: `BillingProfile.account` is `onDelete: Cascade` in
`schema.prisma` — unlike `RechargeIntent`/`PurchaseIntent`, which are
structurally excluded from every known deletion path regardless of any
retention decision, `BillingProfile` would be *silently* removed the
moment any code path ever hard-deletes the owning `Account` row. `git
grep BillingProfile` across `apps/api/src/modules/accounts/` and
`docs/accounts/` found zero references — this table has never been
considered by the account-deletion architecture at all.

Needed, not yet done: trace whether `NORMAL_ACCOUNT_DELETION` or
`PRE_BETA_PURGE` (see [`account-deletion-architecture.md`](../accounts/account-deletion-architecture.md))
can ever reach a real hard `Account` delete, and if so, either (a)
change `BillingProfile.account`'s FK to `onDelete: Restrict` or
`SetNull` (matching the nullable-FK unlink pattern already used
elsewhere per this document's Configurability section) so it requires
the same explicit, retention-aware handling `RechargeIntent`/
`PurchaseIntent` already get, or (b) confirm no such path exists today
and document why the current `Cascade` is safe. Distinguishing states
for `BillingProfile` specifically, mirroring this document's own request
for a lifecycle rather than a binary delete/keep: active account,
account deletion requested, provider/legal retention required, retention
complete, eligible for deletion/anonymization — none of these states
exist in code today; this is a design note, not an implementation.

Historical Phase 4 assessment above is superseded by the Phase 5 result
below; it remains here to show why the guard was added.

## Phase 5 addendum — account-deletion trace and guard (2026-09-17)

Real-DB tests on the isolated MariaDB instance demonstrated that the
old `PRE_BETA_PURGE` eligibility check could classify a test account
with `BillingProfile`, `ProviderCustomer`, and a pending Asaas
`RechargeIntent` as `WOULD_DELETE`. A hard delete would cascade those
rows, so the earlier claim that the purge could never reach financial
records was too broad. The test failed before the fix.

The eligibility check now refuses purge whenever **any** billing
profile, provider customer mapping, or Asaas recharge intent exists,
regardless of payment status. `NORMAL_ACCOUNT_DELETION` still
anonymizes the `Account` in place and preserves all three rows, as
verified by a real-DB test. This is a conservative technical guard,
not a legal retention-duration decision. The `onDelete: Cascade` FK
itself is unchanged; any future hard-delete path must keep the guard
or make retention explicit.

`BILLING_PROFILE_RETENTION = LEGAL_REVIEW_REQUIRED; PRE_BETA_PURGE
GUARD = IMPLEMENTED; NORMAL_DELETION = PRESERVES ENCRYPTED BILLING`.

## Status

`FINANCIAL_RETENTION = LEGAL_REVIEW_REQUIRED, NO_DURATION_CONFIGURED,
NORMAL_DELETION_PRESERVES, PRE_BETA_PURGE_HAS_ASAAS_GUARD`. This document
does not decide the eventual legal retention period or disposal lifecycle.
