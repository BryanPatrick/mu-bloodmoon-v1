using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.Navigation;

namespace BloodMoon.Launcher.Views;

// Launcher Phase L3 -- the contract every page UserControl implements.
// OnPageEntering (from NavigationService.INavigablePage) stays synchronous
// per Part U/V's own design; a page kicks off its own fire-and-forget
// RefreshAsync from there, matching the async-void event-handler
// convention already used throughout the pre-existing MainWindow.xaml.cs
// (e.g. Window_Loaded) rather than introducing a new async-navigation
// pattern this app doesn't otherwise have.
public interface ILauncherPage : INavigablePage
{
    void Initialize(LauncherAppContext context);

    Task RefreshAsync();
}
