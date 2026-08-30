using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.Security;

public sealed class BrowserServiceTests
{
    [Fact]
    public void HttpsUrl_IsAccepted() =>
        Assert.Equal("https://mubloodmoon.com.br/noticias", BrowserService.ValidateExternalUrl("https://mubloodmoon.com.br/noticias").ToString().TrimEnd('/'));

    [Theory]
    [InlineData("http://mubloodmoon.com.br")]
    [InlineData("file:///C:/Windows/System32/cmd.exe")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:password@example.com")]
    public void UnsafeExternalUrl_IsRejected(string url) =>
        Assert.Throws<InvalidOperationException>(() => BrowserService.ValidateExternalUrl(url));
}
