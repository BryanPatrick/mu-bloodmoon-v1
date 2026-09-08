# Deploy manifest template

Copy to `docs/deployments/<deploy-id>/deploy-manifest.md` for each real
deploy going forward. Not retroapplied to past deploys. Meant to
eventually be produced/validated by `bloodmoon-deploy` itself as its
Phase 11 (post-deploy) step — not automated yet.

```
DEPLOY_ID:
PHASE:
PRODUCT:
ENVIRONMENT:
SOURCE_BRANCH:
SOURCE_COMMIT:
INTEGRATION_COMMIT:
BUILD_HASH:
PACKAGE_HASH:
MIGRATIONS:
TARGET:
DEPLOYED_AT:
DEPLOYED_BY:
PRECHECK:
BACKUP:
MIGRATION_RESULT:
RELOAD_RESULT:
SMOKE_RESULT:
NEW_5XX:
ROLLBACK_POINT:
PRODUCTION_VERIFIED:
NOTES:
```

Field notes:

- **PRODUCT**: `portal` / `launcher` / `gamebridge` — matches the
  tagging scheme's own `<product>` segment.
- **ENVIRONMENT**: `prod` / `staging` — matches the tag's `<environment>`
  segment.
- **BUILD_HASH / PACKAGE_HASH**: distinguishes "what was compiled" from
  "what was actually uploaded" — the 2026-09-07 49-missing-chunk
  incident is exactly the gap between these two being silently
  different.
- **ROLLBACK_POINT**: the specific prior artifact/commit a rollback
  would restore to — named explicitly, never "the previous deploy"
  left implicit.
