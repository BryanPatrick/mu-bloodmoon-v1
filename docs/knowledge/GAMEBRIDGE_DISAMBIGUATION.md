---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
confidence: HIGH for what the code does (read this phase); MIXED for deployment status (documents contradict each other — see Part 5)
---

# "GameBridge" — one word, several systems (Phase 20)

The word **GameBridge** (also "game bridge", "game-bridge", "bridge") is used
in this repository for at least **six** different things and, in the vendor's
documentation, a seventh. Phase 18D found two; a repository-wide inventory
(`apps/`, `deploy/`, `docs/`, `context/`, `scripts/`, `references/`; ~330
matching files) found the rest. Every design or status sentence that says
"GameBridge" without a qualifier is ambiguous and, as Part 4 shows, several
existing sentences are simply wrong for the system they are attached to.

> **Rule from this phase.** In new text never write bare "GameBridge". Use one
> of the canonical names below. "The Agent" means the host process
> `BloodMoon.GameBridgeAgent`, which runs **two** independent services
> (`GAME_COMMAND_TRANSPORT`'s worker and `GAME_DATA_TELEMETRY`'s worker).

## Part 1 — Canonical names

| Canonical name | Also called | What it actually is | Direction | Auth | Gating flags |
|---|---|---|---|---|---|
| **`GAME_COMMAND_TRANSPORT`** | "GameBridge", "the Agent", "command channel", "game-command transport" | Portal signs a command → Cloudflare Worker stores it in D1 and a Queue → the Agent (on the game VPS, outbound-only) claims it, runs an EXECUTE-only stored procedure, reports the result → Portal reconciles from D1. The only code path with write access to the native game database (ADR-0002). | Portal → game; result back via D1 | route-bound HMAC-SHA256 (separate secret maps for Portal and Agent), ±5 min clock skew, nonce table; AES-256-GCM envelope for the one command that carries a credential; SQL login `bloodmoon_writer` (EXECUTE-only) | Portal: `GAME_DATA_WORKER_URL` + `GAME_COMMAND_PORTAL_SECRET` (both required), `VIP_DELIVERY_WORKER_ENABLED`, `VIP_SYNC_RECONCILIATION_ENABLED`, `ACCOUNT_LIFECYCLE_BRIDGE_ENABLED`, `GAME_PROVISIONING_RECONCILIATION_ENABLED`, `GAME_ACCOUNT_PROVISIONING_ON_REGISTER`. Agent: `GrantVipEnabled`, `SyncVipTierEnabled`, `AnonymizeEnabled`, `PurgeEnabled` (all default `false`; `CREATE_GAME_ACCOUNT` has none) |
| **`MARKETPLACE_DELIVERY_WORKER`** | "the GameBridge worker", "game-bridge-worker", `worker:game-bridge` | `apps/api/scripts/process-game-bridge-jobs.mjs`. Polls pending `GameBridgeJob` rows; with `MU_BRIDGE_ENABLED=false` it only logs `[dry-run]`; with it `true` it marks a job `PROCESSING` and then throws "not connected to the game database yet" — it **always fails by design**. No HMAC, no Agent, no SQL. | Portal DB → (nothing) | none | `MU_BRIDGE_ENABLED` (default `false`), `MU_BRIDGE_WORKER_CONCURRENCY` |
| **`PORTAL_BRIDGE_JOB_OUTBOX`** | "GameBridgeJob", "bridge jobs" | The Prisma `GameBridgeJob` table (`schema.prisma:3290`): a durable **Portal-side** job/outbox shared by three features — Marketplace escrow (`LOCK_ITEM`…`CREDIT_CURRENCY`), VIP delivery (`GRANT_VIP`) and account lifecycle (`ANONYMIZE_/PURGE_GAME_ACCOUNT`). Its consumers filter by operation; the marketplace script does **not**. | within the Portal | — | per consumer |
| **`GAME_DATA_TELEMETRY`** | "Game Data Platform", "GameBridge Agent (read-only)", "heartbeat" | The Agent polls SQL with a SELECT-only reader, diffs snapshots into a local SQLite outbox and posts signed events to `/ingest/events` and heartbeats to `/ingest/heartbeat`; the Portal reads only `GET /internal/state/status`. | game → cloud → Portal (status only) | HMAC, **different** secret maps (`AGENT_SECRETS_JSON`, `API_READ_SECRETS_JSON`), different SQL login, different local store | `GAMEBRIDGE_HEARTBEAT_ALERT_ENABLED` (default `false`); the worker is registered unconditionally |
| **`GM_EVENT_EXECUTOR_STUB`** | "GameBridge event executor" | `gm/event-executors/game-bridge-event-executor.ts`; always returns `origin: 'GAMEBRIDGE_ERROR'`, calls nothing. | — | — | — |
| **`GAME_DATA_DEPENDENCY`** (label only) | `GAMEBRIDGE_DEPENDENCY` in `docs/guild-product-backlog.md` (31 hits) and progression docs | "Needs some future game→Portal data feed." No code, flag or auth. | — | — | — |
| *vendor* **Lua bridge functions** | "Script Lua BridgeFunctions" | The engine's **event hooks** for Lua scripts (`OnTimerThread`, `OnCharacterEntry`, `OnCommandManager`, `OnSQLAsyncResult`, …) attached with `BridgeFunctionAttach`. Nothing to do with the Portal; noted only because it is the *third* "bridge" a future reader may meet, and because these hooks are the substrate of Option C. | inside the GameServer | — | — |

Why the two names Bryan suggested were adjusted: `GAME_COMMAND_TRANSPORT`
matches the code's own vocabulary (`GameCommandTransportClient`,
`GAME_COMMAND_PORTAL_SECRET`, `docs/game-data/production-command-transport.md`)
and is kept. `MARKETPLACE_DELIVERY_WORKER` is kept for the *script*; the
*table* it reads needed its own name (`PORTAL_BRIDGE_JOB_OUTBOX`) because it is
not marketplace-only.

## Part 2 — How they stack

```
Portal business event (VIP purchase, account deletion, marketplace order …)
   │
   ▼
PORTAL_BRIDGE_JOB_OUTBOX          (GameBridgeJob row — durable intent, idempotencyKey unique)
   │  consumers filter by operation:
   │   • vip-delivery.service      GRANT_VIP                → GAME_COMMAND_TRANSPORT
   │   • account-lifecycle-bridge  ANONYMIZE / PURGE        → GAME_COMMAND_TRANSPORT
   │   • process-game-bridge-jobs  EVERYTHING pending       → MARKETPLACE_DELIVERY_WORKER (always fails)
   ▼
GAME_COMMAND_TRANSPORT            (HMAC → Worker/D1/Queue → Agent → bm_*/DmN_* procedure → MU SQL Server)
```

`CREATE_GAME_ACCOUNT` and `SYNC_VIP_TIER` do **not** go through the outbox
(they are not in the `GameBridgeOperation` enum): provisioning and the VIP sync
reconciler talk to the transport directly.

## Part 3 — Hazards this created

1. **The marketplace script has no operation filter**
   (`process-game-bridge-jobs.mjs:151-155`). If `MU_BRIDGE_ENABLED` were ever
   set `true`, it would mark **any** pending outbox row — `GRANT_VIP`,
   `ANONYMIZE_…`, `PURGE_…`, and any future currency row — `PROCESSING` and
   then `FAILED`, racing the dispatchers that own them. `deploy/docker-compose.production.yml:77`
   loops that script every 10 s (whether production runs that container is not
   documented; production is cPanel). **Any new outbox operation must either be
   excluded from that script or the script must be retired first.**
2. **`CREDIT_CURRENCY` already exists** as a `GameBridgeOperation` value
   (`schema.prisma:397`), mapped to `MARKETPLACE_SELLER_CREDIT_FAILED`, with
   **no producer and no consumer** anywhere in code. It means "marketplace
   seller credit" and must not be reused for a Portal-recharge → game-currency
   command; the analysis uses **`CREDIT_GAME_CURRENCY`** for the latter.
3. **`admin.game-bridge.manage`** guards both the marketplace job list
   (`MARKETPLACE_DELIVERY_WORKER`) and the VIP delivery queue (transport feeder) — one permission, two
   systems.
4. **Flag names differ between docs and code.** Docs call the Agent switches
   `GAME_BRIDGE_GRANT_VIP_ENABLED` etc.; that string exists in **no** code,
   script or config. The code has `AgentOptions.GrantVipEnabled` (bool,
   default `false`). How the option is fed (env binding name) was not traced
   here.

## Part 4 — Ambiguous or stale statements found (not edited outside this phase's own files)

The inventory flagged ~30. The ones that matter for the currency decision:

| Statement | Where | Problem | Meaning that is true |
|---|---|---|---|
| "Is GameBridge active? — NO, `MU_BRIDGE_ENABLED=false` by default everywhere" | `KNOWLEDGE_MASTER_INDEX.md` (Phase 18B) | answers for `MARKETPLACE_DELIVERY_WORKER` only; `GAME_COMMAND_TRANSPORT` **has been running in production for `CREATE_GAME_ACCOUNT`** since 2026-08-24 (Part 5) | **corrected in this phase** |
| "the ONLY currently-planned live bridge into the game DB, unfinished" | `CASH_VIP_INTEGRATION_MAP.md` Part 6 | that is the marketplace scaffold; the live path is the transport | **corrected in this phase** |
| "GameBridge Agent \| N/A — never deployed" | `docs/operations/deployment-rollback-runbook.md:125` (also `incident-response-runbook.md:142`, `phase-aa-ops-hardening-report.md:302`, `pre-beta-go-no-go-checklist.md:20`) | contradicted by Phase 3D-A evidence (Part 5) | recorded in `CONFLICTS.md` |
| "No GameBridge command is implemented yet (Phase 3C+)" | `schema.prisma:781` | stale — five envelope types exist | — |
| "No real GameBridge consumer / GRANT_VIP has no real, wired production caller" | `docs/payments/payment-next-phase-requirements.md:35`, `docs/vip/wz-setaccountlevel-coexistence.md:163` | stale since Phase O (`game-bridge-vip.gateway.ts`) | — |
| "No writes, ever." | `apps/game-bridge-agent/README.md:58` | true only of `GAME_DATA_TELEMETRY`; the same binary hosts the writer | — |
| "Read-only, absolutely" | `docs/game-data/architecture.md:31-33` | same | — |
| "GameBridge is the only write path" | `docs/decisions/0023-…:274` | true, and means `GAME_COMMAND_TRANSPORT` | — |
| "END_TO_END_REAL_INFRA NOT_TESTED / placeholder D1 database_id" | `docs/architecture/control-plane-domain-audit.md:306-309` | superseded: real `database_id` in `wrangler.toml`, Phase 2D/3D-A reports PASS | — |

## Part 5 — Deployment status by system (evidence, not assumption)

| System | Status | Evidence |
|---|---|---|
| `GAME_COMMAND_TRANSPORT` — infrastructure and **`CREATE_GAME_ACCOUNT`** | **DEPLOYED_ACTIVE as of 2026-08-24** (current state **not re-verified** in Phase 20) | `references/game-data/sql-discovery/phase-3d-a-production-command-transport-20260824/raw/02-…:6` ("VPS task BloodMoonGameBridgeAgent Running, one process"), `raw/03-…` (one real QA account, `memb_guid=8`, exactly the two authorised rows), `raw/04-…` (response-loss/restart replay: zero extra writes), `docs/security/secret-incident-history.md:53-58` ("the GameBridge Agent's heartbeat was live"), `docs/operations/provisioning-health.md:70-72` ("2 total commands ever … live production Agent service") |
| `GAME_COMMAND_TRANSPORT` — **`GRANT_VIP`, `SYNC_VIP_TIER`, `ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT`** | **IMPLEMENTED_NOT_DEPLOYED**, and **not end-to-end runnable from committed code** | Portal client types + gateways: committed. Agent handlers + kill switches: committed (`e90c29df`, `a6660109`), all four default `false`. D1 migration `0004`: committed here, **remote application unproven** (`cloudflare-resources.md` lists 0001–0002; 3D-A lists 0003). **Worker routing (`commands.ts`) accepts only `CREATE_GAME_ACCOUNT` on every one of the 43 branch refs (39 local + 4 remote-tracking)** (identical blob `99a7b09b`); the extension exists **only as uncommitted changes** in the `mu-bloodmoon-v1-openbeta` worktree (`commands.ts` +189/-, `schema.sql`, `commands.spec.ts`; `0004` untracked there). The four SQL procedures: "nothing installed on production" (ADR-0002, `gamebridge-second-review-package.md:13,129`). `docs/integration/open-beta-integration-manifest.md:500-501`: "0 real commands sent, all Agent kill switches confirmed default `false`". |
| `MARKETPLACE_DELIVERY_WORKER` | **LOCAL_ONLY scaffold**, `MU_BRIDGE_ENABLED=false` in every example env; never processed a real job | `apps/api/README.md:182`, `docs/handoff/site-beta-checklist.md:69` |
| `GAME_DATA_TELEMETRY` | Worker + D1 real end to end on 2026-08-20; **whether it runs now is not stated anywhere** (inferred to share the running Agent process) | Phase 2D report; `Program.cs:60-61` |
| `GM_EVENT_EXECUTOR_STUB`, `GAME_DATA_DEPENDENCY` | nothing to deploy | — |

Statements that the Agent "has never been deployed" (Part 4) are **not
adjudicated by later prose**: the raw 3D-A evidence is the primary source and
wins over a summary written later, but it is a 2026-08-24 snapshot. The live
state should be confirmed read-only (Agent heartbeat via the existing
`GET /admin/game-data/status`, or the read-only `bm-sql` bridge) before any
design that depends on it — **not done here** (no production contact in Phase 20).

Test-suite counts in the older docs (75/75, 123/123 …) are historical and were
**not re-run** in this phase.

## Part 6 — Machine layer

`CLAIM-131` (canonical names), `CLAIM-132` (outbox + scaffold hazard),
`CLAIM-133` (Worker code vs extension), `CLAIM-134` (3D-A production
evidence), `CLAIM-138` (ACK semantics) in
`knowledge/vendor-sweep/atomic-claims.json`; graph nodes `SYS-game-command-transport`,
`SYS-marketplace-delivery-worker`, `SYS-portal-bridge-job-outbox`,
`SYS-game-data-telemetry`.
