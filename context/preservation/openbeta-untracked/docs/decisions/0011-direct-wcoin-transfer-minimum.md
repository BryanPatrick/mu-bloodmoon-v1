---
status: DECIDED_BUT_NOT_IMPLEMENTED
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0011: Direct WC transfer minimum of 20 WC — decided, referenced, not yet built

**DATE**: 2026-08-31 (backfilled)
**STATUS**: **DECIDED_BUT_NOT_IMPLEMENTED** — documented honestly as a real gap, not presented as live behavior

## CONTEXT

Blood Moon's WC tax model (ADR-0009) already handles marketplace-sale
taxation. A separate concept — a **direct player-to-player WC gift/
transfer**, outside the marketplace — appears to have its own rule: a
minimum transfer amount, to prevent trivially small transfers (e.g. as a
spam or micro-laundering vector).

## DECISION (as far as it exists)

A **20 WC minimum** for direct transfers is referenced exactly once in
the codebase: `apps/api/test/wc-economy-tax.e2e-spec.ts:296-305`
explicitly asserts "a 1 WC market purchase is never blocked by the 20 WC
direct-transfer minimum (that rule does not apply here)" — i.e., the
test exists to prove the *marketplace* path is exempt from a rule that
applies elsewhere.

`WalletTransactionType.PLAYER_DIRECT_TRANSFER` exists as a schema enum
value (`schema.prisma:2195`, also present in the generated migration
SQL) — the transaction *type* was anticipated in the schema — but **no
service or controller code implementing an actual direct-transfer
endpoint exists anywhere in `apps/api/src`**, and no validation enforcing
a 20 WC minimum was found anywhere. This rule is referenced and
anticipated, but genuinely **not built**.

## WHY

Not documented anywhere recoverable — the rationale for "why 20, not 10
or 50" is not stated in any surviving source. Presumably a spam/abuse
threshold (a plausible, generic reason for any minimum-transfer rule),
but this is inference, not a cited fact, and is explicitly marked as such
here rather than presented as a confirmed rationale.

## ALTERNATIVES CONSIDERED

Not documented anywhere recoverable.

## CONSEQUENCES

- **Do not build a direct-WC-transfer feature assuming this rule is
  already enforced** — it is not. Any future implementation of
  `PLAYER_DIRECT_TRANSFER` must add the 20 WC minimum validation itself,
  and should re-confirm the exact threshold with Bryan before shipping,
  since the only surviving reference is a negative-case test comment
  about the marketplace, not a positive specification of the direct-
  transfer feature itself.
- This is exactly the kind of gap `docs/open-questions.md` (Phase M)
  exists to track — carried forward there rather than left only in this
  ADR.

## RELATED SYSTEMS

`apps/api/test/wc-economy-tax.e2e-spec.ts`, `apps/api/prisma/schema.prisma`
(`WalletTransactionType.PLAYER_DIRECT_TRANSFER`), ADR-0009,
`docs/open-questions.md`.
