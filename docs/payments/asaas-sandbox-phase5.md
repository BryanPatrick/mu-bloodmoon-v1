---
status: LOCAL_VALIDATION_COMPLETE
category: payments
lastVerified: 2026-09-17
---

# Asaas Phase 5 — isolated DB parity and credential-readiness review

This continuation starts at Claude's hardening commit
`223b111c47d7dc445ed2c76a74f6e9c5bb6880dc` on the separate
`payments/asaas-sandbox-phase5-codex` branch. The original Codex Asaas
and Claude branches were not rewritten. There was no push, merge,
production change, real Asaas call, real credential, or real customer
data in this phase.

The canonical historical migration
`20260723003000_launcher_integration` matches SHA-256
`b87b4f0e62e19546c34d68ddb810927f30dd8208784cbb79dd5359ef9ac37726`.
Both isolated databases started empty: MySQL 8.4.10 and MariaDB 11.8.6
each applied all 56 migrations with zero failed migrations. The same
functional DB suite passed on both: 14 Asaas tests, 17 Mercado Pago
tests, and 17 account-deletion tests (48/48 per engine). The common
API unit suite passes 114/114 tests. The 14 Asaas
tests cover customer/payment creation races, ambiguous create timeout,
duplicate/concurrent/out-of-order webhook behavior, exactly-once WC
ledger credit, sandbox identity separation, production URL rejection,
and 1:1 WC without bonus. API unit tests and typecheck also pass.

The Asaas test's old ciphertext assertion was updated from the legacy
`v1.*` shape to Claude's `1.v1.*` envelope. Encryption tests cover
active v1/v2, old-key read after v2 activation, rotation, unknown or
wrong key, account/field AAD swap, and legacy envelope. A read-only
`BillingProfileService.keyVersionInventory()` now counts profiles by
key version in pages, including malformed/mixed counts; it never
decrypts or returns account IDs or PII. No bulk rotation tool or
automatic key retirement was built.

The account-deletion trace found a real bug: `PRE_BETA_PURGE` could
previously mark a test account with billing profile, provider customer
and pending Asaas recharge as eligible. The hard-delete cascade would
remove these records. The failing real-DB test led to a conservative
eligibility guard for any such row. Real-DB tests now show normal
deletion anonymizes the Account while preserving all three records,
and pre-Beta purge blocks the account and preserves them. The cascade
FK remains unchanged; future hard-delete paths still need review.

The raw database inspection found zero matches for the synthetic
billing plaintext markers in ciphertext columns on both engines.
`safeMessage()` in reconciliation now emits only allowlisted exception
classes or Prisma codes. The global 5xx exception filter no longer
persists or prints raw exception messages/stacks, which could carry
provider responses or PII; a synthetic-secret test verifies this.
The static secret-log scan passes. The provider adapter still
normalizes Asaas responses before business logic consumes them.

## Boundary and next phase

The technical gate is for **receiving dedicated Sandbox credentials
in a later, separately authorized phase**, not for using them now.
Bryan/product/legal must still decide retention duration and eventual
unlink/disposal of encrypted billing/customer/payment evidence. No
period was invented here; the purge guard preserves evidence meanwhile.

After separate authorization: create/use a dedicated Asaas Sandbox
account, provision a Sandbox-only API credential and webhook token,
verify fail-closed environment configuration, then test synthetic
customer creation, PIX creation, provider lookup, webhook token and
lookup verification, reconciliation, one WC credit, duplicate webhook,
mismatch, and cancellation/expiry. No production configuration or
real-money payment is part of that plan.
