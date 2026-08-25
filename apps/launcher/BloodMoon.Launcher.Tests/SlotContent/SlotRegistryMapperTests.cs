using System.Text.Json;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.SlotContent;

public sealed class SlotRegistryMapperTests
{
    private static ResolvedSlot Slot(string id, object value, Dictionary<string, string>? tokens = null) => new()
    {
        Id = id,
        Page = "HOME",
        Value = JsonSerializer.SerializeToElement(value),
        Tokens = tokens ?? new Dictionary<string, string>(),
        Status = "PUBLISHED"
    };

    [Fact]
    public void GetText_ReturnsStringValue_AndNullForMissingSlot()
    {
        var mapper = new SlotRegistryMapper([Slot("home.hero.title", "Blood Moon")]);
        Assert.Equal("Blood Moon", mapper.GetText("home.hero.title"));
        Assert.Null(mapper.GetText("home.hero.subtitle"));
    }

    [Fact]
    public void GetText_ReturnsNull_WhenValueIsNotAString()
    {
        var mapper = new SlotRegistryMapper([Slot("home.hero.title", 42)]);
        Assert.Null(mapper.GetText("home.hero.title"));
    }

    [Fact]
    public void GetBool_ReturnsFallback_WhenSlotMissingOrWrongType()
    {
        var mapper = new SlotRegistryMapper([Slot("home.hero.enabled", "not-a-bool")]);
        Assert.False(mapper.GetBool("home.hero.enabled"));
        Assert.True(mapper.GetBool("home.hero.enabled", fallback: true));
        Assert.False(mapper.GetBool("home.campaign.enabled"));
    }

    [Fact]
    public void GetBool_ReturnsRealValue_WhenPresent()
    {
        var mapper = new SlotRegistryMapper([Slot("home.hero.enabled", true)]);
        Assert.True(mapper.GetBool("home.hero.enabled"));
    }

    [Fact]
    public void GetTokens_ReturnsEmptyDictionary_WhenSlotMissing()
    {
        var mapper = SlotRegistryMapper.Empty;
        Assert.Empty(mapper.GetTokens("home.hero.title"));
    }

    [Fact]
    public void GetTokens_ReturnsRealOverrides()
    {
        var tokens = new Dictionary<string, string> { ["textColorToken"] = "CRIMSON" };
        var mapper = new SlotRegistryMapper([Slot("home.hero.title", "x", tokens)]);
        Assert.Equal("CRIMSON", mapper.GetTokens("home.hero.title")["textColorToken"]);
    }

    [Fact]
    public void GetList_MapsEachElement_AndReturnsEmptyForNonArrayValue()
    {
        var socials = new object[]
        {
            new { id = "discord", label = "Discord", url = "https://discord.gg/x", enabled = true },
            new { id = "x", label = "X", url = "https://x.com/y", enabled = false }
        };
        var mapper = new SlotRegistryMapper([Slot("home.socials", socials)]);

        var result = mapper.GetList("home.socials", element => SlotRegistryMapper.StringField(element, "label"));
        Assert.Equal(["Discord", "X"], result);

        var missing = mapper.GetList("home.hero.title", element => SlotRegistryMapper.StringField(element, "label"));
        Assert.Empty(missing);
    }

    [Fact]
    public void GetList_SkipsElementsWhereMapReturnsNull_RatherThanThrowing()
    {
        var items = new object[]
        {
            new { label = "Keep" },
            new { label = "" } // maps to null below (empty label treated as invalid)
        };
        var mapper = new SlotRegistryMapper([Slot("home.socials", items)]);

        var result = mapper.GetList<string>("home.socials", element =>
        {
            var label = SlotRegistryMapper.StringField(element, "label");
            return string.IsNullOrEmpty(label) ? null : label;
        });

        Assert.Equal(["Keep"], result);
    }

    [Fact]
    public void StringField_And_BoolField_HandleMissingOrWrongTypeGracefully()
    {
        var element = JsonSerializer.SerializeToElement(new { label = "x", enabled = "not-a-bool" });
        Assert.Equal("x", SlotRegistryMapper.StringField(element, "label"));
        Assert.Null(SlotRegistryMapper.StringField(element, "missing"));
        Assert.False(SlotRegistryMapper.BoolField(element, "enabled"));
        Assert.True(SlotRegistryMapper.BoolField(element, "missing", fallback: true));
    }

    [Fact]
    public void GetAssetId_And_GetReferenceId_AreTextAliases()
    {
        var mapper = new SlotRegistryMapper([Slot("home.hero.image", "asset-123")]);
        Assert.Equal("asset-123", mapper.GetAssetId("home.hero.image"));
        Assert.Equal("asset-123", mapper.GetReferenceId("home.hero.image"));
    }

    [Fact]
    public void GetDateTime_ParsesIsoString_AndReturnsNullForMalformedValue()
    {
        var valid = new SlotRegistryMapper([Slot("events.startsAt", "2026-09-01T20:00:00Z")]);
        Assert.Equal(new DateTimeOffset(2026, 9, 1, 20, 0, 0, TimeSpan.Zero), valid.GetDateTime("events.startsAt"));

        var invalid = new SlotRegistryMapper([Slot("events.startsAt", "not-a-date")]);
        Assert.Null(invalid.GetDateTime("events.startsAt"));
    }
}
