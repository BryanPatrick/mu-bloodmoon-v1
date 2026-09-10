# Phase manifest: progression-reset-control-plane

```
PHASE_ID: progression-reset-control-plane
TITLE: Progression control plane (XP/Drop/Reset/Master Reset) extraction
  + current reset policy ruling
OBJECTIVE: Recover the real, working Progression control plane (Phase U/V/W/X)
  from openbeta's dirty working tree into its own clean, tested, documented
  branch, and formalize the project owner's CURRENT reset policy ruling
  (Free=450/VIP=500 approved; reset cap reopened to UNRESOLVED) without
  destroying the prior ADR history that ruled differently.
SCOPE: apps/api/src/modules/progression/* (all files), progression.module.ts
  wiring into app.module.ts, the 2 progression Prisma migrations, the 4
  ProgressionConfigItem-related schema.prisma enums + model, the 3
  progression permission keys in permissions.ts, 6 progression e2e specs,
  docs/progression/* (17 files), docs/drop/* (2 files, Phase W dependency),
  docs/decisions/{0025,0026,0028}.md (copied unedited, historical record)
  + new docs/decisions/0029-progression-reset-policy-current-ruling.md,
  apps/web/pages/painel/admin/{progressao,calculadora-progressao}.vue,
  apps/web/composables/useProgressionApi.ts.
NON_SCOPE: GameServer runtime sync (permanently stubbed, unchanged);
  ManagementShell.vue nav wiring for the two Vue pages above (not in
  Bryan's file list for this phase -- pages are reachable by direct URL
  only, see KNOWN_DEBT); VIP/Payment-Risk/Chargeback/Legacy-Catalog (all
  separate, independently-scoped extractions); any GameServer write.
SOURCE_BRANCH: extracted from open-beta/p0-foundation's dirty working
  tree (protected at D:\MU\RecoveryBackups\openbeta-2026-09-08\)
BASE_COMMIT: governance/engineering-pack @ b4fea68c (main @ 3adfd053 +
  the engineering governance pack)
DEPENDENCIES: none from other in-flight extraction branches this batch
MIGRATIONS: 20260903120000_phase_u_progression_config_item,
  20260904090000_phase_v_progression_policy_status (both copied verbatim
  from openbeta, applied cleanly via `prisma migrate deploy` against
  bloodmoon_local_claude during this phase's own test runs)
OWNER_DECISIONS_THIS_PHASE (verbatim, 2026-09-08):
  RESET_STAT_POINTS_FREE = 450 (AL0)
  RESET_STAT_POINTS_VIP = 500 (AL1/AL2/AL3)
  RESET_CAP_STATUS = UNRESOLVED -- no substitute value chosen or inferred
  RESET_CAP_REPRESENTATION = ProgressionConfigItem.desiredValue = null +
    policyStatus = NOT_EVALUATED (pre-existing schema mechanism, zero
    new architecture needed -- RESET_CAP_MODEL_BLOCKER = NO)
  RESET_POLICY_ADR = docs/decisions/0029-progression-reset-policy-current-ruling.md
    (SUPERSEDES the applicable parts of 0025/0026's Phase V "cap=20 for
    all tiers, final" ruling and of Phase X's "450 flat for all tiers"
    ruling referenced in 0028 -- neither original ADR was edited or
    deleted, both remain as historical record)
TEST_PLAN: all 6 progression e2e specs (progression-config,
  progression-phase-w, progression-phase-x-calculator,
  progression-phase-x-policy, progression-policy-phase-v,
  progression-simulator) against a real disposable local MySQL
  (bloodmoon_local_claude, via D:\MU\.secrets\use-claude-local-db.ps1)
TEST_RESULTS: 6/6 suites PASS, 41/41 tests PASS (jest --config
  ./test/jest-e2e.json --runInBand --testPathPatterns="test/progression-"),
  2026-09-08. NOTE: an earlier run using --testPathPatterns="progression"
  (no "test/" prefix) matched 575 tests across 53 suites -- the pattern
  is a path substring match, and this worktree's own directory name
  ("mu-bloodmoon-progression-reset") accidentally satisfied it for every
  file in the repo, pulling in an unrelated, pre-existing
  two-factor-key-migration.e2e-spec.ts failure that has nothing to do
  with this phase. Rescoped to "test/progression-" to get a clean,
  correctly-bounded result.
DEPLOY_TARGET: none this phase -- extraction/documentation only, no
  deploy or production action of any kind
EXIT_CRITERIA: files extracted, classified, ADR-0029 written, tests
  passing, committed with scoped commit(s) on this branch
INTEGRATION_STATUS: NOT_INTEGRATED
PRODUCTION_STATUS: NOT_DEPLOYED
KNOWN_DEBT:
  - ZERO_DRIFT_DETECTED_TEST_COVERAGE: with reset.cap's desiredValue now
    null (RESET_CAP_STATUS=UNRESOLVED), the 25-row seed dataset has no
    remaining row that produces a real driftStatus=DRIFT_DETECTED
    outcome end-to-end. Not fabricated a substitute example on an
    unrelated row per explicit instruction -- flagged here as a real,
    honest gap for whenever RESET_CAP_STATUS is next ratified.
  - PROGRESSION_NAV_NOT_WIRED: the two admin Vue pages (progressao.vue,
    calculadora-progressao.vue) are not linked from ManagementShell.vue's
    nav in this branch (openbeta's own dirty tree has the nav entry, but
    it was not in this phase's authorized file list) -- reachable by
    direct URL only for an authorized admin. A one-line addition when
    authorized.
  - MISSING_DEPENDENCIES_FOUND_AND_FIXED_THIS_PHASE (recorded for
    process-improvement visibility, not unresolved debt): the initial
    surgical copy omitted (1) ProgressionModule's registration in
    app.module.ts -- ProgressionConfigService was unreachable via DI
    until fixed; (2) the 3 progression permission keys in permissions.ts
    -- RBAC checks would have silently evaluated against `undefined`;
    (3) docs/drop/or-023-diff-dataset.json and or-023-forensics.md,
    read directly by progression-phase-w.e2e-spec.ts. All three were
    only caught because the real e2e suite was actually executed against
    a real database this phase -- reinforces this project's own rule
    that "surgical patch" extraction still requires running the tests,
    never assuming a copy is complete from a file list alone.
  - STALE_TEST_ASSERTION_FOUND_AND_FIXED: progression-policy-phase-v's
    VIP_EFFECTIVE_CONFIG_NOT_AUTO_APPROVED test asserted zero APPROVED
    rows, written when only reset.cap had a ruling (Phase V, 2026-09-04).
    reset.stat_points was later approved (Fase AD, 2026-09-05, before
    this test had ever actually been run against a database) but the
    test was never updated to match -- a real, pre-existing drift in
    openbeta's own uncommitted work, not introduced by this extraction.
    Fixed with a SUPERSEDES comment; both original ADRs remain unedited.
LAST_UPDATED: 2026-09-08
```

## File classification

| File | Classification | Notes |
|---|---|---|
| `apps/api/src/modules/progression/*.ts` (6 files) | NEW | Copied verbatim from openbeta's dirty tree |
| `apps/api/src/app.module.ts` | MODIFIED | Adds `ProgressionModule` import + registration -- missing from the initial copy, found via actually running the tests |
| `apps/api/src/modules/auth/permissions.ts` | MODIFIED | Adds `adminProgressionView/Edit/Sync` keys only -- surgically extracted from openbeta's far more entangled diff (which also carried unrelated Legacy-Catalog/Marketplace/Beta-Rewards/Bug-Hunters/etc. keys, all excluded) |
| `apps/api/prisma/schema.prisma` | MODIFIED | Appends `ProgressionDomain`/`ProgressionDriftStatus`/`ProgressionRiskLevel`/`ProgressionPolicyStatus` enums + `ProgressionConfigItem` model, verbatim from openbeta lines 4512-4607 |
| `apps/api/src/modules/progression/progression-config-seed-data.ts` | MODIFIED | `reset.cap` entry: removed `desiredValue`/`desiredReason`, `policyStatus` NOT_EVALUATED, description carries a SUPERSEDES note citing ADR-0029. `reset.stat_points` entry: unchanged (already correct: APPROVED, Free=450/VIP=500) |
| `apps/api/prisma/migrations/{20260903120000_phase_u_progression_config_item,20260904090000_phase_v_progression_policy_status}` | NEW | Copied verbatim, applied cleanly this phase |
| `apps/api/test/progression-*.e2e-spec.ts` (6 files) | NEW/MODIFIED | 4 copied verbatim; `progression-config.e2e-spec.ts` and `progression-policy-phase-v.e2e-spec.ts` edited to match the corrected reset-cap seed data and the real (not stale) reset.stat_points APPROVED state |
| `docs/progression/*` (17 files) | NEW/MODIFIED | Copied; `vip-progression-policy-drift-matrix.md` got a SUPERSEDES note (frontmatter status changed, original Phase V content preserved below) |
| `docs/drop/{or-023-diff-dataset.json,or-023-forensics.md}` | NEW | Missed in the initial copy, found via test failure, copied |
| `docs/decisions/{0025,0026,0028}-*.md` | NEW, UNEDITED | Copied verbatim as historical record |
| `docs/decisions/0029-progression-reset-policy-current-ruling.md` | NEW | Formalizes the current ruling, supersedes 0025/0026/0028 without editing them |
| `apps/web/pages/painel/admin/{progressao,calculadora-progressao}.vue`, `apps/web/composables/useProgressionApi.ts` | NEW | Copied verbatim; no client-side permission gating found in either page (server-side RBAC is the real boundary) |

## Confirmations

- `RESET_CAP_MODEL_BLOCKER = NO` -- the existing nullable `desiredValue` + `NOT_EVALUATED` enum default already represents UNRESOLVED correctly; no schema/architecture change was needed.
- Old ADRs (0025, 0026, 0028) preserved unedited -- `OLD_ADRS_PRESERVED = YES`.
- GameServer sync remains an unimplemented, triple-guarded stub -- unchanged this phase.
- Effective state remains a manually-regenerated snapshot -- unchanged this phase.
- No production database write, no production deploy, no migration applied to production.
