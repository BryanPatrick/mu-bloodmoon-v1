namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Real implementation, held to Phase 1's schema-discipline rule: no query may
// be built on a guessed column name. docs/game-vps-sqlserver-transition.md
// confirms only Character.ResetCount, Character.MasterResetCount,
// MasterSkillTree.MasterLevel and the 4 Ranking*.Score columns -- none of
// them a join/identity key. Every method below documents exactly which
// columns block it and throws SchemaDiscoveryRequiredException instead of
// guessing. This class never opens a write-capable connection and never
// will -- the connection string it holds is intended for a SELECT-only
// database credential, and no method here executes SQL of any kind yet.
public sealed class SqlServerGameDatabaseReader : IGameDatabaseReader
{
    private readonly string _connectionString;

    public SqlServerGameDatabaseReader(string connectionString)
    {
        _connectionString = connectionString;
    }

    public Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken) =>
        throw new SchemaDiscoveryRequiredException(
            nameof(GetCharacterResetSnapshotsAsync),
            ["Character.<primary/join key -- e.g. a character id or account link column>", "Character.<character name column>"]);

    public Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken) =>
        throw new SchemaDiscoveryRequiredException(
            nameof(GetRankingSnapshotsAsync),
            ["Ranking*.<character join key>", "Ranking*.<character name column>"]);
}
