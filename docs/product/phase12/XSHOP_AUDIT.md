---
status: DRAFT
category: product/economy-audit
audience: internal (product + engineering)
lastVerified: 2026-08-29
evidenceMethod: direct parse of D:\MU\RemoteData\Phase11\CustomXShop.readable.txt and CashShopProduct.readable.txt (both real, downloaded Phase 11, re-parsed programmatically this phase — full file, 0 rows sampled)
---

# X-Shop Complete Audit (Parts A/B)

## Correction to Phase 11's item count

Phase 11's report stated "182 individual item rows." A full programmatic parse this phase counts **exactly 168 rows** (14 categories × 12 rows each, category indices 0–13). This is the number used throughout this document and should replace "182" everywhere it appears in Phase 11 material — see `OPEN_BETA_DECISION_REGISTER.md`'s correction log (Part P).

## Part A — full classification

Every one of the 168 rows shares the same structural profile within its category (only price and item index vary), so the audit is presented at category granularity, with the shared fields quoted once and the full raw data available unmodified in the source file for row-by-row reference.

**Shared fields across all 168 rows, no exceptions**: `ItemLevel = 13` (+13), `ItemNewOption = 63` (the Excellent-option bitmask — all 6 Excellent bonus slots active), `ItemSocket1-5 = 255` (the engine's "no socket" sentinel — confirms these are NOT Ancient or Socket items), `ItemSetOption = 0` / `ItemHarmony = 0` (no Ancient set bonus).

| Category | Item type | Rows | Price range (Coin0) | Coin1 | Coin2 | Duration | Classification |
|---|---|---|---|---|---|---|---|
| 0 Swords | weapon | 12 | 500–30,000 | 0 | 0 | 60 (anomaly, see note) | `REMOVE_FROM_PREMIUM_SHOP` |
| 1 Axes | weapon | 12 | 10,000–30,000 | 50 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 2 Scepters | weapon | 12 | 10,000–30,000 | 30 | 10 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 3 Spears | weapon | 12 | 0 | 100 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 4 Bows/CrossBows | weapon | 12 | 0 | 0 | 200 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 5 Staffs | weapon | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 6 Shields | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 7 Helms | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 8 Armors | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 9 Pants | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 10 Gloves | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 11 Boots | armor | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 12 Wings | wing | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` |
| 13 Pets/Rings/Pendants | mixed | 12 | 10,000–30,000 | 0 | 0 | 0 | `REMOVE_FROM_PREMIUM_SHOP` (see UNKNOWN note) |

**Item-code detail** (`ItemType`/`ItemIndex` pairs, exact indexes from the real file — item *names* require `Item.txt`, 253,685 bytes, not parsed this phase, out of scope for this focused pass):
- Categories 0–11: item indices 0–11 sequentially within each type.
- Category 12 (Wings): indices 0,1,2,3,4,5,6,36,37,38,39,40 — a gap (7–35 skipped), consistent with the classic engine's wing-tier numbering (early indices = Wings 1st tier, 36+ = a later tier such as Wings of Despair/Dimension).
- Category 13 (Pets/Rings/Pendants): indices 8,9,21,22,23,24,12,13,25,26,27,28 — genuinely mixed item types under one category per the file's own comment; exact identity of each (which are rings vs. pendants vs. pets) is `UNKNOWN` without `Item.txt`.

**Classification verdict — 168/168 `REMOVE_FROM_PREMIUM_SHOP`, 0 `KEEP`, 0 `COSMETIC_CANDIDATE`, 0 `CONVENIENCE_CANDIDATE`, 0 `TEMPORARY_CANDIDATE`.** Every single row is a +13, fully-Excellent-optioned weapon, armor piece, wing, or (per category 13) pet/ring/pendant. This is not a partial or borderline case — the entire catalog, without exception, is exactly the category of item the Cash Shop Philosophy decision names explicitly ("Excellent equipment... normal Wings... direct PvP/endgame equipment"). No item in this file is a candidate for any softer classification.

**Anomaly, not reinterpreted beyond what the field states**: Swords category shows `ItemDuration = 60` (all 12 rows), where every other category shows `0`. 60 seconds is not a plausible real rental period for a purchased weapon. This is flagged as `UNKNOWN`/likely a data artifact (possibly an unused/repurposed field, or a copy-paste remnant from another template) rather than confidently interpreted as an intentional 60-second rental — worth a direct question to whoever last edited this file if it becomes load-bearing, but not treated as meaningful here.

**Currency mapping caveat**: `Coin0`/`Coin1`/`Coin2` are not explicitly labeled in this file (unlike `CustomShopBuyKits.txt`, which names `WCoinC`/`WCoinP`/`GoblinPoint` directly). Whether Coin0=WCoinC, Coin1=WCoinP, Coin2=GoblinPoint is a reasonable but unconfirmed positional guess — not asserted as fact here.

## Part B — a product-safe candidate, grounded in a proven precedent that already exists

**The good news, found while resolving this same question**: `CashShopProduct.txt` (the CashShop, distinct from X-Shop) is **already fully compliant** with the Cash Shop Philosophy, and is live today:

| Item | ItemLevel | Excellent options | Duration | Category |
|---|---|---|---|---|
| Blood Castle / Devil Square / Kalima Ticket | 0 (+0) | none | permanent (consumable, qty 10) | event-entry consumable |
| Guardian Angel, Imp, Horn of Dinorant, Demon (wings/accessories) | 0 (+0) | none | 604,800s (7 days, rental) | temporary convenience |
| Spirit of Guardian, Pet Rudolf, Pet Panda, Pet Unicorn, Pet Skeleton | 0 (+0) | none | 604,800s (7 days, rental) | temporary convenience |

Every one of these 12 items is genuinely `+0 +0 +0` (the file's own comment states this explicitly for each row) — zero stat enhancement, zero Excellent options. This is not a hypothetical design; it is the **actual, currently-selling, policy-compliant pattern** Blood Moon should point to as its own precedent when defining what "safe" looks like.

### Proposed safe X-Shop candidate categories, using the CashShop pattern as the template

| Category | Basis | PvE impact | PvP impact | Economy impact | F2P availability | Progression acceleration |
|---|---|---|---|---|---|---|
| Event-entry tickets (Blood Castle/Devil Square/Kalima-style) | Already proven live in CashShop | Convenience only — still requires playing the event to earn anything | None directly | Low — consumable, not tradeable stat power | Full — same event is reachable without buying a ticket, per other config already confirmed | Time-saving, not power-granting |
| Cosmetic-only wings/pets (`+0`, no Excellent) | Already proven live in CashShop | None (no stat bonus) | None | Low | Full — visual only | None |
| Temporary rental convenience items (7/15/30-day) | Mechanism proven (`ItemDuration`), just needs new item rows | Depends on the specific item chosen — must be re-vetted per item, not assumed safe by virtue of being temporary (see explicit warning below) | Same | Depends on item | Must remain reachable free, per F2P Philosophy | Must not create a destination unreachable to F2P |

**Explicit warning honored, not glossed over**: the phase spec is right that "temporary" does not automatically mean "safe." A 7-day rental of a +13 Excellent sword would carry the exact same P2W risk as the current X-Shop catalog, just time-boxed. **None of the 168 current X-Shop items become acceptable by simply adding a duration field to them** — the disqualifying factor is the `+13`/Excellent/Wing/endgame-equipment nature of the item itself, which a rental period does not change. Any future temporary-item design must independently satisfy the same "no standard/endgame equipment" test the permanent catalog does.

### What this means concretely for the 168 X-Shop items

None of the 168 items are recommended to move into a "safe" catalog as-is. Any future compliant X-Shop would be a **new, separate catalog** built on the CashShop's `+0`/no-Excellent pattern — not a filtered subset of the current 168, since the entire current catalog fails the same test uniformly.
