---
status: ACTIVE
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
---

# ADR-0012: CashShop philosophy — no standard/combat gear sales, cosmetics and QoL only

**DATE**: 2026-08-31 (backfilled — originally coined "Phase 12," restated and re-verified Phase 14, `docs/economy/cashshop-full-inventory.md`)
**STATUS**: ACTIVE, empirically confirmed against the live production catalog

## CONTEXT

MU Online private servers commonly sell power-affecting gear directly
for real money (pay-to-win), which damages competitive integrity and
long-term player trust. Blood Moon needed an explicit stance on whether
its CashShop (the Portal/official monetized shop, distinct from the
GameServer-side X-Shop — see ADR-0013) would do the same.

## DECISION

**No equipment with combat stats appears in the CashShop at all.**
Confirmed empirically against the real, live production catalog: all 12
real CashShop products (read from the live `CashShopProduct.txt` and
cross-checked against a real production DB row,
`docs/economy/cashshop-full-inventory.md:39`) are genuinely `+0/+0/+0` —
zero excellent options, zero harmony, zero sockets, zero upgrade level.
Every item is either a consumable event-entry ticket or a cosmetic
pet/wing/mount skin (typically a 7-day rental, not permanent power).

`WriteCashShopLog = 1` and `CashShopSwitch = 1`
(`cashshop-full-inventory.md:53`) confirm the shop is genuinely live and
audit-logged, not a dormant/unused feature — this is a real, currently-
enforced policy, not an aspirational one.

## WHY

Explicitly named "the real, working counter-example to the X-Shop's
all-max-power catalog — proof the same engine can run a compliant
cosmetics-and-QoL-only shop" (`cashshop-full-inventory.md:39`). Keeping
the officially-monetized CashShop free of combat power protects
competitive integrity for the player base that never spends real money,
while still allowing real monetization through cosmetics and
convenience — a common, well-understood commercial model in live-service
games that doesn't require pay-to-win to be profitable.

## ALTERNATIVES CONSIDERED

Not documented in the surviving Phase 12 source (missing from the
current repo tree, per the same gap noted in ADR-0008's missing
`ECONOMY_PRODUCT_DECISIONS.md`) — presumably the standard pay-to-win vs.
cosmetic-only tradeoff was weighed, but the specific reasoning is not
recoverable from what remains.

## CONSEQUENCES

- Any future CashShop item addition must be checked against this
  standard before being added — a combat-affecting item appearing in the
  CashShop would be a policy violation, not just a product choice to
  reconsider.
- This stance does **not** apply to the GameServer-side X-Shop, which is
  the opposite (see ADR-0013) — the two systems have deliberately
  different, contrasting philosophies, and this ADR's conclusion must
  never be assumed to cover X-Shop as well.
- Any future app-level (Portal) exposure of shop items must independently
  re-verify this stat-neutrality per item, not assume the CashShop's
  existing 12-item catalog is exhaustive or that new items will
  automatically comply.

## RELATED SYSTEMS

`docs/economy/cashshop-full-inventory.md`, ADR-0013.
