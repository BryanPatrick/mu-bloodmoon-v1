using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

// Narrow seam so AssetCacheService can be unit tested without a real HTTP
// call, matching ILauncherBootstrapSource's pattern.
public interface IAssetDownloader
{
    Task<byte[]> DownloadAsync(string url, CancellationToken cancellationToken);
}

// A dedicated HttpClient, consistent with the app's existing convention of
// one HttpClient per concern (LauncherApiClient, PatchService,
// LauncherUpdateService each already have their own).
public sealed class HttpAssetDownloader : IAssetDownloader, IDisposable
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromMinutes(2) };

    public async Task<byte[]> DownloadAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            // Part K/L: remote content is DATA, fetched only over HTTPS --
            // matches BrowserService's own http(s)-only rule elsewhere in
            // this app.
            throw new InvalidOperationException("Somente URLs HTTPS são permitidas para assets remotos.");
        }
        return await _http.GetByteArrayAsync(uri, cancellationToken);
    }

    public void Dispose() => _http.Dispose();
}

public enum AssetValidationFailure
{
    HttpFailure,
    HashMismatch,
    EmptyPayload
}

public sealed class AssetCacheException(AssetValidationFailure failure, string message) : Exception(message)
{
    public AssetValidationFailure Failure { get; } = failure;
}

// Parts I/J/K -- hash-identified local asset cache. The manifest's Hash is
// the backend's ReferenceAsset.sha1 (see LauncherService.buildAssetManifest
// on the API side), so this must hash with SHA-1 too, not an arbitrary
// stronger algorithm, or a byte-identical file would never be recognized
// as already cached.
public sealed class AssetCacheService
{
    private readonly IAssetDownloader _downloader;
    private readonly string _cacheDirectory;

    public AssetCacheService(IAssetDownloader downloader, string? cacheDirectory = null)
    {
        _downloader = downloader;
        _cacheDirectory = cacheDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BloodMoon", "Launcher", "cache", "assets");
    }

    private string PathFor(LauncherAssetManifestEntry entry) =>
        Path.Combine(_cacheDirectory, SanitizeFileName(entry.Id) + ExtensionFor(entry.ContentType));

    // Returns the local file path, downloading only when there is no
    // byte-identical copy on disk already (Part J). Throws
    // AssetCacheException on any HTTP failure, empty payload, or hash
    // mismatch (Part K) -- callers decide how to surface that via
    // RemoteContentFailureKind.AssetDownloadFailed/AssetHashMismatch;
    // a failed/mismatched download is never promoted into the cache.
    public async Task<string> GetOrDownloadAsync(LauncherAssetManifestEntry entry, CancellationToken cancellationToken)
    {
        var path = PathFor(entry);
        if (File.Exists(path))
        {
            var existingBytes = await File.ReadAllBytesAsync(path, cancellationToken);
            if (string.Equals(ComputeHash(existingBytes), entry.Hash, StringComparison.OrdinalIgnoreCase))
            {
                return path;
            }
        }

        byte[] downloaded;
        try
        {
            downloaded = await _downloader.DownloadAsync(entry.Url, cancellationToken);
        }
        catch (Exception ex) when (ex is not AssetCacheException)
        {
            throw new AssetCacheException(
                AssetValidationFailure.HttpFailure, $"Falha ao baixar asset {entry.Id}: {ex.Message}");
        }

        if (downloaded.Length == 0)
        {
            throw new AssetCacheException(AssetValidationFailure.EmptyPayload, $"Asset {entry.Id} veio vazio.");
        }

        var actualHash = ComputeHash(downloaded);
        if (!string.Equals(actualHash, entry.Hash, StringComparison.OrdinalIgnoreCase))
        {
            throw new AssetCacheException(
                AssetValidationFailure.HashMismatch, $"Asset {entry.Id} não bateu com o hash esperado.");
        }

        Directory.CreateDirectory(_cacheDirectory);
        var tempPath = Path.Combine(_cacheDirectory, $"{Guid.NewGuid():N}.tmp");
        try
        {
            await File.WriteAllBytesAsync(tempPath, downloaded, cancellationToken);
            File.Move(tempPath, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }

        return path;
    }

    private static string ComputeHash(byte[] bytes) =>
        Convert.ToHexString(SHA1.HashData(bytes)).ToLowerInvariant();

    private static string SanitizeFileName(string id)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(id.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
    }

    private static string ExtensionFor(string contentType) => contentType switch
    {
        "image/png" => ".png",
        "image/jpeg" => ".jpg",
        "image/webp" => ".webp",
        "image/svg+xml" => ".svg",
        "image/gif" => ".gif",
        _ => ".bin"
    };
}
