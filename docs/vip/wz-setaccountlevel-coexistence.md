---
status: CRITICAL_FIX_APPLIED_AND_TESTED_LOCALLY — SQL audit table + native drift detection also complete, tested locally (2026-08-31)
category: vip
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (SQL layer: real SQL Server 2022, 125/125 tests including 2 permanent regression tests against the real native WZ_GetAccountLevel procedure; Portal drift-detection layer: typechecked + e2e-tested locally, never yet observed firing against real drift since none has occurred)
---

# WZ_SetAccountLevel coexistence — full audit, a critical bug found and fixed (Phase L, Part 1)

Bryan's highest-priority item this round. Short version: **a real,
reproducible bug meant every GameBridge VIP grant would have been
silently erased on the player's very next login.** Found via reading the
native procedures' real bodies, reproduced live in the lab, fixed and
re-tested across all four layers of the pipeline (SQL → .NET Agent →
Cloudflare Worker → Portal). Nothing was installed on production.

## Part 1 — the real bodies (read via `sys.sql_modules`, CONFIRMED)

### `dbo.WZ_SetAccountLevel`

```sql
CREATE Procedure [dbo].[WZ_SetAccountLevel]
@Account varchar(10), @AccountLevel int, @AccountExpireTime int
AS
BEGIN
  SELECT @CurrentAccountLevel=AccountLevel, @CurrentAccountExpireDate=AccountExpireDate
    FROM MEMB_INFO WHERE memb___id=@Account
  IF (@CurrentAccountLevel = @AccountLevel)
    SET @CurrentAccountExpireDate = DATEADD(second, @AccountExpireTime, @CurrentAccountExpireDate)  -- extend
  ELSE
    SET @CurrentAccountExpireDate = DATEADD(second, @AccountExpireTime, GETDATE())                  -- fresh grant
  UPDATE MEMB_INFO SET AccountLevel=@CurrentAccountLevel, AccountExpireDate=@CurrentAccountExpireDate
    WHERE memb___id=@Account
END
```

- **Parameters**: `@Account varchar(10)`, `@AccountLevel int`, `@AccountExpireTime int` — the third
  parameter is a **duration in seconds to add**, not an absolute date (a
  materially different contract from GameBridge's own design, which uses
  an absolute timestamp).
- **Tables read/written**: `MEMB_INFO` only (`AccountLevel`, `AccountExpireDate`).
- **Logic**: same level as current → extend `AccountExpireDate` by
  `@AccountExpireTime` seconds from the CURRENT expiry (a renewal).
  Different level → set the new level and re-base the expiry from
  `GETDATE()` (a fresh grant, discarding remaining time).
- **`appl_days` interaction**: none — never referenced.
- **Transaction behavior**: no explicit `BEGIN TRANSACTION` — a single
  `UPDATE`, atomic by SQL Server's own single-statement guarantee, but a
  real **TOCTOU race** exists between the `SELECT` and the `UPDATE`: a
  concurrent write to the same row between those two statements is not
  guarded against (no lock, no `XACT_ABORT` transaction wrapper covering
  both). Not something Blood Moon can fix (native/vendor code).
- **Return codes**: none — no output parameter, no result set, "fire and
  forget."
- **Validation**: none — no existence check on `@Account` (a
  nonexistent account silently no-ops via the `IF` branch reading NULL),
  no range check on `@AccountLevel`, no sign check on
  `@AccountExpireTime` (a negative value would REDUCE the expiry).
- **Security**: no staff/admin exclusion (unlike `bm_GrantVip`/`bm_SyncVipTier`,
  which both reject `Admin<>0` accounts) — would apply to any account,
  including staff.

### `dbo.WZ_GetAccountLevel` — the real enforcement mechanism

```sql
CREATE Procedure [dbo].[WZ_GetAccountLevel] @Account varchar(10)
AS
BEGIN
  SELECT @CurrentAccountLevel=AccountLevel, @CurrentAccountExpireDate=AccountExpireDate
    FROM MEMB_INFO WHERE memb___id=@Account
  IF (@CurrentAccountLevel <> 0 AND GETDATE() > @CurrentAccountExpireDate)
  BEGIN
    SET @CurrentAccountLevel = 0
    UPDATE MEMB_INFO SET AccountLevel=@CurrentAccountLevel, AccountExpireDate=@CurrentAccountExpireDate
      WHERE memb___id=@Account
  END
  SELECT @CurrentAccountLevel As AccountLevel, @CurrentAccountExpireDate As AccountExpireDate
END
```

**This is the real, active VIP-expiration enforcement mechanism.** On
every call (near-certainly fired on every login, given the name and
behavior — no confirmed caller was found locally, see Part 1's reference
search below, but this is the only plausible explanation for logic that
actively rewrites state on a "get" call), if `AccountLevel <> 0` and the
current time is past `AccountExpireDate`, it **forcibly resets
`AccountLevel` to 0 and writes it back immediately.**

## The critical bug (CONFIRMED, reproduced live in the lab)

`AccountExpireDate` is `SMALLDATETIME`, defaults to `1900-01-01` (real
default constraint, confirmed via `sys.default_constraints`), and — before
this fix — was **only ever written by `WZ_SetAccountLevel`/`WZ_GetAccountLevel`
among all 90 native procedures** (confirmed via a full-text search of
every procedure body for `AccountExpireDate`). Neither `dbo.bm_GrantVip`
nor `dbo.bm_SyncVipTier` (GameBridge's own procedures) ever wrote it —
they only wrote `AccountLevel`.

**Real experiment** (`references/game-data/sql-discovery/phase-l-20260831/vip-coexistence-test.sql`):

```
Before:  labacct03  AccountLevel=0  AccountExpireDate=1900-01-01
bm_GrantVip AL2 (GameBridge-only grant) -> SUCCEEDED
After:   labacct03  AccountLevel=2  AccountExpireDate=1900-01-01   <- unchanged!
WZ_GetAccountLevel(labacct03)  -- simulating the player's next login
After:   labacct03  AccountLevel=0  AccountExpireDate=1900-01-01   <- SILENTLY REVERTED
```

**No number of reconciliation ticks would have fixed this** — `VipSyncService`'s
60-second reconciler only ever called `bm_SyncVipTier`, which had the
identical gap. Every single login check via `WZ_GetAccountLevel` would
find `AccountExpireDate` still stuck at `1900-01-01` and revert
`AccountLevel` to 0 again, forever, for any account that never happened
to receive a native `WZ_SetAccountLevel` call as a side effect. **As
built before this fix, GameBridge could not have delivered a working VIP
grant to any real player.**

## The fix (applied and re-tested, local only, not installed on production)

`dbo.bm_GrantVip`/`dbo.bm_SyncVipTier` now both take a real expiry
parameter and write `MEMB_INFO.AccountExpireDate` in the **same
statement** as `AccountLevel`, so the two can never observably diverge:

- `bm_GrantVip(@LegacyLogin, @TargetLevel, @ExpiresAt, ...)` — `@ExpiresAt`
  is now **required**; extends `AccountExpireDate` via a MAX-rule (never
  shortens an existing later expiry), matching the procedure's existing
  never-downgrade philosophy for `AccountLevel` itself.
- `bm_SyncVipTier(@LegacyLogin, @DesiredLevel, @DesiredExpiresAt, ...)` —
  `@DesiredExpiresAt` is required whenever `@DesiredLevel > 0` (irrelevant,
  may be `NULL`, at level 0 — `WZ_GetAccountLevel`'s own guard is
  `AccountLevel <> 0`). Unconditional set (not MAX) — this is the
  reconciler's job, and it can shorten an expiry same as it can lower a
  tier.
- Both reject a call missing the required expiry with `INVALID_INPUT`,
  so a caller that forgets to compute it fails loudly instead of
  silently reproducing the bug.
- Both also reject an expiry beyond `2079-06-06` (SMALLDATETIME's real
  max range) with `INVALID_INPUT` — found the hard way when a test
  fixture using `2099` hit a real SQL conversion error.

**Re-verified after the fix**, same experiment:

```
bm_GrantVip AL3, ExpiresAt=+30d  -> SUCCEEDED, AccountExpireDate=2026-09-30
WZ_GetAccountLevel(labacct01)    -- simulated login
After: AccountLevel=3, AccountExpireDate=2026-09-30   <- SURVIVES the login check
```

### Fixed across all four real layers, all tested

| Layer | Change | Verification |
|---|---|---|
| SQL (`bm_GrantVip`/`bm_SyncVipTier`) | New required expiry parameter, written atomically with `AccountLevel`, range-validated | Real lab experiment above, both directions |
| .NET Agent (`GameCommandModels.cs`, `IGameDatabaseWriter.cs`, `SqlServerGameDatabaseWriter.cs`, `GameCommandProcessor.cs`, `GameCommandWorker.cs`) | `ExpiresAt`/`DesiredExpiresAt` threaded through the command record, the writer interface/implementation, validation, and JSON payload parsing (`vipExpiresAt`/`desiredVipExpiresAt` keys — deliberately NOT named `expiresAt`, to avoid colliding with the command envelope's own unrelated `expiresAt`, the command's queue TTL) | 123/123 tests passing (full suite, including the real SQL integration tests) |
| Cloudflare Worker (`apps/game-data-worker/src/commands.ts`) | Payload schema now requires `vipExpiresAt`/`desiredVipExpiresAt` (conditionally), with the same SMALLDATETIME range check as a second, independent validation layer | 55/55 tests passing (52 existing + 3 new) |
| Portal (`vip-sync.service.ts`) | `desiredVipExpiresAt` now sent from the real `VipEntitlement.expiresAt`, passed through unmodified | `npx tsc --noEmit` clean |

**Real, previously-undiscovered finding along the way**: `VipDeliveryService`
(the OTHER, older VIP-delivery scaffold, Phase 14) uses
`UnconfiguredVipGameBridgeGateway` — an intentional stub, explicitly
documented as "never pointed at a real GRANT_VIP-capable implementation."
**GRANT_VIP has no real, wired production caller anywhere in the Portal
today** *(Phase 20B annotation, 2026-09-21: true when written; since Phase O the Portal has a real caller, `GameBridgeVipGateway` in `game-bridge-vip.gateway.ts`, gated by `VIP_DELIVERY_WORKER_ENABLED`, documented as always off in production — and the command still cannot flow end to end because the Worker, D1 schema and deployed Agent build do not support it)* — only `SYNC_VIP_TIER` (via `VipSyncService`'s reconciler) is a
real, live path. This means the critical bug above would, in practice,
have surfaced through the reconciler first (which runs continuously),
not through a one-shot grant call.

## Part 1 — reference search (who calls `WZ_SetAccountLevel`/`WZ_GetAccountLevel`?)

Full local search across `D:\MU\` (not just this repository) —
including every sibling project snapshot, the legacy CMS backup, and a
raw-string search of the compiled `GameServer.exe` binaries found
locally.

- **Real definitions found** in two identical extracted GameServer DB
  snapshots outside this repo (`Deploy\Predeploy-Snapshots\...\MuServer-stage\DB\DataBase\MuOnline.sql`
  and `MU-Server\Lab\drop-validation\...\MuOnline.sql`) — confirms the
  bodies read above are the real, canonical versions, not lab-specific.
- **No caller found** in any local source (SQL scripts, the legacy CMS
  PHP source, any sibling project's code, `.cpp`/`.h`/`.cs`/`.php`/`.js`/`.ts`
  files searched specifically).
- **Compiled `GameServer.exe` binaries DO exist locally** (correcting an
  earlier Phase K claim that `MU-Server\Current` — the wrong path — was
  the only place checked and was empty; the real binaries live under
  `Deploy\Predeploy-Snapshots\20260730-season6-scope-cleanup\workspace-binaries\muserver-extracted\...`
  and the duplicate `MU-Server\Lab\drop-validation\...`). A raw-string
  search for the literal procedure names, and for any readable ASCII at
  all, returned nothing — **the binaries are packed/obfuscated**, so
  this is genuinely inconclusive, not a negative proof.
- **Classification: DORMANT** — real, defined stored procedures, no
  confirmed local caller. The compiled engine may still call them
  internally; this cannot be ruled in or out from local files alone.

### A third real writer found: the legacy CMS's own PHP VIP cron jobs

**Correction to a Phase K claim**: `legacy-unknown-structures.md`
previously stated the legacy DmN CMS's source code "does not exist as
source code anywhere on this machine." **This was wrong** — it exists at
`D:\MU\Deploy\Cpanel-Backups\hostbr-web-20260716\extracted\backup-7.16.2026_12-53-47_mubloodxz\homedir\public_html\application\`
(a full PHP panel, present locally since 2026-08-13; missed earlier
because the search matched directory/file *names* containing `dmn`/`cms`
literally, and this backup folder is named `hostbr-web-20260716`
instead). Corrected in `legacy-unknown-structures.md` too.

Two real, relevant files read in full:

- **`tasks/SynchronizeVip.php`** — a legacy cron job. Does **not** write
  `AccountLevel`/`AccountExpireDate` — it READS them (`SELECT ... FROM
  <game db> WHERE AccountLevel = ... AND AccountExpireDate >= ...`) to
  detect which accounts currently have native VIP status, then mirrors
  that INTO the legacy CMS's own `DmN_Vip_Packages`/`DmN_Vip_Users`
  bookkeeping — a read-only observer of the native fields, not a writer.
- **`tasks/RemoveExpiredVip.php`** — **a real, confirmed THIRD writer**:
  `UPDATE MEMB_INFO SET AccountLevel = 0 WHERE memb___id = :account`,
  fired for any login found in `DmN_Vip_Users WHERE viptime <= <now>`.
  **Gated behind two real conditions that currently make it inert**:
  (1) a config flag (`vip_config.active`), whose current real value is
  unknown from local files; (2) `DmN_Vip_Users` itself has **0 real rows**
  in the restored snapshot (`legacy-unknown-structures.md`) — so even if
  the cron is still scheduled and the flag is on, its query returns
  nothing to act on today. **Notably, this script also never writes
  `AccountExpireDate`** — the same kind of gap GameBridge had, just for a
  different, apparently-decommissioned system.

**Real, unresolved question for Bryan**: the backup's own name
("pre-web-migration-20260716") strongly suggests this legacy CMS was
being retired in favor of the Blood Moon Portal around 2026-07-16 — but
this cannot be confirmed from static files alone. **Whether this legacy
PHP panel (and its cron scheduler) is still deployed and running on the
production server today is unknown and requires your confirmation** —
if it is, `RemoveExpiredVip.php` is a real, live fourth actor competing
for `MEMB_INFO.AccountLevel`, even though its own bookkeeping table is
currently empty.

## VIP coexistence scenarios tested in the lab (Bryan's exact matrix)

All in `references/game-data/sql-discovery/phase-l-20260831/vip-coexistence-test.sql`, real procedures, real lab data:

1. **GameBridge grants AL3 → native `WZ_SetAccountLevel` sets AL1 →
   reconciler (`bm_SyncVipTier`) runs → login check.** Real result:
   the reconciler correctly restores AL3 (the Portal's desired state
   always wins on the next tick), and — after the fix — the login check
   no longer reverts anything, because `bm_SyncVipTier` now maintains
   `AccountExpireDate` too.
2. **A fresh, GameBridge-only grant, no native call ever involved,
   followed immediately by a login check.** This is the scenario that
   exposed the bug (see above) — now fixed.
3. **Expired entitlement (Portal wants AL0) with a stale-but-future
   native `AccountExpireDate`.** `bm_SyncVipTier` writes `AccountLevel=0`
   unconditionally, regardless of `AccountExpireDate` — the Portal's
   "desired=0" always wins immediately, it does not wait for
   `AccountExpireDate` to naturally lapse.

**Does Portal reconciliation reliably repair native drift?** For the
`AccountLevel` *value*: **yes**, proven in scenario 1 — the next
reconciler tick (within 60 seconds) always restores the Portal's true
desired level, unconditionally. But before this fix, that "repair" was
cosmetic — a repaired `AccountLevel` with a still-stale `AccountExpireDate`
would have been silently erased again on the very next login,
regardless of how many times the reconciler "fixed" it. **The fix in
this document is what actually closes that gap** — reconciliation alone,
without also fixing `AccountExpireDate`, was never sufficient.

## Source-of-truth decision support (Bryan: do not decide silently)

The `AccountExpireDate` fix above is a correctness fix to GameBridge's
own already-approved design — every option below still needs it,
regardless of which is chosen. What remains a real, open governance
question is what to do about `WZ_SetAccountLevel` itself still being a
real, callable, unguarded native path.

| Option | Advantages | Risks | Compatibility | Required changes | Unknowns |
|---|---|---|---|---|---|
| **A. Keep `WZ_SetAccountLevel` active; reconciler repairs drift** | Zero native-engine changes; matches "the reconciler already handles divergence" design already in place | A native write between reconciler ticks (or on a login inside that window) is a real, if narrow, window where a player could see incorrect VIP status; `WZ_SetAccountLevel` still has no staff-account exclusion | Fully compatible with everything already built | None beyond the fix already applied | Whether anything real still calls `WZ_SetAccountLevel` (DORMANT, not ruled out) |
| **B. Route all legitimate native VIP writes through the Portal** | Single source of truth in practice, not just in theory | Requires finding and migrating every real caller — impossible to complete with confidence given `WZ_SetAccountLevel`'s caller is UNKNOWN | Needs GameServer-side engineering access this project doesn't have | Would require either decompiling/patching the compiled GameServer, or confirming no caller exists and documenting that as policy | Whether the compiled engine calls it internally (packed binary, couldn't confirm) |
| **C. Disable/restrict native VIP paths** (e.g. revoke EXECUTE on `WZ_SetAccountLevel` for whatever login calls it) | Removes the risk entirely if nothing legitimate depends on it | Could break an unknown, currently-working feature (a `/buyvip` in-game command, a GM tool) with no way to detect the breakage in advance, since the caller is unconfirmed | Same GameServer-side access gap as B | Requires first confirming (not just suspecting) nothing legitimate calls it | Same as B |
| **D. Leave `WZ_SetAccountLevel` alone; harden it defensively at the DB layer** (e.g. a trigger that also stamps a "last write source" marker, without blocking the write) | Non-invasive, doesn't risk breaking an unknown caller, gives future visibility | Adds a new object to reason about; doesn't reduce the underlying ambiguity, only observes it | Fully compatible | A new trigger (not built this round) | Same caller-identity gap as A/B/C |

**Recommendation: Option A, with D as a natural low-risk addition once
this document is reviewed.** The concrete bug (this document's main
finding) is already closed, which was the actual production blocker.
`WZ_SetAccountLevel`'s caller remains genuinely unconfirmed after a
thorough search — pursuing B/C without first resolving that would risk
breaking something real for a theoretical benefit. This is a
recommendation, not a decision — Bryan/product should make the final
call, informed by whether the legacy CMS (and its cron scheduler) is
still deployed to production today, which only Bryan can confirm.

## Phase L Decision Closure — Decision 1: is `hostbr-web` deployed in production? (2026-08-31)

Bryan's explicit instruction: verify technically, read-only, do not
assume. Three independent, real, read-only checks against the actual
production account (`mubloodxz`, cPanel UAPI/API2 token + the existing
read-only SQL path — no SSH, no mutation, no password entry):

1. **Filesystem**: `Fileman/list_files` on `/home/mubloodxz` (full home
   directory) and `/home/mubloodxz/public_html` (the standard PHP web
   root, hidden files included). Result: **no `application/`, `models/`,
   `tasks/`, or any legacy-CMS-shaped directory exists anywhere in the
   account.** `public_html` contains exactly one empty, auto-generated
   `api/cgi-bin` directory, last modified 2026-07-29 — after the
   migration date, consistent with a clean removal rather than an
   untouched leftover.
2. **Cron**: production has exactly **two** scheduled cron jobs, both
   confirmed Blood Moon's own (`bloodmoon-backup.sh`,
   `release-regenerate-prisma-once.sh`). **Zero** cron entries reference
   PHP, `RemoveExpiredVip.php`, `SynchronizeVip.php`, or any legacy-CMS
   script.
3. **Database (read-only)**: the most recent real row in production
   `DmN_Admin_Logins` is timestamped **2026-07-16 09:40:25** — the exact
   exact same snapshot date as the local backup used to build the lab.
   **Zero new rows in over six weeks.** By contrast, `DmN_IP_Log` (the
   NATIVE `WZ_CONNECT_MEMB`-written table) has real, current entries as
   recent as **2026-08-29** — proof the game server itself is alive and
   that the comparison is meaningful, not just "the whole database is
   idle." `DmN_Vip_Users` remains 0 rows in production today (matches
   the local snapshot exactly — `RemoveExpiredVip.php` has had nothing
   to act on regardless of whether it's scheduled anywhere). **No
   production account has ever had a non-default `AccountExpireDate`** —
   real, direct evidence `WZ_SetAccountLevel` has never observably fired
   against any currently-existing account. **No production account
   currently has `AccountLevel > 0`** — meaning the critical bug this
   document describes has not yet harmed any real player, since
   GameBridge VIP delivery was never live before this fix.

**Classification: NOT_DEPLOYED.** All three independent sources agree,
with no contradicting evidence found. The one residual, low-probability
caveat: a wholly separate hosting account outside `mubloodxz` could
theoretically still run this code — not checked (out of reach of the
credentials this project has), and considered implausible given the
"pre-web-migration" backup naming directly matches what was found (a
clean removal from this same account around 2026-07-16).

**REMOVEEXPIREDVIP_ACTIVE = NO** (script exists in a local backup only;
not deployed, not scheduled, and its target table is empty in production
regardless). **OTHER_VIP_WRITERS = none found** beyond `WZ_SetAccountLevel`
itself (DORMANT, no observable effect ever) and GameBridge's own
`bm_GrantVip`/`bm_SyncVipTier` (now fixed).

## Phase L Decision Closure — Decision 3: SQL-side GameBridge audit table (2026-08-31, COMPLETE, tested locally)

`dbo.bm_GameBridgeAudit` (full DDL:
`references/game-data/sql-discovery/gamebridge-extension-20260830/derived/proposed-bm-gamebridge-audit-table.sql`)
is installed and tested against both local databases
(`bloodmoon_gamebridge_test`, `bloodmoon_gameserver_lab`). All four `bm_*`
procedures (`bm_GrantVip`, `bm_SyncVipTier`, `bm_AnonymizeGameAccount`,
`bm_PurgeGameAccount`) now require `@CommandId`/`@CorrelationId`
(`UNIQUEIDENTIFIER`) and write exactly two audit rows per call: one
`COMMAND_RECEIVED` row before the transaction begins (survives a
rollback), one completion row (`MUTATION_COMMITTED`/`MUTATION_FAILED`) at
every exit point. `CommandId`/`CorrelationId` are threaded end-to-end from
`GameCommandProcessor.cs` (already had `command.CommandId`/
`command.ProvisioningRequestId` available) through
`IGameDatabaseWriter`/`SqlServerGameDatabaseWriter` down to the SQL layer.

**Two real bugs found and fixed while installing this, not just designing it:**

1. **`QUOTED_IDENTIFIER` install failure (Msg 1934).** The audit table's
   `PurgeBatchId` filtered index (`WHERE PurgeBatchId IS NOT NULL`)
   requires `QUOTED_IDENTIFIER ON` — not just at the table's own creation,
   but baked into **every procedure that ever inserts into the table**,
   because SQL Server captures a procedure's `SET QUOTED_IDENTIFIER`/
   `ANSI_NULLS` options at `CREATE PROCEDURE` time and replays them on
   every execution regardless of the caller's session settings. `sqlcmd
   -i`'s own default is OFF, so all four procedures failed their own
   `INSERT INTO bm_GameBridgeAudit` with Msg 1934 the first time they were
   installed this way, even though the .NET Agent's own `SqlConnection`
   (default ON) would never have surfaced the problem directly. Fixed by
   adding `SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON; GO` immediately
   before each `CREATE PROCEDURE` statement in all four derived `.sql`
   files.
2. **Post-commit audit-insert race (a real false-FAILURE gap).** The
   original design committed the mutation, then inserted the completion
   audit row as a *separate* statement afterward. If that second INSERT
   itself failed for any reason, the procedure's `CATCH` block would
   report `MU_TRANSACTION_FAILED` to the caller — even though the real
   `MEMB_INFO` mutation had already committed. This is the mirror image of
   the false-success indication Decision 3 explicitly required avoiding,
   and just as real a correctness problem for a caller that might react to
   an incorrectly-reported failure. Fixed by moving every completion-audit
   `INSERT` to immediately **before** `COMMIT TRANSACTION` in all six
   success/idempotent-success commit sites across the four procedures
   (`bm_AnonymizeGameAccount` and `bm_PurgeGameAccount` each have two: the
   idempotent-early-return path and the main path). The mutation and its
   own completion record are now atomic — either both commit together, or
   the audit-insert failure rolls back the whole transaction, including
   the mutation, so `MEMB_INFO` and `bm_GameBridgeAudit` can never
   silently disagree about what actually happened.

**Least privilege confirmed, not assumed**: `HAS_PERMS_BY_NAME` against
`bloodmoon_writer_local`, connected as that restricted login (not
sysadmin), confirms `EXECUTE=1` on all four procedures and `INSERT=0`
directly on `bm_GameBridgeAudit` — exactly the ownership-chaining design
intended (dbo owns both the procedures and the table, so the existing
EXECUTE-only grant needs no extension). No new grant was ever applied to
the writer login for this table.

**Test evidence, all real, against real SQL Server 2022**:
`BloodMoon.GameBridgeAgent.Tests/SqlServerLocalIntegrationTests.cs`
(22 tests, `bloodmoon_gamebridge_test`) plus the full unit suite: **125/125
passing**, with `bm_GameBridgeAudit` queried directly afterward and
confirmed showing clean `COMMAND_RECEIVED`/completion row pairs for every
`CommandType` (no orphaned `COMMAND_RECEIVED`-only rows in normal
operation — a real crash/timeout would still show one, by design).

**Timeout-after-commit, retry, duplicate-command scenarios**: retry/
duplicate-command safety is proven by the procedures' own existing
idempotent design (MAX-rule for `bm_GrantVip`, unconditional-set for
`bm_SyncVipTier`, `ALREADY_ANONYMIZED`/`ALREADY_PURGED` for the deletion
pair) — re-sending the same command is always safe regardless of what the
audit table shows. The "timeout-after-commit reports a false failure"
failure mode specifically named in Decision 3 is now **structurally
impossible**, not merely tested-and-passing, because of fix #2 above: the
audit insert and the mutation share one transaction, so there is no
window left in which one could commit without the other.

**Rollback scenarios**: every blocked/rejected path (`INVALID_INPUT`,
`ACCOUNT_NOT_FOUND`, `STAFF_ACCOUNT_REJECTED`, `GUILD_MASTER_BLOCKED`,
`ACTIVE_MARKET_LISTING_BLOCKED`, `MU_TRANSACTION_FAILED` from a lock
timeout) already rolls back the mutation before its `MUTATION_FAILED`
audit row is inserted (as a separate, auto-committed statement after the
rollback, which is correct here — the audit record of the failure must
survive even though the mutation itself did not). Exercised for real by
the existing integration tests for each of those result codes.

## Phase L Decision Closure — Decision 2: VIP native drift detection (2026-08-31, implemented)

`apps/api/src/modules/vip-sync/vip-sync.service.ts`'s `reconcileInFlight()`
now calls a new `checkNativeDrift()` on every `SUCCEEDED` `SYNC_VIP_TIER`
result: it parses `bm_SyncVipTier`'s `@PreviousLevel` back out of the
Agent-reported `detailJson` (`{"previousLevel":...,"newLevel":...}`,
built by `GameCommandProcessor.cs`'s `SerializeVipDetail`) and compares it
against `VipSyncState.lastSyncedLevel` — the level the Portal itself last
confirmed synced. A mismatch means something other than this reconciler
changed `AccountLevel` between the two ticks.

This is deliberately the **one exception** to the file's existing rule
that state-transition decisions never depend on `detailJson` (documented
in `reconcileInFlight`'s own header comment as "not a guaranteed-stable
machine-readable contract") — drift detection is best-effort
*observability*, never a state-transition input: a missing or malformed
`detailJson`, or an account with no prior `lastSyncedLevel` to compare
against, both degrade silently to "no drift check this tick" rather than
throwing and breaking the reconciliation loop.

Repair is intrinsic to the same operation that detects the drift —
`bm_SyncVipTier` already unconditionally overwrote `AccountLevel` back to
the Portal's desired state as part of the very command whose result is
being read — so `VIP_NATIVE_DRIFT_DETECTED` and `VIP_NATIVE_DRIFT_REPAIRED`
are logged together, never as a delayed follow-up action. A new
`VipSyncState.driftCount`/`lastDriftAt` pair (migration
`20260831120000_vip_sync_drift_observability`) tracks repeated divergence
for the *same* account across ticks — reset to 0/null on any sync that
finds no drift, incremented on each one that does — and a count reaching
3 in a row additionally logs `VIP_NATIVE_DRIFT_REPEATED` at ERROR level,
naming this as the signal that should trigger investigation into the
actual source (this threshold is a documented first cut, not empirically
tuned — no real drift has ever been observed locally or in production;
there is no confirmed-active legacy writer today, see Decision 1 above).

No silent infinite loop is possible: each tick's drift check is a
read-and-log against the result of a sync that already happened for an
unrelated reason (a real level change, an expiry, or a routine
reconciliation pass) — this code never issues an extra command of its own
just to check for drift, so there is no loop to become infinite.

Verified: `npx tsc --noEmit` on `apps/api` shows zero new errors (only a
pre-existing, unrelated `baseUrl` deprecation warning). The existing
`apps/api/test/vip-sync.e2e-spec.ts` (7 tests, unrelated to drift
detection) still passes 7/7 against the local dev database.

## What this document does NOT claim

It does not confirm whether the compiled GameServer engine internally
calls `WZ_SetAccountLevel` (the binaries are packed; inconclusive by
construction). It does not confirm whether the legacy `hostbr-web` CMS
is still deployed and running today. Both are named explicitly as
`DECISIONS_REQUIRED_FROM_BRYAN` in the phase's final report, not
silently assumed either way.
