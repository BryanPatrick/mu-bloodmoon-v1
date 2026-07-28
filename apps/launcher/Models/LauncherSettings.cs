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
}
