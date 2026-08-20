# Deployment topology and secure SQL connectivity (Phase 2C)

New in this update (2026-08-20). Answers where everything runs and how the
Agent reaches the real SQL Server safely — the questions Phase 2C's Parts
A–D asked before any new connectivity was set up.

## Topology (confirmed, not assumed)

```
Single production VPS (Windows Server 2012 R2, WIN-K82J9TU944D)
├── C:\MuServer\           real MU GameServer + 6 sibling processes
├── SQL Server 2014         database MuOnline, listens on localhost only
└── GameBridge Agent        intended to run here too (documented since Phase 1)
```

Source: `docs/vps-map.md` (`C:\Program Files\Microsoft SQL Server\` and
`C:\MuServer\` on the same single volume of the same single server) and
`apps/game-bridge-agent/README.md` (already stated, before this phase,
that the Agent "runs on the same Windows game VPS" and mirrors
`apps/launcher`'s win-x64 self-contained publish convention for that
reason). This was an existing decision, not a new one made this phase.

```
SQL_HOST_LOCATION        = same VPS as GameServer
GAMESERVER_LOCATION      = same VPS
EXPECTED_AGENT_LOCATION  = same VPS (pre-existing documentation)
SAME_HOST_SQL_AGENT      = YES
PRIVATE_NETWORK_AVAILABLE = N/A (same-host makes this moot)
LOCAL_SQL_ACCESS_POSSIBLE = YES
```

## Secure connectivity method chosen

**`DIRECT_LOCAL`** — `Server=localhost` from Agent code running on the
same VPS. Confirmed viable, not assumed: `Tools/RemoteOps/scripts/Invoke-SqlReadOnly.ps1`
(the script `bm-sql` already runs remotely) itself connects with
`Server=localhost;...;Encrypt=False` — proof SQL Server only ever listens
on loopback there, today, independent of anything built this phase.

**No SSH tunnel was needed.** The fallback described in Phase 2C's own
spec (a loopback-bound local port-forward over SSH) was never required —
same-host access was already available. **`PUBLIC_SQL_PORT_OPENED = NO`**,
unconditionally: port 1433 was never opened, no firewall rule was created
or modified, in either the proof-of-connectivity work or the (still
undeployed) production Agent design.

## What was actually proven this phase

A minimal, temporary harness (`apps/game-bridge-agent/tools/ConnectivityProbe`,
which references the Agent's real, committed `SqlServerGameDatabaseReader`/
`AccountSnapshotReader` classes directly, not a reimplementation) was
staged to the VPS's existing RemoteOps staging directory
(`C:\BloodMoonRemoteOps`, never `C:\MuServer`) via the existing SSH/SCP
channel, run twice, and deleted after each run (verified). Full evidence:
`references/game-data/sql-discovery/phase-2c-real-connectivity-20260820/`.

This is a one-shot proof, **not** a production deployment — no Windows
Service was installed, nothing was left running. See
"Windows Service readiness" below for what production deployment would
still require.

## Credential and secret boundaries

- **SQL login**: the existing `bloodmoon_observer`-equivalent read-only
  credential, already provisioned before this phase (`db_datareader` +
  explicit DML/EXECUTE denies at the SQL Server permission level — this
  holds regardless of what any application code does). No new SQL login
  was created; no privilege was widened.
- **Credential storage**: the existing DPAPI-protected
  `D:\MU\.secrets\sql-readonly.credential.xml`, decryptable only by the
  local workstation user that created it — unchanged, reused as-is.
- **Transient transport**: the credential crosses the wire only inside a
  request file sent over the already-authenticated SSH/SCP channel,
  deleted immediately after use on both ends — the same pattern
  `bm-sql.ps1` already uses, not a new one invented this phase.
- **Never committed, never logged, never printed to this harness's own
  stdout**: SQL password, connection string, `memb___id`, email, IP,
  password hash, security answers. Character names are masked
  (first character + length) in the harness's own diagnostic output —
  optional per this phase's instructions, applied anyway as this
  project's standing default.
- **Real production connection string** (for an eventual actual Agent
  deployment) still comes from environment variables or a local,
  gitignored `appsettings.Local.json` — unchanged from Phase 1's design,
  see `apps/game-bridge-agent/README.md`.

```
AGENT_SQL_LOGIN            = READ_ONLY
AGENT_SQL_WRITE_PERMISSION = NO
SECRETS_COMMITTED          = NO
```

## Failure/recovery behavior

- **Invalid credential** (real test, this phase): a deliberately wrong
  password produces a clean, typed `SqlException`, a sanitized error
  message, and a non-zero exit — no crash, no secret leaked. See
  `references/game-data/sql-discovery/phase-2c-real-connectivity-20260820/raw/03-invalid-credential-failure-mode.txt`.
- **SQL offline / timeout / cancellation**: not re-tested against the real
  server this phase (would require taking the production SQL Server
  offline — destructive, explicitly out of scope). These paths remain
  proven at the unit-test level: `AccountSnapshotReaderTests`'s SQL
  failure/cancellation cases (Phase 2B) and Phase 1's `AgentWorkerTests`
  (retry-without-crash-loop, outbox never evicts pending events). Reusing
  that coverage rather than re-deriving it matches this phase's own
  instruction not to redesign what Phase 1 already covers.
- **The outbox/sequence/observed-state guarantees** (never silently drop a
  pending event, atomic sequence guard, crash-recovery via reopening the
  same SQLite store) are architectural properties of `AgentLocalStore`,
  unrelated to which `IGameDatabaseReader` feeds it — real vs. fake data
  exercises the same code path, already proven in Phase 1.

## Determinism against real data (Part J)

Two fully independent real reads of the same live account (separate
process, separate connection, separate reader instances) produced a
byte-identical `AccountSnapshotChangeFactory` payload hash
(`630518fb...1679a`, both runs). `FALSE_CHANGE_EVENT_ON_IDENTICAL_STATE = NO`,
proven against real infrastructure, not just fixtures. Full evidence in
the same evidence directory as above.

## Windows Service readiness (assessed, not installed)

Not installed this phase — installing a persistent service on the
production VPS exceeds this phase's authorization and was explicitly
deferred per the phase's own instructions. Readiness assessment:

| Requirement | Status |
|---|---|
| Self-contained win-x64 single-file publish | Already the established build convention (`npm run game-bridge-agent:publish`, mirrors `apps/launcher`) |
| Auto-start | Not configured — would need `sc.exe create` / `New-Service` with `-StartupType Automatic`, not present anywhere in the repo's current tooling |
| Restart on failure | Not configured — would need `sc.exe failure` recovery options |
| Graceful shutdown | `AgentWorker` is a standard `BackgroundService`; .NET's generic host already handles `SIGTERM`/service-stop signals correctly by framework default — no custom work needed here |
| Bounded logs | Not yet designed — Phase 1/2B never specified a log file target or rotation policy for the Agent; currently console-only |
| Secret access | Same env-var/`appsettings.Local.json` mechanism already used successfully by this phase's harness |
| Least-privilege OS user | Not evaluated — the VPS's existing RemoteOps/Administrator session model was not assessed for a lower-privilege service account this phase |

This table is the honest gap list for a future, separately-authorized
"install the real Agent as a Windows Service" phase — not a plan being
executed now.

## Cloudflare — blocked, not attempted

`apps/game-data-worker/wrangler.toml` still has the placeholder D1
`database_id` (`00000000-0000-0000-0000-000000000000`) and no Cloudflare
credential exists anywhere in `D:\MU\.secrets`. `REAL_WORKER_EXISTS = NO`,
`REAL_D1_EXISTS = NO`, `REAL_SECRETS_CONFIGURED = NO`. Provisioning real
Cloudflare resources requires either an existing Cloudflare account
(`wrangler login`, an interactive OAuth flow) or an API token supplied
through a secure, non-chat channel — neither exists yet, so Phase 2C's
Parts K–Q (real Worker/D1/heartbeat/event/apps-api validation) and
`END_TO_END_REAL_INFRA` remain **`NOT_TESTED`**, not `FAIL` — the gap is
account provisioning, not a technical blocker in the code.
