# SQL discovery — Phase 2C real Agent↔SQL connectivity, 2026-08-20

`sourceType: REAL_LIVE_SQL_SERVER_VIA_REAL_AGENT_SQLCLIENT` (see
`metadata.json`). Closes Phase 2B's one open asterisk
(`REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION = NOT_TESTED`) by running the
Agent's own real, committed `SqlServerGameDatabaseReader`/
`AccountSnapshotReader` code against the live SQL Server via a minimal
harness executed on the same production VPS the server already runs on —
`Server=localhost`, no tunnel, no new port, no firewall change.

## Chain

- **raw/** — 3 files: the first real connection + snapshot, a second
  independent real read proving determinism (identical payload hash), and
  a real invalid-credential failure-mode test.
- **normalized/connectivity-results.json** — machine-readable summary of
  all three results.
- **derived/real-connectivity-report.md** — method, results, explicit
  scope limits (what this does and does not prove), and security notes.

## Headline finding

The topology question that gated this whole phase was already answered
before it started: `apps/game-bridge-agent/README.md` documented the
Agent as running on the same VPS as SQL Server since Phase 1. Once that
was confirmed, proving a real `Microsoft.Data.SqlClient` connection
required no new network exposure at all — same-host `localhost` was
always available, safely, via the existing RemoteOps SSH channel.

This is the evidence backing `REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION = PASS`
in the Phase 2C final report.
