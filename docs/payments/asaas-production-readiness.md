---
status: IMPLEMENTED_LOCALLY_NOT_DEPLOYED
category: payments/operations
lastVerified: 2026-09-18
---

# Asaas Phase 7 — production readiness, disabled

Phase 6 established the Sandbox provider contract. Phase 7 adds production URL/configuration and independent, false-by-default controls. This branch is a local release candidate only: **no production deploy, credential installation, provider-account change, real charge or wallet credit was performed**. This document supersedes the Sandbox-only operating restriction described historically in Phase 2 and the billing-PII review; it does not rewrite those historical results.

## Provider policy and architecture

Asaas is the intended primary provider for new BRL-to-WC recharge, fixed at R$1 = 1 WC with no bonus. VIP/items are purchased later with WC, not BRL directly. Mercado Pago code, migrations, tests and history remain, but new MP intents/checkouts need both `REAL_MONEY_PAYMENTS_ENABLED=true` and `MERCADO_PAGO_ENABLED=true`; the default is dormant. Existing MP webhook/reconciliation routes remain for history.

The API's `ASAAS_ENABLED=true` means the provider is configured, **not** that charges are authorized. `ASAAS_ENVIRONMENT` must explicitly be `sandbox` or `production` when configured. The exact matching `ASAAS_BASE_URL` is required in production (`https://api.asaas.com/v3`); Sandbox (`https://api-sandbox.asaas.com/v3`) is limited to development/test and a loopback database. Key prefixes are checked by environment if a key exists. Missing/unknown/ambiguous production configuration fails before network access. Production credentials are not present in this branch.

| Control | Default | Effect |
|---|---|---|
| `ASAAS_ENABLED` | false | Provider request availability; does not itself authorize creation. |
| `ASAAS_FRONTEND_ENABLED` (API) | false | Required *with* creation flag for any new Asaas customer/intent/checkout. |
| `ASAAS_PAYMENT_CREATION_ENABLED` | false | Server-side new-payment kill switch; direct API and provider POST to `/payments` or `/customers` reject before network. |
| `ASAAS_WEBHOOK_PROCESSING_ENABLED` | false | Independent receipt, authenticated provider re-query and state transition for existing records. |
| `ASAAS_RECONCILIATION_ENABLED` | false | Independent admin provider resync, including `RECONCILE_REQUIRED` without an external payment ID. Does not create a charge. |
| `NUXT_PUBLIC_ASAAS_FRONTEND_ENABLED` and `NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED` (web) | false | Both required to render player PIX checkout CTA. Browser flags are presentation only; API remains authoritative. |

These are two app runtimes: `bmapi` and `bmweb`. A web-only flag cannot authorize an API call. Production activation requires intentionally enabling both API creation flags and both public web flags; no single missing variable defaults to true. `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `BILLING_PII_KEY_B64`, future `BILLING_PII_KEY_V2_B64`, and `BILLING_PII_ACTIVE_KEY_VERSION` belong only to the API process. Use the hosting environment's protected variable mechanism, never a tracked file or browser runtime config. A 32-byte billing key is required for encrypted legal name/CPF-CNPJ; do not collect additional billing fields without a necessity review. An absent/invalid key fails closed. Do not rotate production keys in this phase. Before future retirement of v1, run the read-only `BillingProfileService.keyVersionInventory()` count and keep old keys until zero dependencies and a reviewed migration.

## Webhook, idempotency and reconciliation

The route implemented in Nest is `POST /payments/webhooks/asaas`; with the existing `/api` prefix the intended permanent URL is `https://api.mubloodmoon.com.br/api/payments/webhooks/asaas` on the cPanel Node application `bmapi` (`/home/mubloodxz/bmapi`). The stable API domain and TLS are documented in the deployment/availability runbooks; **actual webhook ingress, egress to Asaas, restart resilience, and log path must still be verified on the deployed candidate**. No Quick Tunnel is suitable for production. This route is independent of web UI and new-charge flags, but processing stays off until credentials and hosting are verified.

Read-only external probe on 2026-09-18: `GET /api/content/entries?pageSize=1` returned 200 over HTTPS, while `GET /api/health` and `GET /api/ready` returned 404. This proves the API domain responds, **not** that this branch or its webhook is deployed or that health monitoring is functional. No POST/production write was attempted. The missing health routes are a concrete monitoring/release gate to reconcile against the actual deployed revision.

The Asaas webhook expects `asaas-access-token`, compares a configured token in constant time, never stores/logs that token, stores a minimized event, and re-queries Asaas before any consequential state transition. Provider/environment/reference/customer/amount/payment ID are checked. `PaymentWebhookEvent` is unique on provider/topic/event ID; `RechargeIntent` is unique on external reference and provider/environment/external order ID; wallet credit uses unique ledger key `recharge-credit:<intent-id>` in the same transaction as PAID. Replays must not create a second credit.

An ambiguous Asaas creation is marked `RECONCILE_REQUIRED`. The existing admin finance resync action now searches by stable external reference even when no external payment ID was saved, without a POST; if not found it stays unresolved for manual review. The existing reconciliation report also surfaces this backlog. Do **not** automatically retry a provider POST to clear an ambiguous state. The admin route is the current smallest reliable recovery path; no n8n dependency or new always-on provider poll is added. Future production operating procedure must assign a human owner and response time for that queue. Creation can be off while authenticated webhook handling and admin resync stay on for already-created legitimate charges.

When the player-facing gate is later enabled, the recharge page filters to active WC packages with zero bonus and an unambiguous whole-BRL price equal to the WC amount. If none are configured, the payment button remains disabled. No local fallback package can be charged.

## Monitoring and incident response

Existing durable sources: `RechargeIntent` status/provider/environment/reference/order ID and timestamps; `PaymentWebhookEvent` receive/process/failure/duplicate status; unique WC ledger entries; `AuditEvent` status transitions and actor; operational events for payment intent, status, mismatch, reconciliation and missing credit. The admin finance reconciliation report exposes stuck and ambiguous records. Never emit legal name, CPF-CNPJ, API key, webhook token, PIX payload or encrypted envelope to alerts/logs. Generic provider HTTP errors already surface as sanitized status codes, but a dedicated latency metric and automatic provider-error alert are **not implemented yet**; this is a pre-enablement monitoring gap, not a passing check.

Before any live enablement, configure monitored views and alert delivery for: Asaas auth failures; sustained provider 5xx/timeouts; webhook auth rejection spike; `RECONCILE_REQUIRED`/manual-review aging; paid-without-ledger-credit (critical); provider mismatch; duplicate-credit invariant; and webhook silence *only when expected payment activity exists*. Thresholds and on-call receiver must be established from a baseline, not invented here. Verify the actual `bmapi` log path and external API availability (`/api/health`, `/api/ready`) so a 503 cannot be mistaken for a healthy payment route. A failed webhook must remain retryable; investigate rather than delete financial history.

## Emergency stop and rollback

1. Set `NUXT_PUBLIC_ASAAS_FRONTEND_ENABLED=false` and `ASAAS_FRONTEND_ENABLED=false`; publish/reload web config as its runtime requires.
2. Set `ASAAS_PAYMENT_CREATION_ENABLED=false` on `bmapi` and reload **only** that verified app process using the cPanel Node selector. Confirm the exact app root/process before restart and test a disabled direct API call with a non-financial fixture; never make a production charge just to test the switch.
3. Decide separately whether `ASAAS_WEBHOOK_PROCESSING_ENABLED` and `ASAAS_RECONCILIATION_ENABLED` stay on to settle in-flight records. Normally preserve them if credentials, provider connectivity and audit remain trusted; switch off on a credential/verification compromise pending incident review.
4. Reconcile existing records and ledger evidence. Keep webhook events, intents and audit. Never delete history or reverse WC solely to "rollback".
5. Code rollback uses a separately retained known-good artifact/backup and the existing deployment rollback runbook, after host storage preflight. A flag change may need app reload but no code redeploy; verify the resulting runtime, not just the cPanel click.

## Activation checklist — separate approval required

- Review and approve financial/billing retention duration and eventual disposal/anonymization/detachment: `RETENTION_POLICY_DECISION_REQUIRED = YES`. Normal deletion keeps encrypted billing/payment evidence; PRE_BETA_PURGE is blocked when billing, provider customer or Asaas intent exists. Do not weaken that guard.
- Verify production Asaas account status, PIX capability/key, and any provider-side IP/network restrictions; determine the smallest supported configured WC package (integer BRL, no bonus). The amount for a real-money smoke is not approved here.
- Verify `bmapi` HTTPS stable route, public POST ingress, outbound TLS to `api.asaas.com`, process restart behavior, log path, DB migration parity and host storage preflight. Do not register a production webhook before these checks.
- Install a dedicated production API key, distinct 32–255 character webhook auth token, and billing encryption key in API-only protected variables. Confirm no secret reaches Nuxt public config or browser bundle. Plan rotations and old-key inventory.
- Register the production webhook to the exact permanent URL with only required payment events and auth token; verify provider retry/queue state. This provider-account mutation remains pending explicit approval.
- Turn on monitoring/alerts and establish an owner for ambiguous/manual-review cases. Then, with the player frontend still hidden, obtain Bryan's explicit approval for a **separate** controlled real-money smoke: dedicated QA account with real, consented billing identity; smallest provider-accepted package matching 1 WC = R$1; pre-agreed accounting/refund handling; expected `PAYMENT_RECEIVED`, one PAID intent and exactly one ledger credit; stop creation and investigate on any mismatch. No smoke was executed in Phase 7.
- Only after that smoke and fresh approval consider deliberate API creation enablement, then separate public frontend enablement. Recheck direct API denial whenever creation is off. Keep Mercado Pago dormant unless a later explicit decision changes policy.

References: `docs/payments/asaas-sandbox-phase6.md`, `docs/payments/billing-pii-encryption.md`, `docs/payments/financial-retention-policy.md`, `deploy/CPANEL_NODE_DEPLOY.md`, `docs/operations/deployment-rollback-runbook.md`.

## Phase 7 local verification and open gates

The local API suite passed 128/128 unit tests, including false/missing flag combinations, production URL/key mismatch before fetch, missing/wrong/valid webhook token, direct checkout denial, reconciliation separation, and the existing duplicate-credit tests. API structure/type check passed. The Nuxt production build succeeded with pre-existing build warnings; web typecheck exited 0 with a `vue-router/volar/sfc-route-blocks` plugin-export warning. A scan of the generated public assets found zero Asaas API-key, webhook-token, billing-key or Asaas-key-prefix markers. With both public flags false, local development SSR returned HTTP 200 for `/recarga`, no PIX CTA, no Asaas option, and the disabled notice. A direct preview of the generated `.output/server` returned 500 due to a missing `tailwindcss/colors` module in that preview artifact; this remains an explicit release/functional-QA blocker, not a passing check.

The Phase 5 disposable MySQL/MariaDB integration suites and Phase 6 live Sandbox suite were not rerun here: this phase changed no schema, but did change provider configuration. Re-run the isolated DB suite and consider a fresh Sandbox contract check before any merge or deploy. Current host has no Docker CLI; do not use the persistent local MySQL service as an improvised disposable database. No production API key, production webhook token, production Asaas API call, real payment or production write was used.

**2026-09-18 Phase 7B addendum:** the compiled-preview 500 above is a historical Phase 7 result, not the latest local result. Phase 7B fixed the Nitro externalization and obtained HTTP 200 on five compiled web pages with payments hidden. See [`asaas-phase7b-deployability.md`](asaas-phase7b-deployability.md) for current evidence and still-open database, public-route, webhook-hosting and alert-delivery gates. No production rollout occurred.

**2026-09-19 Phase 7E addendum (local only):** the synchronous webhook description and the unimplemented retry/ACK caveats earlier in this historical runbook describe the **older** candidate. The current branch now persists the minimal Asaas event before HTTP 200 and processes it later through a leased, retryable, restart-recoverable DB inbox. When `ASAAS_WEBHOOK_PROCESSING_ENABLED=false`, both reception and worker processing reject/stop (503, no row), which is the intended first inert deployment state with no provider webhook registered. Once explicitly enabled after separate approval, monitor `RECEIVED`/`PROCESSING`/`RETRY`/`MANUAL_REVIEW`, expired leases, age/backlog and the unique wallet ledger. Do not manually delete event history to recover a stuck payment. The worker's 10-second polling, 120-second lease, bounded retry and manual-review escalation are detailed in [`asaas-phase7e-durable-inbox.md`](asaas-phase7e-durable-inbox.md). Host behavior, real alert delivery and retention remain unverified/undecided; this addendum does not authorize deployment or credentials.
