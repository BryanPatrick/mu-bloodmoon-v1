# Production Node/LSAPI 503 — incident closeout

Status: **RECOVERED; exact root cause and recovery mechanism unconfirmed**

Incident date: 2026-09-15 (America/Sao_Paulo)

Closeout evidence: 2026-09-16 12:31 BRT
Scope: `bmweb` and `bmapi` on the shared cPanel/CloudLinux/LiteSpeed host

## SUMMARY

The public web and API Node routes returned LiteSpeed's standard HTTP 503
page while direct PHP on the main domain returned HTTP 200. Both Node
application logs showed `MODULE_NOT_FOUND` for launchers under
`/usr/local/lsws/fcgi-bin/`, before the application entrypoints. The
official Node Selector restart for each application did **not** restore
service immediately. Both routes were observed healthy the next day.

`ROOT_CAUSE_CONFIRMED = NO`. The most likely failing **layer** was the
LiteSpeed/CloudLinux/CageFS Node integration, with high confidence;
the exact failure and what restored it remain unknown. Do not attribute
recovery to our restarts or to a provider intervention without evidence.

## IMPACT

- Public portal and API were unavailable on the tested Node routes.
- Direct PHP remained available; this did not validate Node or the API.
- Exact incident start, total duration, affected request count, and
  authenticated user impact are unknown because an external availability
  monitor was not yet running.
- No database, GameBridge, payments, DNS, deploy, or application-code
  changes were made during this incident closeout.

## TIMELINE

All times BRT unless marked otherwise. A timestamp for an observation
is **not** assumed to be the beginning of the underlying state.

| Time | Evidence and result |
|---|---|
| 2026-09-14, time not preserved | Post-deploy smoke passed for `GET /api` and public web routes, with no observed new 5xx. See the [deployment manifest](../deployments/deploy-2026-09-14-api-web-production-deploy/deploy-manifest.md). |
| 2026-09-15, before 14:45 | Independent audits identified LiteSpeed 503 for web and API, direct PHP 200, and current `MODULE_NOT_FOUND` entries for `lsnodesm.js` (web) and `lsnode.js` (API). Their exact first occurrence is not timestamped in `stderr.log`. |
| 2026-09-15 14:45 | Codex baseline: `/index.php` 200 (PHP 8.1.34); `/` 503 and `/api` 503 (LiteSpeed HTML, 807 bytes). |
| 2026-09-15, between 14:45 and 14:47 | Official Node Selector **bmapi** restart. Selector still indicated started; `/api` remained 503 at 14:47:38. |
| 2026-09-15, between 14:47 and 14:48 | Official Node Selector **bmweb** restart. `/` remained 503 at 14:48:18. |
| 2026-09-15 14:51 | Last recorded verification in this audit: both web and API still 503. Current log tails continued to contain the same missing-launcher errors. |
| 2026-09-16 12:14 | First recorded recovery verification: direct PHP, web `/`, and API `/api` all returned 200; API body reported `status=online`. |
| 2026-09-16 12:27 | A separate one-round status check again returned 200 for PHP, web, and API. |
| 2026-09-16 12:31 | Closeout smoke: `/`, `/login`, `/wiki`, and `/api` all returned 200 via LiteSpeed. |

Known recovery window: **after 2026-09-15 14:51 and by 2026-09-16
12:14 BRT**. There is no evidence identifying the transition point
within that window.

## OBSERVED SYMPTOMS

- PHP direct route: HTTP 200, PHP content type and `X-Powered-By: PHP/8.1.34`.
- Web and API Node routes: identical LiteSpeed HTTP 503 HTML page,
  rather than an application-generated response.
- `bmweb/stderr.log`: repeated `Cannot find module
  '/usr/local/lsws/fcgi-bin/lsnodesm.js'` on Node 22.17.0.
- `bmapi/stderr.log`: repeated `Cannot find module
  '/usr/local/lsws/fcgi-bin/lsnode.js'` on Node 20.19.3.
- cPanel Selector showed both applications as `started` despite request failure.

## WHAT WORKED

- PHP, TLS, primary vhost, and basic LiteSpeed response path.
- cPanel access and read-only inspection on 15 September.
- Both Node applications after recovery, verified by the four-route
  read-only smoke on 16 September.

## WHAT FAILED

- Both Node routes during the incident.
- The two official Selector restarts as **immediate** remediation.
- An unchanged configuration could not be re-saved: the Selector's
  `Save` control remained disabled while all fields were unchanged.
  No value was changed merely to force it enabled.
- Current process PID/CWD/socket metadata and independent localhost
  boot could not be collected safely from the available browser-only
  access. Those checks remain unknown, not negative results.

## DIAGNOSTIC EVIDENCE

- Selector settings matched the account routing files and actual
  entrypoints: `bmweb` uses Node 22.17.0 with
  `.output/server/index.mjs`; `bmapi` uses Node 20.19.3 with `server.js`.
- Corresponding `nodevenv` paths and critical file structure were
  present. Full executable/link integrity and ownership were not
  established.
- No duplicate Passenger blocks, mixed Node versions, or stale
  account-owned route paths were found in the inspected active routing
  files. The API `.htaccess` read-only signature was identical before
  and after the Selector restarts.
- On 15 September the cPanel account used 3,091.17 of 4,000 MB
  (77.28%; 908.83 MB free). Same-day, CageFS-visible host evidence
  recorded 173 GB filesystem free and 4% inode usage. This does not
  prove global host health, but it argues against account storage
  exhaustion. See [host storage preflight](../operations/host-storage-preflight.md).
- Current resource counters during the audit were low. The Resource
  Usage dashboard reported an I/O limit reached sometime in the
  preceding 24 hours, but exposed no timestamp or snapshot that could
  correlate it with the outage.
- The 14 September deployment [manifest](../deployments/deploy-2026-09-14-api-web-production-deploy/deploy-manifest.md)
  records successful post-deploy smoke. The API package was not newly
  uploaded in that rollout.
- Old web build/module errors and an old API Prisma `P1000` in stderr
  were not promoted to current root cause. The missing host launchers
  were the relevant incident-time log tail.
- Log evidence was **not deleted, truncated, rotated, or copied into
  this repository**. Last File Manager metadata observed before the
  restarts on 15 September: `/home/mubloodxz/bmweb/stderr.log`, about
  866.24 KB, mtime 13:27; `/home/mubloodxz/bmapi/stderr.log`, about
  1.65 MB, mtime 13:27. Their present sizes/mtimes are **UNKNOWN**:
  the cPanel session had expired by the 16 September closeout.

## ROOT-CAUSE ASSESSMENT

| Candidate | Evidence for | Evidence against / gap | Confidence |
|---|---|---|---|
| LSAPI / CloudLinux / CageFS / hosting Node integration | Two independently configured apps failed resolving provider-owned launchers before their entrypoints. | No root/host-level inspection or provider change record; exact mechanism unknown. | **High for layer; low for precise mechanism** |
| Stale Selector registration | `started` was inconsistent with request-time 503. | Official restarts did not immediately resolve either app. | Low–medium |
| I/O/resource limit | Dashboard reported a recent I/O-limit event. | No correlated timestamp; healthy current counters; does not directly explain launcher `MODULE_NOT_FOUND`. | Low |
| Account code, deployment, route, nodevenv, storage | These can cause 503 generally. | Post-deploy smoke passed; two apps shared a pre-entrypoint failure; visible config and storage were coherent. | Very low for this shared symptom |

`ROOT_CAUSE_CONFIRMED = NO`; `WHAT_FIXED_IT = UNKNOWN`.

## RECOVERY

Both services were first observed healthy on 16 September at 12:14
BRT, and all four closeout smoke routes returned 200 at 12:31 BRT.
No restart, re-save, deploy, or production write was performed during
closeout. The 15 September restarts did not resolve the 503 in their
immediate follow-up tests and must **not** be credited as the fix.

## UNRESOLVED QUESTIONS

1. Did the hosting provider perform maintenance or an intervention
   between 15 September 14:51 and 16 September 12:14 BRT?
2. Was LiteSpeed, CloudLinux, CageFS, Node Selector, or a shared Node
   launcher updated, remounted, or globally reloaded in that interval?
3. Did host-wide I/O pressure or a resource fault coincide with the
   unavailable window?
4. What are the current log metadata and process identities after
   recovery? These were not freshly available during closeout.

## FOLLOW-UPS

### Provider timeline question — draft only, not sent

> Olá. Para fechar nossa linha do tempo interna, poderiam informar se
> houve alguma intervenção ou manutenção entre 15/09 às 14:51 e 16/09
> às 12:14 (horário de Brasília)? Nesse intervalo ocorreu alguma
> correção ou reinicialização global de LiteSpeed, CloudLinux, CageFS
> ou Node.js Selector, ou algum evento de pressão de I/O no host?
> Obrigado.

### Security follow-up — classification and plan only

`/home/mubloodxz/public_html/api/.htaccess` contains `SetEnv`
values for real credentials/key material as well as non-sensitive
configuration. Only variable **names** are recorded here:
`DATABASE_URL`, `GAME_COMMAND_PORTAL_SECRET`,
`GAME_CREDENTIAL_KEYS_B64`, `GAME_CREDENTIAL_KEYS_JSON`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASSWORD`,
`TURNSTILE_SECRET_KEY`, `TWO_FACTOR_ENCRYPTION_KEY_V2`, and
`TWO_FACTOR_ENCRYPTION_KEY_V3`. These are potentially active because
the Selector also displayed corresponding runtime variables during the
15 September audit; current process environment was not read.
`LIKELY_ACTIVE = YES` (not independently verified for every consumer).
`ROTATION_LIKELY_REQUIRED = YES`, subject to a consumer/version map;
blind rotation could break login, 2FA, mail, CAPTCHA, DB access, or
GameBridge. The Selector supports environment variables, so a
**candidate** migration destination exists; whether it safely avoids
duplicating secrets in `.htaccess` must be verified before changing
anything. `SAFE_MIGRATION_PATH_AVAILABLE = UNKNOWN` until that behavior
and precedence are proven.

No security migration phase was executed. Separate proposed task:

- **A — Inventory:** enumerate secret names, provenance, exposure and
  every real consumer without printing values.
- **B — Destination:** verify a supported, access-controlled runtime
  secret destination and `.htaccess`/Selector precedence; retain a
  tested fallback access path.
- **C — Migration:** stage each configuration change with a recoverable
  backup and exact scope; no bulk rewrite.
- **D — Controlled reload:** verify process identity and storage, then
  reload one component at a time in an approved production window.
- **E — Rotation:** rotate credentials/key rings only with their
  consumer/version maps and overlap requirements; follow the
  [game-command secret rotation](../security/secret-rotation.md) and
  [2FA key rotation](../security/two-factor-key-rotation.md) procedures.
- **F — Validation:** verify application, auth, mail, CAPTCHA, DB and
  relevant command flows without exposing secret values.
- **G — Retirement:** remove old values only after successful
  validation and rollback-window completion.

### External monitoring

The absence of an independent monitor left the incident start and
recovery times uncertain. Implement the existing
[external availability monitoring design](../operations/external-availability-monitoring.md)
as a separately approved phase. It calls for checks outside the
hosting account, body-shape validation, alert thresholds and recovery
confirmation. Nothing was configured in this closeout.

## PREVENTION / DETECTION IMPROVEMENTS

- External checks for web, health and readiness, with timestamped
  status/body classification; use `/api` until the newer health and
  readiness endpoints are actually deployed.
- Preserve and timestamp sanitized Node/LSAPI error excerpts in future
  incidents without copying complete stderr or environment values.
- Ask the provider for a factual maintenance/resource timeline rather
  than inferring a host intervention from spontaneous recovery.
- Keep the [host storage preflight](../operations/host-storage-preflight.md)
  before future space-consuming host operations.
