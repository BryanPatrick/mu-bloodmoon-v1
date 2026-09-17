---
status: ACTIVE — category split + disposition model formalized (Phase N, 2026-08-31); durations remain LEGAL_REVIEW_REQUIRED, does NOT block Payment architecture
category: decisions
audience: internal (engineering + security + legal/product)
lastVerified: 2026-08-31
---

# ADR-0007: Data retention — current stance (structural preservation now, duration decided later, never invented)

**DATE**: 2026-08-31 (backfilled — reflects the consistent pattern already present across multiple domain docs, not a single prior unified decision)
**STATUS**: ACTIVE, but honestly incomplete — this ADR documents the *pattern this project already follows*, not a finished retention policy. No single document states an overarching cross-category retention rule (e.g., "N years for category X"); every concrete retention duration found is either legal-review-pending or a narrow technical config value with no stated cross-cutting rationale connecting it to the others.

## CONTEXT

Multiple data categories in Blood Moon have real retention questions:
financial transaction records, account-deletion tombstones, IP/device
logs, GameBridge command history. Brazilian tax/accounting law almost
certainly imposes real minimum retention periods for financial records
that this project has not yet had formal legal review to confirm. Rather
than guess at numbers, the project has consistently landed on the same
pattern across every domain that's touched this question so far.

## DECISION (the pattern actually followed, documented honestly)

**Where retention duration is a legal question**: preserve the data
structurally now, flag the duration explicitly as
`LEGAL_REVIEW_REQUIRED` (or `PRIVACY_REVIEW_REQUIRED`), and never invent
a number to fill the gap.

- **Financial records** (`RechargeIntent`/`PurchaseIntent`): structurally
  preserved regardless of duration by *both* account-deletion modes (see
  ADR-0006) — `docs/payments/financial-retention-policy.md` states the
  stance explicitly: `FINANCIAL_RETENTION = LEGAL_REVIEW_REQUIRED,
  NO_DURATION_CONFIGURED, STRUCTURALLY_PRESERVED_REGARDLESS`, with the
  doc's own stated purpose being "so the eventual legal decision has a
  clear, already-scoped place to land — not to make that decision."
- **Deletion tombstones and IP/user-agent scrubbing**
  (`account-deletion-architecture.md:45-46`): both flagged
  `LEGAL_REVIEW_REQUIRED`/`PRIVACY_REVIEW_REQUIRED`, unresolved.
- **Native GameServer `DmN_IP_Log`** (every login IP, written by the
  native engine's own `WZ_CONNECT_MEMB` procedure): documented as having
  no observed truncation, hashing, or retention limit
  (`docs/security/gameserver-credential-audit.md`) — explicitly flagged
  to product/legal as a real, currently-active practice with no visible
  policy, not something this project can silently change (no engine
  source access; native/vendor behavior).

**Where retention duration is a product/technical choice, not a legal
one**: a plain, hardcoded, documented config value, with no ceremony
beyond stating it and where it's enforced.

- GameBridge command history in Cloudflare D1: `COMMAND_RETENTION_DAYS =
  90` (`apps/game-data-worker/src/config.ts`), enforced by a daily
  cleanup cron.
- The Agent's own `ProvisioningLedger` (local SQLite): **no
  retention/pruning logic at all** — every row kept forever. Documented
  as a known, low-urgency gap rather than silently left undocumented,
  specifically because implementing pruning without a verified-safe
  deploy path would itself be a real risk — "implement pruning only if
  safe" is the operative rule, not "implement pruning by some deadline."

**The stated future shape**, when a financial retention duration is
eventually confirmed (`financial-retention-policy.md`): a single
admin-configurable setting (never a magic number baked into code), read
by a scheduled process that only *unlinks* `accountId` (never deletes
the underlying financial record) — matching the existing nullable-FK
pattern already used by `WalletLedgerEntry`/`GameBridgeJob`/`AuditEvent`.

## WHY

Retention duration for financial and legal-adjacent data is a real legal
question this project is not qualified to answer unilaterally — guessing
a number and hardcoding it risks being either non-compliant (too short)
or an unnecessary privacy/liability exposure (too long, with no legal
basis for holding it). Structurally preserving the data now while
flagging the duration question keeps every option open until a real
answer exists, without blocking any other work on that unresolved
question.

## ALTERNATIVES CONSIDERED

- **Pick a plausible retention duration now (e.g., "5 years") and move
  on**: rejected — every instance of this question in the project has
  deliberately avoided doing this; inventing a number not backed by real
  legal research is worse than leaving it explicitly open, because a
  wrong invented number looks authoritative and could be trusted by a
  future engineer or compliance review.
- **Delete financial records along with the account on any deletion
  mode**: rejected — directly conflicts with the likely existence of a
  real legal minimum retention requirement; see ADR-0006's anonymize
  (not delete) design for `NORMAL_ACCOUNT_DELETION` specifically because
  of this.
- **A single unified retention-policy document covering every data
  category with one rule**: not yet attempted — the categories have
  different legal bases (financial/tax law vs. general
  privacy/LGPD vs. pure technical/operational data) and forcing one rule
  across all of them risks getting at least one category wrong. The
  current per-category, per-doc approach is the honest reflection of
  "this hasn't been unified yet," not a considered rejection of
  unification as a future goal.

## CONSEQUENCES

- Any future engineer implementing a retention/cleanup job for financial
  or legal-adjacent data must treat the `LEGAL_REVIEW_REQUIRED` markers
  as a hard blocker, not a suggestion — do not invent a duration to
  unblock a feature.
- This ADR itself does not resolve the open questions — it exists so a
  future session (or Bryan, or eventual legal counsel) has one place
  that names every currently-known retention gap, rather than needing to
  rediscover them by reading `docs/payments/`, `docs/accounts/`, and
  `docs/security/` separately.
- `docs/open-questions.md` (Phase M) should carry forward each of these
  as a tracked open question, not just this ADR — see that index.

## PHASE N FORMALIZATION (2026-08-31) — category split + disposition model, duration still unresolved

Bryan confirmed: **retention duration remains `LEGAL_REVIEW_REQUIRED`
— do not invent a statutory period.** But also confirmed explicitly:
**this is NOT a blocker to implementing the Payment system's
architecture.** Retention is to be implemented/designed as
**configurable policy** now, with the actual durations filled in later —
matching this ADR's existing "structural preservation now, duration
later" pattern exactly, just formalized into named categories for the
upcoming Payment work to build against.

**Separate, at minimum, these four retention categories** (previously
implicit/scattered across docs; now named explicitly so the Payment
architecture has real categories to design against, not one
undifferentiated "financial data" bucket):

- `FINANCIAL_RETENTION` — `Order`/`Payment`/`RechargeIntent`/
  `PurchaseIntent` records themselves (the existing scope of this ADR).
- `SECURITY_FRAUD_RETENTION` — chargeback evidence, fraud-investigation
  evidence, anything kept specifically to defend against or investigate
  a dispute (a new, distinct category from general financial
  record-keeping — a chargeback investigation may need different
  evidence retained for a different reason/duration than routine
  transaction history).
- `ACCOUNT_DELETION_TOMBSTONE_RETENTION` — the anonymized-account
  tombstone itself (ADR-0006's `NORMAL_ACCOUNT_DELETION` row), already
  named in this ADR's original text, now grouped formally alongside the
  other three.
- `ANONYMIZED_ANALYTICS` — data retained only in already-anonymized/
  aggregated form for analytics purposes, where the retention question is
  materially different (no personal data attached) from the other three
  categories and should not be conflated with them.

**Disposition model** — support all four dispositions, chosen per data
class, not one blanket rule:

- `ANONYMIZE` — strip identity, keep the record (ADR-0006's
  `NORMAL_ACCOUNT_DELETION` pattern).
- `DETACH` — unlink from the account (nullable FK, ADR-0007's existing
  "unlinks accountId, never deletes" pattern for `WalletLedgerEntry`/
  `GameBridgeJob`/`AuditEvent`), keeping the record's own data intact.
- `PRESERVE_WITH_BASIS` — keep the record fully intact, with an explicit,
  named legal/business basis for doing so (e.g. an active
  `SECURITY_FRAUD_RETENTION` case) — distinct from indefinite retention
  with no stated reason.
- `DELETE` — genuinely remove the record, once its retention basis (of
  any of the four categories) has actually expired.

**The important retention rule this formalizes**: account deletion must
**not** blindly cascade-delete `Order`/`Payment`/`RechargeIntent`/
`PurchaseIntent`/chargeback evidence/fraud-security evidence when those
records have an independent retention justification under one of the
four categories above — this was already true in spirit (see
`FINANCIAL_RETENTION`'s existing `STRUCTURALLY_PRESERVED_REGARDLESS`
stance), now stated as a general rule covering all four categories, not
just the original financial-records case. **At the same time**: do not
retain unnecessary personal data indefinitely just because a record is
kept — `ANONYMIZE`/`DETACH` exist specifically so the underlying business
record (a payment, a fraud case) can be preserved without the personal
data attached to it being kept forever by default.

**Final durations remain for legal/fiscal/privacy review** — nothing in
this formalization invents a number. The category split and disposition
model are architecture Bryan authorized building now; the durations are
not.

## RELATED SYSTEMS

`docs/payments/financial-retention-policy.md`,
`docs/payments/payment-readiness-contract.md`,
`docs/accounts/account-deletion-architecture.md`,
`docs/security/gameserver-credential-audit.md`,
`apps/game-data-worker/src/config.ts`, ADR-0006, `docs/open-questions.md`.
