using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.Resolution;

public sealed class ResolutionEngineTests
{
    [Fact]
    public void ContentScale_NeverGoesBelowOne_AtOrBelowBaseline()
    {
        Assert.Equal(1.0, ResolutionEngine.ContentScale(1280));
        Assert.Equal(1.0, ResolutionEngine.ContentScale(1000));
        Assert.Equal(1.0, ResolutionEngine.ContentScale(0));
    }

    [Fact]
    public void ContentScale_GrowsWithWidth_ButNeverPastTheCeiling()
    {
        Assert.True(ResolutionEngine.ContentScale(1920) > 1.0);
        // 1920 / 1280 = 1.5, under the 1.6 ceiling.
        Assert.Equal(1.5, ResolutionEngine.ContentScale(1920), precision: 3);
        // A hypothetically huge width must still clamp at 1.6.
        Assert.Equal(1.6, ResolutionEngine.ContentScale(10_000));
    }

    [Fact]
    public void TypographyScale_GrowsMoreConservativelyThanContentScale()
    {
        var content = ResolutionEngine.ContentScale(1920);
        var typography = ResolutionEngine.TypographyScale(1920);
        Assert.True(typography < content);
        Assert.True(typography >= 1.0);
        Assert.True(typography <= 1.25);
    }

    [Fact]
    public void ScaledFontSize_AppliesTypographyScaleToTheBaseSize()
    {
        var scaled = ResolutionEngine.ScaledFontSize(16, 1920);
        Assert.True(scaled >= 16);
        Assert.True(scaled <= 16 * 1.25);
    }

    [Theory]
    [InlineData(true, 196)]
    [InlineData(false, 220)]
    public void NavColumnWidth_IsNarrowerInWideProfiles_NeverWiderThanBaseline(bool isWide, double expected)
    {
        Assert.Equal(expected, ResolutionEngine.NavColumnWidth(isWide));
    }

    [Fact]
    public void ResolutionProfiles_HasExactlySixApprovedProfiles_WithRealNumbers()
    {
        Assert.Equal(6, ResolutionProfiles.All.Count);
        Assert.Contains(ResolutionProfiles.All, p => p is { Width: 1280, Height: 720, IsWide: false });
        Assert.Contains(ResolutionProfiles.All, p => p is { Width: 1600, Height: 900, IsWide: false });
        Assert.Contains(ResolutionProfiles.All, p => p is { Width: 1920, Height: 1080, IsWide: false });
        Assert.Contains(ResolutionProfiles.All, p => p is { Width: 1600, Height: 720, IsWide: true });
        Assert.Contains(ResolutionProfiles.All, p => p is { Width: 1920, Height: 800, IsWide: true });
        Assert.Contains(ResolutionProfiles.All, p => p.Key == ResolutionProfileKey.Maximized && p.IsWide);
    }

    [Fact]
    public void ForIndex_ClampsOutOfRangeIndexesToBaseline()
    {
        Assert.Equal(ResolutionProfileKey.Baseline1280x720, ResolutionProfiles.ForIndex(-1).Key);
        Assert.Equal(ResolutionProfileKey.Baseline1280x720, ResolutionProfiles.ForIndex(999).Key);
    }

    [Fact]
    public void IndexOf_RoundTripsWithForIndex()
    {
        var index = ResolutionProfiles.IndexOf(ResolutionProfileKey.Wide1920x800);
        Assert.Equal(ResolutionProfileKey.Wide1920x800, ResolutionProfiles.ForIndex(index).Key);
    }
}
