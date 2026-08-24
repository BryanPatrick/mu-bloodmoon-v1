using System.IO;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

// Part B: "the Launcher can never open to an empty screen just because the
// backend is offline." First-run-with-no-internet case: no cache exists
// yet either, so this is the only remaining source of content, and it must
// not itself depend on anything that can fail.
public static class PackagedFallbackContent
{
    private const string FileName = "fallback-content.json";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static LauncherBootstrap Load()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, FileName);
            if (File.Exists(path))
            {
                var json = File.ReadAllText(path);
                var parsed = JsonSerializer.Deserialize<LauncherBootstrap>(json, JsonOptions);
                if (parsed is not null)
                {
                    return parsed;
                }
            }
        }
        catch
        {
            // Fall through to the hardcoded default below -- this path must
            // never throw, regardless of what's wrong with the bundled file.
        }
        return HardcodedDefault();
    }

    // The absolute last resort: does not touch disk at all, so it cannot
    // fail for any reason short of an OOM.
    private static LauncherBootstrap HardcodedDefault() => new()
    {
        SchemaVersion = 1,
        ContentVersion = "packaged-fallback",
        GeneratedAt = DateTimeOffset.UtcNow,
        Server = new LauncherServer
        {
            Name = "BloodMoon",
            Realm = "BloodMoon",
            Status = "DESCONHECIDO",
            ClientVersion = "1.0.0"
        },
        Campaign = new LauncherCampaign { Enabled = false },
        Links = new LauncherLinks { Website = "https://mubloodmoon.com.br" }
    };
}
