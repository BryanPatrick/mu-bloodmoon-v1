namespace BloodMoon.GameBridgeAgent.GameDatabase;

// Read-only by construction: there is no Insert/Update/Delete/Execute*NonQuery
// member on this interface, and there must never be one. Game writes are
// forbidden for the entire Game Data Platform scope.
//
// GetCharacterResetSnapshotsAsync/GetRankingSnapshotsAsync (Phase 1) are a
// bulk "poll every character on the server" shape and stay exactly as they
// were -- still BLOCKED_BY_SCHEMA_DISCOVERY in SqlServerGameDatabaseReader,
// unrelated to this phase's scope, not touched here.
//
// Everything below is Phase 2B: account-scoped real reads, added
// additively. All parameters that carry MEMB_INFO.memb___id (the "membId"
// bridge) are internal plumbing only -- see AccountModels.cs.
public interface IGameDatabaseReader
{
    Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken);

    Task<MembInfoAccount?> GetAccountByMembGuidAsync(int membGuid, CancellationToken cancellationToken);

    Task<AccountCharacterSlots?> GetAccountCharacterSlotsAsync(string membId, CancellationToken cancellationToken);

    Task<IReadOnlyList<CharacterCore>> GetCharactersByNamesAsync(IReadOnlyList<string> names, CancellationToken cancellationToken);

    Task<int?> GetMasterLevelAsync(string characterName, CancellationToken cancellationToken);

    Task<GuildMembershipInfo?> GetGuildMembershipAsync(string characterName, CancellationToken cancellationToken);

    Task<GuildInfo?> GetGuildAsync(string guildName, CancellationToken cancellationToken);

    Task<CharacterRankings> GetRankingsForCharacterAsync(string characterName, CancellationToken cancellationToken);

    Task<CashShopBalances?> GetCashShopBalancesAsync(string membId, CancellationToken cancellationToken);

    Task<int?> GetWarehouseMoneyAsync(string membId, CancellationToken cancellationToken);

    Task<bool?> GetAccountOnlineStatusAsync(string membId, CancellationToken cancellationToken);
}
