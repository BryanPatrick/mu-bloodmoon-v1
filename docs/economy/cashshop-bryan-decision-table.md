---
status: DECISION_TABLE_PENDING_BRYAN_REVIEW
category: economy/cashshop
audience: internal (product review)
lastVerified: 2026-09-02
---

# CashShop Bryan Decision Table (12/12 rows) — Phase R

Every row starts `BRYAN_DECISION = PENDING`, same principle as the X-Shop table — this
prepares evidence, it does not decide. See [`cashshop-commercial-review.md`](cashshop-commercial-review.md)
for the fresh re-verification (2026-09-02) this table is based on, including the corrected
rental count (9 rentals + 3 tickets = 12, not 8+4).

## GROUP 6 -- Consumables (Event Tickets) (3 items)

| ID | Category | Item | Technical ID | Price | Duration | Key options | Power impact | Preliminary classification | Data confidence | Bryan decision |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Event Ticket | Blood Castle Ticket | ItemIndex=6703, BaseIndex=1 | 5 CashShop points (CoinIndex=508) | Permanent, Qty=10 (consumable stack) | +0/+0/+0, zero excellent/harmony/socket | NONE — pure event-entry consumable | GREEN_CANDIDATE | CONFIRMED (fresh re-download, 2026-09-02) | PENDING |
| 2 | Event Ticket | Devil Square Ticket | ItemIndex=6702, BaseIndex=2 | 5 CashShop points | Permanent, Qty=10 | +0/+0/+0 | NONE | GREEN_CANDIDATE | CONFIRMED | PENDING |
| 3 | Event Ticket | Kalima Ticket | ItemIndex=6704, BaseIndex=3 | 5 CashShop points | Permanent, Qty=10 | +0/+0/+0 | NONE | GREEN_CANDIDATE | CONFIRMED | PENDING |

## GROUP 8/9 -- Cosmetic Rentals (Pets/Wings/Mounts) (9 items)

| ID | Category | Item | Technical ID | Price | Duration | Key options | Power impact | Preliminary classification | Data confidence | Bryan decision |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 | Pet/Wing cosmetic | Guardian Angel | ItemIndex=6656, BaseIndex=4 | 3 CashShop points | 604800s = 7 days (CONFIGURED_AS_RENTAL via `CashShopPeriodicItem`) | +0/+0/+0 | NONE (cosmetic only) | YELLOW_REQUIRES_DECISION | CONFIRMED item/price/duration; warehouse/trade-window safety UNKNOWN | PENDING |
| 5 | Pet/Wing cosmetic | Imp | ItemIndex=6657, BaseIndex=5 | 3 CashShop points | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 6 | Mount cosmetic | Horn of Dinorant | ItemIndex=6659, BaseIndex=6 | 3 CashShop points | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 7 | Pet cosmetic | Demon | ItemIndex=6720, BaseIndex=7 | 6 CashShop points (highest-priced rental) | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 8 | Pet cosmetic | Spirit of Guardian | ItemIndex=6721, BaseIndex=8 | 5 CashShop points | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 9 | Pet cosmetic | Pet Rudolf | ItemIndex=6723, BaseIndex=9 | 4 CashShop points | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 10 | Pet cosmetic | Pet Panda | ItemIndex=6736, BaseIndex=10 | 10 CashShop points (tied highest) | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 11 | Pet cosmetic | Pet Unicorn | ItemIndex=6762, BaseIndex=11 | 4 CashShop points | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |
| 12 | Pet cosmetic | Pet Skeleton | ItemIndex=6779, BaseIndex=12 | 10 CashShop points (tied highest) | 7 days rental | +0/+0/+0 | NONE | YELLOW_REQUIRES_DECISION | same caveat | PENDING |

## Why YELLOW, not GREEN, for the 9 rentals

All 9 are genuinely zero-power (`+0/+0/+0`, confirmed) — the reason they are not GREEN
is entirely about the rental *mechanism's* proven safety, not the items' power. The
existing 7-day rental mechanism (`CashShopPeriodicItem(ItemSerial, Time)`, a real,
live, epoch-timestamp-based expiration) has three real, still-open unknowns from
[`cashshop-full-inventory.md`](cashshop-full-inventory.md)'s technical dive and
[`lucky-set-rental-empirical-test-plan.md`](lucky-set-rental-empirical-test-plan.md)'s
still-not-executed test plan: whether an item's countdown is honored while stored in
the account warehouse (an opaque binary blob, not inspectable from the schema alone),
whether trade/personal-store can be used to escape the expiration, and the exact
client-visible expiration action. Since a "temporary rental" that can silently become
permanent via a warehouse or trade gap would violate the "temporary, not permanent"
framing Bryan wants strictly enforced, these are marked YELLOW (needs the empirical
test plan run, or an explicit accepted-risk decision) rather than an unconditional GREEN.
