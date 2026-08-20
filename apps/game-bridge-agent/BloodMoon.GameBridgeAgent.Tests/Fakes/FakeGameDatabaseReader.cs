using BloodMoon.GameBridgeAgent.GameDatabase;

namespace BloodMoon.GameBridgeAgent.Tests.Fakes;

// Stands in for the real SQL Server database (no local SQL Server is
// installed for this test suite -- confirmed out of scope). The real
// SqlServerGameDatabaseReader is proven blocked separately, in
// SqlServerGameDatabaseReaderTests.
public sealed class FakeGameDatabaseReader : IGameDatabaseReader
{
    public IReadOnlyList<CharacterResetSnapshot> ResetSnapshots { get; set; } = Array.Empty<CharacterResetSnapshot>();

    public IReadOnlyList<RankingSnapshot> RankingSnapshots { get; set; } = Array.Empty<RankingSnapshot>();

    public Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken) =>
        Task.FromResult(ResetSnapshots);

    public Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken) =>
        Task.FromResult(RankingSnapshots);
}
