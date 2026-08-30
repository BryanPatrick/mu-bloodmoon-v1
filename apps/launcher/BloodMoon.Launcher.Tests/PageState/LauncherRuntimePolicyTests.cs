using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class LauncherRuntimePolicyTests
{
    [Fact]
    public void SignedOut_PlayerCanOpenLoginEvenWhileChecking() =>
        Assert.Equal(new(true, "ENTRE PARA JOGAR", true),
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
}
