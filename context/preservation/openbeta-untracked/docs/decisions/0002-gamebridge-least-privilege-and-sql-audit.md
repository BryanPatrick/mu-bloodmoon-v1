---
status: ACTIVE
category: decisions
audience: internal (engineering + security)
lastVerified: 2026-08-31
---

# ADR-0002: GameBridge least privilege + SQL-side append-only audit table

**DATE**: 2026-08-31 (Phase L Decision Closure, Decision 3)
**STATUS**: ACTIVE, implemented and tested locally — not yet installed on production

## CONTEXT

The GameBridge Agent connects to the real GameServer SQL Server database
to perform four mutating operations: `GRANT_VIP`, `SYNC_VIP_TIER`,
`ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT`. This is the only code
path in the entire project with write access to the native GameServer
database. The Portal already has its own audit trail (`AuditEvent`), and
the Worker/D1 layer and the Agent's own logs each record activity — but
none of these is independently verifiable *from inside the GameServer
database itself*, which matters specifically if that chain is ever
suspected of losing or misreporting a response (a crash between a real
commit and the Agent reporting success, for example).

## DECISION

**Least privilege**: the `bloodmoon_writer`/`bloodmoon_writer_local`
login is granted `EXECUTE` on exactly four named stored procedures
(`bm_GrantVip`, `bm_SyncVipTier`, `bm_AnonymizeGameAccount`,
`bm_PurgeGameAccount`) and `DENY`d on the rest of the `dbo` schema as
defense in depth. No `db_datawriter`/`db_owner` role membership, no
direct table grants, no dynamic SQL anywhere in these procedures — every
mutation is a static, named, parameterized `EXECUTE`.

**SQL-side audit**: a new table, `dbo.bm_GameBridgeAudit`, append-only in
normal operation. Every call to one of the four procedures writes exactly
two rows: one `COMMAND_RECEIVED` row **before** the transaction begins
(so it survives a rollback — a crash/timeout after this point but before
completion is directly observable as an orphaned `COMMAND_RECEIVED` row
with no matching completion row), and one completion row
(`MUTATION_COMMITTED` or `MUTATION_FAILED`) inserted **inside the same
transaction, immediately before `COMMIT`** — this last point was a real
correction made during implementation (2026-08-31): the original design
inserted the completion row as a separate statement *after* `COMMIT`,
which created a real window where the audit insert could fail after the
real mutation had already committed, causing the procedure to
(incorrectly) report `MU_TRANSACTION_FAILED` to the caller for an
operation that had, in fact, succeeded. Moving the insert to before
`COMMIT` makes the mutation and its own audit record atomic.

The table deliberately stores only: an audit id, `CommandId`/
`CorrelationId` (threaded from the Agent's own command identity),
`CommandType`, a minimal account reference, `OperationStatus`,
timestamps, `ResultCode`, a count-only `RowsAffectedSummary` (never row
content), `ProcedureVersion`, and (for the two deletion operations)
`DeletionMode`/`PurgeBatchId`. It explicitly never stores passwords,
hashes, TOTP secrets, session tokens, warehouse/item blob contents, or
plaintext email/IP.

Ownership chaining (dbo owns both the four procedures and this table)
means the writer login needs **no new grant** to make this work — it
already has EXECUTE on the procedures, and the procedures themselves
(running as their owner) can write to the audit table without the caller
needing direct `INSERT` rights. Verified directly: `HAS_PERMS_BY_NAME`
against `bloodmoon_writer_local` confirms `EXECUTE=1` on all four
procedures and `INSERT=0` on `bm_GameBridgeAudit`.

## WHY

A destructive or financially-adjacent write path (VIP grants, account
anonymization/purge) with no independent, tamper-evident record inside
the same database it mutates is a real operational risk: if the Agent, the
Worker, or the Portal's own audit chain ever disagrees with what actually
happened on the GameServer, there would be no way to resolve the
disagreement from the GameServer's own side. Append-only, two-rows-per-call
design gives exactly that independent record, cheaply, without expanding
the writer's privilege at all.

## ALTERNATIVES CONSIDERED

- **Rely solely on Portal AuditEvent + Worker/D1 + Agent logs**: rejected
  — none of these is independently verifiable from inside the GameServer
  database itself, which is exactly the scenario this audit table exists
  to cover.
- **Grant the writer direct INSERT on the audit table**: rejected —
  unnecessary privilege expansion; ownership chaining achieves the same
  result with zero additional grant.
- **Dynamic SQL / a generic "audit any table" mechanism**: rejected —
  this project's standing rule (also enforced here) is static, named
  procedures only, never dynamic SQL, for exactly this class of
  privileged write path.
- **Insert the completion audit row after COMMIT** (the original design):
  rejected after a real false-failure race was found during
  implementation — see DECISION above.

## CONSEQUENCES

- All four procedures now require `@CommandId`/`@CorrelationId`
  (`UNIQUEIDENTIFIER`) as mandatory parameters — threaded end-to-end from
  `GameCommandProcessor.cs` through `IGameDatabaseWriter` down to the SQL
  layer, touching every writer method's signature and every call site
  (including all test doubles).
- A `QUOTED_IDENTIFIER`/`ANSI_NULLS` gotcha was found and fixed: SQL
  Server captures these SET options at `CREATE PROCEDURE` time and
  replays them on every execution regardless of the caller's session —
  `sqlcmd`'s own default (OFF) broke the audit table's filtered index the
  first time these procedures were installed. Fixed by adding explicit
  `SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;` before each
  `CREATE PROCEDURE` in the derived `.sql` files.
- Two permanent regression tests
  (`VipNativeCoexistenceRegressionTests.cs`) now prove, against a real
  SQL Server 2022 instance with the real native `WZ_GetAccountLevel`
  procedure, that a granted VIP survives the native login check while
  valid, and that an expired grant is correctly reverted to AL0 — closing
  the loop on ADR-0001's core bug with a standing, not one-time, test.
- Not yet installed on production — this is a local-environment-tested,
  reviewed design; production installation is a separate, explicitly
  gated step.

## RELATED SYSTEMS

`references/game-data/sql-discovery/gamebridge-extension-20260830/derived/`
(the four procedure files + `proposed-bm-gamebridge-audit-table.sql`),
`apps/game-bridge-agent/GameDatabase/`,
`apps/game-bridge-agent/Commands/GameCommandProcessor.cs`,
`BloodMoon.GameBridgeAgent.Tests/SqlServerLocalIntegrationTests.cs`,
`BloodMoon.GameBridgeAgent.Tests/VipNativeCoexistenceRegressionTests.cs`,
`docs/vip/wz-setaccountlevel-coexistence.md`, ADR-0001.
