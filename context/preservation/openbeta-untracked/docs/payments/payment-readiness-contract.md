---
status: READY_FOR_NEXT_PHASE — architecture direction only, not implemented
category: payments
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED for what already exists (Mercado Pago integration, WalletLedgerService, VIP pricing table); HYPOTHESIS/DIRECTION for the extensible-product-type shape described below
---

# Payment readiness contract — inputs for the Payment implementation phase

Phase N (2026-08-31) reconciled the policy/documentation discrepancies
Phase M found before the real Payment implementation phase begins. This
document is the handoff: what the next phase should build against, now
that the underlying policy questions have real, persisted answers. It is
**not** an implementation — no new payment code was written in this
phase beyond the local WCoin pricing fix (see
`docs/decisions/0008-wcoin-1to1-peg-with-brl.md`).

## The official payment architecture

```
PRODUCT
  → ORDER
  → PAYMENT
  → PAYMENT PROVIDER
  → WEBHOOK/CONFIRMATION
  → DELIVERY
  → TARGET SYSTEM
  → LEDGER
  → RECONCILIATION
```

**Initial provider**: Mercado Pago — already real and integrated
(`apps/api/src/modules/payments/mercadopago.provider.ts`,
`recharge-webhook.controller.ts`), not a future decision.

**Target deliverables today**: WC (via `RechargePackage`/
`RechargeIntent`, see below) and VIP (via `VipProductConfig`, seeded but
`enabled: false` — see `docs/vip/vip-benefit-decisions.md`). **Future
approved product types should be extensible** — the next phase's design
should not hard-code "only WC and VIP can ever be purchased," since
X-Shop items (once reviewed, ADR-0013) are a real, named future
candidate.

## Payment source of truth — formalized

- **Portal `Order`/`Payment` architecture = ACTIVE SOURCE OF TRUTH.** The
  only live, real-money payment path in this project.
- **DmN legacy payment gateways = LEGACY / DEAD.** Confirmed 0 rows
  across every gateway family in the legacy `hostbr-web` CMS backup
  (`docs/legacy/provider-web/payments-legacy.md`,
  `docs/gameserver/database/legacy-unknown-structures.md`).
- **`PixPayments` = DORMANT / PRESERVE / DO NOT INTEGRATE**
  (ADR-0003) — no confirmed writer even after two full investigation
  passes; kept as historical/reference schema only.
- **No parallel financial authority.** Any future payment-adjacent work
  (X-Shop sales, account/character sale settlement — see ADR-0016) must
  route through this same Order/Payment architecture, never build a
  second one.

## X-Shop is explicitly out of scope for the catalog, not the architecture

Per ADR-0013's Phase N confirmation: the X-Shop's 168-item catalog
remains `PRODUCT_CATALOG_REVIEW_PENDING` and must not be treated as the
Payment system's commercial source of truth. This does **not** block
building `Order`/`Payment`/`Delivery` — it means those systems must be
**product-agnostic**: capable of supporting whatever products get
formally approved (VIP tiers today, X-Shop items only after Bryan's
KEEP/REMOVE review completes), never assuming the legacy X-Shop file is
"the" catalog.

## WCoin delivery model

For a payment of R$ X:

1. **Base WC = X, under the 1:1 rule** (ADR-0008, now the universal
   Blood Moon commercial peg — `wcoinBaseForBrl()`,
   `apps/api/src/modules/commerce/commerce.service.ts`).
2. **Optional explicit promotional bonus** — additive on top of the base,
   never a change to the base rate (the one authorized example: R$50 →
   base 50 WC + bonus 5 WC = 55 WC delivered).
3. **WC credit** via `WalletLedgerService.credit()` — already real,
   already transactional, already idempotent
   (`recharge-credit:${recharge.id}` idempotency key), already carries
   payment provenance (`paymentProvenanceRef`) linking the ledger entry
   directly back to the `RechargeIntent` that created it.
4. **Immutable ledger entry** — `WalletLedgerEntry` rows are append-only;
   a refund/cancellation is a new, separate reversal entry
   (`PAYMENT_REVERSAL`), never a mutation of the original credit.
5. **Payment provenance** — every WC credit traces back to exactly one
   `RechargeIntent`, which traces back to exactly one Mercado Pago order.

**No floating point for wallet accounting.** Already true today
(`AccountCurrency.feeAccumulatorSubunits`, `SUBUNITS_PER_UNIT = 10_000`,
see `docs/decisions/0009-wcoin-currency-tax-model.md`) — the next phase
should extend this same fixed-point/integer discipline to any new
payment-adjacent currency math, not introduce floating-point arithmetic
anywhere in the payment or delivery path.

## VIP pricing — preserved, not reopened

The current, approved, configurable VIP price table (already real,
already migrated — `docs/vip/vip-benefit-decisions.md`,
`VipProductConfig`, seeded `enabled: false`):

| Tier | 7 days | 15 days | 30 days |
|---|---|---|---|
| Bronze | R$6 / 6 WC | R$11 / 11 WC | R$20 / 20 WC |
| Silver | R$9 / 9 WC | R$17 / 17 WC | R$30 / 30 WC |
| Gold | R$12 / 12 WC | R$23 / 23 WC | R$40 / 40 WC |

Because WC is now confirmed pegged 1:1 (ADR-0008), these R$ and WC
figures are numerically identical — **but do not assume every VIP
purchase must be paid in WC.** The Payment phase should explicitly model
which payment methods are accepted per product (direct Mercado Pago
charge vs. WC-balance spend vs. both) rather than silently assuming WC is
the only path just because the numbers happen to coincide under the peg.

## What the next phase must NOT assume

- That the X-Shop catalog is ready to sell (ADR-0013 — still pending).
- That GP/HP recharge pricing follows the same 1:1 rule as WC (ADR-0008
  — explicitly scoped to WC only; GP/HP pricing is untouched and
  unaddressed by any decision).
- That financial/fraud/tombstone retention durations are known (ADR-0007
  — categories and dispositions are now formalized, durations are not).
- That account sale is a shippable, safeguarded product (ADR-0016 — nine
  `NEEDS_SECURITY_PRODUCT_DESIGN` items remain open).
- That RMT disputes over untraceable private transactions can be
  resolved with the same confidence as traceable ones (ADR-0016).

## Tests required if commerce pricing code changes further

Deterministic, already proven this phase
(`apps/api/test/wcoin-pricing.e2e-spec.ts`, 15/15 passing):
R$1→1WC, R$10→10WC, R$20→20WC, R$50→50WC, R$100→100WC, and the explicit
promotion case (R$50 → base 50 + bonus 5 = 55). Any future change to
`wcoinBaseForBrl`/`seedRechargePackages` must keep this suite green.
Regression coverage already confirmed clean this phase:
`recharge-payments.e2e-spec.ts` (16/16), no changes needed there since it
uses its own self-contained fixture, independent of the seed data this
phase corrected.

## Related

`docs/decisions/0001-vip-source-of-truth.md`,
`docs/decisions/0003-pixpayments-preserve-dormant.md`,
`docs/decisions/0007-data-retention-current-stance.md`,
`docs/decisions/0008-wcoin-1to1-peg-with-brl.md`,
`docs/decisions/0009-wcoin-currency-tax-model.md`,
`docs/decisions/0013-xshop-review-methodology.md`,
`docs/decisions/0016-rmt-policy-gap.md`,
`docs/payments/payment-surfaces-comparison.md`,
`docs/payments/financial-retention-policy.md`,
`docs/vip/vip-benefit-decisions.md`.
