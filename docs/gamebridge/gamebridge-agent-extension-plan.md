---
status: PLAN_FOR_REVIEW_NOT_IMPLEMENTED
category: gamebridge/infrastructure
audience: internal (Bryan approval required before any SQL Server or production change)
lastVerified: 2026-08-30
---

# GameBridge Agent Extension Plan — GRANT_VIP / ANONYMIZE_GAME_ACCOUNT / PURGE_GAME_ACCOUNT

**Nothing in this document has been executed.** No stored procedure created, no SQL Server permission changed, no Agent/Worker code changed, no deploy, no push. Every fact about the *existing* pipeline below was re-verified this session (read-only) against the real source and the real production schema — nothing here is assumed or copied from an earlier phase's notes without re-checking.

---

## PARTE 1 — Arquitetura atual (o que já existe, verificado de novo agora)

### O pipeline real de `CREATE_GAME_ACCOUNT`, ponta a ponta

```
apps/api (game-account-identity/game-provisioning)
  → GameCommandTransportClient.create()          [HMAC-signed HTTPS]
  → Cloudflare Worker  POST /internal/game-commands
      → D1 table `game_command`  (status: CREATED → QUEUED)
      → Cloudflare Queue `GAME_COMMANDS`           (makeQueuedCommandAvailable → AVAILABLE)
  → GameBridge Agent (.NET, on the game VPS)
      → GameCommandWorker (BackgroundService, poll loop)
      → transport.ClaimAsync() → Worker POST /internal/game-commands/claim   (AVAILABLE → CLAIMED, 30s lease)
      → GameCredentialDecryptor.Decrypt()          (AES-256-GCM, DPAPI-protected local key)
      → GameCommandProcessor.ExecuteAsync()
          → ProvisioningLedger (local SQLite)       [crash-safe idempotency, independent of D1]
          → IGameDatabaseWriter.CreateGameAccountAsync()
              → SqlServerGameDatabaseWriter          [ADO.NET, bloodmoon_writer credential]
              → EXEC dbo.DmN_CreateGameAccount        [the ONLY SQL surface this login can reach]
      → transport.ReportAsync()  → Worker POST /internal/game-commands/:id/result   (→ SUCCEEDED / FAILED_RETRYABLE / FAILED_FINAL)
  → apps/api's GameProvisioningReconciliationService polls transport.get()/retry() to reflect status back into GameAccountIdentity.provisioningStatus
```

### Origem do comando (apps/api)

`GameCommandTransportClient` (`apps/api/src/modules/game-account-identity/game-command-transport.client.ts`) sends `{ method, path, body }` to `GAME_DATA_WORKER_URL`, HMAC-SHA256-signed over `clientId\nMETHOD\npath\nquery\ntimestampMs\nnonce\nsha256(body)`, headers `X-Agent-Id`/`X-Agent-Timestamp`/`X-Agent-Nonce`/`X-Agent-Signature`. Today it only builds one payload shape, `CreateGameCommandEnvelope` (`commandType: 'CREATE_GAME_ACCOUNT'`, `legacyLogin`, `expiresAt`, an AES-256-GCM `credential` envelope for the new in-game password). **The class itself (auth, signing, timeouts, error mapping) is generic — reusable for new command types with no change.** Only the envelope *shape* is CREATE_GAME_ACCOUNT-specific today.

### Worker (`apps/game-data-worker/src/commands.ts`)

Real, D1-backed state machine per command: `CREATED → QUEUED → AVAILABLE → CLAIMED → SUCCEEDED | FAILED_RETRYABLE | FAILED_FINAL | EXPIRED`.
- `createCommand()`: validates every field (GUID format, ISO date, base64 lengths, `SCOPE` regex for environment/serverId), computes `requestHash = sha256(canonical fields)`, INSERT-first idempotency (`commandId`/`provisioningRequestId` unique; a retry with an identical body reuses the row, a retry with a *different* body is `409 IDEMPOTENCY_CONFLICT`), then enqueues to the Cloudflare Queue.
- `claimCommands()`: authenticated by `clientId` (from the verified HMAC), restricted to that Agent's own configured `{environment, serverId}` scope (`agentScope()`), leases up to N commands atomically (`UPDATE ... WHERE status IN ('AVAILABLE','FAILED_RETRYABLE')`, single-row-affected check prevents double-claim), auto-reclaims expired leases and auto-expires overdue commands first.
- `reportCommandResult()`: idempotent (`SUCCEEDED` is terminal and re-reporting the *same* result is a no-op `duplicate:true`; a *different* result on an already-`SUCCEEDED` row is `409 RESULT_CONFLICT`), ownership-checked for non-success reports (`claimed_by` must match, except a late `SUCCEEDED` is accepted from any claimant scoped correctly — "execution may have committed before the response was delayed").
- `getCommandResult()` / `retryFailedCommand()`: read-back and admin-triggered retry (only from `FAILED_FINAL`, only before `expires_at`).
- `deleteExpiredCommandHistory()`: retention cleanup of terminal rows after `COMMAND_RETENTION_DAYS`.

**Hard-coded to one command type today**: both `db/schema.sql`'s `game_command.command_type` column (`CHECK (command_type = 'CREATE_GAME_ACCOUNT')`) and `commands.ts`'s `parseCreate()` (`v.commandType !== 'CREATE_GAME_ACCOUNT'` rejects everything else) must change to admit new types. **This is real work, not a reuse.**

### Agent (`apps/game-bridge-agent/Commands/`)

`GameCommandWorker` (BackgroundService): poll → `transport.ClaimAsync()` → per claimed command, pre-execution guards (scope match, not expired, `command.CommandType != "CREATE_GAME_ACCOUNT"` → immediate `FAILED_FINAL COMMAND_TYPE_DENIED`) → `GameCommandProcessor.ExecuteAsync()` → report result. Exponential backoff with jitter on transport failure; idle poll interval otherwise (config-driven, `CommandPollIntervalSeconds`/`CommandMaxBackoffSeconds`).

`GameCommandProcessor.ExecuteAsync()`: strict input validation (GUID format for both IDs, `legacyLogin`/`gameCredential` charset+length), computes a `requestHash` over `(commandType, provisioningRequestId, legacyLogin, sha256(credential))`, `ProvisioningLedger.BeginOrGetAsync()` — a **local SQLite** idempotency ledger, independent of the Worker's D1 ledger (defense in depth: even if the Worker somehow redelivered a command, this ledger's `INSERT OR IGNORE` + hash comparison stops a second execution) — then `writer.CreateGameAccountAsync()`.

`SqlServerGameDatabaseWriter.CreateGameAccountAsync()`: opens a connection with the `bloodmoon_writer` credential, `EXEC dbo.DmN_CreateGameAccount @LegacyLogin, @GameCredential OUTPUT @ResultCode, @NewMembGuid` — the **only** SQL statement this component ever issues. `CommandTimeout = 20`.

**Reusable without change**: `GameCommandTransportClient`'s signing plumbing, the Worker's HMAC verification (`auth/hmac.ts`) and nonce replay protection (`auth/nonce.ts`), the Agent's poll/backoff loop shape, `ProvisioningLedger`'s pattern (one ledger per command family), the `bloodmoon_writer` least-privilege model itself (EXECUTE-only, one procedure per grant, `sp_getapplock` for procedure-internal concurrency, no dynamic SQL).

**Not reusable without change**: the D1 schema's `CHECK` constraint and CREATE_GAME_ACCOUNT-shaped columns (`legacy_login`, `credential_*`, `result_memb_guid`), `commands.ts`'s `parseCreate()`/`canonicalRequest()`, the Agent's `GameCommandModels.cs` (`CreateGameAccountCommand`/`GameCommandResult` are typed to this one operation), `GameCommandProcessor`'s single `ExecuteAsync(CreateGameAccountCommand)` overload, `IGameDatabaseWriter`'s single method, and of course a brand-new stored procedure + grant per new operation.

### Stored procedure (`dbo.DmN_CreateGameAccount`) — the exact pattern every new procedure must follow

Reviewed again this session (`references/game-data/sql-discovery/phase-3c-write-schema-verification-20260824/derived/`). Real, working, verified-in-production properties:
- `sp_getapplock @Resource='BloodMoon:CreateGameAccount:'+LOWER(@LegacyLogin), @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000` — serializes concurrent attempts at the *same* logical key inside one transaction, released automatically at COMMIT/ROLLBACK.
- Idempotent replay: if a row already exists with the same `(memb___id, memb__pwd)` **and** a matching `AccountCharacter` row, returns the existing `memb_guid` with `ResultCode='SUCCEEDED_REPLAY'` instead of erroring or duplicating.
- `BEGIN TRY / BEGIN TRANSACTION ... COMMIT / BEGIN CATCH ... ROLLBACK` with `SET XACT_ABORT ON`; on any failure, `@ResultCode='MU_TRANSACTION_FAILED'`, **no raw SQL error text ever returned to the caller**.
- Static T-SQL only — every table/column name is a literal in the procedure body, never a parameter. No `sp_executesql`, no dynamic `EXEC()`.
- Ownership chaining: `bloodmoon_writer` never receives table permissions — the procedure (owned by `dbo`) can read/write `MEMB_INFO`/`AccountCharacter` because *it* is checked against its owner, not the caller.

### `bloodmoon_writer` permissions today (re-verified this session's read-only exploration, not re-run)

`GRANT EXECUTE ON dbo.DmN_CreateGameAccount TO bloodmoon_writer` — the **only** grant. `DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO bloodmoon_writer` as defense-in-depth (the fresh-login-has-zero-permissions default already makes this redundant, but it's an explicit, permanent policy against a future accidental `sp_addrolemember`). Never added to any server or database role. The install script's own verification block (re-read this session) proves, via `EXECUTE AS USER='bloodmoon_writer'`, zero SELECT/INSERT/UPDATE/DELETE on `MEMB_INFO`, `AccountCharacter`, `Character`, `warehouse`, or `CashShopData` — not even SELECT.

### Retorno / retry / auditoria / falhas (existing)

- Result shape: `{status, resultCode, membGuid}` — `resultCode` is a short enum string (`SUCCEEDED`, `SUCCEEDED_REPLAY`, `INVALID_INPUT`, `LEGACY_LOGIN_COLLISION`, `MU_TRANSACTION_FAILED`), never a raw exception.
- Retry: Agent-side exponential backoff+jitter on transport errors; Worker-side automatic lease reclaim on stale `CLAIMED`; explicit admin `retryFailedCommand()` only from `FAILED_FINAL`.
- Idempotency: three independent layers — Worker D1 `requestHash` (rejects a *changed* retry), Agent-local `ProvisioningLedger` (crash-safe, survives an Agent restart mid-execution), and the stored procedure's own replay-by-credential-hash check (the ultimate authority, since it's checked against the real committed state).
- Audit today: `apps/api`'s own `AuditEvent` records the provisioning request; the Worker's D1 `game_command` row itself is a durable, queryable record (`attempt_count`, timestamps, `result_code`) but is **not** copied into `apps/api`'s `AuditEvent`/`AuditService` — reconciliation reads it back via `GET /internal/game-commands/:id`, and `apps/api`'s `GameProvisioningReconciliationService` logs its own `GameProvisioningAttempt` rows locally. **This existing gap (Worker-side command history not mirrored into the Portal's audit trail) is called out explicitly in Part 10 below**, since Bryan's ask for audit on the new operations should not inherit it silently.
- Failures: classified `FAILED_RETRYABLE` (transient — SQL unavailable, execution error) vs `FAILED_FINAL` (permanent — invalid input, scope mismatch, expired, wrong command type, legacy-login collision) at the Agent, mirrored into the Worker's state machine on report.

---

## PARTE 2 — Novos command types: contrato completo

All three share this shape (extending, not replacing, `CreateGameCommandEnvelope`):

```
GameCommandEnvelope {
  commandId: GUID                    // Worker/Agent transport idempotency key
  provisioningRequestId: GUID        // apps/api's own request identity (existing pattern)
  commandType: 'CREATE_GAME_ACCOUNT' | 'GRANT_VIP' | 'ANONYMIZE_GAME_ACCOUNT' | 'PURGE_GAME_ACCOUNT'
  environment: string                // existing SCOPE-validated field
  serverId: string                   // existing SCOPE-validated field
  expiresAt: ISO8601                 // existing, ≤24h out (unchanged validation window)
  legacyLogin: string                // existing field, reused for all three (the GameServer account key)
  payload: <type-specific, below>    // NEW — generalizes the CREATE_GAME_ACCOUNT-only `credential` field
}
```

`commandId` is the immutable idempotency key at every layer (Worker D1 row PK, Agent `ProvisioningLedger` key, and — new — the stored procedure's own `sp_getapplock` resource name will incorporate it or the target `legacyLogin`, per operation below).

### GRANT_VIP

| Field | Value |
|---|---|
| `commandType` | `GRANT_VIP` |
| `payload` (minimum) | `{ targetLevel: 1 \| 2 \| 3 }` — the Portal has already resolved Bronze/Silver/Gold → AL1/2/3 before sending; the Agent/procedure never sees "Bronze" (per Bryan's decision #1: AL is internal implementation, not a Portal concept) |
| Idempotency key | `commandId` (Worker/Agent layers) + `legacyLogin` (procedure's `sp_getapplock` resource, since the *effect* — "set AccountLevel to at-least X" — is naturally idempotent by design, see Part 3) |
| Validation | `legacyLogin` matches the existing `[A-Za-z0-9]{4,10}` charset (same as today); `targetLevel` ∈ {1,2,3} strictly (never 0 — GRANT_VIP never *lowers* anyone to Free; that would be a different, unbuilt operation); account must already exist (`MEMB_INFO` row present) — GRANT_VIP never creates an account |
| Authorization | Same HMAC/agent-scope model as today — no new authorization concept needed, since the caller identity (`clientId` = the deployed `apps-api-command` client) doesn't change per command type |
| States | Same Worker state machine (`CREATED→QUEUED→AVAILABLE→CLAIMED→SUCCEEDED/FAILED_RETRYABLE/FAILED_FINAL/EXPIRED`) — reused unchanged |
| Response | `{status, resultCode, previousLevel, newLevel}` — **new fields** `previousLevel`/`newLevel` (replacing `membGuid`, which is CREATE_GAME_ACCOUNT-specific) so apps/api's reconciliation can confirm no downgrade happened and log the before/after |
| Retryable errors | `SQL_UNAVAILABLE`, `EXECUTION_UNAVAILABLE` (transient, same taxonomy as today) |
| Terminal errors | `INVALID_INPUT` (bad targetLevel/legacyLogin shape), `ACCOUNT_NOT_FOUND` (new — GRANT_VIP requires an existing account), `AGENT_SCOPE_DENIED`, `COMMAND_EXPIRED`, `COMMAND_TYPE_DENIED` (reused) |
| Timeout | Same `CommandTimeout=20`s at the SQL layer; same `expiresAt` ≤24h window at the transport layer |
| Auditoria | See Part 10 — `commandId`, `legacyLogin` (not raw PII beyond what's already logged today), `targetLevel`, `previousLevel`/`newLevel`, timestamps, `resultCode` |
| Nunca no payload | No WCoin amount, no price, no payment reference, no VipEntitlement.id, no idempotencyKey from `VipGrant` — the GameServer side only ever needs to know "what level, for which account," never *why* or *how much was paid*. Keeping payment data out of this payload is a deliberate boundary: a GameServer-side compromise can change tiers but can never learn pricing/payment identifiers, and a Portal-side compromise of the payment path can't be replayed as a GameServer command without also forging the HMAC |

### ANONYMIZE_GAME_ACCOUNT

| Field | Value |
|---|---|
| `commandType` | `ANONYMIZE_GAME_ACCOUNT` |
| `payload` (minimum) | `{}` — empty. Everything the procedure needs (which account, and that it's a real anonymize-not-purge request) is already in `legacyLogin` + `commandType` itself. No new fields needed. |
| Idempotency key | `commandId` + `legacyLogin` (`sp_getapplock` resource `'BloodMoon:AnonymizeGameAccount:'+LOWER(@LegacyLogin)`) |
| Validation | `legacyLogin` exists; account is **not** already anonymized (see Part 4 for the marker); account is not a staff/system account (see Part 4) |
| Authorization | Same model, unchanged |
| States | Same, unchanged |
| Response | `{status, resultCode, entitiesAffected: {character: n, warehouse: bool, ...}}` — a per-entity affected-count/flag map (Part 4/10), not just a single ok/fail |
| Retryable | `SQL_UNAVAILABLE`, `EXECUTION_UNAVAILABLE` |
| Terminal | `INVALID_INPUT`, `ACCOUNT_NOT_FOUND`, `ALREADY_ANONYMIZED` (idempotent success path, not an error — see Part 4), `STAFF_ACCOUNT_REJECTED`, `AGENT_SCOPE_DENIED`, `COMMAND_EXPIRED`, `COMMAND_TYPE_DENIED` |
| Timeout | Same 20s **may be too short** if the procedure touches many tables in one transaction — flagged as an open decision in Part 16/Risks, not silently raised |
| Auditoria | `commandId`, `legacyLogin`, per-entity outcome map, timestamps, `resultCode` — explicitly **never** the account's real email/name/password (those never leave the Portal DB; the GameServer side only ever knew `legacyLogin`/`memb__pwd`, and `memb__pwd` is never read back by this operation) |
| Nunca no payload | No Portal `accountId` (UUID), no email, no `AccountDeletionRecord.originalEmailHash` — this command is 100% scoped to the GameServer's own `legacyLogin` key, never carries Portal-side identifiers across the boundary |

### PURGE_GAME_ACCOUNT

| Field | Value |
|---|---|
| `commandType` | `PURGE_GAME_ACCOUNT` |
| `payload` (minimum) | `{ betaCycleId: string }` — required, non-empty, echoing the Portal's own `PurgeBatchRecord.betaCycleId` so the GameServer-side action is traceably scoped to the same batch, never inferred |
| Idempotency key | `commandId` + `legacyLogin` (`sp_getapplock` resource `'BloodMoon:PurgeGameAccount:'+LOWER(@LegacyLogin)`) |
| Validation | `legacyLogin` exists; `betaCycleId` non-empty and charset-restricted (reuse the existing `SCOPE` regex family); **account must be marked eligible before this command is ever sent** — the Agent/procedure does not re-derive eligibility (accountPhase, zero balance, etc.) since that's Portal-side state the GameServer doesn't have; eligibility is apps/api's `assessPreBetaPurgeEligibility()`'s job, already built and tested (Phase 14) — this command is only ever issued *after* that check passed, and the procedure's own job is narrower: refuse a `legacyLogin` matching any staff/system marker regardless of what the Portal believes (defense in depth, Part 5) |
| Authorization | Same model, unchanged |
| States | Same, unchanged |
| Response | `{status, resultCode, tablesAffected: {...counts...}}` |
| Retryable | `SQL_UNAVAILABLE`, `EXECUTION_UNAVAILABLE` |
| Terminal | `INVALID_INPUT`, `ACCOUNT_NOT_FOUND`, `ALREADY_PURGED` (idempotent, not error), `STAFF_ACCOUNT_REJECTED`, `AGENT_SCOPE_DENIED`, `COMMAND_EXPIRED`, `COMMAND_TYPE_DENIED` |
| Timeout | Same flag as ANONYMIZE — likely needs a longer `CommandTimeout` given the number of tables involved (Part 5) |
| Auditoria | `commandId`, `legacyLogin`, `betaCycleId`, per-table affected-row-counts, timestamps, `resultCode` |
| Nunca no payload | No Portal `accountId`, no `PurgeBatchRecord.id` (only the human-readable `betaCycleId`, which is already non-sensitive by design in the existing Portal schema), nothing resembling a wildcard/pattern — `legacyLogin` is always one literal string |

---

## PARTE 3 — GRANT_VIP: desenho detalhado

### O que já existe no GameServer (re-verificado, não assumido)

`INFORMATION_SCHEMA.COLUMNS` search for `%Vip%` this session found: `MEMB_INFO.RewardVip` (confirmed 0 across all 9 real accounts, appears to be a referral-reward counter, not a tier or expiry field), and three tables belonging to the **dormant, unrelated legacy DMN CMS** (`DmN_Vip_Packages`, `DmN_Vip_Users`, `DmN_VipSystem` — all empty, zero real usage, see `docs/economy/legacy-dmn-cms-and-currency-investigation.md`). **There is no dedicated VIP-expiry column anywhere in the real schema.** The actual VIP *tier* signal the Phase 12-15 audit already confirmed drives real gameplay differentiation is `MEMB_INFO.AccountLevel` (int, 0-3) — a flat, non-expiring value.

**This is the single most important design fact for GRANT_VIP**: the GameServer has no native concept of "VIP expires on date X." `AccountLevel` is just "the current level," full stop. This was already the Portal's own architecture from Phase 13 (`VipEntitlement.expiresAt` on the Portal side is the sole source of truth for *duration*), and this plan does not change that — it confirms it was the right call. **GRANT_VIP's job is narrow: make `AccountLevel` reflect the Portal's current decision, right now. It is not responsible for expiry.**

### Extension / expired / multiple purchases / no lost days — how this is actually handled

All of this is **already solved on the Portal side** (`vip.service.ts#purchase()`, Phase 13, tested): extend-in-place math, `totalDaysGranted` tracking, idempotent purchase via `VipGrant.idempotencyKey`. GRANT_VIP does not need to know about days, extension, or expiry at all — every purchase (a fresh grant, an extension of an active entitlement, a repurchase after expiry) computes a `product.tier` on the Portal and sends **the same shape of command**: "set this account's AccountLevel to (at least) tier X." The GameServer side never sees "day 8 of 15," only "currently Silver."

**Consequence, stated plainly**: GRANT_VIP by itself does **not** close the loop on expiry *enforcement* — when a `VipEntitlement.expiresAt` passes, something must eventually tell the GameServer to drop `AccountLevel` back down. That "something" is **out of scope for the three operations Bryan asked to plan** (GRANT_VIP, ANONYMIZE_GAME_ACCOUNT, PURGE_GAME_ACCOUNT don't include a downgrade/expiry-sync operation). Flagged explicitly here rather than silently assumed solved: **a fourth command type (e.g. `SYNC_VIP_TIER` or `REVOKE_VIP`, driven by a scheduled Portal-side check against `VipEntitlement.expiresAt`) is a real, separate follow-up decision, not proposed or designed in this document.** Until it exists, a real player's `AccountLevel` will stay at their highest-ever-purchased tier indefinitely after expiry — worth an explicit call from Bryan (see Open Decisions) before GRANT_VIP goes live for real money.

### Never a downgrade, never a lost tier

Because a single AL0-3 value can't represent "Gold expired, but Bronze is still active underneath it," GRANT_VIP must **never blindly overwrite** `AccountLevel` — it must set it to `MAX(current AccountLevel, requested targetLevel)`. If the Portal ever needs to *lower* a tier (expiry, refund, moderation), that is explicitly a different, not-yet-designed operation (same gap as above) — GRANT_VIP by name and by design is monotonically upward-only, which is also the safe default given "nenhuma perda de dias restantes" — a MAX-based grant can never accidentally undo an existing, already-paid-for tier.

### Tabelas/campos tocados

Only `MEMB_INFO.AccountLevel`, one row, one column. Nothing else. (No `AccountExpireDate` touch — that field is unrelated, confirmed in Phase 3C as the general account-access expiry sentinel, not VIP-related.)

### Stored procedure — shape (no code, per instruction; described precisely)

`dbo.bm_GrantVip(@LegacyLogin VARCHAR(10), @TargetLevel TINYINT, @ResultCode VARCHAR(32) OUTPUT, @PreviousLevel TINYINT OUTPUT, @NewLevel TINYINT OUTPUT)`

- Input validation: `@LegacyLogin` same charset/length rule as the existing procedure; `@TargetLevel` must be exactly 1, 2, or 3 (reject 0 and reject >3) → `INVALID_INPUT` otherwise.
- `sp_getapplock @Resource = 'BloodMoon:GrantVip:'+LOWER(@LegacyLogin), @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000` — serializes concurrent GRANT_VIP calls for the *same* account (two near-simultaneous purchases), matching the existing pattern exactly.
- `SELECT @PreviousLevel = AccountLevel FROM MEMB_INFO WHERE memb___id=@LegacyLogin` — if no row, `ResultCode='ACCOUNT_NOT_FOUND'`, rollback, return.
- `SET @NewLevel = CASE WHEN @TargetLevel > @PreviousLevel THEN @TargetLevel ELSE @PreviousLevel END`
- `UPDATE MEMB_INFO SET AccountLevel=@NewLevel WHERE memb___id=@LegacyLogin` — only executes (and only needs to) when `@NewLevel <> @PreviousLevel`; if they're equal, this is a no-op **and still returns `SUCCEEDED`** (idempotent — re-sending the same or a lower-tier GRANT_VIP is always safe, never an error).
- `COMMIT`, `ResultCode='SUCCEEDED'`.
- Same `BEGIN TRY/CATCH`, `XACT_ABORT ON`, no raw error text pattern as the existing procedure.

### Transação

Yes — single, short, single-table transaction (simpler than `CREATE_GAME_ACCOUNT`'s two-table transaction). `sp_getapplock` scope is per-`legacyLogin`, so two different accounts' GRANT_VIP calls never contend with each other.

### Como evita concessão dupla

Four independent layers, same defense-in-depth shape as the existing operation: (1) Worker D1 `requestHash` rejects a mutated retry of the same `commandId`; (2) Agent `ProvisioningLedger` (extended to key on `commandType+commandId`, see Part 8) stops a second local execution after a crash; (3) `sp_getapplock` stops two *concurrent* deliveries for the same account from racing; (4) the procedure's own `MAX()` logic makes even a genuinely-duplicated, non-idempotency-caught execution harmless — running `bm_GrantVip` twice with the same `@TargetLevel` produces the same `@NewLevel` both times, by construction, not just by luck.

---

## PARTE 4 — ANONYMIZE_GAME_ACCOUNT: mapa de dependências real

**Confirmed this session via `sys.foreign_keys`**: exactly **one** real, declared foreign key exists anywhere in the entire `MuOnline` database referencing `MEMB_INFO` or `Character` — `CustomQuest.Name → Character.Name`, `ON DELETE CASCADE`. Every other relationship below is enforced only by GameServer application logic, never by the database. **This directly answers "não assuma cascades" — there is effectively nothing to assume; almost every entity below must be handled explicitly, because nothing happens automatically.**

| # | Entity (real table(s)) | Join key | Disposition | Why / evidence |
|---|---|---|---|---|
| 1 | Account row (`MEMB_INFO`) | `memb___id` | **ANONYMIZE** | The operation's own subject. See "what anonymize means" below — never a raw `DELETE`. |
| 2 | Characters (`Character`, `AccountCharacter`) | `AccountID`/`Id` | **ANONYMIZE** | Character *names* are player-visible and often reused/traded socially; renaming to a tombstone pattern (matching the Portal's own `deleted-<id>` convention) avoids leaking the original name while keeping row-level history intact for any downstream reporting. Not deleted — a real player's character progression (`resets`, `cLevel`) is data, not identity. |
| 3 | Quests (`CustomQuest`) | `Name` (Character) | **PRESERVE** (automatic) | The one real `CASCADE` FK — if a Character row's `Name` changes (per #2's anonymize-by-rename), this FK's cascade only fires on *delete*, not update, so this needs its own explicit rename-in-lockstep, not a reliance on the FK; flagged as **UNKNOWN_BEHAVIOR_ON_RENAME**, not assumed safe. |
| 4 | Guild membership (`GuildMember`) | `Name` (Character) | **DETACH** | Delete the member row (leaving a guild on account closure is the correct real-world equivalent of "you left"). |
| 5 | Guild leadership (`Guild.G_Master`) | `Name` (Character) | **BLOCK** | If the anonymized character is a guild's `G_Master`, ANONYMIZE_GAME_ACCOUNT must refuse (mirrors the Portal's own `foundedByAccountId` block, Phase 14) — a guild cannot be silently orphaned. Requires leadership transfer or guild disbandment first, exactly like the Portal-side rule. |
| 6 | Personal shop / market (`CustomMarketShop`) | `SellerAccount`/`SellerName` | **BLOCK** (if active) / **DETACH** (if none) | An active personal-shop listing (real Zen/items at stake, another player mid-purchase) cannot be silently anonymized out from under a live trade — block until no active listing exists, mirroring the Portal's own marketplace-listing block (Phase 14 Part D). |
| 7 | Legacy web marketplace (`DmN_Market`, `DmN_Market_Slots`, `DmN_Market_Logs`) | unconfirmed join key (dormant system, not investigated column-by-column this session) | **UNKNOWN** | Belongs to the same dormant legacy DMN CMS as the VIP tables — zero real usage confirmed for VIP, **not yet confirmed empty for this specific table set**. Must be checked (read-only) before this plan's ANONYMIZE procedure is finalized; not assumed empty just because sibling tables were. |
| 8 | Mail | — | **NOT_APPLICABLE** | No dedicated general in-game mail table was found this session (searched `%Mail%`/`%Post%`); only `T_FriendMail` (friend-system-scoped) exists. If a general mail system exists under a name not yet searched, this row must be revisited — reported honestly as not found, not assumed absent. |
| 9 | Rankings (`RankingBloodCastle`, `RankingCaptureTheFlag`, `RankingCastleSiege`, `RankingChaosCastle`, `RankingCustom`, `RankingDevilSquare`, `RankingDuel`, `RankingIllusionTemple`, `RankingKingGuild`, `RankingKingPlayer`, `RankingMataMata`, `RankingTvT`, `Gens_Rank`) | `Name` (Character), varies by table | **PRESERVE** | Leaderboard history is a record of a past event, not personal-identity data in the sense this operation cares about — the character *name* on a historical ranking row is exactly the kind of thing already being renamed at the source (#2), so no separate action is needed here; flagged as **PRESERVE_VIA_UPSTREAM_RENAME**, not independently touched. |
| 10 | Friends (`T_FriendMain`, `T_FriendList`, `T_WaitFriend`, `T_FriendMail`) | `Name`/`GUID` (unconfirmed exact `GUID` linkage to `Character`) | **DETACH** | Remove this account's own friend-list rows; other players' `T_FriendList` rows referencing this character by `FriendName` become stale references pointing at a now-renamed character — **UNKNOWN_DISPLAY_BEHAVIOR** (does the client show "player not found" gracefully, or error?) — flagged, not assumed benign. |
| 11 | Logs (`HACK_LOG`, `COMMAND_LOG`, `CONNECT_LOG`, `CHAT_LOG`, GameServer file-based logs per `remoteops.json`'s `LogDirectories`) | — | **PRESERVE** | File-based, not DB tables reachable by this stored-procedure model at all — out of scope for a SQL procedure entirely; explicitly not promised to be touched. |
| 12 | VIP (`MEMB_INFO.AccountLevel`) | `memb___id` | **ANONYMIZE (reset to 0)** | Per Bryan's own list. Resetting to AL0/Free on anonymize is the correct real-world equivalent of "no longer a distinguishable paying identity" — losing VIP status is an accepted, expected consequence of deleting your account, not a bug. |
| 13 | Warehouse (`warehouse`, `ExtWarehouse`) | `AccountID` | **DELETE or DETACH — open decision** | Both are opaque `varbinary` blobs (confirmed, Phase 14) — a stored procedure cannot "anonymize" binary item data field-by-field; the only two real options are delete the row (destroying stored items) or leave it in place keyed to the tombstoned `legacyLogin` (harmless once the account can't log in again). **Recommend DETACH (leave the row, keyed to the now-anonymized legacyLogin, since the account cannot authenticate afterward regardless)** — flagged as Bryan's call, not decided here. |
| 14 | CashShop balances (`CashShopData`) | `AccountID` | **ANONYMIZE (zero balances)** | Mirrors the Portal's own `AccountCurrency` zeroing in `executeNormalDeletion()` (Phase 14) — consistent treatment of currency across both systems. |
| 15 | Siege/Castle (`MuCastle_SIEGE_GUILDLIST`) | Guild-scoped, not account-scoped directly | **NOT_APPLICABLE** | Indirect at best (via guild membership, already handled at #4/#5) — no direct account/character column found. |
| 16 | Bans (`DmN_Ban_List`) | unconfirmed | **PRESERVE** | Belongs to the dormant legacy CMS but a ban record is exactly the kind of thing that should survive account anonymization for future abuse-pattern detection (same reasoning as the Portal's own `AccountModeration` preservation, Phase 14) — **UNKNOWN whether this table is genuinely dormant like its VIP siblings; not assumed empty**. |
| 17 | Account inventory/invites (`DmN_Account_Invt`) | unconfirmed | **UNKNOWN** | Not investigated this session — flagged, not assumed. |
| 18 | Everything else in the 74-table legacy DMN CMS not listed above | — | **UNKNOWN, OUT OF SCOPE** | The legacy panel itself was found dormant for VIP/payments/donations (Part 3 investigation), but this ANONYMIZE operation only needs to act on tables that are (a) real, live GameServer state, or (b) confirmed to hold real data. A full 74-table audit is not proposed as part of this plan — the operation's scope is the ~15 rows above, chosen because they're either confirmed-live GameServer tables or explicitly Bryan-named categories. |

### Required behaviors (per Bryan's list, mapped to the above)

- **Rejeitar staff/system**: needs a real, GameServer-side signal — `MEMB_INFO.Admin` (confirmed real column, `0` for all 9 accounts today) is the only candidate found. **Recommend**: the procedure refuses (`STAFF_ACCOUNT_REJECTED`) if `Admin <> 0`, as a GameServer-side defense-in-depth mirror of the Portal's own `role !== 'PLAYER'` check — never the *only* check (the Portal must still refuse first), but a second, independent gate in case a command ever reaches the Agent for an account the Portal misclassified.
- **Rejeitar ID vazio/wildcard**: `@LegacyLogin` is a single, non-empty, charset-validated `VARCHAR(10)` parameter — there is no mechanism in this design for it to ever be a pattern (no `LIKE`, no dynamic SQL) — structurally impossible, not just policy.
- **Validar accountPhase/mode quando disponível**: `accountPhase` is a Portal-only concept (Prisma `Account.accountPhase`) — the GameServer schema has no equivalent field. This validation happens entirely on the Portal side *before* the command is ever sent (already true today — `account-deletion.service.ts#dryRunNormalDeletion()`/`executeNormalDeletion()`). The GameServer-side procedure cannot re-check something it has no column for; noted as a real, structural limitation, not deferred carelessly.
- **Idempotente**: row #12's `AccountLevel` reset to 0 and #14's currency zeroing are naturally idempotent (setting 0 twice is still 0). Row #2's character rename needs an explicit **anonymization marker** so a second call recognizes "already done" rather than re-renaming an already-tombstoned name into a *different* tombstone value each time — **recommend** a deterministic tombstone pattern (e.g., a fixed prefix plus the immutable `memb_guid`, not a random/timestamped value) so the *same* input always produces the *same* output, making the whole operation trivially idempotent by construction rather than requiring a separate "already anonymized" lookup.
- **Não apagar auditoria que precisa sobreviver**: nothing in this table is a GameServer-side audit log by the definition used elsewhere in this project (file-based logs, #11, are untouched; DB-level history like Rankings, #9, is preserved via upstream rename rather than deletion).
- **Não preservar password hash / TOTP / secrets**: `memb__pwd` (the GameServer login credential) should be overwritten to a random, unusable value as part of the anonymize transaction — the account must not remain loggable-in after anonymization (this is new: the existing `DmN_CreateGameAccount` procedure never had to *invalidate* a credential, only set one). **Recommend**: set `memb__pwd` to a fresh, non-derivable random value generated by the procedure itself (`NEWID()`-derived or similar, never passed in from the caller — the Agent should not need to generate or transmit a "new anonymized password," since nothing needs to log in with it ever again).

---

## PARTE 5 — PURGE_GAME_ACCOUNT: ordem de exclusão real

Same one-real-FK finding from Part 4 applies here (`CustomQuest.Name → Character.Name ON DELETE CASCADE` is the only DB-enforced relationship in the whole schema) — **every other table below requires an explicit DELETE statement in the procedure, in a deliberate order, because nothing cascades automatically.**

### Exclusion order (most-dependent-first, mirroring the Portal-side lesson from Phase 14 — AccountCurrency had to be deleted before Account for the exact same "no automatic cascade" reason)

1. `T_FriendList` / `T_WaitFriend` rows referencing this character (as either side, since friend lists are effectively bidirectional even without a formal join)
2. `T_FriendMain` row for this character
3. `GuildMember` row (only if not blocking as guild master — same BLOCK rule as ANONYMIZE, Part 4 #5, still applies to PURGE)
4. `CustomMarketShop` rows where `SellerAccount`/`SellerName` matches (only if none active — same BLOCK rule as ANONYMIZE #6)
5. `RankingCustom`/`RankingBloodCastle`/etc. rows for this character name — **unlike ANONYMIZE (which preserves via rename), PURGE genuinely deletes these**, since a pre-Beta test account's leaderboard entry has no legitimate reason to survive a purge (these are disposable test accounts by the eligibility check's own definition)
6. `CashShopData` row for this `AccountID`
7. `warehouse` / `ExtWarehouse` rows for this `AccountID`
8. `CustomQuest` rows for this character `Name` — **the one place an existing `CASCADE` FK will fire automatically once step 9 deletes the `Character` row**; listed here anyway for completeness/documentation, since relying on it silently would violate "não assuma cascades" even though in this one case it happens to be real
9. `AccountCharacter` row(s) for this `legacyLogin`
10. `Character` row(s) for this `AccountID`
11. `MEMB_INFO` row for this `memb___id` — **last**, since nothing above has a real FK pointing at it, order among 1-10 is chosen for clarity/defense-in-depth rather than strict DB necessity, but `MEMB_INFO` must be last regardless, as the anchor identity row

### O que a operação exige (per Bryan's explicit list)

- **Account explicitly approved for PRE_BETA_PURGE**: enforced entirely on the Portal side today (`assessPreBetaPurgeEligibility()`, tested, Phase 14) — the GameServer-side procedure receives only accounts that already passed. The procedure does **not** re-derive eligibility (it has no access to `RechargeIntent`/`PurchaseIntent`/`VipGrant` — those are Portal-only tables) — this is a structural trust boundary, documented rather than papered over: *the SQL procedure trusts the Portal's eligibility decision; its own job is narrower (staff-rejection, non-empty-ID, no wildcard), not a full re-verification*.
- **Batch/scope identifier**: `@BetaCycleId` parameter, required, logged in the result and in the Worker-side command row — never inferred, never optional.
- **Explicit account ID**: `@LegacyLogin`, one literal string per call — PURGE_GAME_ACCOUNT is a **per-account** command; a "batch" is the Portal issuing N individual commands (one per approved account), never a single command with a list/pattern. This mirrors the Portal-side `executePreBetaPurge()`'s own design (Phase 14: `accountIds: string[]`, always explicit, never implicit-all) extended consistently to the GameServer side.
- **Dry-run matching before execution**: the Portal's `dryRunPreBetaPurge()` (Phase 14, already built) is the dry-run; this plan does not propose a GameServer-side dry-run mode for the procedure itself — the procedure is inherently the "real" side, only ever invoked after the Portal-side dry-run + explicit approval already happened. A GameServer-side "would-delete" preview is not built here; flagged as a possible-but-not-designed future addition if Bryan wants defense-in-depth beyond the Portal's own dry-run.
- **No wildcard, no date-only selection, no role/staff account, no OFFICIAL/PRE_BETA protected account outside the approved list**: all four are enforced structurally — no `LIKE`/pattern parameter exists in the contract at all (Part 2), `Admin<>0` rejection mirrors ANONYMIZE's staff check, and `accountPhase`/date-based selection is a Portal-only concept the procedure never sees or acts on (same structural-trust-boundary note as above).

### Partial failure detection and reconciliation

- The procedure runs steps 1-11 inside **one transaction** (`BEGIN TRY/BEGIN TRANSACTION ... COMMIT`, `XACT_ABORT ON`) — a failure at any step rolls back everything, so "partial failure" at the SQL layer is not a real state the database can be left in (either all 11 steps commit, or none do).
- "Partial failure" *can* still happen at the **transport** layer exactly like today's `CREATE_GAME_ACCOUNT` — e.g., the SQL transaction commits but the Agent crashes before `ReportAsync()`, or the network drops the response. This is **already solved by the existing three-layer idempotency** (Part 8) — a retry lands on the procedure's own idempotent-replay check (see below) and returns the already-purged state rather than erroring or re-attempting a delete against rows that no longer exist.
- **Reconciliation after the fact**: the Portal's existing `dryRunPreBetaPurge()`, re-run after a batch, should show zero `WOULD_DELETE` rows remaining for every `commandId` that reported `SUCCEEDED` — this is the same "run the dry-run again to confirm" pattern already documented in `account-deletion-architecture.md`'s 12-step workflow (Phase 14), now extended to also confirm the GameServer side, not just the Portal side.
- **Idempotent replay for PURGE specifically**: unlike GRANT_VIP (idempotent via `MAX()`) or ANONYMIZE (idempotent via a deterministic tombstone), a genuine `DELETE` is not naturally re-runnable — running the same 11 deletes twice is *safe* (the second run deletes nothing, since the rows are already gone) but the procedure must recognize "no `MEMB_INFO` row found for this `legacyLogin`" as `ResultCode='ALREADY_PURGED'` (a success-shaped terminal state), never as `ACCOUNT_NOT_FOUND` (which would be the correct, different terminal code for a `legacyLogin` that never existed in the first place — the procedure must distinguish these two cases, most simply by checking whether a matching `PurgeBatchRecord`-echoing marker was left behind, or more simply by trusting the Portal's own tracking and treating "row absent" as ambiguous but harmless either way for this narrow operation).

---

## PARTE 6 — Stored procedures propostas

Names follow the existing `dbo.DmN_*` convention loosely but are proposed as a new, clearly-Blood-Moon-owned prefix (`bm_`) to avoid any confusion with the legacy DMN CMS's own object naming (`DmN_Vip_Packages` etc. are a *different*, dormant system — reusing a `DmN_`-prefixed name for a new, real, actively-used procedure risks exactly the kind of confusion this whole investigation had to untangle). **Bryan's call** whether `bm_` or another prefix is preferred; not a technical constraint either way.

| Procedure | Parameters | Tables touched | Transaction | Idempotency strategy |
|---|---|---|---|---|
| `dbo.bm_GrantVip` | `@LegacyLogin VARCHAR(10)`, `@TargetLevel TINYINT`, OUT `@ResultCode VARCHAR(32)`, OUT `@PreviousLevel TINYINT`, OUT `@NewLevel TINYINT` | `MEMB_INFO` (1 column) | Single short transaction, `sp_getapplock` per `legacyLogin` | `MAX(current, target)` — naturally idempotent, no replay-detection table needed |
| `dbo.bm_AnonymizeGameAccount` | `@LegacyLogin VARCHAR(10)`, OUT `@ResultCode VARCHAR(32)`, OUT `@EntitiesAffectedJson NVARCHAR(MAX)` | `MEMB_INFO`, `Character`/`AccountCharacter`, `GuildMember`, `CustomMarketShop` (check only), `CashShopData`, `T_FriendMain`/`T_FriendList`/`T_WaitFriend`, `warehouse`/`ExtWarehouse` (per Part 4's open DETACH-vs-DELETE decision) | Single transaction, `sp_getapplock` per `legacyLogin` | Deterministic tombstone value (same input → same output); a second call finds the account already tombstoned and returns success without re-mutating |
| `dbo.bm_PurgeGameAccount` | `@LegacyLogin VARCHAR(10)`, `@BetaCycleId VARCHAR(80)`, OUT `@ResultCode VARCHAR(32)`, OUT `@TablesAffectedJson NVARCHAR(MAX)` | All 11 tables from Part 5's exclusion order | Single transaction, `sp_getapplock` per `legacyLogin` | `MEMB_INFO` row absence after a lookup ⇒ `ALREADY_PURGED`; genuinely destructive, no "replay produces the same effect" property beyond "deletes nothing the second time" |

All three: no dynamic SQL, no `EXEC()`/`sp_executesql`, no table/column name ever passed as a parameter, every statement fully static in the procedure body, `SET XACT_ABORT ON` + `TRY/CATCH` + no raw SQL error text ever returned — identical discipline to `dbo.DmN_CreateGameAccount`.

**Output-shape note**: `@EntitiesAffectedJson`/`@TablesAffectedJson` (NVARCHAR(MAX) holding a small, fixed-shape JSON object, e.g. `{"guildMember":1,"customMarketShop":0,...}`) is the simplest way to report *which* of the many entities in Part 4/5's maps were actually touched, without needing N separate OUTPUT parameters per procedure — flagged as a real design choice for review, not the only option (a fixed set of OUTPUT integers would also work and might be simpler to consume from C#, at the cost of being less self-describing if the entity list ever grows).

---

## PARTE 7 — Permissões SQL Server: BEFORE / AFTER

### BEFORE (today, re-verified this session)

```
bloodmoon_writer:
  GRANT EXECUTE ON dbo.DmN_CreateGameAccount
  DENY  SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo
  (no server role, no database role, no other object grant)
```

### AFTER (proposed — not applied)

```
bloodmoon_writer:
  GRANT EXECUTE ON dbo.DmN_CreateGameAccount        [existing, unchanged]
  GRANT EXECUTE ON dbo.bm_GrantVip                   [new]
  GRANT EXECUTE ON dbo.bm_AnonymizeGameAccount        [new]
  GRANT EXECUTE ON dbo.bm_PurgeGameAccount            [new]
  DENY  SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo [existing, unchanged — still the correct blanket denial]
  (no server role, no database role, no other object grant — unchanged)
```

### Explicitly NOT granted (confirmed by design, to be re-verified live exactly like the existing procedure's own verification block)

- No `SELECT`/`INSERT`/`UPDATE`/`DELETE` on `MEMB_INFO`, `Character`, `AccountCharacter`, `warehouse`, `ExtWarehouse`, `CashShopData`, `Guild`, `GuildMember`, `CustomMarketShop`, `T_FriendMain`/`T_FriendList`/`T_WaitFriend`, any `Ranking*` table, or any other table touched by the three new procedures — reachable *only* through the three narrow procedures, via the same ownership-chaining mechanism already proven for `DmN_CreateGameAccount`.
- No `db_owner`, `db_ddladmin`, `db_datawriter`, `db_datareader`, `sysadmin`, `serveradmin`, `securityadmin` — same as today.
- No schema-wide or database-wide `EXECUTE` — three new object-level grants, nothing broader. A future fourth procedure (e.g. the not-designed `SYNC_VIP_TIER`/`REVOKE_VIP` flagged in Part 3) would need its own explicit fourth grant, by the same pattern — this design deliberately never grants ahead of need.

### Verification (same discipline as the existing script's own self-check, extended)

The existing install script's verification block (`EXECUTE AS USER='bloodmoon_writer'` + `HAS_PERMS_BY_NAME` for every sensitive table/procedure) should be extended with three more `CanExecute*` checks (one per new procedure, expected `1`) and the *same* full list of `CanSelect/Insert/Update/Delete` checks against every table in Part 4/5's dependency maps (all expected `0`) — not a smaller check just because there are more tables now; the whole point of the original script was exhaustiveness, and that discipline should not shrink for this extension.

---

## PARTE 8 — Idempotência ponta a ponta

Reusing, not reinventing, the three-layer model already proven for `CREATE_GAME_ACCOUNT`:

1. **Portal → Worker (D1)**: `commandId` + `provisioningRequestId` are the existing idempotency keys; `requestHash` (SHA-256 over the full canonical payload) makes a *mutated* retry with the same `commandId` a hard `409 IDEMPOTENCY_CONFLICT` rather than silently executing a different command under an old ID. **Reused as-is for all three new types** — `canonicalRequest()` needs to be generalized to hash the new payload shapes (Part 1/2), not redesigned.
2. **Worker → Agent (claim lease)**: `CLAIMED` status + `claim_expires_at` lease, auto-reclaimed on expiry, single-row-affected UPDATE guarantees only one Agent instance ever "owns" a command at a time. **Reused as-is.**
3. **Agent-local (`ProvisioningLedger`, SQLite)**: crash-safe — if the Agent process dies *after* the SQL procedure commits but *before* it reports success to the Worker, this local ledger remembers the outcome and returns it on the next claim of the same command, without re-executing the SQL. **Reused as-is, extended** to key on `(commandType, commandId)` rather than assuming `CREATE_GAME_ACCOUNT`-shaped rows (today's schema is `provisioning_ledger` — the table/column names themselves are provisioning-specific and should either be generalized or a sibling ledger table added per command family; a design choice for Part 6-adjacent schema work, not decided here).
4. **The stored procedure itself (ultimate authority)**: this is the layer that actually matters if layers 1-3 are somehow bypassed or a genuinely new execution reaches the database. Each of the three procedures has its *own* idempotency property, chosen to match what "re-running this is safe" actually means for that operation:
   - GRANT_VIP: `MAX(current, target)` — mathematically idempotent, no bookkeeping needed.
   - ANONYMIZE_GAME_ACCOUNT: deterministic tombstone value — re-running produces the identical end state, detectable by checking "is this account already tombstoned" before mutating.
   - PURGE_GAME_ACCOUNT: `MEMB_INFO` row absence — re-running finds nothing left to delete, reports `ALREADY_PURGED`.

**No command retry, at any layer, can ever cause a second real-world effect** — VIP granted twice, an account anonymized into a *different* tombstone value on the second call, or a purge attempted against already-gone rows throwing a confusing error instead of a clean "already done."

---

## PARTE 9 — Concorrência

| Scenario | Resolution |
|---|---|
| VIP grant + account deletion (ANONYMIZE or PURGE) racing for the same account | Both use `sp_getapplock` scoped to the *same* `legacyLogin` resource string family (`'BloodMoon:'+OperationName+':'+LOWER(@LegacyLogin)`) — **recommend** these use a **shared** lock resource per account (e.g. `'BloodMoon:AccountMutation:'+LOWER(@LegacyLogin)`, not one distinct string per operation type) specifically so GRANT_VIP and ANONYMIZE/PURGE against the *same* account serialize against each other, not just against same-operation retries. This is a real change from the existing single-operation pattern (which only needed to serialize against itself) and must be called out explicitly: **without a shared lock namespace across all three new operations, a GRANT_VIP could commit against an account mid-ANONYMIZE, granting a tier to a tombstoned account.** Flagged as a required design decision, not an afterthought. |
| Account login + purge | Out of scope for these procedures (login is not a DB write these procedures interact with) — a real risk exists (a player logs in during/after their own pre-Beta test account is purged mid-session) but is a GameServer *session* concern, not a SQL Server concern; not solvable at the stored-procedure layer, flagged for Bryan's awareness rather than falsely claimed solved. |
| Market operation + purge | Covered by Part 5's BLOCK-if-active-listing rule — purge refuses rather than racing. |
| Character save + purge | Same category as "login + purge" — a live GameServer process writing `Character` rows outside these procedures is a real concurrent-writer this SQL-layer design cannot fully close; the transaction+lock protects the *procedure's own* consistency, not against the live GameServer engine process writing to the same row through its normal (non-procedure) path at the same instant. This is a genuine, named risk (see Part 16), not resolved by this plan alone — likely needs either an operational rule ("never purge an account with an active session," checkable via `last_login`/a session table if the engine exposes one — not investigated this session) or acceptance of a narrow race window. |
| Two VIP grants simultaneously (same account) | `sp_getapplock` exclusive per account — second call waits up to the lock timeout, then proceeds against the *updated* `AccountLevel`; `MAX()` logic makes the outcome correct regardless of arrival order. |
| Two deletion commands simultaneously (same account) | Same lock — second call (whichever mode) finds the account already anonymized/purged and returns the appropriate idempotent terminal state, never a race between "half-anonymized, half-purged." |

**Transaction isolation**: default `READ COMMITTED` (SQL Server's default, matching the existing procedure — no explicit isolation-level change proposed; `sp_getapplock` is doing the real serialization work, not the isolation level).

---

## PARTE 10 — Auditoria

### Per-command (all three operations)

| Field | Source |
|---|---|
| `commandId` | Existing transport field |
| `commandType` | Existing transport field, now variable |
| Account reference | `legacyLogin` only (never the Portal `accountId` UUID, per Part 2's "never in payload" rule — the Portal-side audit trail already links `legacyLogin` back to its own `accountId` via `GameAccountIdentity`, so this is not a lost linkage, just a deliberately one-directional one at the transport boundary) |
| `createdAt` | Existing Worker D1 column |
| `processedAt` | Existing Worker D1 `completed_at` column |
| `result` / `resultCode` | Existing pattern, extended vocabulary per Part 2/3/4/5 |
| `retryCount` | Existing Worker D1 `attempt_count` column |
| Agent version | **New** — not currently in the result report; recommend adding a static `agentVersion` field to `CommandResultReport` (cheap, high-value for future incident triage — "which build of the Agent executed this") |
| Procedure version | **New** — recommend each procedure carry a version comment/constant returned in its result JSON (e.g. `"procedureVersion":"1"`), so a future procedure change is distinguishable in the audit trail from which version actually ran a given command — mirrors the existing `verify` mode's definition-comparison discipline (Part 1) applied prospectively instead of only retroactively |

### Deletion-specific (ANONYMIZE and PURGE)

| Field | Source |
|---|---|
| `deletionMode` | `commandType` itself doubles as this (`ANONYMIZE_GAME_ACCOUNT` vs `PURGE_GAME_ACCOUNT`) — no separate field needed |
| `batchId` | `betaCycleId` for PURGE (Part 2); ANONYMIZE has no batch concept (always single-account, per Bryan's own real-player framing) |
| Records affected per entity/table | The `@EntitiesAffectedJson`/`@TablesAffectedJson` output (Part 6) |
| Verification result | **Recommend**: apps/api's reconciliation step (mirroring the existing `GameProvisioningReconciliationService` pattern) should, after a `SUCCEEDED` ANONYMIZE/PURGE result, be able to re-query (via a **future, separate, read-only** confirmation — not proposed as a new write-capable check) that the account is genuinely gone/tombstoned, closing the loop the same way `dryRunPreBetaPurge()` already does on the Portal side (Part 5) |

### The one real gap carried forward, named explicitly

Per Part 1: the Worker's D1 `game_command` table is not currently mirrored into apps/api's own `AuditEvent`/`AuditService`. For CREATE_GAME_ACCOUNT this was an acceptable gap (low-stakes, easily re-queried via `GET /internal/game-commands/:id`). **For ANONYMIZE_GAME_ACCOUNT and PURGE_GAME_ACCOUNT, given LGPD/legal-review implications already flagged in Phase 15's `financial-retention-policy.md` and `account-deletion-architecture.md`, this gap should probably close** — recommend apps/api write its own `AuditEvent` row (via the existing `AuditService`, already used everywhere else in this project) at the moment it *sends* the command and again when it *receives* a terminal result, rather than relying solely on the Worker's D1 row as the only record. Not implemented in this plan; named as a real, load-bearing recommendation for Part 13's rollout.

---

## PARTE 11 — Rollback / Recovery

### GRANT_VIP

- **Transaction rollback on failure**: standard — any error inside `BEGIN TRY` rolls back the single `UPDATE`, `AccountLevel` is left exactly as it was before the call.
- **Reconciliation if the response is lost after commit**: the `MAX()`-idempotent design means this is nearly a non-issue — a retry (automatic or manual) simply re-confirms the same `NewLevel`, no drift possible. The only "rollback" concept that could ever apply is a **deliberate downgrade** (refund, moderation) — which, as noted in Part 3, is explicitly a different, unbuilt operation. This plan does not promise a way to undo a GRANT_VIP; it only promises GRANT_VIP itself cannot double-apply.

### ANONYMIZE_GAME_ACCOUNT

- **Reversible or not**: **not reversible** by this operation's own design (the character rename, the credential invalidation, the currency zeroing are all one-directional). This mirrors the Portal side exactly — `executeNormalDeletion()` (Phase 14) is also one-directional; the *account row itself* survives (never a hard delete) but its identifying content does not come back.
- **Preconditions before the irreversible mutation**: all of Part 4's BLOCK conditions (guild master, active market listing) must have already cleared *before* this command is ever sent — same "Portal validates first, GameServer trusts but double-checks staff-only" boundary as PURGE.
- **No promised rollback for already-anonymized data** — stated here explicitly per Bryan's instruction not to promise something that doesn't exist: once `bm_AnonymizeGameAccount` commits, the original character name, warehouse ownership under the real name, and login credential are gone from the GameServer's perspective. The Portal's own `AccountDeletionRecord` (hashed username/email) is the *only* surviving trace, and it was never designed to allow reconstruction — it answers "was this ever an account," not "what was in it."

### PURGE_GAME_ACCOUNT

- **Irreversible**: by definition and by design — this is the whole point of restricting it to pre-approved, zero-financial-weight, pre-Beta test accounts.
- **Backup/snapshot requirement**: **recommend** a lightweight, pre-purge snapshot — not a full DB backup (out of proportion for a handful of disposable test accounts) but the `@TablesAffectedJson` output itself, captured into the Portal's `PurgeBatchRecord` (already exists, Phase 14) *before* being discarded, giving a minimal "what did we actually remove" record without keeping the removed data itself. A full pre-purge SQL Server backup/snapshot is a heavier operational decision (who takes it, where it's stored, how long it's kept) — flagged as an open question for Bryan (Part 16/Risks), not assumed either way.
- **Verification requirement**: re-running the Portal's `dryRunPreBetaPurge()` post-purge (Part 5) is the verification — an account that still shows `WOULD_DELETE` after a `SUCCEEDED` purge command is a real, actionable failure signal.
- **Approval gate**: already fully designed and built on the Portal side (Phase 14's `assessPreBetaPurgeEligibility()` + explicit `accountIds` list, never implicit) — this plan does not add a *second* approval gate at the GameServer layer beyond the staff/wildcard structural refusals already described (Part 5), since a second full eligibility re-check would require the GameServer to see Portal-only tables it structurally cannot reach.

---

## PARTE 12 — Test Plan (before implementation)

All against a **local/disposable** SQL Server test database — never the real `MuOnline` production database, mirroring the existing project-wide discipline. (This session has no local SQL Server instance available, per prior phases' findings — a disposable SQL Server/Azure SQL Edge container, or a dedicated non-production SQL Server instance, would be a prerequisite for actually running these tests; not solved in this plan, flagged in Part 13.)

### GRANT_VIP

1. Fresh account, AL0 → grant AL1 (Bronze): `AccountLevel` becomes 1.
2. Fresh account, AL0 → grant AL2 (Silver): becomes 2. → grant AL3 (Gold): becomes 3.
3. Already AL2 → grant AL1 (a "lower" purchase, e.g. a Bronze gift on a Gold account): `AccountLevel` **stays 2** (MAX rule) — this is the single most important correctness test in this whole plan.
4. Already AL3 → grant AL3 again (extension purchase, same tier): idempotent, stays 3, `ResultCode='SUCCEEDED'`, not an error.
5. "Expired VIP" (Portal-side `VipEntitlement.status='EXPIRED'`) → Portal does **not** send a GRANT_VIP for an expired entitlement's *natural* lapse (per Part 3's stated scope gap) — this test instead confirms a **fresh purchase after expiry** sends the same GRANT_VIP shape as any other purchase and behaves identically to test 1/2.
6. Duplicate command (same `commandId`, same payload) sent twice: second call is idempotent-detected at the Worker layer (D1 `requestHash` match) before ever reaching the Agent a second time in the happy path; a *forced* second Agent execution (bypassing the Worker layer, to specifically test the SQL procedure's own resilience) still produces the correct `MAX()` result.
7. Concurrent commands for the same account (two near-simultaneous GRANT_VIP calls, e.g. from a retry race): both eventually succeed, final `AccountLevel` is the higher of the two requested tiers, never a lost update.
8. Timeout after DB commit (kill the Agent process between the `COMMIT` and the `ReportAsync()` call): a subsequent retry (automatic reclaim or manual) finds the `ProvisioningLedger`/procedure-idempotency already reflects success and reports it without re-executing.
9. Retry after a genuine transient SQL failure (simulate `SQL_UNAVAILABLE`): classified `FAILED_RETRYABLE`, backoff, eventual success on a healthy retry.
10. Invalid AL (`@TargetLevel = 0` or `= 4`): `INVALID_INPUT`, no mutation.
11. Nonexistent account: `ACCOUNT_NOT_FOUND`, no mutation.

### ANONYMIZE_GAME_ACCOUNT

1. Normal player account with characters, guild membership (non-master), an inactive old market listing, nonzero CashShop balance, a friend-list entry: all Part 4 rows transition correctly in one pass.
2. Already-anonymized account: second call detects the tombstone marker, returns success without re-mutating (idempotency test).
3. Staff account (`Admin<>0`): `STAFF_ACCOUNT_REJECTED`, no mutation — this test should also cover the "Portal misclassified a staff account" scenario directly (construct a test row with `Admin=1` and NO Portal-side awareness of that flag, confirming the GameServer-side check catches it independently).
4. Missing account (`legacyLogin` never existed): `ACCOUNT_NOT_FOUND`.
5. Related-data assertions: guild master block (attempt to anonymize a `G_Master`, expect `BLOCKED`/refusal — exact result code TBD in implementation, but the behavior must be a clean refusal, not a partial anonymize that silently skips the guild); active market listing block (same shape).
6. Partial failure simulation: force an error mid-transaction (e.g., a constraint violation on one of the later DELETE/UPDATE statements) and confirm the *entire* transaction rolls back — no entity is left half-anonymized.
7. Retry after transient failure: same shape as GRANT_VIP test 9.

### PURGE_GAME_ACCOUNT

1. Approved pre-Beta account with zero dependencies (no guild, no listings, no friends): clean 11-step delete, `MEMB_INFO` row gone.
2. Approved pre-Beta account WITH dependencies (guild member of a non-master role, a friend-list entry, a ranking entry): confirms the full exclusion-order sequence, not just the trivial case.
3. Non-approved account (this test should assert the *Portal* never sends this command for a non-approved account — but also assert the procedure itself doesn't blow up if it somehow received one for an account that happens to still be a real, non-staff account; the procedure has no independent way to know "not approved," so this test mainly documents and confirms that structural limitation rather than testing a control that doesn't exist at this layer).
4. Staff account: `STAFF_ACCOUNT_REJECTED`, no mutation — same independent-check philosophy as ANONYMIZE test 3.
5. Official/other protected accountPhase: same structural-limitation note as test 3 — the procedure cannot see `accountPhase`, so this is fundamentally a Portal-side test (already covered by Phase 14's `PRE_BETA_PURGE_NEVER_TOUCHES_OPEN_BETA_OR_OFFICIAL_ACCOUNTS`), re-listed here only to confirm the boundary is understood, not duplicated at the SQL layer.
6. Wildcard/empty ID: structurally impossible per Part 2/5 (no pattern parameter exists) — this test asserts the parameter validation rejects an empty string, confirming the "structurally impossible" claim is actually enforced, not just assumed.
7. Dependencies: same as test 2, with an emphasis on the guild-master and active-listing BLOCK paths specifically (mirroring ANONYMIZE test 5).
8. Retry: same shape as GRANT_VIP test 9.
9. Partial failure: same shape as ANONYMIZE test 6 — full transaction rollback, no half-purged state.
10. Idempotency: purge the same account twice — second call finds `MEMB_INFO` absent, returns `ALREADY_PURGED`, attempts no further deletes (harmless even if it did, since everything is already gone, but the *correct* result code matters for clean audit trails).

---

## PARTE 13 — Rollout Plan (proposed, not executed)

1. **Local unit tests** — Agent-side (`GameCommandProcessor`, new command handling) and Worker-side (`commands.ts` extensions) against the existing xUnit/Vitest suites, following the exact patterns already in `BloodMoon.GameBridgeAgent.Tests`/`apps/game-data-worker/test`.
2. **Disposable/local SQL Server test DB** — the three new procedures created and exercised against Part 12's full test matrix, on infrastructure this session does not currently have access to (a real prerequisite gap, named honestly rather than assumed solved).
3. **Staging/safe test account if available** — if a non-production MuOnline SQL Server instance exists or can be stood up, re-run a subset of Part 12 against it before touching the real production database (mirrors the "controlled QA write" step the original `CREATE_GAME_ACCOUNT` rollout already did successfully, Phase 3C).
4. **Deploy procedures** — via the existing `bm-sql-admin-bootstrap.ps1`/`Invoke-SqlAdminBootstrap.ps1` pattern (Part 1's admin bootstrap tool), extended to recognize the three new procedure files, with the exact same static-SQL review guard (Part 6's "no dynamic SQL" requirement enforced by tooling, not just procedure discipline) re-applied to each new procedure's source before install.
5. **Grant EXECUTE only** — via `proposed-writer-login-grants.sql`'s established pattern (Part 7's AFTER state), applied only after step 4's install succeeds and step 4's own re-run of the verification query (Part 7) confirms exactly the expected grant set.
6. **Agent update** — new `GameCommandModels.cs` types, `GameCommandProcessor` extended to dispatch on `commandType`, `IGameDatabaseWriter` gains the two/three new methods, published and deployed to the game VPS (mirrors the existing `game-bridge-agent:publish` self-contained single-file build).
7. **Worker/command enablement** — D1 schema migration widening the `CHECK` constraint and adding the new nullable/generic payload columns (Part 1's identified real-work item), `commands.ts` extended to validate and route the three new `commandType`s.
8. **Controlled smoke** — one real GRANT_VIP against a real, disposable test account (mirroring the original `CREATE_GAME_ACCOUNT` controlled QA write, Phase 3C) — **not** an ANONYMIZE or PURGE smoke test against anything resembling a real account; those two should only ever be smoke-tested against a purpose-created disposable account, never one of the real 9.
9. **Reconciliation** — confirm the Worker's D1 row, the Agent's local ledger, and the actual `MEMB_INFO`/related-table state all agree, for every smoke-tested command.
10. **Enable production feature** — only after every prior step is green, and only as a separate, explicit decision from "the plan is technically sound" — this document does not request or imply that approval.

**Nothing in this rollout plan has been executed.**

---

## PARTE 14 — Kill switch

Three independent switches, not one global Agent kill switch, so a problem in one operation never forces disabling all GameBridge functionality (including the already-working, in-production-use `CREATE_GAME_ACCOUNT` path):

- **`GAME_BRIDGE_GRANT_VIP_ENABLED`** — checked by `GameCommandProcessor` before dispatching a `GRANT_VIP` command; if false, the Agent reports `FAILED_FINAL COMMAND_TYPE_DISABLED` (a new, distinct code from `COMMAND_TYPE_DENIED`, so an operator can tell "we don't support this at all" apart from "we support it but it's paused") without ever calling `IGameDatabaseWriter`.
- **`GAME_BRIDGE_ANONYMIZE_ENABLED`** — same shape, independent flag.
- **`GAME_BRIDGE_PURGE_ENABLED`** — same shape, independent flag, and per Bryan's own Phase 14/15 decision (`VIP_DELIVERY_WORKER_ENABLED` stays OFF until the real Agent is connected and tested) — **recommend this one defaults to `false` even after the other two are enabled**, given it's the only genuinely irreversible operation of the three, so enabling it is a deliberate, separate decision from "the pipeline works."
- All three read from Agent configuration (`appsettings.Local.json`/environment variables, the existing non-committed-secrets pattern), **not** from a per-request Worker/Portal flag — the Agent, running on the game VPS, is the last line of defense and should not trust a remote "yes it's safe" signal for something this destructive; a compromised or buggy Portal/Worker cannot re-enable a kill-switched operation.
- The Worker-side `game_command` table can independently stop *accepting new* commands of a given type (a Worker-side `COMMAND_TYPE_SUSPENDED` check in `parseCreate()`) as a second, earlier gate — belt-and-suspenders with the Agent-side switch, not a replacement for it.

---

## PARTE 15 — Pre-Beta accounts (no action this plan)

**No deletion, purge, or GameServer mutation of any of the real 9 accounts happens as part of this plan.** Restating the current, still-valid classification from `docs/accounts/pre-beta-account-review.md` (Phase 14) for reference only:

| Account | Status | Which operation would eventually apply, once you approve |
|---|---|---|
| `teste1` (character "Bryan", 104 resets) | **DO_NOT_PURGE** | Neither PURGE_GAME_ACCOUNT nor (unless you decide otherwise) ANONYMIZE_GAME_ACCOUNT — unchanged, awaiting your explicit confirmation |
| `teste3` (character "EtheriusZ", 102 resets) | **DO_NOT_PURGE** | Same — unchanged |
| `q3c5v6vrrx`, `q3def7ec77`, `uec490107b` | **SAFE_PRE_BETA_PURGE** (pending final confirmation) | `PURGE_GAME_ACCOUNT`, once you give the final go-ahead *and* the real Agent pipeline exists and is tested per this plan |
| `BMFAKE01`, `teste4` | **SAFE_PRE_BETA_PURGE** (pending final confirmation) | Same |
| `teste`, `teste2` | **UNREVIEWED** (manual review pending, per your instruction) | Not yet classified — no operation implied |

This table is unchanged from Phase 14/15 — included here only so this plan is self-contained, not as a re-decision.

---

## PARTE 16 — Segurança

| Threat | Existing control (re-verified, unchanged) | New control needed for GRANT_VIP/ANONYMIZE/PURGE |
|---|---|---|
| **Command forgery** | Route-bound HMAC-SHA256 (`clientId+method+path+query+timestamp+nonce+bodyHash`) — a signature for one route/body can never verify against another (proven by `hmac.spec.ts`, re-read this session) | None — reused as-is; the new payload shapes are covered by the same canonical-string construction once `commands.ts` is generalized (Part 1) |
| **Replay** | `request_nonce` table, INSERT-first uniqueness, clock-tolerance window | None new — same mechanism |
| **Queue poisoning** | Cloudflare Queue only ever carries `{commandId}` (a GUID) — the actual payload lives in D1, validated by `createCommand()` before the message is ever enqueued; a forged queue message with an unknown `commandId` is a no-op (`if (!row) { message.ack(); return }`) | None new |
| **Privilege escalation** | `bloodmoon_writer` is EXECUTE-only on one procedure, zero table access, not in any role (Part 7 BEFORE) | The AFTER state (Part 7) must be re-verified with the same rigor — three new EXECUTE grants, still zero table access, still no role — this is the single most important thing to get right in implementation, and this plan's whole structure (static SQL, no dynamic table names, narrow procedures) exists specifically to make privilege escalation structurally hard rather than policy-dependent |
| **SQL injection** | Impossible today — no dynamic SQL anywhere in the one existing procedure | Same guarantee required and designed-for in all three new procedures (Part 6: "no dynamic SQL anywhere," explicitly restated per-procedure) |
| **Arbitrary procedure invocation** | `bloodmoon_writer` can only EXECUTE the one procedure it's granted — no generic EXECUTE permission exists by SQL Server's own default-deny (re-confirmed in the existing script's own commentary, Part 1) | Same guarantee for the three new grants — each is its own explicit, narrow GRANT, never a broader "EXECUTE on schema" |
| **Agent compromise** | Local DPAPI-protected credential store (machine-scoped, not exportable off the VPS); `bloodmoon_writer`'s own least-privilege means even a fully compromised Agent process can only do what the four procedures (existing + 3 new) allow — it cannot read `MEMB_INFO` directly, cannot run arbitrary SQL, cannot escalate | **New, real risk to name explicitly**: a compromised Agent *can* call `bm_PurgeGameAccount` for any `legacyLogin` it chooses, since the SQL layer trusts "this call came from the Agent, which trusts the Worker's HMAC-verified request" — there is no SQL-side awareness of *which Portal user* requested the purge. This is not a new category of risk (the same is already true for `CREATE_GAME_ACCOUNT` today — a compromised Agent could create accounts), but PURGE's irreversibility makes the consequence more severe. Mitigated by: (a) the kill switch (Part 14), (b) the Agent only ever receiving commands the Worker validated against a real Portal-issued request, (c) `betaCycleId` + explicit-per-account design meaning even a compromised Agent can't "purge everyone" in one call — it would need one forged command per account, each independently auditable |
| **Secret leakage** | GameCredential's AES-256-GCM ciphertext-only transport (the plaintext game password never touches D1 or the Worker's logs); `bloodmoon_writer`'s password lives only in the Agent's local DPAPI store | GRANT_VIP/ANONYMIZE/PURGE payloads carry **no secrets at all** (Part 2's "never in payload" rows) — arguably a *smaller* attack surface than `CREATE_GAME_ACCOUNT`, since there's no credential envelope to protect in the first place |
| **Accidental bulk deletion** | N/A (no bulk operation exists today) | Structurally prevented by design, not just policy: no wildcard parameter exists anywhere in the contract (Part 2), PURGE is always one `legacyLogin` per command, a "batch" is always N individual Portal-issued commands, never a single command with list/pattern semantics — re-stated from Part 5 because it is the single most important anti-bulk-deletion property of this whole plan |
| **Stale command execution** | `expiresAt` ≤24h window, checked both Worker-side (auto-`EXPIRED`) and Agent-side (`COMMAND_EXPIRED` before execution) | Reused as-is — no reason for VIP/ANONYMIZE/PURGE to need a different expiry window than the existing 24h default, though Bryan may want PURGE specifically to have a *shorter* window given its irreversibility (open decision, not decided here) |

---

## ENTREGÁVEL

This document: `docs/gamebridge/gamebridge-agent-extension-plan.md`. No code written this phase.

---

## FINAL REPORT

```
GAMEBRIDGE_EXTENSION_PLAN = PASS

CURRENT_PIPELINE_REUSED = HMAC signing/verification (Agent+Worker), nonce replay protection,
  Worker claim/lease/report state machine, Agent poll/backoff loop, ProvisioningLedger pattern
  (extended, not replaced), bloodmoon_writer least-privilege model, sp_getapplock concurrency
  pattern, TRY/CATCH-no-raw-error-leak procedure discipline, static-SQL-only discipline,
  existing admin bootstrap tool pattern for procedure install + verification

NEW_COMMANDS = [GRANT_VIP, ANONYMIZE_GAME_ACCOUNT, PURGE_GAME_ACCOUNT]

NEW_STORED_PROCEDURES_PROPOSED = [dbo.bm_GrantVip, dbo.bm_AnonymizeGameAccount, dbo.bm_PurgeGameAccount]
NEW_SQL_GRANTS_PROPOSED = [EXECUTE ON dbo.bm_GrantVip TO bloodmoon_writer,
  EXECUTE ON dbo.bm_AnonymizeGameAccount TO bloodmoon_writer,
  EXECUTE ON dbo.bm_PurgeGameAccount TO bloodmoon_writer]

DIRECT_TABLE_WRITE_PERMISSION_REQUIRED = NO
DYNAMIC_SQL_REQUIRED = NO
GLOBAL_EXECUTE_REQUIRED = NO

GRANT_VIP_PLAN = PASS
ANONYMIZE_PLAN = PASS
PURGE_PLAN = PASS

IDEMPOTENCY_PLAN = PASS
CONCURRENCY_PLAN = PASS  (one required design decision flagged: shared lock namespace
  across all account-mutating operations, Part 9 — not yet a code change, a plan requirement)
AUDIT_PLAN = PASS  (one recommended, not-yet-decided improvement flagged: mirror Worker D1
  command history into apps/api's own AuditEvent for ANONYMIZE/PURGE specifically, Part 10)
KILL_SWITCH_PLAN = PASS
ROLLBACK_RECOVERY_PLAN = PASS  (PURGE's irreversibility stated plainly, not glossed over)
TEST_PLAN = PASS
ROLLOUT_PLAN = PASS  (one real prerequisite gap named: no local/disposable SQL Server test
  instance currently available to this session, Part 13 step 2)

PRODUCTION_CHANGED = NO
SQL_PROCEDURE_CREATED = NO
SQL_PERMISSION_CHANGED = NO
AGENT_CHANGED = NO
WORKER_CHANGED = NO
DEPLOY = NO
PUSH = NO
```

### RISKS

1. **GRANT_VIP has no expiry-enforcement counterpart.** Once granted, `AccountLevel` never comes back down on its own — a fourth, not-designed command (`SYNC_VIP_TIER`/`REVOKE_VIP`) is a real, near-term follow-up need, not covered by this plan's three operations (Part 3).
2. **Compromised-Agent risk is more consequential for PURGE than for the existing CREATE_GAME_ACCOUNT**, because purge is irreversible (Part 16). Mitigated but not eliminated by the kill switch and per-account-explicit design.
3. **Live-session concurrency (login/character-save racing a purge) is not fully solvable at the SQL layer** — flagged as a named, accepted gap rather than a false promise (Part 9).
4. **No local/disposable SQL Server test environment currently exists for this session** to actually execute Part 12's test plan — a real infrastructure prerequisite, not assumed solved (Part 13).
5. **The Worker's D1 schema has a hard `CHECK` constraint limiting it to one command type today** — real schema-migration work, not a config flag (Part 1/7/13).
6. **The `warehouse`/`ExtWarehouse` DETACH-vs-DELETE question for ANONYMIZE (Part 4, entity #13) is a genuine open call**, not a technical constraint either way — both are defensible, and the choice affects what a future support/legal request ("does the account still have their old items somewhere") can honestly answer.

### OPEN_DECISIONS_FOR_BRYAN

1. Approve or reject the overall three-procedure, `bloodmoon_writer`-extended approach (Part 6/7) before any SQL Server change is made.
2. `warehouse`/`ExtWarehouse` on ANONYMIZE: DETACH (leave in place, account can't log in anyway) or DELETE (Part 4, entity #13)?
3. Should PURGE_GAME_ACCOUNT get a shorter `expiresAt` window than the existing 24h default, given its irreversibility (Part 16)?
4. Should `GAME_BRIDGE_PURGE_ENABLED` default to `false` even after GRANT_VIP/ANONYMIZE are live (recommended, Part 14) — confirm this is the desired default?
5. Approve (or defer) closing the audit gap: mirror Worker D1 command history into apps/api's `AuditEvent` for ANONYMIZE/PURGE specifically (Part 10) — worth the extra implementation work now, or acceptable to defer given the existing D1 record is still real and queryable?
6. Is a pre-purge lightweight snapshot into `PurgeBatchRecord` (Part 11) sufficient, or does Bryan want a heavier, full pre-purge SQL Server backup step in the rollout (Part 13)?
7. Naming: `bm_` prefix for the new procedures acceptable, or a different convention preferred (Part 6)?
8. Confirm the not-yet-designed VIP-expiry-enforcement operation (Risk #1) should be scoped as an explicit follow-up phase, separate from this three-operation plan.
9. Where should the local/disposable SQL Server test environment for Part 12/13 actually come from (Risk #4) — is this something Bryan can provision, or does it need its own separate investigation?

STOP.
```
