---
status: ACTIVE — implemented, tested locally, live-verified in browser; not deployed
category: decisions
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code, 5 new/extended e2e tests across 2 suites, 65 total tests re-run clean, live browser verification against a running API+DB)
---

# ADR-0022: Phase Q Decision Closure — Market restriction audit, direct WC transfer UI, VIP active-tier policy

**DATE**: 2026-08-31 (Phase Q Decision Closure)
**STATUS**: ACTIVE, implemented and tested locally against a real database (including live browser verification); nothing deployed to production

## CONTEXT

This phase resolves four of the open questions Phase Q's own report
(ADR-0021) raised, via four new authoritative decisions from Bryan.
Explicitly scoped as a continuation, not a restart, of Phase Q — nothing
already-completed (restriction enforcement plumbing, the direct-transfer
backend, the VIP purchase page's base structure) was rebuilt.

## DECISION 1 — direct WC transfer minimum finalized at 20 WC

ADR-0011's 20 WC minimum (already implemented in Phase Q as
`DIRECT_TRANSFER_MIN_WC`) is now **final product policy**, not
provisional. Explicitly scoped to manual/direct P2P transfer only — does
NOT apply to Market listing prices, Player Shop prices, system credits,
payment delivery, admin corrections, refunds/reversals, Bug Hunter
rewards, or Beta reward delivery (a Market listing may legitimately cost
1, 2, or 5 WC). No code change was needed — `wallet-transfer.service.ts`
already scoped the constant correctly; this decision closes OQ-002.

## DECISION 2 — Direct WC Transfer Player UI (new, built this phase)

`apps/web/pages/painel/transferencias.vue` (new) + `useWalletTransferApi.ts`
(new) + two new read-only backend endpoints:

- `GET /wallet/transfers/fee-info` — `{ currency, taxPercent, minimumAmount }`,
  reading the same `MarketplaceEconomyConfig.wcoinTaxPercent` row
  `settleTaxedCredit()` itself reads (not the full admin-only
  `/admin/marketplace/economy` payload, which carries marketplace-only
  fields like `publicationFee` that are none of a transfer UI's
  business) — so the displayed pre-confirmation estimate can never drift
  from the real server-side rate.
- `GET /wallet/transfers/history` — pairs each transfer's two ledger rows
  (sender debit + recipient taxed credit, sharing one `sourceId`) into a
  single row from the caller's own point of view (`SENT`/`RECEIVED`,
  gross/fee/net, counterparty username resolved, ISO timestamp,
  `status: 'SETTLED'`). Reads only `WalletLedgerEntry` — never
  `PaymentRiskSignal`/`PaymentRiskCase`, so risk/security metadata can
  never leak into a player-facing response (verified by an exhaustive
  key-set assertion in `DIRECT_TRANSFER_HISTORY`).

The page shows: recipient username, amount, the 20 WC minimum, current
WCoin balance, a live pre-confirmation estimate in Bryan's own exact
format ("Transferir: 100 WC / Taxa economica: 10 WC / Destinatario
recebe: 90 WC"), an explicit safety notice distinguishing account
username from character name, a `window.confirm()` gate before sending,
and a sent/received history table. Recipient resolution reuses the
already-authoritative backend (`WalletTransferService.transfer()`'s own
`account.findUnique({ where: { username } })` + active-status check) —
no new client-side recipient-resolution logic was invented.

**Live-verified against a real running API + local database** (not just
compiled/rendered): a real transfer of 100 WC was sent through a direct
authenticated call exercising the exact same code path the UI's confirm
button calls, the balance updated from 5.000 to 4.900 WCoin on reload,
and the history table rendered exactly `ENVIADO / tp_guild_member / 100
/ 10 / 90`. The native `window.confirm()` dialog itself could not be
driven through this session's browser-automation tooling (dialogs are
auto-dismissed), so the click-through-to-network path specifically
relies on code review rather than a literal mouse-click observation —
everything else (rendering, fee estimate, balance display, history
display, both new endpoints) was exercised live.

## DECISION 3 — VIP active-tier change policy: same-tier extends, cross-tier blocks

Reverses Phase Q's own disclosed-as-undecided extend-in-place behavior
(days always stacked additively regardless of tier direction; `tier`
silently overwritten to the latest purchase) per Bryan's own economic-
harm example: 20 remaining Bronze days + a 30-day Gold purchase must
never silently become 50 Gold days.

**New conservative, explicitly temporary policy** (`vip.service.ts#purchase`):
- **SAME tier while active** → allowed, extends normally (unchanged
  behavior; `VIP_ACTIVE_EXTENSION_SAFE` in `vip-foundation.e2e-spec.ts`
  already covered this and continues to pass).
- **DIFFERENT tier while active** → blocked outright, before any debit
  or entitlement mutation (`current` entitlement is now fetched
  BEFORE the debit, not after, so the block is a true no-op — nothing
  charged, nothing changed). Throws `BadRequestException({ code:
  'VIP_TIER_CHANGE_BLOCKED', message: "Voce ja possui VIP {tier} ativo.
  Aguarde expirar para comprar um nivel diferente -- um sistema de
  troca/upgrade entre niveis ainda esta sendo desenhado." })`.

`painel/vip.vue` mirrors this exactly: while a tier is active, the OTHER
tiers' cards show a visible warning banner + disabled "Bloqueado"
buttons with an expiry-aware explanation; the active tier's own cards
stay enabled ("Comprar", i.e. renew/extend). **Live-verified**: after
purchasing Bronze 30 days for a real test account, Silver and Gold both
rendered "Bloqueado enquanto seu VIP Bronze estiver ativo (expira em
01/10/26...)" with disabled buttons, while Bronze's own 7/15/30-day
cards stayed purchasable.

A new, explicit open design question is created for the real future
work this conservative policy is standing in for —
`VIP_TIER_CHANGE_VALUE_CONVERSION` (OQ-026, replacing OQ-025): monetary-
value proration, day conversion, upgrade-only conversion, immediate
tier replacement with credit, or scheduled next-tier activation. None of
these are implemented — the block above is the entire current behavior.

## DECISION 4 — Market TRANSFER_RESTRICTION: a real, code-grounded audit, not a guess

Phase Q's own prior recommendation (block SELL/settlement, not BUY) is
**rejected and corrected** per Bryan's explicit instruction to verify
against the real economic flow rather than trust the earlier guess. Full
audit of `marketplace.service.ts`, action by action:

| Action | WC movement | Direction | Recommendation |
|---|---|---|---|
| A. Buy (`createOrder`) | Buyer's WC debited immediately, addressed at a specific seller via the listing | Buyer → Seller (P2P, outbound from buyer) | **BLOCK** |
| B. Sell (receiving side) | Seller credited on settlement | Inbound to seller | ALLOW |
| C. List (`createListing`) | Only a `STORE_PURCHASE` publication fee to the platform | Not P2P | ALLOW |
| D. Cancel listing | Zero WC movement | — | ALLOW |
| E. Settlement (`updateOrderStatus` → COMPLETED) | `settleTaxedCredit()` credits the seller for an ALREADY-paid order | Inbound to seller, fulfillment not dispersal | ALLOW |
| F. Refund/reversal (status REFUNDED) | Buyer credited back | Inbound to buyer | ALLOW |
| G. Market tax/sink | Platform fee, taken from A/E's flow | Not P2P | N/A (not a separate action) |

**Core Question, answered directly from code**: if Account A bought WC
with a potentially fraudulent payment and is `TRANSFER_RESTRICTED`, can
buying items in Market move A's WC to Player B? **YES** —
`createOrder()` debits the buyer's WC and addresses it at the specific
seller of the listing, exactly the "restricted account initiates
outbound P2P economic WC movement" pattern `TRANSFER_RESTRICTION` exists
to stop. Allowing Market BUY through would have undermined the
restriction entirely.

**Implemented**: `assertNoActiveTransferRestriction(user.id)` added to
the top of `createOrder()` only — `MarketplaceModule` now imports
`CommerceModule` for `PaymentRiskService` (no cycle: `CommerceModule`
never imports `MarketplaceModule` back, confirmed before wiring).
List/Cancel/Settlement/Sell/Refund are deliberately left unguarded —
matching the stated principle that `TRANSFER_RESTRICTION` stops
*initiating outbound* P2P movement, never receiving legitimate credit,
refunds, or fulfillment of an already-paid order.

Four separate recommendations, as requested (not one Market boolean):

- `MARKET_BUY_WHILE_TRANSFER_RESTRICTED` = **BLOCK** (implemented)
- `MARKET_SELL_WHILE_TRANSFER_RESTRICTED` = **ALLOW** (unguarded)
- `MARKET_LIST_WHILE_TRANSFER_RESTRICTED` = **ALLOW** (unguarded)
- `MARKET_SETTLEMENT_WHILE_TRANSFER_RESTRICTED` = **ALLOW** (unguarded)

This closes OQ-024 — the earlier recommendation is superseded, not
amended in place (see the strikethrough in `docs/open-questions.md`).

## PART 5 — 10% sink tax reconfirmed exact, not re-derived

The exact numeric example Bryan gave (100 WC transferred → 10 WC fee →
90 WC net, receiver bears the fee) is now covered by a dedicated test
(`DIRECT_TRANSFER_100_WC_RECEIVER_GETS_90`) asserting both the API
response (`feeCollected: 10`, `netAmount: 90`) and the real post-transfer
ledger balances (sender 900, recipient 90) — exact because 100 × 10% has
no fractional remainder on a single transaction. The fixed-point
accumulator's own exactness (many small transactions eventually
collecting exactly 1 WC, no floating-point drift) was already proven by
`WalletLedgerService`'s existing test suite before this phase and is
unrelated to the 20 WC direct-transfer minimum, which is a distinct,
unrelated business rule on top of the same taxed-credit mechanism.

## ALTERNATIVES CONSIDERED

- **Leaving Phase Q's SELL-not-BUY Market recommendation as-is**:
  rejected — it was never grounded in an actual read of
  `marketplace.service.ts`, and the real code shows the opposite
  conclusion. Bryan's own instruction explicitly demanded re-verification
  rather than trusting the earlier guess.
- **Blocking Settlement/Sell/Refund too, "to be safe"**: rejected — none
  of those move a restricted account's WC outbound to another player;
  over-blocking would strand legitimate transactions and contradicts the
  explicit "TRANSFER_RESTRICTION must not unnecessarily prevent
  receiving legitimate credit" principle.
- **Implementing one of the `VIP_TIER_CHANGE_VALUE_CONVERSION` proration
  models now**: rejected — Bryan's own instruction was explicit that
  none of these should be implemented yet; the conservative block is
  the entire scope of this phase's VIP policy work.
- **A client-side-only fee estimate (hardcoding 10%)**: rejected — the
  rate is admin-configurable (`MarketplaceEconomyConfig.wcoinTaxPercent`);
  a hardcoded duplicate could silently drift from the real value. A
  minimal, transfer-scoped `GET /wallet/transfers/fee-info` was added
  instead of reusing the admin-only economy endpoint (wrong permission
  scope) or exposing unrelated marketplace-only fields.

## CONSEQUENCES

- Direct WC transfer is now a complete, player-usable feature end to
  end (backend since Phase Q, UI since this phase) — closes OR-013.
- VIP purchases can no longer silently destroy or inflate a player's
  prepaid VIP value across a tier change — the conservative block is a
  real, tested, live-verified guard, at the cost of blocking a
  legitimate future "upgrade" use case until real proration design work
  happens (tracked as OQ-026).
- Market TRANSFER_RESTRICTION enforcement is now real, correct, and
  based on an actual code audit rather than an untested guess — closes
  OQ-024. A restricted account's WC can still be spent inbound
  (settlement, refunds) but never newly dispersed outbound via a fresh
  Market purchase.
- Remaining, unrelated gaps are unchanged by this phase: Mercado Pago
  sandbox validation (OQ-019/OQ-020/OQ-021), production
  `RechargePackage` read access (OQ-018), `PAYMENT_ACCOUNT_MISMATCH`
  (OQ-023).

## RELATED SYSTEMS

`apps/api/src/modules/wallet-transfer/wallet-transfer.service.ts`
(`listMyTransferHistory`, `getFeeInfo`),
`apps/api/src/modules/wallet-transfer/wallet-transfer.controller.ts`,
`apps/web/composables/useWalletTransferApi.ts` (new),
`apps/web/pages/painel/transferencias.vue` (new),
`apps/api/src/modules/vip/vip.service.ts` (`purchase()` restructured),
`apps/web/pages/painel/vip.vue` (cross-tier UI),
`apps/api/src/modules/marketplace/marketplace.module.ts` (`CommerceModule`
import), `apps/api/src/modules/marketplace/marketplace.service.ts`
(`createOrder()` guard), `apps/api/test/wallet-transfer.e2e-spec.ts`
(`DIRECT_TRANSFER_19_WC_REJECTED`, `DIRECT_TRANSFER_20_WC_ALLOWED`,
`DIRECT_TRANSFER_100_WC_RECEIVER_GETS_90`,
`DIRECT_TRANSFER_RESTRICTION_BLOCKS`, `DIRECT_TRANSFER_HISTORY`),
`apps/api/test/vip-purchase-matrix.e2e-spec.ts`
(`VIP_CROSS_TIER_PURCHASE_BLOCKED_BRONZE_TO_GOLD`,
`VIP_CROSS_TIER_PURCHASE_BLOCKED_GOLD_TO_BRONZE`),
`docs/decisions/0011-direct-wcoin-transfer-minimum.md`,
`docs/decisions/0021-payment-restriction-and-transfer-policy.md`.
