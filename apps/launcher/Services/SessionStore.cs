using System.Security.Cryptography;
using System.IO;
using System.Text;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class SessionStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("BloodMoon.Launcher.Session.v1");
    private readonly string _path = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "BloodMoon",
        "Launcher",
        "session.bin");

    public async Task SaveAsync(LauncherSession session)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        var plain = JsonSerializer.SerializeToUtf8Bytes(session);
        var protectedBytes = ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser);
        await File.WriteAllBytesAsync(_path, protectedBytes);
    }

    public async Task<LauncherSession?> LoadAsync()
    {
        if (!File.Exists(_path))
        {
            return null;
        }
        try
        {
            var protectedBytes = await File.ReadAllBytesAsync(_path);
            var plain = ProtectedData.Unprotect(protectedBytes, Entropy, DataProtectionScope.CurrentUser);
            return JsonSerializer.Deserialize<LauncherSession>(plain);
        }
        catch
        {
            Clear();
            return null;
        }
    }

    public void Clear()
    {
        if (File.Exists(_path))
        {
            File.Delete(_path);
        }
    }
}
