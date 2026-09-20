---
status: LOCAL_ONLY_NOT_DEPLOYED
category: payments/operations
lastVerified: 2026-09-20
---

# Asaas Phase 7F — local closure before host validation

This phase remains local. No production host, database, credential, Asaas account, webhook registration, real payment, or outbound production alert was accessed or changed. The Phase 7E durable inbox and its immutable migration remain the foundation.

## Crash boundary and compiled artifact

`RechargeIntent.status=PAID` and the WC ledger credit commit in **one serializable transaction**, with the credit written before the status update. The requested state “transition committed, then crash before wallet credit” is therefore impossible without bypassing/corrupting the existing financial boundary. A separate real-DB test instead injects failure **after the status update but before commit** and proves both status and ledger roll back; a retry then commits one credit and completes the inbox event. The distinct after-credit-before-event-completion recovery test remains green. This is a deliberate correction to the scenario, not a claim to have observed an impossible intermediate state.

The reproducible local compiled-artifact check is `apps/api/scripts/validate-asaas-compiled-local.mjs`. It requires only the isolated `E2E_LOCAL_MYSQL_URL` for `127.0.0.1:13317/phase7e_db`, runs the built `dist/apps/api/src/main.js` as a separate process, and preloads a fail-closed synthetic Asaas `fetch` mock. The real compiled HTTP route returned health/ready 200, missing/wrong auth 401, valid/duplicate event 200, and disabled route 503. It demonstrated enabled worker processing, timeout-to-RETRY and recovery, manual review, and a persisted event resumed after process restart with one credit. No real Asaas request can pass the preload. `app.enableShutdownHooks()` now registers controlled shutdown callbacks; abrupt termination is still covered by lease/restart recovery. Whether this Windows test runner delivered the controlled shutdown hook is recorded separately in the handoff, never inferred from process exit alone.

## Correlation, alerts and flags

Each newly received event persists an internally generated UUID correlation ID in its minimal JSON payload. The worker reuses that ID across attempts/restarts; logs contain it alongside event-record and recharge IDs plus **hashes** of provider event/payment IDs. Client-provided correlation headers are not trusted as this payment-specific ID, so a document-shaped header cannot enter the safe log field. A real HTTP test sent document-shaped provider IDs and verified that logs did not echo them or the webhook token. Historical Phase 7E rows without the field fall back to the internally generated event-record ID.

Invalid Asaas webhook authentication now creates a sanitized critical operational event and `SystemAlert` without persisting a financial webhook event. A confirmed Asaas WC-credit exception is classified with a fixed code; after bounded retries, the worker creates separate critical credit-failure and manual-review alerts. The pre-existing payment reconciliation detector already raises a critical alert for the impossible-by-design `PAID_WITHOUT_LEDGER_CREDIT` state. A test injects a synthetic detector result **without corrupting the DB** and delivers these alert categories through the existing alert sweep to a loopback HTTP receiver. Production destinations remain disabled and unverified. The approved Asaas-specific aggregation/aging thresholds (provider 5xx ≥5/5 min, invalid auth ≥5/5 min, `RECONCILE_REQUIRED` >15 min, `MANUAL_REVIEW` >30 min) are **not implemented**; generic alert cooldown/sweep is not equivalent. Do not call those thresholds operational.

One `ASAAS_WEBHOOK_PROCESSING_ENABLED` flag remains sufficient **now**: the proposed first deploy is inert, with no provider webhook registered, so false means route 503/no persistence and worker off. Separate receive/processing flags may become necessary at the later, explicitly authorized webhook-registration stage; that decision is deferred, not silently approved.

## Evidence and remaining gates

Final local evidence: 57/57 migrations from zero on MariaDB 11.8.6; the already migrated isolated MySQL 8.0.46 remained at 57/57. The seven relevant real-DB suites passed **92/92 on each engine**, including **28/28 Asaas cases**. API unit tests passed **132/132**, the API build and structure/type check passed, and the log-secret scan found zero risky call sites. The two distinct crash tests also passed when run separately with their billing setup. The compiled-process harness passed the enabled/disabled HTTP, worker, timeout/retry, manual-review and restart scenarios. A second compiled-module test proved `app.close()` waits for active work and refuses new work afterward. Windows process `SIGTERM` did not visibly deliver the shutdown hook (`0` observed); this is not misreported as a graceful external-signal proof. Abrupt termination is covered by the successful restart/lease recovery test.

Previously applied migrations were not edited. The stale Phase 7E MySQL test directory was checked for ownership, links, listener/PID/command line and stopped process state; it was then removed without force. The new isolated MariaDB test directory was likewise stopped, verified and removed. Ports 13317/13318 are closed. Only synthetic disposable test data was removed; no production or historical application data was touched.

`LOCAL_ASAAS_IMPLEMENTATION_READY=YES` for the tested local contract above. Host quota/inodes, active artifact, ingress/body/header handling, log retention, and the production DB-credential dependency remain separate pending checks. Alert destinations and the Asaas-specific thresholds need an operations decision before public enablement. `READY_FOR_DISABLED_PRODUCTION_DEPLOY_REVIEW=NO`. No merge, push or deploy is authorized by this document.
