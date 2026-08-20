using BloodMoon.GameBridgeAgent.GameDatabase;

namespace BloodMoon.GameBridgeAgent.Tests.Fakes;

// Stands in for the real SQL Server database (no local SQL Server is
// installed for this test suite -- confirmed out of scope). The real
// SqlServerGameDatabaseReader is proven blocked/implemented separately, in
// SqlServerGameDatabaseReaderTests and against the real live database in
// the Phase 2B integration test. Every Phase 2B method below defaults to
// "no row" (null / empty), matching real SQL Server behavior for a missing
// row -- tests opt in to populating exactly the rows they need.
public sealed class FakeGameDatabaseReader : IGameDatabaseReader
{
    public IReadOnlyList<CharacterResetSnapshot> ResetSnapshots { get; set; } = [];
    public IReadOnlyList<RankingSnapshot> RankingSnapshots { get; set; } = [];

    public MembInfoAccount? Account { get; set; }
    public AccountCharacterSlots? AccountCharacterSlotsResult { get; set; }
    public Dictionary<string, CharacterCore> CharactersByName { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int?> MasterLevelsByName { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, GuildMembershipInfo?> GuildMembershipsByName { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, GuildInfo?> GuildsByName { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, CharacterRankings> RankingsByName { get; } = new(StringComparer.OrdinalIgnoreCase);
    public CashShopBalances? CashShop { get; set; }
    public int? WarehouseMoney { get; set; }
    public bool? OnlineStatus { get; set; }

    // Set to simulate a SQL/connectivity failure on the next call(s).
    public Exception? FailNextCallWith { get; set; }

    public Task<IReadOnlyList<CharacterResetSnapshot>> GetCharacterResetSnapshotsAsync(CancellationToken cancellationToken) =>
        Task.FromResult(ResetSnapshots);

    public Task<IReadOnlyList<RankingSnapshot>> GetRankingSnapshotsAsync(CancellationToken cancellationToken) =>
        Task.FromResult(RankingSnapshots);

    public Task<MembInfoAccount?> GetAccountByMembGuidAsync(int membGuid, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(Account is not null && Account.MembGuid == membGuid ? Account : null);
    }

    public Task<AccountCharacterSlots?> GetAccountCharacterSlotsAsync(string membId, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(AccountCharacterSlotsResult is not null && AccountCharacterSlotsResult.Id == membId ? AccountCharacterSlotsResult : null);
    }

    public Task<IReadOnlyList<CharacterCore>> GetCharactersByNamesAsync(IReadOnlyList<string> names, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        IReadOnlyList<CharacterCore> result = names
            .Where(n => CharactersByName.ContainsKey(n))
            .Select(n => CharactersByName[n])
            .ToList();
        return Task.FromResult(result);
    }

    public Task<int?> GetMasterLevelAsync(string characterName, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(MasterLevelsByName.TryGetValue(characterName, out var level) ? level : null);
    }

    public Task<GuildMembershipInfo?> GetGuildMembershipAsync(string characterName, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(GuildMembershipsByName.TryGetValue(characterName, out var guild) ? guild : null);
    }

    public Task<GuildInfo?> GetGuildAsync(string guildName, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(GuildsByName.TryGetValue(guildName, out var guild) ? guild : null);
    }

    public Task<CharacterRankings> GetRankingsForCharacterAsync(string characterName, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(RankingsByName.TryGetValue(characterName, out var rankings)
            ? rankings
            : new CharacterRankings(null, null, null, null, null));
    }

    public Task<CashShopBalances?> GetCashShopBalancesAsync(string membId, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(CashShop);
    }

    public Task<int?> GetWarehouseMoneyAsync(string membId, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(WarehouseMoney);
    }

    public Task<bool?> GetAccountOnlineStatusAsync(string membId, CancellationToken cancellationToken)
    {
        Guard(cancellationToken);
        return Task.FromResult(OnlineStatus);
    }

    private void Guard(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (FailNextCallWith is { } ex)
        {
            FailNextCallWith = null;
            throw ex;
        }
    }
}
