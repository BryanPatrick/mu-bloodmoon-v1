using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.ReadModels;
using BloodMoon.GameBridgeAgent.Tests.Fakes;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class AccountSnapshotReaderTests
{
    private const int MembGuid = 42;
    private const string MembId = "playerone";

    private static FakeGameDatabaseReader BaseFake(IReadOnlyList<CharacterSlotRef>? slots = null, string? activeCharacter = null)
    {
        var fake = new FakeGameDatabaseReader
        {
            Account = new MembInfoAccount(MembGuid, MembId),
            AccountCharacterSlotsResult = new AccountCharacterSlots(MembId, slots ?? [], activeCharacter)
        };
        return fake;
    }

    private static CharacterCore Character(string name, string accountId = MembId) => new(
        Name: name, AccountId: accountId, Class: 1, CLevel: 10, Experience: 100, LevelUpPoint: 0,
        Strength: 1, Dexterity: 1, Vitality: 1, Energy: 1, Leadership: 0,
        Money: 0, MapNumber: 0, MapPosX: 0, MapPosY: 0,
        PkCount: 0, PkLevel: 0, PkTime: 0, CtlCode: 0, ResetCount: 0, MasterResetCount: 0);

    [Fact]
    public async Task Account_not_found_returns_AccountNotFound()
    {
        var fake = new FakeGameDatabaseReader();
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(999, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.AccountNotFound, result.Status);
    }

    [Fact]
    public async Task Account_with_zero_characters_is_Ok_with_an_empty_list()
    {
        var fake = BaseFake(slots: []);
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Ok, result.Status);
        Assert.Empty(result.Model!.Characters);
    }

    [Fact]
    public async Task Account_with_one_character_returns_exactly_one_snapshot()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")]);
        fake.CharactersByName["Hero"] = Character("Hero");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Ok, result.Status);
        var character = Assert.Single(result.Model!.Characters);
        Assert.Equal("Hero", character.Name);
        Assert.Equal(1, character.Slot);
    }

    [Fact]
    public async Task Account_with_multiple_slots_returns_all_of_them()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "A"), new CharacterSlotRef(2, "B"), new CharacterSlotRef(5, "C")]);
        fake.CharactersByName["A"] = Character("A");
        fake.CharactersByName["B"] = Character("B");
        fake.CharactersByName["C"] = Character("C");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(3, result.Model!.Characters.Count);
    }

    [Fact]
    public async Task Slot_order_is_preserved_exactly_never_resorted_by_name_or_level()
    {
        // Deliberately out of both alphabetical and slot-number order --
        // proves the reader doesn't silently re-sort.
        var fake = BaseFake(slots: [new CharacterSlotRef(3, "Zeta"), new CharacterSlotRef(1, "Alpha"), new CharacterSlotRef(7, "Mike")]);
        fake.CharactersByName["Zeta"] = Character("Zeta") with { CLevel = 1 };
        fake.CharactersByName["Alpha"] = Character("Alpha") with { CLevel = 99 };
        fake.CharactersByName["Mike"] = Character("Mike") with { CLevel = 50 };
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(["Zeta", "Alpha", "Mike"], result.Model!.Characters.Select(c => c.Name));
        Assert.Equal([3, 1, 7], result.Model!.Characters.Select(c => c.Slot));
    }

    [Fact]
    public async Task GameIDC_is_returned_separately_as_ActiveCharacterName()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")], activeCharacter: "Hero");
        fake.CharactersByName["Hero"] = Character("Hero");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal("Hero", result.Model!.ActiveCharacterName);
    }

    [Fact]
    public async Task Missing_AccountCharacter_row_is_Inconsistent_not_an_empty_account()
    {
        var fake = new FakeGameDatabaseReader { Account = new MembInfoAccount(MembGuid, MembId) };
        // AccountCharacterSlotsResult left null -- simulates no row for this account.
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Inconsistent, result.Status);
        Assert.Contains("AccountCharacter", result.InconsistencyReason);
    }

    [Fact]
    public async Task Orphan_slot_referencing_a_nonexistent_Character_is_Inconsistent()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Ghost")]);
        // CharactersByName intentionally left empty -- "Ghost" has no Character row.
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Inconsistent, result.Status);
        Assert.Null(result.Model);
    }

    [Fact]
    public async Task Character_AccountID_mismatch_is_Inconsistent_and_never_silently_chosen()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")]);
        fake.CharactersByName["Hero"] = Character("Hero", accountId: "someoneelse");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Inconsistent, result.Status);
        Assert.Contains("AccountID", result.InconsistencyReason);
    }

    [Fact]
    public async Task Missing_MasterSkillTree_row_yields_null_not_zero()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")]);
        fake.CharactersByName["Hero"] = Character("Hero");
        // MasterLevelsByName intentionally left empty.
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Null(result.Model!.Characters[0].MasterLevel);
    }

    [Fact]
    public async Task Missing_GuildMember_row_yields_null_guild()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")]);
        fake.CharactersByName["Hero"] = Character("Hero");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Null(result.Model!.Characters[0].Guild);
    }

    [Fact]
    public async Task Missing_ranking_rows_yield_all_null_ranking_records()
    {
        var fake = BaseFake(slots: [new CharacterSlotRef(1, "Hero")]);
        fake.CharactersByName["Hero"] = Character("Hero");
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        var rankings = result.Model!.Characters[0].Rankings;
        Assert.Null(rankings.BloodCastle);
        Assert.Null(rankings.DevilSquare);
        Assert.Null(rankings.ChaosCastle);
        Assert.Null(rankings.CastleSiege);
        Assert.Null(rankings.Duel);
    }

    [Fact]
    public async Task Missing_CashShopData_yields_null_not_zero_balances()
    {
        var fake = BaseFake(slots: []);
        // CashShop intentionally left null.
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Null(result.Model!.CashShop);
    }

    [Fact]
    public async Task Missing_Warehouse_row_yields_null_not_zero_money()
    {
        var fake = BaseFake(slots: []);
        // WarehouseMoney intentionally left null.
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Null(result.Model!.WarehouseMoney);
    }

    [Fact]
    public async Task Offline_account_reports_Online_false()
    {
        var fake = BaseFake(slots: []);
        fake.OnlineStatus = false;
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.False(result.Model!.Online);
    }

    [Fact]
    public async Task Online_account_reports_Online_true()
    {
        var fake = BaseFake(slots: []);
        fake.OnlineStatus = true;
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.True(result.Model!.Online);
    }

    [Fact]
    public async Task No_MEMB_STAT_row_reports_Online_null_never_assumed_offline()
    {
        var fake = BaseFake(slots: []);
        // OnlineStatus intentionally left null (default).
        var reader = new AccountSnapshotReader(fake);

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Null(result.Model!.Online);
    }

    [Fact]
    public async Task A_SQL_failure_propagates_rather_than_returning_wrong_data()
    {
        var fake = new FakeGameDatabaseReader { FailNextCallWith = new InvalidOperationException("simulated connection failure") };
        var reader = new AccountSnapshotReader(fake);

        await Assert.ThrowsAsync<InvalidOperationException>(() => reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None));
    }

    [Fact]
    public async Task Cancellation_is_honored_and_propagates()
    {
        var fake = BaseFake(slots: []);
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var reader = new AccountSnapshotReader(fake);

        await Assert.ThrowsAsync<OperationCanceledException>(() => reader.GetAccountSnapshotAsync(MembGuid, cts.Token));
    }
}
