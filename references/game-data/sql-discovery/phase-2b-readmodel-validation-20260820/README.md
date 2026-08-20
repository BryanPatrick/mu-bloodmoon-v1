# SQL discovery — Phase 2B real read-model validation, 2026-08-20

`sourceType: REAL_LIVE_SQL_SERVER` (see `metadata.json`). Validates the
exact query text of all 10 new `SqlServerGameDatabaseReader` methods
(Phase 2B) against real live data for a real multi-character account, via
the pre-existing `bm-sql` RemoteOps bridge — not a new connection
improvised this session, and no new network path opened.

Unlike `../live-20260820/` (schema/catalog metadata only, zero data rows)
and `../account-identity/` (aggregate counts only), this capture includes
real application data rows — character stats, currency balances, guild
membership — because Part Q's purpose is specifically to validate real
data against the new read models. The account used (`teste2`) is a real
but QA/test-fixture account, not a real player; see `metadata.json`'s
`sanitizationNote`.

## Chain

- **raw/** — 5 files, exact `bm-sql` query text and output for every one
  of the 10 new methods, covering both the row-exists and row-missing case
  for every optional table.
- **normalized/query-validation-summary.json** — the raw output
  consolidated per-method.
- **derived/real-data-validation-report.md** — findings, including a
  genuine new observation (`Character.Experience` real int32 overflow on
  high-level characters) and the explicit, deliberate distinction between
  "SQL logic validated against real data" and "the .NET Agent physically
  connected to the real server" (it did not — see that file for why).

## Headline finding

The full account→characters→core-stats→master-level→guild→rankings→
currencies→online-status chain resolves correctly against real live data
for a real 5-character account, with zero ownership inconsistencies. This
is the evidence backing `REAL_SQL_LOGIC_VALIDATED_AGAINST_LIVE_DATA = PASS`
in the Phase 2B final report.
