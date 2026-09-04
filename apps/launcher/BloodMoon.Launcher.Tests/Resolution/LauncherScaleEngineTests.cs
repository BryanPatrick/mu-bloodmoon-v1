using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using Xunit;

namespace BloodMoon.Launcher.Tests.Resolution;

// Scale/accessibility -- pure-function tests, no real WPF window is
// instantiated here. Visual-clipping checks (NO_NAV_LABEL_CLIPPING,
// NO_PLAY_BUTTON_CLIPPING, NO_BOTTOM_BAR_CLIPPING,
// CRITICAL_CONTROLS_REMAIN_VISIBLE) are NOT unit-testable this way -- see
// docs/launcher/launcher-scale-and-text-scale.md for the real, live QA
// evidence instead. The shell's own native frame is 1180x700 (the
// approved Phase 1 fixed size, MainWindow.xaml) -- used directly here
// rather than ResolutionEngine.BaselineWidth/Height (1280x720), which
// belongs to a separate, unrelated viewport-profile system this feature
// does not depend on.
public sealed class LauncherScaleEngineTests
{
    private const double NativeWidth = 1180;
    private const double NativeHeight = 700;

    [Fact]
    public void SCALE_STANDARD_is_exactly_100_percent_and_index_two()
    {
        var standard = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.Standard));
        Assert.Equal(1.0, standard.Factor);
        Assert.Equal(2, LauncherScaleOptions.IndexOf(LauncherScaleLevel.Standard));
    }

    [Fact]
    public void SCALE_COMPACT_is_70_percent_and_stays_above_the_absolute_floor_at_native_size()
    {
        var compact = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.Compact));
        Assert.Equal(0.70, compact.Factor);
        var width = NativeWidth * compact.Factor;
        var height = NativeHeight * compact.Factor;
        Assert.Equal(LauncherScaleEngine.AbsoluteMinWidth, width, precision: 6);
        Assert.Equal(LauncherScaleEngine.AbsoluteMinHeight, height, precision: 6);
    }

    [Fact]
    public void SCALE_LARGE_is_120_percent()
    {
        var large = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.Large));
        Assert.Equal(1.20, large.Factor);
    }

    [Fact]
    public void All_five_launcher_scale_levels_exist_with_the_requested_percentages()
    {
        Assert.Equal(5, LauncherScaleOptions.All.Count);
        Assert.Contains(LauncherScaleOptions.All, o => o is { Level: LauncherScaleLevel.Compact, Factor: 0.70 });
        Assert.Contains(LauncherScaleOptions.All, o => o is { Level: LauncherScaleLevel.Small, Factor: 0.80 });
        Assert.Contains(LauncherScaleOptions.All, o => o is { Level: LauncherScaleLevel.Standard, Factor: 1.00 });
        Assert.Contains(LauncherScaleOptions.All, o => o is { Level: LauncherScaleLevel.Large, Factor: 1.20 });
        Assert.Contains(LauncherScaleOptions.All, o => o is { Level: LauncherScaleLevel.ExtraLarge, Factor: 1.30 });
    }

    [Fact]
    public void TEXT_STANDARD_is_exactly_100_percent()
    {
        var standard = TextScaleOptions.ForIndex(TextScaleOptions.IndexOf(TextScaleLevel.Standard));
        Assert.Equal(1.0, standard.Factor);
    }

    [Fact]
    public void TEXT_LARGE_stays_within_the_narrow_accessibility_range()
    {
        var large = TextScaleOptions.ForIndex(TextScaleOptions.IndexOf(TextScaleLevel.Large));
        // Deliberately narrower than LauncherScale's range (text scale is
        // for readability, not for shrinking to fit more content).
        Assert.True(large.Factor > 1.0 && large.Factor <= 1.20);
    }

    [Fact]
    public void SCALE_PREFERENCE_PERSISTED_round_trips_through_LauncherSettings()
    {
        var settings = new LauncherSettings { LauncherScaleIndex = LauncherScaleOptions.IndexOf(LauncherScaleLevel.Large) };
        var restored = LauncherScaleOptions.ForIndex(settings.LauncherScaleIndex);
        Assert.Equal(LauncherScaleLevel.Large, restored.Level);
    }

    [Fact]
    public void TEXT_PREFERENCE_PERSISTED_round_trips_through_LauncherSettings()
    {
        var settings = new LauncherSettings { TextScaleIndex = TextScaleOptions.IndexOf(TextScaleLevel.Small) };
        var restored = TextScaleOptions.ForIndex(settings.TextScaleIndex);
        Assert.Equal(TextScaleLevel.Small, restored.Level);
    }

    [Fact]
    public void LauncherSettings_defaults_both_scales_to_Standard_so_an_older_settings_json_is_unaffected()
    {
        var settings = new LauncherSettings();
        Assert.Equal(LauncherScaleLevel.Standard, LauncherScaleOptions.ForIndex(settings.LauncherScaleIndex).Level);
        Assert.Equal(TextScaleLevel.Standard, TextScaleOptions.ForIndex(settings.TextScaleIndex).Level);
    }

    [Fact]
    public void SAVED_SCALE_TOO_LARGE_FALLS_BACK_SAFELY_on_a_small_1366x768_style_work_area()
    {
        // A saved ExtraLarge (1.30) preference against the native 1180x700
        // frame would need 1534x910 -- larger than a real 1366x768
        // laptop's work area (taskbar already subtracted, ~1366x728 here).
        // The engine must step down to the largest scale that actually
        // fits, not throw and not silently exceed the work area.
        var extraLarge = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.ExtraLarge));
        var fitted = LauncherScaleEngine.FitToWorkArea(
            NativeWidth, NativeHeight,
            workAreaWidth: 1366, workAreaHeight: 728,
            requested: extraLarge);

        Assert.NotEqual(LauncherScaleLevel.ExtraLarge, fitted.Level);
        Assert.True(NativeWidth * fitted.Factor <= 1366);
        Assert.True(NativeHeight * fitted.Factor <= 728);
    }

    [Fact]
    public void FitToWorkArea_never_falls_below_Compact_even_on_an_unrealistically_tiny_work_area()
    {
        var standard = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.Standard));
        var fitted = LauncherScaleEngine.FitToWorkArea(
            NativeWidth, NativeHeight,
            workAreaWidth: 400, workAreaHeight: 300,
            requested: standard);

        Assert.Equal(LauncherScaleLevel.Compact, fitted.Level);
    }

    [Fact]
    public void FitToWorkArea_never_upgrades_past_what_was_actually_requested()
    {
        // A huge work area must not silently promote a Compact request to
        // something larger -- the fallback only ever steps DOWN.
        var compact = LauncherScaleOptions.ForIndex(LauncherScaleOptions.IndexOf(LauncherScaleLevel.Compact));
        var fitted = LauncherScaleEngine.FitToWorkArea(
            NativeWidth, NativeHeight,
            workAreaWidth: 3840, workAreaHeight: 2160,
            requested: compact);

        Assert.Equal(LauncherScaleLevel.Compact, fitted.Level);
    }

    [Fact]
    public void MinWidthForScale_and_MinHeightForScale_track_the_active_scale_never_below_the_absolute_floor()
    {
        Assert.Equal(LauncherScaleEngine.AbsoluteMinWidth, LauncherScaleEngine.MinWidthForScale(NativeWidth, 0.70));
        Assert.Equal(LauncherScaleEngine.AbsoluteMinHeight, LauncherScaleEngine.MinHeightForScale(NativeHeight, 0.70));
        Assert.True(LauncherScaleEngine.MinWidthForScale(NativeWidth, 1.30) > LauncherScaleEngine.MinWidthForScale(NativeWidth, 1.0));
        // Even a hypothetically tiny factor never drops below the absolute floor.
        Assert.Equal(LauncherScaleEngine.AbsoluteMinWidth, LauncherScaleEngine.MinWidthForScale(NativeWidth, 0.1));
    }
}
