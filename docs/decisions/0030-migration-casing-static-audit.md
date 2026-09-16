---
status: ACTIVE — static audit + real Linux/MariaDB CI + migration-immutability governance, all implemented
category: decisions
audience: internal (engineering)
lastVerified: 2026-09-16
confidence: CONFIRMED (real incident evidence, three times now; all defenses proven empirically)
---

# ADR-0030: Migration Table-Casing Static Audit

**DATE**: 2026-09-10 (static audit); **UPDATED**: 2026-09-16 (real Linux/
MariaDB CI validation added — this was option 1 below, previously
deferred); **UPDATED AGAIN**: 2026-09-16 (same day — that new CI
immediately found a second, unrelated real bug: a `CAST(... AS JSON)`
MariaDB incompatibility, plus a pre-existing, previously-undiscovered
migration-history checksum drift. See "2026-09-16 update, part 2"
below.)

**STATUS**: ACTIVE. Three defenses now exist: the static audit script
(`npm run db:check-migration-casing`, wired into `npm run check`), a
real GitHub Actions workflow
(`.github/workflows/database-migrations-linux.yml`) that applies every
migration from an empty database on genuinely case-sensitive Linux
MariaDB, and the migration-immutability governance rule (`AGENTS.md`
invariant 24). See "2026-09-16 update" and "2026-09-16 update, part 2"
below for what changed and why.

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

**A second real bug found once this actually ran on GitHub Actions**:
the first real remote run (2026-09-16, run id `35127972977`) failed at
`npm ci` in the `linux-mariadb-migration` job -- before any database or
Prisma step executed. Node 22.17.0 (this workflow's pinned version)
bundles npm 10.9.2, which rejected the committed `package-lock.json`
with `npm error code EUSAGE` / "Missing: `<pkg>` from lock file" for a
cluster of packages (`pinia@3.0.4`, `oxc-parser`/`rolldown` platform
bindings, `@vue/devtools-*`). All of these are declared `optional: true`
under `peerDependenciesMeta` by a nested
`node_modules/nuxt/node_modules/vue-router@5.1.0` -- npm 10.9.2's `npm
ci` sync check incorrectly treats these optional peers as required.
Confirmed this is an npm-version issue, not real repo drift: `npm ci`
against this exact commit succeeds cleanly with npm 11.19.0 (verified
locally, 1665 packages installed, exit 0), and this branch's own commit
never touched `package.json`/`package-lock.json`. Fixed by adding an
`npm install -g npm@11.19.0` step before `npm ci` in the
`linux-mariadb-migration` job -- workflow-only, no lockfile change.
Left as an open follow-up: this repo's `package.json` has no
`packageManager`/npm `engines` pin at all, so any future CI job or
contributor machine that happens to use an npm version with the same
optional-peer-dependency handling gap could hit this again outside this
one workflow -- worth a repo-wide npm version pin in its own right, not
bundled into this CI-validation task's scope.

## 2026-09-16 update, part 2 -- a real CAST(...AS JSON) incompatibility, a historical migration edit, and migration-immutability governance

Once `linux-mariadb-migration` was actually green end-to-end, it
immediately surfaced a second, genuinely different bug (not a casing
bug): `apps/api/prisma/migrations/20260723003000_launcher_integration/migration.sql`
used `CAST(0 AS JSON)` for the `launcher-online-players` `SiteSetting`
value. MySQL 8.0.17+ accepts this syntax; MariaDB never has --
confirmed both empirically (fails with error 1064 on real `mariadb:11`
*and* `mariadb:10.6` Docker images) and via MariaDB's own issue tracker
(`MDEV-26448`, closed "Not a Bug"). This is a different bug class from
the casing incidents above -- a MySQL/MariaDB SQL-dialect gap, not a
case-sensitivity gap -- caught only because real Linux/MariaDB CI now
exists at all.

**Why production wasn't actually broken.** Production runs MariaDB
`10.6.19-MariaDB-cll-lve-log` (CloudLinux's own patched build for
shared/LVE hosting, confirmed via a read-only `SELECT VERSION()`
against `mubloodxz_bloodmoon`) -- and yet this exact migration had
already applied there successfully, with `SiteSetting.value` for
`launcher-online-players` correctly holding a valid JSON integer `0`.
This directly contradicts stock MariaDB's behavior (confirmed by
testing the closest available Docker image, `mariadb:10.6`, which
*also* rejects the syntax) -- the leading, evidence-consistent
explanation is that CloudLinux's patched build carries hosting-
compatibility leniency that stock/upstream MariaDB does not. Not
independently confirmed against a CloudLinux changelog. The practical
consequence: this was a **CI/portability gap** (a from-zero replay on
generic Linux MariaDB would fail), not a **live production incident**
-- production was never at risk from the original syntax.

**The fix**: `CAST(0 AS JSON)` -> `'0'` (a bare JSON scalar integer
needs no cast at all). Proven byte-for-byte semantically identical to
the original on MariaDB 10.6, MariaDB 11, and MySQL 8 -- inserted into
a throwaway probe table via an isolated workflow
(`.github/workflows/probe-json-cast-compatibility.yml`), verifying
`JSON_VALID`/`JSON_TYPE`/raw value all match across all three engines.
The real `linux-mariadb-migration` job was also extended with a direct,
self-asserting check of the actual `SiteSetting` row after a real
from-zero replay -- not just the isolated probe -- so the fix is proven
both in isolation and in the real migration path.

**A historical migration had already been silently edited once
before, undiscovered until this investigation.** Production's recorded
checksum for this migration (`0c029c02...9be46`) did not match the
tracked file on disk at any point examined this round -- not the
`CAST(0 AS JSON)` version this incident started with, not the `'0'`
fix. Full git-history search (`git rev-list --all --objects`, not just
`--follow` on the current branch) found the exact match: an earlier
blob, first committed 2026-07-28, using a bare `0` literal (no cast, no
quotes) -- byte-for-byte identical (SHA-256 match) to what production
actually has recorded. A later, entirely unrelated commit
(`0eef9c90`, "feat(auth): finalize GM RBAC", 2026-08-13) incidentally
edited this already-applied migration's file, changing the bare `0` to
`CAST(0 AS JSON)` -- three weeks after the migration had already shipped
to production -- with no apparent awareness the file had already been
applied anywhere. This is precisely the class of mistake this ADR's new
governance rule (below) exists to prevent; it had already happened once,
silently, before this rule existed.

**Prisma's own checksum check does not enforce this -- confirmed
empirically, not assumed.** Using the exact project Prisma version
(5.22.0), a disposable local SQLite database was used to apply a tiny
migration, confirm it `APPLIED`, modify the file afterward, and run
the same commands production's real deploy process uses:
`prisma migrate status` reported "Database schema is up to date!"
(exit 0) and `prisma migrate deploy` reported "No pending migrations to
apply." (exit 0) -- both completely silent about a checksum that had
provably changed (independently verified: the file's new SHA-256 did
not match the checksum recorded in `_prisma_migrations`). **Neither
command warns nor fails.** This means nothing in the tooling itself
would ever have caught the 2026-08-13 edit, or would catch a repeat --
enforcement has to be a project rule, not something Prisma provides.

**Reconciliation, completed 2026-09-16.** All three environments where
this migration was already applied held different checksums from each
other (production: the original bare-`0` blob's checksum; both
`bloodmoon_local` and `bloodmoon_local_claude`: the `CAST(0 AS JSON)`
version's checksum, since both were populated after the 2026-08-13
edit). Each was reconciled to the new canonical checksum
(`b87b4f0e...ac37726`) via a guarded, optimistic-locked `UPDATE`
(`WHERE migration_name = ... AND checksum = <expected old value>`,
verified `ROWS_AFFECTED = 1` each time, verified unchanged
`finished_at`/`rolled_back_at`/`applied_steps_count`, verified zero
`SiteSetting` data change) -- local environments first, production last
and separately authorized. All three now hold the same checksum.

**New governance rule adopted**: `AGENTS.md` invariant 24, "Applied
migrations are immutable by default" -- summarized there, full
rationale here. Directly motivated by the empirical Prisma finding
above: since the tooling provides no automatic enforcement, the
checksum column's value as an audit signal depends entirely on this
rule being followed, not on `migrate deploy` catching a violation.

**Permanent CI shape, as of this update**: three jobs in
`database-migrations-linux.yml` -- static casing audit, a
historical-bug-detector proof (fixture-based, no real migration
history touched), and the real `linux-mariadb-migration` job (case-
sensitivity proof, `prisma validate`/`generate`, `migrate deploy` from
an empty database across all real migrations, a direct
`launcher-online-players` value assertion, and the migration-count/
pending/failed assertion). The isolated JSON-CAST probe workflow
(`probe-json-cast-compatibility.yml`) is retained, not archived-and-
removed: it is lightweight (three short jobs -- MariaDB 10.6, MariaDB
11, MySQL 8 -- no real migration history touched, triggers only on
changes to itself), and stands as a reusable
pattern for validating any *future* cross-engine SQL-portability
question the same way, not just this one incident.
