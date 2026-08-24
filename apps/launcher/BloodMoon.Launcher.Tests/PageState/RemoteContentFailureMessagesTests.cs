using BloodMoon.Launcher.Models;
using Xunit;

namespace BloodMoon.Launcher.Tests.PageState;

public sealed class RemoteContentFailureMessagesTests
{
    // Part X: "No raw exception text in UI" -- every failure kind must map
    // to a real, pre-written message, never an empty string that would let
    // a raw exception.Message leak through by accident.
    [Theory]
    [InlineData(RemoteContentFailureKind.ApiOffline)]
    [InlineData(RemoteContentFailureKind.Timeout)]
    [InlineData(RemoteContentFailureKind.InvalidPayload)]
    [InlineData(RemoteContentFailureKind.AssetDownloadFailed)]
    [InlineData(RemoteContentFailureKind.AssetHashMismatch)]
    [InlineData(RemoteContentFailureKind.AuthExpired)]
    [InlineData(RemoteContentFailureKind.ServerUnavailable)]
    [InlineData(RemoteContentFailureKind.NoEvents)]
    [InlineData(RemoteContentFailureKind.NoNews)]
    [InlineData(RemoteContentFailureKind.NoCharacters)]
    [InlineData(RemoteContentFailureKind.NotLoggedIn)]
    public void For_EveryFailureKind_ReturnsANonEmptyPreWrittenMessage(RemoteContentFailureKind kind)
    {
        var message = RemoteContentFailureMessages.For(kind);

        Assert.False(string.IsNullOrWhiteSpace(message));
        // A sign a raw .NET exception message leaked through instead of a
        // translated one.
        Assert.DoesNotContain("Exception", message);
    }
}
