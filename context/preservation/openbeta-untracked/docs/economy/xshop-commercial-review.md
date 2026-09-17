---
status: DRAFT_FOR_REVIEW
category: economy/xshop
audience: internal (product review session prep)
lastVerified: 2026-09-02
---

# X-Shop Commercial Review — Phase R

Bryan's PART 2-4/17 request: real category classification, a preliminary
commercial risk tag (`GREEN_CANDIDATE`/`YELLOW_REQUIRES_DECISION`/
`RED_INCOMPATIBLE_WITH_CURRENT_POLICY`/`UNKNOWN_DATA_GAP`) against the
*current* commercial policy (cosmetics/convenience/controlled
acceleration allowed; endgame Excellent/Ancient/Socket gear, endgame
Wings, exclusive best-in-slot power, and F2P-unreachable progression are
not), and Bryan-review-ready groups. **These are recommendations for
Bryan's review, not final product approval** — see
[`xshop-bryan-decision-table.md`](xshop-bryan-decision-table.md) for the
full 168-row evidence table, every row `BRYAN_DECISION = PENDING`.

No X-Shop configuration was read-write touched. No item was deleted,
removed, disabled, or modified. This phase re-downloaded the real source
files fresh (`CustomXShop.txt`, `Item.txt`, `CustomShopBuyKits.txt`, plus
two new files — see below) via the same read-only RemoteOps path Phase
14 used, rather than relying only on the prior report, per this phase's
own instruction.

## Fresh re-verification (2026-09-02) — what changed vs. Phase 14

- **165/168 name resolution, 3 unresolved Axes (indices 9/10/11):
  RE-CONFIRMED**, not just re-cited. A fresh download of both
  `CustomXShop.txt` and `Item.txt` this session shows the real Axe
  (`ItemType=1`) block in `Item.txt` genuinely ends at slot 8 ("Crescent
  Axe"), followed only by a disjoint server-exclusive slot 100
  ("BloodMoon Axe"), then `end`. Slots 9/10/11 are not defined anywhere
  in the Axe block — this is a real, structural data gap in the source
  file itself, not a join error on this session's part.
- **Currency mapping upgraded from INFERRED to CONFIRMED.** A newly
  found sibling file, `CustomBuyVipAndCoin.txt`, independently declares
  the same 3-column header convention (`CoinSwitch WCoinC WCoinP
  GoblinPoint`) as `CustomShopBuyKits.txt` — a second, independent
  config file agreeing on the same naming. More importantly, this phase
  queried the real `WZ_SetCoin` stored procedure's actual source
  (via the local, schema-verified GameServer database lab — see
  `docs/gameserver/database/lab-environment.md`) and found its own
  inline comments state explicitly: `@Value1` → "Cash | WCoinC",
  `@Value2` → "Gold | WCoinP", `@Value3` → "PcPoints | GoblinPoint",
  writing directly to `CashShopData.WCoinC`/`WCoinP`/`GoblinPoint`. This
  is no longer a positional-analogy guess — it is confirmed from real
  procedure source. See
  [`legacy-dmn-cms-and-currency-investigation.md`](legacy-dmn-cms-and-currency-investigation.md)'s
  new addendum for the full trace.
- See [`cashshop-commercial-review.md`](cashshop-commercial-review.md)
  for the CashShop-side re-verification, including a real correction to
  the rental-item count.
- **Item images: re-checked, still blocked, same conclusion.** This
  phase re-read `D:\MU\Tools\RemoteOps\config\remoteops.json` directly
  (not assumed unchanged) — `InventoryAllowedRoots` still lists only
  `Data`, `Tutoriais`, `GameServer\DATA`, `GameServerCS\DATA`, no client
  asset directory. `ITEM_IMAGE = NOT_AVAILABLE` remains accurate on
  every row; no fake or AI-generated images were created.

## Classification rules used (deterministic, not per-item judgment)

Because every one of the 165 resolved X-Shop rows shares the *same*
`+13` upgrade / all-6-excellent-options (`ItemNewOption=63`) stat
package — confirmed again this phase from the freshly re-downloaded raw
file — the commercial classification below is driven by **category**,
not 165 independent judgment calls. This is not an evasion of the "do
not call something P2W solely from its name" instruction: the
classification never looks at item names, only at the shared, real,
row-level attributes (upgrade level, excellent bitmask, request-level
bracket, slot type). A generated script
(`docs/economy/xshop-bryan-decision-table.md`'s own generation logic)
applies these rules mechanically across all 168 rows, so the same input
always produces the same output — no manual per-row drift.

| Rule | Applies to | Classification | Why |
|---|---|---|---|
| Weapon categories (Swords/Axes/Scepters/Spears/Bows/Staffs) with a resolved name | 69 items | `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` | The `+13`/all-6-excellent stat package **is** "exclusive best-in-slot gear"/"a progression destination unavailable to F2P players" under current policy — this holds regardless of whether the underlying base item (e.g. "Kris") is itself a low-tier name, because the power being sold is the modifier stack, not the base item identity. |
| Armor categories (Shields/Helms/Armors/Pants/Gloves/Boots) | 72 items | `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` | Same reasoning as weapons, applied to defense slots. Six categories × 12 items would form complete `+13`/full-excellent armor sets if sold together — explicitly named as a review question in Phase 15's own grouping doc, now resolved with a concrete recommendation. |
| Wings | 12 items | `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` | Explicitly named in current policy as incompatible ("normal endgame Wings"). Wings are typically the single most visually/mechanically significant slot in MU — the highest-stakes category to get wrong. |
| Pets/Rings/Pendants | 12 items | `YELLOW_REQUIRES_DECISION` | Same `+13`/all-6-excellent bitmask, but on accessory slots with `ReqLevel 0-1` in the base game (no level gate at all) — real but comparatively small power impact. Not zero-power (unlike the CashShop's confirmed `+0/+0/+0` items), so not `GREEN`; genuinely a magnitude judgment call Bryan should make, not a blanket rule. |
| Axes indices 9/10/11 (unresolved) | 3 items | `UNKNOWN_DATA_GAP` | Item identity itself cannot be confirmed — no power/commercial call is possible until resolved (see below). |

**Result**: `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` = 153,
`YELLOW_REQUIRES_DECISION` = 12, `UNKNOWN_DATA_GAP` = 3,
`GREEN_CANDIDATE` = 0. **No X-Shop item currently qualifies as an
unconditional GREEN candidate** under the stated commercial policy —
this is the single most important finding of this review, and follows
directly and mechanically from the catalog's own uniform `+13`/all-
excellent construction, not from an aggressive reading of the policy.

## Power analysis (Part 4)

Combat strength was not asserted from item names. The two real,
row-level signals available from static config are:
1. **The upgrade/excellent stack** (`ItemLevel=13`, `ItemNewOption=63`)
   — present identically on every resolved row, described above.
2. **`ReqLevel`** (from `Item.txt`), used only to separate "accessory,
   no level gate" (Pets/Rings/Pendants) from "requires a real character
   level to equip" (every weapon/armor/wing category) — not to rank
   items within a category, since a full excellent stack makes even a
   nominally "low" base weapon far stronger than its base stats alone
   suggest.

No in-game damage/defense simulation, PvP testing, or client access was
available this session — where actual relative combat strength between
two classified items would matter (e.g. "is a +13 all-excellent Kris
actually weaker than a +13 all-excellent Divine Sword of Archangel in
practice"), this document does not claim to know, and marks it
`POWER_IMPACT_UNKNOWN` only for the 3 unresolved Axes rows (where item
identity itself is missing) rather than inventing a false precision
ranking within the 165 resolved rows.

## Rental analysis (Part 5, X-Shop side)

Of the 14 X-Shop categories, exactly **one** — Swords (12 items) —
carries `ItemDuration=60` (a 60-day rental); every other category is
`ItemDuration=0` (permanent). This is `CONFIGURED_AS_RENTAL`, confirmed
directly from the raw file, not inferred. **This does not change the
Swords category's `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` classification**
— a 60-day rental of `+13`/all-6-excellent weapon power is still
"exclusive best-in-slot gear unavailable to F2P players" for the
duration it's active; a temporary grant of P2W power is still P2W,
just time-boxed. Duration and power-tier are independent axes and
should not be conflated (per Part 5's own instruction not to treat
rental status as automatically safe).

## The 3 unresolved Axes — re-investigated, technical identifiers preserved

`ItemType=1` (Axes), `ItemIndex=9/10/11` in `CustomXShop.txt` (rows 22-24
of the source table; `Coin0=25000`, `Coin1=50`, `Coin2=0` for all three,
identical to the surrounding resolved rows' pricing pattern). `Item.txt`'s
Axe block defines slots 0-8 ("Small Axe" through "Crescent Axe") plus a
disjoint slot 100 ("BloodMoon Axe", a server-exclusive weapon, req.
level 100) — **no slot 9, 10, or 11 exists**, confirmed via a byte-for-
byte fresh re-download this session. Two honest possibilities, neither
assumed: (a) these are genuinely dead/unused catalog rows in
`CustomXShop.txt` that would fail if a player tried to buy them, or (b)
this server runs an `Item.txt` extension or override this session's
RemoteOps access does not expose (unlikely, given the exhaustive
`InventoryAllowedRoots` search, but not provably ruled out without
either GameServer source or an in-game purchase attempt). **Preserved
as `UNKNOWN_ITEM_NAME`, not invented** — see rows 22-24 in
[`xshop-bryan-decision-table.md`](xshop-bryan-decision-table.md).

## Bryan review groups (Part 17)

Ten groups, matching Bryan's suggested taxonomy exactly where real data
exists, and honestly stating "no items" where it doesn't rather than
forcing a fit:

| Group | Items | Commercial summary | Power-risk summary | Pricing summary | Currency | GREEN / YELLOW / RED / UNKNOWN counts |
|---|---|---|---|---|---|---|
| GROUP 1 — Weapons (Swords/Axes/Scepters/Spears/Bows/Staffs) | 72 (69 resolved + 3 unresolved Axes) | Every resolved item is `+13`/all-6-excellent | High, uniform across the group | WCoinC-dominant (10,000-30,000 typical), a few carry a WCoinP/GoblinPoint component (e.g. Katana: 500/200/60) | WCoinC primary, WCoinP/GoblinPoint secondary on some rows | 0 / 0 / 69 / 3 |
| GROUP 2 — Armor/Sets (Shields/Helms/Armors/Pants/Gloves/Boots) | 72 | Same `+13`/all-excellent profile, defense-only | High, uniform | Similar WCoinC-dominant pattern | Same | 0 / 0 / 72 / 0 |
| GROUP 3 — Wings | 12 | Same profile, single most visually significant slot | High, uniform | WCoinC-dominant | Same | 0 / 0 / 12 / 0 |
| GROUP 4 — Pets/Rings/Pendants | 12 | Same bitmask, accessory slots, `ReqLevel 0-1` | Low-to-moderate, real judgment call | WCoinC-dominant | Same | 0 / 12 / 0 / 0 |
| GROUP 5 — Jewels/enhancement | 0 | No X-Shop items in this category | N/A | N/A | N/A | 0 / 0 / 0 / 0 |
| GROUP 6 — Consumables/buffs | 0 (X-Shop) — see CashShop's 3 event tickets | N/A for X-Shop | N/A | N/A | N/A | 0 / 0 / 0 / 0 |
| GROUP 7 — Utility/convenience | 0 | No X-Shop items in this category | N/A | N/A | N/A | 0 / 0 / 0 / 0 |
| GROUP 8 — Cosmetics | 0 (X-Shop) — see CashShop's 9 rentals | N/A for X-Shop | N/A | N/A | N/A | 0 / 0 / 0 / 0 |
| GROUP 9 — Rentals/timed items | 12 (Swords, a subset of Group 1) | Same `+13`/all-excellent profile, 60-day rental | High, unchanged by duration | WCoinC-dominant | Same | 0 / 0 / 12 / 0 (already counted in Group 1's 69 RED, listed here for visibility per Part 5) |
| GROUP 10 — Unknown/data gaps | 3 | 3 unresolved Axes rows | Unknown | Present in raw config (25000/50/0) | WCoinC/WCoinP | 0 / 0 / 0 / 3 |

**X-Shop-only totals**: `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` = 153
(Groups 1+2+3, Group 9 is a subset of Group 1 not double-counted),
`YELLOW_REQUIRES_DECISION` = 12 (Group 4), `UNKNOWN_DATA_GAP` = 3
(Group 10), `GREEN_CANDIDATE` = 0. Groups 5/6/7/8 have zero X-Shop
items — the catalog is entirely gear, no cosmetic/consumable/utility
items exist in X-Shop at all (see
[`cashshop-commercial-review.md`](cashshop-commercial-review.md) for
where those categories DO have real items).

## What this document does NOT do

- Does not decide any item's `KEEP?`/`BRYAN_DECISION` value — every row
  stays `PENDING` in the decision table.
- Does not merge or hide the 3 `UNKNOWN_DATA_GAP` Axes rows.
- Does not claim in-game-verified combat power rankings within the 165
  resolved rows — only the two real, static signals described above.
- Does not supersede [`xshop-batch-review-groups.md`](xshop-batch-review-groups.md)
  (Phase 15's own 4-group review-session structure) — that document
  remains valid as a *session-pacing* aid; this document adds the
  product-oriented 10-group taxonomy and the GREEN/YELLOW/RED/UNKNOWN
  classification Phase 15 did not attempt.
