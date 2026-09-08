---
status: READY_FOR_INDEPENDENT_REVIEW
category: gamebridge
audience: internal (engineering + an independent SQL reviewer)
lastVerified: 2026-08-30
---

# GameBridge second review package (Phase K, Parts 17-18)

An immutable snapshot of the four `bm_*` procedures as they stand after
Phase K's hardening (`docs/gameserver/database/account-data-map.md`,
`stored-procedures.md`), for an independent reviewer — not Bryan, not the
engineer who wrote them. **Nothing here was installed on production.**

## Part 17 — review package contents

### Source files and checksums (SHA-256, computed 2026-08-30)

| File | SHA-256 |
|---|---|
| `proposed-bm-grant-vip-procedure.sql` | `8DA473F8CDEFF0C6FD1F3F442D0BEFC0F3A91011A95235430892A71E4D9F698D` |
| `proposed-bm-sync-vip-tier-procedure.sql` | `53022E38920BD4765EDFC65781F021FBFEBA23C682FEA2B7395F499F4059170F` |
| `proposed-bm-anonymize-game-account-procedure.sql` | `298FBF4659BEAD22EC92F23F736BC838990BF7F30EDDB5BA47B55348DC5392DF` |
| `proposed-bm-purge-game-account-procedure.sql` | `CA922519867DBE06626707927C5AF3A8EE06B8A42E46ABE771DDF15C939C7776` |
| `local-writer-login.sql` (grants script) | `CE81991A92F0B8089CB423D353C562156D79D981BAB76C0E63E1C05CDB15169F` |

All five live in
`references/game-data/sql-discovery/gamebridge-extension-20260830/derived/`.
**These hashes will change the next time any of these files is edited —
if reviewing later, recompute (`Get-FileHash -Algorithm SHA256`) and
confirm the file under review still matches whatever version this
document is attached to, or re-pull this document itself.**

### Touched tables (real, verified — `sys.sql_expression_dependencies`)

| Procedure | Reads | Writes/Deletes |
|---|---|---|
| `bm_GrantVip` | `MEMB_INFO` | `MEMB_INFO` (AccountLevel only) |
| `bm_SyncVipTier` | `MEMB_INFO` | `MEMB_INFO` (AccountLevel only) |
| `bm_AnonymizeGameAccount` | `MEMB_INFO`, `AccountCharacter`, `Character`, `Guild`, `GuildMember`, `CustomMarketShop`, `T_FriendMain`, `T_FriendList`, `T_WaitFriend` | `MEMB_INFO`, `Character`, `AccountCharacter`, `CustomQuest`, `GuildMember`, `CustomMarketShop`, `T_FriendMain`/`List`/`WaitFriend`, `CashShopData`, `warehouse`, `ExtWarehouse`, `CustomJewelBank`, `LuckyCoin`, `CashShopInventory`, `CustomGift`, `GremoryCase`, `T_CGuid`, `HelperData`, `MasterSkillTree`, `OptionData`, `QuestKillCount`, `QuestWorld`, `CustomRewardItem`, `EventLeoTheHelper`, `EventSantaClaus`, `Gens_Rank`, `Gens_Reward`, `CustomDailyReward`, `CustomItemVisualBackup`, `CustomItemVisualDefault`, `CustomReBuild`, 11 of 12 `Ranking*` tables |
| `bm_PurgeGameAccount` | same read set as ANONYMIZE | same write/delete set as ANONYMIZE (DELETE instead of rename/zero), plus `MEMB_STAT`, `DmN_OnlineCheck` |

Full per-table relation key, action, order, and confidence in the
dependency matrix, `docs/gameserver/database/account-data-map.md`.

### Transaction boundaries

All four: single `BEGIN TRANSACTION` / `COMMIT`/`ROLLBACK`, `SET
XACT_ABORT ON` (any unhandled error aborts the whole batch, not just the
current statement), `sp_getapplock` (`Exclusive`, `LockOwner='Transaction'`,
10s timeout) on `BloodMoon:GAME_ACCOUNT_MUTATION:<login>` before any read
that informs a decision — serializes concurrent calls for the same
account without needing a dedicated lock table.

### Idempotency (per procedure, CONFIRMED via real tests)

- `bm_GrantVip`: MAX-rule — re-granting same/lower tier is a safe no-op.
- `bm_SyncVipTier`: syncing to the already-current value returns
  `Changed=0`, no write.
- `bm_AnonymizeGameAccount`: checked via `memb__pwd LIKE 'ANON%'` BEFORE
  any mutation — returns `ALREADY_ANONYMIZED`.
- `bm_PurgeGameAccount`: a missing `MEMB_INFO` row (already purged, or
  never existed) returns `ALREADY_PURGED` uniformly, by explicit design
  decision (not distinguishing the two).

### Expected result codes (exhaustive, all four)

`SUCCEEDED`, `INVALID_INPUT`, `ACCOUNT_NOT_FOUND` (ANONYMIZE only),
`STAFF_ACCOUNT_REJECTED`, `GUILD_MASTER_BLOCKED`,
`ACTIVE_MARKET_LISTING_BLOCKED`, `ALREADY_ANONYMIZED` (ANONYMIZE),
`ALREADY_PURGED` (PURGE), `MU_TRANSACTION_FAILED` (catch-all —
`sp_getapplock` timeout or any unhandled T-SQL error).

### Concurrency strategy

`sp_getapplock` exclusive lock per-account (see Transaction boundaries).
Real test: `GrantVip_and_SyncVipTier_racing_the_same_account_never_corrupt_state`
(`SqlServerLocalIntegrationTests.cs`) — two different operations racing
the same account, final state is always one of the two coherent
outcomes, never a torn/mixed state.

### Post-check strategy

Every operation returns a JSON detail blob
(`EntitiesAffectedJson`/`TablesAffectedJson`) with counts, never raw
data — callers (the GameBridge Agent, then the Worker/apps/api) can log
and alert on unexpected counts (e.g. `extendedCleanupRows` unexpectedly
high) without the JSON itself ever carrying PII.

### Kill switches

Agent-side, per-operation, env-flag gated
(`GAME_BRIDGE_GRANT_VIP_ENABLED`/`..._SYNC_VIP_TIER_ENABLED`/
`..._ANONYMIZE_ENABLED`/`..._PURGE_ENABLED`) — `GameCommandWorker`
refuses (`COMMAND_TYPE_DISABLED`) before ever calling the SQL writer.
`PURGE` is explicitly **disabled by default even when others are
enabled** (`GameCommandWorkerTests.Purge_disabled_by_default_even_when_others_are_enabled`)
— the most destructive operation requires its own explicit opt-in, not
inherited from a general "GameBridge writes enabled" flag.

### Installation order (for a future real production install, NOT done this round)

1. `bm_GrantVip`, `bm_SyncVipTier` (lowest risk — MAX-rule/reconciliation
   only, no delete/rename).
2. `bm_AnonymizeGameAccount` (`WITH EXECUTE AS OWNER` — verify the
   installing login owns the procedure correctly; on a cross-server
   restore this needs `ALTER AUTHORIZATION ON DATABASE::<db> TO sa`
   first, per the real bug found and fixed this session,
   `lab-environment.md` Part 7).
3. `bm_PurgeGameAccount` (highest risk, install last, after the other
   three are confirmed working).
4. `local-writer-login.sql`/`proposed-writer-login-grants.sql`
   equivalent — `EXECUTE`-only grants, `DENY` on the whole schema.

### Verification queries (real, used this round)

```sql
-- Confirm least-privilege (run AS the restricted login, not sysadmin):
SELECT HAS_PERMS_BY_NAME('dbo.bm_GrantVip', 'OBJECT', 'EXECUTE')          -- expect 1
SELECT HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'SELECT')             -- expect 0
SELECT HAS_PERMS_BY_NAME('dbo.CustomQuest', 'OBJECT', 'ALTER')            -- expect 0 (ownership chaining, not caller ALTER)

-- Confirm no orphaned rows after a purge, for any of the Phase K tables:
SELECT COUNT(*) FROM T_CGuid WHERE Name IN (SELECT Name FROM <purged accounts' characters>)  -- expect 0
```

### Rollback / disable procedure

No production install has happened, so there is nothing to roll back.
For a FUTURE production install: `DROP PROCEDURE dbo.bm_*` reverts
cleanly (no other object depends on these four); disabling the Agent's
kill-switch env vars stops new commands from being dispatched without
needing a SQL-side change at all — the kill switch is the fast/preferred
rollback path, procedure removal is the slow/complete one.

## Part 18 — formal independent-review checklist

| Check | Result | Evidence |
|---|---|---|
| NO dynamic SQL | **PASS** | All four procedures use static T-SQL only — grep-confirmed, no `EXEC(@sql)`/`sp_executesql` anywhere in the four files |
| NO broad grants | **PASS** | `local-writer-login.sql`: `EXECUTE`-only on the four named procedures, `DENY SELECT/INSERT/UPDATE/DELETE ON SCHEMA::dbo` |
| NO direct table grants | **PASS** | Same evidence — no `GRANT ... ON <table>` anywhere in the grants script |
| NO wildcard delete | **PASS** | Every `DELETE`/`UPDATE` in all four procedures has an explicit `WHERE` clause scoped to `@LegacyLogin`/`@Characters`/a specific `GUID` set — none unconditional |
| NO arbitrary procedure execution | **PASS** | No `EXEC` of a caller-supplied procedure name anywhere |
| Correct schema | **PASS** (Phase K) | All four now compile and run cleanly against both the synthetic 25→46-table test schema AND the real 138-table restored production schema (`lab-environment.md`) |
| Complete dependency coverage | **PASS** (Phase K, was FAIL before this round) | Cross-checked against the native `WZ_DeleteCharacter`/`WZ_RenameCharacter` procedures' own real dependencies — the gap this found and fixed is the headline finding of this phase |
| Idempotency | **PASS** | See above, all four real-tested |
| Concurrency | **PASS** | `sp_getapplock` + real concurrent-call tests |
| Audit | **PARTIAL** | JSON detail blobs give a count-level audit trail at the SQL layer; a durable, queryable audit LOG table for these four operations specifically does not exist at the GameServer layer (Portal-side audit exists via `AuditService`/`GameBridgeJob` history) |
| Fail closed | **PASS** | `sp_getapplock` failure → `MU_TRANSACTION_FAILED`, never silently proceeds; any unhandled error → `ROLLBACK` via `XACT_ABORT ON` + `CATCH` block |
| Post verification | **PASS** | Real post-checks proven in both `lab-gamebridge-test.sql` and `SqlServerLocalIntegrationTests.cs` |
| Staff protection | **PASS** | `Admin<>0` rejected by both ANONYMIZE and PURGE, independent of the Portal's own role check (defense in depth) |
| Production safeguards | **PASS** | No production install this round; every write this session was against `bloodmoon_gamebridge_test`/`bloodmoon_gameserver_lab`, both local-only |

**Overall: READY_FOR_INDEPENDENT_SQL_REVIEW = YES.** The one `PARTIAL`
(a dedicated SQL-side audit log) is a real, honestly-reported gap, not a
blocker — Portal-side audit trail already exists for every command that
reaches these procedures.

## Phase L, Part 10 — SQL-side audit decision support

**Question**: does adding a dedicated SQL-side audit table for the four
`bm_*` procedures materially improve forensic audit, lost-response
diagnosis, replay investigation, or destructive-operation accountability
enough to justify it before production?

**Portal/D1 audit only (current state)**: every `GameBridgeJob`/command
is recorded in Cloudflare D1 (the Worker's own durable store) with
`commandId`/`provisioningRequestId`/status/timestamps, correlated with
Portal-side `AuditService` events (who requested, when, via which
admin/player action). This already answers "who asked for this and
when" and "what was the command's lifecycle" completely.

**What Portal/D1-only audit CANNOT answer**: the exact row-level SQL
state immediately before/after a specific `bm_AnonymizeGameAccount`/
`bm_PurgeGameAccount` execution — e.g., exactly which `T_FriendMain`
GUID was resolved for a given character, or the precise
`extendedCleanupRows` breakdown per table for one specific purge. The
JSON detail blobs (`EntitiesAffectedJson`/`TablesAffectedJson`) DO
already carry per-table counts, but not per-row detail, and are stored
Portal-side, not SQL-side — if a future dispute needed to reconstruct
"what exactly did this call touch, verified from inside the GameServer
database itself, independent of what the Agent reported back," today's
design cannot do that.

**A SQL-side minimal command audit (a new table, e.g. `bm_CommandAudit(commandId,
legacyLogin, operation, resultCode, tablesAffectedJson, executedAt)`,
written inside the same transaction as each `bm_*` procedure) would add**:
a GameServer-side-verifiable record, independent of the Agent/Worker/Portal
chain — useful specifically if that chain is ever suspected of lying or
losing a response (a real, if narrow, threat model: a compromised or
buggy Agent could report `SUCCEEDED` without the SQL side agreeing, or
vice versa). It would NOT add anything Portal/D1 doesn't already have for
the normal case.

**Data duplication and security considered**: the audit row would
duplicate information already in D1/Portal audit (some redundancy is
the whole point — it's a cross-check, not a replacement). Security-wise,
it's a pure `INSERT`, same least-privilege model as everything else
`bm_*` already does (no new permission surface), and — same as the
existing JSON blobs — must stay count/metadata-only, never row contents
or PII.

**Recommendation: implement a minimal SQL-side audit table before
production, but treat it as a real, contained, easy addition, not a
blocker to the phases already completed.** The design is
straightforward (one new table, one `INSERT` per procedure, inside the
existing transaction) and materially improves destructive-operation
accountability specifically for `bm_PurgeGameAccount`/`bm_AnonymizeGameAccount`
— the two irreversible/hard-to-reverse operations, where an independent,
GameServer-side-verifiable record has real value. **Not implemented this
round** — the design above is non-invasive and could be added without
disrupting anything already built and tested, but per Bryan's own
instruction ("do not implement until recommendation is presented unless
clearly non-invasive and required for correctness"), this is presented
as a recommendation for a future round, not implemented unilaterally
now, since it is an improvement, not a correctness requirement, for
today's tested-and-passing behavior.
