---
status: DRAFT_FOR_REVIEW
category: store
audience: internal (product + engineering)
lastVerified: 2026-09-02
---

# Blood Moon economic channel boundaries — Phase R

Bryan's Part 16 request: document the boundaries between the official
Store, X-Shop, CashShop, the player Marketplace, and direct WC transfer
— five economically distinct channels this project has sometimes
discussed loosely as if they were one thing. **Architecture mapping
only — no channel was modified, merged, or integrated this phase.**

## The five channels

| Channel | What it is | Where it lives | Currency | Real today? |
|---|---|---|---|---|
| **Official Store** | Blood Moon's own curated product catalog (VIP tiers, WCOIN recharge packages, future cosmetics) | `apps/api` (`ShopProduct`/`PurchaseIntent`/`RechargePackage`/`VipProductConfig`), Portal UI (`/loja`, `/painel/vip`, `/painel/admin/loja`) | Portal `WCOIN`/`GOBLIN_POINT`/`HUNT_POINT` (`AccountCurrency`) | **Yes** — the only channel with a full Order→Payment→Delivery pipeline, built across Phases O/P/Q of this project |
| **X-Shop** | A GameServer-side, all-`+13`/all-excellent gear catalog (168 items) | GameServer config file (`CustomXShop.txt`) + GameServer item grant (native, not observed this session) | `WCoinC`/`WCoinP`/`GoblinPoint` on `CashShopData` (CONFIRMED via `WZ_SetCoin`, see `docs/economy/xshop-commercial-review.md`) | Config is live-loaded; whether players can currently reach it in-game is **not observed** this session (no in-game access) |
| **CashShop** | A GameServer-side, `+0/+0/+0` cosmetics/consumables catalog (12 items) | GameServer config file (`CashShopProduct.txt`/`CashShopPackage.txt`) + GameServer SQL Server (`CashShopData`, `CashShopPeriodicItem`, `CashShopInventory`) | `CoinIndex=508`, uniform, target balance UNKNOWN (see `docs/economy/cashshop-commercial-review.md`) | **Confirmed live** (`CashShopSwitch=1`, `WriteCashShopLog=1`) |
| **Player Marketplace** | Player-to-player item listings and orders, official/sanctioned | `apps/api` (`marketplace` module — `PlayerMarketListing`/`PlayerMarketOrder`) | Portal `WCOIN` only, taxed via `settleTaxedCredit()` | **Yes** — real, tested, live since earlier phases |
| **Direct WC transfer** | Player-to-player WC gift, no item involved | `apps/api` (`wallet-transfer` module) | Portal `WCOIN` only, taxed the same way as Marketplace | **Yes** — built and given a player UI in Phase Q/Phase Q Decision Closure |

## Why these must never be conflated

1. **Different currencies, no proven exchange rate.** The GameServer's
   `WCoinC`/`WCoinP`/`GoblinPoint` (`CashShopData`) is a **separate
   ledger** from the Portal's `WCOIN`/`GOBLIN_POINT`/`HUNT_POINT`
   (`AccountCurrency`) — same-sounding names, no code anywhere reads or
   writes both, and no 1:1 (or any) conversion rate has ever been
   decided (`docs/economy/legacy-dmn-cms-and-currency-investigation.md`).
   Assuming "1 GameServer GoblinPoint = 1 Portal Goblin Point" would be
   an invented equivalence, not a confirmed fact.
2. **Different power philosophies, by design.** X-Shop (RED, almost
   entirely) and CashShop (GREEN/YELLOW) are the two ends of the same
   engine's capability — proof the engine *can* run either a P2W or a
   cosmetics-only catalog, not evidence that both are equally
   acceptable to expose. The Official Store's own commercial policy
   (this phase's own instruction) matches CashShop's philosophy, not
   X-Shop's.
3. **Different delivery guarantees.** Only the Official Store has the
   audited, idempotent, two-phase `GameBridgeJob` delivery pipeline
   (correlation IDs, retry, drift detection — Phase O/P work). X-Shop
   and CashShop deliver natively inside the GameServer process itself
   (not observed/auditable from the Portal side at all). Marketplace
   and direct transfer never touch the GameServer — they move WC
   entirely inside the Portal's own ledger.
4. **Different admin surfaces.** The Official Store, Marketplace, and
   direct transfer have full Portal admin UIs (`/painel/admin/loja`,
   `/painel/admin/marketplace`, `/painel/admin/financeiro`'s risk-case
   tooling). ~~X-Shop and CashShop are edited only by hand-editing
   GameServer config files — no Portal visibility, no audit trail on the
   Portal side for any X-Shop/CashShop purchase.~~ **Updated 2026-09-02
   (Phase S)**: X-Shop/CashShop now have real Portal *visibility* —
   `/painel/admin/catalogo-legado` shows every one of the 180 real
   rows with Bryan's commercial decision and a Portal-side "desired
   state" (`LegacyCatalogItem`, real audit trail via `AuditService`).
   The underlying GameServer config files themselves are still only
   editable by hand — this is a read/plan layer, not a write path (see
   `docs/decisions/0023-store-catalog-decision-closure.md`'s Part E/F).
   **Extended 2026-09-02 (Phase T)**: the same page now also shows a
   real *effective state* comparison (`effectiveEnabled`/`effectivePrice`/
   etc, read from a committed, hash-verified snapshot of the real config
   files — never a live GameServer connection) and computes real
   desired-vs-effective drift, plus bulk desired-state operations and a
   guarded `sync()` permission/flag boundary that always refuses (no
   command dispatch exists yet). Still not a write path — see
   `docs/decisions/0024-legacy-shop-control-plane.md`.

## What this means for future product decisions

- **X-Shop items are never automatically "the" commercial source of
  truth** for a future Portal cosmetics/gear feature — this is already
  ADR-0013's own conclusion, reaffirmed here. A future feature selling
  (say) a cosmetic wing must be built as a new Official Store product,
  independently reviewed for stat-neutrality, not as a thin wrapper
  around the existing X-Shop catalog.
- **CashShop's existing rental mechanism is a real, working reference**
  for a possible future Official Store "rental" product type (Part 14),
  but is not itself wired to the Portal today, and its warehouse/trade
  safety is still unproven (`docs/economy/cashshop-commercial-review.md`).
- **If a future Official Store product is ever priced in WC and
  delivered to the GameServer**, it goes through the existing, real
  `GameBridgeJob` pipeline and the Portal's own `AccountCurrency`
  ledger — never a new, separate, invisible currency balance on the
  GameServer side, even though the GameServer's own `CashShopData`
  table technically could support that pattern (Part 15's own "do not
  create a separate invisible WC economy" instruction).

## Related systems

`docs/economy/xshop-commercial-review.md`,
`docs/economy/cashshop-commercial-review.md`,
`docs/economy/legacy-dmn-cms-and-currency-investigation.md`,
`docs/store.md`, `docs/decisions/0012-cashshop-no-standard-gear-sales.md`,
`docs/decisions/0013-xshop-review-methodology.md`,
`docs/decisions/0023-store-catalog-decision-closure.md`,
`docs/decisions/0024-legacy-shop-control-plane.md`,
`docs/economy/xshop-cashshop-config-field-matrix.md`,
`apps/api/src/modules/marketplace/`, `apps/api/src/modules/wallet-transfer/`,
`apps/api/src/modules/commerce/`,
`apps/web/pages/painel/admin/catalogo-legado.vue`.
