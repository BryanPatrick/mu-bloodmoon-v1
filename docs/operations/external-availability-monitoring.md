# External availability monitoring — design

Status: **DESIGN ONLY**. Nothing in this document is deployed, configured,
or wired to a real account/webhook/alert channel. Written 2026-09-15,
directly motivated by a real production incident the same day: `bmweb`
and `bmapi` both returned persistent `503` from LiteSpeed's own LSAPI
layer (`"The server is temporarily busy, try again later!"`, an HTML page,
not an app response) while both Node processes were confirmed alive
(`ps` showed long-lived PIDs, `PPid=1`) and every cPanel-visible account
resource (CPU, memory, entry processes, disk) was healthy. There was no
way to detect that from inside the app, and no way to detect it at all
until a human happened to load the site.

## Objetivos

1. Detect a production outage **independently of the app's own process**
   — the LSAPI incident this document uses as its test case (Fase 13
   below) could not have been detected by anything running inside `bmapi`
   itself, because the thing that was broken was whatever spawns/routes to
   `bmapi` in the first place.
2. Distinguish, at the moment of a failure, which of five different
   things is actually wrong: the app process is dead; the app process is
   alive but not ready (DB); the frontend specifically is unreachable
   while the API is fine; the API specifically is unreachable while the
   frontend is fine; or the whole hosting account is unreachable.
3. Do this without inventing a second, disconnected alerting system —
   this design deliberately reuses this project's existing vocabulary
   (`SystemErrorSeverity` INFO/WARNING/ERROR/CRITICAL, the `SystemAlert` →
   `AlertDispatchState` → channel pipeline) and existing entry point
   (`/internal/ops-events`) wherever it can, rather than parallel-building
   a second severity model or a second ingest path.

## Fase 1 — Inventário

```
MAIN_HEAD = 6ed55cc3ab8d3de578c336d2c94fbdae85deb261
WORKTREE_CLEAN = YES
```

Existing documentation/code reviewed before writing this (nothing below
was duplicated, only extended or cross-referenced):

- `apps/api/src/modules/observability/` — `ObservabilityService` is the
  single write path for `SystemError` (exception-derived, fingerprinted,
  deduped, `SystemErrorSeverity` INFO/WARNING/ERROR/CRITICAL) and
  `OperationalEvent` (business/infra events, `OperationalEventSeverity`,
  same four levels). Both are Prisma models
  (`apps/api/prisma/schema.prisma:1394` `SystemError`, `:1468`
  `OperationalEvent`).
- `apps/api/src/modules/alerting/` (Phase AA) — `AlertSweepService` polls
  `SystemAlert` rows (`schema.prisma:1489`, states `OPEN`/`ACKNOWLEDGED`/
  `RESOLVED`) on `ALERT_SWEEP_INTERVAL_MS` (default 60000ms), dedupes via
  `AlertDispatchState` (`schema.prisma:1530` — `firstSeenAt`/`lastSeenAt`/
  `lastNotifiedAt`/`notificationCount`/`resolvedAt`, 1:1 with a
  `SystemAlert`), and fans out to `EmailAlertChannel`/`WebhookAlertChannel`
  (both OFF by default). `Http5xxBurstDetector` is an in-process sliding
  window (10 5xx / 5 min window / 15 min cooldown, all env-configurable)
  — explicitly documented as correct only because "this app runs as a
  single cPanel Node process" (`alerting/README.md:53-56`). It is the one
  exception to "every knob defaults OFF": `HTTP_5XX_BURST_DETECTION_ENABLED`
  itself defaults to `true` (`alerting.env.ts:99-101`) since the detector
  is cheap and side-effect-free on its own — only the notification
  channels stay opt-in. Everything else in this module (the sweep poller,
  both channels, the GameBridge heartbeat poller) defaults OFF
  (`alerting/README.md`'s config table); confirmed still true in
  production as of the 2026-09-14 deploy manifest (`PHASE_AA = OFF`).
- `apps/api/src/modules/alerting/internal-ops-events.controller.ts` +
  `internal-ops-events.guard.ts` — `POST /api/internal/ops-events`,
  Bearer-token guarded (`OPS_EVENT_INGEST_TOKEN`), fails closed when
  unset. Already built specifically so out-of-process tooling (the backup
  cron scripts) can feed the same `SystemAlert` pipeline. This is the
  natural integration point for Fase 16 below — already exists, nothing
  new to build.
- `docs/operations/incident-response-runbook.md` — Phase AA's runbook.
  Its "API unavailable" / "Web unavailable" entries already separate the
  two failure surfaces conceptually, but were written before
  `GET /api/health`/`GET /api/ready` existed — they still reference
  `GET /` (`apps/api`)'s `version` field as the liveness signal. **Follow-up**:
  that runbook should be updated to reference the real health/ready routes
  now that they exist — not done in this design-only phase.
- `docs/operations/phase-aa-ops-hardening-report.md` — confirms Phase AA's
  current state precisely (`Part 12-18`, `Part 24` config table) and that
  its alerting is entirely **internal-detection-only**: every one of its
  triggers (`SystemError`, `OperationalEvent`, the 5xx burst counter, the
  GameBridge heartbeat poller) runs *inside* the same `bmapi` process that
  the LSAPI incident took down. This is the precise, cited gap this
  document's design fills.
- `apps/api/src/common/safe-exception.filter.ts` — confirms the
  `database|deadlock|rollback|escrow|duplicate delivery|connection refused`
  CRITICAL-classification regex, and confirms `/api/ready`'s deliberate
  choice (see the health module's own commit) to bypass this filter
  entirely for its 503 response, specifically to not double-report to
  `SystemAlert` on every readiness poll during a real outage.
- `apps/api/src/modules/health/README.md` — already documents
  `GET /api/health`/`GET /api/ready` completely (route shape, response
  bodies, the passthrough-not-throw design decision, security posture).
  Not restated here beyond what's needed for this document to stand alone.

## Fase 2 — Checks canônicos

| Check | Method | URL (conceitual) | Valida | Esperado |
|---|---|---|---|---|
| A — WEB PUBLIC | `GET` | `https://mubloodmoon.com.br/` | DNS, TLS, reverse proxy/LSAPI routing to `bmweb`, SSR rendering | `HTTP 200`, body contains real HTML (not an LSAPI/LiteSpeed error page — see Fase 6's `INVALID_BODY` case) |
| B — API LIVENESS | `GET` | `https://api.mubloodmoon.com.br/api/health` | DNS, TLS, LSAPI routing to `bmapi`, NestJS process alive, request pipeline works | `HTTP 200`, body `{"status":"ok"}` exactly |
| C — API READINESS | `GET` | `https://api.mubloodmoon.com.br/api/ready` | Everything B validates, plus Prisma → MySQL connectivity | `HTTP 200` body `{"status":"ready"}`, or a **well-formed** `HTTP 503` body `{"status":"not_ready"}` (see Fase 13 — a well-formed 503 here is a different, less severe signal than an LSAPI-layer 503) |

All three are unauthenticated `GET` requests against routes that already
exist in production today and were built with external monitoring
explicitly in mind (`apps/api/src/modules/health/README.md`).

## Fase 3 — Interpretação de estados

Each check resolves independently to `OK` or `FAIL` per cycle (the
consecutive-failure/success counters in Fase 5 are tracked **per check**,
not globally). The matrix below combines the three simultaneous states
into one overall classification. `FAIL` here means "did not reach the
`OK` outcome defined in Fase 2" — the specific reason (`5xx`, timeout,
wrong body, …) is a separate, orthogonal `errorType` (Fase 6) attached to
whichever check(s) failed, used for the alert message and root-cause
hinting, not for the top-level classification below.

| WEB | HEALTH | READY | Classificação | Rationale |
|---|---|---|---|---|
| OK | OK | OK | **HEALTHY** | Everything reachable end to end. |
| OK | OK | FAIL | **DATABASE / READINESS INCIDENT** | App process alive and routable, DB unreachable. Matches "app vivo, não pronto." |
| OK | FAIL | FAIL | **API PROCESS / ROUTING INCIDENT** | Frontend loads (possibly serving stale/cached content, or purely static parts), but the API surface is entirely unreachable — nearly every interactive/authenticated flow is broken even though the homepage loads. See escalation rule below. |
| FAIL | OK | OK | **FRONTEND / HOSTING ROUTING ISSUE** | `bmweb` specifically down/misrouted while `bmapi` is fully healthy — an isolated surface. |
| FAIL | OK | FAIL | **CONCURRENT INCIDENT (web + DB)** | Two independent problems overlapping. Do not force this into one of the single-cause rows above — alert on both `WEB` and `READY` as separate open incidents, classify by the more severe (readiness). |
| FAIL | FAIL | FAIL | **HOSTING / LSAPI / API OUTAGE** | The account-wide pattern this document's own test case (Fase 13) produced. |
| OK | FAIL | OK | **ANOMALOUS — re-check before classifying** | Not logically coherent for one process serving both routes (readiness cannot legitimately succeed if liveness just failed) — most likely a timing artifact between the two nearly-simultaneous requests. Re-run both checks immediately; do not open an incident on this pattern alone. |
| FAIL | FAIL | OK | **ANOMALOUS — re-check before classifying** | Same reasoning as above, plus web down. Re-check before classifying. |

**Escalation rule** (not in the user's original four examples, added
because the real architecture demands it): `WEB=OK, HEALTH=FAIL` is
classified `API PROCESS / ROUTING INCIDENT` above, but because
essentially every authenticated/interactive surface of this product
depends on the API (login, wallet, VIP, marketplace, admin — confirmed by
this session's own route audit of `apps/api/src/modules`), this state
should be **treated with SEV-1 urgency once it reaches `INCIDENT_OPEN`**
(Fase 5/7), even though the user's own SEV-1 definition says "Web + API
indisponíveis." The homepage loading is cold comfort if nothing behind
login works.

## Fase 4 — Intervalo

`CHECK_INTERVAL = 60s`.

Justification: this matches `ALERT_SWEEP_INTERVAL_MS`'s own existing
default (60000ms) — keeping the same "time to first detection" order of
magnitude across the internal (Phase AA) and external (this design)
layers avoids a confusing situation where one layer detects something the
other hasn't caught up to yet. 30s was considered and rejected: it
roughly doubles check volume against a small, shared-hosting account for
no proportionate benefit at this project's current scale (pre-Open-Beta,
no SLA), and combined with the Fase 5 threshold (3 consecutive failures)
would still only shave ~1 minute off detection time. 120s was also
rejected: combined with a 3-failure threshold, worst-case time to
`INCIDENT_OPEN` would be ~6 minutes — slower than the existing internal
`Http5xxBurstDetector`'s own ~5–10 minute detection window for a
different failure mode (error bursts), which would make the *external*
layer the slower one for a total outage, defeating its purpose.

## Fase 5 — Thresholds

The proposed scheme is adopted as-is — it is sound and mirrors this
project's own existing philosophy (`Http5xxBurstDetector` also refuses to
fire on a single event):

| Consecutive failures | State |
|---|---|
| 1 | `SUSPECTED` (no alert) |
| 2 | `DEGRADED` (no alert) |
| 3 | `INCIDENT_OPEN` (alert — see Fase 9) |

| Consecutive successes after an open incident | State |
|---|---|
| 1 | `RECOVERING` (no alert) |
| 2 | `INCIDENT_RESOLVED` (alert — see Fase 9) |

At `CHECK_INTERVAL=60s`, worst-case time to `INCIDENT_OPEN` is ~2 minutes
after the underlying problem starts, and worst-case time to
`INCIDENT_RESOLVED` after a real fix is ~1 minute after the fix actually
works. These counters are tracked **independently per check** (`WEB`,
`HEALTH`, `READY` each have their own `SUSPECTED → DEGRADED →
INCIDENT_OPEN` state machine); Fase 3's matrix reads the three *current*
per-check states together to produce the combined classification.

## Fase 6 — Timeouts

`REQUEST_TIMEOUT = 10s`.

Justification: long enough that a real but slow cold-start (LSAPI
spawning a fresh worker on demand — an established, legitimate behavior
of this hosting setup, not itself a failure) doesn't get misclassified as
a hard failure; short enough (1/6th of `CHECK_INTERVAL`) that a genuinely
hung request doesn't meaningfully delay the next cycle.

Failure types to distinguish (feeds `errorType` in Fase 11's persistence
model, and the alert message in Fase 8):

| errorType | Meaning |
|---|---|
| `DNS_FAILURE` | Hostname did not resolve. |
| `TLS_FAILURE` | TCP connected but TLS handshake failed (expired/invalid cert, etc.). |
| `CONNECTION_REFUSED` | TCP connection itself was refused. |
| `TIMEOUT` | No response within `REQUEST_TIMEOUT`. |
| `HTTP_5XX` | A response arrived with a 5xx status. |
| `INVALID_BODY` | Status was in the expected range but the body doesn't parse/match — **this is the single most important addition this document makes**, see Fase 13: a real LSAPI-layer 503 returns an HTML page, not `{"status":"not_ready"}` — that distinction alone tells you whether the request ever reached this app's own code. |
| `WRONG_STATUS` | A response arrived with a status outside the expected set (e.g. an unexpected redirect or 403) that isn't itself a 5xx. |

## Fase 7 — Classificação (severidade)

| Severity | Trigger |
|---|---|
| **SEV-1** | `WEB=FAIL` and (`HEALTH=FAIL` or `READY=FAIL`) at `INCIDENT_OPEN` — total or near-total unavailability. **Also** `WEB=OK, HEALTH=FAIL` at `INCIDENT_OPEN` per the Fase 3 escalation rule — API fully unreachable is treated as SEV-1 even with the homepage up. |
| **SEV-2** | `WEB=OK, HEALTH=OK, READY=FAIL` at `INCIDENT_OPEN` — DB unavailable, core authenticated/DB-backed flows affected, homepage and static surfaces fine. |
| **SEV-3** | `WEB=FAIL, HEALTH=OK, READY=OK` at `INCIDENT_OPEN` — an isolated frontend/routing problem, API fully healthy. |
| **SEV-4** | Any check reaches `SUSPECTED`/`DEGRADED` but recovers before `INCIDENT_OPEN` — logged for trend visibility, no human alert. |

The `CONCURRENT INCIDENT` and `ANOMALOUS` rows from Fase 3 are handled as:
concurrent → classify by the more severe of the two open incidents (and
alert on both separately, per-check); anomalous → never assigned a
severity, re-checked instead.

## Fase 8 — Política de alertas

Destinations considered for a **future** implementation phase (none
configured now): email, Discord, Slack, Telegram, this app's own admin
panel, and Phase AA's existing pipeline (Fase 16). Discord/Slack/Telegram
all accept plain incoming webhooks, so a single generic-JSON webhook
dispatcher (mirroring the shape `WebhookAlertChannel` already
established, `apps/api/src/modules/alerting/`) can reach any of them
without per-channel bespoke code — consistent with the existing design
rather than inventing a second webhook format.

Every alert (open, escalated, resolved) must include:

- `service` — which check (`WEB` / `HEALTH` / `READY`).
- `url` — the exact URL checked.
- `firstFailureAt` — when the current failure streak started.
- `consecutiveFailures` — count at alert time.
- `lastStatus` — last HTTP status and/or `errorType`.
- `duration` — `now - firstFailureAt`.
- `severity` — SEV-1..4.
- `currentState` — `SUSPECTED` / `DEGRADED` / `INCIDENT_OPEN` /
  `RECOVERING` / `INCIDENT_RESOLVED`.

None of the above is sensitive — no secret, credential, internal path, or
stack trace is ever part of this payload, matching `/api/health` and
`/api/ready`'s own security posture (Fase 15) and reusing the existing
`redactSensitiveText` defense-in-depth pattern if this payload ever
passes through this app's own code path (Fase 16).

## Fase 9 — Anti-spam

- **Dedup**: at most one open incident per check at a time — a check
  already in `INCIDENT_OPEN` does not open a second incident on itself.
- **No alert on intermediate states**: `SUSPECTED`/`DEGRADED` are silent
  (internal state only) — this alone satisfies "não alertar na primeira
  falha isolada."
- **Alert only on transition**: `INCIDENT_OPEN` (first alert),
  `INCIDENT_ESCALATED` (if severity increases while still open — e.g. a
  `READY`-only incident later joined by `HEALTH` also failing),
  `INCIDENT_RESOLVED`. A check that stays in `INCIDENT_OPEN` for 50
  consecutive cycles produces exactly one alert, not 50.
- **Optional long-running reminder** (proposed as a future, separately
  configurable knob — not decided now): for an incident open longer than
  some `REMINDER_INTERVAL` (e.g. 30–60 min — deliberately longer than
  Phase AA's own 15-minute `ALERT_COOLDOWN_MS`, since this layer's
  incidents are meant to be rarer and more severe, and over-reminding
  during a real prolonged outage is its own kind of alert fatigue), send
  one reminder so a forgotten incident doesn't go silent forever.

## Fase 10 — Recovery

`RECOVERY_SUCCESS_THRESHOLD = 2` (adopted as proposed).

A single `200` after an outage is not proof of a real fix — it could be
one worker briefly answering before hanging again (a plausible shape for
a partial LSAPI recovery, where a freshly spawned worker serves one
request then the same underlying problem recurs). Requiring 2 consecutive
successes (`RECOVERING` → `INCIDENT_RESOLVED`) guards against flapping
being reported as resolved. This is intentionally stricter than the
existing `GameBridgeHeartbeatAlertService`'s single-transition `RECOVERED`
event — that heartbeat is a lower-stakes, secondary signal; this layer is
the primary "is the whole portal up" signal and deserves the extra
caution.

## Fase 11 — Persistência (conceitual — nenhuma migration criada)

Field names below deliberately mirror this project's existing
`SystemAlert`/`AlertDispatchState` naming conventions, so that if this is
ever actually implemented as Prisma models, it would read as an extension
of the existing style rather than a foreign one.

**`AvailabilityCheckResult`** (append-only log, one row per check per
cycle):
- `checkName` (`WEB` / `HEALTH` / `READY`)
- `checkedAt`
- `latencyMs`
- `httpStatus` (nullable — absent on `DNS_FAILURE`/`TIMEOUT`/etc.)
- `result` (`OK` / `FAIL`)
- `errorType` (nullable, Fase 6's enum)
- `consecutiveFailures` / `consecutiveSuccesses` (the counter value *as of
  this row*, for cheap historical graphing without re-deriving it)
- `incidentId` (nullable FK — set only while an incident is open for this
  check)

**`AvailabilityIncident`**:
- `id`
- `checkName`
- `openedAt`
- `resolvedAt` (nullable)
- `severity` (SEV-1..4, may change — track `peakSeverity` separately from
  current if escalation matters historically)
- `escalatedAt` (nullable — first time severity increased while open)

This would live either as new Prisma models in `apps/api` (if the checker
itself runs as another process talking to the same database — unlikely
given Fase 14's "must live outside this hosting account" constraint) or,
more likely given the recommended architecture below, as a small table in
whatever external runtime hosts the checker (e.g. Cloudflare D1, which
this project already has design precedent for via the Game Data Platform
plan). **No migration was created in this phase**, per instruction.

## Fase 12 — Latência

Proposed **provisional** WARN thresholds — explicitly not backed by a
measured production baseline (none exists yet for these new routes), so
each is grounded in either an external, citable standard or a structural
argument about what the route does, and is flagged for recalibration once
real numbers exist:

| Threshold | Value | Rationale |
|---|---|---|
| `WEB_WARN_LATENCY` | 800ms | Aligned to the widely-used Core Web Vitals "Time to First Byte — needs improvement" boundary (~800ms) — an external, non-arbitrary reference point rather than a project-specific guess, appropriate since no real production SSR latency baseline has been measured yet. |
| `API_WARN_LATENCY` (health) | 300ms | `/api/health` does zero I/O (confirmed — `apps/api/src/modules/health/health.controller.ts`, the liveness handler never touches Prisma). Under normal conditions this should return in single-digit milliseconds; 300ms already indicates the Node event loop or LSAPI routing itself is under unusual load — a meaningful early-warning signal distinct from any DB problem. |
| `READY_WARN_LATENCY` | 500ms | `/api/ready` does exactly one trivial query (`SELECT 1`) with no real work. 500ms is already far slower than a bare round-trip should take on a healthy connection pool, suggesting connection-pool contention or DB-side latency building up *before* it becomes an outright `READY` failure — an early precursor signal, not a hard threshold. |

All three should be treated as **starting points to recalibrate**, not
fixed truths, once real baseline latency data exists (Fase 11's
persistence model is exactly what would make that recalibration possible
later).

## Fase 13 — Caso de teste: o incidente LSAPI real

Walking the actual 2026-09-15 incident through this design:

**Observed that day**: `https://mubloodmoon.com.br/` → `503`, body a
LiteSpeed HTML page ("The server is temporarily busy, try again later!"),
repeated across 8+ tries over ~12 minutes. `https://api.mubloodmoon.com.br/api`
→ same pattern. Read-only cPanel diagnosis (outside what HTTP monitoring
alone can see) found both `bmapi`/`bmweb` `lsnode:` processes alive with
long uptimes (~15h/~11h, `PPid=1`), and every account-level resource
metric (CPU 0%, memory 15.97%, entry processes 2/20, process count
36/100) healthy — ruling out a resource ceiling. `stderr.log` for `bmweb`
showed `Cannot find module '/usr/local/lsws/fcgi-bin/lsnodesm.js'` errors
as recently as ~7 minutes before that diagnostic capture.

**How this design would have classified it**:

- `WEB` → `FAIL`, `errorType = HTTP_5XX` **and** `INVALID_BODY` (the
  response body is an HTML page, not the real app's output at all — this
  is the single most diagnostic fact available from outside, and this
  design is the first place in this project that would have captured it
  structurally rather than as a one-off manual observation).
- `HEALTH` → `FAIL`, same signature (the request never reached NestJS).
- `READY` → `FAIL`, same signature, purely as a consequence of `HEALTH`
  already failing.
- Matrix row: `WEB=FAIL, HEALTH=FAIL, READY=FAIL` → **HOSTING / LSAPI /
  API OUTAGE**.
- After 3 consecutive cycles (~2 min at `CHECK_INTERVAL=60s`):
  `INCIDENT_OPEN`, **SEV-1**, one alert fired with `errorType=INVALID_BODY`
  called out explicitly in the message.

**What this design would still NOT have told anyone, honestly stated**:
whether the processes were alive-but-hung versus the LSAPI launcher
itself missing (the actual root-cause candidate found — `lsnode.js`/
`lsnodesm.js` not resolvable inside the account's own CageFS jail). That
distinction required the existing read-only cPanel evidence-first
procedure (process `ps`/`etimes` check, log tail, resource-usage read) —
pure external HTTP monitoring tells you **that** something is badly wrong
and roughly **where** (web vs. API vs. DB-only), not **why** at the
process/hosting-launcher level. This design's honest contribution is
faster, automatic, always-watching detection and correct triage —
**not** a replacement for that deeper diagnostic procedure, which still
belongs to the `bloodmoon-deploy` skill (`~/.claude/skills/bloodmoon-deploy/`)
and `deploy/CPANEL_NODE_DEPLOY.md` (the actual home of this project's
LSAPI/Passenger/CloudLinux reload gotchas and diagnostics — confirmed
`docs/deployment-architecture.md` does not cover this despite the name;
there is also no single generalized "evidence-first SIGTERM" procedure
doc today, only the skill's own procedural checklist plus a one-off
example of it having been followed correctly in
`docs/deployments/deploy-2026-09-14-api-web-production-deploy/deploy-manifest.md:26`).

## Fase 14 — Provedor de monitoramento (comparação conceitual)

**Hard constraint carried through every option below**: the primary
monitor must run outside the Hostinger/cPanel account it watches — a
monitor co-located with the thing it monitors cannot detect the exact
failure mode this document's own test case (Fase 13) was.

| | A. Ready-made external service | B. Cloudflare Worker + Cron | C. Self-hosted infra | D. Hybrid |
|---|---|---|---|---|
| Independência do hosting | Yes, by construction | Yes (Cloudflare's own network) | Depends where hosted — must NOT be the same Hostinger account | Yes |
| Custo | Free/cheap tier realistic for 3 checks @ 60s | Free/cheap tier realistic for the same | New infra to pay for/maintain | Same as A |
| Simplicidade | Highest — no code | Moderate — real Worker code to write/maintain | Lowest — a whole extra service to operate | Highest for the primary path |
| Alertas | Built-in (email/Discord/Slack/webhook, vendor-dependent) | Build it yourself (webhook dispatch) | Build it yourself | Vendor's built-in, plus optional relay (below) |
| Retenção/histórico | Vendor-dependent, usually included | Full control (D1) | Full control | Vendor's, plus optional relay into this app's own admin panel |
| Disponibilidade do próprio monitor | Vendor's own SLA (usually strong) | Cloudflare's own SLA (strong) | Only as good as whatever hosts it | Vendor's |
| Risco de "monitor monitora a si mesmo" | None | None | Real risk if not carefully placed on genuinely separate infra | None |
| Fit com o projeto hoje | No existing account/precedent | This project already has a *planned* Cloudflare Worker/D1 presence (Game Data Platform design) — real future synergy, not yet built | No automation channel to the Game VPS exists (RDP-only); this small team already has an observed backlog of unconfigured integrations (Phase AA channels, unconfirmed offsite backups) — self-hosting adds exactly the kind of ongoing operational surface this project has struggled to keep resourced | Best of A now, keeps B as a credible later consolidation if the Game Data Platform Worker gets built first |

## Fase 15 — Security

All three checks (Fase 2) are already public, unauthenticated `GET`
routes with hard-capped, non-sensitive response bodies
(`apps/api/src/modules/health/README.md`'s own "Security" section — no
env var, hostname, path, token, database URL/credential, or stack trace
in either response, by construction). Nothing about implementing external
monitoring requires an admin token, an API key, a login session, or any
mutable endpoint — the design in this document never proposes anything
beyond `GET` against these three existing, already-reviewed routes.

## Fase 16 — Alimentando a Phase AA (futuro — Phase AA permanece OFF)

The natural, already-built bridge is `POST /api/internal/ops-events`
(`apps/api/src/modules/alerting/internal-ops-events.controller.ts`) — an
external monitor's own "on failure, call this webhook" feature (available
on essentially every ready-made service in Fase 14's Option A) could POST
here using the exact `module`/`severity` contract the backup scripts
already use, flowing straight into the existing `SystemError`/
`OperationalEvent` → `SystemAlert` → `AlertSweepService` → email/webhook
pipeline. This would give dashboard visibility
(`/painel/admin/eventos-operacionais`) and unified incident history for
**zero new code on this app's side** — only a webhook configured on the
vendor's dashboard, in a future implementation phase. This is registered
here as the concrete integration path Fase 16 asked for; **nothing was
configured, and `OPS_EVENT_INGEST_TOKEN` remains unset in production**,
so this endpoint continues to fail closed exactly as it does today. Phase
AA stays entirely OFF.

## Fase 17 — Roadmap de implementação (futuro, não executado agora)

1. Pick the provider (Fase 14) — likely Option A first, Option D as the
   natural evolution once/if a Cloudflare Worker exists for the Game Data
   Platform.
2. Configure the 3 checks (Fase 2) at `CHECK_INTERVAL=60s`,
   `REQUEST_TIMEOUT=10s`, with body-shape validation (not just status
   code) so `INVALID_BODY` (Fase 6, Fase 13) is actually detected, not
   just `HTTP_5XX`.
3. Configure the threshold/recovery state machine (Fase 5/10) — most
   ready-made services support "N consecutive failures/successes"
   natively; if not, this needs a thin relay.
4. Wire at least one alert channel directly on the vendor (email/Discord)
   for the fastest possible path to a human.
5. (Later) Configure the vendor's failure webhook to also POST into
   `/api/internal/ops-events` (Fase 16), and only then set
   `OPS_EVENT_INGEST_TOKEN` in production — a deliberate, separate,
   explicit-approval step, not bundled into step 4.
6. Update `docs/operations/incident-response-runbook.md`'s "API
   unavailable"/"Web unavailable" entries to reference the real
   `/api/health`/`/api/ready` routes instead of the old bare `GET /`
   pattern (noted as a gap in Fase 1, not fixed in this document).
7. Recalibrate Fase 12's latency thresholds once real production baseline
   numbers exist.

None of the above is authorized or scheduled by this document — it is a
design artifact only, per this phase's explicit instruction.
