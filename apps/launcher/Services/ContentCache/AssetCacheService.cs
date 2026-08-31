using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Windows.Media.Imaging;
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
    private const int MaximumAssetBytes = 8 * 1024 * 1024;

    public async Task<byte[]> DownloadAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            // Part K/L: remote content is DATA, fetched only over HTTPS --
            // matches BrowserService's own http(s)-only rule elsewhere in
            // this app.
            throw new InvalidOperationException("Somente URLs HTTPS são permitidas para assets remotos.");
        }
        using var response = await _http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is > MaximumAssetBytes)
        {
            throw new InvalidOperationException("Asset remoto excede o limite permitido.");
        }
        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var destination = new MemoryStream();
        var buffer = new byte[81920];
        int read;
        while ((read = await source.ReadAsync(buffer, cancellationToken)) > 0)
        {
            if (destination.Length + read > MaximumAssetBytes)
            {
                throw new InvalidOperationException("Asset remoto excede o limite permitido.");
            }
            await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }
        return destination.ToArray();
    }

    public void Dispose() => _http.Dispose();
}

public enum AssetValidationFailure
{
    HttpFailure,
    HashMismatch,
    EmptyPayload,
    UnsupportedContentType,
    PayloadTooLarge,
    SizeMismatch,
    CorruptImage,
    InvalidDimensions
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
// Bootstrap's asset manifest hashes with ReferenceAsset.sha1 (Sha1, the
// original/default here, unchanged for every existing caller/test). The
// CMS Launcher Studio asset library (Launcher Phase L3) hashes with
// LauncherAsset.sha256 instead -- a constructor-selectable algorithm
// avoids a second near-duplicate cache class for that one difference.
public enum AssetHashAlgorithm
{
    Sha1,
    Sha256
}

public sealed class AssetCacheService
{
    private readonly IAssetDownloader _downloader;
    private readonly string _cacheDirectory;
    private readonly AssetHashAlgorithm _hashAlgorithm;
    private readonly bool _validateRasterImage;
    private const int MaximumAssetBytes = 8 * 1024 * 1024;

    public AssetCacheService(
        IAssetDownloader downloader,
        string? cacheDirectory = null,
        AssetHashAlgorithm hashAlgorithm = AssetHashAlgorithm.Sha1,
        bool validateRasterImage = false)
    {
        _downloader = downloader;
        _hashAlgorithm = hashAlgorithm;
        _validateRasterImage = validateRasterImage;
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
                try
                {
                    Validate(entry, existingBytes);
                    return path;
                }
                catch (AssetCacheException)
                {
                    // A corrupt cache is never trusted. Keep going and try
                    // a clean download; callers retain their LKG separately.
                }
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

        Validate(entry, downloaded);

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

    private void Validate(LauncherAssetManifestEntry entry, byte[] bytes)
    {
        if (!_validateRasterImage) return;
        if (entry.ContentType is not ("image/png" or "image/jpeg"))
        {
            throw new AssetCacheException(AssetValidationFailure.UnsupportedContentType,
                $"Asset {entry.Id} usa formato não suportado pelo WPF ({entry.ContentType}).");
        }
        if (bytes.Length > MaximumAssetBytes)
        {
            throw new AssetCacheException(AssetValidationFailure.PayloadTooLarge, $"Asset {entry.Id} excede 8 MiB.");
        }
        if (entry.Size > 0 && entry.Size != bytes.LongLength)
        {
            throw new AssetCacheException(AssetValidationFailure.SizeMismatch, $"Asset {entry.Id} não bateu com o tamanho esperado.");
        }
        try
        {
            using var stream = new MemoryStream(bytes, writable: false);
            var decoder = BitmapDecoder.Create(stream, BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.OnLoad);
            var frame = decoder.Frames.FirstOrDefault();
            if (frame is null || frame.PixelWidth < 1 || frame.PixelHeight < 1 || frame.PixelWidth > 8192 || frame.PixelHeight > 8192)
            {
                throw new AssetCacheException(AssetValidationFailure.InvalidDimensions, $"Asset {entry.Id} tem dimensões inválidas.");
            }
            if ((entry.Width is > 0 && entry.Width != frame.PixelWidth) ||
                (entry.Height is > 0 && entry.Height != frame.PixelHeight))
            {
                throw new AssetCacheException(AssetValidationFailure.InvalidDimensions, $"Asset {entry.Id} não bateu com as dimensões declaradas.");
            }
        }
        catch (AssetCacheException) { throw; }
        catch (Exception ex)
        {
            throw new AssetCacheException(AssetValidationFailure.CorruptImage, $"Asset {entry.Id} não pôde ser decodificado: {ex.Message}");
        }
    }

    private string ComputeHash(byte[] bytes) => _hashAlgorithm switch
    {
        AssetHashAlgorithm.Sha256 => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
        _ => Convert.ToHexString(SHA1.HashData(bytes)).ToLowerInvariant()
    };

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
