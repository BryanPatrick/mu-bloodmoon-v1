# Phase 2B real read-model validation — 2026-08-20

## What this proves, precisely

Every one of the 10 new `SqlServerGameDatabaseReader` methods (Phase 2B,
Parts B–I) was hand-run against the real live `MuOnline` SQL Server via the
pre-existing `bm-sql` bridge, using the exact same query text and WHERE
predicates the C# code uses. The results are captured in `../raw/` and
consolidated in `../normalized/query-validation-summary.json`.

This is **`REAL_SQL_LOGIC_VALIDATED_AGAINST_LIVE_DATA`**, not
`REAL_GAMEBRIDGE_ACCOUNT_READ`. The distinction matters and is deliberate:

- **What was proven**: the SQL text is correct, the join chain
  (`memb_guid → memb___id → AccountCharacter → Character.Name`) resolves
  correctly against real rows, every nullable field's "row exists with a
  real value" and "no row at all" cases were both observed against real
  data (not just simulated in a fake), and the C# orchestration
  (`AccountSnapshotReader`/`AccountSnapshotChangeFactory`/`ChangeDetector`)
  produces the correct model and a stable, non-flapping event when fed
  these exact real values (`RealDataAccountSnapshotTests.cs`).
- **What was NOT proven**: that `Microsoft.Data.SqlClient` physically
  opened a TCP connection from the .NET Agent process to the real SQL
  Server. No such connection exists or was attempted. `D:\MU\docs\remoteops-runbook.md`
  is explicit: SQL is reached only through the `bm-sql` bridge over SSH;
  port 1433 is never opened, even locally. Opening a new path (e.g. an SSH
  tunnel) would be a new network-exposure change outside this phase's
  read-only, no-new-infrastructure scope, and was not done.

## Account used

`teste2` (`memb_guid=3`) — a real, live QA/test-fixture account (not a real
player), chosen because it has the richest real data of the 6 live
accounts: 5 populated character slots, one guild membership, real
CashShopData/warehouse balances, and a real `MasterLevel=2` value.

## Findings

1. **Ownership consistency guard passes on real data.** All 5 of
   `teste2`'s characters have `Character.AccountID = 'teste2'`, exactly
   matching `AccountCharacter.Id` — zero divergence, so
   `AccountSnapshotReader` returns `Ok`, never `Inconsistent`, for this
   account.
2. **Slot order and gaps are real, not hypothetical.** `teste1` has a real
   non-contiguous slot layout (`GameID4` empty between `GameID3` and
   `GameID5`), proving the "skip empty slots, preserve numbering"
   contract is exercised by genuine data, not just a synthetic test.
3. **`MasterLevel` null-vs-zero is a real, live distinction.**
   `MasterSkillTree` has a row for every one of the 12 live characters —
   `MasterLevel=0` is a real, present value for 4 of `teste2`'s 5
   characters, not a missing row. The "no row → null" path has no current
   live example but is separately proven correct by unit tests
   (`AccountSnapshotReaderTests.Missing_MasterSkillTree_row_yields_null_not_zero`).
4. **Rankings are empty database-wide, right now.** All 5 ranking tables
   have 0 rows for any character on the live server — confirming the
   "all-null `CharacterRankings`" path is the actual current state of
   production data, not just a defensive default.
5. **Genuine new observation: `Character.Experience` int32 overflow.**
   4 of `teste2`'s 5 characters (all at `cLevel=400`) show a negative
   `Experience` value (`-472819216`). `Experience` is a real SQL Server
   `int` column; a level-400 character's true experience total exceeds
   `Int32.MaxValue` and has wrapped on the game server's own side. This is
   a genuine live-data condition, not introduced by GameBridge (which
   reads the column via `SqlDataReader.GetInt32`, matching the column's
   real type exactly). No contract change was made this phase — surfaced
   here as new evidence per Part V, not acted on (would require a
   deliberate, separately-scoped type decision).

## Cross-reference

Corrects/extends `../../live-20260820/` (schema-only) and
`../../account-identity/` (identity-only) with real *data-row* evidence.
Backing evidence for `docs/game-data/schema/`'s Phase 2B additions and the
Phase 2B final report's `REAL_SQL_LOGIC_VALIDATED_AGAINST_LIVE_DATA` field.
