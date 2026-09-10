# Phase manifest: legacy-catalog-control-plane

```
PHASE_ID: legacy-catalog-control-plane
TITLE: X-Shop/CashShop legacy catalog admin control plane extraction
OBJECTIVE: Recover the real, working Legacy Catalog control plane
  (Phase S/T) from openbeta's dirty working tree into its own clean,
  tested, documented branch, via a surgical patch across the shared
  commerce files rather than copying them wholesale.
SCOPE: 5 new legacy-catalog-*.service.ts/policy.ts/seed-data files, the
  admin Vue page (catalogo-legado.vue) + its composable
  (useLegacyCatalogApi.ts), 2 Prisma migrations, the
  LegacyCatalogItem model + its 4 enums + the ShopProduct back-relation
  in schema.prisma, exactly the Legacy-Catalog-specific hunks of
  commerce.module.ts/commerce.controller.ts/store-admin.service.ts,
  the 3 adminStoreLegacyCatalog* permission keys (API + web mirror),
  one ManagementShell.vue nav entry, 3 e2e specs, the 0023 decision doc
  + core economy reference docs, the effective-state snapshot JSON
  (a real runtime dependency, not just documentation).
NON_SCOPE: Payment-Risk/Chargeback (ChargebackCaseService,
  PaymentReconciliationService, PaymentRiskService/Controller, and every
  admin.chargeback.*/admin.risk.*/admin.recharge.refund* permission key
  -- all entangled in the SAME shared files in openbeta's dirty tree,
  deliberately excluded); Progression (also entangled in permissions.ts/
  security.ts, excluded); any GameServer sync (permanently stubbed,
  unchanged); the broader docs/economy/* research corpus beyond the
  core decision/review docs (rental runbook, balance test plan, CSV
  exports, verification script -- left for a future doc-consolidation
  pass, not required for the code or tests to function).
SOURCE_BRANCH: extracted from open-beta/p0-foundation's dirty working
  tree (protected at D:\MU\RecoveryBackups\openbeta-2026-09-08\)
BASE_COMMIT: governance/engineering-pack @ b4fea68c (main @ 3adfd053 +
  the engineering governance pack)
DEPENDENCIES: none from other in-flight extraction branches this batch
MIGRATIONS: 20260902100000_phase_s_legacy_catalog_item,
  20260902110000_phase_t_legacy_catalog_effective_state (both copied
  verbatim from openbeta, applied cleanly via `prisma migrate deploy`
  against bloodmoon_local_claude during this phase's own test runs)
TEST_PLAN: all 3 legacy-catalog e2e specs (store-legacy-catalog-config,
  store-legacy-catalog-import, store-legacy-catalog-phase-t) against a
  real disposable local MySQL (bloodmoon_local_claude)
TEST_RESULTS: 3/3 suites PASS, 25/25 tests PASS (jest --config
  ./test/jest-e2e.json --runInBand --testPathPatterns="store-legacy-catalog"),
  2026-09-08. `npx tsc --noEmit` also clean across the whole apps/api
  tree after the surgical patch.
DEPLOY_TARGET: none this phase -- extraction/documentation only, no
  deploy or production action of any kind
EXIT_CRITERIA: files extracted, shared-file hunks surgically separated
  from the entangled Payment-Risk/Chargeback work, tests passing,
  committed with scoped commit(s) on this branch
INTEGRATION_STATUS: NOT_INTEGRATED
PRODUCTION_STATUS: NOT_DEPLOYED
KNOWN_DEBT:
  - MISSING_DEPENDENCIES_FOUND_AND_FIXED_THIS_PHASE (recorded for
    process visibility, not unresolved debt): the initial file-list
    audit missed 2 real dependencies, both found only by grepping the
    Vue page's own imports rather than assuming the 7-shared-file list
    was exhaustive -- apps/web/pages/painel/admin/catalogo-legado.vue
    (the actual admin page the new nav entry points to) and
    apps/web/composables/useLegacyCatalogApi.ts (the page's own data
    layer). Both copied; no further gaps found by typecheck or the
    3/3 test run.
  - PAYMENT_RISK_ENTANGLEMENT: commerce.module.ts, commerce.controller.ts,
    permissions.ts, and apps/web/data/security.ts all carry Payment-Risk/
    Chargeback additions interleaved with Legacy Catalog's own in
    openbeta's dirty tree. This phase's edits to those 4 files include
    ONLY the Legacy-Catalog hunks -- confirmed via reading each file's
    real diff before extracting, not by assumption. Payment-Risk itself
    remains fully unprotected in openbeta's working tree, pending its
    own future, separately-authorized extraction.
  - DOC_CORPUS_PARTIAL: docs/economy/{accessory-balance-test-plan,
    cashshop-commercial-review,cashshop-rental-empirical-test-runbook,
    xshop-cashshop-release-candidates,xshop-commercial-review,
    xshop-bryan-decision-table.csv,verify-xshop-cashshop-inventory.cjs}
    were not copied this phase -- none are runtime or test dependencies
    (confirmed via grep across the copied service/test files), and
    Bryan's instructions for this feature did not specify a full
    docs/economy/* port the way Progression's did for docs/progression/*.
LAST_UPDATED: 2026-09-08
```

## File classification

| File | Classification | Notes |
|---|---|---|
| `apps/api/src/modules/commerce/legacy-catalog-{config,effective-state}.service.ts`, `legacy-catalog-policy.ts`, `legacy-catalog-seed-data.{cashshop,xshop}.ts` | NEW | Copied verbatim from openbeta |
| `apps/web/pages/painel/admin/catalogo-legado.vue`, `apps/web/composables/useLegacyCatalogApi.ts` | NEW | Found via the nav entry's own target path + the page's own imports, not in the original file list -- copied verbatim |
| `apps/api/src/modules/commerce/commerce.module.ts` | MODIFIED | Adds `LegacyCatalogConfigService`/`LegacyCatalogEffectiveStateService` imports + provider registration only -- openbeta's real diff also added `ChargebackCaseService`/`PaymentReconciliationService`/`PaymentRiskService`/`PaymentRiskController` (Payment-Risk, excluded) |
| `apps/api/src/modules/commerce/commerce.controller.ts` | MODIFIED | Adds the 7 `admin/store/legacy-catalog*` endpoints + 2 constructor deps only -- openbeta's real diff also added refund/provider-refund/chargeback-trace/reconciliation-report/provider-poll endpoints (Payment-Risk, excluded) |
| `apps/api/src/modules/commerce/store-admin.service.ts` | MODIFIED | Adds `classifyLegacyCatalogKey` import, `legacyPolicyNote()` method, and its use in `catalogItemBlocked()`/the import-note field -- entirely Legacy-Catalog-scoped in the original diff, no entanglement here |
| `apps/api/src/modules/auth/permissions.ts`, `apps/web/data/security.ts` | MODIFIED | Adds `adminStoreLegacyCatalogView/Edit/Sync` keys only -- both files' real diffs also carried Progression/Marketplace/Beta-Rewards/Bug-Hunters/Payment-Risk/Chargeback keys, all excluded |
| `apps/api/prisma/schema.prisma` | MODIFIED | Adds `LegacyCatalogChannel`/`LegacyCommercialDecision`/`LegacyCatalogCommercialStatus`/`LegacyCatalogDriftStatus` enums + `LegacyCatalogItem` model + the required `ShopProduct.legacyCatalogItems` back-relation field |
| `apps/web/components/layout/ManagementShell.vue` | MODIFIED | One nav entry added ("Catálogo legado (X-Shop/CashShop)") -- the adjacent Progression nav entry in openbeta's same diff hunk was deliberately excluded (out of scope for this branch) |
| `apps/api/prisma/migrations/{20260902100000_phase_s_legacy_catalog_item,20260902110000_phase_t_legacy_catalog_effective_state}` | NEW | Copied verbatim |
| `apps/api/test/store-legacy-catalog-{config,import,phase-t}.e2e-spec.ts` | NEW | Copied verbatim, all pass unmodified |
| `docs/decisions/0023-store-catalog-decision-closure.md` | NEW, UNEDITED | Copied verbatim, directly referenced by 2 code comments in the extracted files |
| `docs/economy/{legacy-catalog-effective-state-snapshot.json,xshop-bryan-decision-table.md,cashshop-bryan-decision-table.md,xshop-cashshop-config-field-matrix.md}` | NEW | The snapshot JSON is a real runtime dependency of `legacy-catalog-effective-state.service.ts`'s `refresh()` action, not just documentation; the other 3 are the core decision-record docs |

## Confirmations

- `classifyLegacyCatalogKey()`, the 165-row seed block (168 X-Shop + 12 CashShop split across 2 seed-data files), and the `LegacyCatalogItem -> ShopProduct` FK are all preserved intact and verbatim.
- The sync-stub's fail-closed behavior (`legacy-catalog-config.service.ts`'s `sync()`) is unchanged -- no GameServer write path was implemented or altered.
- `npx tsc --noEmit -p tsconfig.json` clean across the whole `apps/api` tree after every surgical patch.
- No production database write, no production deploy, no migration applied to production.
