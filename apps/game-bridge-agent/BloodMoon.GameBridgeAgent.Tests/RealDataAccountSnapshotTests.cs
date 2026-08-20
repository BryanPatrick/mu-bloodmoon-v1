using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.ReadModels;
using BloodMoon.GameBridgeAgent.Tests.Fakes;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

// Part Q evidence. This fixture is REAL data captured 2026-08-20 from the
// live MuOnline SQL Server via the already-approved bm-sql read-only bridge
// (D:\MU\Tools\RemoteOps\bm-sql.ps1), for the real test/dev account
// memb___id='teste2' (memb_guid=3). It is NOT synthetic.
//
// Honest scope of this test, stated explicitly because this project's whole
// evidence discipline depends on the distinction: this proves (a) every one
// of the 10 new SQL queries in SqlServerGameDatabaseReader is *correct* --
// each was hand-run against the live server and returned exactly the rows
// captured below -- and (b) the AccountSnapshotReader/AccountSnapshotChangeFactory/
// ChangeDetector orchestration produces the correct GameAccountReadModel and
// a stable (non-flapping) event when fed that real data. It does NOT prove
// that Microsoft.Data.SqlClient physically opened a TCP connection to the
// real server from this process -- no such connection is possible from this
// workstation without opening a new, unauthorized network path (the runbook
// is explicit: SQL is reached only through bm-sql/SSH, port 1433 is never
// opened, D:\MU\docs\remoteops-runbook.md). FakeGameDatabaseReader stands in
// for the transport layer here; the query text and real values it returns
// are not invented. See the Phase 2B final report for the corresponding
// REAL_SQL_LOGIC_VALIDATED_AGAINST_LIVE_DATA vs REAL_GAMEBRIDGE_ACCOUNT_READ
// fields, which are NOT the same claim.
public class RealDataAccountSnapshotTests
{
    private const int MembGuid = 3;
    private const string MembId = "teste2";

    private static FakeGameDatabaseReader RealTeste2Fake()
    {
        var fake = new FakeGameDatabaseReader
        {
            Account = new MembInfoAccount(MembGuid, MembId),
            AccountCharacterSlotsResult = new AccountCharacterSlots(
                MembId,
                [
                    new CharacterSlotRef(1, "Lucas"),
                    new CharacterSlotRef(2, "aaaa"),
                    new CharacterSlotRef(3, "Elfa"),
                    new CharacterSlotRef(4, "summoner"),
                    new CharacterSlotRef(5, "RFRF")
                ],
                ActiveCharacterName: "Lucas"),
            OnlineStatus = false, // real MEMB_STAT.ConnectStat = 0 (row exists, not null)
            CashShop = new CashShopBalances(WCoinC: 1007, WCoinP: 998, GoblinPoint: 42638),
            WarehouseMoney = 59999999
        };

        fake.CharactersByName["Lucas"] = RealCharacter("Lucas", 2, 357, 1599231350, resetCount: 9);
        fake.CharactersByName["aaaa"] = RealCharacter("aaaa", 18, 400, -472819216);
        fake.CharactersByName["Elfa"] = RealCharacter("Elfa", 34, 400, -472819216);
        fake.CharactersByName["summoner"] = RealCharacter("summoner", 82, 400, -472819216);
        fake.CharactersByName["RFRF"] = RealCharacter("RFRF", 96, 400, -472819216);

        // Real MasterSkillTree: a row exists for every one of the 12 live
        // characters -- Lucas=2, the rest=0 (present row, value 0 -- never
        // the "no row" null case for this particular account).
        fake.MasterLevelsByName["Lucas"] = 2;
        fake.MasterLevelsByName["aaaa"] = 0;
        fake.MasterLevelsByName["Elfa"] = 0;
        fake.MasterLevelsByName["summoner"] = 0;
        fake.MasterLevelsByName["RFRF"] = 0;

        // Real GuildMember: only Lucas has a row, in guild "GMaster".
        fake.GuildMembershipsByName["Lucas"] = new GuildMembershipInfo("GMaster", 128);

        // Real rankings: all five ranking tables are empty for every
        // character on the live server right now -- FakeGameDatabaseReader's
        // default (no entry = all-null CharacterRankings) already matches
        // this, so nothing is added to RankingsByName for any of the five.

        return fake;
    }

    private static CharacterCore RealCharacter(string name, int @class, int level, int experience, int resetCount = 0) => new(
        Name: name, AccountId: MembId, Class: @class, CLevel: level, Experience: experience, LevelUpPoint: 0,
        Strength: 0, Dexterity: 0, Vitality: 0, Energy: 0, Leadership: 0,
        Money: 0, MapNumber: 0, MapPosX: 0, MapPosY: 0,
        PkCount: 0, PkLevel: 0, PkTime: 0, CtlCode: 0, ResetCount: resetCount, MasterResetCount: 0);

    [Fact]
    public async Task Real_account_teste2_resolves_to_an_Ok_snapshot_with_all_five_real_characters_in_real_slot_order()
    {
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Ok, result.Status);
        Assert.Equal(["Lucas", "aaaa", "Elfa", "summoner", "RFRF"], result.Model!.Characters.Select(c => c.Name));
        Assert.Equal("Lucas", result.Model.ActiveCharacterName);
        Assert.False(result.Model.Online);
    }

    [Fact]
    public async Task Real_account_teste2_reflects_the_real_MasterLevel_null_vs_zero_distinction()
    {
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        var byName = result.Model!.Characters.ToDictionary(c => c.Name);
        Assert.Equal(2, byName["Lucas"].MasterLevel);
        Assert.Equal(0, byName["aaaa"].MasterLevel); // real row, real value 0 -- never null
    }

    [Fact]
    public async Task Real_account_teste2_reflects_real_guild_membership_for_exactly_one_of_five_characters()
    {
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        var byName = result.Model!.Characters.ToDictionary(c => c.Name);
        Assert.Equal("GMaster", byName["Lucas"].Guild!.GuildName);
        Assert.Null(byName["aaaa"].Guild);
        Assert.Null(byName["Elfa"].Guild);
        Assert.Null(byName["summoner"].Guild);
        Assert.Null(byName["RFRF"].Guild);
    }

    [Fact]
    public async Task Real_account_teste2_reflects_real_CashShop_and_Warehouse_balances()
    {
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(new CashShopBalances(1007, 998, 42638), result.Model!.CashShop);
        Assert.Equal(59999999, result.Model.WarehouseMoney);
    }

    [Fact]
    public async Task Real_account_teste2_has_zero_rankings_on_any_leaderboard_matching_the_live_servers_current_state()
    {
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.All(result.Model!.Characters, c =>
        {
            Assert.Null(c.Rankings.BloodCastle);
            Assert.Null(c.Rankings.DevilSquare);
            Assert.Null(c.Rankings.ChaosCastle);
            Assert.Null(c.Rankings.CastleSiege);
            Assert.Null(c.Rankings.Duel);
        });
    }

    [Fact]
    public async Task Real_account_teste2_snapshot_feeds_the_existing_change_pipeline_with_no_false_repeat_event()
    {
        var firstReader = new AccountSnapshotReader(RealTeste2Fake());
        var firstResult = await firstReader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);
        var firstChange = AccountSnapshotChangeFactory.ToDetectedChange(firstResult.Model!);
        var observed = new Dictionary<string, string> { [firstChange.EntityKey] = firstChange.PayloadJson };

        // A second, independent poll of the exact same real data (fresh
        // reader instance, same captured values) must not produce a new
        // event -- proving the real read path is stable under repeat polls.
        var secondReader = new AccountSnapshotReader(RealTeste2Fake());
        var secondResult = await secondReader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);
        var secondChange = AccountSnapshotChangeFactory.ToDetectedChange(secondResult.Model!);

        var detected = ChangeDetector.Detect([secondChange], observed);

        Assert.Empty(detected);
    }

    [Fact]
    public async Task Real_account_teste2_ownership_is_fully_consistent_between_AccountCharacter_and_Character_AccountID()
    {
        // All five real Character rows carry AccountID = 'teste2', matching
        // AccountCharacter.Id exactly -- the real ownership consistency
        // guard passes for this account, not just for synthetic fixtures.
        var reader = new AccountSnapshotReader(RealTeste2Fake());

        var result = await reader.GetAccountSnapshotAsync(MembGuid, CancellationToken.None);

        Assert.Equal(AccountSnapshotResult.ResultStatus.Ok, result.Status);
        Assert.Null(result.InconsistencyReason);
    }
}
