namespace BloodMoon.Launcher.Services;

public enum PlaceholderKind
{
    ClassIcon,
    GuildEmblem,
    NewsImage,
    EventImage,
    CampaignImage
}

// Part W -- neutral, hand-authored vector placeholders
// (Assets/Placeholders.xaml), never a generated/AI image. This resolver is
// pure data (a WPF resource key); a future view looks it up via
// DynamicResource/FindResource. Placeholder resolution is local-only and
// never treated as remote content that needs fetching/caching (Part W:
// "Não tratar placeholder como remote content obrigatório").
public static class PlaceholderResolver
{
    public static string ResourceKeyFor(PlaceholderKind kind) => kind switch
    {
        PlaceholderKind.ClassIcon => "Placeholder.ClassIcon",
        PlaceholderKind.GuildEmblem => "Placeholder.GuildEmblem",
        PlaceholderKind.NewsImage => "Placeholder.NewsImage",
        PlaceholderKind.EventImage => "Placeholder.EventImage",
        PlaceholderKind.CampaignImage => "Placeholder.CampaignImage",
        _ => "Placeholder.NewsImage"
    };

    public static bool NeedsPlaceholder(string? assetUrlOrId) => string.IsNullOrWhiteSpace(assetUrlOrId);
}
