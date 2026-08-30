using System.IO;
using System.Windows.Media.Imaging;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Part E/F -- the full asset-resolution + fallback chain for a slot's
// IMAGE/asset-REFERENCE value: assetId -> manifest entry -> download/cache
// (hash-verified) -> BitmapImage, or the neutral placeholder on any
// failure. A page never touches AssetCacheService/PlaceholderResolver
// directly for a slot image -- it calls this one method.
public enum ResolvedEditorialAssetOrigin { Remote, LastKnownGood, LocalDefault, None }
public sealed record ResolvedEditorialAsset(BitmapImage? Image, ResolvedEditorialAssetOrigin Origin);

public static class EditorialAssetFallbackPolicy
{
    public static ResolvedEditorialAssetOrigin Choose(bool remoteValid, bool lastKnownGoodValid, bool localDefaultAvailable, bool explicitNone = false)
    {
        if (explicitNone) return ResolvedEditorialAssetOrigin.None;
        if (remoteValid) return ResolvedEditorialAssetOrigin.Remote;
        if (lastKnownGoodValid) return ResolvedEditorialAssetOrigin.LastKnownGood;
        return localDefaultAvailable ? ResolvedEditorialAssetOrigin.LocalDefault : ResolvedEditorialAssetOrigin.None;
    }
}

public static class SlotImageResolver
{
    public static async Task<BitmapImage?> ResolveAsync(LauncherAppContext context, string slot, string? assetId, CancellationToken cancellationToken) =>
        (await ResolveWithOriginAsync(context, slot, assetId, cancellationToken)).Image;

    public static async Task<ResolvedEditorialAsset> ResolveWithOriginAsync(LauncherAppContext context, string slot, string? assetId, CancellationToken cancellationToken)
    {
        var lkgPath = LastKnownGoodPath(slot);
        var entry = string.IsNullOrWhiteSpace(assetId) ? null : context.SlotAssets.Find(a => a.Id == assetId);
        try
        {
            if (entry is null) throw new InvalidOperationException("CMS asset ausente.");
            var url = RemoteAssetUrlPolicy.ResolveHttps(context.ApiOrigin, entry.Url);
            var absoluteEntry = new LauncherAssetManifestEntry
            {
                Id = entry.Id,
                Url = url,
                ContentType = entry.ContentType,
                Hash = entry.Hash,
                Size = entry.Size,
                Kind = entry.Kind
            };
            var localPath = await context.CmsAssetCache.GetOrDownloadAsync(absoluteEntry, cancellationToken);
            var bitmap = LoadFile(localPath);
            await PromoteLastKnownGoodAsync(localPath, lkgPath, cancellationToken);
            return new(bitmap, EditorialAssetFallbackPolicy.Choose(true, false, false));
        }
        catch
        {
            try
            {
                if (File.Exists(lkgPath)) return new(LoadFile(lkgPath), EditorialAssetFallbackPolicy.Choose(false, true, false));
            }
            catch { /* corrupt LKG falls through to the packaged asset */ }

            var fallback = DefaultVisualAssetCatalog.Load(slot);
            return new(fallback, EditorialAssetFallbackPolicy.Choose(false, false, fallback is not null));
        }
    }

    public static BitmapImage? ResolveDefault(string slot, int decodeWidth = 0) => DefaultVisualAssetCatalog.Load(slot, decodeWidth);

    private static BitmapImage LoadFile(string path)
    {
        var bitmap = new BitmapImage();
        bitmap.BeginInit();
        bitmap.CacheOption = BitmapCacheOption.OnLoad;
        bitmap.UriSource = new Uri(path, UriKind.Absolute);
        bitmap.EndInit();
        bitmap.Freeze();
        return bitmap;
    }

    private static string LastKnownGoodPath(string slot) => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "BloodMoon", "Launcher", "cache", "last-known-good", Sanitize(slot) + ".image");

    private static async Task PromoteLastKnownGoodAsync(string source, string destination, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        var bytes = await File.ReadAllBytesAsync(source, cancellationToken);
        var temporary = destination + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllBytesAsync(temporary, bytes, cancellationToken);
            File.Move(temporary, destination, overwrite: true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    private static string Sanitize(string value) => string.Concat(value.Select(character =>
        Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
}

public static class RemoteAssetUrlPolicy
{
    public static string ResolveHttps(string apiOrigin, string raw)
    {
        if (Uri.TryCreate(raw, UriKind.Absolute, out var absolute))
        {
            if (absolute.Scheme != Uri.UriSchemeHttps) throw new InvalidOperationException("Asset CMS requer HTTPS.");
            return absolute.AbsoluteUri;
        }
        if (!raw.StartsWith('/')) throw new InvalidOperationException("URL relativa de asset inválida.");
        var combined = new Uri(new Uri(apiOrigin.TrimEnd('/') + "/"), raw);
        if (combined.Scheme != Uri.UriSchemeHttps) throw new InvalidOperationException("Asset CMS requer HTTPS.");
        return combined.AbsoluteUri;
    }
}
