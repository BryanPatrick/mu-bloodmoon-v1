---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0009: WC/GP/HP transaction tax rates — WC at 10%, GP/HP held at 5%, fractional amounts via a fixed-point accumulator

**DATE**: 2026-08-31 (backfilled — real decision in `apps/api/prisma/schema.prisma`'s "Open Beta P0" comments, code-enforced and e2e-tested)
**STATUS**: ACTIVE, implemented, tested

This ADR covers three closely-related, jointly-implemented decisions
(WC's 10% sink, GP/HP's preserved 5% rate, and the fractional-remainder
accumulator mechanism) as one record, since they were designed and
tested together as a single economic model
(`apps/api/src/modules/wallet/wallet-ledger.service.ts`,
`apps/api/test/wc-economy-tax.e2e-spec.ts`) rather than as independent
decisions.

## CONTEXT

Blood Moon has three player-transactable currencies relevant here: WC
(WCoin, the Portal-purchasable currency), and two native GameServer
currencies, **GP (GoblinPoint)** and **HP (HuntPoint)** — confirmed exact
enum names via `schema.prisma:48-52`, not "HonorPoint." All three can be
transacted between players (marketplace sales, direct transfers), and a
transaction tax (economic sink) applies to each. GP/HP already had an
established 5% market tax rate from before this design round; WC was new
and needed its own rate decided.

## DECISION

- **`MarketplaceEconomyConfig.wcoinTaxPercent` = 10** (default) — WC's
  P2P/marketplace transaction tax (`schema.prisma:2157`). A 100 WC sale
  nets the seller 90 WC, real e2e-tested
  (`wc-economy-tax.e2e-spec.ts:55-57`).
- **`goblinPointTaxPercent`/`huntPointTaxPercent` = 5** (both, default)
  — GP/HP's market tax is **explicitly and deliberately preserved** at
  their pre-existing rate, **not** raised to WC's 10%, per a direct
  instruction quoted in the schema's own comment: "do NOT raise GP/HP to
  10% in this phase" (`schema.prisma:2155-2156`). Real e2e tests name
  this explicitly: `GP_MARKET_REMAINS_5_PERCENT` /
  `HP_MARKET_REMAINS_5_PERCENT` (`wc-economy-tax.e2e-spec.ts:152-166`),
  and a separate test proves the two rates never stack
  (`NO_5_PLUS_10_DOUBLE_TAX`, lines 139-147).
- **Fixed-point fractional accumulator**: since a 10%/5% tax on a small
  transaction produces a fractional coin amount (e.g. 10% of 1 WC = 0.1
  WC), and this project deliberately avoids floating-point arithmetic
  for currency, `AccountCurrency.feeAccumulatorSubunits` accrues the
  exact fractional obligation in subunits (1 WC = 10,000 subunits,
  `wallet-ledger.service.ts:15-18`). `settleAccumulator()` collects
  whole-unit amounts as they become available, carrying any remainder
  forward — the seller receives the full un-taxed amount immediately,
  and the fractional tax obligation "waits in the accumulator across
  future transactions" (`wallet-ledger.service.ts:192-193`). E2e-proven:
  ten 1-WC sales (each producing a 0.1 WC fee) converge to exactly 1 WC
  collected with zero residue and no drift
  (`wc-economy-tax.e2e-spec.ts:186-212`).

## WHY

Different currencies serve different roles in the economy (WC is the
Portal-monetized currency; GP/HP are native in-game earn-only
currencies), so a uniform tax rate across all three isn't required and
wasn't chosen — WC's higher rate reflects it being the newer,
deliberately-designed-with-a-stronger-sink currency, while GP/HP's rate
was left untouched specifically to avoid disrupting existing in-game
economy balance that predates this redesign. The fixed-point accumulator
exists because floating-point currency arithmetic is a well-known source
of drift/rounding bugs at scale — an integer-subunit design with an
explicit carry-forward accumulator eliminates that class of bug by
construction, provable exactly (as the e2e test does) rather than
approximately.

## ALTERNATIVES CONSIDERED

- **Uniform tax rate across WC/GP/HP**: rejected — explicitly rejected in
  favor of preserving GP/HP's existing 5% rate, per the direct
  instruction captured in the schema comment.
- **Drop fractional tax amounts (round down, collect nothing on
  small transactions)**: rejected — would create a real, exploitable gap
  where transactions structured just below a whole-unit tax threshold
  pay zero tax; the accumulator design closes this by guaranteeing every
  fractional obligation is eventually collected in full.
- **Floating-point tax calculation**: rejected outright — this project's
  currency arithmetic is integer-only throughout, by design, specifically
  to avoid floating-point drift.

## CONSEQUENCES

- Any future currency added to the marketplace/P2P transfer system must
  decide its own tax rate explicitly — there is no "default rate" a new
  currency silently inherits.
- The accumulator design means a currency balance's true fee obligation
  is not fully visible from `AccountCurrency`'s spendable balance alone
  — `feeAccumulatorSubunits` must be considered by any future feature
  that reasons about a player's "total currency position."
- See ADR-0011 for the related, but NOT YET IMPLEMENTED, direct-transfer
  minimum-amount rule, which references this same tax model.

## RELATED SYSTEMS

`apps/api/prisma/schema.prisma` (`MarketplaceEconomyConfig`,
`AccountCurrency`), `apps/api/src/modules/wallet/wallet-ledger.service.ts`,
`apps/api/test/wc-economy-tax.e2e-spec.ts`, ADR-0008, ADR-0011.
