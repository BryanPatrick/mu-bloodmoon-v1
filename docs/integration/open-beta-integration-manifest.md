# Integration manifest: `integration/open-beta`

This is an INDEX of the integration branch's own merge history and
validation results — not a duplicate of each feature's own phase
manifest (see `docs/phases/*/phase-manifest.md` for per-feature detail).

```
BASE: main @ 3b527749 (2026-09-08)
INTEGRATION_BRANCH: integration/open-beta
INTEGRATION_HEAD_FINAL: a140ded53b4edfbfe3898930b2c012edd8f59e1f
INTEGRATION_WORKTREE: D:\MU\mu-bloodmoon-integration-openbeta
INTEGRATION_RESULT: PASS
```

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

| Migration | Source |
|---|---|
| `20260830120000_open_beta_p0_foundation` | Payment Risk / Blood Coin foundation (via M5 ancestry) |
| `20260830121500_vip_product_config` | VIP (via M5 ancestry) |
| `20260830130000_phase14_vip_delivery_account_deletion` | VIP / Account Deletion (via M5 ancestry) |
| `20260830140000_phase15_vip_benefit_fields_and_pricing_seed` | VIP (via M5 ancestry) |
| `20260830150000_phase15_account_deletion_request` | Account Lifecycle / Privacy (via M5 ancestry) |
| `20260830160000_gamebridge_vip_sync_state` | VIP/GameBridge (via M5 ancestry) |
| `20260830170000_account_deletion_feedback` | Account Lifecycle / Privacy (via M5 ancestry) |
| `20260830180000_account_deletion_feedback_retention_interaction` | Account Lifecycle / Privacy (via M5 ancestry) |
| `20260830190000_survey_foundation` | M6 (Survey) |
| `20260831120000_vip_sync_drift_observability` | VIP (via M5 ancestry) |
| `20260831130000_phase_p_payment_risk_and_chargeback_case` | Payment Risk (via M5 ancestry) |
| `20260902100000_phase_s_legacy_catalog_item` | M4 (Legacy Catalog) |
| `20260902110000_phase_t_legacy_catalog_effective_state` | M4 (Legacy Catalog) |
| `20260903120000_phase_u_progression_config_item` | M3 (Progression) |
| `20260904090000_phase_v_progression_policy_status` | M3 (Progression) |
| `20260904100000_beta_participation_record` | M7 (Beta Rewards) |
| `20260904110000_bug_hunters_foundation` | M7 (Bug Hunters) |
| `20260905090000_alert_dispatch_state` | M8 (Ops Hardening) |

All 18 verified to have a real `migration.sql` file (zero orphans).
Zero duplicated or missing migrations relative to the 8 source branches.
`_prisma_migrations` was never touched by this integration effort.

**Production status of these 18 migrations is UNKNOWN** — determining
this requires real production evidence (a live `_prisma_migrations`
read against the production database), which is out of this round's
authorized scope (no production access, no production migrations).
This is registered as a follow-up task, not guessed here.

## Known gaps (non-blocking for this integration branch)

- `apps/web` has no dedicated `typecheck` script and `vue-tsc` fails
  with `ERR_PACKAGE_PATH_NOT_EXPORTED` due to an unpinned `typescript`
  dependency hoisting to an incompatible version — pre-existing,
  already documented, confirmed unchanged by this integration. Tracked
  as a separate follow-up task, not fixed here per explicit instruction.
- .NET test suites (Launcher, GameBridge Agent) remain
  `IMPLEMENTED_NOT_EXECUTABLE` — no .NET SDK on this machine (only the
  runtime). Verified by manual code trace where feasible.
- Production deployment status for Phase Z (Bug Hunters/Beta Rewards)
  and the Privacy/Account-Lifecycle/Payment-Risk/VIP chain is UNKNOWN
  and requires a dedicated evidence-reconciliation task.

## Explicitly not done this round

No merge of `integration/open-beta` into `main`. No deploy. No
production migration. No cPanel/Cloudflare/GameServer/real SQL Server
/real GameBridge activity (0 real commands sent, all Agent kill
switches confirmed default `false`). No openbeta cleanup. No branch
deletion or archival. No production tags. Launcher work untouched
(separate pipeline, `feature/launcher-play-gate`).
