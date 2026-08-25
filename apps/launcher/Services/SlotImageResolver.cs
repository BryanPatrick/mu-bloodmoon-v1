using System.Windows.Media.Imaging;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Part E/F -- the full asset-resolution + fallback chain for a slot's
// IMAGE/asset-REFERENCE value: assetId -> manifest entry -> download/cache
// (hash-verified) -> BitmapImage, or the neutral placeholder on any
// failure. A page never touches AssetCacheService/PlaceholderResolver
// directly for a slot image -- it calls this one method.
public static class SlotImageResolver
{
    public static async Task<BitmapImage?> ResolveAsync(LauncherAppContext context, string? assetId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(assetId))
        {
            return null;
        }
        var entry = context.SlotAssets.Find(a => a.Id == assetId);
        if (entry is null)
        {
            return null;
        }
        try
        {
            var absoluteEntry = new LauncherAssetManifestEntry
            {
                Id = entry.Id,
                Url = entry.Url.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? entry.Url : $"{context.ApiOrigin}{entry.Url}",
                ContentType = entry.ContentType,
                Hash = entry.Hash,
                Size = entry.Size,
                Kind = entry.Kind
            };
            var localPath = await context.CmsAssetCache.GetOrDownloadAsync(absoluteEntry, cancellationToken);
            var bitmap = new BitmapImage();
            bitmap.BeginInit();
            bitmap.CacheOption = BitmapCacheOption.OnLoad;
            bitmap.UriSource = new Uri(localPath, UriKind.Absolute);
            bitmap.EndInit();
            bitmap.Freeze();
            return bitmap;
        }
        catch
        {
            // Part F's fallback chain -- a download/hash failure here means
            // "use the neutral placeholder," never a broken-image icon and
            // never a crash.
            return null;
        }
    }
}
