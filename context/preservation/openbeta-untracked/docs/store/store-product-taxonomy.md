---
status: DRAFT_FOR_REVIEW
category: store
audience: internal (product + engineering)
lastVerified: 2026-09-02
---

# Blood Moon future product taxonomy — Phase R

Bryan's Part 13-15 request: how an approved future catalog item (from
X-Shop review, CashShop review, or a brand-new idea) SHOULD connect to
the existing Portal architecture, plus a clean product taxonomy —
**mapping only, nothing implemented this phase**. X-Shop/CashShop are
explicitly not integrated now, and are not automatically the commercial
source of truth for anything (see `store-channel-boundaries.md`).

## How an approved item maps onto the real, existing architecture

The Official Store already has every piece this needs — nothing new
needs to be invented at the architecture level, only used correctly:

```
Product (ShopProduct / VipProductConfig / RechargePackage)
    -> PurchaseIntent (createPurchaseIntent, one Prisma transaction:
       reserve stock, debit AccountCurrency, create the paid order)
    -> Payment (WCOIN debit is itself the "payment" for a WC-priced
       product; a BRL-priced product goes through the separate
       RechargeIntent/Mercado Pago pipeline first to acquire WCOIN)
    -> Wallet/Ledger (WalletLedgerService -- debit/credit/settleTaxedCredit,
       the single source of truth for every Portal currency movement)
    -> Delivery (GameBridgeJob -> GameBridge Agent -> real GameServer
       write, idempotent, correlation-ID-traced, retryable)
    -> Ledger closure (audit event + observability event, same
       correlationId threading the whole chain)
```

**Nothing about this chain changes for an approved X-Shop or CashShop
item.** The GameServer-side config files (`CustomXShop.txt`,
`CashShopProduct.txt`) do not become part of this chain — they would, at
most, tell product/engineering exactly WHAT to define as a new
`ShopProduct`/similar row (name, base stats, whether it should have
sockets/excellent options at all) and what a GameBridge delivery command
for it would need to write. The legacy config files are reference
material for what the GameServer already knows how to grant, not a
runtime dependency of any future feature.

## Proposed future product types (Part 14)

Deliberately NOT built on the legacy GameServer category structure
(Sword/Axe/Scepter/... or CashShop's ItemIndex-keyed catalog) — those
are inventory/item-slot concepts, not commercial ones. A clean business
taxonomy:

| Type | Definition | Real precedent today | Candidate source |
|---|---|---|---|
| `COSMETIC` | Zero gameplay-stat impact, purely visual/vanity | CashShop's 12 items (all `+0/+0/+0`) | CashShop items (after the review's YELLOW items resolve their rental-safety question) |
| `CONVENIENCE` | Non-power quality-of-life (e.g. extra warehouse pages, reduced command cooldown) | VIP's own approved benefit set (`warehouseBonusPages`/`commandCostReductionPercent`) | Already live via VIP; a standalone (non-VIP-gated) convenience item is a real future option |
| `CONSUMABLE` | Single-use or stackable, no persistent equipment slot | CashShop's 3 event tickets | CashShop tickets, or a brand-new Portal-native consumable |
| `RENTAL` | Time-limited grant with a real, proven expiration mechanism | CashShop's 9 pet/wing/mount rentals (mechanism proven for cosmetics; NOT yet proven safe for anything with real stats — see `lucky-set-rental-empirical-test-plan.md`) | CashShop rentals once YELLOW resolves; a Lucky Set rental is explicitly `FEASIBLE_PENDING_EMPIRICAL_VALIDATION`, not ready |
| `VIP` | Recurring-tier subscription-like benefit bundle | Already fully live (`VipProductConfig`/`VipEntitlement`) | N/A — already a real product type, listed here only for taxonomy completeness |
| `WCOIN_RECHARGE` | Real-money → WCOIN conversion | Already fully live (`RechargePackage`/Mercado Pago) | N/A — already real |
| `ACCOUNT_SERVICE` | A service, not an item (e.g. a character rename, a stat reset) | Not built yet anywhere in this project | A genuinely new category — no current precedent in X-Shop, CashShop, or the Portal Store |

**Deliberately excluded from this taxonomy**: anything matching the
current commercial policy's RED criteria (endgame Excellent/Ancient/
Socket gear, endgame Wings, exclusive best-in-slot power). This
taxonomy describes what CAN be sold under current policy, not a
catalog of what X-Shop happens to contain today.

## The WCOIN purchase rule (Part 15)

**Any future Store item priced in WC must use the unified Portal/WCoin
ledger** (`AccountCurrency`/`WalletLedgerService`) — the same rule
already enforced for VIP, recharge, and Marketplace. **No architectural
conflict exists today** because nothing has been integrated yet; the
risk this section documents is a FUTURE one, not a current bug:

- The GameServer's own `CashShopData.WCoinC`/`WCoinP`/`GoblinPoint`
  balances are a **second, real, currently-live currency system** that
  the legacy X-Shop/CashShop already spend against natively, entirely
  outside the Portal.
- If a future feature naively tried to "let players buy X-Shop items
  through the Portal using their existing WCoinC balance," it would
  either (a) require reading/writing `CashShopData` directly from
  `apps/api` — a real GameServer-database write path this project has
  deliberately never built for anything except through the audited
  GameBridge pipeline (`docs/security/game-write-boundary.md`'s own
  "GameBridge is the only path" boundary) — or (b) silently create a
  parallel, unreconciled WC economy, which Part 15's own instruction
  explicitly forbids inventing.
- **The correct pattern, consistent with every real integration this
  project has built**: a future X-Shop/CashShop-sourced product is
  re-created as a genuine `ShopProduct` (or similar) row, priced and
  paid for entirely in the Portal's own `WCOIN`, delivered via
  `GameBridgeJob` like every other real delivery this project has ever
  shipped. The legacy GameServer catalog is never itself exposed to
  players, and the legacy `CashShopData` balances are never read from
  or written to by `apps/api`.

This phase does not solve anything here by rewriting GameServer config
or code — it only names the conflict so a future integration phase
starts from a correct premise instead of rediscovering it.

## Addendum — Phase S (2026-09-02): confirmed, not just proposed

`docs/decisions/0023-store-catalog-decision-closure.md` performed the
real architecture audit this document only proposed: `ShopProduct`
already has every field this taxonomy's target architecture needs (no
new schema was required for the Official Store itself), and the seven
Phase R/S commercial decisions are now persisted as real, tested code
(`LegacyCatalogItem`, `legacy-catalog-policy.ts`). The `category`
free-text convention proposed here is now the actual, documented
guidance for any real product creation going forward — still not a
database enum, per this document's own "do not overengineer" reasoning.

## Related systems

`docs/store/store-channel-boundaries.md`, `docs/store.md`,
`docs/payments/payment-readiness-contract.md`,
`docs/decisions/0023-store-catalog-decision-closure.md`,
`apps/api/src/modules/commerce/`, `apps/api/src/modules/vip/`,
`apps/api/src/modules/wallet/wallet-ledger.service.ts`,
`docs/security/game-write-boundary.md`.
