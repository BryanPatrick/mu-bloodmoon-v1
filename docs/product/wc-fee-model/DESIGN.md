---
status: DESIGN_REFERENCE
category: product/economy
audience: internal (engineering + product)
lastVerified: 2026-08-29
implementedBy: docs/product/wc-fee-model/wc-fee-accumulator.mjs (reference implementation, NOT wired into apps/api this phase)
---

# WC P2P Fee Model — Design (Parts A–D)

This is a **design reference and local test suite**, not a production change. Nothing in `apps/api` or GameServer was modified this phase. `wc-fee-accumulator.mjs` is a pure, dependency-free module; `wc-fee-accumulator.test.mjs` runs 24 deterministic checks against it (`node docs/product/wc-fee-model/wc-fee-accumulator.test.mjs`), all passing.

## Why an accumulator is genuinely necessary (verified against real schema, not assumed)

`apps/api/prisma/schema.prisma`'s `AccountCurrency.balance` field is a plain `Int` — whole WC only, no fractional capacity. 10% of a 1 WC sale is 0.1 WC, which cannot be represented as a balance mutation on that column. This confirms the fixed-point accumulator pattern described in the phase spec is the right shape, not over-engineering.

**Key fact that resolves the apparent tension in the spec**: computing the *exact* 10% fee in subunits (1 WC = 10,000 subunits) never actually loses precision — `feeSubunits = grossWc * 10,000 * 10 / 100 = grossWc * 1,000`, which is always an exact integer for any whole-WC gross amount. There is no rounding decision anywhere in the fee *calculation*. The rounding problem is entirely about *when a real whole-WC balance deduction can be performed* against a column that only understands whole WC. That is what the accumulator defers and later settles.

## How it works

1. Every taxable P2P transaction: the buyer is debited the full gross amount immediately (matches the real, current `marketplace.service.ts` behavior — `debitCurrency(buyer, listing.price)` happens up front).
2. The seller is credited the full gross amount immediately too (can't fractionally withhold on a whole-WC balance).
3. The exact fee obligation (`grossWc * 1,000` subunits) is added to the seller's `feeAccumulatorSubunits`.
4. Immediately after, the system attempts to **settle** the accumulator: `collectibleWc = floor(accumulator / 10,000)`. If `collectibleWc > 0`, that many whole WC are deducted from the seller's *current* balance (never driving it negative — if the seller has already spent below the collectible amount, only what's available is collected and the shortfall stays in the accumulator for the next attempt) and subtracted from the accumulator.
5. For any transaction whose gross amount is itself a multiple of 10 WC (e.g. 20, 100, 250), the fee is already a whole number and settles in the *same* transaction — no waiting. This is why the worked example in the phase spec ("A pays B 100 WC → B nets 90 WC") holds exactly, and it generalizes correctly (verified by test: a 20 WC direct transfer nets 18 WC immediately, with zero accumulator remainder).
6. For sub-10-WC-fee amounts (e.g. a 1 WC sale, fee = 0.1 WC), the seller keeps the full gross now and the 0.1 WC obligation waits in the accumulator until enough small sales accrue to cross a whole WC — verified by test: ten 1 WC sales converge to exactly 1 WC collected, no drift.

## Accumulator scope — `UNDECIDED`, documented explicitly per the phase instruction

The reference implementation scopes the accumulator **per account**, and the fee obligation belongs to the **receiving account** (matches the spec's stated default expectation). This was not independently re-derived; it directly reflects the schema reality that `AccountCurrency` is already unique on `(accountId, currency)` with no separate "seller" or "wallet" identity — so per-account and per-seller are the same thing today. A per-wallet scope would only become a distinct question if a single account could hold multiple WC wallets, which is not the current architecture. Recorded in `ECONOMY_PRODUCT_DECISIONS.md`'s undecided list as item 10.

## Real-world discrepancy found during this audit (not invented — read directly from `marketplace.service.ts`)

The **currently live** marketplace fee logic is:

```ts
const fee = Math.floor(listing.price * (economy?.saleFeePercent || 0) / 100)
```

with `MarketplaceEconomyConfig.saleFeePercent` defaulting to **5**, not the newly-decided **10%**. Two concrete gaps versus the new policy, both confirmed by reading the code directly (`apps/api/src/modules/marketplace/marketplace.service.ts`, lines ~405–421, ~746–764):

1. **Rate**: 5% today vs. the authoritative 10% decision.
2. **Rounding**: `Math.floor(...)` on every single transaction, with the floored-away remainder simply discarded — this is *exactly* the "round every fee downward" failure mode the phase spec explicitly warns against ("would allow systematic tax avoidance"). Under the current code, a 1 WC sale at even 10% would floor to a 0 WC fee, permanently — no accumulator, no later collection. Small transactions are systematically undertaxed today.

This is a real, evidence-based finding, not a hypothetical: the WC ledger/accumulator redesign in this document is a genuine correction to code that already ships, not a speculative exercise.

## Existing infrastructure this design builds on (real, already in production)

- `PlayerMarketListing` / `PlayerMarketOrder` / `MarketplaceEscrow`: a real, already-built internal WC/GP/HP marketplace with escrow, a `fee` field, and a `sellerAmount` field on `PlayerMarketOrder`. This is the `PLAYER_MARKET_TRANSACTION` taxable type — it is **not** the prohibited "external RMT marketplace" (that decision is about trading for *real money*; this system trades in `CurrencyCode` — WCOIN/GOBLIN_POINT/HUNT_POINT — i.e. in-game currency only).
- `MarketplaceEconomyConfig.minimumPrice` already defaults to `1` — already compatible with the "player shop purchases below 20 WC must be allowed" decision, no change needed there.
- `RechargeIntent` + `PaymentWebhookEvent`: the real payment-provider (`mercadopago`) chain, with `externalReference`, `paymentIdempotencyKey`, `externalOrderId`, refund fields — see `payment-and-marketplace-findings.md` for the full Part E/F traceability analysis.
- **No `PLAYER_DIRECT_WC_TRANSFER` feature exists in the codebase today.** The 20 WC direct-transfer-minimum decision applies to a feature that has not been built yet, not an existing one — flagged so it isn't mistaken for an existing gap.
- **No currency ledger/transaction-log table exists.** `AccountCurrency` only stores a current balance, with no per-mutation history anywhere in the schema. This is the concrete gap Part D's ledger design (below) fills.

## Proposed ledger schema (design only — not applied to `schema.prisma`)

```
model WcLedgerEntry {
  id                          String   @id @default(uuid())
  idempotencyKey              String   @unique
  type                        String   // PLAYER_SHOP_PURCHASE | PLAYER_DIRECT_WC_TRANSFER | PLAYER_MARKET_TRANSACTION | OTHER_PLAYER_TO_PLAYER_WC_FLOW | SERVER_REWARD | BUG_HUNTER_REWARD | ADMIN_CORRECTION | WC_PURCHASE_CREDIT | PAYMENT_REFUND_ADJUSTMENT | SYSTEM_COMPENSATION
  fromAccountId                String?
  toAccountId                  String?
  grossAmountWc                 Int
  feeObligationSubunitsThisTx   Int      @default(0)
  feeAmountWholeWcCollected      Int      @default(0)
  feeAccumulatorSubunitsBefore  Int?
  feeAccumulatorSubunitsAfter   Int?
  netAmountWc                   Int
  paymentOriginRef              String?  // e.g. RechargeIntent.id, when traceable to a real-money credit
  status                         String   // SETTLED | REVERSED
  metadata                       Json?
  createdAt                      DateTime @default(now())

  @@index([fromAccountId, createdAt])
  @@index([toAccountId, createdAt])
  @@index([type, createdAt])
}
```

Plus a new field on `AccountCurrency` (or a sibling 1:1 model, to avoid touching the existing table): `feeAccumulatorSubunits Int @default(0)`.

## Not addressed by this reference implementation (explicitly out of scope this phase)

- Real Postgres transactional wrapping / row-locking for true concurrent-request safety — the existing `marketplace.service.ts` pattern (`prisma.$transaction`) is the right template to apply when this is actually implemented; this reference module is a pure function and doesn't model DB-level concurrency itself, only the arithmetic.
- What happens to `feeAccumulatorSubunits` debt on account deletion (relevant to the Beta account lifecycle decision) — genuinely undecided, needs a product call once Beta account deletion mechanics are themselves verified (see `ECONOMY_PRODUCT_DECISIONS.md` undecided item 9).
