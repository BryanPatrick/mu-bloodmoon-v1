# Phase manifest: reconcile-output-cleanup

```
PHASE_ID: reconcile-output-cleanup
TITLE: reconcile.ts stdout logging fix
OBJECTIVE: A one-line, isolated fix -- swap logger.log() for
  process.stdout.write() with an explicit trailing newline in the
  provisioning-reconciliation CLI script.
SCOPE: apps/api/src/reconcile.ts only.
NON_SCOPE: everything else on main's original dirty state (deliberately
  kept separate from feature/credential-key-rotation-cpanel-support per
  explicit instruction, even though both were bundled in the same
  original dirty commit on main).
SOURCE_BRANCH: extracted from main's own dirty working tree (protected
  at D:\MU\RecoveryBackups\main-2026-09-08\)
BASE_COMMIT: governance/engineering-pack @ b4fea68c
DEPENDENCIES: none
MIGRATIONS: none
TEST_PLAN: no dedicated test exists for this file (confirmed, an
  honest pre-existing gap, not introduced by this change) -- verified
  via `tsc --noEmit`, zero errors
TEST_RESULTS: typecheck PASS (2026-09-08); no behavioral test exists to
  run
DEPLOY_TARGET: none this phase
EXIT_CRITERIA: file extracted, confirmed as a pure output-formatting
  change, typecheck clean, committed
INTEGRATION_STATUS: NOT_INTEGRATED
PRODUCTION_STATUS: NOT_DEPLOYED
KNOWN_DEBT: this script has no dedicated test coverage at all --
  worth adding one if this area is touched again, not added here since
  it's out of this phase's minimal scope.
LAST_UPDATED: 2026-09-08
```

## Confirmation

The change is exactly and only:
```diff
-    logger.log(
+    process.stdout.write(
       `Reconciliation pass completed: scanned=${result.scanned} acted=${result.acted} ` +
-        `backoff=${result.skippedBackoff} ceiling=${result.skippedAttemptCeiling} errors=${result.errors}`
+        `backoff=${result.skippedBackoff} ceiling=${result.skippedAttemptCeiling} errors=${result.errors}\n`
     )
```
Classified `TINY_ISOLATED_FIX` — confirmed via diff, no other change present.
