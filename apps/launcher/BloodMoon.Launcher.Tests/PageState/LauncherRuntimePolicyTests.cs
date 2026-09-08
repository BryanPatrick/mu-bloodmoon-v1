using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

// feature/launcher-play-gate (2026-09-08) -- LauncherRuntimePolicy is now
// the single canonical Play gate, merging its own pre-existing PATCHER_GATE
// (LauncherUpdateState, tests below unchanged from before this merge)
// with PlayGateEngine's granular provisioning/account-restriction gates,
// ported from openbeta's parallel, never-committed work (that engine's
// own test file, Auth/PlayGateEngineTests.cs, is the direct source for
// the PLAY_* cases below -- see the phase manifest for the full
// side-by-side audit that justified this over keeping two engines).
public sealed class LauncherRuntimePolicyTests
{
    [Fact]
    public void SignedOut_PlayerCanOpenLoginEvenWhileChecking() =>
        Assert.Equal(new PlayButtonPresentation(true, "ENTRE PARA JOGAR", true, State: PlayState.NotLoggedIn),
            LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Checking, false, true, false));

    [Theory]
    [InlineData(LauncherUpdateState.Checking)]
    [InlineData(LauncherUpdateState.UpdateAvailable)]
    [InlineData(LauncherUpdateState.Downloading)]
    [InlineData(LauncherUpdateState.Verifying)]
    [InlineData(LauncherUpdateState.Error)]
    public void UpdateBlockers_DisablePlay(LauncherUpdateState state) =>
        Assert.False(LauncherRuntimePolicy.ResolvePlayButton(state, true, true, true).IsEnabled);

    [Theory]
    [InlineData(LauncherUpdateState.UpToDate)]
    [InlineData(LauncherUpdateState.Ready)]
    public void VerifiedStates_EnablePlay(LauncherUpdateState state) =>
        Assert.True(LauncherRuntimePolicy.ResolvePlayButton(state, true, true, true).IsEnabled);

    [Fact]
    public void UnifiedAccountNotReady_DisablesPlay() =>
        Assert.Equal("PREPARANDO CONTA...",
            LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, true, true, false).Label);

    // --- Ported from PlayGateEngineTests.cs (openbeta, never committed) ---

    [Fact]
    public void PLAY_LOGGED_OUT_BLOCKED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: false, serverAvailable: true, gameReady: false, provisioningStatus: "NONE", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.Equal(PlayState.NotLoggedIn, result.State);
        // The button stays clickable -- it opens the login overlay -- but
        // must never actually launch the game while logged out.
        Assert.True(result.IsEnabled);
    }

    [Fact]
    public void PLAY_NOT_GAME_READY_BLOCKED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: true, serverAvailable: true, gameReady: false, provisioningStatus: "ACTIVE", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.False(result.IsEnabled);
        Assert.Equal(PlayState.GameAccountNotReady, result.State);
        Assert.Equal("Sua conta de jogo ainda está sendo preparada.", result.ReasonText);
    }

    [Fact]
    public void PLAY_PROVISIONING_PENDING_BLOCKED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: true, serverAvailable: true, gameReady: false, provisioningStatus: "PENDING", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.Equal(PlayState.GameAccountNotReady, result.State);
    }

    [Fact]
    public void PLAY_PROVISIONING_FAILED_BLOCKED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: true, serverAvailable: true, gameReady: false, provisioningStatus: "FAILED", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.False(result.IsEnabled);
        Assert.Equal(PlayState.ProvisioningFailed, result.State);
        Assert.Equal("Não foi possível preparar sua conta de jogo.", result.ReasonText);
    }

    [Fact]
    public void PLAY_ACCOUNT_RESTRICTED_BLOCKED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: true, serverAvailable: true, gameReady: true, provisioningStatus: "ACTIVE", accountRestricted: true);

        Assert.False(result.AllowsGameLaunch);
        Assert.False(result.IsEnabled);
        Assert.Equal(PlayState.AccountRestricted, result.State);
        Assert.Equal("Sua conta possui uma restrição que impede o acesso ao jogo.", result.ReasonText);
    }

    [Fact]
    public void PLAY_GAME_READY_ALLOWED()
    {
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, isLoggedIn: true, serverAvailable: true, gameReady: true, provisioningStatus: "ACTIVE", accountRestricted: false);

        Assert.True(result.AllowsGameLaunch);
        Assert.True(result.IsEnabled);
        Assert.Equal(PlayState.ReadyToPlay, result.State);
        Assert.Null(result.ReasonText);
        Assert.Equal("JOGAR", result.Label);
    }

    [Fact]
    public void Restriction_and_maintenance_take_priority_over_a_ready_account()
    {
        // Real ordering matters: a maintenance window or a restriction
        // must block even an otherwise-fully-ready account.
        var maintenance = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, true, serverAvailable: false, gameReady: true, provisioningStatus: "ACTIVE", accountRestricted: false);
        Assert.Equal(PlayState.ServerOffline, maintenance.State);

        var restricted = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Ready, true, serverAvailable: true, gameReady: true, provisioningStatus: "ACTIVE", accountRestricted: true);
        Assert.Equal(PlayState.AccountRestricted, restricted.State);
    }

    [Fact]
    public void GameReady_gate_wins_even_when_client_is_fully_patched()
    {
        // The real bug this merge exists to preserve the fix for: a
        // gameReady=false account must never read as ready to play, even
        // when LauncherUpdateState is already Ready/UpToDate (the patch
        // gate that PlayGateEngine's own caller never checked at all, and
        // the one RuntimePolicy already handled correctly before this
        // merge -- this test proves the merged precedence still checks
        // provisioning/game-readiness BEFORE ever reaching the update-
        // state switch).
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.UpToDate, isLoggedIn: true, serverAvailable: true, gameReady: false, provisioningStatus: "ACTIVE", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.False(result.IsEnabled);
        Assert.Equal(PlayState.GameAccountNotReady, result.State);
    }

    [Fact]
    public void ClientNotReady_is_a_distinct_state_from_ReadyToPlay()
    {
        // Added by this merge -- the update-blocked cases used to have no
        // State value at all (the original record had no State field);
        // reusing ReadyToPlay for "client mid-update" would be a false
        // signal to anything that reads State instead of IsEnabled.
        var result = LauncherRuntimePolicy.ResolvePlayButton(LauncherUpdateState.Downloading, isLoggedIn: true, serverAvailable: true, gameReady: true, provisioningStatus: "ACTIVE", accountRestricted: false);

        Assert.False(result.AllowsGameLaunch);
        Assert.Equal(PlayState.ClientNotReady, result.State);
        Assert.NotEqual(PlayState.ReadyToPlay, result.State);
    }
}
