using BloodMoon.GameBridgeAgent.GameDatabase;
using BloodMoon.GameBridgeAgent.Ingestion;
using BloodMoon.GameBridgeAgent.ReadModels;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class AccountSnapshotChangeFactoryTests
{
    private static GameAccountReadModel Model() => new(
        AccountId: 42,
        Online: true,
        ActiveCharacterName: "Hero",
        Characters:
        [
            new CharacterSnapshot(
                Slot: 3, Name: "Zeta", Class: 1, Level: 10, Experience: 100, LevelUpPoint: 0,
                Stats: new CharacterStats(1, 2, 3, 4, 0),
                Money: 1000,
                Location: new CharacterLocation(0, 100, 200),
                Pk: new CharacterPk(0, 0, 0),
                CtlCode: 0, ResetCount: 0, MasterResetCount: 0,
                MasterLevel: null,
                Guild: new GuildMembershipInfo("Reapers", 1),
                Rankings: new CharacterRankings(
                    new BloodCastleRanking(50),
                    null,
                    new ChaosCastleRanking(null),
                    new CastleSiegeRanking(1, 2, 3),
                    null)),
            new CharacterSnapshot(
                Slot: 1, Name: "Alpha", Class: 2, Level: 99, Experience: 99999, LevelUpPoint: 5,
                Stats: new CharacterStats(9, 9, 9, 9, 9),
                Money: 0,
                Location: new CharacterLocation(1, 1, 1),
                Pk: new CharacterPk(1, 1, 1),
                CtlCode: 1, ResetCount: 2, MasterResetCount: 1,
                MasterLevel: 5,
                Guild: null,
                Rankings: new CharacterRankings(null, null, null, null, null))
        ],
        CashShop: new CashShopBalances(10, 20, 30),
        WarehouseMoney: 500);

    [Fact]
    public void Same_model_input_produces_byte_identical_JSON_output()
    {
        var first = AccountSnapshotChangeFactory.ToDetectedChange(Model());
        var second = AccountSnapshotChangeFactory.ToDetectedChange(Model());

        Assert.Equal(first.PayloadJson, second.PayloadJson);
    }

    [Fact]
    public void EntityKey_and_AccountId_are_derived_from_the_real_memb_guid()
    {
        var change = AccountSnapshotChangeFactory.ToDetectedChange(Model());

        Assert.Equal(EntityKey.ForAccountSnapshot(42), change.EntityKey);
        Assert.Equal("42", change.AccountId);
        Assert.Equal("account.snapshot", change.EventType);
        Assert.Null(change.CharacterId);
    }

    [Fact]
    public void Repeated_polls_of_unchanged_data_produce_no_change_event()
    {
        var first = AccountSnapshotChangeFactory.ToDetectedChange(Model());
        var observed = new Dictionary<string, string> { [first.EntityKey] = first.PayloadJson };

        var second = AccountSnapshotChangeFactory.ToDetectedChange(Model());
        var detected = ChangeDetector.Detect([second], observed);

        Assert.Empty(detected);
    }

    [Fact]
    public void A_real_change_in_the_model_is_detected_as_exactly_one_event()
    {
        var first = AccountSnapshotChangeFactory.ToDetectedChange(Model());
        var observed = new Dictionary<string, string> { [first.EntityKey] = first.PayloadJson };

        var changedModel = Model() with { Online = false };
        var second = AccountSnapshotChangeFactory.ToDetectedChange(changedModel);
        var detected = ChangeDetector.Detect([second], observed);

        var change = Assert.Single(detected);
        Assert.Equal(second.PayloadJson, change.PayloadJson);
    }

    [Fact]
    public void Slot_order_in_the_serialized_payload_matches_the_models_list_order_not_a_resort()
    {
        var change = AccountSnapshotChangeFactory.ToDetectedChange(Model());

        var zetaIndex = change.PayloadJson.IndexOf("\"Zeta\"", StringComparison.Ordinal);
        var alphaIndex = change.PayloadJson.IndexOf("\"Alpha\"", StringComparison.Ordinal);

        Assert.True(zetaIndex >= 0 && alphaIndex >= 0 && zetaIndex < alphaIndex);
    }
}
