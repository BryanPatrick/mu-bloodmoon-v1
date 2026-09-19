# Pre-Beta Go/No-Go Checklist (Operations)

Phase AA. This is a narrow, operations-focused checklist — the fields Part
21 of this phase asked for specifically. It does **not** replace the
broader, already-existing `docs/handoff/site-beta-checklist.md`, which
covers the full BLOCKER/HIGH/MEDIUM/LOW release gate (product, security,
legal, and ops together) and is currently at a formal **NO-GO** per its own
gate result — that document remains the authoritative overall go/no-go
record. Use this one the day before Beta specifically to re-check the
operations-readiness slice.

| Item | Status as of 2026-09-05 | Evidence |
|---|---|---|
| Backup verified | PARTIAL | Script quality and integrity-checking are solid (Part 2/5); offsite (`rclone`) config on the live host is unconfirmed; MySQL empirical restore is `BLOCKED_TEST_ENVIRONMENT` this session (Part 7) |
| Restore path known | YES (MySQL) / YES, mechanism only (SQL Server) | `deploy/CPANEL_BACKUP_AUTOMATION.md` restore steps + `restore-test.sh` tooling; SQL Server restore mechanism empirically proven against the local lab (Part 8), production automation still `NOT_AUTOMATED` |
| Owner passwords rotated | **NO — OPEN** | cPanel primary password and VPS Administrator password rotation remain pending owner action (Part 22); this phase did not and cannot perform them |
| Critical alerts configured | **NO — built but OFF by default** | `apps/api/src/modules/alerting` exists and is tested (46/46), but every channel/poller defaults to disabled; an operator must set `ALERT_SWEEP_ENABLED=true` plus a channel before Beta for this to actually notify anyone |
| Launcher manifest healthy | Not verified this phase | Out of scope for Phase AA (no production access); check via the existing Launcher smoke process at deploy time |
| API smoke healthy | Not verified this phase (no production access) | `GET /` now carries a real `version` field (this phase) to make a future smoke check meaningful |
| GameBridge state known | PARTIAL | Heartbeat computation is real (Cloudflare Worker); nothing currently polls/alerts on it in production until `GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED=true` is set; ~~the Agent itself has never been deployed as a persistent service~~ **(annotation 2026-09-19, Phase 20A: it runs as a scheduled task since 2026-08-24 and its heartbeat was verified live through D1 on 2026-09-19; only the four extension command types are undeployed — `docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5)** |
| Payments either safely OFF or validated | Not assessed this phase | Out of scope — see Phase Y's own payments findings for the last assessment |
| VIP state known | Not assessed this phase | Out of scope — see Phase Y |
| Store state known | Not assessed this phase | Out of scope — see Phase Y |
| Rollback artifacts available | **NO, for API/Web** | Confirmed this phase: the cPanel deploy packaging script wipes its own previous output before rebuilding, and nothing retains a version-stamped copy anywhere; Launcher's *content* layer has real rollback, its *exe* layer does not (forward-only updater) |

## What would need to happen between now and Beta for a clean operations GO

1. An operator (not an agent) rotates the cPanel primary password and the
   VPS Administrator password, validating new access before revoking the
   old credential.
2. An operator sets `ALERT_SWEEP_ENABLED=true` and configures at least one
   channel (`ALERT_EMAIL_TO`/`ALERT_WEBHOOK_URL`) in production — the code
   is ready; nothing fires until this is done.
3. Confirm (via cPanel, since this phase has no production access)
   whether `RCLONE_REMOTE` is actually set for the MySQL backup script —
   if not, Beta launches with backups that exist but are not resilient to
   losing the hosting account itself.
4. Decide, separately from this phase, whether the API/Web deploy
   packaging process needs version-stamped artifact retention before Beta
   (currently: none) — this phase did not change that behavior, only
   documented the gap (`docs/operations/deployment-rollback-runbook.md`).
5. If GameBridge/the Agent is expected to be live for Beta, turn on
   `GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED` and confirm at least one real
   HEALTHY reading before relying on it.

This phase's own honest position: **READY_FOR_OPEN_BETA_OPERATIONS =
PARTIAL** — the foundation (tooling, alerting code, runbooks) is real and
tested, but activating it in production and completing the three owner
actions above are still outstanding, and none of them were something this
phase was authorized to do itself.
