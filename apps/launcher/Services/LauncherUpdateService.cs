using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class LauncherUpdateService : IDisposable
{
    private readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromMinutes(10) };

    public bool IsUpdateRequired(LauncherPatch? update)
    {
        if (update is null || !Version.TryParse(update.Version, out var remoteVersion))
        {
            return false;
        }
        var currentVersion = Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 0);
        return remoteVersion > currentVersion;
    }

    public async Task StartUpdateAsync(
        LauncherPatch update,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(update.Url, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("A atualização do launcher deve usar HTTPS.");
        }

        var updaterPath = Path.Combine(AppContext.BaseDirectory, "BloodMoonLauncherUpdater.exe");
        var launcherPath = Environment.ProcessPath
            ?? throw new InvalidOperationException("Não foi possível localizar o executável do launcher.");
        if (!File.Exists(updaterPath))
        {
            throw new FileNotFoundException("O atualizador independente não foi encontrado.", updaterPath);
        }

        var stagedDirectory = Path.Combine(AppContext.BaseDirectory, ".bloodmoon", "launcher-update");
        Directory.CreateDirectory(stagedDirectory);
        var stagedPath = Path.Combine(stagedDirectory, "BloodMoonLauncher.exe");
        using (var response = await _httpClient.GetAsync(uri, cancellationToken))
        {
            response.EnsureSuccessStatusCode();
            await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
            await using var destination = File.Create(stagedPath);
            await source.CopyToAsync(destination, cancellationToken);
        }

        await using (var stream = File.OpenRead(stagedPath))
        {
            var hash = Convert.ToHexString(await SHA256.HashDataAsync(stream, cancellationToken));
            if (!string.Equals(hash, update.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(stagedPath);
                throw new InvalidDataException("A atualização do launcher falhou na verificação SHA-256.");
            }
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = updaterPath,
            UseShellExecute = false,
            Arguments = string.Join(
                " ",
                Environment.ProcessId,
                Quote(launcherPath),
                Quote(stagedPath))
        });
    }

    private static string Quote(string value) => $"\"{value.Replace("\"", "\\\"")}\"";

    public void Dispose() => _httpClient.Dispose();
}
