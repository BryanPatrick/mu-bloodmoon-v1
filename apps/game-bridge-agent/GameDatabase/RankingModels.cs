namespace BloodMoon.GameBridgeAgent.GameDatabase;

// REAL_SQL_METADATA, confirmed 2026-08-20. Each leaderboard keeps its own
// real column shape -- CastleSiege genuinely has KillScore/DeathScore/
// CrownTime, not a generic "Score" (this corrects Phase 1's OBSERVED
// assumption; see docs/game-data/schema/v1-rankings.md's update section).
// Two distinct kinds of "no value," never conflated: a null *record*
// (BloodCastle/etc. itself null) means no row exists for this character on
// that leaderboard at all ("never ranked"); a null *field* inside a
// present record (e.g. Score/KillScore/DeathScore/CrownTime) means the row
// exists but that column's real value is NULL (every one of these score
// columns is nullable in the live schema) -- never invented as zero.
public sealed record BloodCastleRanking(int? Score);
public sealed record DevilSquareRanking(int? Score);
public sealed record ChaosCastleRanking(int? Score);
public sealed record CastleSiegeRanking(int? KillScore, int? DeathScore, int? CrownTime);
public sealed record DuelRanking(int? WinScore, int? LoseScore);

public sealed record CharacterRankings(
    BloodCastleRanking? BloodCastle,
    DevilSquareRanking? DevilSquare,
    ChaosCastleRanking? ChaosCastle,
    CastleSiegeRanking? CastleSiege,
    DuelRanking? Duel
);
