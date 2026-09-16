---
status: ACTIVE — both safeguards implemented (static audit + real Linux/MariaDB CI)
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-16
confidence: CONFIRMED (real incident evidence, twice; both defenses now proven)
---

# ADR-0030: Migration Table-Casing Static Audit

**DATE**: 2026-09-10 (static audit); **UPDATED**: 2026-09-16 (real Linux/
MariaDB CI validation added — this was option 1 below, previously
deferred).

**STATUS**: ACTIVE. Both defenses now exist: the static audit script
(`npm run db:check-migration-casing`, wired into `npm run check`) and a
real GitHub Actions workflow
(`.github/workflows/database-migrations-linux.yml`) that applies every
migration from an empty database on genuinely case-sensitive Linux
MariaDB. See "2026-09-16 update" below for what changed and why.

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
   ~~Not implemented this round: this repository has no GitHub Actions
   workflow (or any CI pipeline) at all yet — `find .github` returns
   nothing.~~ **Implemented 2026-09-16** —
   `.github/workflows/database-migrations-linux.yml`; see the
   "2026-09-16 update" section below. Correction to the original
   2026-09-10 claim: `.github/workflows/` was empty on `main` at the
   time, but a real, working GitHub Actions workflow already existed on
   the unmerged `ci/dotnet-tests-workflow` branch (.NET test suites for
   the GameBridge Agent and Launcher, added 2026-09-08) — this repo
   was not a completely blank CI slate, just one where no workflow had
   reached `main` yet. Standing up *this* workflow was still a real,
   separate undertaking (runner/service-container strategy specific to
   migrations), just not starting from literally zero prior art.
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

## Follow-up

~~`LINUX_CASE_SENSITIVE_MIGRATION_VALIDATION_REQUIRED` — stand up a real
CI pipeline (this repo currently has none) with a Linux MySQL/MariaDB
service container running `prisma migrate deploy` end-to-end against
every migration in order, as the fuller safeguard option 1 above
describes. Tracked as spawned follow-up task `task_e710a571`.~~
**RESOLVED 2026-09-16** — see below. Two smaller items remain open:
merging `.github/workflows/database-migrations-linux.yml` (currently on
branch `ci/linux-mariadb-migration-validation`, not yet on `main`) and,
separately, merging the pre-existing `ci/dotnet-tests-workflow` branch
(unrelated to this ADR, but the other piece of this repo's CI debt).

## 2026-09-16 update — real Linux/MariaDB CI implemented

**Why the static check alone still wasn't enough**: the static audit
(option 2) only ever reads migration SQL as text — it cannot see
anything that requires an actual database engine to manifest: character
set/collation mismatches, SQL MySQL accepts but MariaDB rejects (or vice
versa), engine-specific constraint/index behavior, or a casing bug in a
*column* reference rather than a table reference (explicitly out of the
static script's scope — see "What this does not cover" above). Only
running the real migrations against a real, case-sensitive Linux
database closes that gap.

**Windows vs. Linux, restated precisely**: every migration in this
project is authored and locally tested on Windows/macOS, where MySQL
table identifiers are case-*insensitive* by default
(`lower_case_table_names` effectively behaving as 1/2 on those
filesystems) — `progressionconfigitem` and `ProgressionConfigItem`
resolve to the same table. Production runs Linux, where the default
(`lower_case_table_names=0`) makes them two different identifiers. No
amount of local testing, however thorough, can surface this difference;
only running on a real Linux database engine can.

**Proof the new workflow would have caught the real 2026-09-10 bug**:
the `historical-bug-detector-proof` job builds a temporary, throwaway
fixture (two migration files, never touching real migration history)
reproducing the exact bug shape — a `CREATE TABLE` for
`` `ProgressionConfigItem` `` followed by an `ALTER TABLE` referencing
`` `progressionconfigitem` `` — and asserts the static script's exit
code is non-zero against it, then asserts exit code zero against the
corrected version. Confirmed locally while building this workflow (not
just assumed): `FAIL (1 casing mismatch(es) found)` against the bad
fixture, `PASS (2 migration files, 1 tables, 0 casing mismatches)`
against the corrected one. Separately, the `linux-mariadb-migration`
job's own case-sensitivity step performs the equivalent live proof
directly against the real CI MariaDB instance (`CREATE TABLE
CaseSensitivityProof` then `ALTER TABLE casesensitivityproof` — asserted
to fail with a "doesn't exist" error) — two independent proofs, one
static/script-level and one live/database-level, that this defense is
real and not just assumed to work.

**A real bug found while building this**: `check-migration-table-casing.mjs`
resolves its optional directory argument via
`join(process.cwd(), process.argv[2])`, which does not special-case an
already-absolute path — passing an absolute fixture directory (e.g. from
`mktemp -d`) silently produces a bogus concatenated path and crashes with
`ENOENT` instead of running the real check. The CI workflow works around
this by creating fixtures at a path relative to the repo root instead of
using `mktemp -d`. The script itself was not changed (out of scope for
this round — the workaround is sufficient and doesn't touch the
already-verified static-audit logic); worth a future minor fix so any
other caller isn't surprised by the same thing.

**Defense in depth, now complete**: static audit (`npm run
db:check-migration-casing`, milliseconds, no infrastructure, catches
this specific bug class in local dev / `npm run check` / pre-commit-
adjacent workflows) **+** real Linux/MariaDB CI
(`.github/workflows/database-migrations-linux.yml`, slower, real
infrastructure, catches this bug class for real plus anything else
genuinely Linux/MariaDB-specific). Neither replaces the other; each
covers a gap the other has.
