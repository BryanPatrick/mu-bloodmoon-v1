# Migration history reconciliation — PostgreSQL → MySQL consolidation (2026-07-19)

`sourceType: RECOVERED_FROM_GIT_HISTORY`. Answers exactly what
`20260630195500_knowledge_base` was, why production's `_prisma_migrations`
table has a row for it that the current repo's `apps/api/prisma/migrations/`
folder has no corresponding directory for, and why that is correct,
intentional history — not an accident, not data loss, not something to
"fix" by rewriting production's migration table.

## What happened

Commit `4e97993c` ("feat: publish modular CMS and production tooling",
2026-07-19 18:10:58 -0300, parent `5bb53988`) switched the project's
database engine from PostgreSQL to MySQL. As part of that switch, six
early PostgreSQL-era migrations were deleted from the repo and replaced
by one new migration, `20260718130000_mysql_baseline` (555 lines of MySQL
DDL) — a deliberate consolidation, not a loss:

| Deleted PostgreSQL migration | Lines |
|---|---|
| `20260630195500_knowledge_base` | 313 |
| `20260701123000_equipment_relations` | 76 |
| `20260701124500_equipment_target_class` | 1 |
| `20260702110000_shop_recharge_management` | 87 |
| `20260702113000_account_characters` | 29 |
| `20260702123000_marketplace_game_bridge` | 93 |

`20260630195500_knowledge_base` was the project's original foundational
schema migration under PostgreSQL — `CREATE TYPE ... AS ENUM` for `Role`,
`AccountStatus`, `CurrencyCode`, `KnowledgeEntryKind`, `KnowledgeScope`,
`ReferenceAssetKind`, `EditorialStatus`, `EquipmentGroup`,
`EquipmentQuality`, plus the initial `Account` table and the
Knowledge/Reference content model this repo's `KnowledgeEntry`/
`ReferenceAsset`/`ReferenceSource` models still trace back to today (see
`docs/knowledge-base-pipeline.md`, also touched by the same commit).

## Why production still has the old name recorded

Production's `_prisma_migrations` tracking table records migration names
as they were **applied at the time**, not as they currently exist in the
repo. Production was migrated under PostgreSQL before the 2026-07-19
consolidation, so its tracking table legitimately still has a row named
`20260630195500_knowledge_base` — accurately reflecting that this
migration really was applied to that database, at that time, under that
name. The repo's migration folder was later consolidated for a completely
unrelated reason (engine switch), and nobody went back to reconcile
production's historical tracking table against the new, squashed folder
structure. Both are correct; they're just describing the same underlying
schema evolution at different points in the repo's history.

## Provenance status

`MIGRATION_PROVENANCE = RECOVERED` (not reconstructed, not guessed) — the
exact original SQL for all six consolidated migrations is preserved in
this directory, extracted verbatim from git history
(`git show 4e97993c^:apps/api/prisma/migrations/<name>/migration.sql`),
byte-for-byte identical to what was actually applied at the time.

## What was deliberately NOT done

- Production's `_prisma_migrations` table was **not** touched. There is
  no correctness problem to fix there — the row is historically accurate.
- These files are **not** restored into the live
  `apps/api/prisma/migrations/` folder. Doing so would make Prisma
  believe they need to be (re-)applied against a schema that already has
  their effects baked into `20260718130000_mysql_baseline` and everything
  built on top of it since — that would be actively harmful, not a fix.
- No new migration was fabricated to "explain" the gap. This directory is
  documentation/archive only.

## Files

- `20260630195500_knowledge_base.sql` — the migration this reconciliation
  was specifically asked about.
- The other five files above — recovered for the same reason and same
  method, since they were consolidated in the identical commit and an
  engineer investigating one is likely to need the others too.
