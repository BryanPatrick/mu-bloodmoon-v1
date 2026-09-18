---
status: PARTIAL_LOCAL_ONLY
category: payments/operations
lastVerified: 2026-09-18
---

# Asaas Phase 7C — financial concurrency and host review

This phase changes **local code only**. It does not deploy, enable Asaas, register a webhook, use production provider credentials, or make a production financial write. Production was inspected read-only.

## Financial concurrency

The previous `WalletLedgerService.credit()` path read the unique ledger idempotency key and then performed Prisma `AccountCurrency.upsert()` with an atomic increment, followed by ledger insertion in the same transaction. It did **not** do a stale application-side balance calculation or a retry. On an isolated MariaDB 11.8.6 instance at `REPEATABLE-READ`, the existing two-writer test reproducibly failed at that upsert with SQL error 1020 (`Record has changed since last read`). One transaction aborted; the balance and ledger were rolled back together. MySQL 8.0.46 did not reproduce the error.

The fix obtains a transaction-scoped `SELECT ... FOR UPDATE` lock on the parent `Account` row **before** reading the ledger key. That row exists even if the wallet-currency row does not, so it serializes normal same-account credits without an in-process mutex. A stronger regression under the real `Serializable` recharge isolation showed that even this lock, and a trial native atomic SQL increment, can still encounter MariaDB 1020. Therefore the recharge transaction owner now retries the **entire aborted transaction** with a bounded backoff for the specific serialization/1020 condition; it never retries an individual balance statement. The unique `WalletLedgerEntry.idempotencyKey` remains the final exactly-once guard; balance mutation and ledger write still share one transaction. This classifies the observed failure as a MariaDB isolation interaction, not stale application-side balance math; the emitted SQL inside Prisma was not independently captured, so a narrower engine-specific cause is not claimed.

Regression: eight real synthetic `RechargeIntent` rows for one test account, each with a distinct key, produced eight ledger credits and the exact summed balance. Eight concurrent deliveries of one real synthetic intent returned the same ledger row and produced one credit. Both tests run under `Serializable`, like the production recharge transition. The previous two-writer test remains. After the final fix, the seven relevant E2E suites passed **79/79 on MariaDB 11.8.6 and 79/79 on MySQL 8.0.46**; each isolated database had **56/56** applied migrations. These suites include the Asaas, Mercado Pago, wallet, reconciliation, account-deletion and health regressions. The complete API unit suite passed **132/132**, including a loopback-only JSON alert POST/HTTP 200 delivery test. API typecheck/build and web typecheck/build passed. No provider calls or production recipients were used.

## Read-only production host evidence

- cPanel Node.js selector shows `api.mubloodmoon.com.br/` mapped to `/home/mubloodxz/bmapi`, production mode, running Node **20.19.3**, startup `server.js`. Web root is `/home/mubloodxz/bmweb`, production mode, running Node **22.17.0**. The API global prefix is `api`.
- The published compiled API modules under `bmapi/dist/apps/api/src/modules` have no `health` module. Public HTTPS GETs return 200 for `/api`, 404 for `/api/health` and `/api/ready`. This is direct evidence for `PRE_HEALTH_ROUTE_BUILD`, not only an inference from 404. The last deployment manifest records source `1c272db29152bf618815e448286565a0ae6caa52`; the exact live binary hash/commit was not recovered, so that commit remains *recorded*, not independently verified.
- `bmapi/stderr.log` exists (last visible modification 2026-09-15), but no proof of current stdout capture, retention, correlation, or future webhook event logging was obtained. The application emits fixed Asaas event codes, and `PaymentWebhookEvent`/`OperationalEvent` provide durable records when processing is enabled. The cPanel app screen showed environment values in clear text to the authorized operator; no values are retained in this document.
- Public HTTPS and Node app mapping are established. A production `POST` with a custom header/body was **not** sent, because no inert production webhook route currently exists and the host inspection was read-only. Consequently header preservation, JSON body limits, request latency/status, and restart persistence are unproven. The intended URL remains `https://api.mubloodmoon.com.br/api/payments/webhooks/asaas` with the existing `api` prefix; it is **not** a registered production webhook.

## ACK and observability gate

The current handler authenticates, persists/claims, calls the provider, reconciles, and may credit the wallet **before** returning 200. The provider client can wait up to 15 seconds, while the [current Asaas FAQ](https://docs.asaas.com/docs/faq-de-webhooks) and [timeout guide](https://docs.asaas.com/docs/erro-read-timed-out) require HTTP **200 within 10 seconds**; non-200 or timeout is retried and 15 consecutive failures can pause delivery. Asaas recommends persisting an event then ACKing before slower asynchronous business processing. Thus the existing synchronous path has a material, unmeasured ACK risk. Do not register a production webhook until a durable inbox/worker or measured equivalent meets the budget, with safe duplicate handling. Do not use an in-memory fire-and-forget ACK.

The existing alert channels are email (existing SMTP transport) and generic JSON webhook; both default off. A local loopback receiver confirmed actual POST delivery and 200 ACK without production delivery. No recipient/on-call route was configured or tested in production. Proposed owner for Bryan to approve: finance/on-call primary with an API operations backup. Proposed immediate alerts: any payment received but credit failed, exactly-once breach, or production provider auth failure. Proposed count/age thresholds for approval: provider 5xx >=5 in 5 minutes; invalid webhook auth >=5 in 5 minutes; `RECONCILE_REQUIRED` >=1 older than 15 minutes; `MANUAL_REVIEW` >=1 older than 30 minutes. These are proposals, **not** active configuration.

## Gates

`DEPLOY_DISABLED_BLOCKED_BY_RETENTION=NO`; `PUBLIC_ENABLEMENT_BLOCKED_BY_RETENTION_DECISION=YES`. The final strengthened concurrency rerun is green, but disabled deployment review remains **NO** until the exact production artifact/revision and host webhook/observability behavior are proven. Production credentials are not needed for the next separately authorized inert deployment step. No merge or push is part of this phase.

The isolated MySQL instance was stopped and its explicitly verified disposable directory `D:\MU\phase7b-mysql-5ffb4357725749df988827c2c72b77da` removed after checking that no test process was using it. The isolated MariaDB instance was stopped and its disposable directory removed. This cleanup did not remove production or historical data.
