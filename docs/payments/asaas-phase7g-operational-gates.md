---
status: IMPLEMENTED_LOCALLY_NOT_DEPLOYED
category: payments/operations
lastVerified: 2026-09-21
---

# Asaas Phase 7G — operational gates and inert deploy review

This phase prepares review only. It did not deploy, restart production, mutate
production files/database/configuration, install a credential, register a
webhook or create a payment.

## Alert contract

Detection and delivery are separate opt-ins. `ASAAS_OPERATIONAL_ALERTS_ENABLED`
enables the durable gate evaluator; `ALERT_SWEEP_ENABLED` enables outbound
dispatch; `ALERT_EMAIL_ENABLED=true` plus non-empty `ALERT_EMAIL_TO` enables the
email channel. Every missing boolean is false. Missing destination leaves the
durable event/alert available to administrators and makes no channel call; it
does not crash the API. Production destination remains unconfigured.

Defaults are configurable: provider 5xx `>=5/5m`, rejected webhook auth
`>=5/5m`, `RECONCILE_REQUIRED >15m`, and Asaas `MANUAL_REVIEW >30m`. Provider
401/403, confirmed-payment final credit failure and exactly-once invariant
evidence stay immediate critical conditions. The aggregate detector reads
`OperationalEvent`, `RechargeIntent` and `PaymentWebhookEvent`; stable
`SystemAlert` keys plus `AlertDispatchState` provide durable dedupe/cooldown.
Clearing resolves the alert and stores a recovery event; recurrence reopens the
same alert. Outbound payloads are allowlisted and contain no PII or secrets.

Local affected suites passed 52/52, including 5-versus-4 boundaries for both
rolling thresholds, older-versus-younger age inputs, one-alert deduplication,
recovery/reopen, reconstruction of the service against the same durable state,
missing email destination, and loopback HTTP alert delivery. API structure,
security checks and TypeScript compilation passed. No schema changed in 7G, so
the heavy DB parity suites were intentionally not repeated; migration 57 had
already passed 92/92 on disposable MySQL and 92/92 on disposable MariaDB in
Phase 7F.

## Gate matrices

| Stage | Alert requirement |
|---|---|
| Disabled/inert deployment review | Code/tests/default-off configuration present. A production destination and live delivery are not required. |
| Webhook registration | Approved destination configured, gate evaluator + sweep + channel enabled, real delivery validated, webhook/inbox/auth alerts observed, host route validated. |
| Public payment enablement | All webhook requirements plus production credentials, complete thresholds, controlled smoke, financial-retention decision and explicit Bryan approval. |

| Host metadata | Inert review | Webhook registration | Public enablement |
|---|---|---|---|
| inode usage/quota | Acceptable for review with 908.56 MB free and only 40–50 MB expected peak; must be checked before upload/snapshot | Must not show exhaustion | Must be known/safe |
| Passenger/Node request timeout | Not blocking | Required to validate fast ACK/retry envelope | Required |
| application log retention | Not blocking; durable DB evidence remains | Operational owner/retention must be documented | Required |
| POSIX log ownership | Not blocking | Must confirm the operator can inspect logs | Required |

Storage is `PARTIAL_WITH_EXTERNAL_METADATA_PENDING`: account use is
3091.44/4000 MB, leaving 908.56 MB; the expected deployment peak is only
40–50 MB, so quota capacity is sufficient, but cPanel exposes no inode count.
The uncertainty is acceptable for **review**, not permission to upload. Future
storage preflight must stop if snapshot and candidate cannot both fit or if
support reports inode pressure.

Financial record retention remains `UNRESOLVED`. It does not block an inert
deploy. It blocks public enablement. Webhook registration is not inherently
blocked because its minimized durable inbox and operational audit must be kept;
no deletion policy is introduced here.

## Prepared hosting-support request — do not submit automatically

> Para preparar uma atualização inerte da aplicação Node/Passenger
> `api.mubloodmoon.com.br`, poderiam informar somente: (1) uso atual de inodes
> da conta cPanel `mubloodxz`; (2) quota/limite de inodes, se houver; (3) espaço
> livre relevante do filesystem, se disponível; e (4) timeout de processamento
> de requisição aplicável à aplicação Node/Passenger? Não precisamos de
> credenciais nem de qualquer segredo.

## Migration 57 and rollback compatibility

`20260919120000_asaas_durable_webhook_inbox` alters only
`PaymentWebhookEvent`. It adds six nullable columns
(`processingOwner`, `processingStartedAt`, `leaseExpiresAt`, `nextAttemptAt`,
`lastErrorCode`, `lastErrorAt`), one non-null integer with `DEFAULT 0`
(`attemptCount`), and one composite claim index on provider/status/retry/lease.
It deletes or rewrites no application data by design.

The old API is structurally compatible: it does not select the added columns;
its existing inserts omit them, which is accepted because nullable fields use
NULL and `attemptCount` has a default. The extra index is transparent. Exact
old source commit identity is therefore not required for an inert rollback if
the complete deployed artifact is snapshotted and hashed. Its known fingerprints
remain evidence, not a fabricated commit identity: `server.js`
`d0e5980680cae7106407468d88176988e523f822a0294e252b27277a5002c014` and
compiled `main.js`
`48d71e09d0d97502862b1b575bd7062a4f67d53bc0b6b903b9380de6b13dc897`.

The ALTER and CREATE INDEX require metadata locks and may build an index over
the table. Exact duration/algorithm cannot be claimed without production table
size and server metadata. Before execution: take and verify a production DB
backup with the established cPanel/database backup mechanism, record row/table
size, ensure rollback access, and use a low-traffic maintenance window. App
rollback should leave schema 57 in place; dropping columns/index would itself
lock the table and discard inbox-processing evidence, so schema down-migration
is an incident-only reviewed action, not the normal rollback.

## Future inert rollout and rollback checklist

Preserve a complete copy of current `bmapi` application files, manifest when
present, package metadata, `server.js`, compiled output, and a list of
environment **variable names only**. Never put values/secrets in the artifact.
Hash the snapshot and retain the known current hashes above.

1. Preflight quota, inode availability and temporary double-space requirement.
2. Take and verify the production DB backup before migration.
3. Snapshot the complete currently deployed artifact and environment names.
4. Hash and retain the snapshot outside the live application directory.
5. Apply reviewed migration 57 in the maintenance window; do not drop it on app rollback.
6. Upload the candidate as a separate disabled artifact.
7. Verify `ASAAS_FRONTEND_ENABLED=false`, `ASAAS_PAYMENT_CREATION_ENABLED=false`, `ASAAS_WEBHOOK_PROCESSING_ENABLED=false`, `ASAAS_RECONCILIATION_ENABLED=false`, Mercado Pago/real-money payments disabled, and no Asaas production secret required.
8. Perform one controlled Passenger application reload.
9. Require `GET /api/health` and `GET /api/ready` to return 200 without Asaas.
10. Verify the existing UI is unchanged and create API remains blocked.
11. Verify the Asaas webhook route returns disabled/503 and persists no event.
12. On any failure, restore the hashed prior artifact without changing secrets.
13. Reload once and verify the prior API root/public behavior and stored hashes.

No step above is authorization to deploy. Webhook registration, controlled
production smoke and public enablement each remain separate approvals.
