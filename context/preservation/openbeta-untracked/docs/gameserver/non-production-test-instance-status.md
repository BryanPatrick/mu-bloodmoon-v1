---
status: ACTIVE — real, closer to ready than previously documented
category: gameserver
audience: internal (product + engineering)
lastVerified: 2026-09-04
confidence: CONFIRMED for all status claims (real, read-only checks this phase)
---

# Non-production GameServer test instance — status (Phase W Parts 20-21)

Part 20's instruction is explicit: **do not build a new lab unless
trivially local/isolated — check what already exists first.** It
already exists. A real lab was created and documented in an earlier
session, at `D:\MU\docs\local-muserver-lab.md` (outside this git repo,
in the shared `D:\MU\docs\` operator-reference tree alongside
`configuration-history.md`/`drop-rate-forensics.md`/etc.). This
document does not duplicate that lab's own record — it reports this
phase's real, read-only re-verification of its current status, which
turns out to be materially more ready than the lab's own last update
recorded.

## What already exists (verified this phase, read-only)

| Asset | Status | Detail |
|---|---|---|
| Isolated server-binary copy | **READY** | `D:\MU\MU-Server\Lab\drop-validation\MuServer-stage\` — a verified-integrity copy (4,675/4,675 files) of the July 30 predeploy snapshot, never the production tree itself |
| Test drop-rate config | **READY, already edited** | Lab copy's `Common.dat` has `ItemDropRate_AL0-3 = 50/60/70/75` (a deliberate test value, distinct from both production's current 0 and the pre-OR-023 100/120/120/120) — confirmed present, unchanged, this phase |
| Ports | **READY** | All 7 required ports (44405, 55557, 55901, 55960, 55970, 55999; VoiceServer external/unused) confirmed free on this machine as of the lab's own last check |
| Client copy | Documented as required, not independently re-verified this phase | See lab doc section 8 |
| **SQL Server engine** | **READY — NEW this phase, real upgrade from the lab's own last status** | `MSSQLSERVER` service confirmed `Running`; `sqlcmd` available. The lab doc previously recorded this as the #1 blocker (`LOCAL_SQL_SERVER = MISSING`) — that is no longer accurate as of 2026-09-04 |
| **Database with real schema** | **ALREADY EXISTS — NEW this phase** | `bloodmoon_gameserver_lab` (145 tables — `Character`, `AccountCharacter`, `CashShopData`, and more, matching real production schema scale, not a minimal test shape), containing **11 real test `Character` rows already**. Two more real local databases also exist: `bloodmoon_gameserver_raw_analysis` (140 tables) and `bloodmoon_gamebridge_test` (48 tables). All three created 2026-08-30 — predate this phase, not created by this session, provenance of that earlier work not otherwise documented anywhere found |
| ODBC DSN linking GameServer → this database | **MISSING** | `DataServer.ini` in the lab copy requires a DSN literally named `MuOnline`; none exists (`Get-OdbcDsn` and the 32-bit ODBC registry key both empty for any `Mu*`/`bloodmoon*` name) |
| Binary execution | **REFUSED, unchanged** | This session declines to execute `GameServer.exe`/`ConnectServer.exe`/`DataServer.exe`/`JoinServer.exe`/any MU client binary — unsigned, no confirmed publisher, sourced from a private MU-server community, with prior crash evidence (8 `.dmp` files already catalogued). This is independent of the SQL Server finding and does not change |
| Hardware-locked license | **UNRESOLVED, unchanged** | `Common.dat`'s `CustomerHardwareId` (`Customer Settings` section) suggests the eMuGS license may be tied to the original server's hardware ID — running `GameServer.exe` on this machine could fail on license grounds even once every other blocker clears; not testable without running the binary |

## What this changes

The lab is now **one system-configuration step away** from the point
where a human operator (not this agent — creating an ODBC DSN is a
system-settings change, outside this session's read-only-only mandate
for this phase, and outside the "explicit permission" action category
even under normal operating rules since it modifies system settings)
could plausibly bring the four server processes up:

```
REMAINING_STEPS_FOR_HUMAN_OPERATOR = [
  "1. Create a 32-bit ODBC System DSN named exactly 'MuOnline', pointing
      at the LOCAL 'bloodmoon_gameserver_lab' database (NOT production)",
  "2. Confirm DataServer.ini / JoinServer.ini in the lab copy don't need
      further edits once the DSN exists",
  "3. Start DataServer -> JoinServer -> ConnectServer -> GameServer, in
      that order, capturing stdout/stderr and any new *_LOG/ files",
  "4. If GameServer.exe fails on a license/HWID check, that is a real,
      separate blocker (Customer Settings section) requiring contact
      with whoever manages the eMuGS license -- not a config problem",
  "5. Connect a lab-only MU client copy, confirm/create an AL0 (Free
      tier) test account, and follow the lab doc's existing kill-count
      drop-rate test protocol (steps 10-13 in local-muserver-lab.md)"
]
```

No step above was performed by this session. Steps 1-2 are explicitly
withheld per this project's system-settings boundary; steps 3-5
require running third-party binaries, which this session has already
declined to do (and which Bryan's own Phase V Decision 2 separately
restricts to an authorized non-production instance — this lab would
qualify as exactly that non-production instance, once actually
running).

## Part 21 — what one working non-production instance would unblock

If this lab instance were brought fully online, it would let a future,
explicitly-authorized session (not by inference — Bryan would still
need to authorize each specific test against it, per Decision 2)
resolve several currently-`UNKNOWN`/`BLOCKED_BY_RUNTIME_EVIDENCE`
questions this project has accumulated across Phases U-W, without
touching production:

| Open question | Currently blocked by | Would this lab resolve it? |
|---|---|---|
| XP formula (`xp-formula-evidence-and-vendor-questions.md`) | No non-prod instance, vendor formula undocumented | YES — Phase V's own empirical test design (Part 15, kill-and-measure-XP-delta) becomes executable |
| Reload/restart trigger remote-scriptability (`RELOAD_REQUIRED` gap, same doc) | Vendor doc only covers the GUI action, not remote triggering | PARTIALLY — could confirm the GUI trigger itself works and observe file-reload behavior locally, though "remote/programmatic" specifically would still need an interactive console session |
| OR-023 Part 8's `UNKNOWN_RUNTIME_EFFECT` (does map `ItemDropRate=0` actually zero drops given a monster's own extreme `ItemRate`?) | No running instance to observe real drop behavior | YES — directly testable by setting the lab's map ItemDropRate to 0 and a monster's ItemRate to the sentinel, then counting real drops |
| X-Shop/CashShop reload behavior (OQ-031, `docs/economy/*`) | Same reload-trigger gap | PARTIALLY, same caveat as above |
| CashShop rental mechanics (OQ-028) | No non-prod instance to observe rental expiry/renewal | YES |
| Accessory balance test (`docs/economy/accessory-balance-test-plan.md`) | No non-prod instance | YES |
| GameBridge Agent runtime behavior against a real (not faked) SQL Server | Agent tests currently run against fakes only (Game Data Platform Phase 1 plan) | YES — `bloodmoon_gamebridge_test`'s existence suggests this may have been the exact intent of that database's creation |

```
NON_PRODUCTION_INSTANCE_ASSETS = SUBSTANTIALLY_MORE_READY_THAN_DOCUMENTED
  (SQL engine + schema-matching database already exist; only a system
  DSN and human-operated binary execution remain)
LAB_BUILT_THIS_PHASE = NO (Part 20's own instruction: do not build
  unless trivial — nothing needed building; the lab and its DB already
  existed from an earlier, undocumented-elsewhere session)
PRODUCTION_TOUCHED = NO (every check this phase was against the LOCAL
  SQL Server instance and the LOCAL lab file copy only)
```

## Related systems

`D:\MU\docs\local-muserver-lab.md` (authoritative lab record, updated
this phase with the SQL Server finding), `docs/drop/or-023-forensics.md`
(Part 8's `UNKNOWN_RUNTIME_EFFECT`, the question this lab could
resolve), `docs/progression/xp-formula-evidence-and-vendor-questions.md`,
`docs/decisions/0026-progression-evidence-and-balance-readiness.md`
(Decision 2 — non-production-only runtime testing authorization
requirement, unchanged and still governing any future use of this lab).
