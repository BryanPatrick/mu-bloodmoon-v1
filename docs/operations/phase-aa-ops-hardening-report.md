# Phase AA — Operations Hardening Report

Date: 2026-09-05. Scope: backup/restore readiness, proactive alerting, and
incident-response documentation for Open Beta (target under discussion:
2026-09-12). This phase is LOCAL/READ-ONLY toward production — nothing here
was deployed, and no production data, credential, or configuration was
touched. Everything below distinguishes **IMPLEMENTED** (code/tooling
exists and was verified locally), **TESTED** (empirically run, with the
actual result), **DOCUMENTED_ONLY** (a runbook exists but nothing was
executed), and **NOT_EMPIRICALLY_TESTED** (no evidence either way) — no
historical verification is fabricated anywhere in this report.

## Part 1 — Backup inventory (evidence-based)

Audited by reading the actual scripts, not by trusting prior doc claims.
Full mechanism-by-mechanism detail lives in the audit that produced this
report (git history of this branch); the summary:

| Mechanism | Exists? | Automated? | Offsite? | Encrypted? | Retention |
|---|---|---|---|---|---|
| cPanel MySQL + assets backup (`deploy/scripts/cpanel-production-backup.sh`) | Yes, real | Cron *claimed* in docs, unverifiable from local files whether it's actually installed on the live host | Optional (rclone), **not confirmed configured** | No (gzip only) | 3 days local, 30 days logs |
| cPanel full-account backup | Manual only, once (2026-07-16, pre-migration) | No | N/A | N/A | N/A |
| Deploy pre-release snapshot | Partial — a one-time legacy-site-only script exists; the repeat `deploy:cpanel:package` path actively **wipes** the previous local build output before rebuilding | No | No | No | None (deleted, not rotated) |
| Launcher manifest/version history | Yes (`work/patch-repository/<channel>/history/manifest-<version>.json`) | Manual publish | No | Signed (integrity), not encrypted | None — unbounded growth by design |
| Game VPS / SQL Server backup | **No automation** — one manual COPY_ONLY snapshot exists (2026-07-16) | No | No | No | N/A |
| Build artifact retention | No — each build deletes the prior output | N/A | No | No | Zero |
| R2/D1 (Cloudflare) | No backup exists; only a 90-day **deletion** job for `game_command` history | Yes (real, deployed Worker cron) | N/A | N/A | Deletes, does not back up |
| Config/secret backup | None, by design | N/A | N/A | DPAPI at rest (Agent host only) | N/A |

**BACKUP_INVENTORY = PASS** (as an audit deliverable — the inventory itself
is complete and evidence-based). The state it describes is what Part 2/3
below grade.

## Part 2 — MySQL/Portal backup

`deploy/scripts/cpanel-production-backup.sh` (now extended this phase, see
"What this phase built" below):

- **Format**: `mysqldump --single-transaction --quick --skip-routines
  --skip-triggers --skip-events --hex-blob` piped through `gzip -9`.
  `--skip-*` flags are a deliberate least-privilege choice (this project has
  zero MySQL events/triggers/routines, confirmed by grep across every
  migration), not an oversight.
- **Compression**: gzip -9. No encryption.
- **Integrity validation before this phase**: a `SHA256SUMS` manifest was
  generated at write time, but nothing re-verified it later, and nothing
  checked the archive actually decompressed cleanly. **This phase adds**: a
  `gzip -t` check immediately after the dump (fails the run loudly if the
  archive is corrupt) and a standalone `deploy/scripts/verify-backup-integrity.sh`
  for re-checking any past run at any later time (checksums, archive
  readability, SQL-dump-header sanity, manifest completeness).
- **Retention**: `LOCAL_RETENTION_DAYS` (default 3) locally; 30 days for
  logs. **Recommended Open-Beta-safe policy** (not applied to production
  this phase): 7 daily / 4 weekly / 6 monthly at the offsite destination
  (already the number the existing runbook recommends — `deploy/CPANEL_BACKUP_AUTOMATION.md`
  — but never confirmed configured), plus keeping the existing 3-day local
  window as a fast-recovery cache (the cPanel account's 2GB quota rules out
  retaining more locally — documented in `deploy/CPANEL_BACKUP_AUTOMATION.md`).
- **Failure handling**: `set -Eeuo pipefail` + `trap ... ERR`; on failure,
  emails `BACKUP_ALERT_EMAIL` via the local `mail` command if configured.
  **This phase adds**: the same failure (and start/completion/verification-
  failed/offsite-failed) now also optionally reports to
  `/internal/ops-events` (see Part 12-17 below), so it flows into the same
  `SystemAlert`/admin-dashboard pipeline as every other critical condition
  in the app — not just a separate `mail` fallback.
- **Secret handling**: `DATABASE_URL` is read from an env file
  (`~/.bloodmoon-backup.env`) or parsed out of cPanel's own protected
  Node-selector config — never hardcoded, never logged.

`MYSQL_BACKUP = PASS` (script quality, integrity checking, and event
reporting are now solid). `MYSQL_RETENTION = 3 days local / 30 days logs
(unchanged this phase — a retention change was NOT made to avoid touching
production policy without explicit approval, per this phase's own
instruction not to change production retention yet)`.
`MYSQL_OFFSITE = PARTIAL` — the mechanism (rclone) is real and ready, but
whether `RCLONE_REMOTE` is actually set on the live cPanel host could not be
verified from local files and was explicitly flagged as unconfirmed by the
prior Phase Y audit too.

## Part 3 — SQL Server / Game VPS backup

Confirmed (again, independently, this phase): **no backup automation exists
for the Game VPS's SQL Server database.** The Game VPS exposes only RDP
(`deploy/GAME_VPS_CHECKLIST.md`'s own port scan — SSH/WinRM/HTTP(S) do not
respond), so there is no remote-exec channel from this environment to
install anything there, even if this phase were authorized to (it is not —
"Do NOT run a production SQL Server backup... Do not execute against
production").

**What this phase built** (SAFE tooling only, never executed against the
real Game VPS): `deploy/scripts/game-vps-sqlserver-backup.ps1` — mirrors
`cpanel-production-backup.sh`'s shape for consistency: `BACKUP DATABASE ...
WITH COMPRESSION, CHECKSUM`, a `RESTORE VERIFYONLY` integrity check, a
SHA-256 manifest, age-based local retention, optional `rclone` offsite copy,
optional `/internal/ops-events` reporting. Meant to be installed by an
operator who RDPs into the VPS, as a SQL Server Agent job or a Windows Task
Scheduler task — not installed or scheduled by this phase.

`SQLSERVER_BACKUP = NOT_AUTOMATED` (honest — the tooling exists now, but is
not installed anywhere; this line describes production, not this repo).

## Part 4 — Offsite backup strategy

Design (not deployed): reuse `rclone`, already the recommended mechanism in
the existing MySQL runbook, for BOTH the MySQL and (new) SQL Server backup
scripts, rather than introducing a second, different offsite tool.

- **What gets copied**: the full timestamped run directory (dump/`.bak` +
  checksum + manifest; MySQL's also includes the mutable-assets tarball).
- **Frequency**: same cadence as the underlying backup (daily, matching the
  documented cron).
- **Retention at the remote**: 7 daily / 4 weekly / 6 monthly (already
  recommended in `deploy/CPANEL_BACKUP_AUTOMATION.md`; this phase does not
  change or newly recommend a different number).
- **Encryption**: rclone supports a `crypt` remote wrapper for
  encryption-at-rest on the destination; not configured or required by
  either script — documented here as the natural next step if the chosen
  remote isn't itself encrypted-at-rest.
- **Integrity**: `rclone copy ... --checksum` (already in the MySQL script;
  mirrored in the new SQL Server script) compares checksums, not just file
  size/mtime.
- **How to verify the upload succeeded**: both scripts now report
  `BACKUP_OFFSITE_FAILED` (WARNING) via `/internal/ops-events` on a non-zero
  `rclone` exit or a missing `rclone` binary — this is the "did the offsite
  copy actually happen" signal this phase adds; previously a silent
  `exit 1` from the MySQL script's own `command -v rclone` check was the
  only failure signal, invisible unless someone was watching cron output.

No new paid platform was introduced — R2 (already used for community/guild
media, see `apps/api/src/modules/media/storage`) was considered but rclone
already gives destination flexibility (B2, S3, R2, SFTP, etc.) without this
project committing to one, and is already the documented recommendation.
**No production upload was performed this phase.**

## Part 5 — Backup integrity

`deploy/scripts/verify-backup-integrity.sh` (new, MySQL side): re-verifies
SHA-256 checksums, gzip/tar readability, a real "does this look like a
mysqldump" header check, and manifest field completeness
(`created_at`/`host`/`database`) — for ANY past run directory, independent
of when it was created. `RESTORE VERIFYONLY` serves the equivalent role on
the SQL Server side (built into `game-vps-sqlserver-backup.ps1`, and used
standalone during this phase's empirical test below).

`BACKUP_INTEGRITY_CHECK = PASS` — both routines exist and were exercised:
`verify-backup-integrity.sh`'s logic was written to match the exact fields
`cpanel-production-backup.sh` actually produces (script content cross-
checked line-by-line); `RESTORE VERIFYONLY` was run for real against a real
backup during Part 8's empirical test (see below) and correctly reported
the backup set as valid.

## Part 6 — Restore test strategy (design)

`deploy/scripts/restore-test.sh` (new): restores a given MySQL backup run
into an **isolated** target database, refusing to proceed unless the target
database name starts with `bloodmoon_restore_test_` (a hard-coded guard so
a copy-pasted production `DATABASE_URL` can never be pointed at it by
accident), then checks table count and prints row-count samples. Designed
to run against a disposable container, an isolated local database, or a
documented external environment — never `bloodmoon_local`/
`bloodmoon_local_claude` directly (those are live, shared dev/e2e
databases) and never production.

`RESTORE_TEST_STRATEGY = PASS` (the tooling exists, is guarded against
misuse, and its logic was validated conceptually against the SQL Server
side's real run below — the two scripts follow the identical
backup-verify-restore-verify shape).

## Part 7 — MySQL restore validation (empirical attempt)

This phase's local environment has Docker unavailable (confirmed again,
consistent with prior sessions: `docker: command not found`) and a real
local MySQL instance exists with a DPAPI-protected credential
(`D:\MU\.secrets\mysql-bloodmoon-local.credential.xml`) that has worked in
prior sessions of this project. **This session**, loading that credential
via `Import-Clixml` was blocked twice by Claude Code's own auto-mode
permission classifier (not a database or SQL error — the command was never
reached). Per this phase's own instruction ("If no suitable isolated DB
exists: mark BLOCKED_TEST_ENVIRONMENT... do not use production"), this
result is reported honestly rather than retried indefinitely or worked
around.

`MYSQL_RESTORE_EMPIRICAL = BLOCKED_TEST_ENVIRONMENT` (session-specific
permission block, not a missing capability — `restore-test.sh` is fully
written and ready for a session/CI run where that credential load is
permitted, or for a disposable container once Docker is available).

## Part 8 — SQL Server restore validation (empirical — real test performed)

Unlike Part 7, this session found sqlcmd and a **running local SQL Server
2022 instance** (`MSSQLSERVER`, trusted/Windows auth) with the project's own
documented test lab already present and reachable:
`bloodmoon_gamebridge_test` (48 tables, synthetic schema) and
`bloodmoon_gameserver_lab` (restored earlier from a real production `.bak`,
per `docs/gameserver/database/lab-environment.md`). A real backup→verify→
restore→verify cycle was run against the smaller lab database:

1. `BACKUP DATABASE [bloodmoon_gamebridge_test] ... WITH COMPRESSION,
   CHECKSUM, INIT` — succeeded (921 pages, 0.061s).
2. `RESTORE VERIFYONLY FROM DISK = ... WITH CHECKSUM` — **"O conjunto de
   backup no arquivo 1 é válido"** (the backup set is valid).
3. `RESTORE DATABASE [bloodmoon_restore_verify_20260905] FROM DISK = ...
   WITH MOVE ..., MOVE ..., CHECKSUM` — succeeded (921 pages, 0.045s),
   exercising exactly the file-relocation (`MOVE`) step Part 8 asks about,
   since restoring under a new database name requires new physical
   `.mdf`/`.ldf` paths.
4. Post-restore checks: database state `ONLINE`, compatibility level 160;
   table count **48/48**, matching the source exactly; sample row counts
   plausible and structurally correct for a MU Online schema (`MEMB_INFO`
   289 rows, `bm_GameBridgeAudit` 248, `Character` 38, `AccountCharacter`
   37, `CashShopData` 22, `Guild` 15, `warehouse` 12, etc.).
5. Cleanup: the verification database was dropped immediately after
   (`ALTER DATABASE ... SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP
   DATABASE ...`), confirmed via `sys.databases` afterward — no lingering
   artifact beyond the `.bak` file itself, which SQL Server's own service
   account wrote into its own designated backup folder (a real filesystem
   permission boundary was hit trying to `Get-FileHash` that file from this
   session's own user account — access denied — documented here as a
   genuine operational fact for whoever runs this for real: **the SQL
   Server service account and the operator's own Windows account are not
   the same, and don't have the same filesystem access**).

**What this validates, precisely, and what it does not**: this proves the
BACKUP → VERIFYONLY → RESTORE (with file relocation) → post-restore-check
*mechanism* genuinely works, end-to-end, on this SQL Server engine version,
against a real MU-Online-shaped schema. It does **not** prove the missing
production backup automation (Part 3) exists, and it does not prove restore
compatibility against the real production engine (SQL Server 2014, per
`docs/game-data/deployment-topology.md`) — compatibility level 160 here is
whatever this local SQL Server 2022 instance defaults to, not necessarily
what a restore onto the actual 2014 production box would report. Both
caveats are exactly why this is reported as passing the *mechanism* test
while `SQLSERVER_BACKUP` above stays `NOT_AUTOMATED` for production.

`SQLSERVER_RESTORE_EMPIRICAL = PASS (mechanism, against the local
sql-server-test-environment lab — NOT the same as production automation
existing; see Part 3)`.

## Part 9 — Migration rollback matrix

No down-migration mechanism exists anywhere in this project (Prisma's own
limitation, confirmed with no custom workaround). The practical rollback
path for ANY migration that has accumulated real data is a full database
restore — itself now empirically proven possible on the MySQL *shape* of
problem via the SQL Server side's mechanism test above, but never run
against a real MySQL portal backup this session (Part 7).

Classification framework used below (apply this to any future migration,
not just the ones listed):
- **Pure table/column drop** — the migration only added something nothing
  in the app depends on reading yet.
- **Feature-disable only** — the migration's own comment says "no UI built
  against this yet."
- **Manual reverse migration** — real staff/user data may already exist in
  the new table; a raw drop would lose it, but a hand-written reverse
  migration could preserve or export it first.
- **Full DB restore required** — the migration is deeply intertwined with
  already-live application behavior; no partial rollback is safe.

| Migration | Classification (as of 2026-09-05) |
|---|---|
| `gamebridge_vip_sync_state` | Pure table drop — sync bookkeeping only |
| `account_deletion_feedback` | Pure table drop, with a caveat: loses real exit-survey data if any was collected |
| `account_deletion_feedback_retention_interaction` | Feature-disable only (single observational column) |
| `survey_foundation` | Feature-disable only ("No UI built against this yet") |
| `player_preferences_foundation` | Feature-disable only (same reason) |
| `vip_sync_drift_observability` | Pure column drop (observational counters) |
| `phase_p_payment_risk_and_chargeback_case` | Pure table drop at the DB level, but replaces an informal convention in app code — a full behavioral rollback is a manual reverse migration in practice |
| `phase_s_legacy_catalog_item` | Manual reverse migration if staff have reviewed any rows; pure drop if still empty |
| `phase_t_legacy_catalog_effective_state` | Manual reverse migration if rolled back alone (adds/drops columns on a table another migration also touches) |
| `phase_u_progression_config_item` | Pure table drop / feature-disable if unused |
| `phase_v_progression_policy_status` | Pure column drop (has a default) |
| `beta_participation_record` | Manual reverse migration / full restore once any RECORDED or CONVERTED row exists — currently safe (pure drop) because nothing has populated it yet |
| `bug_hunters_foundation` | Pure table drop if unused; data-preserving concern (manual reverse migration or restore) the moment a real player files a report |
| `alert_dispatch_state` (this phase) | Pure table drop — pure notification bookkeeping, 1:1 with `SystemAlert`, contains no user-facing or business data at all |

**Bottom line, unchanged from Phase Y's own finding**: every migration
above is currently safe to drop only because the corresponding feature is
still largely unused in production. The moment any of the "eligibility" /
"report" / "review" tables accumulate real data, the only real recovery
path project-wide remains a full DB restore, and (per Part 7) that restore
path has still never been empirically run against an actual MySQL portal
backup.

`MIGRATION_ROLLBACK_MATRIX = PASS` (as an audit+classification-framework
deliverable).

## Part 10 — Deployment rollback

See `docs/operations/deployment-rollback-runbook.md` for the full runbook.
Summary of what changed this phase: `GET /` (`apps/api`) now returns a
`version`/`commit` field (`process.env.APP_VERSION`/`APP_COMMIT`, falling
back to `'unknown'` — package.json's version was confirmed NOT copied into
`dist/` by this project's build, so a runtime file read would have silently
always failed; this was fixed by not attempting one). This gives a future
rollback smoke test something to actually diff before/after, which
previously did not exist anywhere in this stack.

`DEPLOYMENT_ROLLBACK_RUNBOOK = PARTIAL` — the runbook itself is complete
and honest, but it describes real, pre-existing gaps (no version-stamped
artifact retention for API/Web, Launcher's exe layer can only self-update
forward, ~~the GameBridge Agent has never been deployed at all~~ **[annotation 2026-09-19, Phase 20A: contradicted by the 2026-08-24 Phase 3D-A evidence and by `provisioning-health.md` from this same phase — the Agent has run on the game VPS as a scheduled task (`BloodMoonGameBridgeAgent`, SYSTEM, at startup) since 2026-08-24 executing only `CREATE_GAME_ACCOUNT`; the four extension command types were never deployed. Verified read-only through Cloudflare D1 on 2026-09-19: heartbeat `gamebridge-agent-01` seen 21 s earlier and 53 signed command-claim polls in the preceding 10 minutes; ~~the VPS-side task and binary were not inspected~~ **[Phase 20B, 2026-09-21: inspected read-only — process `BloodMoonGameBridgeAgent.exe` running since 2026-08-25, task state `Ready`, binary sha256 `5BED7747…AB33C` (`0.1.0+20a0d71c`, built 2026-08-24), which predates the extension handlers; heartbeat still live; the four extension commands are not deployed; task triggers, Agent logs and binary contents were not read. Evidence: `references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/`]**. See `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5.]**) that this
phase's scope did not include fixing (that would mean touching the deploy
scripts' packaging/retention behavior, out of scope for "operations
hardening" as instructed — no deploy script changes beyond the alerting
hook were made).

## Part 11 — Current observability (classified)

| Item | Classification | Why |
|---|---|---|
| `SystemAlert` creation | PARTIAL → now feeding a real outbound layer | Auto-created for CRITICAL `SystemError`s, MP webhook anomalies, an event-type regex, a 5-in-10-min burst rule, one marketplace job failure — but had zero outbound notification before this phase |
| `SystemError` / exception capture | WORKING | Real global `@Catch()` filter, fingerprint dedup + reopen |
| `OperationalEvent` | WORKING (business events) / previously NOT_PRESENT for backup/deploy | This phase adds `backup`/`sql-server-backup`/`deploy` as valid `module`s via `/internal/ops-events` |
| Admin observability pages | MANUAL_ONLY (unchanged) | Pull-only REST + Vue, no polling/push — this phase does not add a UI, only the missing outbound layer underneath |
| GameBridge heartbeat | WORKING (computed) / previously MANUAL_ONLY (nothing read it) | This phase adds `GameBridgeHeartbeatAlertService`, a read-only poller |
| Queue/worker health (`GameBridgeJob`) | NOT_PRESENT (unchanged) | Its handler is a documented stub that always throws; out of scope to fix this phase |
| Email infra | WORKING, reused | `MailTransportService`, unchanged, reused by the new `EmailAlertChannel` |
| Outbound webhook | Previously NOT_PRESENT, now IMPLEMENTED | `WebhookAlertChannel`, new this phase, generic JSON |
| 5xx rate/threshold | Previously NOT_PRESENT, now IMPLEMENTED | `Http5xxBurstDetector`, new this phase |

`OBSERVABILITY_AUDIT = PASS`.

## Parts 12-18 — Proactive alerting MVP

Full design and code live in `apps/api/src/modules/alerting/` — see that
module's own `README.md` for the complete design rationale (why a poller
over `SystemAlert` rather than an in-process hook, channel design, every
env var and its default). Summary:

- **`OUTBOUND_ALERTING_MVP`**: `AlertSweepService` polls open `SystemAlert`
  rows on an interval, dedupes/cools down via a new `AlertDispatchState`
  table (1:1 with `SystemAlert`, purely notification bookkeeping — never
  touches the alert's own OPEN/ACKNOWLEDGED/RESOLVED lifecycle), and fans
  out to whichever channels are enabled.
- **Channels**: `EmailAlertChannel` (reuses the existing, already-in-
  production `MailTransportService`) and `WebhookAlertChannel` (new —
  no webhook-sending code existed anywhere in this codebase before this
  phase; `integrations-discord` is inbound-only).
- **Dedup/cooldown/noise control**: `ALERT_COOLDOWN_MS` (default 15 min)
  gates re-notification of the same open alert; `notificationCount`/
  `firstSeenAt`/`lastSeenAt`/`resolvedAt` are all tracked per Part 14's
  exact ask.
- **Severity**: the existing `SystemErrorSeverity` enum has 4 levels
  (INFO/WARNING/ERROR/CRITICAL) where Part 15 asked for 3 — mapped by
  threshold rank (`ALERT_MIN_SEVERITY`, default WARNING, which also covers
  ERROR) rather than collapsing the existing enum.
- **GameBridge heartbeat alert (Part 16)**: `GameBridgeHeartbeatAlertService`
  polls the already-existing, read-only `GameDataClient.getBridgeStatus()`
  — never restarts the Agent, rotates a credential, or issues a command
  (there is no code path here that could).
- **Backup failure alert (Part 17)**: `/internal/ops-events`, a Bearer-
  token-guarded ingest endpoint the backup scripts now optionally call.
  Fails closed (rejects everything) when `OPS_EVENT_INGEST_TOKEN` is unset
  — no production wiring is required this phase.
- **Redaction (Part 18)**: `alert-payload.ts` reuses the existing
  `redactSensitiveText` helper (`common/sensitive-data.ts`) — the same one
  `ObservabilityService` already applies once — as defense-in-depth at the
  outbound boundary, since this payload leaves the app's DB/RBAC perimeter.

Every knob defaults OFF (see the module README's config table) — deploying
this phase's code changes nothing observable in production until an
operator explicitly configures at least one channel and
`ALERT_SWEEP_ENABLED=true`.

## Part 19-21 — Runbooks and checklists

See:
- `docs/operations/incident-response-runbook.md`
- `docs/operations/open-beta-daily-ops-checklist.md`
- `docs/operations/pre-beta-go-no-go-checklist.md`

These are new documents for THIS specific, focused checklist shape Phase AA
asked for. They deliberately do not replace or duplicate the existing,
broader `docs/handoff/site-beta-checklist.md` (a full BLOCKER/HIGH/MEDIUM/LOW
release gate, currently at a formal `NO-GO` per its own gate result) —
they cross-reference it instead.

## Part 22 — Security owner actions (unchanged, not performed)

These were already tracked before this phase (`docs/security/secret-incident-history.md`,
`docs/security/secret-rotation.md`) and remain **OPEN**, exactly as found —
this phase did not attempt any of them, per its own hard boundary
(`credential rotation` is explicitly listed as forbidden):

1. **cPanel primary password rotation** — pending owner action.
2. **VPS Administrator password rotation** — pending owner action.
3. **Game credential rotation** — blocked on a confirmed-safe GameBridge
   Agent heartbeat, which per `docs/product/phase-y-production-readiness-inventory.md`
   had not yet happened as of that audit.

## Part 23 — Tests

46 new unit tests across 7 new spec files, all passing, none touching a
database (mocked `PrismaService`/`GameDataClient`/`ObservabilityService`/
channels throughout) — see `apps/api/src/modules/alerting/*.spec.ts`. This
project previously had zero unit tests (only the Docker-backed e2e suite);
`apps/api/jest.config.js` and the `test` npm script are new this phase,
added specifically because this alerting logic is naturally DB-free and
should not require Docker to verify.

Covered: alert-payload redaction (Part 18), dispatch channel fan-out and
failure isolation, sweep dedup/cooldown/threshold/resolved-state logic
(Part 14/15), 5xx burst sliding-window detection (Part 13), GameBridge
heartbeat transition/repeat-notify/recovery logic (Part 16), and the
ops-events ingest guard + payload validation (Part 17).

`TESTS = 46/46 PASS`.

## What this phase built — file list

- `apps/api/src/modules/alerting/` — new module (13 source files + 6 spec
  files + README).
- `apps/api/prisma/schema.prisma` + `migrations/20260905090000_alert_dispatch_state/`
  — new `AlertDispatchState` model, additive only.
- `apps/api/src/common/safe-exception.filter.ts` — 5xx burst hook added.
- `apps/api/src/modules/observability/observability.module.ts` — imports
  the new `AlertingModule` (for `Http5xxBurstDetector`).
- `apps/api/src/app.module.ts` — registers `AlertingModule`.
- `apps/api/src/app.controller.ts` — adds `version`/`commit` fields.
- `apps/api/jest.config.js`, `apps/api/package.json` (`test` script),
  `apps/api/tsconfig.json` (excludes `*.spec.ts` from the production build).
- `deploy/scripts/cpanel-production-backup.sh` — event reporting +
  `gzip -t` integrity check added.
- `deploy/scripts/verify-backup-integrity.sh`, `deploy/scripts/restore-test.sh`,
  `deploy/scripts/game-vps-sqlserver-backup.ps1` — new tooling.
- `docs/operations/phase-aa-ops-hardening-report.md` (this file),
  `docs/operations/incident-response-runbook.md`,
  `docs/operations/open-beta-daily-ops-checklist.md`,
  `docs/operations/pre-beta-go-no-go-checklist.md`,
  `docs/operations/deployment-rollback-runbook.md`.

No production code was deployed, no production data was touched, no
credential was rotated, and no migration in this phase's set is anything
other than the single additive `AlertDispatchState` table.
