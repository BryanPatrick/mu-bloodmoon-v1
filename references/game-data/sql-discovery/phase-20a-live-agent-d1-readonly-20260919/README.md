# Phase 20A evidence — live Agent / remote D1 state (read-only)

Captured 2026-09-19 ~14:10 UTC from the authenticated local `wrangler 3.114.17`
session, **SELECT-only** against the production D1 `bloodmoon-game-data` and
read-only `wrangler deployments list`. Each `raw/*.json` holds the query text,
the capture time and the result rows only (no `meta`, no ids of accounts, no
credentials: `credential_*` columns were never selected, the nonce values were
never selected). No row was created, changed or deleted; no command was
submitted; nothing was restarted.

Every query passed a local guard that accepts only a single `SELECT` statement
(no INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/REPLACE/PRAGMA/ATTACH/VACUUM).

## Results

| File | Result |
|---|---|
| `02-d1-migrations-applied.json` | applied: `0001_init` and `0002_account_snapshot_state` (2026-08-20), `0003_production_game_commands` (2026-08-24 17:17:10). **`0004_gamebridge_extension_commands` is not applied.** |
| `03-game_command-ddl.json` | `command_type TEXT NOT NULL CHECK (command_type = 'CREATE_GAME_ACCOUNT')`, credential columns `NOT NULL`, no `payload_json`/`result_detail_json` — the remote database itself rejects the four extension command types. |
| `01-schema-objects.json` | tables `account_snapshot_state`, `agent_heartbeats`, `character_reset_state`, `d1_migrations`, `event_dedupe`, `game_command`, `ranking_state`, `request_nonce`; indexes `idx_game_command_claim`, `idx_game_command_retention`. |
| `04-game_command-aggregate.json` | exactly **2** commands ever: `CREATE_GAME_ACCOUNT` / `SUCCEEDED`, first created 2026-08-24T17:26:05Z, last activity 2026-08-25T01:32:18Z, max 3 attempts. **Nothing since 2026-08-25.** |
| `05-agent_heartbeats.json` | one agent, `gamebridge-agent-01` on `bloodmoon-s6`, `buffer_state NORMAL`, `buffer_depth 0`, **`last_seen_at` 2026-09-19T14:10:30Z (≈14 s before capture)**. |
| `06-request_nonce-by-scope.json` | in the ≈10-minute nonce window: `command:claim` 52 signed requests (≈ one every 11 s — the Agent's idle command poll) and `ingest:heartbeat` 20 (≈ every 30 s). |
| `07-account_snapshot_state-recency.json` | telemetry read model: 1 row, newest update 2026-08-20T20:34:10Z (date of the Phase 2D test). Not interpreted here: an unchanged account emits no new event, so this does not show whether the telemetry reader is enabled. |
| `08-worker-deployments.json` | the 10 versions the CLI lists: the oldest listed is 2026-08-24T17:52Z (source "Unknown (deployment)"), the nine after it (2026-08-25 … 2026-09-01) are all "Secret Change" — so **no code version was uploaded after 2026-08-24T17:52Z**. Consistent with the committed CREATE-only Worker; not proof of byte identity (versions older than the listed ten are not shown). |

## Read-outs

* The **command path is alive**: the Agent polls for commands every ~11 s with a
  valid signature, heartbeats every ~30 s, buffer empty.
* The **command path has been idle** since 2026-08-25 — two QA creations only.
* The **extension is undeployed at the database layer** independently of the code.

## Not verified — and why

The VPS-side view (scheduled task `BloodMoonGameBridgeAgent` state, process start
time, binary SHA-256, log/ledger file timestamps, installed version) requires a
read-only SSH session to the production VPS. The session's permission classifier
blocked that call (reason: "Production Reads"), and it was **not** retried or
worked around. Status: **UNVERIFIED**. Version/hash cannot be inferred from D1.
The exact read-only inspection that would settle it is described in
`docs/knowledge/GAMEBRIDGE_DISAMBIGUATION.md` Part 5.
