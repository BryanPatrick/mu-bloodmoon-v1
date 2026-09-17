---
status: ACTIVE
category: payments
audience: internal (engineering)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code/schema inspection, file:line citations from direct reading and a dedicated background audit)
---

# Payment domain model — the real, existing lifecycle (audited, not invented)

Phase O's own instruction: "Audit current existing models before adding
new ones... Do not duplicate existing models unnecessarily... Produce one
canonical lifecycle." This document is that audit's result. **Blood
Moon does not have one generic `Order`/`Payment`/`Delivery` table set —
it has three parallel, purpose-specific intent+delivery pairs**, each
mature and independently correct for its own product family. This
document maps each onto the conceptual
`PRODUCT → ORDER → PAYMENT → DELIVERY → LEDGER → RECONCILIATION` pipeline
rather than proposing new schema to replace them.

## Why three pipelines, not one

| Product family | "Order" | "Payment" | "Delivery" |
|---|---|---|---|
| Currency recharge (WC/GP/HP) | `RechargeIntent` | *(same row — provider fields live on `RechargeIntent` itself)* | Inline — a local `WalletLedgerEntry` credit, same DB transaction as the PAID status write |
| Store items (X-Shop-adjacent `ShopProduct`, once approved — see ADR-0013) | `PurchaseIntent` | *(same row)* | `StoreDelivery` (separate table, async worker) |
| VIP entitlement | `VipEntitlement` (the desired-state row) + `VipGrant` (append-only history) | *(purchase itself credits/debits via `WalletLedgerService` inline, same as a recharge)* | `GameBridgeJob` (separate table, async worker — reaches the real GameServer via GameBridge) |

**Why this split is correct, not accidental duplication**: WC/GP/HP
delivery is a **local** operation (crediting `AccountCurrency`/
`WalletLedgerEntry` — the Portal's own database) — there is nothing to
retry against an external system, so doing it inline, in the same
transaction as the payment confirmation, is simpler and cannot leave a
"paid but not delivered" gap by construction. VIP and store-item delivery
can each involve **eventually-consistent, retryable work** (VIP must
reach the real GameServer via the GameBridge command channel; a store
item must reach a specific inventory/character/mail target) — both
genuinely need a separate, async, retryable delivery record, and both
have one. A single unified `Delivery` table spanning all three would
either force WC through unnecessary async machinery it doesn't need, or
force VIP/store-items into a synchronous model that can't safely retry
against a real external system — this project chose the correct shape
for each, not one compromise shape for all three.

## Currency recharge lifecycle (WC/GP/HP)

```
RechargePackage (admin-managed catalog, ADR-0008's 1:1-peg-for-WCOIN rule)
  → RechargeIntent (created PREPARED, player-initiated)
  → PaymentProvider.createOrder() (Mercado Pago)      [payments/mercadopago.provider.ts]
  → webhook (HMAC-verified, idempotent, amount-checked) [commerce.service.ts:handleMercadoPagoWebhook]
  → transitionRechargeStatus() -- one atomic transaction:
      RechargeIntent.status = PAID
      + WalletLedgerEntry (type=WC_PURCHASE_CREDIT, metadata={baseAmount,bonusAmount,grossPaidBRL,provider})
      + AccountCurrency.balance credited
  → (optional) admin refundRecharge() -- PAID/MANUAL_REVIEW -> REFUNDED, wallet clawed back
```

**Real models**: `RechargeIntent` (id/accountId/packageId/currency/
amount/bonus/price/status/provider/correlationId/externalReference/
paymentIdempotencyKey/externalOrderId/externalStatus/paymentMethod/
failureReason/manualReviewReason/refundReason/approvedAt/refundedAt),
`RechargePackage`, `WalletLedgerEntry`, `PaymentWebhookEvent`
(idempotent webhook dedup, `(provider,topic,eventId)` unique).

**Status model** (`RechargeIntentStatus`, real enum):
`PREPARED → PENDING/PROCESSING → PAID → REFUND_PENDING/REFUNDED/CANCELLED`,
with `MANUAL_REVIEW` and `FAILED` as real branch points (see the state
machine section below). `PAID → REFUND_PENDING` is the automatic
fallback when a refund's wallet clawback fails (insufficient balance —
the player already spent it) rather than silently losing the refund.

## Store item lifecycle (`ShopProduct`, once X-Shop items are approved)

```
ShopProduct/ShopProductVariant (admin catalog)
  → PurchaseIntent (PREPARED)
  → payment confirmation (PAID)
  → StoreDelivery row(s) created (WAITING, target=ACCOUNT/CHARACTER/INVENTORY/VAULT/MAIL)
  → async delivery worker -> PROCESSING -> COMPLETED/FAILED/REPROCESSING/MANUAL_REVIEW
  → PurchaseIntent.status -> COMPLETED (once all deliveries succeed)
  → (optional) admin orderAction('refund') -- wallet credited back, stock restored, deliveries marked REFUNDED
```

**Real models**: `PurchaseIntent` (with `termsVersion`/`termsAcceptedAt`
— checkout terms acceptance is recorded, not just a checkbox),
`StoreDelivery` (attempts/maxAttempts/lastError/assignedTo/
reprocessedBy — real admin-assignable retry tracking), `StoreOrderNote`
(admin case notes with evidence), `StoreProductTest` (a real sandboxed
test-purchase mechanism, separate concern).

**Status model** (`PurchaseIntentStatus`):
`PREPARED → PENDING_PAYMENT → PAID → DELIVERING → COMPLETED`, with
`MANUAL_REVIEW`/`REFUND_PENDING`/`REFUNDED`/`FAILED`/`CANCELLED` as
branches. `StoreDeliveryStatus` is its own, separate enum
(`WAITING → PROCESSING → COMPLETED/FAILED/REPROCESSING/MANUAL_REVIEW/REFUNDED`)
— a purchase's overall status and each of its individual deliveries'
statuses are tracked independently, since one purchase can contain
multiple delivery targets.

**A reserved-but-unwired detail worth documenting explicitly**:
`StoreDeliveryTarget` includes a `VIP_ENTITLEMENT` value, with a real
comment explaining intent ("a VIP purchase delivers a time-based
entitlement... not an item"). **Nothing in the current codebase ever
sets this value** (confirmed via exhaustive grep) — VIP purchases today
exclusively use the separate, dedicated pipeline below. This is a
forward-looking schema reservation, not a second live VIP path — do not
assume it's wired up without re-verifying.

## VIP entitlement lifecycle

```
VipProductConfig (admin catalog, ADR-0011's 1:1-derived price table, seeded enabled:false)
  → vip.service.ts purchase flow: WalletLedgerService debit (spend WC/GP/HP)
  → VipEntitlement upserted (ACTIVE, extend-in-place) + VipGrant (append-only history row)
  → GameBridgeJob created (operation=GRANT_VIP, PENDING)
  → VipDeliveryService worker (atomic claim, backoff, MAX_ATTEMPTS=8, stale-recovery)
  → GameBridgeVipGateway.deliver() -- PHASE O (2026-08-31), real implementation:
      submit GRANT_VIP via GameCommandTransportClient -> Cloudflare Worker -> GameBridge Agent
      -> dbo.bm_GrantVip (EXECUTE-only, ADR-0002) -> MEMB_INFO.AccountLevel + AccountExpireDate
      poll the same commandId on retry (never resubmit while one is still in flight)
  → GameBridgeJob.status = COMPLETED (or FAILED after MAX_ATTEMPTS, always visible to admins)
  → VipDeliveryService.reconcileEntitlements() -- drift detection, ACTIVE entitlement vs. bridge job state
  → separately, vip-sync.service.ts's own 60s reconciler keeps AccountLevel/AccountExpireDate in
    sync with VipEntitlement going forward (SYNC_VIP_TIER), independent of the original grant's
    own delivery -- see ADR-0001/ADR-0002 for the full drift-detection design
```

**Real models**: `VipProductConfig`, `VipEntitlement` (current state,
extend-in-place), `VipGrant` (append-only), `GameBridgeJob`
(operation-tagged, reused for GRANT_VIP specifically — see
`docs/gamebridge/` for its role in `CREATE_GAME_ACCOUNT` too),
`VipSyncState` (the ongoing reconciler's own tracking, including Phase M's
`driftCount`/`lastDriftAt`).

**Status model** (`VipEntitlementStatus`): `INACTIVE → ACTIVE → EXPIRED`.
`GameBridgeJob.status`: `PENDING → PROCESSING → COMPLETED/FAILED`, with
crash-safe stale-PROCESSING recovery.

**What's genuinely new this phase (2026-08-31)**: before this phase,
`VipDeliveryService`'s only gateway implementation was
`UnconfiguredVipGameBridgeGateway`, which always honestly reported
"not configured" — the entire claim/backoff/retry/reconciliation worker
was fully built and tested, but had no real GameServer connection behind
it. `GameBridgeVipGateway` (`apps/api/src/modules/vip/game-bridge-vip.gateway.ts`)
is the real implementation, using the exact least-privilege GameBridge
command channel built and tested in Phase L/M. See ADR-0018.

## The ledger (shared by all three pipelines)

`WalletLedgerEntry` is the single place every `AccountCurrency` balance
mutation happens, across all three pipelines above — recharges, store
purchases, and VIP purchases (spend side) all go through
`WalletLedgerService.credit()`/`debit()`/`settleTaxedCredit()`, never a
raw balance update anywhere else in the codebase.

Fields directly relevant to payment provenance and chargeback
traceability (all real, pre-existing before this phase except where
noted): `idempotencyKey` (unique — no duplicate fee/credit possible even
under a retry), `sourceType`/`sourceId` (e.g. `RechargeIntent`, the id),
`paymentProvenanceRef` ("the Part E/F chargeback-traceability link,"
already documented in the schema's own comment before this phase),
`counterpartyAccountId` (who paid/was paid, populated by
`settleTaxedCredit()` specifically — P2P transfers and market sales),
`metadata` (PHASE O, 2026-08-31: WC purchase credits now explicitly
record `{baseAmount, bonusAmount, grossPaidBRL, provider}` — see
ADR-0018).

## Reconciliation — what exists, what this phase added

| Reconciliation | Before this phase | Phase O (2026-08-31) |
|---|---|---|
| VIP entitlement vs. GameBridge delivery | `VipDeliveryService.reconcileEntitlements()` — real, already existed | Unchanged |
| Recharge vs. Mercado Pago provider | Manual admin-triggered only (`resyncRechargeFromProvider`, "Ressincronizar" button) | Unchanged (still manual by design — see ADR-0018 for why a scheduled version doesn't call the provider) |
| PAID recharge vs. ledger credit consistency | **Did not exist** | `PaymentReconciliationService` (new) — scheduled, local-only DB check |
| Recharge stuck in a non-terminal status | **Did not exist** | Same service — flags recharges PENDING/PROCESSING/MANUAL_REVIEW for over an hour |
| Chargeback dispersal tracing | **Did not exist** | `WalletLedgerService.traceChargebackDispersal()` (new) |

See ADR-0018 for the full design rationale of everything added this
phase.

## Related

`docs/payments/payment-readiness-contract.md` (Phase N's handoff this
phase consumed), `docs/decisions/0018-payment-architecture-phase-o.md`
(this phase's ADR), `docs/vip/wz-setaccountlevel-coexistence.md`,
`docs/decisions/0001-vip-source-of-truth.md`,
`docs/decisions/0002-gamebridge-least-privilege-and-sql-audit.md`.
