# Incident Response Runbook

Phase AA. A concise, practical runbook for the scenarios most likely to
actually happen during Open Beta. Written for whoever is on call — assume
they have cPanel browser access and Launcher/Discord/email, but **no
SSH/shell to the Portal host** (confirmed repeatedly across this project's
history) and only RDP to the Game VPS.

Every entry follows the same shape: DETECT, IMMEDIATE ACTION, DO NOT DO,
ROLLBACK, VERIFY, ESCALATE, DOCUMENT.

---

## API unavailable

- **DETECT**: `GET https://<api-host>/` stops responding or returns 5xx;
  Web pages that call the API start failing; (once configured this phase)
  a WARNING/CRITICAL alert email/webhook.
- **IMMEDIATE ACTION**: check cPanel's Node.js Selector app status for
  `bmapi`. A known prior incident (`deploy/CPANEL_NODE_DEPLOY.md`) found
  CloudLinux's Passenger can keep a stale process alive after a normal
  restart click — if restarting from the UI doesn't clear it, the stale
  PID must be identified and killed via whatever cPanel exposes for that
  (Node Selector's own restart, or a support ticket to the host if no
  further self-service option exists — there is no SSH to do this by hand).
- **DO NOT DO**: do not run a fresh `prisma migrate deploy` against
  production while diagnosing — a migration failure mid-incident compounds
  the problem. Do not restart via any means other than cPanel's own UI/API.
- **ROLLBACK**: see `docs/operations/deployment-rollback-runbook.md` (API
  section) — there is currently no retained previous artifact by default;
  rollback means re-deploying a known-good git commit's build.
- **VERIFY**: `GET /` returns 200 with a real `version` field (added this
  phase); hit one real authenticated endpoint (e.g. `/api/wiki/summary`).
- **ESCALATE**: if the Node Selector UI itself is unresponsive or the host
  appears down, escalate to the hosting provider's support channel.
- **DOCUMENT**: record start/end time, root cause (if known), and whether
  a stale Passenger process was involved (for the next person's pattern
  matching) in `docs/operations/` or the team's incident channel.

## Web unavailable

- **DETECT**: the public site returns 5xx/timeout; API itself is healthy
  (differentiates this from "API unavailable" above).
- **IMMEDIATE ACTION**: same pattern as API — check cPanel Node.js
  Selector for `bmweb`.
- **DO NOT DO**: do not assume it's an API problem and start touching
  `bmapi` first — verify independently.
- **ROLLBACK**: see deployment rollback runbook (Web section).
- **VERIFY**: load the homepage and one authenticated page (e.g.
  `/painel/conta`).
- **ESCALATE**: hosting provider if the Node Selector UI is itself down.
- **DOCUMENT**: same as above.

## Launcher updater broken

- **DETECT**: players report the Launcher fails to self-update, or the
  update download 404s.
- **IMMEDIATE ACTION**: check whether `manifest.json` at
  `update.mubloodmoon.com.br` was actually renamed from `manifest.next.json`
  correctly, and whether the referenced files/exe actually exist at the
  paths the manifest points to (`docs/launcher/content-publishing.md`,
  `scripts/publish-bloodmoon-patch.mjs`).
- **DO NOT DO**: do not re-publish a new patch on top of a broken one to
  "fix forward" without first confirming what's actually broken — the
  Launcher's self-updater only ever moves forward (confirmed this phase:
  `LauncherUpdateService.IsUpdateRequired` only compares `remoteVersion >
  currentVersion`), so a bad manifest published forward cannot be
  auto-corrected by clients downgrading.
- **ROLLBACK**: manually re-point `manifest.json` back at the last known-
  good `history/manifest-<version>.json` (retained indefinitely by
  `publish-bloodmoon-patch.mjs` — this history IS a real, working rollback
  mechanism, unlike the exe binary itself).
- **VERIFY**: run the Launcher locally against the corrected manifest and
  confirm it reports "up to date" or successfully updates.
- **ESCALATE**: if the update host itself (not just the manifest) is
  unreachable, treat as a hosting/DNS incident.
- **DOCUMENT**: which manifest version was bad, which was restored.

## MySQL (Portal) unavailable

- **DETECT**: API 5xx with database-connection-shaped errors (the existing
  `SafeExceptionFilter` already classifies `database|deadlock|rollback|
  connection refused` messages as CRITICAL); `SystemError` entries with
  those patterns.
- **IMMEDIATE ACTION**: confirm via cPanel's MySQL databases page that the
  database exists and the account isn't suspended/over quota. Check for an
  in-progress backup (`deploy/scripts/cpanel-production-backup.sh` holds a
  brief lock via `flock` — it should never hold the DB itself locked for
  long, `--single-transaction` is used specifically so `mysqldump` doesn't
  block writers).
- **DO NOT DO**: do not attempt a restore over the live database as a first
  response — a restore is a last resort after confirming the database
  itself, not just the app's connection to it, is actually the problem.
- **ROLLBACK**: only if data corruption is confirmed (not just
  unavailability) — restore via `deploy/CPANEL_BACKUP_AUTOMATION.md`'s
  documented procedure, into a **temporary** database first
  ("Toda restauracao deve ser testada primeiro em banco e diretorio
  temporarios" — the runbook's own words), never directly over production.
- **VERIFY**: `restore-test.sh`-style checks (schema loads, tables exist,
  plausible row counts) against the temporary restore before ever touching
  production.
- **ESCALATE**: hosting provider if the MySQL service itself appears down
  account-wide.
- **DOCUMENT**: whether this was an availability incident or a real
  restore was performed — the latter is a big deal and needs its own
  post-mortem.

## SQL Server (Game VPS) unavailable

- **DETECT**: GameBridge heartbeat (once `GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED`
  is turned on) reports STALE/OFFLINE; in-game symptoms reported by players.
- **IMMEDIATE ACTION**: RDP to the Game VPS (the only remote access that
  exists) and check the SQL Server service status directly.
- **DO NOT DO**: do not attempt any fix through this codebase's tooling —
  there is no remote-exec path to the Game VPS from this environment, and
  this phase's `game-vps-sqlserver-backup.ps1` is backup tooling, not a
  recovery tool.
- **ROLLBACK**: if a bad restore is suspected, the only backup that
  reliably exists today is the one manual 2026-07-16 COPY_ONLY snapshot
  (`docs/gameserver/database/lab-environment.md`) — restoring production
  from anything newer requires the Part 3 automation to exist first, which
  it currently does not.
- **VERIFY**: SQL Server service running; GameBridge Agent (if/when
  deployed) reconnects; heartbeat returns to HEALTHY.
- **ESCALATE**: this is the scenario most likely to require the VPS
  hosting provider or whoever holds VPS Administrator credentials.
- **DOCUMENT**: exact downtime window — this directly affects players'
  in-game state, unlike a Portal-only incident.

## GameBridge offline

- **DETECT**: `GameBridgeHeartbeatAlertService` (this phase) emits
  `GAMEBRIDGE_HEARTBEAT_OFFLINE` (CRITICAL) once enabled; or
  `/painel/admin/alertas` shows it manually.
- **IMMEDIATE ACTION**: confirm whether the Agent process itself is running
  on the Game VPS (RDP required — no remote exec).
- **DO NOT DO**: do not rotate the game credential in response to this
  alone — credential rotation is explicitly gated on a *confirmed-safe*
  heartbeat, and doing it while the Agent is already offline compounds the
  problem, not fixes it.
- **ROLLBACK**: N/A — this is a connectivity issue, not a deploy to roll
  back (~~the Agent has never been deployed to production as a persistent
  service in the first place~~ **annotation 2026-09-19, Phase 20A:** the Agent has run on the game VPS as a scheduled task (`BloodMoonGameBridgeAgent`, SYSTEM, at startup) since 2026-08-24 executing only `CREATE_GAME_ACCOUNT`; the four extension command types were never deployed. Verified read-only through Cloudflare D1 on 2026-09-19: heartbeat `gamebridge-agent-01` seen 21 s earlier and 53 signed command-claim polls in the preceding 10 minutes; the VPS-side task and binary were not inspected. See `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5. `docs/game-data/deployment-topology.md` describes the Phase 2C state of 2026-08-20, not the current one).
- **VERIFY**: heartbeat returns to HEALTHY in
  `GET /admin/game-data/status` or the (once wired) alert's own
  `GAMEBRIDGE_HEARTBEAT_RECOVERED` event.
- **ESCALATE**: whoever has VPS access.
- **DOCUMENT**: duration, and whether it correlates with a VPS reboot/patch
  window.

## Payments stuck

- **DETECT**: `commerce.service.ts` already emits CRITICAL
  `OperationalEvent`s for Mercado Pago webhook anomalies (invalid
  signature, order/recharge not found, amount mismatch) — these already
  produce a `SystemAlert`; once this phase's channels are configured, they
  also page.
- **IMMEDIATE ACTION**: check `/painel/admin/eventos-operacionais` for the
  specific anomaly type before assuming a generic "payments broken."
- **DO NOT DO**: do not manually credit/refund a player's wallet from a
  guess — confirm the actual Mercado Pago transaction state first.
- **ROLLBACK**: N/A (this is a data-reconciliation problem, not a
  deployment).
- **VERIFY**: the specific order/recharge resolves to a consistent state
  end-to-end (Mercado Pago dashboard + this app's own record agree).
- **ESCALATE**: Mercado Pago's own support if their webhook delivery
  itself appears broken.
- **DOCUMENT**: every manual reconciliation action taken, with reasoning.

## Bad deployment

- **DETECT**: 5xx burst alert (this phase, `HTTP_5XX_BURST`) fires shortly
  after a deploy; or manual smoke-test failure.
- **IMMEDIATE ACTION**: see `docs/operations/deployment-rollback-runbook.md`
  for the affected component.
- **DO NOT DO**: do not deploy a "quick fix" on top before confirming
  rollback is either unnecessary or has already happened — stacking fixes
  during an active incident makes the timeline harder to reason about.
- **ROLLBACK**: component-specific — see the rollback runbook.
- **VERIFY**: `GET /`'s `version` field (this phase) matches the intended
  rolled-back commit; run the manual smoke checks in
  `deploy/CPANEL_NODE_DEPLOY.md`.
- **ESCALATE**: N/A unless the rollback itself fails.
- **DOCUMENT**: what broke, what the fix actually was, and add a regression
  check if one didn't already exist.

## Suspected credential exposure

- **DETECT**: a secret appears in a git diff, chat log, or tool output
  (this project has real precedent —
  `docs/security/secret-incident-history.md`).
- **IMMEDIATE ACTION**: treat it as compromised immediately, even if you
  believe it wasn't actually used maliciously. Follow
  `docs/security/secret-rotation.md` for HMAC/game-encryption keys, or
  the owner-action path (Part 22 above) for cPanel/VPS OS passwords.
- **DO NOT DO**: do not attempt to rotate a cPanel or VPS OS password
  autonomously — this project's own established rule (and this phase's
  hard boundary) is that only the account owner performs that rotation,
  with new access validated before the old credential is revoked.
- **ROLLBACK**: N/A.
- **VERIFY**: the new credential works before the old one is revoked (to
  avoid a self-inflicted lockout — exactly the caution already recorded in
  `docs/security/secret-incident-history.md`).
- **ESCALATE**: this IS the escalation — notify the account owner
  immediately, do not wait.
- **DOCUMENT**: append to `docs/security/secret-incident-history.md`,
  matching its existing format.

## Backup failure

- **DETECT**: (once `OPS_EVENT_INGEST_TOKEN`/`OPS_EVENT_INGEST_URL` are
  configured on the backup host and alerting channels are enabled) a
  `BACKUP_FAILED`/`BACKUP_VERIFICATION_FAILED`/`BACKUP_OFFSITE_FAILED`
  alert; otherwise, the local `mail` fallback or manually checking
  `backup-*.log`.
- **IMMEDIATE ACTION**: read the specific log file
  (`$BACKUP_ROOT/logs/backup-<timestamp>.log`) — the script's own error
  message (e.g. "gzip integrity check failed", "rclone copy failed") tells
  you exactly which stage failed.
- **DO NOT DO**: do not assume yesterday's backup is fine just because
  today's failed — run `deploy/scripts/verify-backup-integrity.sh` against
  the most recent run that DID complete, to confirm you actually have a
  usable fallback.
- **ROLLBACK**: N/A (this is about restoring backup CAPABILITY, not
  restoring data).
- **VERIFY**: manually re-run the backup script once the underlying cause
  is fixed (disk space, credential, `rclone` config) and confirm a
  `BACKUP_COMPLETED` event/log line.
- **ESCALATE**: hosting provider if the failure is disk-space/quota related
  and can't be resolved from within the account.
- **DOCUMENT**: cause and fix, especially if it's a recurring one (e.g.
  quota creeping toward the 2GB limit).

## Critical 5xx burst

- **DETECT**: `Http5xxBurstDetector` (this phase) fires
  `HTTP_5XX_BURST` (CRITICAL) once 10+ 5xx responses occur within 5 minutes
  (both configurable) — visible in `/painel/admin/eventos-operacionais` and,
  once channels are configured, pushed out directly.
- **IMMEDIATE ACTION**: check `/painel/admin/erros` for which specific
  `SystemError` fingerprint(s) are spiking — the burst detector counts ANY
  5xx, the existing per-fingerprint dedup tells you if it's one root cause
  or many.
- **DO NOT DO**: do not restart the API process reflexively before reading
  at least one full stack trace — a restart can clear a healthy-looking
  state while masking a root cause that will simply recur.
- **ROLLBACK**: if the burst correlates with a recent deploy, treat as
  "Bad deployment" above.
- **VERIFY**: the burst detector's own cooldown (`HTTP_5XX_BURST_COOLDOWN_MS`,
  default 15 min) will fire again if the underlying problem persists past
  its own cooldown — a genuinely resolved burst simply won't re-alert.
- **ESCALATE**: if the root `SystemError` fingerprint points at
  infrastructure (database connectivity, disk) rather than application
  code, escalate per the matching scenario above.
- **DOCUMENT**: root fingerprint, resolution, and whether a regression test
  was added.
