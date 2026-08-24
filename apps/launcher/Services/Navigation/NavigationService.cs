namespace BloodMoon.Launcher.Services.Navigation;

// Part U -- the seven approved pages. The visual shell/left menu stays
// fixed (Part AJ); this only tracks which one is logically active.
public enum PageKey
{
    Home,
    Account,
    News,
    Events,
    Ranking,
    Store,
    Settings
}

// Part U/V's transition hooks. Deliberately synchronous and cheap -- no
// animation orchestration lives here (Part V: "não implementar animação
// pesada agora"), just a clean point for a future page host to hook into.
public interface INavigablePage
{
    // Return false to veto leaving this page (e.g. an in-progress operation
    // the page wants to protect).
    bool OnPageLeaving(PageKey to);

    void OnPageEntering(PageKey from);
}

public sealed class NavigationChangedEventArgs(PageKey from, PageKey to) : EventArgs
{
    public PageKey From { get; } = from;
    public PageKey To { get; } = to;
}

// Part U/V's navigation foundation: selected-page state plus enter/leave
// hooks, deliberately not wired to any WPF Frame/Page/animation yet --
// apps/launcher has no page views today (see the Part A audit), so there
// is nothing real to route to. A future phase's actual page host registers
// itself via RegisterPage; until then this class is a tested, standalone
// contract ready for that to slot into (Part AJ: no final visual
// implementation this phase).
public sealed class NavigationService
{
    private readonly Dictionary<PageKey, INavigablePage> _pages = new();

    public PageKey CurrentPage { get; private set; } = PageKey.Home;

    public event EventHandler<NavigationChangedEventArgs>? Navigated;

    public void RegisterPage(PageKey key, INavigablePage page) => _pages[key] = page;

    public void UnregisterPage(PageKey key) => _pages.Remove(key);

    // Returns false if the current page vetoed leaving -- CurrentPage is
    // unchanged in that case.
    public bool TryNavigate(PageKey to)
    {
        if (to == CurrentPage)
        {
            return true;
        }
        if (_pages.TryGetValue(CurrentPage, out var current) && !current.OnPageLeaving(to))
        {
            return false;
        }

        var from = CurrentPage;
        CurrentPage = to;
        if (_pages.TryGetValue(to, out var next))
        {
            next.OnPageEntering(from);
        }
        Navigated?.Invoke(this, new NavigationChangedEventArgs(from, to));
        return true;
    }
}
