---
status: DRAFT_FOR_REVIEW
category: economy/xshop
audience: internal (product review session prep)
lastVerified: 2026-08-30
---

# X-Shop Batch Review Groups — Phase 15

Per Bryan's request: group the 163 `RECOMMEND_REVIEW_UNCLASSIFIED` items into review-sized batches (weapons, sets/armor, wings, pets, etc.) instead of 163 standalone decisions, while keeping the option to drill into any single item within a group. Source data unchanged — see [`xshop-full-inventory.md`](xshop-full-inventory.md) / [`.csv`](xshop-full-inventory.csv) for the authoritative per-item table; this document only re-organizes the *review workflow*, no new classification.

## Group 1 — Melee & Ranged Weapons (72 items, 6 categories)

Swords, Axes, Scepters, Spears, Bows/CrosBows, Staffs — 12 items each. All share the same risk profile: `+13` upgrade, all-6-excellent-options-inferred, no sockets, req. level roughly 40-192 (mid-tier, not endgame by the doc's own threshold). **Swords is the one category with a 60-day rental duration** (every other weapon category is permanent) — worth deciding as its own sub-question even within this group, since it changes the commercial framing (subscription-like vs. one-time).

Suggested review order within this group: by category (12-item sub-batches), since each category is a self-contained set of class-appropriate weapons — a decision on "Swords" doesn't need to wait on "Staffs."

## Group 2 — Defense/Armor Set Pieces (72 items, 6 categories)

Shields, Helms, Armors, Pants, Gloves, Boots — 12 items each, same `+13`/all-excellent profile as Group 1, no damage stat (defense-only). These are the pieces that would form complete armor sets if kept together — worth reviewing as "does this shop sell complete +13 sets" rather than 6 independent piece-type decisions, since a partial ban (e.g. remove Helms but keep Armors) would leave an incomplete, oddly-crippled set for sale.

## Group 3 — Wings (12 items, 1 category)

Includes both classic Wing slots (indices 0-6) and Cape/2nd-Wing slots (indices 36-40) in the same category — worth confirming during review whether both sub-types should get the same KEEP?/REMOVE decision or split (wings are typically far more visually/mechanically significant than most other equipment slots in MU).

## Group 4 — Pets / Rings / Pendants (12 items, 1 category)

The lowest-risk group by the doc's own data: 2 of 12 already carry `RECOMMEND_LOW_RISK_STARTER_TIER_CANDIDATE_KEEP` (rings/pendants have `reqLevel=0-1` in the base game — no level gate at all), and the other 10 are `UNCLASSIFIED` only because the doc's thresholds don't have a clean bucket for "no level requirement, but still +13/all-excellent." Likely the fastest group to clear in a review session.

## What this document does NOT do

- Does not pre-decide any item's `KEEP?` value — every row in the source CSV/MD stays `UNREVIEWED`.
- Does not merge or hide the 3 `NOT_AVAILABLE` Axes rows (indices 9/10/11) — they stay flagged as a data gap, not folded into Group 1's weapon review as if resolved.
- Does not change the underlying 14-category structure in the source data — this is a review-session lens on top of it, not a replacement.

## Suggested session structure

A single review pass could reasonably cover: Group 4 first (fastest, lowest-risk, good warm-up), then Group 3 (small, single-category), then Groups 1 and 2 (largest, likely need the most discussion — the Swords rental-duration question and the Group 2 "complete set" question are the two items most likely to need a real product conversation rather than a quick per-item glance).
