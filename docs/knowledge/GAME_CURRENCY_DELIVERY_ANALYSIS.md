---
status: FINDING_FOR_BRYAN_REVIEW
category: knowledge
audience: internal (product + engineering + security)
lastVerified: 2026-09-21
confidence: HIGH for what the committed code does; MIXED for deployment (see GAMEBRIDGE_DISAMBIGUATION.md Part 5); the game-side behaviour of external CashShopData writes is UNKNOWN and is flagged everywhere it matters
---

# Game-currency delivery — architecture analysis (Phase 20)

**Question.** A player pays real money (Pix via Asaas) and the Portal credits
its own WC wallet. How, if at all, should currency reach the game — and can the
existing HMAC command channel carry it safely?

**Scope and safety.** Analysis only. **Nothing was implemented, enabled,
installed, written to a game or production database, or pushed.** No SQL was
executed (the vendor/lab procedures were *read* from preserved documents; the
one procedure body that matters — `WZ_SetCoin` — is not preserved and was not
queried). No production system was contacted. **Phase 20A (2026-09-19) update:** ~~`WZ_SetCoin` … is not preserved and was not queried~~ — it and `CashShopData` were read, read-only, in the lab and are now preserved with hashes (Part 14.2); the remote D1 was read with SELECT-only queries (Part 14.4). Still no SQL executed, nothing written, no production write. `GAME_CURRENCY_DELIVERY` remains
**UNDECIDED** as a *decision*; this file records evidence and a recommendation
for Bryan to accept, amend or reject.

Vocabulary: currency names are fixed in
[`CURRENCY_TERMINOLOGY.md`](CURRENCY_TERMINOLOGY.md); the seven things called
"GameBridge" are fixed in [`GAMEBRIDGE_DISAMBIGUATION.md`](GAMEBRIDGE_DISAMBIGUATION.md).
Below, **`GAME_COMMAND_TRANSPORT`** is the HMAC → Worker/D1/Queue → Agent → SQL
channel and **`PORTAL_BRIDGE_JOB_OUTBOX`** is the `GameBridgeJob` table.

## Part 1 — Bottom line

| Question | Answer |
|---|---|
| Can `GAME_COMMAND_TRANSPORT` carry a currency credit? | **Yes as a *channel*, no as it stands.** Its authentication, queueing, lease, retry and acknowledgement machinery is generic and has run in production for one command type. It is **not safe for an additive credit today**: every idempotency guarantee it has is keyed by *transport* ids or relies on the *effect being naturally repeatable* (a MAX rule, a state check). A credit is neither. |
| What is missing for a currency command? | (1) a new SQL procedure with a **business idempotency key enforced inside the SQL transaction**; (2) an `EXECUTE` grant for it on the production writer login (today: one procedure); (3) Worker routing for the type (committed Worker code accepts **only** `CREATE_GAME_ACCOUNT`); (4) an Agent handler + kill switch; (5) a Portal delivery record and dispatcher; (6) a decision on **which game currency Portal WC is** (open by earlier decision). |
| Which option? | **RECOMMEND_OPTION_B** *(direction accepted by Bryan on 2026-09-19; implementation NOT approved — Part 14.1)* — a new command type on the existing channel — **conditional** on nine gating prerequisites (Part 11). Option A is barred by ADR-0002/0023/0024 *and* by network topology; Option D collapses into B or A; Option C is orthogonal (a possible *last hop*), not safer by default. |
| Is a decision ready? | *(2026-09-19: the direction is now decided; P2 is closed; see Part 14.5)* **YES for the mechanism decision** (choose the direction); **NO for implementation** — three unknowns (Part 11: P2, P3, P5) can change the last hop or the deploy path, not the transport choice. |
| The one silent-corruption risk to remember | An external write to `CashShopData` while the player is online may be **invisible or overwritten** by the GameServer's in-memory copy. Nothing preserved says which. **UNKNOWN**, not "probably fine". |

## Part 2 — Audit of `GAME_COMMAND_TRANSPORT`

Evidence is code read this phase unless stated. Paths are repository-relative.

| Aspect | Finding | Source |
|---|---|---|
| **Transport** | Portal `POST /internal/game-commands` → Worker stores `CREATED` in D1 → Cloudflare Queue (at-least-once) → consumer marks `AVAILABLE`. Agent (outbound-only, no listener) `POST /game-commands/claim` → runs → `POST /game-commands/result`. Poll: 10 s idle, 1 s after work, exponential + jitter to 120 s on failure. | `apps/game-data-worker/src/{index,commands}.ts`; `docs/game-data/production-command-transport.md`; `GameCommandWorker.cs:25-58` |
| **Authentication** | Route-bound HMAC-SHA256 over `clientId·METHOD·path·query·timestamp·nonce·sha256(body)`; ±5 min skew; nonce INSERT-first table, 10 min TTL. Separate secret maps: Portal (`COMMAND_PORTAL_SECRETS_JSON`: create/reconcile/retry) vs Agent (`COMMAND_AGENT_SECRETS_JSON`: claim/result). | `src/auth/hmac.ts`, `src/config.ts:1,5`, `src/index.ts:75-110`; Portal `game-command-transport.client.ts:97-104` |
| **Authorization** | **Per route, not per command type.** Whoever holds the Portal HMAC secret may create *any* type the Worker accepts. Real restrictions are elsewhere: Worker validation, Agent kill switches (four new types default `false`; `CREATE_GAME_ACCOUNT` has none), Agent scope `environment`+`serverId`, and the SQL login's grants. | `index.ts`; `AgentOptions.cs:36-39`; `GameCommandWorker.cs:71-84` |
| **SQL privilege** | `bloodmoon_writer`: no role, no table grant, **sole permission `EXECUTE` on `dbo.DmN_CreateGameAccount`** ("cannot create … cash-shop rows, currencies"). | `docs/security/game-write-boundary.md:7-14,27-33` |
| **Command schema** | Envelope `{commandId, provisioningRequestId, commandType, environment, serverId, legacyLogin, expiresAt}` + `credential` (create) or `payload` (others). Agent parses payload fields by name. **No schema-version field.** TTL ≤ 24 h at creation; the VIP gateway uses 1 h. | `commands.ts:219-230`; `game-command-transport.client.ts:5-56` |
| **Acknowledgement** | Agent → Worker `SUCCEEDED / FAILED_RETRYABLE / FAILED_FINAL` + `resultCode`. **"Applied" means: the stored procedure returned and committed.** There is **no** channel to the GameServer process, so nothing can acknowledge that the game *sees* the change. | `GameCommandWorker.cs:86-95`; procedures' OUTPUT params |
| **Replay protection (request)** | timestamp window + nonce table. | `hmac.ts`, `nonce.ts` |
| **Idempotency layers** | See the table below. | — |
| **Retry** | Agent backoff; Worker lease reclaim (60 s) → `AVAILABLE`; `FAILED_RETRYABLE` re-claimable; Portal retry only from `FAILED_FINAL` with the **same** identities; **the Portal VIP gateway mints a *new* commandId when a command reaches `FAILED_FINAL`/`EXPIRED`** (safe only because of the MAX rule); Portal worker `MAX_ATTEMPTS = 8`. | `commands.ts:87-122,189-211`; `game-bridge-vip.gateway.ts:104-121`; `vip-delivery.service.ts:14` |
| **Audit trail** | D1 row (attempt_count, timestamps, result code; **deleted after 90 days** by a daily cron); Agent SQLite ledger (**never pruned**); SQL `bm_GameBridgeAudit` (two rows per call; **only the four extension procedures, not installed on production; not `DmN_CreateGameAccount`**); Portal `GameProvisioningAttempt` / `AuditEvent` (anonymize/purge only) / `VipSyncState`. | `commands.ts:213-217`; `provisioning-health.md:66-74`; ADR-0002 |
| **Failure handling** | `ClassifyFailure`: known validation errors → `FAILED_FINAL`; `SqlException` → `FAILED_RETRYABLE SQL_UNAVAILABLE`; **any other exception → `FAILED_RETRYABLE EXECUTION_UNAVAILABLE`**. | `GameCommandWorker.cs:188-195` |
| **GameServer online / offline** | The Agent talks **only to SQL Server**. Writes succeed whether the GameServer process is up or down; the transport neither knows nor waits for player sessions. Dependence is on Agent + VPS + SQL being up. | `deployment-topology.md`; `IGameDatabaseWriter.cs` |
| **Deployment** | Infrastructure + `CREATE_GAME_ACCOUNT`: deployed and active as of 2026-08-24. Everything else: not deployed. Full table in `GAMEBRIDGE_DISAMBIGUATION.md` Part 5. | ibid. |

### Idempotency layers — and why none is sufficient for an additive credit

| # | Layer | Key | Protects against | Sufficient for a credit? |
|---|---|---|---|---|
| 1 | Portal outbox row | `GameBridgeJob.idempotencyKey` (unique), e.g. `vip-bridge:<grant key>` | creating two obligations for one business event | necessary (Portal side) |
| 2 | Worker D1 | `command_id` PK, `provisioning_request_id` UNIQUE, `request_hash` → `409 IDEMPOTENCY_CONFLICT` | resubmitting the **same command**, or mutating it | **no** — a *new* command for the same obligation passes |
| 3 | Claim lease | conditional `UPDATE … WHERE status IN (…)`, 60 s | two Agents running one command at once | no — lease expiry re-issues the command |
| 4 | Agent SQLite ledger | `command_id` PK + `provisioning_request_id` UNIQUE + request hash; `EXECUTING` lease **30 s**; a recorded `SUCCEEDED` is replayed without calling the writer | a redelivered command after a **completed** execution (proven by the 3D-A restart/response-loss test, `raw/04`) | **no** — see the crash window below |
| 5 | SQL procedure | `CREATE`: applock + replay-by-credential-hash · `GRANT_VIP`/`SYNC_VIP_TIER`: applock + MAX rule / state compare · `ANONYMIZE`/`PURGE`: state check | repeated execution *because the effect is repeatable or state-detectable* | **no** — additive credit is neither. **The audit table's `CommandId` index is non-unique and no procedure consults it** (`proposed-bm-gamebridge-audit-table.sql:53`) |

**The crash window.** `GameCommandProcessor` calls the writer, *then*
`ledger.Complete…`. If the process dies (or the SQL client loses the connection
*after* `COMMIT`) between the two, the ledger row stays `EXECUTING`; after 30 s
`BeginOrGetAsync` re-acquires it (`ProvisioningLedger.cs:42-46`) and the writer is
**called again**. For `CREATE_GAME_ACCOUNT` the procedure's replay check absorbs
it; for VIP the MAX rule does. A credit would be applied twice. A search of the Agent's
processor, worker and SQL-integration tests found concurrent-execution cases but
**no test of this reclaim path**; the production
test in `raw/04` exercised a *different* window (result report lost, ledger already
`SUCCEEDED`). Status: **untested for this window; safe today only by accident of
the commands' nature.**

## Part 3 — Command-type inventory

| Command | Portal envelope | Worker (committed) | Worker (uncommitted, `-openbeta`) | Agent handler | SQL procedure | Installed on prod SQL | Idempotent by | Used in production |
|---|---|---|---|---|---|---|---|---|
| `CREATE_GAME_ACCOUNT` | yes | **yes** | yes | yes (no kill switch) | `DmN_CreateGameAccount` | **yes** | applock + credential-hash replay | **yes — 2 commands ever** (QA), public registration provisioning off |
| `GRANT_VIP` | yes | **no** | yes | yes, default off | `bm_GrantVip` (local) | no | MAX rule | no ("0 real commands sent") |
| `SYNC_VIP_TIER` | yes | **no** | yes | yes, default off | `bm_SyncVipTier` (local) | no | desired-state compare | no |
| `ANONYMIZE_GAME_ACCOUNT` | yes | **no** | yes | yes, default off | `bm_AnonymizeGameAccount` (local) | no | `memb__pwd LIKE 'ANON%'` check | no |
| `PURGE_GAME_ACCOUNT` | yes | **no** | yes | yes, default off | `bm_PurgeGameAccount` (local) | no | row-absence = success | no |
| **`CREDIT_GAME_CURRENCY`** | **does not exist** | — | — | — | — | — | — | — |

Notes. "Committed" = identical blob `99a7b09b` on all 43 branch refs (39 local + 4 remote-tracking)
(`schema.sql` still `CHECK (command_type = 'CREATE_GAME_ACCOUNT')`). The
`GameBridgeOperation.CREDIT_CURRENCY` enum value is the *marketplace seller
credit* — no producer, no consumer, unrelated. Agent test counts in older docs
are historical and were not re-run.

## Part 4 — A `CREDIT_GAME_CURRENCY` command: feasibility and payload

**Feasibility: `FEASIBLE_WITH_PREREQUISITES — NOT SAFE AS-IS`.** Reusable
unchanged: HMAC, nonce, D1 state machine, Queue, lease/claim, Agent poll loop and
ledger pattern, Portal client (its header calls the plumbing "reusable for new
command types with no change"). New work is listed in Part 1.

**Design payload** (not implemented; names are proposals):

| Field | Rule |
|---|---|
| `commandType` | `CREDIT_GAME_CURRENCY` — deliberately not `CREDIT_CURRENCY` (the marketplace enum) |
| envelope | `commandId`, `provisioningRequestId` — **transport ids, fresh per submission**; `environment`, `serverId`, `expiresAt` as today |
| account identity | `legacyLogin` from `GameAccountIdentity` with `provisioningStatus = ACTIVE`; otherwise the same retryable `GAME_ACCOUNT_NOT_PROVISIONED` the VIP gateway returns |
| `payload.currency` | **named** value from a closed set, e.g. `GAME_CASH_WCOINC` · `GAME_GOLD_WCOINP` · `GAME_PCPOINT_GOBLINPOINT`. **Never a slot number** (three bases in use — Terminology Part 4). Exactly one place — the SQL procedure — translates name → column. Which names are enabled is a config allow-list. |
| `payload.amount` | positive integer; per-command and per-account/day caps enforced **in SQL**; overflow check against the current `int` column |
| `payload.creditKey` | **business idempotency key**, deterministic and **stable across every resubmission** of the same obligation (Part 5). Unique in SQL. |
| `payload.source` | `{type, ref}` — e.g. `RECHARGE_INTENT` + id. Audit only; never used for authorization. |
| `payload.reason` | closed enum (`RECHARGE`, `MANUAL_ADJUSTMENT`, `REPAIR`, …) |
| `payload.requestedAt` | ISO timestamp from the Portal clock, audit only |

## Part 5 — Exactly-once design (requirements, not code)

Principle: **at-least-once delivery + an idempotent apply whose key is persisted
atomically with the effect, in the system that owns the effect** (SQL Server).
"A payment/recharge must never grant currency twice" is enforced by *three*
independent guards, any one of which stops a duplicate:

* **R1 — Portal obligation is unique per payment.** A delivery record
  (`creditKey = game-credit:<RechargeIntent.id>:<currency>` or similar) is written
  **before any command is sent**, with a database unique constraint, in the same
  MySQL transaction that decides the recharge is delivered/credited. A replayed
  Asaas webhook can therefore not create a second obligation (webhook events are
  already unique per `(provider, topic, eventId)` — `PaymentWebhookEvent` — and
  `WalletLedgerEntry.idempotencyKey` is unique; the Asaas provider itself was
  not audited on this branch).
* **R2 — SQL applies a `creditKey` once.** One procedure, one transaction:
  `applock(account)` → look up `creditKey` in a credit-ledger table (`UNIQUE`) →
  if present, return `ALREADY_APPLIED` (success-shaped) with the recorded
  currency/amount, or `IDEMPOTENCY_CONFLICT` if the key exists with different
  account/currency/amount → else insert the ledger row **and** update
  `CashShopData` in the same transaction, creating the row if absent. Write the
  audit row inside the transaction (ADR-0002's correction). Ownership chaining
  keeps the login `EXECUTE`-only.
* **R3 — Resubmission always carries the same `creditKey`.** The Portal may mint
  a new `commandId` after `FAILED_FINAL`/`EXPIRED` (the outbox is the durable
  intent; the 1-hour command TTL is not), but **never a new key** for the same
  obligation. With R2 this makes blind resubmission safe *by construction*, which
  is the property the VIP gateway relies on through the MAX rule and a credit
  must obtain differently.
* **R4 — Portal state machine.** `PENDING → SUBMITTED(commandId) → CONFIRMED`
  (only on `SUCCEEDED` or `ALREADY_APPLIED`) `| FAILED_FINAL → MANUAL_REVIEW`.
  `CONFIRMED` is never set by `create()` succeeding (the VIP gateway's own rule).

| Scenario | What stops a second credit |
|---|---|
| retry after timeout | R3 same key → R2 `ALREADY_APPLIED` |
| duplicate command (Queue at-least-once, double claim, double submit) | D1 PK/hash, conditional claim, Agent ledger, then R2 |
| replayed provider webhook | R1 unique obligation; existing webhook dedupe |
| Portal process restart | outbox row is durable; dispatcher resumes; R1/R3 |
| Agent restart mid-execution | ledger `EXECUTING` reclaim → writer re-called → **R2 absorbs it** (this is exactly the crash window) |
| GameServer restart | irrelevant to the write; relevant to visibility (Part 8) |
| Worker/Queue redelivery | consumer only flips status; claim is conditional |

Two additional requirements: (a) the procedure must compile and behave on
**SQL Server 2014** (production; local tests ran on 2022 —
`docs/game-data/deployment-topology.md`, `docs/environment/sql-server-test-environment.md`),
so no `CREATE OR ALTER` / newer syntax; (b) the Portal must be able to answer
"was `creditKey` X applied?" for observability — either a read-only Agent path or
the ledger table read through the existing read-only reader — even though R2 makes
it unnecessary for correctness.

## Part 6 — Source of truth and the dual-balance risk

Three records exist or would exist: the **Portal wallet** (`AccountCurrency`,
`WalletLedgerEntry`), the **game balance** (`CashShopData`) and the **delivery
record** (Portal obligation + SQL credit ledger + command log).

* The **delivery record** is the source of truth for *"was this obligation
  fulfilled"*; `CashShopData` is the source of truth for *"how much can the player
  spend in game"*; the Portal wallet is the source of truth for *"what was paid
  for and what is spendable in the Portal"*.
* **Forbidden: one payment producing two spendable balances.** If a recharge
  credits Portal WC *and* later credits the game, the same money is spendable in
  both places, and — because the game side is spent natively (CashShop/X-Shop)
  where the Portal cannot see it — the two diverge permanently.

Three coherent models (Bryan to choose; none is chosen here):

| Model | Mechanics | Single-balance? | Cost |
|---|---|---|---|
| **T — transfer/escrow** | Recharge credits Portal WC. A player- or policy-triggered *transfer* debits Portal WC and creates the delivery obligation in **one MySQL transaction**; on `CONFIRMED` the debit is final; on permanent failure it is refunded. | yes — money moves, never duplicates | needs a transfer UX and an `IN_TRANSIT` state; a rate if WC ≠ 1 game unit |
| **D — direct-to-game package** | A recharge package's target is chosen at purchase; a game-target package creates the delivery obligation and **never mints Portal WC**. | yes | Portal wallet then serves only Portal purchases; package catalogue changes |
| **P — Portal-only currency, product delivery** | WC never enters the game; the Portal sells VIP/items and delivers *products* (exactly how VIP works today: `GRANT_VIP` moves a *tier*, not coins). | yes | players cannot spend Portal money in the native CashShop/X-Shop |

Also open: **chargeback/refund after delivery.** The Portal already models
`ChargebackCase` and claws back its own ledger; game currency already credited
and spent cannot be clawed back by the same mechanism. A policy (negative
balance? account restriction? no game delivery until a chargeback window closes?)
is required before any real-money delivery.

## Part 7 — Options A, B, C, D re-evaluated

Definitions unchanged from `CASH_VIP_INTEGRATION_MAP.md` Part 5. The scale is
`+` favourable, `~` neutral/unknown, `−` unfavourable.

| Dimension | **A** direct SQL from `apps/api` | **B** new command on `GAME_COMMAND_TRANSPORT` | **C** native GameServer mechanism | **D** legacy-DmN-style isolated service |
|---|---|---|---|---|
| Security boundary | **− −** violates ADR-0002 (Agent is *the only* game-DB writer), ADR-0023/0024 (`apps/api` holds no live GameServer credential), `game-write-boundary.md`; and **SQL listens on loopback only, no public 1433** — there is no inbound path from the cPanel host | **+** consistent with all three; needs **one** extra `EXECUTE` grant (privilege widening, procedure-only) | **~** unknown: closed engine; a Lua consumer would hold a SQL credential *in a script file* and run `SQLQuery(string)` (dynamic SQL) | **−** collapses into A (credential outside the VPS) or B (if on the VPS it *is* the Agent) |
| Idempotency | **−** none; must be built in two systems | **~** transport layers exist; the SQL-side key must be **new** (R2) | **?** unknown for `CustomPixSwitch`; Lua could implement its own | **−** legacy pattern had none; INSERT-then-UPDATE fallback only |
| Auditability | **−** Portal ledger only | **+** D1 + Agent ledger + SQL audit + Portal record | **~** GameServer log switches only (`WriteCashShopLog`) | **−** as A |
| Coupling | **−** Portal ↔ game schema | **+** Portal ↔ Worker contract; schema hidden behind a procedure | **~** couples to engine internals | **−** config-driven table/column names |
| Operational complexity | **~** little code, large infra/security cost | **~** four components + a production procedure + Worker and Agent deploys (the Agent has **no safe, tested deploy path** — `provisioning-health.md:70-74`) | **−** unknown engine behaviour | **~** |
| Failure recovery | **−** commit-then-timeout ambiguity, no ledger | **+** leases, ledger, retry, SQL dedupe | **~** | **−** |
| Game-availability dependency | **−** synchronous SQL reachability | **+** async; independent of the GameServer *process*; depends on Agent+VPS+SQL | **~** depends on the GameServer running its script | **~** |
| Transaction semantics | **−** no distributed transaction MySQL↔SQL Server; needs a saga anyway | **~** saga with escrow (Part 6, model T) | **~** | **−** |
| Rollback | **−** compensating `UPDATE` | **~** needs a `REVERSE_GAME_CURRENCY` with its own key and a negative-balance policy — none exists | **?** | **−** |
| Observability | **−** | **+** D1 status, Portal reconciliation, SQL audit | **−** | **−** |
| Extensibility | **−** | **+** generic channel; each type = Worker + Agent + procedure | **~** | **−** |
| Proven in this project | never | **partly** — `CREATE_GAME_ACCOUNT` end to end in production; nothing else | never | never (legacy code never carried a real payment: 0 transactions, `CLAIM-124`) |

### Option A versus the existing decisions

A is not merely "less preferred": it conflicts with **ADR-0002** ("the only code
path in the entire project with write access to the native GameServer database"),
**ADR-0023/0024** ("`apps/api` … never holds a live GameServer credential as a
runtime dependency"), the writer's least-privilege model, and the deployment
topology (`PUBLIC_SQL_PORT_OPENED = NO`, SQL bound to localhost). Choosing A
would require **superseding three decisions and opening a network path**. It
should be treated as rejected unless Bryan does exactly that, explicitly.

### Option B — risks, answered one by one

| Question | Answer |
|---|---|
| Can the GameServer acknowledge an applied command? | **No.** There is no channel to the process. The acknowledgement is "the procedure committed". Whether the game *sees* it is a separate, **UNKNOWN** question (Part 8). |
| Duplicate detection — where? | Today: transport ids only (Part 2). Needed: **SQL-side unique `creditKey`** (R2). |
| Where is idempotency persisted? | Portal MySQL (obligation, R1) and **SQL Server** (credit ledger, R2) — the two systems that own the money and the balance. The Agent's SQLite ledger is a cache of outcomes, not the authority. |
| Success but the ACK is lost? | Ledger/lease recovery reports the prior result (proven for `CREATE`); for a credit R2 additionally makes a second execution harmless. |
| GameServer offline? | Irrelevant to the write. Agent/VPS/SQL offline → the command waits `AVAILABLE` until its TTL, then `EXPIRED`; the Portal outbox re-issues with the **same key**. |
| Portal retries? | Only with the same `creditKey`; `MAX_ATTEMPTS`-style ceiling → `MANUAL_REVIEW`, never silent give-up or silent re-key. |

### Option C — from preserved evidence only

* **CustomPixSwitch**: present, never configured; its URL is still the
  placeholder `https://seudominio.com.br/pix.php`; internals closed-source. It
  **still needs a web endpoint that ends up writing to SQL**, so it does not
  remove the writer-boundary question, and tying it to Asaas is unproven.
* **Buy Vip / Buy Vip And Coin**: spend-side; not a credit-in path.
* **Lua** (vendor `Script Lua Interface Functions.rtf`, `Script Lua BridgeFunctions.rtf`):
  `ObjectAddCoin/SubCoin/GetCoin(aIndex, …)` on a *player index*; SQL functions
  `SQLConnect(ODBC, user, password)`, `SQLQuery(string)`, async variants; hooks
  `OnTimerThread`, `OnCharacterEntry`, `OnSQLAsyncResult`. Blood Moon's data root
  has `Data\Script\ScriptMain.lua`, `TemplateScript.lua`, `WelcomeMessage.lua`
  (`RemoteData/Phase10/data-root-inventory.json`) — the layer exists; whether the
  hooks are used, and whether the build supports the "NEW" async functions,
  **is not evidenced**. A Lua consumer would have to read an **outbox in SQL
  Server that something else wrote** — i.e. it needs Option B's producer path
  anyway.

**Consequence: C is not an alternative to B's transport; it is a possible
alternative to B's *last hop*** (Lua `ObjectAddCoin` for online players instead
of a procedure updating `CashShopData`). It is the one design that could *avoid*
the visibility/overwrite hazard, which is why it stays on the table as a
verification-gated alternative — **not** because it is inherently safer. Per the
Phase 20 rule: native ≠ safer.

### Option D — different from A, or merely relocated?

The legacy mechanism (`CLAIM-123`) is a **config-driven** `UPDATE <table> SET
<column> = <column> + :credits WHERE <id> = :user` with an INSERT-fallback. As a
service with a game-DB credential:

* running **on the VPS**, it *is* the Agent — an isolated, outbound-only, narrow
  writer — so D = B with a worse (dynamic-SQL, no-idempotency) core;
* running **anywhere else**, it is A relocated (same credential and reachability
  problem).

D contributes exactly one thing: **evidence** that an additive `UPDATE` with a
missing-row fallback on `CashShopData` is the pattern the legacy stack used
(never exercised: 0 real transactions; 4 rows). **Not materially distinct →
folded into B/A.**

## Part 8 — What is unknown about the game side

### CashShopData change visibility (preserved evidence only)

| Question | Status |
|---|---|
| Visible on the player's very next CashShop/X-Shop interaction? | **UNKNOWN** |
| Only after re-login? | **UNKNOWN** |
| Only after a map change? | **UNKNOWN** |
| Only after reopening the CashShop window? | **UNKNOWN** |
| **Overwritten** by the GameServer's in-memory value at logout or the next `WZ_SetCoin`? | **UNKNOWN — the dangerous one** |

Facts that bear on it: the engine exposes `ObjectGetCoin/AddCoin/SubCoin` on a
player index (an in-memory per-user value is *plausible* — INFERENCE);
`WZ_SetCoin` is the persist path into `CashShopData` but ~~**whether it *adds* or
*sets* is not preserved** (the body is not in the repo)~~ **(Phase 20A: it ADDS, positive values only — Part 14.2)**; the only precedent for an
external write to a GameServer-owned field is bad — `WZ_GetAccountLevel` silently
**reverted** the first `GRANT_VIP` at the player's next login (reproduced in the
lab; `docs/vip/wz-setaccountlevel-coexistence.md`); `MEMB_STAT.ConnectStat` gives
an online flag readable from SQL (`docs/game-data/legacy-web-intelligence/online-status.md`).
Also: in the 3D-A evidence **4 of 8 accounts had a `CashShopData` row**, and
`DmN_CreateGameAccount` does not create one — so a credit must handle a missing
row (the legacy PHP had an INSERT fallback for the same reason).

Two earlier statements were stronger than any preserved evidence and are
**corrected** in `CASH_VIP_INTEGRATION_MAP.md` and `LEGACY_SUPPLIER_INDEX.md`:
"GameServer reads `CashShopData` directly at interaction time … no separate sync
exists or is needed" and "live-read table".

### Reload and restart — distinctions kept apart

| Subsystem | Evidence | Status |
|---|---|---|
| Buy Vip config family (`Data/Command`) | vendor demonstrates "Reload Comand", no restart | vendor-demonstrated, **not tested on Blood Moon** |
| `CustomBuyVipAndCoin` | vendor demonstrates "Reload Custom" + "Reload Shop" | vendor-demonstrated, **not tested on Blood Moon** |
| `CustomXShop.txt` / `CashShopProduct.txt` | none | **UNKNOWN** (`CLAIM-120`) |
| **Database rows (`CashShopData`)** | none — *config reload says nothing about SQL row visibility* | **UNKNOWN** |

None of these behaviours is propagated to another subsystem.

## Part 9 — Failure-state model and manual repair

| State | What is true where | Risk | Handled by |
|---|---|---|---|
| Provider paid · Portal credited · game not credited | wallet ledger yes; obligation `PENDING` | the intended transient state | R4; alert on obligations older than an SLA |
| Portal sent · game applied · ACK lost | SQL ledger row; Agent ledger `SUCCEEDED`; D1 `CLAIMED`/`AVAILABLE` | phantom "not delivered" | lease reclaim reports the prior result; resubmission is harmless (R3) |
| Duplicate delivery | any layer | double credit | Part 2 layers + **R2** |
| Game offline / Agent down | command waits, may `EXPIRED` (1 h) | delayed delivery | outbox re-issues, same key |
| **Wrong currency mapping** | a credit lands in the wrong column | **silent, highest severity** | named enum, one SQL translation table, ADR for the mapping, read-back check with the Agent's existing `CashShopBalances` reader, local test |
| Partial failure | Portal debited, no command created | money in limbo | one MySQL transaction for debit + obligation; `IN_TRANSIT` timeout → refund path |
| Missing `CashShopData` row | 4/8 accounts had one | credit lost or error | procedure upserts the row inside the transaction |
| Player online during credit | unknown visibility/overwrite | lost update | **UNKNOWN** — prerequisite P3 |
| Chargeback after delivery | credit possibly spent | unrecoverable currency | policy decision (Part 6) |
| Manual retry | operator re-sends | duplicate if re-keyed | only the same `creditKey`; existing `retryFailedCommand` reuses identities |

**Manual repair principles.** No blind SQL edit, ever. A repair needs: (1)
**evidence** — `creditKey`, `commandId`, the D1 row, the Agent ledger row, the SQL
credit-ledger and audit rows, the Portal obligation; (2) **authorization** by a
named human, with a second approver above a threshold; (3) an **audit record**
(who, why, before, after) written by the same mechanism; (4) **idempotency** — a
repair is itself a credit/reversal with its own key (`repair:<original>`), applied
through the ledger, never a raw `UPDATE`; (5) **reconciliation** — a periodic
comparison of Portal obligations vs SQL credit-ledger vs `CashShopData` movement
per account/currency; mismatches go to a repair queue and are **never auto-fixed**;
(6) no production write without explicit, in-the-moment approval.

## Part 10 — Canonical current gap model

```
REAL MONEY (Pix)
   → Asaas                          provider; Asaas provider code is on other worktrees, not audited on this branch
   → RechargeIntent                 Portal MySQL — exists; webhook events deduplicated
   → Portal WC ledger / balance     AccountCurrency + WalletLedgerEntry — exists, in use, idempotent
   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   ┃ [DELIVERY GAP]  nothing exists:                                   ┃
   ┃  · no target-currency decision (Portal WC ↔ WCoinC/WCoinP/none)   ┃
   ┃  · no obligation record, no dispatcher                            ┃
   ┃  · no command type; committed Worker accepts CREATE_GAME_ACCOUNT  ┃
   ┃    only                                                           ┃
   ┃  · no procedure, no grant, no SQL-side business key               ┃
   ┃  · no chargeback-after-delivery policy                            ┃
   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
   → Game currency                  CashShopData.WCoinC / WCoinP / GoblinPoint
   → CashShop / X-Shop spend        GameServer-native; visibility of external writes UNKNOWN
```

This corrects the diagram in `CASH_VIP_INTEGRATION_MAP.md` Part 4, which ended in
"WCoinC or equivalent" as if the target were settled.

## Part 11 — Recommendation

**`RECOMMEND_OPTION_B` — conditional.** Not approved for implementation; a
recommendation for Bryan to accept, amend or reject.

Reasons:

1. **Only option consistent with the standing decisions and the topology**
   (ADR-0002/0023/0024, the writer's least privilege, SQL on loopback).
2. **The substrate exists and has run in production** for one command type, with
   response-loss / restart / lease-expiry recovery demonstrated (3D-A `raw/04`).
3. **Strongest audit chain** — four independent records — and no game credential
   in `apps/api`.
4. **D adds nothing** B/A do not have; **C is orthogonal** (a last hop), unproven,
   and not safer by default.
5. **The Portal-side template exists**: outbox → dispatcher → poll (`vip-delivery`).

### Gating prerequisites (all before any code)

| # | Prerequisite | Why |
|---|---|---|
| P1 | Bryan decides **Portal WC's target** and the **single-balance model** (T / D / P) | nothing else is meaningful without it |
| P2 | Read **`WZ_SetCoin`'s body and `CashShopData`'s DDL/defaults** (read-only, lab copy) **— DONE 2026-09-19 (Part 14.2)** | additive vs absolute; missing-row behaviour; column types |
| P3 | Resolve the **visibility/overwrite hazard** — a controlled lab GameServer test if a lab instance exists, else design an online gate (`MEMB_STAT.ConnectStat`) with deferred credit, or evaluate the Lua last hop | could change the last hop |
| P4 | Design and test the **SQL-side exactly-once** procedure locally, targeting **SQL Server 2014** syntax | R2 |
| P5 | **Commit / rehome the Worker extension** (uncommitted, only in `mu-bloodmoon-v1-openbeta`), extend it for a currency payload, confirm whether D1 `0004` is applied remotely, and settle the **Agent deploy path** (none tested) | the type cannot flow from committed code today |
| P6 | Amend ADR-0002: **exactly one** more `EXECUTE` grant on `bloodmoon_writer`, kill switch default `false`, per-command and per-account/day caps, a separate Portal client id for currency creates | privilege widening on a financial path |
| P7 | **Chargeback-after-delivery policy** | real-money delivery |
| P8 | Exclude the new outbox operation from `MARKETPLACE_DELIVERY_WORKER` (or retire it) | it fails *every* pending row when enabled |
| P9 | **Read-only** confirmation of the live Agent/D1 state | the docs contradict each other |

## Part 12 — `GAME_CURRENCY_DELIVERY_DECISION_READY`

**`YES` — for the mechanism decision only.** Conditions: terminology
understood (Terminology Part 4: Cash↔WCoinC CONFIRMED, the others
STRONGLY_SUPPORTED); Portal WC's target **explicitly bounded** (UNRESOLVED by
earlier decision, four candidates, and the transport choice does not depend on
which); "GameBridge" ambiguity **resolved** (seven names); Option B's failure and
idempotency model **credible on paper** (Parts 5 and 9), with the unknowns
(P2, P3, P5) named rather than assumed. **`NO` for implementation** until P1–P9.

### Decisions required from Bryan

1. Portal WC's target game currency (WCoinC / WCoinP / none / converted) and whether Blood Coin (`GOBLIN_POINT`) is meant to equal the engine's GoblinPoint.
2. Whether players need **spendable game currency from Portal purchases at all**, or whether product delivery (VIP-style, model P) is enough; if yes, model T or D.
3. Accept **Option B** as the direction (or choose otherwise), including the ADR-0002 amendment (P6).
4. Authorise **read-only** lab lookups (P2) and, if a lab GameServer exists, a controlled visibility test (P3). Production untouched.
5. **Chargeback-after-delivery** policy.
6. Preserve the **uncommitted Worker extension** in `mu-bloodmoon-v1-openbeta` (loss risk) — a branch-governance action, not done here.
7. Confirm the **live Agent state** read-only and annotate the runbooks that say "never deployed".
8. Carried over from 18D: apply the prepared stale-warning banner to `mu-bloodmoon-legacy-catalog`.

## Part 13 — Machine layer and related

`CLAIM-125` … `CLAIM-138` in `knowledge/vendor-sweep/atomic-claims.json`; new
gaps `GAP-P20-01` … in [`KNOWLEDGE_GAPS.md`](KNOWLEDGE_GAPS.md); conflicts in
[`CONFLICTS.md`](CONFLICTS.md). Related: [`CASH_VIP_INTEGRATION_MAP.md`](CASH_VIP_INTEGRATION_MAP.md)
(Parts 4–5 updated), `docs/game-data/production-command-transport.md`,
`docs/security/game-write-boundary.md`,
`docs/gamebridge/gamebridge-agent-extension-plan.md`.

## Part 14 — Phase 20A (2026-09-19): decisions and evidence closure

Nothing in this part implements, enables, deploys or writes anything. It records
Bryan's decisions of 2026-09-19 and what the authorised read-only work found.

### 14.1 Decisions recorded

| Decision | Recorded value |
|---|---|
| Initial Beta | `BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE` — the Beta path stays **BRL → provider → Portal WC → Portal-side products / VIP**; automatic game-currency credit is future scope; existing VIP commercial decisions are unchanged (CLAIM-147) |
| Portal WC target | `PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED` — not to be silently mapped to `WCoinC`; Portal WC is a separate business abstraction (CLAIM-129) |
| Direction | `GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B` — a *future* delivery should preferentially use the controlled `GAME_COMMAND_TRANSPORT` boundary, not `apps/api` writing the game database; `GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO`; **P1–P9 stay mandatory** (CLAIM-148) |
| Chargeback after delivery | `CHARGEBACK_AFTER_GAME_DELIVERY_POLICY = UNRESOLVED` — blocks any *public* currency-delivery enablement, not this research |
| Authorised work | read-only lab inspection (done), read-only Agent/D1 confirmation (D1 done, VPS side blocked — 14.4), preserving the Worker extension (done — 14.9), legacy-catalog banner (done) |

Status of the "decisions required" of Part 12: 1 (WC target) and 5 (chargeback) stay open as
**future-scope** decisions; 2 (does the player need game currency) is answered **for the Beta only**;
3 (Option B) is accepted as a direction — the ADR-0002 amendment (P6) is still required before
implementation; 4 (lab lookups) is done, the visibility test is not possible (14.3); 6 (preserve the
Worker) and 8 (legacy banner) are done; 7 (live Agent) is half done. No gap is closed by accepting the
direction: GAP-P20-01/02/03/04 stay open.

### 14.2 Lab evidence — `WZ_SetCoin` and `CashShopData` (read-only)

Read first-hand from the lab restore of the 2026-07-16 production backup; not re-read on production;
nothing executed. Raw text, DDL, queries and hashes: `references/game-data/sql-discovery/phase-20a-wz-setcoin-cashshopdata-lab-20260919/`.

| Question | Answer (CLAIM-139..144) |
|---|---|
| Additive or set? | **Additive** (`col = col + value`), every balance-changing vendor procedure (eight); none sets an absolute value |
| Can it subtract? | **No** — `WZ_SetCoin` ignores values ≤ 0; **no debit procedure exists**; how the GameServer debits is not visible |
| Missing row? | `WZ_SetCoin` **inserts** (only that column; others default 0); the other vendor procedures only `UPDATE` — **silently credit nothing** |
| Transaction / locking? | none: `XACT_ABORT ON` without `BEGIN TRAN`; `IF EXISTS … ELSE INSERT` is racy (a concurrent first credit fails on the primary key) |
| Idempotency / audit? | **none** — no key, ledger, log or return code; twice = twice |
| DDL | `AccountID varchar(10)` (CI collation), three `int NOT NULL DEFAULT 0` balances, clustered PK `PK_TempCashShop`; **no CHECK, no FK, no trigger** |
| Other balance tables | `CustomPlayToEarn` (same three balances, 0 rows, unreferenced) — role unknown |
| Vendor credits online players? | `WZ_SetRewardCastleSiege` credits members selected through `MEMB_STAT.ConnectStat = 1` by plain SQL |

Consequences for a future `CREDIT_GAME_CURRENCY` procedure:

* **Do not delegate to `WZ_SetCoin`.** It has no idempotency, no audit, a racy insert and no
  transaction; the new procedure needs its own ledger (Part 5, R2).
* **Follow the vendor's delta model** (`col = col + amount`, never a set). Two SQL adders on the same row
  commute under row locks, so a credit does not collide with the vendor's own additive credits.
* **Upsert atomically** (`UPDATE …`, then `INSERT` if no row, under `UPDLOCK, HOLDLOCK`, syntax valid on SQL
  Server 2014); a missing row must never mean a silent no-op.
* **Guard the DDL's gaps in the procedure**: 32-bit overflow check, cap, and verify the account exists
  (no FK to `MEMB_INFO` — otherwise orphan rows). Use the column's collation for account matching.
* **The vendor gives no way to claw back**: reversal (chargeback, repair) needs a *new* subtraction
  procedure with its own key — another reason the chargeback policy blocks public enablement.
* The evidence weakens, but does not remove, the "engine overwrites an external credit from an in-memory
  copy" hypothesis (vendor procedures are additive; one credits online players by SQL). It says nothing
  about **when** the game shows a credit.

### 14.3 `SQL_ACK` versus `GAME_ACK`, and game visibility

| Term | Meaning | Provided by `GAME_COMMAND_TRANSPORT`? |
|---|---|---|
| `SQL_ACK` | the stored procedure returned and **committed** | **Yes** — the only acknowledgement that exists |
| `GAME_ACK` | the GameServer / client has **observed or applied** the effect | **No** — no channel to the GameServer process; never claimed |

`GAME_CURRENCY_VISIBILITY = UNKNOWN` (immediate / CashShop reopen / relog / map change / server reload
were not distinguished). **A lab test was not possible**: `D:\MU\MU-Server\Lab\drop-validation\MuServer-stage` is a staged
file copy only — no GameServer process is running, no ODBC data source exists on the machine and no
client is set up. Building one means running closed-source server executables and editing their
configuration, which is neither read-only nor something to do unattended.

**Test design (ready, not run).** Preconditions: an isolated stack (ConnectServer, DataServer/JoinServer,
GameServer) whose ODBC source points **only** at `bloodmoon_gameserver_lab`, with no route or credential to
the production VPS; a synthetic account and character; a client that can log in. Steps: (1) note the
in-game balance; (2) while the player is online, credit +N with the vendor's own `WZ_SetCoin` **in the lab
database**; (3) observe, in order, with no action / after reopening the CashShop / the X-Shop / after a
map change / after a relog / after a server reload; (4) *overwrite check* — before the credit becomes
visible, make an in-game purchase that debits, then relog and read SQL: the balance must equal
baseline + N − price, otherwise the credit was overwritten; (5) repeat with an offline account.
Record one of `IMMEDIATE / CASHSHOP_REOPEN / RELOG / MAP_CHANGE / SERVER_RELOAD / UNKNOWN` per step. Abort
if any connection string or data source points anywhere but the lab.

### 14.4 Live Agent and remote D1 (read-only, 2026-09-19)

Evidence: `references/game-data/sql-discovery/phase-20a-live-agent-d1-readonly-20260919/` (SELECT-only; no ids, credentials or nonce values selected).

| Question | Result |
|---|---|
| Migrations applied on the remote D1 | **0001, 0002, 0003** — **0004 is not applied** |
| `game_command` shape | still `CHECK (command_type = 'CREATE_GAME_ACCOUNT')`, credential columns `NOT NULL` — the database itself rejects the four extension types |
| Commands ever | **2** (`CREATE_GAME_ACCOUNT`, both `SUCCEEDED`), last activity 2026-08-25 — none since |
| Agent alive? | **yes** — `gamebridge-agent-01` / `bloodmoon-s6`, heartbeat ≈14 s old at capture, buffer `NORMAL`/0 |
| Command path active? | **yes** — ≈52 signed `command:claim` requests in the 10-minute nonce window (one per ~11 s), 20 heartbeats |
| Worker code | no code version uploaded after 2026-08-24T17:52Z; later versions are all "Secret Change" |
| **VPS side** (scheduled task state, process start, binary SHA-256, version, log/ledger timestamps) | ~~**UNVERIFIED** — the read-only SSH inspection was blocked by the session's permission classifier ("Production Reads") and was **not** retried or worked around~~ **VERIFIED 2026-09-21 (Phase 20B):** one Agent process running since 2026-08-25, task state Ready, binary 0.1.0+20a0d71c built 2026-08-24 (before the extension existed) (Part 15.2) |

The inspection that would settle the VPS side is: over the audited RemoteOps channel, run only
`Get-ScheduledTask` + `Get-ScheduledTaskInfo` for `BloodMoonGameBridgeAgent`; `Get-CimInstance Win32_Process`
filtered to the install directory (name, PID, start time — **no command line**); a top-level `Get-ChildItem` of
`C:\BloodMoonGameBridgeAgent` (name, size, timestamp — **never** the `secrets` folder or any file
content); and `Get-FileHash` of the executable/scripts. ~~It needs Bryan to allow that action, or to run it.~~ **Done 2026-09-21 (Part 15.2).**

### 14.5 Prerequisite status (P1–P9)

| # | Prerequisite | Status on 2026-09-19 |
|---|---|---|
| P1 | WC target + single-balance model | **OPEN** — future scope (Beta out of scope) |
| P2 | Read `WZ_SetCoin` / `CashShopData` | **DONE** (14.2) |
| P3 | Visibility / overwrite hazard | **OPEN** — no runnable lab GameServer; test design ready (14.3) |
| P4 | SQL-side exactly-once, SQL Server 2014 | **OPEN** — requirements sharpened by 14.2; nothing built |
| P5 | Worker extension, D1 0004, Agent deploy path | **PARTIAL** — Worker extension **and** SQL artifacts preserved (Phase 20B; 11 of 12 SQL files), tests re-run; 0004 not applied; Agent deploy path untested (the running Agent build predates the extension) |
| P6 | ADR-0002 amendment (one more `EXECUTE`, kill switch, caps) | **OPEN** |
| P7 | Chargeback-after-delivery policy | **OPEN** — unresolved, blocks public enablement |
| P8 | Exclude the new outbox operation from the marketplace script | **OPEN** |
| P9 | Read-only confirmation of live Agent/D1 | ~~PARTIAL — Cloudflare half done, VPS half blocked~~ **DONE 2026-09-21** — both halves verified read-only (Part 15.2) |

### 14.6 Mandatory properties of a future `CREDIT_GAME_CURRENCY`

Not to be implemented now; any future design must have **all** of these:

1. **Business idempotency key persisted SQL-side** — unique, written in the same transaction as the effect.
2. **Explicit target currency** — a named value, never a slot number, translated in one place.
3. **Account identity** — `legacyLogin` of an `ACTIVE` `GameAccountIdentity`, verified to exist in the game database.
4. **Amount** — positive integer, bounded, overflow-checked.
5. **Source / recharge reference** — e.g. the `RechargeIntent` id, recorded, never trusted for authorisation.
6. **Audit trail** — SQL ledger + in-transaction audit row, D1 row, Agent ledger, Portal delivery record.
7. **Caps** — per command and per account per day, enforced in SQL.
8. **Kill switch** — Agent flag default off, plus a Worker-side per-type suspension; separate Portal client id.
9. **Least-privilege grant** — exactly one `EXECUTE` for the procedure, no table rights, ownership chaining.
10. **Retry-safe, duplicate-safe, crash-safe** — resubmission always carries the same key; the Agent ledger's
    reclaim window (SQL committed, ledger not) is closed by the SQL-side key.

### 14.7 Single-balance principle

**Beta rule:** Portal WC stays Portal-side; the Beta path is model **P** of Part 6 by construction.
**Future rule:** game delivery must **not** silently create two independently spendable, authoritative
balances from one payment, unless Bryan explicitly chooses that product model. Models T (transfer/escrow),
D (direct-to-game package) and P (Portal-only) all keep one balance at a time; that choice remains part of
the future architecture (P1).

### 14.8 Chargeback

`CHARGEBACK_AFTER_GAME_DELIVERY_POLICY = UNRESOLVED`. The vendor procedures cannot subtract (14.2), so
even a policy that wants to recover credited currency needs a new, separately designed mechanism. No
public currency-delivery implementation may be enabled before this is resolved.

### 14.9 Worker extension preserved

The only copy of the Worker code for the four extension command types was uncommitted in
`mu-bloodmoon-v1-openbeta`. It is now on the branch `gamebridge/preserve-command-extension` (commit
`3e69937e` exact files, `6003c59a` manifest; based on `main` `c1b34062`): 3 files, +313/−43, hashes and
provenance in `docs/gamebridge/worker-extension-preservation-manifest.md` **on that branch**; `tsc` 0 errors,
Worker suite 55/55 (`commands.spec` 25/25). **Not merged to `main`, not deployed, not canonical.**
~~Remaining loss risk: the four SQL procedures (`references/game-data/sql-discovery/gamebridge-extension-20260830/`,
11 files, one flagged for secret review) are still untracked in the same worktree (GAP-P20-02, GAP-P20-10).~~
**(Phase 20B, 2026-09-21)** the SQL artifacts are now preserved as well (11 of 12 files, commit `2d0f6106`, manifest
`ddf50640`); only `local-writer-login.sql` remains untracked and excluded as SECRET_BEARING (GAP-P20-11 — **resolved as policy in Phase 20C**, see 15.5).

## Part 15 — Phase 20B (2026-09-21): decisions, live verification and preservation

Nothing here implements, enables, deploys, installs or sends anything. No SQL was executed.

### 15.1 Decisions recorded (Bryan, 2026-09-21)

| Decision | Recorded value |
|---|---|
| Phase 20A into `main` | done — fast-forward `c1b34062` → `90450060`, no merge commit, no push |
| Extension SQL | preserved on `gamebridge/preserve-command-extension` **except** `local-writer-login.sql`, ~~excluded until a dedicated secret review~~ **(Phase 20C: excluded as a standing policy — CLAIM-156)** (CLAIM-152) |
| VPS read-only verification | authorised and **done** (15.2) |
| Lab GameServer | **not to be built now** → `GAME_CURRENCY_VISIBILITY = UNKNOWN` — currency delivery is out of scope for the initial Beta, no runnable lab exists, and a closed-source runtime is not worth introducing only for this evidence now |
| `CREDIT_GAME_CURRENCY` | **not to be implemented**; recorded as `DOES_NOT_EXIST` — no placeholder created (CLAIM-153) |
| Terminology cleanup | documentation-only, non-blocking (Part 7 of `GAMEBRIDGE_DISAMBIGUATION.md`) |
| Unchanged | `BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE` · `PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED` · `GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B` · `GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO` (CLAIM-154) |

The Part 14.3 visibility test design stays on file, **parked**: nobody is to build the lab for it now.

### 15.2 Live state — verified on both halves (`references/game-data/sql-discovery/phase-20b-live-agent-verification-20260921/`)

| Side | State | Key facts |
|---|---|---|
| Cloudflare | **ACTIVE** | migrations 0001–0003 (**0004 not applied**); `game_command` still CREATE-only; 2 commands ever, none since 2026-08-25; heartbeat 23 s old; ≈52 claim polls / 10 min |
| VPS | **ACTIVE** | scheduled task `BloodMoonGameBridgeAgent` **Ready**; one `BloodMoonGameBridgeAgent.exe` (PID 10388) running since **2026-08-25T01:33Z**; single binary sha256 `5BED7747A6A9636C250B98C8DA575E2F27981C16576C588771E8349AB02AB33C`, version `0.1.0+20a0d71c…` |
| End to end | **ACTIVE for `CREATE_GAME_ACCOUNT`, traffic idle** | no command was sent; a fresh round trip is not demonstrated |

What the version tells us: the binary embeds commit `20a0d71c` (2026-08-24 12:49 −0300) — which has **no** `GameCommandWorker.cs` —
and was built at 14:49 −0300, five minutes **before** the transport commit `7b4fed13` (14:55). So it was built from
the parent commit plus uncommitted changes (the same pre-commit pattern as the Worker upload), and, because the
extension handlers date from 2026-08-30, the running Agent **cannot** contain them (inference by chronology, CLAIM-150;
the binary was not string-scanned). **Implication for any future extension deploy:** it needs a **new Agent build**;
the deploy path for a new build has never been exercised (P5).

Not established: why the task is `Ready` while the process runs (triggers and the start script were not read), so
**reboot persistence of the Agent is unverified**; whether the Agent's logs show errors (not read).

### 15.3 Prerequisites after Phase 20B

P2 **done** · P9 **done** · P5 **partial** (Worker and SQL preserved; 0004 not applied; new-build deploy untested) ·
P1, P3, P4, P6, P7, P8 **open**. Accepting Option B as a direction, and this phase's evidence, closed no gap
that the direction decision left open (Part 14.1).

### 15.4 Extension preservation state

Worker: `gamebridge/preserve-command-extension` (`3e69937e` + manifest `6003c59a`). SQL: `2d0f6106` (11 files, byte-identical) +
manifest `ddf50640`. **Not merged, not deployed, not canonical.** Excluded: `local-writer-login.sql` (SECRET_BEARING; original still
untracked in openbeta; GAP-P20-11, resolved as policy in Phase 20C — 15.5). The command deployment matrix is Part 8 of `GAMEBRIDGE_DISAMBIGUATION.md`.

### 15.5 Phase 20C closure (2026-09-21)

Documentation and git bookkeeping only. **No production contact, no live test, no SQL executed, no command sent.**

| Item | Recorded value |
|---|---|
| `main` | fast-forwarded `90450060` → `75d11eac` (the full Phase 20B knowledge commit), no merge commit, not pushed |
| `local-writer-login.sql` | `LOCAL_WRITER_LOGIN_POLICY = EXCLUDED_SECRET_BEARING_SOURCE` (Bryan; CLAIM-156) — never copied into tracked source; GAP-P20-11 = **RESOLVED_AS_POLICY**. No redacted template created (judgement recorded in GAP-P20-11) |
| Optional Agent follow-ups | binary string scan and scheduled-task trigger/action read **deferred** by Bryan (CLAIM-157) — GAP-P20-02 residue **OPEN, NON_BLOCKING**; CLAIM-150 stays UNVERIFIED |
| Reconfirmed, not re-tested | `CREATE_GAME_ACCOUNT` DEPLOYED_ACTIVE · `GRANT_VIP`, `SYNC_VIP_TIER`, `ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT` IMPLEMENTED_NOT_DEPLOYED · `CREDIT_GAME_CURRENCY` DOES_NOT_EXIST · Cloudflare side ACTIVE · VPS side ACTIVE · end to end ACTIVE for `CREATE_GAME_ACCOUNT` only (as observed 2026-09-21) |
| Currency delivery (parked, unchanged) | `BETA_INITIAL_GAME_CURRENCY_DELIVERY = OUT_OF_SCOPE` · `PORTAL_WC_TARGET_GAME_CURRENCY = UNRESOLVED` · `GAME_CURRENCY_DELIVERY_DIRECTION = OPTION_B` · `GAME_CURRENCY_DELIVERY_IMPLEMENTATION_APPROVED = NO` · `GAME_CURRENCY_VISIBILITY = UNKNOWN` |
