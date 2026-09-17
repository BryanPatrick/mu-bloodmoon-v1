---
status: HANDOFF_FOR_CODEX
category: payments
audience: internal (Codex, next session)
lastVerified: 2026-09-17
---

# Asaas sandbox — Phase 4 handoff (Claude local-hardening, Codex unavailable)

**Read this before touching anything else in payments/commerce.** You
(Codex) don't need to rediscover this investigation — everything below
is what changed, why, and exactly what's still open.

## Where this branch lives

`D:/MU/mu-bloodmoon-v1-asaas-claude`, branch
`payments/asaas-local-hardening-claude`, based on your own
`payments/asaas-sandbox` at `08a1f30a` (your two commits,
`16753dc7`/`08a1f30a`, are preserved exactly — nothing rewritten, no
rebase, no history change). Your own worktree
(`D:/MU/mu-bloodmoon-asaas-sandbox`) was never touched.

`main` (which already had the canonical `CAST(0 AS JSON) -> '0'`
migration fix and governance work you were blocked on) was merged in
cleanly — `git merge main --no-edit`, zero conflicts, real merge commit
`de941f30`. Then the billing-encryption hardening was added on top,
`1e6b0768` (current HEAD).

## What changed, and why

**1. The canonical launcher migration fix is now in your line.**
`apps/api/prisma/migrations/20260723003000_launcher_integration/migration.sql`
now matches canonical SHA-256
`b87b4f0e62e19546c34d68ddb810927f30dd8208784cbb79dd5359ef9ac37726`
(verified directly after the merge, not assumed). This is what was
making MariaDB fail before it ever reached your Asaas migration.

**2. Billing PII encryption is now versioned, with field-bound AAD.**
New: `apps/api/src/modules/payments/billing-crypto.ts` +
`billing-crypto.spec.ts` (19 tests, all passing). Your
`billing-profile.service.ts` now delegates to it — same external
behavior, same exceptions, your own `billing-profile.service.spec.ts`
(4 tests) still passes unmodified. Full detail:
`docs/payments/billing-pii-encryption.md`. Short version: the key is now
rotatable (`BILLING_PII_ACTIVE_KEY_VERSION` + per-version
`BILLING_PII_KEY_*_B64` env vars, mirroring `TwoFactorService`'s own
already-deployed pattern), and the AAD now binds the field identity, not
just the account — closing a real gap where `legalNameCiphertext` and
`cpfCnpjCiphertext` for the same account used to be interchangeable
under GCM's own authentication check.

**One thing to know before you touch `BillingProfile` rows**: any record
encrypted before this commit will **not** decrypt under the new code
(the AAD changed, which is cryptographically unavoidable when you're
closing an AAD-substitution gap). Confirmed this is a non-issue right
now — no known `BillingProfile` row predates this change, Asaas is
sandbox-only. If your own local testing has any disposable DB with
`BillingProfile` rows from before this handoff, they'll need
re-encryption (decrypt under old AAD, re-seal under new) or just
recreating — don't assume they'll silently keep working.

**3. Two real, previously-undocumented findings, not yet resolved:**
- `BillingProfile.account` is `onDelete: Cascade` and was never referenced
  anywhere in the account-deletion architecture — see
  `docs/payments/financial-retention-policy.md`'s new BillingProfile
  section. Needs tracing whether any real deletion path could reach it.
- `safeMessage()` (`payment-reconciliation.service.ts:329`) truncates
  error messages but doesn't redact secret-like patterns — not a live
  leak (nothing currently constructs an Error with raw PII in it), but
  no structural guarantee against a future one either.

## Tests run for real this phase (and their honest limits)

- `apps/api/src/modules/payments/billing-crypto.spec.ts` — 19/19 PASS
  (Jest, no live DB needed — pure crypto logic).
- `apps/api/src/modules/payments/billing-profile.service.spec.ts` —
  4/4 PASS, unmodified, confirming no regression from the refactor.
- `npm run api:check` (structure checks + `tsc --noEmit`) — PASS.

**NOT run this phase, and this is the most important honesty point in
this handoff**: your own 120-test MySQL suite, the MariaDB replay, and
every DB-engine-parity scenario in your original test plan (concurrency,
idempotency, exactly-once wallet crediting, ambiguous-timeout recovery,
Mercado Pago regression) were **not re-executed**. This environment has
no Docker available locally (a known, standing constraint this whole
project has hit before), and pushing to trigger a real GitHub Actions
run was explicitly not authorized this round. So: the migration
checksum is verified correct, the crypto hardening is verified correct
in isolation, but the full integration suite you already proved PASS
against MySQL has not been re-proven against this branch's exact head,
and MariaDB has never been run against the Asaas migration at all yet.
**Do not assume it still passes — re-run it** before treating this as
sandbox-ready.

## Disposable test DB directory

`D:/MU/asaas-phase3-disposable-20260916` was inspected, not deleted.
It's a real MySQL data directory containing exactly one application
database (`bloodmoon_asaas_phase3`) plus MySQL's own system schemas —
looks exactly like what you'd expect from your own Phase 3 testing. But
two `mysqld.exe` processes are currently running and I could not
determine (permission-restricted) which data directory either one is
bound to. Per explicit instruction ("if any doubt: do not delete"), I
left it alone. If you know these processes are unrelated to this
directory, it's yours to clean up; if either of them *is* using it,
deleting it would be destructive to your own running work.

## Your exact next step

1. Re-run your MySQL integration suite against this branch's HEAD
   (`1e6b0768`) — confirm 120/120 still holds with the migration fix and
   billing-crypto changes merged in.
2. Run the same suite against a real, disposable MariaDB 11 — this has
   never been done for the Asaas migration specifically; it's the
   critical gate this whole handoff exists to set up for you.
3. If both pass: this branch is ready to merge into
   `payments/asaas-sandbox` (your call on method — it's your branch to
   merge into, not mine to touch).
4. Only after that: real Asaas Sandbox homologation (real sandbox API
   key, real sandbox customer/PIX call) — still explicitly not done, not
   attempted, by this phase.

## What was NOT touched

`bloodmoon_local`, `bloodmoon_local_claude` — untouched. No production —
untouched. No real Asaas credentials or network calls — none, anywhere
in this phase. Your branch, your worktree, your commits — all preserved
exactly as you left them.
