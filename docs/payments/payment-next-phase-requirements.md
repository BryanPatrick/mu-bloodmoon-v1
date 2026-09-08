---
status: DRAFT_FOR_REVIEW
category: payments
audience: internal (product + engineering)
lastVerified: 2026-08-30
---

# Payment Next-Phase Requirements — Phase 14 Part E

Documentation only, per explicit instruction — no payment redesign this phase. This reviews what the real Order/Payment/Delivery machinery (`RechargeIntent`, `PaymentWebhookEvent`, `PurchaseIntent`, `StoreDelivery`) already provides, and states exactly what the new VIP/economy/account-deletion architecture built in Phases 13-14 will need from it going forward.

## What already exists and is real (not proposed)

- **`RechargeIntent`** — the WCoin top-up order record. Full lifecycle (`PREPARED → PENDING → PROCESSING → PAID/FAILED/CANCELLED`, plus `MANUAL_REVIEW`, `REFUND_PENDING`, `REFUNDED`). Deliberately separate `correlationId` / `externalReference` / `paymentIdempotencyKey` fields (a schema comment already documents why they must stay distinct rather than collapsed into one value).
- **`PaymentWebhookEvent`** — the MercadoPago webhook intake, decoupled from `RechargeIntent` processing.
- **`PurchaseIntent`** + **`StoreDelivery`** — the official non-P2P storefront's order/delivery pair. `StoreDeliveryTarget` now includes `VIP_ENTITLEMENT` (added Phase 13) alongside `ACCOUNT`/`CHARACTER`/`INVENTORY`/`VAULT`/`MAIL`.
- **`WalletLedgerService`** (Phase 13) — every currency mutation anywhere in the app, including every recharge/purchase credit and debit, now goes through one idempotent, audited, fixed-point-accurate path. This phase's VIP delivery worker and account-deletion service both route their currency-adjacent effects through it or its established patterns (idempotency keys, transactional atomicity).
- **`WriteCashShopLog = 1`** (confirmed in Phase 14 Part B) — the real GameServer CashShop already logs purchases server-side, a genuine existing audit trail on the GameServer side, separate from and complementary to the portal's own `WalletLedgerEntry`/`AuditEvent` records.

## What VIP (Phase 13-14) needs from payments, going forward

1. **A real settlement/reconciliation contract with MercadoPago for chargebacks**, specifically for VIP purchases. Today, `VipService.purchase()` debits WCoin balance atomically and irreversibly once the transaction commits — if the WCoin used to buy VIP was itself obtained via a since-charged-back `RechargeIntent`, there is no automatic linkage today between "this VIP grant was funded by fraudulent payment X" and any reversal action. This phase's `VipGrant` history (append-only, `sourceType`/`sourceId`) gives a real audit trail to investigate from, but no automatic reversal — consistent with Phase 13's explicit "chargeback traceability foundation without automatic punitive action" scope.
2. **A real GameBridge write path** (see `docs/vip/vip-product-readiness.md`) is the actual blocker for VIP being "live," not anything payment-shaped — noted here only so a future payments phase doesn't assume payments are the missing piece.
3. **Pricing decision** feeds directly into `VipProductConfig.price` — no payment-side work is needed to support whatever price Bryan picks; the debit path already handles arbitrary WCoin amounts.

## What account deletion (Phase 14 Part D) needs from payments, going forward

1. **Retention requirement, not yet decided**: `NORMAL_ACCOUNT_DELETION` explicitly preserves `RechargeIntent`/`PurchaseIntent` rows (never deletes payment history) — but for how long, and under what access control once the owning account is anonymized, is a `LEGAL_REVIEW_REQUIRED` question this phase flagged but did not answer (tax/accounting retention requirements typically outlive the "delete my account" request itself under most jurisdictions, but this needs actual legal confirmation for Brazil specifically).
2. **`PRE_BETA_PURGE`'s eligibility check already refuses to purge any account with a `PAID`/`REFUND_PENDING`/`REFUNDED` `RechargeIntent` or a `PAID`/`DELIVERING`/`COMPLETED`/`REFUND_PENDING`/`REFUNDED` `PurchaseIntent`** (real code, tested) — this is the payment system's actual current safety contribution to account deletion, not a future requirement; noted here so it isn't re-derived from scratch later.

## Order/Payment/Delivery contract the next payments phase should aim for

Not a redesign proposal — an observation of the shape that's already 80% there:

- **Order** (`RechargeIntent`/`PurchaseIntent`) → **Payment** (`PaymentWebhookEvent`, MercadoPago) → **Delivery** (`StoreDelivery`, or — new this session's family — a `GameBridgeJob`) is already the real shape in use. The gap is specifically in the *Delivery* stage for anything GameServer-bound: `StoreDelivery` processing is admin-manual (`store-admin.service.ts`, confirmed still true this phase), and `GameBridgeJob` rows (`GRANT_VIP` from Part C, `ANONYMIZE_GAME_ACCOUNT`/`PURGE_GAME_ACCOUNT` from Part D) now have real, tested queue/retry/reconciliation machinery on the apps/api side but **zero real consumers** on the GameServer side, for every operation type, not just the new ones.
- **The actual next-phase requirement, stated plainly**: a real GameBridge Agent — something that can safely, narrowly, and observably execute a small allowlist of pre-defined operations against the production MuOnline SQL Server (or via whatever safe RPC surface the GameServer engine exposes) — is now the single blocking dependency shared by VIP delivery, account anonymization/purge delivery, and (per the existing `game-provisioning-reconciliation` module, built in an earlier phase for a related but separate purpose) game account provisioning. This is infrastructure work, not a payments-phase task, but payments-adjacent phases should not assume it will already exist.

## Explicitly not redesigned this phase

Webhook signature verification, MercadoPago SDK usage, idempotency-key generation strategy, refund UI/flow, and the `RechargeIntentStatus`/`PurchaseIntentStatus` state machines themselves — all reviewed for context above, none modified.
