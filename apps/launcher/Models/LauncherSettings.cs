namespace BloodMoon.Launcher.Models;

public sealed class LauncherSettings
{
    public string ApiBaseUrl { get; set; } = "https://api.mubloodmoon.com.br/api";
    public string GameExecutable { get; set; } = "main.exe";
    public string PatchManifestUrl { get; set; } =
        "https://update.mubloodmoon.com.br/launcher/manifest.json";
    public bool RequireSignedManifest { get; set; }
    public string WebsiteUrl { get; set; } = "https://mubloodmoon.com.br";
    public string NewsUrl { get; set; } = "https://mubloodmoon.com.br/noticias";
    public string DiscordUrl { get; set; } = "https://discord.gg/";
    public string WhatsappUrl { get; set; } = "https://wa.me/";
    public string InstagramUrl { get; set; } = "https://instagram.com/";
    public string YoutubeUrl { get; set; } = "https://youtube.com/";
    public string XUrl { get; set; } = "https://x.com/";
    public string Language { get; set; } = "Por";
    public int ResolutionIndex { get; set; } = 4;
    public bool WindowMode { get; set; } = true;
    public bool MusicEnabled { get; set; } = true;
    public bool SoundEnabled { get; set; } = true;
    public int Volume { get; set; } = 10;

    // Launcher Foundation phase (Part T) -- all genuinely local preferences,
    // never sourced from the remote content contract. Additive: an older
    // settings.json on disk without these keys just gets the defaults below
    // (SettingsService already tolerates missing/older files).
    public string Quality { get; set; } = "Alta";
    public bool CloseLauncherAfterGameStarts { get; set; } = true;
    public bool MinimizeToTray { get; set; }
    public bool StartWithWindows { get; set; }
    public bool UiAnimationsEnabled { get; set; } = true;
    public bool PerformanceMode { get; set; }
    public int UiEffectsVolume { get; set; } = 10;

    // Launcher Phase L3 (Part L) -- the LAUNCHER's own window/viewport
    // resolution profile (ResolutionProfiles.All index), entirely separate
    // from ResolutionIndex above (which is the MU game client's own
    // in-game resolution, written to the game's registry config by
    // GameConfigurationService and untouched by this phase).
    public int LauncherViewportProfileIndex { get; set; }
}
