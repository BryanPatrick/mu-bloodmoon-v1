# Phase 2A — real MU SQL Server schema discovery

**Status: done, 2026-08-20**, via a pre-existing tool this environment did
have all along — `D:\MU\Tools\RemoteOps\bm-sql.ps1` (a purpose-built,
read-only-enforced SQL bridge documented in `D:\MU\Tools\RemoteOps\CLAUDE_REMOTEOPS.md`
and `D:\MU\docs\remoteops-runbook.md`), not the scripts in this directory
directly. Results: `references/game-data/sql-discovery/live-20260820/`,
summarized in `docs/game-data/schema/join-keys-unknown.md`,
`v1-character-reset-master-level.md`, `v1-rankings.md`, and the new
`v2-account-guild-currencies-warehouse.md`. The scripts below remain useful
reference for anyone running discovery a different way (SSMS, a different
bridge, a future server) and were the basis for the equivalent single-statement
queries actually run through `bm-sql query`.

## Original handoff (superseded by the above, kept for reference)

The paragraph below described the situation as of the prior round, when no
SQL access path had yet been found. It's kept for context, not as current
guidance.

No real MU SQL Server connection exists here, and none was installed
locally (deliberate, confirmed during Phase 1 planning). This is the
handoff: a self-contained, read-only discovery script for you to run
wherever the real database is actually reachable, plus what to do with the
results.

## Two versions — run v2

A read-only audit of the vendor's legacy web/AdminCP source
(`docs/game-data/legacy-web-intelligence/`) found real, executing code
naming specific tables, which made a much more targeted script possible:

- **`mu-schema-discovery-v2.sql`** (recommended) — queries metadata for
  exactly the 25 tables the legacy code actually names (Section 1 even
  reports which of them don't exist on the live server — useful negative
  evidence, e.g. confirming which credits/master-level engine preset is
  really active). Same read-only guarantee as v1, plus a Section 7 that
  checks which of the legacy code's named stored procedures actually exist
  (existence check only, never executed).
- **`mu-schema-discovery.sql`** (v1, broad `LIKE`-pattern sweep) — still
  useful as a safety net in case the live schema has tables the legacy
  code never touched, or has drifted further than the legacy snapshot
  suggests. Run this too if v2's results look incomplete or surprising.

## What to run Every statement is a
`SELECT` against system catalog views (`sys.*`) or `INFORMATION_SCHEMA` —
metadata only. It never reads a single row of account/character/player
data, and it never writes anything (no `INSERT`/`UPDATE`/`DELETE`/`MERGE`/
`EXEC`/DDL of any kind). Run it with the most restricted read-only
credential you have — catalog metadata is visible under a plain
`db_datareader` role, a dedicated `SELECT`-only login, or equivalent.

1. **Full table inventory** — every table in the database, unfiltered. This
   is ground truth, not a guess-filtered list, so the real account/character
   tables show up here even if their names don't match anything expected.
2. **Candidate table columns** — full column detail (name, type, length,
   nullable, **collation** [reveals case sensitivity directly], default)
   for tables matching search-hypothesis patterns (`%account%`, `%memb%`
   — classic MU account tables are often `MEMB_INFO`/`MEMB_STAT` —
   `%char%`, `%player%`, `%user%`, `Ranking%`, `MasterSkillTree%`,
   `CashShopData%`, `Guild%`). These patterns are hypotheses, not claims —
   see `docs/game-data/schema/join-keys-unknown.md`.
3. **Primary key / unique constraints** — answers uniqueness directly.
4. **Foreign key relationships** — the real answer to how Account relates
   to Character(s), if the relationship is enforced by an actual FK.
5. **Indexes** — a soft signal for which columns are actually queried
   often, useful when several candidate identity columns exist.
6. **Approximate row counts** — a metadata estimate (`sys.partitions`), for
   scale/orientation only, never a data scan.

If a table you expect doesn't show up in sections 2–6, it didn't match the
`LIKE` patterns — check section 1's full list and re-run with adjusted
patterns rather than assuming the table doesn't exist.

## What to send back

The result grids from all six sections, as-is. They contain no player data
by construction — but skim them yourself first regardless, and redact
anything that surprises you (a column name or default value that looks
like it might echo real data, for instance) before sharing. Per the Phase
2A rules: no real passwords, password hashes, emails, IPs, secrets, or
personal data in anything shared or documented — table/column/type/key/
relationship information only.

## What happens with the results

Each real table/column found gets classified into
`docs/game-data/schema/` as **CONFIRMED** (this is what real introspection
promotes evidence to — see `docs/game-data/schema/README.md`), and the
report format from the Phase 2A request gets filled in from what was
actually found: `ACCOUNT_TABLE`, `ACCOUNT_IDENTITY_KEY`, `CHARACTER_TABLE`,
`CHARACTER_IDENTITY_KEY`, `ACCOUNT_CHARACTER_JOIN`, `CHARACTER_NAME_COLUMN`,
`CLASS_COLUMN`, `LEVEL_COLUMN`, `RESET_COLUMN`, `MASTER_RESET_COLUMN`,
`MASTER_LEVEL_RELATION`, plus whether the identity chain looks stable
enough for `ACCOUNT_LINKING_SCHEMA_READY` — all from what the six sections
actually show, never from generic MU knowledge filling a gap.
