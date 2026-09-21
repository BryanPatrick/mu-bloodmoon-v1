# Alerting

Phase AA's proactive-alerting foundation. `SystemAlert`/`SystemError`/
`OperationalEvent` (`apps/api/src/modules/observability`) already detect and
store almost every condition this phase's task asked for — CRITICAL
`SystemError`s, Mercado Pago webhook anomalies, marketplace escrow job
failures — but nothing ever pushed a notification to a human; an operator
had to be logged into `/painel/admin/alertas` to notice. This module adds
only the missing outbound layer, on top of that existing detection, not a
parallel one.

## Design: a poller over `SystemAlert`, not an in-process hook

`SystemAlert` rows are created from three independent places: the live API
process (`ObservabilityService.ensureCriticalAlert`), the standalone
`process-game-bridge-jobs.mjs` cron script (its own Prisma client, a
separate OS process), and this phase's new `/internal/ops-events` ingest
endpoint (for backup tooling). A hook inside `ObservabilityService` could
only ever reach the first of those. `AlertSweepService` instead polls
`SystemAlert` directly (`OPEN`/`ACKNOWLEDGED`, severity ≥
`ALERT_MIN_SEVERITY`) on an interval, so it notifies for a condition
regardless of which process detected it. It never touches
`SystemAlert.status` — acknowledge/resolve stays entirely owned by the
existing admin UI; this module's own `AlertDispatchState` table tracks only
the separate question of "has this been pushed to a channel, and when."

Mirrors the existing `OnModuleInit`/`setInterval().unref()`/env-flag
convention already used by `GameProvisioningReconciliationService` — no new
background-job infrastructure (no BullMQ/Redis) was introduced.

## Channels

- **Email** (`EmailAlertChannel`) — reuses the existing, already-in-production
  `MailTransportService` (`modules/auth`) exactly the way
  `account-deletion-request.service.ts` already does. No new SMTP transport.
- **Webhook** (`WebhookAlertChannel`) — a plain JSON `POST`. No
  webhook-sending code existed anywhere in this codebase to reuse
  (`integrations-discord` is inbound/read-only — a bot polls the site, it
  never sends); this is genuinely new.

Both are OFF by default. `AlertDispatchService.dispatch()` fans out to every
*enabled* channel in parallel (`Promise.allSettled`) — one channel failing
never blocks another, and a disabled channel is skipped, not
attempted-and-logged-as-a-failure.

## Detectors this phase actually had to add

Everything else (payment anomalies, marketplace job failures, generic
CRITICAL `SystemError`s) already produced a `SystemAlert` before this phase;
`AlertSweepService` just had to start noticing them. Two conditions listed
in Part 13 had no detector at all before this phase:

- **`Http5xxBurstDetector`** — an in-memory sliding-window counter (no new
  table; this app runs as a single cPanel Node process, confirmed during
  this phase's deployment audit, so a process-local counter is a correct
  MVP, not a missing feature). `SafeExceptionFilter` already fingerprints
  and dedupes *individual* 5xx errors; this answers the different question
  of "how many 5xx of any kind happened recently." Fires an
  `OperationalEvent`/`HTTP_5XX_BURST` (CRITICAL) at most once per its own
  cooldown, however long the burst continues.
- **`GameBridgeHeartbeatAlertService`** — polls the already-existing,
  already-reviewed, read-only `GameDataClient.getBridgeStatus()`
  (`modules/game-data`) and emits `GAMEBRIDGE_HEARTBEAT_STALE` (WARNING) /
  `_OFFLINE` (CRITICAL) / `_RECOVERED` (INFO) `OperationalEvent`s on
  transition, plus a repeat notification if the condition persists past
  `GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS`. Never restarts the Agent, never
  rotates a credential, never issues a GameBridge command — there is no
  code path here that could, since `GameDataClient` exposes nothing but a
  status read.

## Asaas operational gates (Phase 7G)

`AsaasOperationalAlertService` evaluates four provider-specific conditions
from durable database rows: five provider 5xx events in a rolling five-minute
window, five rejected webhook authentications in a rolling five-minute window,
`RECONCILE_REQUIRED` older than 15 minutes, and Asaas `MANUAL_REVIEW` records
older than 30 minutes. Every number is configurable. The poller is separately
opt-in through `ASAAS_OPERATIONAL_ALERTS_ENABLED`; missing means false.

Each condition uses a stable `SystemAlert` source key. Repeated active polls
update one row; `AlertDispatchState` applies the existing outbound cooldown.
Clearing resolves the alert and stores a safe recovery event. Recurrence
reopens the same alert and clears only its dispatch cooldown. Rolling input,
condition state and dispatch state therefore survive an application restart.
Provider 401/403 remains an immediate CRITICAL event; webhook-auth rejection is
a WARNING input to the aggregate threshold. Confirmed final credit failure
remains immediate through the durable inbox worker.

Gate metadata is restricted to category, count, duration/age and HTTP status.
It never includes CPF/CNPJ, legal name, API key, webhook token, billing payload
or database credentials.

## `/internal/ops-events` (Part 17 — backup failure alerting)

A machine-to-machine ingest endpoint for tooling that has no user session
(a cron job, the cPanel backup script). Bearer-token guarded
(`InternalOpsEventsGuard`) against `OPS_EVENT_INGEST_TOKEN`; fails closed
when unset, so this endpoint requires no production wiring this phase. Body
is validated by hand (`internal-ops-events.contract.ts`) against a closed
`module`/`severity` allow-list — matching this codebase's existing
convention of no `class-validator`/`ValidationPipe` anywhere in `apps/api`
(confirmed by audit before writing this) — and forwards straight into
`ObservabilityService.recordOperationalEvent()`, so a reported backup
failure flows through the exact same detection → `SystemAlert` →
`AlertSweepService` pipeline as everything else, with a real, visible row
in `/painel/admin/eventos-operacionais`.

## Redaction (Part 18)

`alert-payload.ts` builds the exact, closed shape sent to a channel
(`SafeAlertPayload`) and runs the alert's title/message through the
existing `redactSensitiveText` (`common/sensitive-data.ts`) — the same
helper `ObservabilityService` already applies once before a `SystemAlert`
is even written. Applying it again here is deliberate defense-in-depth:
this payload leaves the app's own DB/RBAC perimeter for an email inbox or a
third-party webhook receiver.

## Configuration (all optional; every default is "do nothing")

| Env var | Default | Purpose |
|---|---|---|
| `ALERT_SWEEP_ENABLED` | `false` | Master switch for the poller itself. |
| `ALERT_SWEEP_INTERVAL_MS` | `60000` | How often the sweep runs. |
| `ALERT_SWEEP_BATCH_SIZE` | `50` | Max open alerts processed per tick. |
| `ALERT_MIN_SEVERITY` | `WARNING` | Part 15: only WARNING/ERROR/CRITICAL notify by default. |
| `ALERT_COOLDOWN_MS` | `900000` (15 min) | Part 14: minimum gap between re-notifications of the same open alert. |
| `ALERT_EMAIL_ENABLED` / `ALERT_EMAIL_TO` | off | Comma-separated recipient list. |
| `ASAAS_OPERATIONAL_ALERTS_ENABLED` | `false` | Enables durable Asaas gate evaluation; does not enable delivery. |
| `ASAAS_OPERATIONAL_ALERT_INTERVAL_MS` | `60000` | Gate evaluation interval. |
| `ASAAS_PROVIDER_5XX_ALERT_THRESHOLD` / `ASAAS_PROVIDER_5XX_ALERT_WINDOW_MS` | `5` / `300000` | Provider 5xx rolling threshold. |
| `ASAAS_INVALID_WEBHOOK_AUTH_ALERT_THRESHOLD` / `ASAAS_INVALID_WEBHOOK_AUTH_ALERT_WINDOW_MS` | `5` / `300000` | Rejected webhook-auth rolling threshold. |
| `ASAAS_RECONCILE_REQUIRED_ALERT_AGE_MS` | `900000` | Maximum age before reconciliation alert. |
| `ASAAS_MANUAL_REVIEW_ALERT_AGE_MS` | `1800000` | Maximum age before manual-review alert. |
| `ALERT_WEBHOOK_ENABLED` / `ALERT_WEBHOOK_URL` | off | Generic JSON webhook target. |
| `OPS_EVENT_INGEST_TOKEN` | unset (endpoint rejects everything) | Shared secret for `/internal/ops-events`. |
| `GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED` | `false` | Master switch for the heartbeat poller. |
| `GAMEBRIDGE_HEARTBEAT_ALERT_INTERVAL_MS` | `300000` (5 min) | Poll frequency. |
| `GAMEBRIDGE_HEARTBEAT_REPEAT_NOTIFY_MS` | `1800000` (30 min) | Re-notify cadence while still stale/offline. |
| `HTTP_5XX_BURST_DETECTION_ENABLED` | `true` | The detector itself is cheap and side-effect-free; only the channels above are opt-in. |
| `HTTP_5XX_BURST_THRESHOLD` | `10` | 5xx count to cross in the window. |
| `HTTP_5XX_BURST_WINDOW_MS` | `300000` (5 min) | Sliding window size. |
| `HTTP_5XX_BURST_COOLDOWN_MS` | `900000` (15 min) | Minimum gap between burst alerts. |

Turning every one of the above OFF (the shipped default) makes this module
a pure no-op: `AlertDispatchState` rows simply never get written, no email
is sent, no webhook fires. This phase does not require any production
wiring — see `docs/operations/phase-aa-ops-hardening-report.md` for what an
operator needs to configure to actually turn it on.

`ALERT_EMAIL_ENABLED=true` without `ALERT_EMAIL_TO` is still disabled. The
event and alert remain in the database, no SMTP call is attempted, and the API
does not crash. No production recipient is stored in this repository.

## Tests

`npm test` (new — this repo previously had zero unit tests, only the
Docker-backed e2e suite). Every spec here mocks its collaborators
(`PrismaService`, `GameDataClient`, `ObservabilityService`, channels) —
none needs a database, matching Part 23's "avoid brittle
infrastructure-dependent tests."
