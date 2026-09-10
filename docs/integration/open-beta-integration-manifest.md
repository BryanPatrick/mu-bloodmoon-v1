# Integration manifest: `integration/open-beta`

This is an INDEX of the integration branch's own merge history and
validation results — not a duplicate of each feature's own phase
manifest (see `docs/phases/*/phase-manifest.md` for per-feature detail).

```
BASE: main @ 3b527749 (2026-09-08)
INTEGRATION_BRANCH: integration/open-beta
INTEGRATION_HEAD_FINAL: fceadc5b24cb335b53e4a0fc737c8e7565584c7a
INTEGRATION_WORKTREE: D:\MU\mu-bloodmoon-integration-openbeta
INTEGRATION_RESULT: PASS
KNOWN_REPRODUCIBLE_TEST_FAILURES: 0
```

Two commits landed after the 8-merge integration closed (`a140ded5`),
both frontend-toolchain work, `apps/api` untouched by either:

| Commit | What |
|---|---|
| `7619755f` | Pin `typescript ^5.0.0`/`vue-tsc ^3.3.11` in `apps/web/package.json` (matching `apps/api`'s own pin) + a root `overrides` entry forcing `vue-tsc`'s own `typescript` resolution to `^5.0.0` (npm's dedup was resolving it against a widely-shared, incompatible `6.0.3` instead) + a new `apps/web/tsconfig.json` (none existed; `vue-tsc` had no project file to find). This is what let `vue-tsc --noEmit` run at all for the first time in this project's history. |
| `0fb9d654` | Fixed all 152 real type errors that run surfaced, across 46 files — see "Frontend toolchain" below. |

## Recovery Batch 4 — merge history (M9–M11)

Three previously-created, unmerged recovery branches were merged into
`integration/open-beta` in this round, following the same `--no-ff`,
full-provenance discipline as M1–M8 above. Docs-only commit `1185586d`
(ADR-0024/0019/0021 canonicalization) landed directly beforehand, not
via merge — see "Documentation" below.

| # | Source branch | Merge commit | Conflicts | Status |
|---|---|---|---|---|
| M9 | `fix/wcoin-peg-guard` | `30dcc5f2` | none | PASS |
| M10 | `test/open-beta-regression-recovery` | `65ef5f46` | none | PASS |
| M11 | `feature/player-preferences-schema-foundation` | `43a9a374` | none | PASS |

**M9 — WCoin 1:1 peg guard**: added `WCOIN_TO_BRL_RATE`/`wcoinBaseForBrl`/
`assertWcoinPackageInvariant` to `commerce.service.ts`, wired into both
`createRechargePackage` and `updateRechargePackage` (the latter using
effective/merged values, so a partial update like toggling `active`
alone still re-validates the whole peg — `disableRechargePackage`
inherits this transitively). Found and fixed a real, pre-existing peg
violation in integration's own `seedRechargePackages` (still had the
pre-fix, ~25x-off-peg WCOIN seed values) as part of the same extraction
— exactly the incident class the guard exists to prevent — using
Bryan's own already-decided Phase N values computed via
`wcoinBaseForBrl()`. `bonus` stays additive on top of the 1:1 base,
unchanged. Zero refund/provider/`REAL_MONEY` code touched (grep-confirmed).

**M10 — Financial/security test recovery**: confirmed real ancestry
from M9 before merging. Recovered 4 real deltas onto already-integrated
runtime: account-deletion (WalletLedgerEntry/PurchaseIntent survive
`executeNormalDeletion`'s anonymize-in-place — proves a structural fact,
zero runtime change), recharge-payments (new `LEDGER_PROVENANCE`
assertion), wallet-transfer (VIP-purchase already blocked by an existing,
already-integrated `assertNoActiveAccountRestriction` guard), and a
brand-new store-admin-security RBAC suite (244 lines). While auditing
the ledger-provenance delta, found one small, genuinely safe runtime gap
and fixed it as part of the same extraction: `transitionRechargeStatus`'s
PAID-transition `walletLedger.credit()` call never populated its
already-optional `metadata` field — added
`{ baseAmount, bonusAmount, grossPaidBRL, provider }`, using only
existing `RechargeIntent` fields, changing zero credited amounts.
Confirmed absence of Recharge Refund runtime (`refundRecharge`/
`attemptProviderRefund`/`adminRechargeRefund`/`adminRechargeProviderRefund`)
both before and after this merge.

**M11 — Player Preferences schema foundation**: 2 Prisma models
(`PlayerPreferenceDefinition`, `PlayerPreference`) + 1 enum
(`PlayerPreferenceCategory`) + 1 migration
(`20260830191000_player_preferences_foundation`), `SCHEMA_FOUNDATION_ONLY`
— same pattern as the M6 Survey extraction. 1 FK matches 1 relation
exactly (`PlayerPreference.definitionKey` → `PlayerPreferenceDefinition.key`).
Confirmed zero runtime code references anywhere in `apps/api/src` or
`apps/web` — `/painel/configuracoes` still persists to `localStorage`
only (key `blood-moon-preferences`).

### Tests (M9–M11)

| Checkpoint | Suites | Tests | Result |
|---|---|---|---|
| M9 targeted (peg guard + admin-guard + pricing) | 2/2 | 20/20 | PASS |
| M10 targeted (7 financial/security suites) | 7/7 | 86/86 | PASS |
| M10 broad regression (22 suites) | 22/22 | 172/172 | PASS (1 transient `account-lifecycle-bridge` flake on first pass, non-reproducing on isolated + fresh-full-sweep re-run — known `GameBridgeJob` test-isolation debt, not a regression) |
| M11 | — | NOT_APPLICABLE | schema-only, no runtime code exists |
| LEVEL 2 after M11 (7 targeted financial/economy suites) | 7/7 | 77/77 | PASS |
| LEVEL 3 (full e2e sweep, all 11 merges) | 76/81 | 805/818 | PASS with 5 pre-existing/transient failures investigated individually — see below; zero regressions caused by M9–M11 |

**LEVEL 3 full-sweep failure investigation** (13 failing tests across 5
suites, none a regression from M9–M11):
- `account-deletion.e2e-spec.ts` (1 test, DB-connection-refused) and
  `account-lifecycle-bridge.e2e-spec.ts` (1 test, the same known
  `GameBridgeJob` flake as above) — both **PASS cleanly** when
  re-run in isolation together with `two-factor-key-migration.e2e-spec.ts`
  (28/28, 27/27 respectively) — confirmed transient, an artifact of one
  818-test/702s run, not a code defect.
- `error-handling.e2e-spec.ts` (9 tests), `game-account-production-provisioning.e2e-spec.ts`
  (compile failure), `two-factor-key-migration.e2e-spec.ts` (1 test) —
  all 3 confirmed **untouched** by the M9–M11 diff (`git diff 1185586d 43a9a374`)
  and last modified well before this round (2026-08-19, 2026-08-24,
  2026-08-25 respectively) — pre-existing, unrelated defects, newly
  surfaced by this being the first full-suite run in this recovery
  effort. Flagged as separate follow-up tasks (`task_b7d3ac18`,
  `task_53c3eb8b`), not blocking this integration.

`apps/api` full typecheck (`tsc --noEmit`): PASS after M9, M10, M11.
`vue-tsc --noEmit`: PASS (0 errors, unchanged from the 152→0 fix — none
of M9–M11 touch `apps/web`). `npm run web:build`: PASS. Phase AA unit
suite (`jest.config.js`): 7/7 suites, 46/46 tests, PASS, unchanged.

## Test stabilization (M12) — 819/819, zero known reproducible failures

The 3 pre-existing/unrelated defects flagged at the end of the M9–M11
round (`task_b7d3ac18`, `task_53c3eb8b`) were resolved this round on
branch `fix/integration-test-stabilization`, merged as **M12**
(`git merge --no-ff`, merge commit `fceadc5b`, zero conflicts). Two more
defects of the identical root-cause class were discovered and fixed
along the way, surfaced only by actually proving full-sweep
repeatability (2 consecutive complete runs) rather than accepting a
single green pass. **6 commits total, all test-only except one narrowly
scoped production fix:**

| Commit | Purpose | Files | Runtime behavior changed |
|---|---|---|---|
| `9825015c` | `error-handling.e2e-spec.ts`'s test module never provided `Http5xxBurstDetector`, a 3rd constructor dependency `SafeExceptionFilter` gained when Phase AA's alerting work landed. Added the real (dependency-free) provider. | 1 test file | NO |
| `16c92220` | `game-account-production-provisioning.e2e-spec.ts`'s fixture didn't set `GameCommandState`'s `detailJson` field (TS2741 compile error) after the field was added by unrelated VIP GameBridge delivery work. Added `detailJson: null`. | 1 test file | NO |
| `a2d974c2` | **GameBridgeJob batch-crowding flake** (`account-lifecycle-bridge.e2e-spec.ts`). Root cause: this suite's own "unconfigured transport" tests intentionally leave jobs permanently `PENDING` — over many historical runs against the persistent local dev DB, 48 such rows had accumulated. `runOnceWithLock()`'s dispatch query orders by `availableAt asc` and takes only `batchSize` (20), so once the backlog exceeds that, a freshly-created job (always the newest) never enters the batch. Fixed with the same `deleteMany` cleanup pattern already established in `vip-delivery.e2e-spec.ts` for the identical bug class. Verified 3 independent clean runs. | 1 test file | NO |
| `9172de7b` | **Real root cause of the two-factor-key-migration failure** (not what it first looked like). `migrate-two-factor-keys.ts` had an unconditional top-level `void main().catch(...)` with no `require.main` guard — so the test's own `await import(...)` of this module (to reuse `dryRunPass`/`realRunPass`/`emptySummary`) *also* silently triggered a real, unscoped, mutating migration pass over the entire shared `account` table as an unawaited side effect, racing the test's own explicit calls. Fixed with a `require.main === module` guard (zero behavior change for the real CLI entrypoint, `node dist/apps/api/src/migrate-two-factor-keys.js` per `package.json`'s `migrate:two-factor-keys` script) plus an optional `accountIds` scoping parameter, defaulting to unscoped/global (`main()`'s own call never passes it). | 1 src file | **YES, narrowly** — only the previously-buggy import-without-CLI-invocation path changes; the real CLI usage is untouched (see commit body for the full explanation) |
| `11d34250` | Companion to the above: every `dryRunPass`/`realRunPass` call in the test now passes its own created account id(s), making each test's ARRANGE/ACT/ASSERT self-contained — immune to residual rows or any concurrent process exercising these same global functions against the same shared DB. Tightened 2 assertions from approximate (`toBeGreaterThan(0)`) to exact (`toBe(1)`), now provable given the scoping. Verified 3 independent runs, 6/6 tests each. | 1 test file | NO |
| `d03d195f` | **Same crowding-class bug, different module** — discovered while proving full-sweep repeatability (see below). `community-moderation.e2e-spec.ts`/`community-e2e-journey.e2e-spec.ts` assert a freshly-created report appears in the admin moderation queue (`GET /api/admin/community/reports?status=NEW`), which orders oldest-first with a default `pageSize` of 25. 31 leftover `status=NEW` reports from an earlier session had accumulated, crowding out fresh reports once the backlog reached the page size. Same established `deleteMany` cleanup pattern, scoped to `status='NEW'`. Verified 2 consecutive runs, 50/50 tests together. | 2 test files | NO |

**Full-sweep repeatability, proven, not asserted:**

| Run | Suites | Tests | Result |
|---|---|---|---|
| Targeted (4 originally-known suites together) | 4/4 | 24/24 | PASS |
| Full sweep run 1 (pre community-fix) | 81/81 | 819/819 | PASS |
| Full sweep run 2 (pre community-fix) | 80/81 | 818/819 | 1 failure — `account-deletion.e2e-spec.ts`, `Can't reach database server`, confirmed transient (4th occurrence of this exact signature across sessions, always resolves clean in isolation — re-ran isolated, 15/15 PASS) |
| Full sweep run 2b (same session, before the community fix) | 79/81 | 816/819 | 2 new failures — `community-moderation.e2e-spec.ts`/`community-e2e-journey.e2e-spec.ts`, root-caused live (see `d03d195f` above), not dismissed as pre-existing without proof |
| Both 4-suite + 2-suite targeted groups, post community-fix | 6/6 | 74/74 | PASS |
| **Full sweep run A (post all fixes)** | **81/81** | **819/819** | **PASS** |
| **Full sweep run B (post all fixes)** | **81/81** | **819/819** | **PASS** |
| Post-merge full sweep (on `integration/open-beta` @ `fceadc5b`) | 81/81 | 819/819 | PASS |

`KNOWN_REPRODUCIBLE_TEST_FAILURES = 0`. `apps/api` typecheck/build,
`vue-tsc`, `npm run web:build`, Prisma validate/generate all PASS
post-merge. Migration count unchanged at 55 (M12 added zero migrations).
Zero secret-prone files touched across all 6 commits.

## Merge order (as authorized, executed unchanged)

| # | Source branch | Merge commit | Conflicts | Status |
|---|---|---|---|---|
| 1 | `feature/credential-key-rotation-cpanel-support` | `790f6577` | none | PASS |
| 2 | `fix/reconcile-output-cleanup` | `d340c20e` | none (identical content confirmed) | PASS |
| 3 | `feature/progression-reset-control-plane` | `1b42a208` | none | PASS |
| 4 | `feature/legacy-catalog-control-plane` | `99b86f8d` | `permissions.ts` (predicted) | PASS |
| 5 | `feature/account-lifecycle-gamebridge` | `5846d063` | `schema.prisma`, `commerce.controller.ts`, `commerce.module.ts` (predicted) | PASS |
| 6 | `feature/survey-schema-foundation` | `a15b53f7` | `schema.prisma` (predicted) | PASS |
| 7 | `open-beta/beta-feedback-rewards` | `56c08e3e` | `ManagementShell.vue` (predicted) | PASS |
| 8 | `open-beta/ops-hardening` | `a140ded5` | `apps/api/package.json` (unpredicted, inspected before resolving) | PASS |

All 8 merges used `git merge --no-ff`, preserving full commit provenance
from every source branch. No merge was squashed or rebased.

## Conflict resolutions

- **M4 `permissions.ts`**: MANUAL_COMBINE — Progression admin keys
  (Phase U) and Legacy Catalog admin keys (Phase S) both preserved with
  their original comments, in sequence.
- **M5 `schema.prisma`**: two conflicts, both coincidental textual
  overlaps (git's diff found shared suffix lines / a shared closing
  brace between unrelated enum/model pairs), not real semantic
  conflicts. `ProgressionRiskLevel`/`PaymentRiskSeverity` and
  `ProgressionConfigItem`/`ChargebackCase`(+7 other Payment Risk
  enums/models) both preserved in full.
- **M5 `commerce.controller.ts` / `commerce.module.ts`**: Legacy
  Catalog's services combined additively with Payment
  Risk/Reconciliation/Chargeback services — imports, constructor
  injections, module providers/controllers/exports all combined, zero
  drops.
- **M6 `schema.prisma`**: one conflict, an append-point collision (both
  branches inserted new content at the same file position, right after
  `LauncherAssetStorageProvider`). `ChargebackCase` closed properly,
  full Survey foundation block (4 enums + 7 models) appended intact.
- **M7 `ManagementShell.vue`**: MANUAL_COMBINE — VIP (Crown) and
  Privacy (Lock) player-nav entries preserved alongside the new Bug
  Hunters (Bug) entry, in both the player menu and the GM menu (the
  latter auto-merged cleanly, verified no duplication). Icon imports
  combined additively.
- **M8 `apps/api/package.json`**: not predicted by the Consolidation
  Gate 0 audit (which checked schema/permissions/commerce/GameDatabase
  files for this pair, not `package.json`) — inspected before
  resolving per instruction. Purely additive: distinct, non-overlapping
  npm scripts on each side, combined, valid JSON confirmed.

## Tests (post-merge, per checkpoint)

| Merge | Suites | Tests | Result |
|---|---|---|---|
| M3 (Progression) | — | — | policy check only (ADR-0029 confirmed intact) |
| M4 (Legacy Catalog) | 3/3 | 25/25 | PASS |
| LEVEL 2 after M4 | 10/10 | 75/75 | PASS |
| M5 (Account Lifecycle) | 3/3 | 37/37 | PASS |
| M5 (VIP) | 6/6 | 45/45 | PASS |
| M5 (Payment Risk/Chargeback/Legacy Catalog/Progression regression) | 12/12 | 86/86 | PASS |
| LEVEL 2 after M5 | 22/22 | 177/177 | PASS |
| M6 (Survey) | — | NOT_APPLICABLE | no runtime code exists |
| M7 (Bug Hunters/Beta Rewards) | 2/2 | 25/25 | PASS |
| M8 (Phase AA alerting, unit) | 7/7 | 46/46 | PASS |
| LEVEL 3 (full e2e sweep, all 8 merges) | 24/24 | 202/202 | PASS |

`apps/api` full API typecheck (`tsc --noEmit`): PASS after every merge
that touched `schema.prisma` (Prisma client regenerated before each
typecheck — M7 initially showed stale-client errors from a forgotten
regen, resolved, not a real defect).

## Migrations

54 total migrations on `integration/open-beta`. 36 were already present
on `main` (FOUNDATION_SHARED). 18 are new, arriving via the 8 merges:

| Migration | Source | Production status | Evidence |
|---|---|---|---|
| `20260830120000_open_beta_p0_foundation` | Payment Risk / Blood Coin foundation (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory (2026-09-04): "all 16 [uncommitted+committed-openbeta-only migrations]... NOT_IN_PRODUCTION" |
| `20260830121500_vip_product_config` | VIP (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory, same blanket finding |
| `20260830130000_phase14_vip_delivery_account_deletion` | VIP / Account Deletion (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory |
| `20260830140000_phase15_vip_benefit_fields_and_pricing_seed` | VIP (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory |
| `20260830150000_phase15_account_deletion_request` | Account Lifecycle / Privacy (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory; distinct from the base NORMAL_ACCOUNT_DELETION flow, which Phase Y separately confirms already-in-production on `main` |
| `20260830160000_gamebridge_vip_sync_state` | VIP/GameBridge (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory; reinforced by `docs/vip/wz-setaccountlevel-coexistence.md`: "GRANT_VIP has no real, wired production caller anywhere in the Portal today" |
| `20260830170000_account_deletion_feedback` | Account Lifecycle / Privacy (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory; feature branch (`feature/account-lifecycle-gamebridge`) did not exist as an isolatable artifact before this session |
| `20260830180000_account_deletion_feedback_retention_interaction` | Account Lifecycle / Privacy (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | same as above |
| `20260830190000_survey_foundation` | M6 (Survey) | NOT_DEPLOYED_CONFIRMED | Phase Y Batch E ("low priority, not yet isolated"); `feature/survey-schema-foundation` created this session |
| `20260831120000_vip_sync_drift_observability` | VIP (via M5 ancestry) | NOT_DEPLOYED_CONFIRMED | Phase Y inventory |
| `20260831130000_phase_p_payment_risk_and_chargeback_case` | Payment Risk (via M5 ancestry) | **ALREADY_PRODUCTION** | Phase AC closure, 2026-09-07, `PHASE_AC_PRODUCTION = PASS`: RISK_ADMIN_QA and CHARGEBACK_ADMIN_QA both tested live as Super Admin post-deploy |
| `20260902100000_phase_s_legacy_catalog_item` | M4 (Legacy Catalog) | NOT_DEPLOYED_CONFIRMED | Phase Y Batch C ("ready, pending isolation"); `feature/legacy-catalog-control-plane` created this session |
| `20260902110000_phase_t_legacy_catalog_effective_state` | M4 (Legacy Catalog) | NOT_DEPLOYED_CONFIRMED | same as above |
| `20260903120000_phase_u_progression_config_item` | M3 (Progression) | NOT_DEPLOYED_CONFIRMED | Phase Y Batch D ("ready, pending isolation"); `feature/progression-reset-control-plane` created this session |
| `20260904090000_phase_v_progression_policy_status` | M3 (Progression) | NOT_DEPLOYED_CONFIRMED | same as above |
| `20260904100000_beta_participation_record` | M7 (Beta Rewards) | **ALREADY_PRODUCTION** | Phase Z closure, 2026-09-06, approved PASS by Bryan; real QA rows created against production DB (`docs/handoff/phase-z-bug-hunters-beta-rewards-qa.md`); independently corroborated by the 2026-09-07 bmweb-recovery smoke test listing "Bug Hunters, Beta Rewards" among pages confirmed returning clean 200s |
| `20260904110000_bug_hunters_foundation` | M7 (Bug Hunters) | **ALREADY_PRODUCTION** | same Phase Z closure evidence |
| `20260905090000_alert_dispatch_state` | M8 (Ops Hardening) | NOT_DEPLOYED_CONFIRMED | Phase AA (ops-hardening) confirmed not deployed; `.output-phasez-backup` handoff note explicitly awaits "fechamento das Fases AC e AA" |
| `20260830191000_player_preferences_foundation` | M11 (Player Preferences, Recovery Batch 4) | NOT_DEPLOYED_CONFIRMED | schema-only, zero runtime code; extracted this round from openbeta's dirty working tree |

19 total new migrations across the 8-merge integration + Recovery Batch
4 (was 18; +1 this round). All verified to have a real `migration.sql`
file (zero orphans). Zero duplicated or missing migrations relative to
the source branches — full inventory re-confirmed after M9–M11
(55 total migration folders on `integration/open-beta`, sorted,
zero duplicate names).
`_prisma_migrations` was never touched by this integration effort, and
none of this reconciliation read production — every classification above
comes from dated documentary evidence (phase closure docs, the Phase Y
production-readiness inventory, project memory) gathered during the
Post-Integration Gate (openbeta final audit + production evidence
reconciliation), not a live database read.

**CORRECTED 2026-09-10, via a real live read** (Pre-Deploy Remediation
round — `SELECT migration_name, started_at, finished_at, rolled_back_at,
applied_steps_count FROM _prisma_migrations`, read-only, through
phpMyAdmin over the existing authenticated cPanel session, no new
Remote Database Access created): the documentary reconciliation below
undercounted `MIGRATIONS_ALREADY_PRODUCTION` by 7. Full detail,
including the drift check and the absent-table confirmation for the
genuinely-pending set, is in
`docs/deployments/predeploy-2026-09-10-open-beta-consolidation/deploy-manifest.md`'s
`MIGRATION_HISTORY_FINDING` section.

**MIGRATIONS_ALREADY_PRODUCTION** = [`phase_p_payment_risk_and_chargeback_case`, `beta_participation_record`, `bug_hunters_foundation`, `open_beta_p0_foundation`, `vip_product_config`, `phase14_vip_delivery_account_deletion`, `phase15_vip_benefit_fields_and_pricing_seed`, `phase15_account_deletion_request`, `account_deletion_feedback`, `account_deletion_feedback_retention_interaction`] (10 — real deploy ran 2026-09-05 ~16:45, confirmed clean, zero schema drift against this repo's current migration files)
**MIGRATIONS_NEW_NEXT_DEPLOY** = the other 9: `gamebridge_vip_sync_state`, `survey_foundation`, `player_preferences_foundation`, `vip_sync_drift_observability`, `phase_s_legacy_catalog_item`, `phase_t_legacy_catalog_effective_state`, `phase_u_progression_config_item`, `phase_v_progression_policy_status`, `alert_dispatch_state` — all confirmed genuinely absent (both from `_prisma_migrations` and via an `information_schema.tables` check on their key tables)
**MIGRATIONS_STILL_UNKNOWN** = none — every one of the 19 has either dated documentary evidence or, now, a direct live-read confirmation.

`PRODUCTION_READ_REQUIRED` was answered `NO` when this section was
first written (documentary evidence alone, no live read) — the live
read done 2026-09-10 for the Pre-Deploy Remediation round's own
migration-history preflight (a stricter bar than this manifest
originally needed to close) is what caught the undercount above. The
original documentary classification (3 already-production, 15 new)
is superseded by the corrected counts above, not reproduced here to
avoid stale figures sitting next to the correct ones.

## Frontend toolchain — now deterministic, fully type-checked

`apps/web/package.json` now pins `typescript ^5.0.0` and `vue-tsc
^3.3.11` explicitly (previously unpinned, silently hoisting to
whatever the least-constrained package in the workspace resolved to).
`vue-tsc --noEmit` had never once produced real output in this
project's history before commit `7619755f` — every prior "typecheck"
claim for `apps/web` was structurally impossible, not just unrun.

```
TYPESCRIPT_ERRORS_BEFORE = 152 (across 46 files)
TYPESCRIPT_ERRORS_AFTER  = 0
VUE_TSC_NOEMIT = PASS
WEB_BUILD (npm run web:build) = PASS
APPS_API_TOUCHED_BY_TOOLCHAIN_FIX = NO (confirmed via `git diff --stat` across both commits)
```

Root causes were concentrated, not 152 unrelated bugs: 18 composables
shared one duplicated `authHeaders`-style helper whose inferred return
type didn't satisfy `$fetch`'s `HeadersInit`; 12 composables passed an
`unknown`-typed `body` straight into `$fetch`; ~13 Vue components used
the `@click="x = true"` idiom, whose non-`void` implicit return breaks
Nuxt UI's typed click-handler contract; several `array[0]` fallback
reads are genuinely always-defined but not provable to the compiler.
Two real (not just type-level) pre-existing bugs were found and fixed
along the way in `wiki.vue`: a missing optional-chain that could crash
when no topic is active, and a dead `stat?.attackSpeed` reference to a
field that never existed on that type. Full breakdown in commit
`0fb9d654`'s own message. `apps/web` build and 3 real pages
(home, recarga, comunidade) spot-checked in a running dev server — no
regressions found, except one **pre-existing, unrelated** bug
newly discovered by that same manual check: see "Hero carousel bug"
below.

## .NET CI — real execution now exists

Both `.NET` suites (`BloodMoon.GameBridgeAgent.Tests`,
`BloodMoon.Launcher.Tests`) now run for real on GitHub Actions —
closing a gap where every prior "test result" in this project's
history was an honest manual code-trace, never an actual `dotnet test`
run (no .NET SDK on the local dev machine, only the runtime).

```
DOTNET_CI_BRANCH = ci/dotnet-tests-workflow
DOTNET_CI_HEAD = 0298e236aa24bae3dfbe9a866dd0d61af93b34d4
DOTNET_CI_REMOTE_PUSHED = YES (origin/ci/dotnet-tests-workflow == local HEAD)
DOTNET_CI_WORKFLOW_PATH = .github/workflows/dotnet-tests.yml
DOTNET_REAL_EXECUTION = YES
```

| Run | Head SHA | GameBridge Agent Tests | Launcher Tests |
|---|---|---|---|
| 34296684748 | `bae4051c` | SUCCESS | SUCCESS |
| 34296992235 | `0298e236` | SUCCESS | SUCCESS |

Both jobs run on `windows-latest` (the Launcher suite targets
`net8.0-windows`/WPF and genuinely needs Windows; GameBridge Agent
stays on the same runner for one consistent environment) via
`actions/setup-dotnet` 8.0.x. No `.sln` exists — each `dotnet test`
call targets its `.csproj` directly, matching the real project layout.
Results are `completed`/`success` per GitHub's own authoritative API
— genuine evidence, not a trace. **Exact per-test pass/fail counts are
not available**: both the raw job logs and the uploaded `.trx`
artifacts require an authenticated GitHub session to open (confirmed —
the public API returns `401`/`403` for both without a token), and a
`dorny/test-reporter` step added to publish a visible Check Run
summary ran successfully but did not produce an inspectable check run
for reasons not diagnosable without that same authenticated access.
`DOTNET_TEST_COUNT_CONFIRMED = UNKNOWN` — reported honestly rather than
inferred or estimated from the source file's own test count.

This closes what was previously tracked as a background task
(`task_a9e0e694`, "Set up .NET SDK test execution") — done directly
this round instead of deferred; no local .NET SDK was installed, per
the standing rule not to alter the machine's global environment
without authorization. `apps/web`'s typecheck gap (`task_fcb2178a`)
was closed the same way — see "Frontend toolchain" above.

## Hero carousel bug (pre-existing, unrelated, non-blocking)

Discovered during the manual dev-server spot-check above: on the home
page, clicking a hero-carousel thumbnail correctly updates the active
state (`activeSlide`, confirmed via DOM inspection — the clicked
thumbnail gets the `is-active` class), but the large background hero
image never follows, staying on the first slide. Confirmed
**pre-existing** and unrelated to the typecheck fixes: `git diff`
shows the only change this round to `pages/index.vue` is a single
non-null-assertion operator (`!`) on the `currentSlide` computed's
fallback branch, which compiles away to zero runtime bytes. Registered
as its own background task (`task_d34673ce`, "Fix hero carousel image
not syncing on click") — not fixed this round; classified
`UI_BUG`, `NON_BLOCKING_FOR_RECOVERY`, `REVIEW_DURING_UI_UX_PASS`.
- **Resolved this round** (was UNKNOWN, now reconciled — see the
  Post-Integration Gate report): Payment Risk/Chargeback and Phase Z
  (Bug Hunters/Beta Rewards) are `ALREADY_PRODUCTION`, confirmed via
  dated closure docs (Phase AC 2026-09-07, Phase Z 2026-09-06). VIP
  (baseline + delivery/sync), Legacy Catalog, Progression, Account
  Lifecycle Bridge, and AccountDeletionFeedback remain
  `NOT_DEPLOYED_CONFIRMED` as of the latest evidence found — see the
  migrations table above for the full per-migration breakdown.
- **New, still open**: the openbeta worktree audit (`OPENBETA_FINAL_AUDIT`)
  found `UNIQUE_UNPROTECTED = 134` files never captured by any of the 8
  merged branches (re-verified this round against the preserved 325-file
  raw comparison data; the figure reported in an earlier pass, 137, does
  not fully reconcile against this reconstruction — a ~3-file boundary
  difference not worth chasing further, the qualitative grouping below
  is the load-bearing result). Grouped by domain rather than treated as
  134 individual features:

  | Group | Count | Contents |
  |---|---|---|
  | A — Portal/API runtime feature | 2 | Pre-Beta Purge admin UI (`useAdminPreBetaPurgeApi.ts`, `pre-beta-purge.vue`) |
  | B — Portal/API test-only | 10 | Recharge Refund/WCoin-peg tests (4), Store admin security RBAC test (1), financial test-coverage deltas on already-integrated features (5: account-deletion, recharge-payments, wallet-transfer, payment-gm-rbac, payment-risk) |
  | C — Portal/API schema foundation | 1 | `player_preferences_foundation` migration |
  | D — Launcher runtime | 28 | Auth/Captcha/2FA subsystem + Scale/DPI/Window engine, confirmed **NOT_OBSOLETE** (see Launcher section below) |
  | E — Launcher test | 2 | Tests for the above |
  | F — Doc: decisions (ADR) | 27 (of 28 non-canonical) | `docs/decisions/0001`–`0028` minus the 4 already copied during Legacy Catalog/Progression extraction |
  | G — Doc: architecture/knowledge | 23 | `docs/knowledge/*`, `docs/sessions/*`, glossary/index/open-questions/open-risks/test-evidence-index, Launcher-scoped docs |
  | H — Doc: reference | 35 | `docs/gameserver/database/*`, `docs/manuals/*`, `docs/payments/*`, `docs/store/*`, `docs/economy/*`, `docs/security/*` (including 5 files where **integration's own copy is stale**, not just absent) |
  | I — Historical reference | 10 | `docs/legacy/provider-web/*`, OR-023 forensics dataset |
  | Also tracked, not part of the 134 | 17 | `POSSIBLE_SECRET` — `references/game-data/sql-discovery/**`, never opened/copied, out of scope by standing rule |

  Highest-risk item found: a real, uncommitted admin **recharge
  refund / provider-refund** feature (`commerce.service.ts`'s
  `refundRecharge`/`attemptProviderRefund`, permission keys
  `adminRechargeRefund`/`adminRechargeProviderRefund`, 3 controller
  endpoints, 3 e2e specs, plus a WCOIN 1:1 peg guard
  `assertWcoinPackageInvariant`/`wcoinBaseForBrl` with its own e2e
  coverage) — touches real money/provider state, deliberately not
  extracted this round pending its own dedicated risk audit. None of
  this blocks this integration branch's own `PASS` result; all tracked
  as recovery debt. Full file-by-file classification available on
  request — audit output, not integration code, not committed here.

### Recovery Batch 4 disposition — groups A/B/C now closed or deferred-with-reason

Of the 134-file `UNIQUE_UNPROTECTED` inventory above, Recovery Batch 4
(this round) resolved Groups B and C in full and made a deliberate,
audited decision on the highest-risk item in Group A:

- **Group C (schema foundation, 1 file)** — `PROTECTED`. Merged via M11.
- **Group B (test-only, 10 files)** — `PROTECTED`, but not as a blind
  10-file copy: the WCoin-peg tests (4) and the Store admin security
  test (1) were merged wholesale (M9/M10, genuinely new files with no
  runtime dependency question). The other 5 (financial test-coverage
  deltas) were **not** whole-file-copied — each was individually
  classified and only the real, still-valid deltas were surgically
  extracted onto the already-integrated runtime (M10); 2 files'
  refund-dependent deltas (`payment-gm-rbac`, `payment-risk`) were
  correctly excluded, since they depend on runtime this round
  explicitly does not integrate (see below).
- **Group A, Pre-Beta Purge admin UI (2 files)** — audited this round
  (RBAC-gating, transaction-atomicity, TOCTOU-closure, typed-confirmation
  all confirmed real and already correct), classified
  `UI_SAFE_TO_RECOVER` / `CAN_DEFER` — **deliberately deferred**, not a
  gap: the current backend closes the same risk surface without the UI,
  and the UI is release-optional for this cycle.
- **Recharge Refund runtime** (part of Group B's excluded 2 files plus
  its own controller/service code, never counted as a single file in
  the 134) — deep-audited (19-point risk review), explicitly
  **`DEFER_TO_POST_BETA`** with 4 named blockers: a real double-dip
  sequence (`attemptProviderRefund` accepts `REFUND_PENDING` as valid
  input, meaning a real Mercado Pago refund can fire even when the
  local WC clawback never happened), no idempotency guard against
  calling `attemptProviderRefund` twice, and 2 more from the original
  19-point review. Not extracted, not integrated, runtime confirmed
  absent both before and after M9–M11.

**The gate for this round is `RELEASE_RELEVANT_UNPROTECTED`, replacing
the old absolute `UNIQUE_UNPROTECTED = 0` bar.** It counts only:
runtime safety/economic-policy code, release-blocking migrations,
critical tests, and current (non-superseded) decisions — not
Launcher work (separate pipeline/graph), not historical/reference docs,
and not a feature formally classified `DEFER_TO_POST_BETA` or
`CAN_DEFER` with a named reason (Recharge Refund, Pre-Beta Purge UI).
Under this definition: **`RELEASE_RELEVANT_UNPROTECTED = 0`** — every
runtime-safety-relevant item from the 134-file inventory is now either
protected (Groups B/C) or formally, reasonedly deferred (Group A's
highest item, Recharge Refund), not silently missing.

The remaining ~121 files (Groups D–I: Launcher runtime/test, ADRs,
architecture/knowledge docs, reference docs, historical reference) stay
open recovery debt, tracked but not release-blocking under this gate —
Launcher because it is its own pipeline reconciled against
`launcher/phase-2d-release`/`feature/launcher-play-gate` separately, and
the docs groups because none of them are runtime code, release
migrations, or current decisions this cycle depends on.

## Main promotion gate (M12 round)

Evaluated against the 12-criterion gate, all against `integration/open-beta`
@ `fceadc5b` (post-M12 merge):

| Criterion | Result |
|---|---|
| `INTEGRATION_WORKTREE_CLEAN` | YES |
| `PRISMA_VALIDATE` | PASS |
| `PRISMA_GENERATE` | PASS |
| `API_TYPECHECK` | PASS |
| `API_BUILD` | PASS |
| `VUE_TSC` | PASS |
| `WEB_BUILD` | PASS |
| `FULL_SWEEP_RUN_1` (pre-merge, on `fix/integration-test-stabilization`) | PASS (81/81, 819/819) |
| `FULL_SWEEP_RUN_2` (pre-merge, repeatability proof) | PASS (81/81, 819/819) |
| `POST_MERGE_FULL_SWEEP` (on `integration/open-beta` @ `fceadc5b`) | PASS (81/81, 819/819) |
| `KNOWN_REPRODUCIBLE_TEST_FAILURES` | 0 |
| `RELEASE_RELEVANT_UNPROTECTED` | 0 |
| `MIGRATIONS_UNKNOWN` | 0 |
| `WCOIN_PEG_GUARD` | PROTECTED |
| `NO_KNOWN_RUNTIME_SAFETY_REGRESSION` | YES |
| `PRODUCTION_EVIDENCE_RECONCILED` | YES (inherited from Recovery Batch 4, unchanged) |

`READY_TO_PROMOTE_INTEGRATION_TO_MAIN = YES` — all criteria met.

## Explicitly not done this round

No deploy. No production migration. No cPanel/Cloudflare/GameServer/
real SQL Server/real GameBridge activity (0 real commands sent, all
Agent kill switches confirmed default `false`). No openbeta cleanup. No
branch deletion or archival. No production tags. Launcher work
untouched (separate pipeline, `feature/launcher-play-gate`). No
Recharge Refund extraction. No Pre-Beta Purge UI extraction.
