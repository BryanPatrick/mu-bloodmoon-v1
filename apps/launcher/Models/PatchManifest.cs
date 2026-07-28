namespace BloodMoon.Launcher.Models;

public sealed class PatchManifest
{
    public int SchemaVersion { get; set; } = 1;
    public string Channel { get; set; } = "production";
    public string Version { get; set; } = "0.0.0";
    public DateTimeOffset? PublishedAt { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public List<PatchFile> Files { get; set; } = [];
    public List<string> Delete { get; set; } = [];
    public LauncherPatch? Launcher { get; set; }
    public string ContentSha256 { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
}

public sealed class PatchFile
{
    public string Path { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long Size { get; set; }
}

public sealed class LauncherPatch
{
    public string Version { get; set; } = "0.0.0";
    public string Url { get; set; } = string.Empty;
    public string Sha256 { get; set; } = string.Empty;
    public long Size { get; set; }
}

public sealed record PatchProgress(
    string CurrentFile,
    int CompletedFiles,
    int TotalFiles,
    long DownloadedBytes,
    long TotalBytes)
{
    public double Percentage => TotalBytes <= 0
        ? 0
        : Math.Clamp(DownloadedBytes * 100d / TotalBytes, 0, 100);
}
