# Phase 2C real Agent↔SQL connectivity — 2026-08-20

## What this closes

Phase 2B ended with one honest asterisk: `REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION
= NOT_TESTED`, because the only proven SQL access was via `bm-sql`
(PowerShell `System.Data.SqlClient`, over SSH), not the Agent's own
`Microsoft.Data.SqlClient`, and there was no authorized network path from
the dev workstation to the real server (port 1433 never opened, SSH tunnel
not authorized without explicit review).

Phase 2C resolves this by proving the **topology was never the obstacle**:
`apps/game-bridge-agent/README.md` already documented that the Agent runs
on the same VPS as SQL Server and GameServer. Running a small harness
*there*, connecting to `Server=localhost`, requires no tunnel and no new
network exposure at all.

## Method

A minimal self-contained .NET 8 console program
(`apps/game-bridge-agent/tools/ConnectivityProbe`) that **references the
real, committed `SqlServerGameDatabaseReader`/`AccountSnapshotReader`
classes directly** (not a reimplementation) was staged to the existing
RemoteOps staging directory (`C:\BloodMoonRemoteOps`, never
`C:\MuServer`) via the existing SSH/SCP channel, run once per test, and
deleted immediately afterward (verified empty on the VPS both times). The
existing read-only credential (the same one `bm-sql` uses) was decrypted
locally exactly the way `bm-sql.ps1` already does and transmitted only
transiently, never appearing in this harness's own command line or
output.

## Results

- **`REAL_GAMEBRIDGE_SQL_CLIENT_CONNECTION = PASS`** — a real
  `Microsoft.Data.SqlClient.SqlConnection` opened against the live server
  and ran `SELECT 1`.
- **`REAL_AGENT_ACCOUNT_SNAPSHOT = PASS`** — the real
  `AccountSnapshotReader.GetAccountSnapshotAsync(3)` (the same `teste2`
  account validated in Phase 2B) returned `Ok` with all 5 characters in
  correct slot order, correct guild/master-level/currency data — every
  field cross-checks exactly against Phase 2B's independent `bm-sql`
  evidence.
- **`FALSE_CHANGE_EVENT_ON_IDENTICAL_STATE = NO`** — two fully
  independent real reads (separate process, separate connection, separate
  reader instances) produced byte-identical `AccountSnapshotChangeFactory`
  payload hashes (`630518fb...1679a` both times).
- **Invalid-credential failure mode** — a deliberately wrong password
  produced a clean `SqlException`, sanitized output, exit code 2. No
  crash, no secret leaked, no destructive side effect.

## What this does NOT prove

This is a one-shot harness proof, not a running Agent deployment. The
actual `AgentWorker` background service was not installed as a Windows
Service on the VPS this phase (Part U, deliberately deferred — readiness
assessment only, no production install without separate authorization).
SQL-offline/timeout/cancellation failure modes were not re-tested against
the real server (would require taking the production SQL Server offline —
destructive, out of scope); those paths remain proven at the unit-test
level only (`AccountSnapshotReaderTests`'s SQL-failure/cancellation cases,
Phase 1's `AgentWorkerTests` retry/no-crash-loop behavior), which is
sufficient per this phase's own instruction not to redesign or
re-prove what Phase 1 already covers.

## Security notes

- `PUBLIC_SQL_PORT_OPENED = NO`, always. `Server=localhost` never leaves
  the VPS's own loopback interface.
- No firewall rule was created or modified.
- No SSH tunnel was created — the existing SSH channel's own file-transfer
  and remote-execution capability (already used by `bm-sql`/`bm-remote`)
  was reused as-is.
- The credential used has explicit DML/EXECUTE denies at the SQL Server
  permission level (confirmed in Phase 1/2A's `bm-sql self-test`),
  independent of any application code — the same login this harness used
  literally cannot write regardless of what the harness's code does.
- Both real runs' staged files (the ~90MB self-contained binary and the
  transient credential-bearing request file) were confirmed absent from
  `C:\BloodMoonRemoteOps` after each run.
