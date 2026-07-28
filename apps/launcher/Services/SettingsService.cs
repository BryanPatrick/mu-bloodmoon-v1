using System.IO;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class SettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly string _settingsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "BloodMoon",
        "Launcher",
        "launcher.settings.json");

    public async Task<LauncherSettings> LoadAsync()
    {
        if (File.Exists(_settingsPath))
        {
            await using var userFile = File.OpenRead(_settingsPath);
            return await JsonSerializer.DeserializeAsync<LauncherSettings>(userFile, JsonOptions)
                ?? new LauncherSettings();
        }

        var bundledPath = Path.Combine(AppContext.BaseDirectory, "launcher.settings.json");
        if (!File.Exists(bundledPath))
        {
            return new LauncherSettings();
        }

        await using var bundledFile = File.OpenRead(bundledPath);
        return await JsonSerializer.DeserializeAsync<LauncherSettings>(bundledFile, JsonOptions)
            ?? new LauncherSettings();
    }

    public async Task SaveAsync(LauncherSettings settings)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath)!);
        await using var file = File.Create(_settingsPath);
        await JsonSerializer.SerializeAsync(file, settings, JsonOptions);
    }
}
