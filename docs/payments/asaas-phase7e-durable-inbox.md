---
status: LOCAL_ONLY_NOT_DEPLOYED
category: payments/operations
lastVerified: 2026-09-19
---

# Asaas Phase 7E — durable webhook inbox

This phase implements the Phase 7D-R decision locally. It does **not** authorize or perform a production migration, deploy, provider configuration, webhook registration, real payment or host restart. The host storage/artifact/POST/log review remains a separate gate. No production Asaas credential was used.

## Contract and flags

With `ASAAS_ENABLED` and `ASAAS_WEBHOOK_PROCESSING_ENABLED` both `true`, the HTTP route validates its token and bounded ASCII identifiers, inserts a minimal event into the existing `PaymentWebhookEvent` table (or verifies a matching already committed unique row), then returns HTTP **200**. A failed DB insert returns non-200. No provider lookup, wallet call, or business transition occurs on that HTTP path. Duplicate delivery cannot create a second `(provider, topic, eventId)` row. A reused event ID with a different payment ID is an integrity error, never a successful duplicate. The token is not stored. Only event ID, topic and payment ID are kept in the minimal JSON payload; no billing identity or full provider payload is retained.

When either flag is absent/false, the route returns **503** before persistence and the worker does not start/process; this is the deliberately safest inert-deploy behavior while **no production webhook is registered**. There is no separate receive flag. `ASAAS_PAYMENT_CREATION_ENABLED` and frontend flags remain independent and false by default. Mercado Pago's existing `recordAndClaim` path was not changed.

The new migration `20260919120000_asaas_durable_webhook_inbox` adds nullable processing owner/start/lease, attempt count (default zero), next attempt time, sanitized error code/time, and a short claim index; historical rows and the existing unique tuple remain intact. On the first disposable MySQL replay, the proposed index name exceeded MySQL's identifier limit. That **unsuccessful, never-finished** new migration was corrected before a clean 57/57 replay in a recreated disposable database; no previously applied migration was edited. It then applied 57/57 from zero on MariaDB too.

## Worker and recovery

`AsaasWebhookInboxWorker` is a bounded poller inside the API process, off by default. Its instance has a random opaque owner. Defaults: 10-second poll, batch 10, 120-second lease, maximum 8 processing attempts. Poll (1–300 seconds), batch (1–50), lease (30–300 seconds) and attempt limit (1–20) are configurable with bounded inputs. A candidate read does **not** confer ownership: an atomic conditional `updateMany` elects one owner for `RECEIVED`, due `RETRY`, or expired `PROCESSING`. Only a successful update increments the attempt count. A lease heartbeat renews while work is active; the worker checks ownership again after provider GET and before any financial transition. A crash leaves an expired lease reclaimable by a new process. Shutdown clears the timer, stops accepting new work, and awaits the active batch.

Provider/DB failures move a claimed event to `RETRY` with 30, 60, 120, 240, 480, then at most 900 seconds between attempts. At the attempt cap, the event enters `MANUAL_REVIEW` and creates a sanitized critical operational record. Known provider/payment-ID and unmatched-payment inconsistencies enter review directly; unknown topics become `IGNORED`. The worker never blindly credits from a webhook body: it performs Asaas GET and invokes the existing `reconcileAsaasOrder`/`transitionRechargeStatus` logic. An amount/customer/reference mismatch keeps the business `RechargeIntent` in its existing `MANUAL_REVIEW` state. The inbox lifecycle is separate from recharge creation's `RECONCILE_REQUIRED` state.

The wallet credit still uses `recharge-credit:<RechargeIntent.id>` and its unique ledger key inside the serializable recharge transaction. A crash after that transaction commits but before event completion can cause another provider GET, but must not cause another credit. Two workers can never both own the *same current lease*; an expired owner is prevented from beginning the financial transition after a different owner takes over. The event row remains as history even when processed or escalated. Retention duration is not decided in this phase.

The HTTP path logs only fixed codes plus bounded opaque event-record/event/payment IDs. The worker logs fixed outcome codes, record IDs, attempt counts and per-sweep counts (`claimed`, `retry`, `manualReview`, `reclaimed`, `processingError`), plus an operational event on manual review. It does not log tokens, API keys, CPF/CNPJ, legal names or raw billing payloads. Existing email and generic webhook alert channels remain disabled until separately configured; production delivery and approved threshold wiring are not claimed here. The approved finance primary/API operations fallback and proposed initial thresholds remain in Phase 7D-R.

## Local acceptance evidence and open gates

The real-DB Asaas suite exercises missing/wrong/valid token over Nest HTTP, DB-insert failure without ACK, durable ACK before provider/credit, duplicate ACK, provider timeout and retry, eight-attempt escalation, atomic two-worker claim, two independent workers, expired lease, post-credit crash, app restart, distinct IDs for one payment, mismatch review and the old checkout/billing cases. The first latency sample (12 synthetic new events) measured MySQL p50 8.4 ms, p95/max 13.4 ms, duplicate 14.4 ms; MariaDB p50 7.2 ms, p95/max 9.6 ms, duplicate 8.3 ms. These are **local** measurements, not cPanel latency or an SLA. After the lease-ownership check was added, both engines passed **24/24 Asaas tests** and **88/88** in the seven-suite financial/account/health regression group. API unit, compiled smoke and secret scan results are recorded in the final Phase 7E handoff.

The compiled API booted against the disposable MySQL database with payment flags off. Local `/api/health` and `/api/ready` returned 200; the disabled Asaas webhook returned 503. The actual HTTP enabled path and worker restart were exercised by the Nest real-DB E2E harness with synthetic provider responses, not a deployed cPanel process. Do not extrapolate local ACK latency to LiteSpeed or the Asaas network.

`LOCAL_WEBHOOK_ARCHITECTURE_READY=YES` after the final local rerun (19/19 unit suites, 132/132 tests; seven real-DB suites, 88/88 tests on each engine; compiled build and secret scan pass). `READY_FOR_DISABLED_PRODUCTION_DEPLOY_REVIEW=NO` regardless: fresh host quota/inodes, active artifact, ingress/body/header, log/retention and any compromised DB-credential dependency are still unresolved. No production credential is needed or requested for an inert deploy review. Public enablement also remains blocked by the retention decision and separate provider/financial authorization.
