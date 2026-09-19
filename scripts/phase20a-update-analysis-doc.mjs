#!/usr/bin/env node
// Phase 20A -- idempotent update of docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md:
// visible corrections to statements the lab/D1 evidence supersedes, plus a new Part 14
// (decisions recorded 2026-09-19, lab evidence, ACK distinction, live state, prerequisite
// status, mandatory properties of a future CREDIT_GAME_CURRENCY, single-balance principle).
import { readFileSync, writeFileSync } from 'node:fs'
const f = 'docs/knowledge/GAME_CURRENCY_DELIVERY_ANALYSIS.md'
let t = readFileSync(f, 'utf8')
const LAB = 'references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/'
const D1 = 'references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919/'

const reps = [
	[
		'queried). No production system was contacted.',
		'queried). No production system was contacted. **Phase 20A (2026-09-19) update:** ~~`WZ_SetCoin` … is not preserved and was not queried~~ — it and `CashShopData` were read, read-only, in the lab and are now preserved with hashes (Part 14.2); the remote D1 was read with SELECT-only queries (Part 14.4). Still no SQL executed, nothing written, no production write.'
	],
	[
		'| Which option? | **RECOMMEND_OPTION_B** — a new command type on the existing channel — **conditional**',
		'| Which option? | **RECOMMEND_OPTION_B** *(direction accepted by Bryan on 2026-09-19; implementation NOT approved — Part 14.1)* — a new command type on the existing channel — **conditional**'
	],
	[
		'| Is a decision ready? | **YES for the mechanism decision**',
		'| Is a decision ready? | *(2026-09-19: the direction is now decided; P2 is closed; see Part 14.5)* **YES for the mechanism decision**'
	],
	[
		'`WZ_SetCoin` is the persist path into `CashShopData` but **whether it *adds* or\n*sets* is not preserved** (the body is not in the repo);',
		'`WZ_SetCoin` is the persist path into `CashShopData` but ~~**whether it *adds* or\n*sets* is not preserved** (the body is not in the repo)~~ **(Phase 20A: it ADDS, positive values only — Part 14.2)**;'
	],
	[
		'| P2 | Read **`WZ_SetCoin`\'s body and `CashShopData`\'s DDL/defaults** (read-only, lab copy) | additive vs absolute; missing-row behaviour; column types |',
		'| P2 | Read **`WZ_SetCoin`\'s body and `CashShopData`\'s DDL/defaults** (read-only, lab copy) **— DONE 2026-09-19 (Part 14.2)** | additive vs absolute; missing-row behaviour; column types |'
	]
]
for (const [from, to] of reps) {
	if (t.includes(to)) continue
	if (!t.includes(from)) throw new Error('anchor not found: ' + from.slice(0, 70))
	t = t.replace(from, () => to)
}

const MARK = '## Part 14 — Phase 20A (2026-09-19): decisions and evidence closure'
if (!t.includes(MARK)) {
	t = t.replace(/\s*$/, '\n') + `
${MARK}

Nothing in this part implements, enables, deploys or writes anything. It records
Bryan's decisions of 2026-09-19 and what the authorised read-only work found.

### 14.1 Decisions recorded

| Decision | Recorded value |
|---|---|
| Initial Beta | \`BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE\` — the Beta path stays **BRL → provider → Portal WC → Portal-side products / VIP**; automatic game-currency credit is future scope; existing VIP commercial decisions are unchanged (CLAIM-147) |
| Portal WC target | \`PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED\` — not to be silently mapped to \`WCoinC\`; Portal WC is a separate business abstraction (CLAIM-129) |
| Direction | \`GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B\` — a *future* delivery should preferentially use the controlled \`GAME_COMMAND_TRANSPORT\` boundary, not \`apps/api\` writing the game database; \`GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO\`; **P1–P9 stay mandatory** (CLAIM-148) |
| Chargeback after delivery | \`CHARGEBACK_AFTER_GAME_DELIVERY_POLICY = UNRESOLVED\` — blocks any *public* currency-delivery enablement, not this research |
| Authorised work | read-only lab inspection (done), read-only Agent/D1 confirmation (D1 done, VPS side blocked — 14.4), preserving the Worker extension (done — 14.9), legacy-catalog banner (done) |

Status of the "decisions required" of Part 12: 1 (WC target) and 5 (chargeback) stay open as
**future-scope** decisions; 2 (does the player need game currency) is answered **for the Beta only**;
3 (Option B) is accepted as a direction — the ADR-0002 amendment (P6) is still required before
implementation; 4 (lab lookups) is done, the visibility test is not possible (14.3); 6 (preserve the
Worker) and 8 (legacy banner) are done; 7 (live Agent) is half done. No gap is closed by accepting the
direction: GAP-P20-01/02/03/04 stay open.

### 14.2 Lab evidence — \`WZ_SetCoin\` and \`CashShopData\` (read-only)

Read first-hand from the lab restore of the 2026-07-16 production backup; not re-read on production;
nothing executed. Raw text, DDL, queries and hashes: \`${LAB}\`.

| Question | Answer (CLAIM-139..144) |
|---|---|
| Additive or set? | **Additive** (\`col = col + value\`), every balance-changing vendor procedure (eight); none sets an absolute value |
| Can it subtract? | **No** — \`WZ_SetCoin\` ignores values ≤ 0; **no debit procedure exists**; how the GameServer debits is not visible |
| Missing row? | \`WZ_SetCoin\` **inserts** (only that column; others default 0); the other vendor procedures only \`UPDATE\` — **silently credit nothing** |
| Transaction / locking? | none: \`XACT_ABORT ON\` without \`BEGIN TRAN\`; \`IF EXISTS … ELSE INSERT\` is racy (a concurrent first credit fails on the primary key) |
| Idempotency / audit? | **none** — no key, ledger, log or return code; twice = twice |
| DDL | \`AccountID varchar(10)\` (CI collation), three \`int NOT NULL DEFAULT 0\` balances, clustered PK \`PK_TempCashShop\`; **no CHECK, no FK, no trigger** |
| Other balance tables | \`CustomPlayToEarn\` (same three balances, 0 rows, unreferenced) — role unknown |
| Vendor credits online players? | \`WZ_SetRewardCastleSiege\` credits members selected through \`MEMB_STAT.ConnectStat = 1\` by plain SQL |

Consequences for a future \`CREDIT_GAME_CURRENCY\` procedure:

* **Do not delegate to \`WZ_SetCoin\`.** It has no idempotency, no audit, a racy insert and no
  transaction; the new procedure needs its own ledger (Part 5, R2).
* **Follow the vendor's delta model** (\`col = col + amount\`, never a set). Two SQL adders on the same row
  commute under row locks, so a credit does not collide with the vendor's own additive credits.
* **Upsert atomically** (\`UPDATE …\`, then \`INSERT\` if no row, under \`UPDLOCK, HOLDLOCK\`, syntax valid on SQL
  Server 2014); a missing row must never mean a silent no-op.
* **Guard the DDL's gaps in the procedure**: 32-bit overflow check, cap, and verify the account exists
  (no FK to \`MEMB_INFO\` — otherwise orphan rows). Use the column's collation for account matching.
* **The vendor gives no way to claw back**: reversal (chargeback, repair) needs a *new* subtraction
  procedure with its own key — another reason the chargeback policy blocks public enablement.
* The evidence weakens, but does not remove, the "engine overwrites an external credit from an in-memory
  copy" hypothesis (vendor procedures are additive; one credits online players by SQL). It says nothing
  about **when** the game shows a credit.

### 14.3 \`SQL_ACK\` versus \`GAME_ACK\`, and game visibility

| Term | Meaning | Provided by \`GAME_COMMAND_TRANSPORT\`? |
|---|---|---|
| \`SQL_ACK\` | the stored procedure returned and **committed** | **Yes** — the only acknowledgement that exists |
| \`GAME_ACK\` | the GameServer / client has **observed or applied** the effect | **No** — no channel to the GameServer process; never claimed |

\`GAME_CURRENCY_VISIBILITY = UNKNOWN\` (immediate / CashShop reopen / relog / map change / server reload
were not distinguished). **A lab test was not possible**: \`D:\\MU\\MU-Server\\Lab\\drop-validation\\MuServer-stage\` is a staged
file copy only — no GameServer process is running, no ODBC data source exists on the machine and no
client is set up. Building one means running closed-source server executables and editing their
configuration, which is neither read-only nor something to do unattended.

**Test design (ready, not run).** Preconditions: an isolated stack (ConnectServer, DataServer/JoinServer,
GameServer) whose ODBC source points **only** at \`bloodmoon_gameserver_lab\`, with no route or credential to
the production VPS; a synthetic account and character; a client that can log in. Steps: (1) note the
in-game balance; (2) while the player is online, credit +N with the vendor's own \`WZ_SetCoin\` **in the lab
database**; (3) observe, in order, with no action / after reopening the CashShop / the X-Shop / after a
map change / after a relog / after a server reload; (4) *overwrite check* — before the credit becomes
visible, make an in-game purchase that debits, then relog and read SQL: the balance must equal
baseline + N − price, otherwise the credit was overwritten; (5) repeat with an offline account.
Record one of \`IMMEDIATE / CASHSHOP_REOPEN / RELOG / MAP_CHANGE / SERVER_RELOAD / UNKNOWN\` per step. Abort
if any connection string or data source points anywhere but the lab.

### 14.4 Live Agent and remote D1 (read-only, 2026-09-19)

Evidence: \`${D1}\` (SELECT-only; no ids, credentials or nonce values selected).

| Question | Result |
|---|---|
| Migrations applied on the remote D1 | **0001, 0002, 0003** — **0004 is not applied** |
| \`game_command\` shape | still \`CHECK (command_type = 'CREATE_GAME_ACCOUNT')\`, credential columns \`NOT NULL\` — the database itself rejects the four extension types |
| Commands ever | **2** (\`CREATE_GAME_ACCOUNT\`, both \`SUCCEEDED\`), last activity 2026-08-25 — none since |
| Agent alive? | **yes** — \`gamebridge-agent-01\` / \`bloodmoon-s6\`, heartbeat ≈14 s old at capture, buffer \`NORMAL\`/0 |
| Command path active? | **yes** — ≈52 signed \`command:claim\` requests in the 10-minute nonce window (one per ~11 s), 20 heartbeats |
| Worker code | no code version uploaded after 2026-08-24T17:52Z; later versions are all "Secret Change" |
| **VPS side** (scheduled task state, process start, binary SHA-256, version, log/ledger timestamps) | **UNVERIFIED** — the read-only SSH inspection was blocked by the session's permission classifier ("Production Reads") and was **not** retried or worked around |

The inspection that would settle the VPS side is: over the audited RemoteOps channel, run only
\`Get-ScheduledTask\` + \`Get-ScheduledTaskInfo\` for \`BloodMoonGameBridgeAgent\`; \`Get-CimInstance Win32_Process\`
filtered to the install directory (name, PID, start time — **no command line**); a top-level \`Get-ChildItem\` of
\`C:\\BloodMoonGameBridgeAgent\` (name, size, timestamp — **never** the \`secrets\` folder or any file
content); and \`Get-FileHash\` of the executable/scripts. It needs Bryan to allow that action, or to run it.

### 14.5 Prerequisite status (P1–P9)

| # | Prerequisite | Status on 2026-09-19 |
|---|---|---|
| P1 | WC target + single-balance model | **OPEN** — future scope (Beta out of scope) |
| P2 | Read \`WZ_SetCoin\` / \`CashShopData\` | **DONE** (14.2) |
| P3 | Visibility / overwrite hazard | **OPEN** — no runnable lab GameServer; test design ready (14.3) |
| P4 | SQL-side exactly-once, SQL Server 2014 | **OPEN** — requirements sharpened by 14.2; nothing built |
| P5 | Worker extension, D1 0004, Agent deploy path | **PARTIAL** — extension preserved and tests re-run (14.9); 0004 not applied; Agent deploy path untested; SQL procedures still untracked |
| P6 | ADR-0002 amendment (one more \`EXECUTE\`, kill switch, caps) | **OPEN** |
| P7 | Chargeback-after-delivery policy | **OPEN** — unresolved, blocks public enablement |
| P8 | Exclude the new outbox operation from the marketplace script | **OPEN** |
| P9 | Read-only confirmation of live Agent/D1 | **PARTIAL** — Cloudflare half done, VPS half blocked (14.4) |

### 14.6 Mandatory properties of a future \`CREDIT_GAME_CURRENCY\`

Not to be implemented now; any future design must have **all** of these:

1. **Business idempotency key persisted SQL-side** — unique, written in the same transaction as the effect.
2. **Explicit target currency** — a named value, never a slot number, translated in one place.
3. **Account identity** — \`legacyLogin\` of an \`ACTIVE\` \`GameAccountIdentity\`, verified to exist in the game database.
4. **Amount** — positive integer, bounded, overflow-checked.
5. **Source / recharge reference** — e.g. the \`RechargeIntent\` id, recorded, never trusted for authorisation.
6. **Audit trail** — SQL ledger + in-transaction audit row, D1 row, Agent ledger, Portal delivery record.
7. **Caps** — per command and per account per day, enforced in SQL.
8. **Kill switch** — Agent flag default off, plus a Worker-side per-type suspension; separate Portal client id.
9. **Least-privilege grant** — exactly one \`EXECUTE\` for the procedure, no table rights, ownership chaining.
10. **Retry-safe, duplicate-safe, crash-safe** — resubmission always carries the same key; the Agent ledger's
    reclaim window (SQL committed, ledger not) is closed by the SQL-side key.

### 14.7 Single-balance principle

**Beta rule:** Portal WC stays Portal-side; the Beta path is model **P** of Part 6 by construction.
**Future rule:** game delivery must **not** silently create two independently spendable, authoritative
balances from one payment, unless Bryan explicitly chooses that product model. Models T (transfer/escrow),
D (direct-to-game package) and P (Portal-only) all keep one balance at a time; that choice remains part of
the future architecture (P1).

### 14.8 Chargeback

\`CHARGEBACK_AFTER_GAME_DELIVERY_POLICY = UNRESOLVED\`. The vendor procedures cannot subtract (14.2), so
even a policy that wants to recover credited currency needs a new, separately designed mechanism. No
public currency-delivery implementation may be enabled before this is resolved.

### 14.9 Worker extension preserved

The only copy of the Worker code for the four extension command types was uncommitted in
\`mu-bloodmoon-v1-openbeta\`. It is now on the branch \`gamebridge/preserve-command-extension\` (commit
\`3e69937e\` exact files, \`6003c59a\` manifest; based on \`main\` \`c1b34062\`): 3 files, +313/−43, hashes and
provenance in \`docs/gamebridge/worker-extension-preservation-manifest.md\` **on that branch**; \`tsc\` 0 errors,
Worker suite 55/55 (\`commands.spec\` 25/25). **Not merged to \`main\`, not deployed, not canonical.**
Remaining loss risk: the four SQL procedures (\`references/game-data/sql-discovery/gamebridge-extension-20260830/\`,
11 files, one flagged for secret review) are still untracked in the same worktree (GAP-P20-02, GAP-P20-10).
`
}
writeFileSync(f, t)
console.log('analysis doc updated')
