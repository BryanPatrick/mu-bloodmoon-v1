---
status: DRAFT_FOR_REVIEW
category: economy/cashshop
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# CashShop Full Inventory (12 items) — Phase 14 Part B

**No CashShop configuration was modified.** Read-only extraction, same methodology and honesty discipline as [`xshop-full-inventory.md`](xshop-full-inventory.md).

## Source data

- `C:\MuServer\Data\CashShop\CashShopProduct.txt` — the 12 sellable products (item identity, price, duration).
- `C:\MuServer\Data\CashShop\CashShopPackage.txt` — the purchase-package wrapper around each product (category grouping, coin index/value, references back to the product).
- Real GameServer `MuOnline` SQL database, queried read-only via `bm-sql.cmd` (`bloodmoon_observer`, `CanSelect=1`/`CanUpdate=0`, confirmed no write capability): `INFORMATION_SCHEMA.COLUMNS` for schema discovery, plus two narrow, non-PII `COUNT`/`MIN`/`MAX` queries against `CashShopPeriodicItem` (a 2-column table with no account-identifying data at all) and a row-count-only query against `CashShopInventory`. No account/character/player-identifying data was read or displayed at any point in this investigation.

Unlike `CustomXShop.txt`, `CashShopProduct.txt` carries the item's real name directly as a trailing `// Comment`, so no join against `Item.txt` was needed or performed for this table.

## Full inventory (12/12 resolved directly from source comments)

| KEEP? | ITEM | IMAGE | ItemIndex | Category | Level/Options | Duration | CoinValue | CoinIndex | Qty | CURRENT_RISK | RECOMMEND | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UNREVIEWED | Blood Castle Ticket | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6703 | Event Ticket | +0/+0/+0 | Permanent, Qty=10 (consumable stack) | 5 | 508 (UNKNOWN currency ID) | 10 | NONE — consumable event-entry ticket, no equipment power | RECOMMEND_LOW_RISK_KEEP | Matches "Cash Shop Philosophy" precedent |
| UNREVIEWED | Devil Square Ticket | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6702 | Event Ticket | +0/+0/+0 | Permanent, Qty=10 | 5 | 508 | 10 | NONE | RECOMMEND_LOW_RISK_KEEP | |
| UNREVIEWED | Kalima Ticket | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6704 | Event Ticket | +0/+0/+0 | Permanent, Qty=10 | 5 | 508 | 10 | NONE | RECOMMEND_LOW_RISK_KEEP | |
| UNREVIEWED | Guardian Angel | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6656 | Pet/Wing cosmetic | +0/+0/+0 | **604800s = 7 days**, Qty=0 (single grant) | 3 | 508 | 1 | RENTAL — see technical dive below | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Imp | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6657 | Pet/Wing cosmetic | +0/+0/+0 | 604800s = 7 days | 3 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Horn of Dinorant | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6659 | Mount cosmetic | +0/+0/+0 | 604800s = 7 days | 3 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Demon | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6720 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 6 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | Highest-priced 7-day rental (6) |
| UNREVIEWED | Spirit of Guardian | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6721 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 5 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Pet Rudolf | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6723 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 4 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Pet Panda | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6736 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 10 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | Tied highest price (10) |
| UNREVIEWED | Pet Unicorn | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6762 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 4 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | |
| UNREVIEWED | Pet Skeleton | NOT_AVAILABLE_BLOCKED_NO_CLIENT_ASSET_ACCESS | 6779 | Pet cosmetic | +0/+0/+0 | 604800s = 7 days | 10 | 508 | 1 | RENTAL | RECOMMEND_LOW_RISK_COSMETIC_REVIEW_RENTAL_MECHANIC | Tied highest price (10) |

Machine-readable CSV was not generated separately for this 12-row table (the table above is the complete, authoritative dataset; a CSV would add no information a spreadsheet couldn't get by copy-pasting this table).

**Confirms Phase 12's "Cash Shop Philosophy" precedent**: all 12 items are genuinely `+0/+0/+0` — zero excellent options, zero harmony, zero sockets, zero upgrade level. No equipment with combat stats appears in the CashShop at all; every item is either a consumable event-entry ticket or a cosmetic pet/wing/mount skin. This is the real, working counter-example to the X-Shop's all-max-power catalog — proof the same engine can run a compliant cosmetics-and-QoL-only shop.

**Currency caveat**: `CoinIndex=508` is not named anywhere in the config files this session can read. It is very unlikely to be Zen (which MU represents differently) and is presumably the CashShop's own internal points currency (commonly "Cash"/"WCoinC" in this shop-file family), but no source in this environment states its display name — reported as `UNKNOWN currency ID`, not guessed.

## Deep technical dive: the 8 real 7-day rental items

Bryan's evaluation of Lucky Set rental as a possible future feature depends on understanding exactly how this *existing, currently-active* 7-day rental mechanic works. Findings below are separated strictly into **CONFIRMED** (direct evidence from config + a live database row) and **UNKNOWN** (would require GameServer engine source or an in-game empirical test, neither available this session).

### CONFIRMED

1. **Duration is `604800` seconds = exactly 7×24×3600 = 7 days**, set per-product in `CashShopProduct.txt`'s `ItemDuration` column. All 8 rental items use the identical constant.
2. **The engine has a dedicated rental-tracking table, distinct from the shop catalog and from live inventory**: `CashShopPeriodicItem(ItemSerial INT, Time INT)` — a real table in the production `MuOnline` database, confirmed via `INFORMATION_SCHEMA.COLUMNS`. `ItemSerial` almost certainly references the granted item's unique serial number (every MU item instance carries one); `Time` is the per-item expiration value.
3. **`Time` is a Unix epoch timestamp, not a countdown, and not tied to online/offline session time.** The table currently holds exactly 1 real row: `Time = 1788136226`, which converts to **2026-08-31T00:30:26Z** — roughly 24 hours from the date this audit was run (2026-08-30). This is a live, currently-active rental about to expire naturally. An absolute epoch timestamp continues to elapse whether the owning account is online or offline — **the 7-day window is wall-clock/calendar time, not accumulated play time**. This was read as a bare, non-identifying `Time` integer only; no account or character identity was queried or is knowable from this table alone.
4. **`CashShopInventory` (the shop-delivery/ownership ledger, distinct from `warehouse`) is currently empty (0 rows)** — either deliveries for the currently-active rental bypassed this table entirely (e.g., item was granted directly into inventory/warehouse without leaving a ledger row), or this table serves a different purpose (e.g., pending/unclaimed gifts — it has `GiftName`/`GiftText` columns, suggesting a gifting feature) than persistent ownership tracking. Not resolved further — flagged as `UNKNOWN_PURPOSE_LOW_CONFIDENCE_GUESS: pending-gift mailbox` rather than asserted.
5. **`WriteCashShopLog = 1` and `CashShopSwitch = 1`** in `GameServerInfo - Common.dat` — the Cash Shop is genuinely live (not a disabled/dormant system like the VIP grant paths found in Phase 12), and purchases are logged server-side, which is a real existing audit trail for any future chargeback/dispute investigation (relevant to Part E).

### UNKNOWN (requires GameServer source or an in-game test — not fabricated)

6. **Storage/warehouse behavior during the rental window.** The `warehouse` table stores an entire account's warehouse contents as one opaque `varbinary` blob (`warehouse.Items`) — there is no per-item relational row to inspect, so whether a rental item continues counting down (or is even representable) while stored in the warehouse cannot be determined from the schema alone.
7. **Trade/resale behavior.** Whether a 7-day-rental item can be traded, sold on the marketplace, or dropped, and what happens to its `CashShopPeriodicItem` tracking row if it changes hands, is not discoverable from static config or schema — this is GameServer trade-handler logic this session has no source access to.
8. **Exact expiration action.** Whether the item is silently deleted from inventory, converted/downgraded, or merely flagged unusable once `Time` passes is not observable without either GameServer source or watching the one real active row (`ItemSerial` for the 2026-08-31 expiry) actually expire and inspecting the account's inventory before/after — out of scope and explicitly not attempted this phase (would require touching a real player's account state).
9. **Client-side representation.** How the remaining time is displayed to the player (a running countdown UI, a static "expires on" date, or nothing until it's gone) is a client-side concern this session's server-only access cannot observe.
10. **Restoration/recovery behavior** (e.g., if a GM needed to re-grant an expired rental, or extend one) — no admin tool or GameServer command for this was found in this session's config search; would need a dedicated audit of GM commands, not performed this phase.

### Lucky Set rental feasibility — evaluated, not assumed, not implemented

Given the above, reusing this exact mechanism for a future "Lucky Set rental" product is **technically plausible but not proven safe** without closing items 6–9 first:

- **In favor**: the mechanism is real, live, and already trusted in production for real purchases (not a stub). The `ItemSerial + epoch Time` pattern is simple enough to extend to a new item's serial number in principle.
- **Against/unknowns that block a go-ahead today**: Lucky Sets are full equipment sets with real combat stats (unlike the 12 CashShop items, which are all `+0/+0/+0` cosmetics) — if trade/warehouse behavior during the rental window has any gap (item 6/7 above), a rented Lucky Set could leak into permanent player possession via warehouse storage or a trade executed just before expiry, which is a materially different risk than a cosmetic pet doing the same. This is exactly the kind of gap that needs an in-game empirical test (rent a cosmetic item, put it in warehouse, wait past the 7-day mark, observe) before any real-money Lucky Set rental product is greenlit.
- **Verdict**: `FEASIBLE_PENDING_EMPIRICAL_VALIDATION` — not `NOT_FEASIBLE`, not `READY_TO_BUILD`. The blocker is genuinely "unknown GameServer behavior requiring live validation," one of the explicit categories this phase is allowed to defer on.
