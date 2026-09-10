---
status: DRAFT_FOR_REVIEW
category: economy
audience: internal (engineering + product)
lastVerified: 2026-09-02
---

# X-Shop / CashShop configuration field matrix — Phase T (Parts 1/2)

Exact field-by-field contract for both legacy catalog files, re-verified
against a fresh, byte-hash-confirmed re-download this phase (SHA256
`921A75...` for `CustomXShop.txt`, `1FBA84...` for `CashShopProduct.txt`
— both identical to the copies Phase R/S already analyzed; no drift has
occurred). Nothing here is assumed from generic MU Online engine
knowledge — every row traces to a real column position in a real,
re-read file.

## X-Shop (`CustomXShop.txt`)

| FIELD | TYPE | SOURCE | MEANING | READABLE | WRITABLE_IN_CONFIG | RUNTIME_MUTABLE | RELOAD_REQUIRED | RESTART_REQUIRED | SAFE_FOR_PORTAL_CONTROL | CONFIDENCE |
|---|---|---|---|---|---|---|---|---|---|---|
| `Category` | int (0-13) | column 1 | Weapon/armor/wing/accessory category, also the row's position in the 14-category block structure | YES | YES (structural, changing it moves the row to a different category block) | UNKNOWN | UNKNOWN | UNKNOWN | NO (structural, not a commercial toggle) | CONFIRMED (position + values) |
| `ItemType` | int | column 2 | Base item type key (joins to `Item.txt`'s per-type block) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (identity, not configurable) | CONFIRMED |
| `ItemIndex` | int | column 3 | Base item slot within its type (joins to `Item.txt`) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (identity) | CONFIRMED |
| `ItemLevel` | int | column 4 | Upgrade level (+0..+15) granted at purchase — every resolved row is `13` | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (this IS the RED-classification driver — must never be admin-editable without a real product decision) | CONFIRMED (value); HYPOTHESIS (that "13"="+13", per standard MU convention) |
| `ItemDurability` | int | column 5 | Max durability — constant `255` on every row, not commercially relevant | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | CONFIRMED (value); UNKNOWN (semantic significance) |
| `ItemOption1`/`2`/`3` | int | columns 6-8 | Additional-option encoding (luck/skill/option level) — HYPOTHESIS per standard shop-file convention, not confirmed against engine source | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | HYPOTHESIS |
| `ItemNewOption` | int (bitmask) | column 9 | Excellent-option bitmask — `63` (all 6 bits) on every resolved row | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (RED-classification driver) | HYPOTHESIS (bitmask reading, per Phase 14's own inference) |
| `ItemSetOption` | int | column 10 | Ancient/Set flag — `0` on every row (no X-Shop item has this) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | CONFIRMED (value) |
| `ItemHarmony` | int | column 11 | Harmony-option flag — `0` on every row | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | CONFIRMED (value) |
| `ItemOptionEx` | int | column 12 | Extra option field — `0` on every row | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | CONFIRMED (value); UNKNOWN (semantic) |
| `ItemSocket1`-`5` | int × 5 | columns 13-17 | Socket state — `255` (no socket) on every row | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO | CONFIRMED (value; `255`=no-socket is a standard MU convention, HYPOTHESIS not CONFIRMED against this engine specifically) |
| `ItemDuration` | int (days) | column 18 | `0`=permanent, `60`=Swords-category rental | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field** — duration is a real commercial lever with no power/policy conflict by itself | CONFIRMED |
| `Coin0`/`Coin1`/`Coin2` | int × 3 | columns 19-21 | Price in WCoinC/WCoinP/GoblinPoint respectively (CONFIRMED via `WZ_SetCoin` source, ADR-0022/0023) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field** — price is the clearest commercial lever, though selling a RED item at any price is still policy-blocked at the Portal layer regardless of this field's own mutability | CONFIRMED |
| `Quantity` | int | column 22 | Stack size granted per purchase | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field** | CONFIRMED |
| Leading bare `0` (line 2, before the header) | int | file-level, not per-row | Unclear — possibly a global X-Shop system toggle, a version marker, or a reserved field. No second value was ever observed to compare against (only ever seen as `0`). | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (semantics unconfirmed — must not be touched based on a guess) | `UNKNOWN_LIKELY_GLOBAL_TOGGLE_OR_RESERVED` |

**Enable/disable**: no boolean field exists (Part 3 below). **Buy type / sell
type**: no distinct field observed anywhere in this file — not present,
not inferred.

## CashShop (`CashShopProduct.txt` + `CashShopPackage.txt`)

| FIELD | TYPE | SOURCE | MEANING | READABLE | WRITABLE_IN_CONFIG | RUNTIME_MUTABLE | RELOAD_REQUIRED | RESTART_REQUIRED | SAFE_FOR_PORTAL_CONTROL | CONFIDENCE |
|---|---|---|---|---|---|---|---|---|---|---|
| `BaseIndex`/`MainIndex` | int | `CashShopProduct.txt` columns 1-2 | Product identity/ordering keys | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (identity) | CONFIRMED |
| `CoinValue` | int | `CashShopProduct.txt` column 3 | Price, in whatever currency `CoinIndex` selects | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field** | CONFIRMED |
| `ItemIndex` | int | `CashShopProduct.txt` column 4 | Real GameServer item index — CONFIRMED distinct namespace from X-Shop's `ItemType-ItemIndex` pairs (CashShop uses a single global index, e.g. `6703`) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (identity) | CONFIRMED |
| `ItemLevel`/option/set/harmony/socket columns | int × several | `CashShopProduct.txt` columns 5-16 | Same shape as X-Shop's equivalent columns — CONFIRMED all `0`/`255` (no power) across all 12 real rows | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (this IS the GREEN-classification basis — must stay `+0` to preserve ADR-0012's cosmetics-only guarantee) | CONFIRMED |
| `ItemQuantity` | int | `CashShopProduct.txt` column 17 | `10` for the 3 tickets (a real consumable stack), `0` for the 9 rentals (single grant) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field** | CONFIRMED |
| `ItemDuration` | int (seconds) | `CashShopProduct.txt` column 18 | `0`=permanent, `604800`=7-day rental (exactly 7×24×3600) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | **YES, candidate field, but see OQ-028** — changing this doesn't touch `CashShopPeriodicItem`'s own tracking logic, whose safety is separately unproven | CONFIRMED |
| `Comment` (trailing `//`) | text | `CashShopProduct.txt`, end of line | Real item display name (no join to `Item.txt` needed for CashShop, unlike X-Shop) | YES | YES | N/A | N/A | N/A | N/A (display only) | CONFIRMED |
| `CoinIndex` | int | `CashShopPackage.txt` column 5 | Currency selector — uniform `508` on all 12 rows | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (Decision 5: `UNKNOWN_NON_BLOCKING`, do not touch based on an unresolved meaning) | CONFIRMED (value); `UNKNOWN_NON_BLOCKING` (meaning) |
| `ProductBaseIndex1-10`/`ProductMainIndex1-10` | int × 20 | `CashShopPackage.txt` | Bundle-reference columns — all `0` except the first pair, on every real row (no multi-product bundles currently configured) | YES | YES | UNKNOWN | UNKNOWN | UNKNOWN | NO (bundle authoring is out of scope) | CONFIRMED (value) |

**Enable/disable, periodic/rental fields, availability**: covered in
Part 3 below and in ADR-0023's own CashShop rental section
(`CashShopPeriodicItem`, a separate SQL Server table, not a config-file
field at all).

## Notes on `RUNTIME_MUTABLE`/`RELOAD_REQUIRED`/`RESTART_REQUIRED` = UNKNOWN everywhere

Every one of these three columns is honestly `UNKNOWN` for every field
in both files — this is not a gap in this phase's effort, it is the
real, current limit of what can be determined from static config file
content, RemoteOps read-only file access, and SQL Server schema
inspection alone. Answering them for real requires either GameServer
engine source (not available) or a live, observed reload/restart test
against a real (non-production) instance (Part 19's own scope — not
performed this phase, no such instance exists in this project's
environment).

## Related systems

`docs/decisions/0023-store-catalog-decision-closure.md`,
`docs/decisions/0024-legacy-shop-control-plane.md`,
`docs/economy/legacy-catalog-effective-state-snapshot.json` (the real,
hash-verified snapshot this matrix's CONFIRMED values are read from),
`apps/api/src/modules/commerce/legacy-catalog-effective-state.service.ts`.
