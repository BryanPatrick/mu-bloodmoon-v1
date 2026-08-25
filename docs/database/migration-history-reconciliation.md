# Migration history reconciliation

`MIGRATION_PROVENANCE = RECOVERED`. Full detail, including the exact
recovered SQL for all six affected migrations, lives in
`references/database/migration-history-20260719-postgresql-to-mysql/`.

## Summary

`20260630195500_knowledge_base` (recorded in production's
`_prisma_migrations` table but absent from the current repo's
`apps/api/prisma/migrations/` folder) was never lost, faked, or
mishandled. It was one of six PostgreSQL-era migrations consolidated into
a single new `20260718130000_mysql_baseline` migration by commit
`4e97993c` ("feat: publish modular CMS and production tooling",
2026-07-19), as part of switching the project's database engine from
PostgreSQL to MySQL. Production's tracking table still names the original
migration because production was migrated under PostgreSQL *before* that
consolidation happened -- an accurate historical record, not a
discrepancy to fix.

## What was and was not done

- The exact original SQL for all six consolidated migrations was
  recovered verbatim from git history (`git show
  4e97993c^:apps/api/prisma/migrations/<name>/migration.sql`) and archived
  under `references/database/migration-history-20260719-postgresql-to-mysql/`.
- Production's `_prisma_migrations` table was **not** modified. There is
  nothing incorrect in it to fix.
- Nothing was restored into the live `apps/api/prisma/migrations/`
  folder -- doing so would make Prisma believe these six migrations still
  need to be applied against a schema that already has their effects
  baked into `20260718130000_mysql_baseline`, which would be actively
  harmful.
- No migration was fabricated to paper over the gap.

See the archive directory's own `README.md` for the full six-migration
table, exact commit metadata, and the reasoning behind each decision
above.
