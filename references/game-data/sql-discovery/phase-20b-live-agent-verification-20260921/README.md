# Phase 20B evidence — live Agent verification (read-only, 2026-09-21)

Authorised by Bryan (Phase 20B decision 4). Two independent read-only views of the same
`GAME_COMMAND_TRANSPORT`, kept separate:

| Side | Mechanism | Files |
|---|---|---|
| **Cloudflare** | SELECT-only queries through the local authenticated `wrangler` + `wrangler deployments list` | `raw/d1-01…06` |
| **VPS** | the audited RemoteOps wrapper (`Invoke-BloodMoonRemote`, operation `remote-read`) running the read-only script in `tools/vps-readonly-inspection.ps1` — **one** call | `raw/vps-01-agent-state.json` |

Nothing was restarted, stopped, deployed, submitted, created or written. **No command was sent through the
Agent.** The VPS script reads only: scheduled-task state, process existence and creation time (no command
line), and top-level `.exe`/`.dll` SHA-256 with non-secret version metadata. It never lists or opens the
`secrets` folder, reads no file content, and touches no environment variable. No SQL Server was contacted.
(On 2026-09-19 the same class of VPS read had been blocked by the session's permission classifier; this
time it ran because the brief authorised it explicitly. It was attempted once.)

## Results

### VPS (`raw/vps-01-agent-state.json`, captured 2026-09-21T12:28:02Z on `WIN-K82J9TU944D`)

| Item | Value |
|---|---|
| Scheduled task `BloodMoonGameBridgeAgent` | state **Ready** · last run 2026-08-25T01:33:33Z · last task result 259 · missed runs 0 |
| Process | **one** `BloodMoonGameBridgeAgent.exe`, PID 10388, **started 2026-08-25T01:33:22Z** (≈ 27 days before capture), path under the install directory |
| Binary | one single-file executable (no separate `.dll`): **sha256 `5BED7747A6A9636C250B98C8DA575E2F27981C16576C588771E8349AB02AB33C`**, 81,101,804 bytes, modified 2026-08-24T17:49:41Z |
| Version metadata | FileVersion `0.1.0.0` · ProductVersion **`0.1.0+20a0d71cda82b94c5bb492e3aa863c554831c65b`** |

### Cloudflare (`raw/d1-*.json`, captured 2026-09-21 ≈12:29–12:31Z)

| Item | Value |
|---|---|
| Migrations applied | `0001_init`, `0002_account_snapshot_state`, `0003_production_game_commands`; **`0004` not applied** (unchanged since 2026-09-19) |
| `game_command` | still `CHECK (command_type = 'CREATE_GAME_ACCOUNT')`; 2 commands ever, both `SUCCEEDED`, last activity 2026-08-25T01:32:18Z |
| Agent heartbeat | `gamebridge-agent-01` / `bloodmoon-s6`, buffer `NORMAL`/0, **23 s old at capture** |
| Signed requests in the ≈10-minute nonce window | `command:claim` 52 · `ingest:heartbeat` 19 |
| Worker versions | the newest **code** upload is unchanged (2026-08-24T17:52Z); every later version is a "Secret Change" |

## Reading the evidence — facts versus inference

* **FACT:** the Agent process is running now, has been since 2026-08-25T01:33:22Z, and is polling for
  commands and heartbeating (the D1 nonce table shows a fresh signed `command:claim` roughly every 11 s).
  No command has been executed since 2026-08-25.
* **FACT:** the binary's embedded source commit is `20a0d71c` ("GameBridge: add safe game account
  provisioning", 2026-08-24 12:49:31 −0300). That commit **has no `GameCommandWorker.cs`**; the command
  worker arrived in `7b4fed13` ("add production command transport", 14:55:10 −0300). The binary was built at
  14:49:41 −0300 — **five minutes before that commit**.
* **INFERENCE (strong):** the deployed binary was built from the working tree **one commit behind the
  transport commit plus its uncommitted changes**, exactly the pre-commit deployment pattern the Phase 2D
  Worker upload also had. The embedded hash therefore identifies the *parent* commit, not the exact source.
* **INFERENCE (strong, by chronology):** the extension handlers (`GRANT_VIP` … `PURGE_GAME_ACCOUNT`) were
  written on 2026-08-30 (`e90c29df`), six days **after** this binary was built, so the deployed Agent
  **cannot** contain them. Not proven by inspecting the binary.
* **OBSERVATION, not explained:** the task is `Ready`, not `Running`, and its last task result is 259, although
  the Agent process is alive. The process started about 10 s **before** the task's last recorded run. The
  Phase 3D-A evidence records an Agent stop/restart on 2026-08-25 ("VPS task restart", `raw/04-…` of that
  evidence) and the process start time matches that day; how the current process relates to the task instance
  is **not explained by anything read** — the start script (in the install folder, beside the `secrets` folder)
  was deliberately not opened, and the task's triggers were not read (outside the authorised list). So it is
  **unverified** whether the AtStartup trigger would bring the Agent back after a VPS reboot.
* **NOT verified:** the exact source tree of the binary; that the process's parent is the task; whether the
  Agent's own logs report errors (logs were not read).

## Timeline (never collapsed)

| Date | Event | Evidence type |
|---|---|---|
| 2026-08-24 | Agent binary built (14:49 −0300) and installed as a scheduled task; `CREATE_GAME_ACCOUNT` path deployed | Phase 3D-A raw evidence (historical) |
| 2026-08-24/25 | 2 QA commands, replay/restart/lease-expiry tests; Agent stopped and restarted on 2026-08-25 ("VPS task restart" in that evidence; process start 01:33Z) | same |
| 2026-09-19 | Cloudflare half re-verified read-only; VPS half blocked (unverified) | `../phase-20a-live-agent-d1-readonly-20260919/` |
| **2026-09-21** | **Cloudflare half unchanged; VPS half verified read-only (this folder)** | current |

## Classification

`CLOUDFLARE_SIDE = ACTIVE` · `VPS_SIDE = ACTIVE` (process running; task state `Ready`) ·
`END_TO_END_TRANSPORT = ACTIVE` for `CREATE_GAME_ACCOUNT` — polling live on both ends, **command traffic idle since
2026-08-25**; no command was sent to prove a fresh round trip. The four extension commands are **NOT_DEPLOYED**.
