namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Read-only by construction: there is no Insert/Update/Delete/Execute*NonQuery
// member on this interface, and there must never be one. Game writes are
// forbidden for the entire Game Data Platform Phase 1 scope.
public interface IGameDatabaseReader
{
    Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken);
}
