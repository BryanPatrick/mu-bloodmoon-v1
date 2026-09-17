---
status: TEST_PLAN_NOT_YET_EXECUTED
category: economy/xshop
audience: internal (future QA/GM agent)
lastVerified: 2026-09-02
---

# X-Shop Accessory Balance Test Plan — Phase S (Part 22)

Prepares the future empirical test needed to resolve Decision 2
(`BALANCE_TEST_REQUIRED`) for the 12 X-Shop Pets/Rings/Pendants — **not
executed this phase**, no in-game access exists in this session. `ReqLevel=0`
must never be read as "low power" on its own (Bryan's own explicit
instruction) — this plan exists precisely because that inference is not
trusted.

## Scope

The 12 items: Ring of Ice, Ring of Poison, Pendant of Lighting, Pendant
of Fire, Ring of Fire, Ring of Earth, Ring of Wind, Ring of Magic,
Pendant of Ice, Pendant of Wind, Pendant of Water, Pendant of Ability
(`docs/economy/xshop-bryan-decision-table.md`, Group 4). All share the
identical `+13`/all-6-excellent stat package as every other X-Shop
item — the open question is purely the real, in-game magnitude of that
package on an accessory slot specifically, not on a weapon/armor/wing.

## Test matrix

For each of the 12 items (or a representative sample if testing all 12
individually is impractical — at minimum one Ring and one Pendant):

| # | Step | Compares against | Measures |
|---|---|---|---|
| 1 | Equip a normal, F2P-obtainable version of the same accessory (base stats, no excellent options, +0) on a test character | Baseline | Character sheet stat delta (damage/defense/HP/mana/attack speed) |
| 2 | Equip the X-Shop `+13`/all-excellent version of the SAME accessory on the same test character, same build | Step 1's baseline | The real stat delta the +13/excellent configuration adds |
| 3 | Repeat steps 1-2 across at least 3 character classes/builds where the accessory is usable (accessories are typically class-agnostic in MU, but build-dependent stat scaling is not) | Cross-build consistency | Whether the power delta is uniform or build-dependent |
| 4 | PvE test: a fixed monster/scenario (e.g. a specific boss or farming spot), measure kill time or DPS with baseline vs. X-Shop accessory equipped | Steps 1-2 | Real PvE impact, not just raw stat numbers |
| 5 | PvP test (if a safe, controlled PvP environment exists — e.g. duel/arena): a fixed opponent build, measure win-rate or damage-exchange difference with baseline vs. X-Shop accessory | Steps 1-2 | Real PvP impact |
| 6 | Survivability check: HP/defense-focused metric (e.g. damage taken per unit time from a fixed source) with baseline vs. X-Shop accessory | Steps 1-2 | Whether the accessory materially changes survivability, not just offense |

## What this plan does NOT assume

- Does not assume the result will be "low impact" — `ReqLevel=0` is
  explicitly not treated as evidence of that.
- Does not assume all 12 items behave identically — Rings and Pendants
  may carry different option types (elemental resistance vs. stat bonus,
  for instance) worth testing separately if the base game's own item
  definitions differ meaningfully between the two families.
- Does not pre-decide the commercial outcome — a `NEEDS_BALANCE_TESTING`
  finding that shows real, material power impact should result in these
  12 items being reclassified toward `NOT_FOR_COMMERCIAL_SALE`-adjacent
  treatment, not force-fit into GREEN because the plan was already
  written expecting a low-impact result.

## Pass/fail framing

There is no single pass/fail gate here (unlike the CashShop rental
runbook's warehouse/trade safety gates) — this is a **magnitude**
question, not a **mechanism-safety** question. The real output is a
quantified power-delta report per item/build/scenario, which Bryan then
uses to make the actual commercial call (sell as-is, sell with a nerfed
variant, don't sell at all).

## Related systems

`docs/economy/xshop-commercial-review.md` (Group 4 classification),
`docs/economy/xshop-bryan-decision-table.md`,
`docs/decisions/0023-store-catalog-decision-closure.md` (Decision 2).
