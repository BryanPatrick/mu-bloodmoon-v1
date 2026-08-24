using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class SocialLinkPolicyTests
{
    private static LauncherSocialLink Link(string id) => new() { Id = id, Label = id, Url = "https://example.com" };

    [Fact]
    public void Cap_WithFewerThanTheLimit_ReturnsAllOfThem()
    {
        List<LauncherSocialLink> links = [Link("a"), Link("b")];
        Assert.Equal(2, SocialLinkPolicy.Cap(links).Count);
    }

    // Part G: "não permitir quantidade arbitrária que quebre layout."
    [Fact]
    public void Cap_WithMoreThanTheLimit_TruncatesToMaxSocialItems()
    {
        var links = Enumerable.Range(0, 9).Select(i => Link($"s{i}")).ToList();

        var capped = SocialLinkPolicy.Cap(links);

        Assert.Equal(SocialLinkPolicy.MaxSocialItems, capped.Count);
        Assert.Equal("s0", capped[0].Id);
    }

    [Fact]
    public void MaxSocialItems_MatchesTheBackendsCap()
    {
        // apps/api/src/modules/launcher/launcher.service.ts's MAX_SOCIAL_ITEMS.
        // Kept in sync deliberately -- this is defense in depth on top of a
        // server that already enforces the limit, not the primary control.
        Assert.Equal(5, SocialLinkPolicy.MaxSocialItems);
    }
}
