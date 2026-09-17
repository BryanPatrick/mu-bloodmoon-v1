---
status: ACTIVE — final policy, no code change required
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (Bryan's own explicit decision, Phase Q)
---

# ADR-0020: WCOIN recharge pricing — integer BRL is final policy (closes OQ-022)

**DATE**: 2026-08-31 (Phase Q)
**STATUS**: ACTIVE — final, not provisional

## CONTEXT

Phase P's `assertWcoinPackageInvariant()` (`commerce.service.ts`) enforced
integer-BRL pricing for WCOIN `RechargePackage` rows as an *interim
technical default* (Option A of three alternatives presented), explicitly
disclosed as not yet a final product decision (OQ-022).

## DECISION

Bryan confirmed Option A as final, permanent policy:

- A WCOIN `RechargePackage`'s BRL price must represent a whole integer
  number of reais — `R$1,00`, `R$10,00`, `R$50,00`, never `R$19,90`.
- The base WC amount granted must equal that integer exactly:
  `1 WC = R$1` always, no exceptions, no rounding rule of any kind.
- Bonus WC (explicit promotions) remains a fully separate, additive field
  — e.g. `price=50, baseAmount=50, bonusAmount=5, total=55` is valid; the
  bonus never changes the base conversion rate itself.

**Scope, stated explicitly by Bryan**: this rule applies specifically to
BRL→WCOIN recharge conversion. It does **not** require every Blood Moon
product to use integer BRL pricing — VIP and other independently-priced
products may use their own approved prices. (In practice this is moot for
VIP specifically: `VipProductConfig.price` is WCOIN-denominated, not
BRL, and Bryan's approved VIP price table — Bronze/Silver/Gold × 7/15/30
— is already all-integer WCOIN values, seeded since
`20260830140000_phase15_vip_benefit_fields_and_pricing_seed`.)

## VERIFICATION

`assertWcoinPackageInvariant()` (`commerce.service.ts`, added Phase P)
already implements exactly this rule — no code change was required to
close this decision:

```ts
function assertWcoinPackageInvariant(currency: string, amount: number, price: string) {
  if (currency !== 'WCOIN') return
  const priceBrl = parseBrlPrice(price)
  if (!Number.isInteger(priceBrl)) throw ... // rejects "19,90" outright
  const expectedAmount = wcoinBaseForBrl(price)
  if (amount !== expectedAmount) throw ...   // rejects any base != price
}
```

Verified against every one of Bryan's own examples this phase (all
using this project's real Brazilian comma-decimal BRL string format,
`parseBrlPrice`'s actual input shape — see that function's own
documented "." = thousands-separator behavior, not a `.` decimal, per
the real bug Phase N found and fixed):

| Input | Existing validation result | Matches Bryan's decision? |
|---|---|---|
| price `"1,00"`, base `1` | VALID | YES |
| price `"10,00"`, base `10` | VALID | YES |
| price `"50,00"`, base `50` | VALID | YES |
| price `"19,90"`, base `20` | INVALID (fractional price rejected before base is even checked) | YES |
| price `"19,90"`, base `19` | INVALID (same reason) | YES |
| price `"20,00"`, base `500` | INVALID (base != expected 20) | YES |

Real test coverage already exists and passes:
`apps/api/test/recharge-package-admin-guard.e2e-spec.ts` (5/5, Phase P).

## GP/HP — explicitly unaffected

Bryan's decision does not touch `GOBLIN_POINT`/`HUNT_POINT` recharge
pricing — `assertWcoinPackageInvariant()` already scopes its check to
`currency === 'WCOIN'` only (`if (currency !== 'WCOIN') return`), and no
change was made to GP/HP packages this phase, matching Phase N's own
"touching GP/HP pricing would be inventing policy, not reconciling it"
stance (ADR-0008).

## CONSEQUENCES

- `docs/open-questions.md` OQ-022 is closed.
- No migration, no code change, no test change was needed — Phase P's
  defensive default happened to already be the correct final policy.
- Future WCOIN package edits (via the still-missing admin UI, being
  built this phase — see ADR-0021) inherit this same server-side
  enforcement automatically; the UI's own job is only to make the rule
  *legible* to an admin filling the form, not to re-implement it.

## RELATED SYSTEMS

`apps/api/src/modules/commerce/commerce.service.ts`
(`assertWcoinPackageInvariant`, `wcoinBaseForBrl`, `parseBrlPrice`),
`apps/api/test/recharge-package-admin-guard.e2e-spec.ts`,
`docs/decisions/0008-wcoin-1to1-peg-with-brl.md`,
`docs/decisions/0019-payment-operational-closure-phase-p.md`.
