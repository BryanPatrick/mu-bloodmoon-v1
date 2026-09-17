---
status: SANDBOX_VALIDATION_PARTIAL
category: payments
lastVerified: 2026-09-17
---

# Asaas Phase 6 — real Sandbox contract validation

This phase used a dedicated Sandbox API key against
`https://api-sandbox.asaas.com/v3` only. The key was entered into a
temporary process, never written to a repository file or report. The
database was an isolated local MySQL 8.4.10 schema created for this
phase; all 56 migrations applied. No production service, database,
payment setting, GameBridge, deploy, merge or push was touched.

## Actual provider results

- Authenticated Sandbox customer lookup returned HTTP 200.
- One fictitious customer, using the document example from Asaas's
  Sandbox documentation, was created and reused by the application's
  `ProviderCustomer` mapping. No real customer contact data was used.
- Three R$10 PIX Sandbox charges were created for synthetic local
  `RechargeIntent` records. Two were confirmed using the Sandbox-only
  confirmation endpoint and reached provider status `RECEIVED`; each
  credited exactly 10 WC once. The third was forced `OVERDUE` using
  the Sandbox-only action, then cancelled and never credited.
- The first checkout returned `ASAAS_PAYMENT_RECONCILE_REQUIRED` after
  Asaas had already created the charge. The retry found that charge by
  its stable external reference; provider lookup showed one payment,
  not a duplicate. This is a real recovery path, not a simulated
  timeout.
- The first paid flow handled four concurrent replays of one event,
  duplicate delivery, an older event topic, and a service restart with
  a single ledger entry. A second paid flow was credited from an actual
  `PAYMENT_RECEIVED` webhook delivered by Asaas through a temporary
  Cloudflare Quick Tunnel exposing only the test webhook route.
- Missing and incorrect webhook tokens were rejected. The valid
  webhook path re-queried the provider before changing local state.
- Local amount and customer mismatches against real provider payment
  evidence transitioned to manual review with zero credit. Payment-ID
  mismatch and unknown-status tests remain fixture-based rather than
  separately induced on the live provider; the provider's data was
  not falsified.
- Raw disposable-DB inspection: one BillingProfile with both fields
  encrypted, zero plaintext marker matches, one Sandbox
  ProviderCustomer, two PAID recharges, one CANCELLED recharge, two
  `recharge-credit:` ledger entries totalling 20 WC, and 11 persisted
  Asaas webhook-event rows from the controlled tests. The test output
  contained no API key, webhook token or billing plaintext.

## Provider contract difference and fix

After `DELETE /payments/{id}` on the overdue charge, Asaas returned
`deleted=true` while retaining `status=OVERDUE` on subsequent GET.
The previous adapter looked only at `status`, so local reconciliation
would have left the cancelled charge PENDING. The adapter now maps
`deleted=true` to internal provider status `DELETED`, which the
existing status mapper translates to `CANCELLED`. A unit regression
test and the live Sandbox reconciliation both pass.

The Sandbox-only confirmation action produced `RECEIVED` directly in
these tests; a separate observable `CONFIRMED` intermediate state was
not seen. The provider's actual behavior, not an assumed sequence,
governs the result.

## Reproducibility and remaining gates

The opt-in real-provider suite is
`apps/api/test/asaas-live-sandbox.live-spec.ts`; it is excluded from the
default E2E test pattern, refuses non-Sandbox configuration, and
requires an explicitly named local disposable DB. Run it only with an
explicit Jest `--testRegex` override and temporary Sandbox-only
environment variables.
The temporary route-restricted proxy is
`apps/api/scripts/asaas-sandbox-webhook-proxy.mjs`. The temporary
Sandbox webhook was deleted after the live delivery test; the tunnel
and proxy were stopped. The synthetic provider customer and three
Sandbox charges remain as test evidence. Local disposable DB teardown
is recorded in the final handoff.

API unit suite: 115/115 PASS. API structure/type check: PASS. Real
Sandbox suite: 6/6 PASS, including real webhook delivery. The
separate Phase 5 mocked real-DB suite already covers payment-ID,
unknown-status, out-of-order and further concurrency cases; these
must not be misreported as newly exercised provider-side in Phase 6.

This is enough to start a production-readiness **review**, not to
enable production. Billing retention duration and disposition remain
Bryan/legal decisions. Production credentialing, operational webhook
hosting, deployment, provider/account configuration, monitoring and
release approval remain separate gates.
