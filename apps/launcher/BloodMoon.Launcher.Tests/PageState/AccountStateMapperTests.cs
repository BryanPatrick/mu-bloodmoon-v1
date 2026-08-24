using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class AccountStateMapperTests
{
    private static AccountCharacter Character(string name, string className) => new()
    {
        Id = name,
        Name = name,
        ClassName = className,
        Level = 400,
        Reset = 3,
        MasterReset = 1,
        Map = "Lorencia",
        Guild = "BloodGuild",
        Status = "ONLINE"
    };

    [Fact]
    public void Map_WithZeroCharacters_ReturnsEmptyListAndNoSelectedCharacter()
    {
        var account = new LauncherAccount { Characters = [], ActiveCharacter = null };

        var state = AccountStateMapper.Map(account);

        Assert.Empty(state.Characters);
        Assert.Null(state.SelectedCharacter);
    }

    [Fact]
    public void Map_WithMultipleCharacters_ListsAllOfThem()
    {
        var account = new LauncherAccount
        {
            Characters = [Character("Hero1", "Blade Knight"), Character("Hero2", "Soul Master"), Character("Hero3", "Elf")],
            ActiveCharacter = Character("Hero1", "Blade Knight")
        };

        var state = AccountStateMapper.Map(account);

        Assert.Equal(3, state.Characters.Count);
        Assert.Equal("Hero1", state.SelectedCharacter!.Name);
    }

    [Fact]
    public void Map_ForDarkLord_PopulatesCommand()
    {
        var account = new LauncherAccount { ActiveCharacter = Character("DarkOne", "Dark Lord") };

        var state = AccountStateMapper.Map(account);

        Assert.NotNull(state.SelectedCharacter!.Command);
    }

    [Fact]
    public void Map_ForNonDarkLordClass_LeavesCommandNull()
    {
        var account = new LauncherAccount { ActiveCharacter = Character("Warrior", "Blade Knight") };

        var state = AccountStateMapper.Map(account);

        Assert.Null(state.SelectedCharacter!.Command);
    }

    [Theory]
    [InlineData("Dark Lord")]
    [InlineData("dark lord")]
    [InlineData("DARK LORD")]
    public void CharacterClassRules_SupportsCommand_IsCaseInsensitive(string className)
    {
        Assert.True(CharacterClassRules.SupportsCommand(className));
    }

    [Fact]
    public void CharacterClassRules_SupportsCommand_IsFalseForNullOrEmpty()
    {
        Assert.False(CharacterClassRules.SupportsCommand(null));
        Assert.False(CharacterClassRules.SupportsCommand(""));
    }

    [Fact]
    public void Map_CharacterSummary_MissingClassIcon_IsResolvedAsNeedingAPlaceholder()
    {
        var character = new CharacterSummaryState { ClassIconAssetId = null };
        Assert.True(PlaceholderResolver.NeedsPlaceholder(character.ClassIconAssetId));
    }

    [Fact]
    public void Map_GuildSummary_MissingEmblem_IsResolvedAsNeedingAPlaceholder()
    {
        var guild = new GuildSummaryState { EmblemAssetId = null };
        Assert.True(PlaceholderResolver.NeedsPlaceholder(guild.EmblemAssetId));
    }
}
