# Phase manifest: vip-delivery-and-gamebridge-sync

```
PHASE_ID: vip-delivery-and-gamebridge-sync
TITLE: VIP purchase/delivery/history + real GameBridge VIP command delivery
  + AccountLevel sync/drift observability
OBJECTIVE: Recover the real, working VIP delivery pipeline and its
  GameBridge integration from openbeta's dirty working tree -- the real
  GameBridgeVipGateway implementation (superseding the old
  UnconfiguredVipGameBridgeGateway-only design), the vip-sync admin
  reconciliation/drift-observability backend, player purchase-history,
  and the corresponding GameBridge Agent command-pipeline changes
  (a real, reproduced login-reversion bug fix).
SCOPE: see C1 file classification below.
NON_SCOPE: Blood Coin (separate, already-completed base branch this
  branch builds on). Payment Risk/Chargebacks (already canonically
  protected on payment-risk-release, this branch's ultimate base --
  never re-copied). account-lifecycle-bridge.service.ts and its sibling
  ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT delivery work -- audited
  during Track C (see that phase's findings) and found to be a real,
  separate, GameBridge-adjacent feature sharing this same Agent
  pipeline, deliberately left for its own future extraction, not pulled
  in here. references/game-data/sql-discovery/gamebridge-extension-20260830/
  -- excluded entirely per this project's standing SQL-lab-secret
  handling rule (one file in that directory,
  local-writer-login.sql, is explicitly flagged
  SQL_LAB_SECRET_REVIEW_REQUIRED; the whole directory was left untouched
  rather than making a per-file judgment call). Real production
  GameServer/SQL Server/Cloudflare activation of any kind -- see
  GAMEBRIDGE_WRITE_SAFETY below.
BASE_COMMIT: fix/blood-coin-public-name-completion @ 7d375841 (itself
  based on open-beta/payment-risk-release @ ef43b8b3)
DEPENDENCIES:
  - PaymentRiskService (VipService.purchase()'s ACCOUNT_RESTRICTION
    gate) -- confirmed already committed on payment-risk-release, the
    real base; never re-copied, only imported.
  - GameCommandTransportClient / GameAccountIdentityModule -- already
    committed on the base; this phase carries forward 2 small,
    real, uncommitted diffs on top (exporting the client for reuse,
    and extending its envelope types to cover GRANT_VIP/SYNC_VIP_TIER/
    ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT -- the last two exist only
    as type-level plumbing here, no behavior for them is added by this
    phase; see NON_SCOPE).
TESTS: 6/6 e2e suites, 45/45 tests PASS (vip-delivery, vip-foundation,
  vip-gamebridge-delivery, vip-player-history, vip-purchase-matrix,
  vip-sync -- jest --config ./test/jest-e2e.json --runInBand
  --testPathPatterns="test/vip-", against bloodmoon_local_claude,
  2026-09-08). apps/api typecheck (`npx tsc --noEmit`) clean, 0 errors,
  first attempt after 3 proactive gap-fixes applied BEFORE running it
  (see KNOWN_DEBT's process note). GameBridge Agent's own C# test suite
  (13 test files, including the 2 new ones this phase adds --
  SqlServerLocalIntegrationTests.cs, VipNativeCoexistenceRegressionTests.cs)
  is NOT_EXECUTABLE_IN_THIS_ENVIRONMENT -- confirmed in the
  launcher-play-gate phase this same batch: no .NET SDK installed, only
  the runtime. Not run, not manually traced given the volume -- a real,
  open gap. A future session with the SDK must run `dotnet test` on
  apps/game-bridge-agent before this phase's Agent-side changes are
  considered TESTED, not just IMPLEMENTED.
GAMEBRIDGE_WRITE_SAFETY: PRODUCTION_CHANGED = NO. No env var was
  changed. No SQL Server connection was made (real or lab). No stored
  procedure was installed anywhere. No GameBridge kill switch was
  enabled. No real GRANT_VIP/SYNC_VIP_TIER/etc. command was ever sent --
  every test above runs against the disposable local Portal DB only,
  with the GameBridge transport itself unconfigured
  (GAME_DATA_WORKER_URL/GAME_COMMAND_PORTAL_SECRET unset), so
  GameBridgeVipGateway/vip-sync.service.ts both exercise their own
  honest "not configured" fallback path in these tests, never a real
  Agent/SQL Server round trip.
KNOWN_DEBT:
  - GAMEBRIDGE_AGENT_TESTS_NOT_RUN: see TESTS above.
  - MISSING_DEPENDENCIES_FOUND_AND_FIXED_PROACTIVELY (process note, not
    unresolved debt): applying Batch 1's lesson (see
    docs/architecture/engineering-governance.md's Rule Improvement
    Loop), this phase's wiring was checked BEFORE running tests, not
    after a failure: VipSyncModule was not registered in app.module.ts;
    admin.vip-sync.view/manage permission keys were missing from
    permissions.ts; the ManagementShell.vue nav entry for /painel/vip
    (and its Crown icon import) was missing. All three fixed before the
    first typecheck attempt, which then passed clean on the first try --
    confirms the "inventory + dependency tracing + build/typecheck +
    tests" discipline works when actually followed up front.
  - VIP_CONTROL_PLANE_GAP: see C3 below -- vip-sync has a real backend
    (2 RBAC-gated endpoints: view sync state, trigger reconciliation)
    but no dedicated admin Vue page/nav entry. Registered here as
    CONTROL_PLANE_GAP, not silently built -- see C3.
  - PLAYGATE_STYLE_GAMEBRIDGE_AGENT_SIGNATURE_CHANGE: the Agent's
    IGameDatabaseWriter interface change (adding commandId/correlationId
    parameters) is uniform across all 4 command types
    (GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT)
    for audit-trail correlation -- Anonymize/Purge's method signatures
    changed as a structural necessity of one shared interface, but
    neither method's actual behavior changed. Confirmed via full diff
    read, not assumed.
LAST_UPDATED: 2026-09-08
```

## C1 -- file classification into the 9 subdomains

| Subdomain | Files | Status this phase |
|---|---|---|
| VIP PLAYER UI | `apps/web/pages/painel/vip.vue`, `apps/web/composables/useVipApi.ts` | NEW, copied |
| VIP BACKEND | `apps/api/src/modules/vip/{vip.contract,vip.controller,vip.module,vip.service}.ts` | MODIFIED (real diff applied: public benefits list, purchase history, ACCOUNT_RESTRICTION gate, tier-change-blocked policy) |
| VIP DELIVERY PIPELINE | `apps/api/src/modules/vip/{vip-delivery.gateway,vip-delivery.service}.ts`, `game-bridge-vip.gateway.ts` | MODIFIED + NEW (the real GameBridgeVipGateway implementation) |
| VIP GAMEBRIDGE CONTRACT | `apps/api/src/modules/game-account-identity/game-command-transport.client.ts` (envelope types), `apps/api/prisma/migrations/{20260830160000_gamebridge_vip_sync_state,20260831120000_vip_sync_drift_observability}`, `apps/game-data-worker/db/migrations/0004_gamebridge_extension_commands.sql` | MODIFIED + NEW |
| VIP GAMEBRIDGE AGENT | `apps/game-bridge-agent/{Commands/GameCommandModels.cs,Commands/GameCommandProcessor.cs,Commands/GameCommandWorker.cs,GameDatabase/IGameDatabaseWriter.cs,GameDatabase/SqlServerGameDatabaseWriter.cs}` | MODIFIED (the real WZ_GetAccountLevel/AccountExpireDate bug fix -- ExpiresAt/DesiredExpiresAt added to GrantVipCommand/SyncVipTierCommand) |
| VIP CONTROL PLANE GAP | `apps/api/src/modules/vip-sync/{vip-sync.controller,vip-sync.module,vip-sync.service}.ts` | NEW, copied -- real backend, RECOVER_EXISTING_WORK not NEW_FEATURE_REQUIRED (see C3) |
| VIP POLICY | `docs/vip/{vip-benefit-decisions,vip-benefit-matrix,vip-deep-audit,vip-product-readiness}.md` | Already canonically present on the base (payment-risk-release), confirmed unmodified, untouched |
| VIP TESTS | `apps/api/test/{vip-delivery,vip-foundation,vip-gamebridge-delivery,vip-player-history,vip-purchase-matrix,vip-sync}.e2e-spec.ts`, `apps/game-bridge-agent/BloodMoon.GameBridgeAgent.Tests/{SqlServerLocalIntegrationTests,VipNativeCoexistenceRegressionTests}.cs` | MODIFIED (delivery/foundation already on base) + NEW |
| VIP DOCS | `docs/gamebridge/gamebridge-agent-extension-plan.md` (MODIFIED), `docs/gamebridge/{gamebridge-local-testing,gamebridge-second-review-package}.md` (NEW), `docs/vip/{vip-end-to-end-data-flow,wz-setaccountlevel-coexistence}.md` (NEW) | |

Also: `apps/api/src/app.module.ts` (VipSyncModule registration, added proactively), `apps/api/src/modules/auth/permissions.ts` (admin.vip-sync.* keys, added proactively), `apps/web/components/layout/ManagementShell.vue` (VIP nav entry + Crown icon, extracted surgically from a diff also carrying Bug Hunters/PRE_BETA_PURGE/Beta Rewards/wallet-transfer/privacy entries -- none of those included), `apps/api/src/modules/game-account-identity/game-account-identity.module.ts` (exports GameCommandTransportClient).

## C2 -- real state, preserved honestly

- VIP backend already existed in the shared lineage (committed on payment-risk-release) -- confirmed, not re-built.
- GameBridge base commands (GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT) already existed in the shared lineage (commit e90c29df, confirmed a common ancestor of every relevant branch) -- this phase only adds the ExpiresAt/commandId/correlationId fields on top, never invents the base commands.
- The delivery pipeline is now real (not a stub) -- GameBridgeVipGateway replaces UnconfiguredVipGameBridgeGateway as the wired implementation -- but every environment variable it needs (GAME_DATA_WORKER_URL, GAME_COMMAND_PORTAL_SECRET) is unset in this phase's own test runs, so it always exercises its own honest "not configured" path, never a fabricated success.
- Agent kill switches remain default-false; nothing in this phase flips one.
- The stored procedures this pipeline calls (dbo.bm_GrantVip, dbo.bm_SyncVipTier) were tested in a lab per the referenced docs -- not re-verified or re-tested by this phase, and this phase makes no claim they've run against a real production SQL Server.
- No VIP delivery to a real player has been proven by this phase -- every test asserts behavior against the disposable local Portal DB and an unconfigured gateway, never a real GameServer round trip.

## C3 -- control plane gap

`vip-sync` has a REAL backend: `GET` (view sync state, `admin.vip-sync.view`) and a reconciliation trigger (`admin.vip-sync.manage`), both RBAC-gated, both copied and wired this phase (`RECOVER_EXISTING_WORK`). What does **not** exist: any dedicated admin Vue page/nav entry to drive those 2 endpoints from the UI. This is registered as `CONTROL_PLANE_GAP`, not silently built to "complete" it -- no new admin screen was created this phase.

## C5 -- dependency confirmation

`vip.service.ts` imports `PaymentRiskService` directly (`../commerce/payment-risk.service`) -- confirmed real via source read, not assumed. `payment-risk-release` (this branch's ultimate base) already commits that service; this phase never re-copied Payment Risk. `game-command-transport.client.ts`, `vip-delivery.{gateway,service}.ts`, `vip.{service,controller,module}.ts` were each read in full diff before any file was touched -- zero Anonymize/Purge *behavior* change found; only a structurally-necessary, uniform interface signature change (see KNOWN_DEBT).
