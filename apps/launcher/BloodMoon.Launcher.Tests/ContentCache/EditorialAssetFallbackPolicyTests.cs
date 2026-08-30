using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.ContentCache;

public sealed class EditorialAssetFallbackPolicyTests
{
    [Fact] public void CmsValid_UsesRemote() => Assert.Equal(ResolvedEditorialAssetOrigin.Remote, Choose(remote: true));
    [Fact] public void CmsAssetMissing_UsesLocalDefault() => Assert.Equal(ResolvedEditorialAssetOrigin.LocalDefault, Choose(local: true));
    [Fact] public void CmsHttp500_UsesLastKnownGood() => Assert.Equal(ResolvedEditorialAssetOrigin.LastKnownGood, Choose(lkg: true, local: true));
    [Fact] public void CmsInvalidUrl_UsesLocalWhenThereIsNoLkg() => Assert.Equal(ResolvedEditorialAssetOrigin.LocalDefault, Choose(local: true));
    [Fact] public void CmsCorruptImage_PreservesLastKnownGood() => Assert.Equal(ResolvedEditorialAssetOrigin.LastKnownGood, Choose(lkg: true, local: true));
    [Fact] public void CacheCorruptAndNoLkg_UsesLocal() => Assert.Equal(ResolvedEditorialAssetOrigin.LocalDefault, Choose(local: true));
    [Fact] public void NetworkOutage_UsesLastKnownGoodBeforeLocal() => Assert.Equal(ResolvedEditorialAssetOrigin.LastKnownGood, Choose(lkg: true, local: true));
    [Fact] public void NoRemoteAndNoLkg_UsesLocal() => Assert.Equal(ResolvedEditorialAssetOrigin.LocalDefault, Choose(local: true));
    [Fact] public void NoRemoteAndNoDefault_IsControlledNone() => Assert.Equal(ResolvedEditorialAssetOrigin.None, Choose());
    [Fact] public void ExplicitNone_WinsOverEverySource() => Assert.Equal(ResolvedEditorialAssetOrigin.None, Choose(remote: true, lkg: true, local: true, none: true));

    [Theory]
    [InlineData("file:///c:/secrets/image.png")]
    [InlineData("javascript:alert(1)")]
    [InlineData("C:\\temp\\image.png")]
    [InlineData("http://cdn.example/image.png")]
    public void CmsInvalidUrl_IsRejected(string url) =>
        Assert.Throws<InvalidOperationException>(() => RemoteAssetUrlPolicy.ResolveHttps("https://mubloodmoon.com.br", url));

    [Fact]
    public void CmsRelativeUrl_IsRestrictedToHttpsApiOrigin() =>
        Assert.Equal("https://mubloodmoon.com.br/uploads/hero.png", RemoteAssetUrlPolicy.ResolveHttps("https://mubloodmoon.com.br", "/uploads/hero.png"));

    private static ResolvedEditorialAssetOrigin Choose(bool remote = false, bool lkg = false, bool local = false, bool none = false) =>
        EditorialAssetFallbackPolicy.Choose(remote, lkg, local, none);
}
