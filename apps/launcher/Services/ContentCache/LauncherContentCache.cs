using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

// Part C/D -- local, on-disk cache for the bootstrap content envelope.
// %LOCALAPPDATA%\BloodMoon\Launcher\cache\, mirroring SessionStore's own
// %LOCALAPPDATA%\BloodMoon\Launcher\ convention. Never stores password,
// session secret, game credential, SQL detail, or Cloudflare secret --
// LauncherBootstrap carries none of those (Models/ApiModels.cs).
public sealed class LauncherContentCache
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _cacheDirectory;
    private readonly string _fileName;

    public LauncherContentCache(string fileName = "bootstrap.json", string? cacheDirectory = null)
    {
        _fileName = fileName;
        _cacheDirectory = cacheDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BloodMoon", "Launcher", "cache");
    }

    private string FilePath => Path.Combine(_cacheDirectory, _fileName);

    public async Task<ContentCacheEnvelope<LauncherBootstrap>?> LoadAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (!File.Exists(FilePath))
            {
                return null;
            }
            await using var stream = File.OpenRead(FilePath);
            var envelope = await JsonSerializer.DeserializeAsync<ContentCacheEnvelope<LauncherBootstrap>>(
                stream, JsonOptions, cancellationToken);
            if (envelope is null)
            {
                return null;
            }
            // Integrity check against the payload hash recorded at write
            // time -- a partially written or externally tampered cache file
            // is treated exactly like "no cache" rather than trusted.
            if (!string.Equals(ComputeHash(envelope.Payload), envelope.PayloadHash, StringComparison.Ordinal))
            {
                return null;
            }
            return envelope;
        }
        catch
        {
            // Any I/O or deserialize failure (corrupted file, partial
            // write, an old/incompatible on-disk shape) means "no usable
            // cache" -- never a crash (Part B/D).
            return null;
        }
    }

    // Part D's atomic promote: write to a fresh temp file, then rename it
    // over the real path. File.Move(overwrite:true) to a path on the same
    // volume is atomic on NTFS -- a reader observes either the complete old
    // file or the complete new file, never a half-written one. If anything
    // fails before the move, FilePath is untouched and the previous valid
    // cache remains available.
    public async Task SaveAsync(ContentCacheEnvelope<LauncherBootstrap> envelope, CancellationToken cancellationToken)
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

    public static string ComputeHash(LauncherBootstrap payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
    }
}
