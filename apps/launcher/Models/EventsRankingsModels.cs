namespace BloodMoon.Launcher.Models;

// Launcher Phase L3 -- typed shapes for GET /launcher/events and GET
// /launcher/rankings (apps/api/src/modules/launcher/launcher.service.ts).
// Rankings are honestly sourced from Portal-side AccountCharacter data
// today (see that service method's own comment) -- not the real Game Data
// Platform, which has no public leaderboard read path yet. This is real,
// currently-available data, not a fabricated stand-in.

public sealed class LauncherEventCard
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public DateTimeOffset? StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public string? RecommendedLevel { get; set; }
    public string? EntryInfo { get; set; }
    public string? BannerUrl { get; set; }
    public string? GuideUrl { get; set; }
}

public sealed class LauncherMonthlyEventEntry
{
    public DateTimeOffset Date { get; set; }
    public string Name { get; set; } = "";
    public string ShortDescription { get; set; } = "";
    public DateTimeOffset StartsAt { get; set; }
    public string? GuideUrl { get; set; }
}

public sealed class LauncherEventsResponse
{
    public LauncherEventCard? ActiveEvent { get; set; }
    public List<LauncherEventCard> Upcoming { get; set; } = [];
    public List<LauncherMonthlyEventEntry> Calendar { get; set; } = [];
}

public sealed class LauncherRankingEntry
{
    public int Rank { get; set; }
    public string CharacterName { get; set; } = "";
    public string CurrentClass { get; set; } = "";
    public int Level { get; set; }
    public long Value { get; set; }
}

public sealed class LauncherRankingsResponse
{
    public string RankingType { get; set; } = "masterReset";
    public List<string> AvailableRankingTypes { get; set; } = [];
    public List<LauncherRankingEntry> Entries { get; set; } = [];
}
