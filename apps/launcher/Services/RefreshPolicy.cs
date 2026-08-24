namespace BloodMoon.Launcher.Services;

// Part Z -- named TTLs instead of magic numbers scattered through the
// codebase. Nothing here polls by itself; a caller (e.g. MainWindow's
// existing 1-minute DispatcherTimer, or a future page) decides when to
// call IsExpired.
public static class RefreshPolicy
{
    // Matches MainWindow's existing _contentTimer cadence -- bootstrap
    // content (which today also carries server status) refreshes on
    // launch plus this occasional interval.
    public static readonly TimeSpan BootstrapContentTtl = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan ServerStatusTtl = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan RankingsTtl = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan NewsTtl = TimeSpan.FromMinutes(15);

    public static bool IsExpired(DateTimeOffset fetchedAt, TimeSpan ttl) =>
        DateTimeOffset.UtcNow - fetchedAt > ttl;
}
