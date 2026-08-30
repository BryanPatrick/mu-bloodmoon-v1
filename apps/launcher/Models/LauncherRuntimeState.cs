namespace BloodMoon.Launcher.Models;

public enum LauncherUpdateState
{
    Checking,
    UpToDate,
    UpdateAvailable,
    Downloading,
    Verifying,
    Ready,
    Error
}

public sealed record PlayButtonPresentation(bool IsEnabled, string Label, bool RequestsLogin = false);
