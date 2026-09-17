---
status: ACTIVE
category: context-pack-domain
lastVerified: 2026-09-17
---

# Domain: Payments

**Authoritative docs** (read these, this file is only an index):
[`../../docs/payments/`](../../docs/payments/),
[`../../docs/decisions/0019-payment-operational-closure-phase-p.md`](../../docs/decisions/0019-payment-operational-closure-phase-p.md),
[`../../docs/decisions/0021-payment-restriction-and-transfer-policy.md`](../../docs/decisions/0021-payment-restriction-and-transfer-policy.md),
[`../../docs/handoff/mercadopago-recharge-payments.md`](../../docs/handoff/mercadopago-recharge-payments.md).

**One-paragraph orientation**: Mercado Pago is the real payment
provider. There are three parallel, correct pipelines (`RechargeIntent`
/ `PurchaseIntent` / `VipEntitlement`), not one generic `Order` model —
per `docs/README.md`'s Phase O narrative. Refund/reconciliation
adapters exist but are `SANDBOX_VALIDATION_REQUIRED` (never validated
against a real Mercado Pago sandbox as of the last narrative update this
pack read). Risk/chargeback control plane uses explicit, auditable
signals (`PaymentRiskSignal`/`PaymentRiskCase`) — never an opaque score.

**Related decisions**: ADR-0019, ADR-0021 (both present on `main`, see
[`../DECISIONS.md`](../DECISIONS.md)). ADR-0008/0018/0020/0022 are
referenced by `docs/README.md`'s narrative but not present as files on
this branch — see [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md)
OQ-CTX-001/003.

**Orchestration**: no Knowledge Hub task/decision for this domain has
been created or examined this session.
