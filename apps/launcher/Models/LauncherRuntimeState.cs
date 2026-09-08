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

// AllowsGameLaunch/ReasonText/State added for feature/launcher-play-gate
// (2026-09-08), ported from PlayGateEngine's PlayGateResult. IsEnabled
// and AllowsGameLaunch are deliberately separate (the pre-existing Shell
// lets a logged-out player click PLAY to OPEN the login overlay -- a
// real, already-shipped affordance -- so IsEnabled stays true for
// NotLoggedIn while AllowsGameLaunch stays false); StartGame() must
// check AllowsGameLaunch, never IsEnabled alone, before actually
// starting the client.
public sealed record PlayButtonPresentation(
    bool IsEnabled,
    string Label,
    bool RequestsLogin = false,
    bool AllowsGameLaunch = false,
    string? ReasonText = null,
    PlayState State = PlayState.NotLoggedIn);
