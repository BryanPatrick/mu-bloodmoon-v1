# Rankings — legacy evidence

Like reset/master-level, every ranking table/column is **config-resolved**
(`table_config.json` DEFAULT block), not hardcoded. Values below are what
this install's active config actually points to.

| Leaderboard | Table | Character key | Score column | Join |
|---|---|---|---|---|
| Blood Castle | `RankingBloodCastle` | `Name` | `Score` | `RankingBloodCastle.Name = Character.Name` |
| Devil Square | `RankingDevilSquare` | `Name` | `Score` | same pattern |
| Chaos Castle | `RankingChaosCastle` | `Name` | `Score` | same pattern (`column2`/`column3` unset in this install's config — no extra kill-count columns appended) |
| Castle Siege | `RankingCastleSiege` | `Name` | **`KillScore`**, not `Score` | no join to `Character` in this query |
| Duel | `RankingDuel` | `Name` | `WinScore`, `LoseScore` | `RankingDuel.Name = Character.Name` |

**⚠️ CONTRADICTS_CURRENT_ASSUMPTION:** `docs/game-data/schema/v1-rankings.md`
(Phase 1) lists `RankingCastleSiege.Score`. The legacy code's active config
for this install uses **`RankingCastleSiege.KillScore`** instead — quoted
verbatim from `model.rankings.php::load_cs_rankings()`:
`SELECT TOP :top Name, KillScore, [column2] FROM RankingCastleSiege ORDER BY KillScore DESC`.
Phase 1's `Score` entry is not overwritten here (per the "never silently
overwrite" rule) — but it should be treated as needing re-verification
against the live database; this is real, code-level evidence pointing at a
different column name for that one table specifically.

**Known incompleteness in the legacy config, not a schema fact:**
`RankingCastleSiege`'s `column2` (evidently intended as a death-score
column) is blank in the active `table_config.json`, so `load_cs_rankings()`
would build a query referencing an empty column name if that branch ran
with `column2` appended. Flagged as a legacy-app defect, not evidence of a
real schema gap.

## Other ranking-adjacent queries

- **Player rankings** (`load_player_rankings()`): a general leaderboard
  built from `Character` joined dynamically to `MasterSkillTree`,
  `MEMB_STAT`, and `AccountCharacter` depending on which columns are
  requested, `ORDER BY MasterResetCount DESC, ResetCount DESC, MasterLevel DESC, cLevel DESC, Experience DESC`.
- **Guild rankings** (`load_guild_rankings()`): `Guild` FULL JOIN
  `GuildMember` INNER JOIN `Character`, aggregating `SUM(cLevel)`,
  `SUM(ResetCount)`, `SUM(MasterResetCount)` per guild, ordered by
  `Guild.G_Score DESC`.
- **Online players list** (`load_online_players()`): `MEMB_STAT` INNER JOIN
  `AccountCharacter` (on `memb___id = AccountCharacter.Id`) INNER JOIN
  `Character` (on `AccountCharacter.GameIDC = Character.Name`), filtered
  `WHERE ConnectStat = 1` — see `online-status.md`.
- A conditional feature, `kill_stats()`, reads `C_PlayerKiller_Info`
  (`Victim, Killer, KillDate`) only if that table exists on the live
  server (`check_if_table_exists()` guard) — not confirmed present.

## Cross-reference against `docs/game-data/schema/`

| Field | Prior status | New status |
|---|---|---|
| `RankingBloodCastle.Score` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** (join key `Name` now known) |
| `RankingDevilSquare.Score` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** |
| `RankingChaosCastle.Score` | OBSERVED | **ALREADY_KNOWN + NEW_LEGACY_EVIDENCE** |
| `RankingCastleSiege.Score` | OBSERVED | **CONTRADICTS_CURRENT_ASSUMPTION** — legacy code's live column is `KillScore` |
| `Guild`, `GuildMember`, `RankingDuel` | not previously catalogued | **NEW_LEGACY_EVIDENCE** |
