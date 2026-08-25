using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

// Launcher Phase L3 -- on-disk cache for GET /launcher/content's resolved
// slot payload, sibling to LauncherContentCache (kept as its own class
// rather than a generic refactor of the already-tested LauncherContentCache
// -- lower risk, and matches this app's existing "dedicated per concern"
// convention, e.g. LauncherApiClient/PatchService/LauncherUpdateService
// each owning their own HttpClient rather than sharing one).
public sealed class SlotContentCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _cacheDirectory;
    private readonly string _fileName;

    public SlotContentCache(string fileName = "slot-content.json", string? cacheDirectory = null)
    {
        _fileName = fileName;
        _cacheDirectory = cacheDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BloodMoon", "Launcher", "cache");
    }

    private string FilePath => Path.Combine(_cacheDirectory, _fileName);

    public async Task<ContentCacheEnvelope<LauncherContentPayload>?> LoadAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (!File.Exists(FilePath))
            {
                return null;
            }
            await using var stream = File.OpenRead(FilePath);
            var envelope = await JsonSerializer.DeserializeAsync<ContentCacheEnvelope<LauncherContentPayload>>(
                stream, JsonOptions, cancellationToken);
            if (envelope is null)
            {
                return null;
            }
            if (!string.Equals(ComputeHash(envelope.Payload), envelope.PayloadHash, StringComparison.Ordinal))
            {
                return null;
            }
            return envelope;
        }
        catch
        {
            return null;
        }
    }

    public async Task SaveAsync(ContentCacheEnvelope<LauncherContentPayload> envelope, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_cacheDirectory);
        var tempPath = Path.Combine(_cacheDirectory, $"{_fileName}.{Guid.NewGuid():N}.tmp");
        try
        {
            await using (var stream = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(stream, envelope, JsonOptions, cancellationToken);
            }
            File.Move(tempPath, FilePath, overwrite: true);
        }
        finally
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
        }
    }

    public static string ComputeHash(LauncherContentPayload payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }
}
