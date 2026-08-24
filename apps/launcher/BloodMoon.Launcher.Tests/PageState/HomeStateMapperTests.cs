using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class HomeStateMapperTests
{
    private static LauncherBootstrap Bootstrap() => new()
    {
        Campaign = new LauncherCampaign { Enabled = true, Title = "OPEN BETA" },
        Server = new LauncherServer { Status = "ONLINE", OnlinePlayers = 42 },
        Featured = new LauncherNews { Id = "n1", Title = "Big news" }
    };

    private static LauncherAccount Account() => new()
    {
        ActiveCharacter = new AccountCharacter { Id = "Hero", Name = "Hero", ClassName = "Blade Knight", Level = 400 }
    };

    [Fact]
    public void Map_WhenLoggedIn_IncludesCharacterSummary()
    {
        var state = HomeStateMapper.Map(Bootstrap(), Account(), isLoggedIn: true);

        Assert.NotNull(state.CharacterSummary);
        Assert.Equal("Hero", state.CharacterSummary!.Name);
        Assert.Equal(PlayState.ReadyToPlay, state.PlayState);
    }

    // Part Y: "On auth expiry: clear only sensitive account state, keep
    // public cached content available." Also covers "public content
    // retained after logout" from Part AG's test list -- from this
    // mapper's point of view both are the same shape: isLoggedIn=false.
    [Fact]
    public void Map_AfterLogout_ClearsAccountStateButRetainsPublicBootstrapContent()
    {
        var bootstrap = Bootstrap();
        var state = HomeStateMapper.Map(bootstrap, account: null, isLoggedIn: false);

        Assert.Null(state.CharacterSummary);
        Assert.Equal(PlayState.NotLoggedIn, state.PlayState);
        // Public content -- never account-specific -- is untouched.
        Assert.Equal("OPEN BETA", state.Campaign.Title);
        Assert.Equal(42, state.ServerState.OnlinePlayers);
        Assert.Equal("Big news", state.LatestNews!.Title);
    }

    [Fact]
    public void Map_AfterAuthExpiry_BehavesIdenticallyToLogout()
    {
        var bootstrap = Bootstrap();
        // Auth expiry is modeled the same way as logout from this mapper's
        // perspective: the caller no longer has a valid session, so it
        // passes isLoggedIn=false and no account payload -- reusing the
        // existing SessionStore/auth flow's own "session is gone" signal
        // rather than inventing a second one (Part Y: don't redesign auth).
        var state = HomeStateMapper.Map(bootstrap, account: null, isLoggedIn: false);

        Assert.Null(state.CharacterSummary);
        Assert.Equal("OPEN BETA", state.Campaign.Title);
    }

    [Fact]
    public void Map_WhenServerIsUnderMaintenance_ReportsServerOfflinePlayState()
    {
        var bootstrap = Bootstrap();
        bootstrap.Server.Maintenance = new LauncherMaintenance { Active = true, Message = "Manutenção" };

        var state = HomeStateMapper.Map(bootstrap, Account(), isLoggedIn: true);

        Assert.Equal(PlayState.ServerOffline, state.PlayState);
        Assert.True(state.ServerState.MaintenanceActive);
        Assert.Equal("Manutenção", state.ServerState.MaintenanceMessage);
    }

    [Fact]
    public void Map_WhenStatusSourceIsUnknown_PropagatesItHonestlyRatherThanFabricatingLive()
    {
        var bootstrap = Bootstrap();
        bootstrap.Server.StatusSource = "UNKNOWN";

        var state = HomeStateMapper.Map(bootstrap, null, isLoggedIn: false);

        Assert.Equal("UNKNOWN", state.ServerState.StatusSource);
        Assert.NotEqual("LIVE", state.ServerState.StatusSource);
    }
}
