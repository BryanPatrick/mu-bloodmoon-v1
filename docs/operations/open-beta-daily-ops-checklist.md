# Open Beta Daily Operations Checklist

Phase AA. Practical, not exhaustive — designed to take a few minutes, three
times a day, during Open Beta. Cross-references
`docs/operations/incident-response-runbook.md` for anything that comes back
abnormal.

## Morning

- [ ] **API health** — `GET /` responds 200 with a real `version` (Phase
      AA field; a stale/missing version after an expected deploy is itself
      a signal).
- [ ] **5xx count overnight** — `/painel/admin/erros`, filtered to the last
      12h. Any CRITICAL-severity entry gets read in full, not just counted.
- [ ] **Backup success** — most recent `deploy/scripts/cpanel-production-backup.sh`
      run completed (log file, or the `BACKUP_COMPLETED` event once
      alerting is wired) and, separately, run
      `deploy/scripts/verify-backup-integrity.sh` against it at least once
      a week (a backup "succeeding" and being restorable are not the same
      claim — see Part 5 of the ops hardening report).
- [ ] **GameBridge heartbeat** — `GET /admin/game-data/status` (or the
      admin dashboard once a tile exists) reports HEALTHY, not STALE/OFFLINE.
- [ ] **Payment anomalies** — `/painel/admin/eventos-operacionais` filtered
      to `commerce`/Mercado Pago event types; zero CRITICAL entries
      expected in normal operation.
- [ ] **Queue state** — confirm `worker:game-bridge` (if scheduled) is
      actually being invoked and not silently stalled; note its handler is
      a documented stub that always fails until real GameServer
      connectivity exists, so failures here are currently *expected*, not
      a new incident — don't let known-stub noise mask a real new problem.

## During the day

- [ ] **Bug Hunters critical reports** — `/painel/admin/bug-hunters`
      (Phase Z), filtered to HIGH/CRITICAL staff severity.
- [ ] **Support tickets** — anything flagged urgent by a player.
- [ ] **Performance issues** — player reports of lag/timeouts; cross-check
      against the 5xx burst detector (`HTTP_5XX_BURST`, Phase AA) — a
      player-perceived slowdown that never crosses the 5xx burst threshold
      is still worth a look, since the burst detector only catches actual
      error responses, not slow-but-successful ones.

## End of day

- [ ] **Backup status** — today's run completed and (per the weekly
      cadence above) was actually integrity-checked, not just "logged
      success."
- [ ] **Unresolved critical incidents** — anything still OPEN in
      `/painel/admin/alertas` at end of day gets either acknowledged with a
      plan, or explicitly handed off to whoever's on call next.
- [ ] **Player-impact summary** — one or two lines: what broke (if
      anything), how long it lasted, whether players were told anything.

## Notes for whoever configures alerting (Phase AA)

This checklist assumes a human is still doing the morning pass by hand —
Phase AA's alerting MVP (`apps/api/src/modules/alerting`) reduces how much
of this requires actively looking, but every channel defaults OFF. Turning
on `ALERT_SWEEP_ENABLED=true` plus at least one of
`ALERT_EMAIL_ENABLED`/`ALERT_WEBHOOK_ENABLED` (see that module's README for
every variable) means WARNING/CRITICAL conditions reach an inbox/webhook
without waiting for this checklist's next scheduled pass — worth doing
before Open Beta launches, not after.
