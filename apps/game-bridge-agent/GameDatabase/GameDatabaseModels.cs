namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Every field below carries its schema-discovery classification (see
// docs/game-data/schema/). Only value columns are confirmed today; identity
// columns are UNKNOWN and must never be guessed (see
// SchemaDiscoveryRequiredException / SqlServerGameDatabaseReader). These
// records are intentionally forward-looking contracts -- the fake test
// reader can populate every field; the real reader cannot yet.
public sealed record CharacterResetSnapshot(
    string CharacterId,     // UNKNOWN -- no confirmed primary/join key column
    string CharacterName,   // UNKNOWN -- no confirmed name column
    int ResetCount,         // OBSERVED -- Character.ResetCount
    int MasterResetCount,   // OBSERVED -- Character.MasterResetCount
    int MasterLevel         // OBSERVED -- MasterSkillTree.MasterLevel
);

public sealed record RankingSnapshot(
    string Leaderboard,     // OBSERVED as a set of 4 tables: BloodCastle/DevilSquare/ChaosCastle/CastleSiege
    string CharacterId,     // UNKNOWN
    string CharacterName,   // UNKNOWN
    int Score                // OBSERVED -- Ranking<Leaderboard>.Score
);
