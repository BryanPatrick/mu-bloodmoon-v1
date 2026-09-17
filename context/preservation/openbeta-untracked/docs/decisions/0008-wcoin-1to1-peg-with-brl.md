---
status: ACTIVE — discrepancy RESOLVED and fixed locally (Phase N, 2026-08-31)
category: decisions
audience: internal (engineering + product + finance)
lastVerified: 2026-08-31
---

# ADR-0008: WCoin pegged 1:1 with R$ — the universal Blood Moon commercial peg

**DATE**: 2026-08-31 (backfilled from `docs/vip/vip-benefit-decisions.md`); **RESOLVED 2026-08-31 (Phase N)** — Bryan confirmed 1 WC = R$1,00 as the authoritative, universal peg (not VIP-pricing-specific), and the real code conflict this ADR originally flagged has been fixed locally.
**STATUS**: ACTIVE, universal — applies to every commerce flow that sells WC, not only VIP pricing math

## PHASE N RESOLUTION (authoritative, 2026-08-31)

Phase M's investigation (below, preserved as history) found a real
conflict and correctly declined to guess which side was right. Bryan has
now settled it explicitly: **1 WC = R$1,00 is the Blood Moon commercial
peg, universally** — it is not "arbitrary package-dependent value" and
must never silently vary between commerce flows. Reading 2 from Phase
M's investigation was correct: the recharge price table had drifted from
the intended peg, undocumented; Reading 1 (a deliberate two-pricing-model
split) is rejected.

**The fix, made locally this phase** (not deployed —
`apps/api/src/modules/commerce/commerce.service.ts`): every `WCOIN`
`RechargePackage`'s `amount` is now `wcoinBaseForBrl(price)`, a small
exported pure function computing the 1:1 base directly from the BRL
price, so the rate can never be set independently of the peg again. A
promotional bonus, where one exists, is represented as an explicit,
separate `bonus` value on top of the 1:1 base — never a change to the
base rate itself (Bryan's own example, now a real seeded package: R$50 →
base 50 WC + bonus 5 WC = 55 WC delivered). `GOBLIN_POINT`/`HUNT_POINT`
package pricing in the same table is explicitly **out of scope** and left
untouched — this peg is scoped to WCOIN only; no decision has ever
claimed GP/HP recharge pricing should be 1:1.

Proven by `apps/api/test/wcoin-pricing.e2e-spec.ts` (15/15 passing,
2026-08-31): the pure conversion function for R$1/10/20/50/100, the real
seed-data constant matching the peg exactly, the one authorized
promotion case, and that GP/HP remain untouched. `docs/open-questions.md`
OQ-001 is now closed.

**What was NOT done**: production's real `RechargePackage` table was
never read or written — whether production already holds the old,
non-1:1 seed values (and whether any real player has already purchased
under them) is genuinely unknown and explicitly out of scope for a
local-only phase (see `docs/open-risks.md` — a new risk entry tracks
this as a real pre-deployment check, not silently assumed either way).

## Phase M investigation (original text, preserved as history)

The sections below are Phase M's original investigation and are kept
verbatim as the historical record of how this was found — per this
project's "never silently overwrite history" rule. Where a claim below
has since been superseded by the Phase N resolution above, it is marked,
not deleted.

## CONTEXT

VIP tier pricing needed to be expressed in WCoin (the in-game currency
GameBridge/the GameServer actually understands), but Bryan's own pricing
decisions were made in R$ (Brazilian Real). A conversion rule was needed
to turn R$ prices into WC amounts without a separate, second pricing
negotiation.

## DECISION

**1 WC = R$1,00** — a direct 1:1 peg, used specifically to convert
Bryan's R$ VIP tier prices into WC amounts
(`docs/vip/vip-benefit-decisions.md:85`: "1 WC = R$1,00 ... Bryan's R$
figures map 1:1"), e.g. Bronze/7-day = 6 WC
(`vip-benefit-decisions.md:79-83`).

The cited primary source for this decision,
`docs/product/ECONOMY_PRODUCT_DECISIONS.md`, **does not exist in the
current repo tree** — it was either never committed, removed, or lives
outside this working copy. This ADR is backfilled from the one surviving
reference to it, not from the original source document itself.

## WHY

A direct 1:1 peg is the simplest possible conversion rule — no exchange
rate to maintain, no rounding table, no separate "how much is 1 WC worth
today" decision. For VIP pricing specifically (a small, fixed set of
tier/duration combinations Bryan priced directly in R$), this was
sufficient.

## ALTERNATIVES CONSIDERED

Not documented in the surviving source — the original
`ECONOMY_PRODUCT_DECISIONS.md` (missing, see CONTEXT) may have recorded
alternatives considered; none are recoverable from what remains.

## CONSEQUENCES — including a real discrepancy found, not hidden

**The real WCoin recharge-package price table actually implemented in
code is NOT 1:1.** `apps/api/src/modules/commerce/commerce.service.ts:103-106`
defines packages like `{ amount: 500, price: '19,90' }` and
`{ amount: 1200, bonus: 100, price: '39,90' }` — 500 WC for R$19,90 is
approximately **R$0,04 per WC**, not R$1,00 per WC.

This is a real, current code-vs-documented-decision mismatch, found
during Phase M research (2026-08-31) and documented here explicitly
rather than silently resolved one way or the other, per this project's
own documentation-discipline rule (`CLAUDE.md`: "if documentation
conflicts with what the code actually does, investigate and document the
discrepancy explicitly — never silently pick one side").

**Two readings are both plausible and neither is confirmed:**

1. The 1:1 peg was **specifically and only** for converting VIP tier
   prices (a fixed, small catalog), while the general WC recharge
   package pricing was **always** meant to follow ordinary
   volume-discount retail pricing (buy more WC per R$ at higher tiers) —
   in which case there is no real contradiction, just two different
   pricing mechanisms for two different products (VIP tiers vs. bulk WC
   purchase).
2. The recharge price table diverged from an original 1:1 intent over
   time, and the current `commerce.service.ts` prices represent a later,
   undocumented pricing decision that superseded the 1:1 peg without an
   ADR or doc update recording why.

~~This ADR does not resolve which reading is correct — that is an open
question for Bryan, tracked in docs/open-questions.md. Any future work
touching WC pricing (either VIP tiers or recharge packages) should flag
this ADR and get an explicit answer before assuming either reading.~~
**RESOLVED, see "PHASE N RESOLUTION" above** — Reading 2 was correct
(undocumented drift, not a deliberate second pricing model), Bryan
confirmed the universal 1:1 peg, and the code has been corrected locally.

## RELATED SYSTEMS

`docs/vip/vip-benefit-decisions.md`,
`apps/api/src/modules/commerce/commerce.service.ts`
(`wcoinBaseForBrl`, `seedRechargePackages`),
`apps/api/test/wcoin-pricing.e2e-spec.ts`, `docs/open-questions.md`,
`docs/open-risks.md`, ADR-0001.
