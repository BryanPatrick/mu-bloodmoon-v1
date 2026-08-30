using System.Windows.Media.Imaging;

namespace BloodMoon.Launcher.Services;

public sealed record DefaultVisualAssetDefinition(
    string Slot,
    string ResourcePath,
    string Use,
    string AspectRatio,
    int MinimumWidth,
    int MinimumHeight,
    bool CmsOverride,
    bool CacheAllowed);

// The single authoritative map for editorial raster defaults. Shell chrome,
// controls, borders, typography and icons remain structural XAML assets and
// are deliberately outside the CMS/fallback pipeline.
public static class DefaultVisualAssetCatalog
{
    public static IReadOnlyList<DefaultVisualAssetDefinition> Definitions { get; } =
    [
        new("home.hero.image", "Assets/Defaults/home-hero.png", "Hero principal aprovado", "16:9", 1280, 720, true, true),
        new("home.campaign.image", "Assets/Defaults/editorial-environment.png", "Banner de campanha/Open Beta", "21:9", 1280, 548, true, true),
        new("account.background", "Assets/Defaults/editorial-environment.png", "Ambiente neutro da conta", "16:9", 1280, 720, false, false),
        new("account.emptyState", "Assets/Defaults/editorial-card.png", "Estado vazio de personagens", "4:3", 800, 600, false, false),
        new("news.defaultThumbnail", "Assets/Defaults/editorial-card.png", "Miniatura editorial neutra", "4:3", 800, 600, false, false),
        new("news.defaultHero", "Assets/Defaults/editorial-environment.png", "Capa editorial neutra", "16:9", 1280, 720, false, false),
        new("events.activeBanner", "Assets/Defaults/editorial-environment.png", "Banner neutro de eventos", "21:9", 1280, 548, true, true),
        new("events.emptyState", "Assets/Defaults/editorial-card.png", "Estado sem eventos", "4:3", 800, 600, false, false),
        new("ranking.background", "Assets/Defaults/editorial-environment.png", "Ambiente neutro do ranking", "16:9", 1280, 720, false, false),
        new("ranking.emptyState", "Assets/Defaults/editorial-card.png", "Estado sem ranking", "4:3", 800, 600, false, false),
        new("store.featuredBannerImage", "Assets/Defaults/editorial-environment.png", "Banner neutro da loja", "21:9", 1280, 548, true, true),
        new("store.defaultProduct", "Assets/Defaults/editorial-card.png", "Produto ausente sem item fictício", "4:3", 800, 600, false, false),
        new("settings.background", "Assets/Defaults/editorial-environment.png", "Decoração técnica discreta", "16:9", 1280, 720, false, false),
        new("openBeta.cardArt", "Assets/Defaults/editorial-environment.png", "Card local do Open Beta", "21:9", 1280, 548, false, false)
    ];

    public static DefaultVisualAssetDefinition? Find(string slot) =>
        Definitions.FirstOrDefault(item => string.Equals(item.Slot, slot, StringComparison.Ordinal));

    public static BitmapImage? Load(string slot, int decodeWidth = 0)
    {
        var definition = Find(slot);
        if (definition is null) return null;

        var bitmap = new BitmapImage();
        bitmap.BeginInit();
        bitmap.CacheOption = BitmapCacheOption.OnLoad;
        if (decodeWidth > 0) bitmap.DecodePixelWidth = decodeWidth;
        bitmap.UriSource = new Uri($"pack://application:,,,/{definition.ResourcePath}", UriKind.Absolute);
        bitmap.EndInit();
        bitmap.Freeze();
        return bitmap;
    }
}
