# Integration manifest: `integration/open-beta`

This is an INDEX of the integration branch's own merge history and
validation results — not a duplicate of each feature's own phase
manifest (see `docs/phases/*/phase-manifest.md` for per-feature detail).

```
BASE: main @ 3b527749 (2026-09-08)
INTEGRATION_BRANCH: integration/open-beta
INTEGRATION_HEAD_FINAL: 0fb9d654fcf176c8b57827e8cae8ab77ea9eb82c
INTEGRATION_WORKTREE: D:\MU\mu-bloodmoon-integration-openbeta
INTEGRATION_RESULT: PASS
```

Two commits landed after the 8-merge integration closed (`a140ded5`),
both frontend-toolchain work, `apps/api` untouched by either:

| Commit | What |
|---|---|
| `7619755f` | Pin `typescript ^5.0.0`/`vue-tsc ^3.3.11` in `apps/web/package.json` (matching `apps/api`'s own pin) + a root `overrides` entry forcing `vue-tsc`'s own `typescript` resolution to `^5.0.0` (npm's dedup was resolving it against a widely-shared, incompatible `6.0.3` instead) + a new `apps/web/tsconfig.json` (none existed; `vue-tsc` had no project file to find). This is what let `vue-tsc --noEmit` run at all for the first time in this project's history. |
| `0fb9d654` | Fixed all 152 real type errors that run surfaced, across 46 files — see "Frontend toolchain" below. |

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

All 18 verified to have a real `migration.sql` file (zero orphans).
Zero duplicated or missing migrations relative to the 8 source branches.
`_prisma_migrations` was never touched by this integration effort, and
none of this reconciliation read production — every classification above
comes from dated documentary evidence (phase closure docs, the Phase Y
production-readiness inventory, project memory) gathered during the
Post-Integration Gate (openbeta final audit + production evidence
reconciliation), not a live database read.

**MIGRATIONS_ALREADY_PRODUCTION** = [`phase_p_payment_risk_and_chargeback_case`, `beta_participation_record`, `bug_hunters_foundation`] (3)
**MIGRATIONS_NEW_NEXT_DEPLOY** = the other 15, all NOT_DEPLOYED_CONFIRMED
**MIGRATIONS_STILL_UNKNOWN** = none — every one of the 18 has dated evidence either way.

A definitive live confirmation (`SELECT migration_name FROM _prisma_migrations`,
read-only) remains available but was not run — not required to close any
UNKNOWN here, so `PRODUCTION_READ_REQUIRED = NO` for this specific
question.

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

## Explicitly not done this round

No merge of `integration/open-beta` into `main`. No deploy. No
production migration. No cPanel/Cloudflare/GameServer/real SQL Server
/real GameBridge activity (0 real commands sent, all Agent kill
switches confirmed default `false`). No openbeta cleanup. No branch
deletion or archival. No production tags. Launcher work untouched
(separate pipeline, `feature/launcher-play-gate`).
