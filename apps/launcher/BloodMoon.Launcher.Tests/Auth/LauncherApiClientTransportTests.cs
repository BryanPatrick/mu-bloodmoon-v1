using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.Auth;

// Phase 2D Part 13 -- the narrow loopback-only HTTP exception that makes
// real local QA possible without weakening the real transport-security
// guarantee for any actual deployment.
public sealed class LauncherApiClientTransportTests
{
    [Theory]
    [InlineData("https://api.mubloodmoon.com.br/api", true)]
    [InlineData("http://localhost:3333/api", true)]
    [InlineData("http://127.0.0.1:3333/api", true)]
    [InlineData("http://api.mubloodmoon.com.br/api", false)]
    [InlineData("http://example.com/api", false)]
    public void IsSecureOrLoopback_OnlyAllowsHttpsOrLoopbackHttp(string url, bool expected)
    {
        var uri = new Uri(url);
        Assert.Equal(expected, LauncherApiClient.IsSecureOrLoopback(uri));
    }
}
