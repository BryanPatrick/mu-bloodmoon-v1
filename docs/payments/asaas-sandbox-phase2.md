---
status: LOCAL_IMPLEMENTATION_ONLY — NO_PROVIDER_VALIDATION
category: payments
audience: internal (engineering, security, operations)
lastVerified: 2026-09-16
---

# Asaas sandbox — Phase 2 local implementation

Phase 3 follow-up (2026-09-16): the real-DB MySQL suite passed, but the clean
MariaDB migration chain is blocked by a historical launcher migration. See
[`asaas-sandbox-phase3.md`](asaas-sandbox-phase3.md); Phase 2's original
mock-only status below is retained as phase history.

This phase adds a **disabled-by-default, sandbox-only** Asaas adapter to the
existing financial domain. It neither replaces `RechargeIntent` with a new
Order/Payment model nor creates a second wallet or delivery pipeline. No real
Asaas request, sandbox charge, production migration, deploy, GameBridge write,
or refund was performed in this phase. The branch is not ready to enable
payments merely because its mocks pass.

## Domain and isolation

- `RechargeIntent` remains the order/payment aggregate for wallet recharge.
  `PurchaseIntent` and `StoreDelivery` remain the WC-funded store pipeline.
- `AsaasPaymentProvider` implements the existing `PaymentProvider` shape.
  The Mercado Pago binding is retained for legacy intents; Asaas intents are
  explicitly tagged `provider=asaas`, `providerEnvironment=sandbox`.
- `ASAAS_ENABLED` defaults false. When true, only `NODE_ENV=development/test`,
  `ASAAS_ENVIRONMENT=sandbox`, the exact
  `https://api-sandbox.asaas.com/v3` base URL, and a sandbox-prefixed API key
  are accepted. Any configured database URL must be loopback; development
  mode requires one.
  There is no production endpoint selection in this branch.
- The existing `REAL_MONEY_PAYMENTS_ENABLED` gate is not enabled by Asaas.
  Asaas checkout is separately sandbox-gated. When this local mode is on,
  starting a new Mercado Pago checkout is blocked. No production DB may
  be used with these local sandbox flags.
- `MERCADO_PAGO_PROVIDER_POLL_ENABLED` continues to select only Mercado Pago
  intents. Asaas provider polling is not enabled here.

## Billing data and LGPD

`BillingProfile` is one-to-one with Account and stores only country plus
AES-256-GCM ciphertext for legal name and CPF/CNPJ. It uses a separate
`BILLING_PII_KEY_B64` (32 raw bytes, base64) with Account ID as authenticated
additional data. `Account.personalIdHash` cannot supply the document to
Asaas; it is deliberately not reversed or used as an integration ID.

The authenticated `POST /recharge/billing-profile` accepts billing data in
the local sandbox API and returns only `{configured, country}`. Do not log,
telemetry-export, place in URL, or return the name/document. The Asaas
customer request omits e-mail and sets `notificationDisabled=true` so QA
does not send sandbox notifications to real people. QA should use only
approved test identities. Access to decrypted values is confined to
`BillingProfileService.ensureAsaasCustomer()`.

`ProviderCustomer` stores Account ID, provider, environment, stable
`bm-account:<accountId>` external reference, optional Asaas customer ID,
and a durable create state. Uniqueness prevents two local mappings for
one account/provider/environment. CPF and e-mail are not keys. A
timeout or lost response does not repeat customer POST: it reconciles
by external reference and fails closed if absent or ambiguous. The
provider itself allows duplicate customers, so local uniqueness alone
is not claimed as global provider idempotency.

Purpose: issuing a player-requested WC recharge. Final retention duration,
account-deletion treatment, data-subject access/correction and key rotation
need legal/security approval before production. This implementation does
not presume those decisions. The migration is local-only.

## PIX checkout and durable reservation

Only active `WCOIN` packages with **zero bonus**, unambiguous integer BRL
price (`10` or `10,00`, not the legacy-ambiguous `10.00`) and
`amount == BRL` can create an Asaas intent. The existing R$50 → 50 WC + 5
bonus seed remains unchanged for historical/other-provider compatibility;
it is explicitly rejected in the Asaas path. This is a configuration debt,
not an approved promotion.

Checkout reuses an existing customer or reserves customer creation before
POST. It reserves payment creation in `RechargeIntent` (`NONE` → `RESERVED`)
and persists `externalReference` **before** `POST /payments`. A simultaneous
click cannot issue a second POST. Asaas `externalReference` is a correlation
field, not an assumed unique/idempotency guarantee. If a response is lost,
the state becomes `RECONCILE_REQUIRED`; the next attempt searches Asaas by
external reference and **never blindly repeats POST**. A recent `RESERVED`
state means in-flight; a stale reservation is reconciled. Ambiguous
provider results require manual investigation.

The provider sends `billingType=PIX`, customer ID, exact integer-BRL
value and internal external reference. It reads the dynamic PIX QR through
`GET /payments/{id}/pixQrCode`. Boleto and card are intentionally absent.
The checkout response reuses the current QR fields, so this phase makes no
frontend redesign. A billing-profile collection UI and live sandbox UX
remain a subsequent checkpoint.

## Webhook and WC delivery

`POST /payments/webhooks/asaas` checks the independent
`asaas-access-token` secret in constant time before processing. The token
is **never persisted** in `PaymentWebhookEvent.signatureHeader`. Persisted
payload is a strict allowlist: event ID/type and payment ID. Unknown events
are marked ignored; known events are looked up directly with Asaas. The
webhook body's amount/status/customer are never used to authorize credit.

Before a `PAID` transition, the fetched payment must match provider
payment ID, Asaas customer mapping, internal external reference, PIX
method, exact BRL amount, WCOIN currency, and zero bonus. `CONFIRMED`
maps to `PROCESSING` because PIX may be held for review. Only
`RECEIVED` maps to `PAID`. `PENDING`/`OVERDUE` remain pending. Refund and
chargeback statuses go to `MANUAL_REVIEW` with no automatic clawback;
chargeback reasons feed the existing `ChargebackCase`/risk path.
Unknown statuses never credit. Late pending notifications never demote
`PAID` or a review state.

The existing `CommerceService.transitionRechargeStatus()` transaction
and `WalletLedgerService.credit()` use `recharge-credit:<intentId>` and
the unique ledger key. The sandbox Asaas path does not call GameBridge.
Admin manual status changes for Asaas are restricted to review, avoiding
an unverified manual `PAID` or refund clawback. No Asaas refund API is
called, enabled, or exposed.

## Local verification and remaining gates

Unit tests use a fake `fetch` and a mock transactional database. They
cover adapter/config, customer reuse and timeout, PIX creation and
reservation, webhook token, duplicate/concurrent/out-of-order events,
provider mismatches, retry, and WC credit count. They are **not** a
substitute for a disposable MySQL concurrency test or real Asaas sandbox
verification. There were no live provider calls in Phase 2.

Before credentials or go-live:

1. Review and apply the migration only in a disposable local database;
   verify the existing `externalOrderId` data has no uniqueness conflict.
2. Run the full payment regression, database-backed concurrency tests,
   and security review (including log/telemetry inspection).
3. Review legal basis, retention, correction/deletion, and key rotation
   for billing PII; approve the billing input UX.
4. Configure **sandbox-only** credentials outside Git, then separately
   authorize controlled real sandbox calls and webhook registration.
5. Empirically verify Asaas PIX status/webhook behavior, malformed and
   delayed notifications, provider timeouts, and reconciliation.
6. Resolve the existing bonus-package conflict; do not silently convert
   promotions into purchased WC.
7. Production requires a separate design, approval, configuration,
   migration/data review and rollout. Changing only an API key is not
   sufficient.

Official contracts consulted: [payment creation](https://docs.asaas.com/reference/create-new-payment),
[customer creation](https://docs.asaas.com/reference/create-new-customer),
[payment events](https://docs.asaas.com/docs/payment-events),
[webhook authentication](https://docs.asaas.com/docs/webhooks-3), and
[webhook idempotency](https://docs.asaas.com/docs/how-to-implement-idempotence-in-webhooks).
