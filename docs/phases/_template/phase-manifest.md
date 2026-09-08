# Phase manifest template

Copy to `docs/phases/<phase-id>/phase-manifest.md` when a new phase
starts. Not retroapplied to existing phases yet — format proposal only.

```
PHASE_ID:
TITLE:
OBJECTIVE:
SCOPE:
NON_SCOPE:
SOURCE_BRANCH:
BASE_COMMIT:
DEPENDENCIES:
OWNERSHIP:
MIGRATIONS:
FEATURE_FLAGS:
FILES/MODULES:
TEST_PLAN:
TEST_RESULTS:
DEPLOY_REQUIREMENTS:
ROLLBACK:
PRODUCTION_STATUS:
INTEGRATION_STATUS:
RELEASE_TAG:
KNOWN_DEBT:
LAST_UPDATED:
```

Field notes (only where the name alone is ambiguous):

- **SCOPE / NON_SCOPE**: what this phase deliberately does and does not
  touch — the second half matters as much as the first (see how
  `docs/payments/payment-risk-and-chargeback-operations.md`'s "What
  this release deliberately excludes" section already does this well).
- **DEPENDENCIES**: other phases/migrations this one requires already
  landed, not general library dependencies.
- **PRODUCTION_STATUS**: one of `NOT_DEPLOYED`, `DEPLOYED_NOT_VERIFIED`,
  `DEPLOYED_VERIFIED`, `ROLLED_BACK`.
- **INTEGRATION_STATUS**: one of `NOT_MERGED`, `MERGED_TO_INTEGRATION`,
  `MERGED_TO_MAIN`, `ARCHIVED`.
- **KNOWN_DEBT**: links to any debt doc this phase knowingly created
  (e.g. `docs/design/admin-native-dialogs-debt.md`-style entries) —
  never silently omitted.
