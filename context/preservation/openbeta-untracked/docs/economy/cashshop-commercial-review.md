---
status: DRAFT_FOR_REVIEW
category: economy/cashshop
audience: internal (product review session prep)
lastVerified: 2026-09-02
---

# CashShop Commercial Review — Phase R

Fresh re-verification (2026-09-02) of Phase 14's CashShop findings,
against freshly re-downloaded source files (`CashShopProduct.txt`,
`CashShopPackage.txt`), per this phase's own "re-read the real source,
do not rely only on the previous report" instruction. See
[`cashshop-full-inventory.md`](cashshop-full-inventory.md) for the
original Phase 14 technical dive (rental mechanism, `CashShopPeriodicItem`,
warehouse/trade unknowns) — unchanged and still authoritative on those
points; this document adds the fresh re-verification, the corrected
rental count, and the commercial classification Phase 14 did not attempt.

## Correction: the real count is 9 rentals + 3 tickets, not 8 + 4

Bryan's own phase instruction stated "8 wing/pet entries are real 7-day
rentals" and asked to "determine whether the remaining 4 are: permanent
/ consumable / rental / or other." **A fresh re-download of
`CashShopProduct.txt` this session shows this is not quite right**: all
12 products, freshly counted from the real `ItemDuration` column:

- **3 non-rental items** (`ItemDuration=0`, `ItemQuantity=10`): Blood
  Castle Ticket, Devil Square Ticket, Kalima Ticket — permanent,
  stackable, consumable event-entry tickets.
- **9 rental items** (`ItemDuration=604800` = exactly 7×24×3600 seconds
  = 7 days, `ItemQuantity=0`, single grant): Guardian Angel, Imp, Horn
  of Dinorant, Demon, Spirit of Guardian, Pet Rudolf, Pet Panda, Pet
  Unicorn, Pet Skeleton.

9 + 3 = 12, matching the confirmed total. This is not a large
correction in substance (the underlying conclusion — "all 12 are
`+0/+0/+0`, no combat power" — is unchanged and re-confirmed), but it is
a real factual correction to the specific 8/4 split, made because this
phase's own instruction required re-verification rather than trusting
either the prior report or the phase instruction's own assumed number
at face value. Investigated, not silently picked one side, per this
project's standing documentation-conflict rule.

## Re-confirmed: all 12 items are genuinely `+0/+0/+0`

Every product row's option/set/harmony/socket columns read `0` across
the board in the freshly re-downloaded file — matching Phase 14's
finding exactly. `ADR-0012`'s "no equipment with combat stats appears in
the CashShop at all" stance holds, re-verified.

## CoinIndex — confirmed uniform, still unresolved by name (Part 9)

Every one of the 12 products carries the identical `CoinIndex=508` in
`CashShopPackage.txt`, confirmed fresh this session. An exhaustive
server-side search (`Select-String` across the entirety of
`C:\MuServer\Data`, `C:\MuServer\GameServer\DATA`, and
`C:\MuServer\GameServerCS\DATA` — every root this session's RemoteOps
access permits) for the literal value `508` found **no naming/definition
source anywhere** — only coincidental unrelated matches (a monster ID,
a skill ID, message-file line numbers). This matches and extends
[`legacy-dmn-cms-and-currency-investigation.md`](legacy-dmn-cms-and-currency-investigation.md)'s
prior SQL-side search (which also found no `id=508` row in any table).

**New this phase**: the real `WZ_SetCoin` stored procedure source
(queried directly from the local, schema-verified GameServer database
lab) shows it takes three POSITIONAL integer parameters
(`@Value1`/`@Value2`/`@Value3`, writing `CashShopData.WCoinC`/`WCoinP`/
`GoblinPoint` respectively) — **not** a `CoinIndex` argument at all.
Since `CoinIndex=508` is identical across every product regardless of
price or item type, it behaves structurally like a fixed "currency
type = CashShop points" tag, not a per-product selector switching
between different currencies (unlike X-Shop's `Coin0`/`Coin1`/`Coin2`,
which genuinely vary per row — see `xshop-commercial-review.md`).

**Classification: `CONFIRMED`** that `CoinIndex=508` is a real, uniform
field in the CashShop's own catalog config. **`UNKNOWN`** what
underlying balance/table it selects at actual purchase time — it is NOT
proven to be the same `CashShopData.WCoinC`/`WCoinP`/`GoblinPoint`
system `WZ_SetCoin` governs (that procedure has no `CoinIndex`-shaped
parameter at all), so the CashShop's own purchase-currency deduction
most plausibly uses a separate mechanism this session's accessible
config/schema does not name. **Not a guess presented as fact** — this
is the honest limit of what config-file and schema evidence alone can
show without GameServer client/server binary source.

## Commercial classification (Part 3, applied to the corrected 12-item split)

| Item | Classification | Reason |
|---|---|---|
| Blood Castle Ticket, Devil Square Ticket, Kalima Ticket (3) | `GREEN_CANDIDATE` | Pure consumable event-entry item, zero combat stats, no rental-mechanism dependency (permanent stack, not time-limited) — matches "cosmetics/convenience" policy directly. |
| Guardian Angel, Imp, Horn of Dinorant, Demon, Spirit of Guardian, Pet Rudolf, Pet Panda, Pet Unicorn, Pet Skeleton (9) | `YELLOW_REQUIRES_DECISION` | Zero combat power (confirmed `+0/+0/+0`), genuinely cosmetic — but the underlying 7-day rental *mechanism's* safety across warehouse storage and trade is still `UNKNOWN` (see [`cashshop-full-inventory.md`](cashshop-full-inventory.md)'s technical dive and [`lucky-set-rental-empirical-test-plan.md`](lucky-set-rental-empirical-test-plan.md), neither closed this session — no in-game/GM access available). A "temporary rental" that can silently become permanent via an unclosed gap would violate the "temporary, not permanent" framing Bryan wants strictly enforced, so these are held at YELLOW rather than an unconditional GREEN until the empirical test plan runs or Bryan explicitly accepts the residual risk. |

**CashShop totals**: `GREEN_CANDIDATE` = 3, `YELLOW_REQUIRES_DECISION` =
9, `RED_INCOMPATIBLE_WITH_CURRENT_POLICY` = 0, `UNKNOWN_DATA_GAP` = 0.
See [`cashshop-bryan-decision-table.md`](cashshop-bryan-decision-table.md)
for the full 12-row table, `BRYAN_DECISION = PENDING` on every row.

## X-Shop vs. CashShop — functional differences (Part 7)

Both are, in fact, **GameServer-side systems** — neither has any
Portal (`apps/api`/`apps/web`) implementation today. This corrects a
loose framing in `ADR-0012` (which calls CashShop "the Portal/official
monetized shop") — that characterization describes CashShop's *intended
commercial role* relative to X-Shop's all-power catalog, not its actual
system location. The real Portal-side official Store (`ShopProduct`/
`PurchaseIntent`, `docs/store.md`, live since Phase O/P/Q of this
project's own payment work) is a **third, separate system** from both.

| | X-Shop | CashShop | Portal Store |
|---|---|---|---|
| Configured in | `C:\MuServer\Data\Custom\CustomXShop.txt` (GameServer file) | `C:\MuServer\Data\CashShop\CashShopProduct.txt`/`CashShopPackage.txt` (GameServer file) + `CashShopData`/`CashShopPeriodicItem`/`CashShopInventory` (GameServer SQL Server) | `apps/api` Prisma/MySQL (`ShopProduct`, `PurchaseIntent`) |
| Charges | `Coin0`/`Coin1`/`Coin2` = `WCoinC`/`WCoinP`/`GoblinPoint` (CONFIRMED this phase via `WZ_SetCoin` source) | `CoinIndex=508`, uniform, UNKNOWN target balance (see above) | Portal `WCOIN`/`GOBLIN_POINT`/`HUNT_POINT` (`AccountCurrency`, `WalletLedgerService`) — a fully separate ledger from either GameServer system |
| Delivery | Presumably direct in-game grant on purchase (GameServer-native, not observed this session — no in-game access) | Same, plus a confirmed rental-tracking layer (`CashShopPeriodicItem`) for the 9 time-limited items | `GameBridgeJob` → GameBridge Agent → real GameServer write, fully audited, two-phase (Phase O/P architecture) |
| Expiration support | None observed (all-permanent except Swords' 60-day duration, itself not proven to auto-expire via any tracked mechanism this session found) | Yes, real and confirmed (`CashShopPeriodicItem`, epoch timestamp) | Not yet used for any time-limited product (VIP entitlements use their own `expiresAt` field on `VipEntitlement`, a Portal-side concept, not a GameServer rental mechanism) |
| Admin management (Portal UI) | None | None | Yes — `/painel/admin/loja` (Part 13's `docs/store.md`) |
| Player purchase UI (Portal) | None | None | Yes — `/loja` |
| Currently active/usable by players | Unknown whether players can currently reach the X-Shop NPC/menu in-game — not observed this session (no in-game access); the config is live-loaded server data, not a dormant/disabled feature by any evidence found | **Confirmed live**: `WriteCashShopLog=1`, `CashShopSwitch=1` (`GameServerInfo - Common.dat`, re-confirmed reachable this phase) | Confirmed live (real Portal purchases exist, `apps/api` payment test suite) |
| Legacy/dormant/current | Current, live GameServer config (not legacy) | Current, live GameServer config (not legacy) | Current, actively developed (this is the system this project's own Payment phases P/Q built) |

**The key functional distinction is not "which is more official"** — both
are equally real, live GameServer systems — **it is what each one
sells**: X-Shop is a uniform, all-`+13`/all-excellent gear catalog
(commercially RED almost everywhere, per `xshop-commercial-review.md`);
CashShop is a genuinely `+0/+0/+0` cosmetics/consumables catalog
(commercially GREEN/YELLOW). Neither is currently wired to the Portal's
own currency ledger or purchase UI in any way.
