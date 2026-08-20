using BloodMoon.GameBridgeAgent.GameDatabase;
using Xunit;

namespace BloodMoon.GameBridgeAgent.Tests;

public class AccountCharacterSlotsBuilderTests
{
    private static List<string?> Slots(params string?[] values)
    {
        var list = new List<string?>(values);
        while (list.Count < 10) list.Add(null);
        return list;
    }

    [Fact]
    public void Empty_and_null_slots_are_skipped()
    {
        var result = AccountCharacterSlotsBuilder.Build("acc1", Slots("Hero", null, "", "Mage"), null);

        Assert.Equal(2, result.Slots.Count);
        Assert.Equal(1, result.Slots[0].SlotNumber);
        Assert.Equal("Hero", result.Slots[0].CharacterName);
        Assert.Equal(4, result.Slots[1].SlotNumber);
        Assert.Equal("Mage", result.Slots[1].CharacterName);
    }

    [Fact]
    public void Slot_numbers_are_1_based_matching_GameID1_through_GameID10()
    {
        var values = new string?[10];
        values[9] = "TenthSlot"; // GameID10
        var result = AccountCharacterSlotsBuilder.Build("acc1", values, null);

        var slot = Assert.Single(result.Slots);
        Assert.Equal(10, slot.SlotNumber);
    }

    [Fact]
    public void GameIDC_is_returned_separately_and_is_never_an_11th_slot()
    {
        var result = AccountCharacterSlotsBuilder.Build("acc1", Slots("Hero"), "Hero");

        Assert.Single(result.Slots); // GameIDC duplicating a real slot value never adds a slot
        Assert.Equal("Hero", result.ActiveCharacterName);
    }

    [Fact]
    public void Empty_string_GameIDC_is_treated_as_no_active_character()
    {
        var result = AccountCharacterSlotsBuilder.Build("acc1", Slots(), "");

        Assert.Null(result.ActiveCharacterName);
    }

    [Fact]
    public void Zero_slots_produces_an_empty_list_not_an_error()
    {
        var result = AccountCharacterSlotsBuilder.Build("acc1", Slots(), null);

        Assert.Empty(result.Slots);
    }
}
