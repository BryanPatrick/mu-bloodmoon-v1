using BloodMoon.Launcher.Services.Navigation;
using Xunit;

namespace BloodMoon.Launcher.Tests.Navigation;

public sealed class NavigationServiceTests
{
    private sealed class RecordingPage(bool allowLeave = true) : INavigablePage
    {
        public bool AllowLeave { get; set; } = allowLeave;
        public List<PageKey> LeaveRequestsTo { get; } = [];
        public List<PageKey> EnteredFrom { get; } = [];

        public bool OnPageLeaving(PageKey to)
        {
            LeaveRequestsTo.Add(to);
            return AllowLeave;
        }

        public void OnPageEntering(PageKey from) => EnteredFrom.Add(from);
    }

    [Fact]
    public void CurrentPage_DefaultsToHome()
    {
        var nav = new NavigationService();
        Assert.Equal(PageKey.Home, nav.CurrentPage);
    }

    [Fact]
    public void TryNavigate_MovesToTheRequestedPage_AndFiresHooksInOrder()
    {
        var nav = new NavigationService();
        var home = new RecordingPage();
        var account = new RecordingPage();
        nav.RegisterPage(PageKey.Home, home);
        nav.RegisterPage(PageKey.Account, account);

        var moved = nav.TryNavigate(PageKey.Account);

        Assert.True(moved);
        Assert.Equal(PageKey.Account, nav.CurrentPage);
        Assert.Equal([PageKey.Account], home.LeaveRequestsTo);
        Assert.Equal([PageKey.Home], account.EnteredFrom);
    }

    [Fact]
    public void TryNavigate_WhenCurrentPageVetoes_StaysOnTheCurrentPage()
    {
        var nav = new NavigationService();
        var home = new RecordingPage(allowLeave: false);
        var account = new RecordingPage();
        nav.RegisterPage(PageKey.Home, home);
        nav.RegisterPage(PageKey.Account, account);

        var moved = nav.TryNavigate(PageKey.Account);

        Assert.False(moved);
        Assert.Equal(PageKey.Home, nav.CurrentPage);
        Assert.Empty(account.EnteredFrom);
    }

    [Fact]
    public void TryNavigate_ToTheCurrentPage_IsANoOpThatStillSucceeds()
    {
        var nav = new NavigationService();
        Assert.True(nav.TryNavigate(PageKey.Home));
        Assert.Equal(PageKey.Home, nav.CurrentPage);
    }

    [Fact]
    public void Navigated_EventFires_WithCorrectFromAndTo()
    {
        var nav = new NavigationService();
        NavigationChangedEventArgs? captured = null;
        nav.Navigated += (_, e) => captured = e;

        nav.TryNavigate(PageKey.News);

        Assert.NotNull(captured);
        Assert.Equal(PageKey.Home, captured!.From);
        Assert.Equal(PageKey.News, captured.To);
    }
}
