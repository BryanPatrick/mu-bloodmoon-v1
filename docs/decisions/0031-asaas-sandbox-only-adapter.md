---
status: LOCAL_ONLY — NOT_DEPLOYED
category: decisions
audience: internal (engineering, product, security)
lastVerified: 2026-09-16
---

# ADR-0031: Asaas as a sandbox-only adapter to the existing recharge domain

## Context

The existing payment path already owns `RechargeIntent`,
`PaymentWebhookEvent`, `WalletLedgerService`, Payment Risk and Chargeback.
Introducing a generic Order/Payment/PaymentAttempt hierarchy would
duplicate financial authority. The existing Mercado Pago creation path
relies on provider-supported idempotent replay; Asaas documentation does
not establish the same guarantee for `externalReference`.

## Decision

- Keep the existing domain and add `AsaasPaymentProvider` for PIX only.
- Store a minimal encrypted BillingProfile and provider/environment-bound
  ProviderCustomer mapping. The Account document hash is not billing PII.
- Persist a durable creation reservation on `RechargeIntent` before
  contacting Asaas; reconcile ambiguous responses, never blindly POST
  again. Do not add a generic PaymentAttempt model.
- Reject Asaas recharge packages with bonus or a non-1:1 WCOIN price.
  The existing R$50/55 WC package remains untouched outside Asaas.
- Require authenticated webhook, persisted event ID, provider GET and
  exact customer/reference/amount checks before settlement. Only PIX
  `RECEIVED` can automatically credit WC; `CONFIRMED` cannot. Refund and
  chargeback go to existing review/risk paths without economic reversal.
- Keep Asaas disabled by default and impossible to point at production in
  this branch. No real provider calls or production migration in Phase 2.

## Consequences and open gates

The branch is a local implementation, not a sandbox-validated integration.
The migration and concurrent wallet guarantee require disposable-DB
verification; live Asaas validation requires separate authorization and
sandbox credentials. LGPD retention, correction, deletion and key rotation
also require review before a production rollout. A production conversion
cannot be a credential-only switch.

Technical details, tests and go-live checklist:
[`asaas-sandbox-phase2.md`](../payments/asaas-sandbox-phase2.md).

## Phase 6 evidence addendum (2026-09-17)

The sandbox-only architecture remains in force. Real Sandbox customer,
PIX, provider lookup, automatic webhook delivery and exactly-once WC
credit passed on an isolated local database. The provider's `deleted`
flag must be honored even when `status` remains `OVERDUE`; the adapter
was corrected and re-tested. See
[`asaas-sandbox-phase6.md`](../payments/asaas-sandbox-phase6.md).
This evidence permits a production-readiness review, not production
enablement; retention and operational deployment gates remain open.
