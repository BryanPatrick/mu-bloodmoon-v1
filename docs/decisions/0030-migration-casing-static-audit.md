---
status: ACTIVE — interim safeguard implemented; full CI-Linux-container validation deferred
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-10
confidence: CONFIRMED (real incident evidence, twice)
---

# ADR-0030: Migration Table-Casing Static Audit

**DATE**: 2026-09-10
**STATUS**: ACTIVE. Static audit script implemented and wired into
`npm run check`; full CI-Linux-container validation registered as
follow-up debt, not built this round.

## Why this ADR exists

Two separate real production incidents were caused by the same bug
class: a migration's SQL referencing a table with different letter
casing than the table's actual `CREATE TABLE` casing (e.g.
`` `progressionconfigitem` `` vs `` `ProgressionConfigItem` ``).
MySQL/MariaDB on Linux (production) is case-sensitive for table
identifiers; Windows/macOS local dev (where every migration in this
project is authored and tested) is not — so this class of bug is
structurally invisible until it reaches production, however carefully
the migration was reviewed locally.

- Incident 1: `open_beta_p0_foundation` (documented pre-existing,
  referenced in `docs/database/migration-history-reconciliation.md`
  and this project's memory).
- Incident 2: `20260904090000_phase_v_progression_policy_status`,
  2026-09-10 — full root cause, timeline, and recovery in
  `docs/deployments/deploy-2026-09-10-migration-execution/deploy-manifest.md`.
  Failed atomically in production (`applied_steps_count = 0`), fixed
  with a one-line casing correction (commit `6d8e4296`), recovered via
  `prisma migrate resolve --rolled-back` + retry.

## Decision

Two options were evaluated, as this incident's own follow-up explicitly
called for:

1. **A CI job running `prisma migrate deploy` against a real Linux
   MySQL/MariaDB** (container-based). This is the only fully faithful
   reproduction of the production failure mode — it would have caught
   the actual failure, not just this class of bug in the abstract.
   **Not implemented this round**: this repository has no GitHub
   Actions workflow (or any CI pipeline) at all yet — `find .github`
   returns nothing. Standing one up is a real, separate undertaking
   (choosing a runner strategy, wiring service containers, deciding
   what else belongs in first-time CI) that deserves its own scoped
   effort rather than being bundled into an incident-response fix.
2. **A static audit script** cross-referencing every migration's
   referenced table names (`ALTER TABLE`, `CREATE INDEX ... ON`,
   `REFERENCES`, `DROP TABLE`, `CREATE VIEW`) against the canonical
   casing established by that table's own `CREATE TABLE` statement,
   anywhere in migration history. **Implemented**: `scripts/check-migration-table-casing.mjs`,
   wired into `npm run check` via `npm run db:check-migration-casing`.
   Verified against a reconstructed fixture of the real
   `phase_v_progression_policy_status` bug — correctly flags the exact
   file/line/mismatch and correctly passes the corrected version. Runs
   in milliseconds, no database, no network, no container.

The static audit is the interim safeguard: it catches this specific,
already-twice-real bug class immediately, at negligible cost, as part
of the existing `check` pipeline everyone already runs. It does **not**
replace the value of real Linux/MariaDB CI validation, which would also
catch other production-only failure modes (character set/collation
mismatches, SQL syntax MySQL accepts differently than MariaDB, engine-
specific constraint behavior) that casing-only static analysis cannot.

## What this does not cover

- Any other Linux/MariaDB-only behavior difference (not just casing).
- Tables referenced by a migration but never `CREATE TABLE`d anywhere
  in this repo's migration history (e.g. a genuinely external/system
  table) — the script skips references it cannot resolve a canonical
  name for, rather than guessing; `_prisma_migrations` is the one
  explicit, reviewed exception (`KNOWN_EXTERNAL_TABLES`).
- Column-name casing (only table names were in scope for this
  incident; the same class of bug could theoretically exist for
  column names and is not currently audited).

## Follow-up (not built this round)

`LINUX_CASE_SENSITIVE_MIGRATION_VALIDATION_REQUIRED` — stand up a real
CI pipeline (this repo currently has none) with a Linux MySQL/MariaDB
service container running `prisma migrate deploy` end-to-end against
every migration in order, as the fuller safeguard option 1 above
describes. Tracked as spawned follow-up task `task_e710a571`.
