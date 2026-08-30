---
status: DRAFT
category: product/economy-audit
audience: internal (engineering + product)
lastVerified: 2026-08-29
evidenceMethod: direct read of apps/api/prisma/schema.prisma and apps/api/src/modules/marketplace/marketplace.service.ts on branch product/economy-phase-11 (based on origin/main @ 3adfd053). No production database queried, no real payment triggered.
---

# Payment, Marketplace & Chargeback Traceability Findings (Parts E/F/G)

Real evidence only — every claim below cites the exact model/field/code location it comes from. Nothing here is inferred from generic e-commerce or MU-server knowledge.

## Part E — payment provenance chain: what's real today

The order → payment → WC credit chain **does exist and is meaningfully traceable on the credit side**:

```
RechargeIntent (accountId, packageId, currency=WCOIN, amount, bonus, price, provider="mercadopago",
                correlationId, externalReference, paymentIdempotencyKey, externalOrderId,
                externalStatus, externalStatusDetail, paymentMethod, status)
      ↓ (relation)
PaymentWebhookEvent (provider, topic, eventId, externalOrderId, rechargeIntentId, signatureValid,
                      rawPayload, status, receivedAt, processedAt)
```

- **Payment provider**: real, confirmed — `mercadopago` (default value on `RechargeIntent.provider`).
- **Traceable fields**: `externalReference`, `paymentIdempotencyKey`, `externalOrderId`, `externalStatus`/`externalStatusDetail`, `paymentMethod`, `signatureValid` (webhook signature verification present), `lastWebhookAt`, `approvedAt`.
- **Refund tracking exists on the intent itself**: `RechargeIntentStatus` includes `REFUND_PENDING` and `REFUNDED`; `refundReason`, `refundedAt` fields are present.
- **Idempotency is already designed for**: `paymentIdempotencyKey` is a unique, dedicated field distinct from `correlationId` and `externalReference` (see the schema's own comment explaining why these three are kept separate rather than collapsed into one).

**Conclusion**: given a `RechargeIntent.id`, tracing back to the payment provider, method, approval time, and refund status is fully supported today.

## Part F — the gap: no traceability *forward* from credit to subsequent WC movement

`AccountCurrency` (`accountId`, `currency`, `balance: Int`) stores **only a current balance**. There is no ledger, transaction log, or history table anywhere in the schema for WC balance mutations. Confirmed by an exhaustive grep for `Ledger`/`Transaction`/`CurrencyLog`-shaped models — none exist.

Concretely, this means: **today, if payment X credits account A with 500 WC, and that WC is later spent, transferred, or resold, there is no way to reconstruct that chain from the database.** The only forward link that exists is via `PlayerMarketOrder`/`PurchaseIntent`/`StoreDelivery` records, which trace *specific store or marketplace purchases* (each has its own `correlationId`), but nothing connects "this 500 WC credit" to "this specific later spend" — balances are fungible and unlogged.

This is the real, concrete justification for the WC ledger design in `docs/product/wc-fee-model/DESIGN.md` — it is not a hypothetical gold-plating exercise, it is the only way to make the Part F chargeback scenario answerable at all.

## Part F — chargeback threat model, evaluated against what exists today

Scenario from the spec: Player A purchases 500 WC, spends/transfers with B/C, payment is later disputed.

| Question | Answerable today? | Evidence |
|---|---|---|
| Was there an original payment, and what account? | **Yes** | `RechargeIntent.accountId`, `provider`, `externalOrderId` |
| What amount was credited? | **Yes** | `RechargeIntent.amount` |
| When was it approved, and is there a refund/chargeback record? | **Yes** | `approvedAt`, `status` (`REFUND_PENDING`/`REFUNDED`), `refundedAt`, `refundReason` |
| What did the account do with the WC afterward (spent, transferred, to whom)? | **No** | No ledger exists (see above) |
| Who received downstream WC from account A? | **No**, except via `PlayerMarketOrder.buyerAccountId`/seller links **if** the specific transaction happened to be a marketplace sale — there is no general P2P transfer log because `PLAYER_DIRECT_WC_TRANSFER` isn't a built feature yet |

**Primary responsibility remaining with the payment-originating account** (per the decision) is achievable today for the *origination* side; enforcing it for *downstream* recipients is blocked entirely on the missing ledger.

## Part G — existing risk signals already available (not hypothetical — real fields)

Two real, already-populated data sources exist that a fraud-review process could correlate against a disputed `RechargeIntent`, without building anything new:

- **`AccountSession`**: `accountId`, `ipAddress`, `userAgent`, `createdAt`, `lastSeenAt`, `revokedAt`. Useful for the "new account" / "suspicious device relationship" risk signals named in Part F.
- **An existing audit-log-shaped model** (actor role, `ipAddress`, `userAgent`, `severity`, `result`, `correlationId`) — useful for correlating account actions around the time of a purchase.

**Not present today**: any dedicated fraud/chargeback flag field, any risk-scoring mechanism, any automated response (freeze, restriction) tied to payment disputes. `PurchaseIntentStatus`/`StoreDeliveryStatus` include `MANUAL_REVIEW` states, so a manual-review workflow shape already exists structurally for store purchases — the same pattern (a `MANUAL_REVIEW` status) could extend to `RechargeIntent`-driven fraud review, but this is a design note, not something already built (`RechargeIntentStatus` does include its own `MANUAL_REVIEW` value already, confirmed in the enum — so the state machine shape is already there for recharges specifically).

## Part G — possible antifraud responses, mapped to real states that already exist vs. would need building

| Response | Already representable today? |
|---|---|
| `ACCOUNT_REVIEW` | Partially — `RechargeIntentStatus.MANUAL_REVIEW` and `PurchaseIntentStatus`/`StoreDeliveryStatus.MANUAL_REVIEW` exist |
| `WC_TRANSFER_FREEZE` | No — no transfer-freeze flag exists on `Account`/`AccountCurrency` |
| `NEGATIVE_WC_BALANCE` | No — and the WC fee model design in this phase explicitly avoids ever creating one (see `wc-fee-accumulator.mjs`'s `settleAccumulator`) |
| `TEMPORARY_ACCOUNT_RESTRICTION` | Unconfirmed this phase — not searched exhaustively; likely exists in the accounts module for other purposes (e.g. bans) but not confirmed here to avoid overclaiming |
| `PERMANENT_BAN_FOR_CONFIRMED_FRAUD` | Same as above — not confirmed this phase |
| `PAYMENT_METHOD_RESTRICTION` | No — no such field found |
| `MANUAL_REVIEW` | Yes, per above |

No automatic/irreversible punishment logic was found or is proposed here — consistent with the decision not to design aggressive automatic responses this phase.
