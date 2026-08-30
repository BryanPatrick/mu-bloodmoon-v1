---
status: DRAFT
category: product/economy-audit
audience: internal (engineering + product)
lastVerified: 2026-08-29
evidenceMethod: direct read of apps/api/src/modules/marketplace/marketplace.service.ts, marketplace-admin.service.ts, marketplace.contract.ts, and apps/api/src/modules/commerce/commerce.service.ts (grepped for fee logic — none found there)
---

# Existing 5% Tax — Root Cause, Scope, and Safe Migration to 10% (Parts C/D/E)

## Part C — exact root cause

| Question | Answer |
|---|---|
| Config file | None — it's a database row, not a static config file. `MarketplaceEconomyConfig` (Postgres, via Prisma), single row with `id: "default"`, field `saleFeePercent Int @default(5)`. |
| Code path | `apps/api/src/modules/marketplace/marketplace.service.ts`, the buy-listing method, line ~407-408: `const fee = Math.floor(listing.price * Math.max(0, Math.min(100, economy?.saleFeePercent || 0)) / 100)` |
| System | The **internal player-to-player marketplace** (`PlayerMarketListing` + `PlayerMarketOrder` + `MarketplaceEscrow`) — this is website/apps-api, not GameServer. |
| Transaction type | Only `PLAYER_MARKET_TRANSACTION` in this phase's taxonomy — a buyer purchasing a listed item from a seller through the marketplace's escrow flow. |
| Payer | The buyer, debited the **full** `listing.price` up front (`debitCurrency(buyer, listing.price)`). |
| Receiver | The seller, credited `sellerAmount = listing.price - fee` on order completion (`creditCurrency(seller, order.sellerAmount)`) — **the seller bears the fee**, not the buyer. This matches the fee-obligation-belongs-to-the-receiver assumption already used in the Phase 11 WC fee model design. |
| Currency | **Applies uniformly to all three `CurrencyCode` values — WCOIN, GOBLIN_POINT, and HUNT_POINT.** The fee calculation has no currency-specific branch; `listing.currency` is passed straight through. This means the current 5% is **not WC-specific** the way the new 10% decision is. |
| When it applies | Only at the moment a `PlayerMarketOrder` transitions to a completed/delivered state (the fee is computed and stored on order creation, but the seller isn't credited `sellerAmount` until delivery completes). |
| Applies to WC? | **Yes** (along with GP and HP). |
| Applies to Player Shop purchases (`ShopProduct`/`PurchaseIntent`)? | **No** — confirmed by grep: `commerce.service.ts` (the direct storefront purchase flow) has zero fee-related code. |
| Applies to direct transfer? | **N/A** — `PLAYER_DIRECT_WC_TRANSFER` is not a built feature (confirmed Phase 11), so there's nothing for a fee to apply to yet. |
| Applies to Market? | **Yes** — this *is* the Market (`PlayerMarketOrder`). |
| Server-side or website-side? | Website-side (apps/api, Postgres) — not GameServer, not a `.dat`/`.txt` config file. |
| Configurable? | **Yes** — `marketplace-admin.service.ts` exposes an admin CRUD endpoint that can set `saleFeePercent` (clamped 0-100), `publicationFee`, and `vipDiscountPercent`. |
| Rounds? | `Math.floor(...)` on every transaction — the floored remainder is discarded, never collected (already flagged in Phase 11 as the exact under-taxation failure mode the new 10% policy warns against). |
| Logs transactions? | **Partially.** Each `PlayerMarketOrder` row does persist `fee`, `sellerAmount`, `price`, `currency`, and a `correlationId` — so marketplace sales specifically have *some* per-transaction fee record. This does **not** extend to any other WC movement (shop purchases, a future direct transfer, recharges) — there is still no general-purpose ledger across all transaction types, as found in Phase 11. |

## New finding this phase: a dead "VIP discount" field already exists in the fee config

`MarketplaceEconomyConfig.vipDiscountPercent` is a real field, settable via the same admin endpoint as `saleFeePercent` — but it is **never read anywhere in `marketplace.service.ts`**. It has no effect on the fee actually charged. This is relevant to Part F/G: it looks like VIP-aware fee discounting was planned or partially built, then abandoned before being wired up. Treat it as dead config, not a working VIP benefit, until/unless someone decides to actually implement it.

## Part D — double-tax risk matrix

| Transaction type | Current tax | Current rate | Proposed tax | Double-tax risk |
|---|---|---|---|---|
| `DIRECT_WC_TRANSFER` | None (feature doesn't exist) | N/A | 10% | **None** — nothing to double up on; this would be the first tax ever applied here |
| `PLAYER_SHOP_WC_PURCHASE` (`ShopProduct`/`PurchaseIntent`) | None (confirmed, no fee code) | N/A | 10% (per the decision — "internal shop purchases" are explicitly in scope) | **None** — currently untaxed |
| `MARKET_WC_PURCHASE` (`PlayerMarketOrder`) | **Yes, live today** | 5%, floor-rounded, applies to WCOIN/GOBLIN_POINT/HUNT_POINT alike | 10% (WC only, per decision wording) | **REAL RISK — this is the one row that actually collides.** If the new 10% model is added as a *second*, separate charge on top of the existing 5%, a WC marketplace sale would be taxed **15%** effectively, not 10%. If instead the existing `saleFeePercent` is simply changed from `5` to `10` for the WCOIN case, there's no double charge — but GP/HP marketplace sales would still be taxed at whatever `saleFeePercent` is set to (today 5%), since the new 10% decision is scoped to WC specifically and GP/HP were never part of it. **This needs an explicit choice, not an assumption**: does `saleFeePercent` become WC-only at 10% (requiring a currency-conditional rate), or does it apply uniformly (meaning GP/HP marketplace sales would also become 10%, which was never decided)? |
| `SERVER_REWARD` | None | N/A | None (per taxonomy — never taxed) | **None** |
| `WC_PURCHASE_CREDIT` (RechargeIntent) | None | N/A | None (per taxonomy — never taxed) | **None** |
| `ADMIN_ADJUSTMENT` | None | N/A | None (per taxonomy — never taxed) | **None** |

**Bottom line**: the double-tax risk is real but narrow and entirely contained to one place — `PlayerMarketOrder`'s WC-currency sales. Every other transaction type is currently untaxed, so introducing the 10% model there carries zero double-charge risk by construction.

## Part E — safe migration design (not implemented this phase)

**Target end state**: exactly one economic rule — 10% on every eligible P2P WC transaction, applied once, computed via the fixed-point accumulator design from Phase 11 (`docs/product/wc-fee-model/`).

**Migration steps, in order, each independently safe to pause on**:

1. **Make the fee currency-conditional, not just percentage-conditional.** `MarketplaceEconomyConfig.saleFeePercent` currently applies one rate to all three currencies uniformly. The migration needs either (a) a separate `wcoinSaleFeePercent` field distinct from a `GP/HP` rate (which can stay at whatever it's set to today, since only WC's rate was actually decided), or (b) an explicit product decision that GP/HP marketplace fees also become 10% (not currently decided — flagged in `QUESTIONS_FOR_BRYAN.md`, Phase 11, unresolved). **Do not silently apply 10% to GP/HP** without that decision being made — that would be inventing a policy, not migrating an existing one.
2. **Replace the fee *calculation*, don't stack it.** The migration changes `Math.floor(listing.price * saleFeePercent / 100)` to use the fixed-point accumulator's exact-fee-in-subunits calculation (`grossWc * 1,000` subunits) for the WC case specifically, settled against the seller's balance the same way `wc-fee-accumulator.mjs` demonstrates — this is a **replacement** of the existing calculation, never an addition on top of it. A code review checklist item: confirm the old `Math.floor(... saleFeePercent ...)` line for the WC branch is deleted, not left running alongside the new accumulator logic.
3. **No fee on rollback.** The existing code already has this property implicitly — `debitCurrency`/`creditCurrency` happen inside a Prisma `$transaction`, so a failed/cancelled order never reaches the fee-charging code path at all (this matches the accumulator reference implementation's own `NO_FEE_ON_ROLLED_BACK_TRANSACTION` invariant, already tested).
4. **No fee on server rewards or initial WC purchase credit.** Neither `SERVER_REWARD`-shaped mutations nor `RechargeIntent`-driven credits go through `PlayerMarketOrder` at all today, so this invariant holds by construction as long as the migration doesn't accidentally route those flows through the marketplace fee code.
5. **Sequencing recommendation** (marked as a recommendation, not a decision): fix the floor-down rounding bug and resolve the GP/HP rate question *before* changing 5%→10%, so there is only one migration event instead of two — going 5%(floor, all currencies) → 5%(exact, WC-only, GP/HP unchanged) → 10%(exact, WC-only) risks less confusion than jumping straight to the final state in one deploy.

**None of this was implemented this phase** — this is the design a future implementation phase should follow, per the explicit "Do NOT implement" instruction.
