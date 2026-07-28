using System.Text.Json.Serialization;

namespace BloodMoon.Launcher.Models;

public sealed class LauncherBootstrap
{
    public DateTimeOffset GeneratedAt { get; set; }
    public LauncherServer Server { get; set; } = new();
    public LauncherLinks Links { get; set; } = new();
    public List<string> PatchNotes { get; set; } = [];
    public LauncherNews? Featured { get; set; }
    public List<LauncherNews> News { get; set; } = [];
}

public sealed class LauncherServer
{
    public string Name { get; set; } = "BloodMoon";
    public string Realm { get; set; } = "BloodMoon";
    public string Status { get; set; } = "ONLINE";
    public int OnlinePlayers { get; set; }
    public LauncherMaintenance Maintenance { get; set; } = new();
    public string ClientVersion { get; set; } = "1.0.0";
    public string? LastPatch { get; set; }
    public string ManifestUrl { get; set; } = "";
}

public sealed class LauncherMaintenance
{
    public bool Active { get; set; }
    public string Message { get; set; } = "Nenhuma manutenção programada.";
}

public sealed class LauncherLinks
{
    public string Website { get; set; } = "";
    public string News { get; set; } = "";
    public string Discord { get; set; } = "";
    public string Whatsapp { get; set; } = "";
    public string Instagram { get; set; } = "";
    public string Youtube { get; set; } = "";
    public string X { get; set; } = "";
}

public sealed class LauncherNews
{
    public string Id { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Kind { get; set; } = "NEWS";
    public string Title { get; set; } = "";
    public string? Summary { get; set; }
    public string? ImageUrl { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
    public string Url { get; set; } = "";
}

public sealed class LoginPayload
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string? TotpCode { get; set; }
}

public sealed class RefreshPayload
{
    public string RefreshToken { get; set; } = "";
}

public sealed class LoginResponse
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public SessionUser User { get; set; } = new();
}

public sealed class SessionUser
{
    public string Id { get; set; } = "";
    public string Username { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
}

public sealed class LauncherAccount
{
    public SessionUser User { get; set; } = new();
    public List<AccountCurrency> Currencies { get; set; } = [];
    public AccountCharacter? ActiveCharacter { get; set; }
    public List<AccountCharacter> Characters { get; set; } = [];
}

public sealed class AccountCurrency
{
    public string Currency { get; set; } = "";
    public int Balance { get; set; }
}

public sealed class AccountCharacter
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string ClassName { get; set; } = "";
    public int Level { get; set; }
    public int Reset { get; set; }
    public int MasterReset { get; set; }
    public string Map { get; set; } = "";
    public string Guild { get; set; } = "";
    public string Status { get; set; } = "";
}

public sealed class LauncherSession
{
    public string AccessToken { get; set; } = "";
    public string RefreshToken { get; set; } = "";
}
