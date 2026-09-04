namespace BloodMoon.Launcher.Services;

// Scale/accessibility -- two independent axes, deliberately separate from
// each other:
//
//   LauncherScale -- a uniform density multiplier applied to the WHOLE
//                    rendered shell (a LayoutTransform on MainWindow's
//                    RootGrid, plus a matching window resize -- see
//                    MainWindow.xaml.cs's ApplyDisplayLayout). Live preview.
//   TextScale     -- an independent multiplier applied only to
//                    Typography.xaml's FontSize.* tokens, resolved once at
//                    app startup (App.xaml.cs). Requires a restart to
//                    change -- StaticResource font sizes are baked in at
//                    XAML parse time across all 7 pages, and migrating
//                    every page to DynamicResource purely for instant
//                    text-scale preview would be exactly the fragile
//                    runtime transformation this feature is not meant to
//                    build.
//
// Deliberately NOT layered on ResolutionEngine's own Baseline/Widescreen/
// Wide/Maximized viewport profiles -- the shell's approved frame is a
// single fixed 1180x700 native size (MainWindow.xaml.cs), never
// user-resizable, so LauncherScale has exactly one native size to scale
// from, passed explicitly by the caller rather than assumed here.
public enum LauncherScaleLevel { Compact, Small, Standard, Large, ExtraLarge }

public sealed record LauncherScaleOption(LauncherScaleLevel Level, string Label, double Factor);

public static class LauncherScaleOptions
{
    // The approved 70/80/100/120/130 percentages need no WPF-specific
    // adjustment -- LayoutTransform accepts any positive double scale
    // factor, and Compact(0.70) x the shell's own native 1180x700 is real
    // content, not degenerate (see LauncherScaleEngine.AbsoluteMin* below
    // for why that specific floor is the real technical constraint, not
    // the percentage values themselves).
    public static readonly IReadOnlyList<LauncherScaleOption> All =
    [
        new(LauncherScaleLevel.Compact, "Compacto", 0.70),
        new(LauncherScaleLevel.Small, "Pequeno", 0.80),
        new(LauncherScaleLevel.Standard, "Padrão", 1.00),
        new(LauncherScaleLevel.Large, "Grande", 1.20),
        new(LauncherScaleLevel.ExtraLarge, "Muito grande", 1.30)
    ];

    public static LauncherScaleOption ForIndex(int index) =>
        index >= 0 && index < All.Count ? All[index] : All[2]; // Standard

    public static int IndexOf(LauncherScaleLevel level)
    {
        for (var i = 0; i < All.Count; i++)
        {
            if (All[i].Level == level) return i;
        }
        return 2; // Standard
    }
}

public enum TextScaleLevel { Small, Standard, Large }

public sealed record TextScaleOption(TextScaleLevel Level, string Label, double Factor);

public static class TextScaleOptions
{
    // Deliberately narrower range than LauncherScale (0.90-1.15, not
    // 0.70-1.30) -- accessibility rule: "do not achieve compact layouts by
    // making essential text extremely small." Text scale exists for
    // readability, not for fitting more content, so its floor stays close
    // to 1.0. The two axes compose multiplicatively at render time
    // (LauncherScale sizes the whole shell including its text; TextScale
    // then further adjusts just the type on top of that), so a narrow
    // TextScale range is what keeps every documented Font-scale QA
    // combination safe.
    public static readonly IReadOnlyList<TextScaleOption> All =
    [
        new(TextScaleLevel.Small, "Pequeno", 0.90),
        new(TextScaleLevel.Standard, "Padrão", 1.00),
        new(TextScaleLevel.Large, "Grande", 1.15)
    ];

    public static TextScaleOption ForIndex(int index) =>
        index >= 0 && index < All.Count ? All[index] : All[1]; // Standard

    public static int IndexOf(TextScaleLevel level)
    {
        for (var i = 0; i < All.Count; i++)
        {
            if (All[i].Level == level) return i;
        }
        return 1; // Standard
    }
}

public static class LauncherScaleEngine
{
    // The real technical floor: Compact (0.70) applied to the shell's own
    // native frame (1180x700) = 826x490. Below this, the fixed-width nav
    // rail (196px) plus its own padding would start to crowd the page host
    // into an impractically narrow remaining strip -- this is the
    // "essential clickable target size" floor, derived from the shell's
    // own real fixed-width regions rather than picked arbitrarily.
    public const double AbsoluteMinWidth = 826;
    public const double AbsoluteMinHeight = 490;

    // The window's own MinWidth/MinHeight must track whichever
    // LauncherScale is currently active -- otherwise a fixed floor
    // (independent of scale) would silently prevent Compact/Small from
    // ever actually shrinking the window, defeating the feature. Never
    // goes below the absolute floor above. nativeWidth/nativeHeight is the
    // caller's own unscaled frame size (MainWindow.xaml.cs passes 1180x700
    // -- the one approved native size this shell has), not assumed here.
    public static double MinWidthForScale(double nativeWidth, double scaleFactor) =>
        Math.Max(AbsoluteMinWidth, Math.Round(nativeWidth * scaleFactor));

    public static double MinHeightForScale(double nativeHeight, double scaleFactor) =>
        Math.Max(AbsoluteMinHeight, Math.Round(nativeHeight * scaleFactor));

    // WINDOW FITTING -- given the shell's own unscaled native pixel size
    // and the real, current desktop work area, return the largest scale
    // (at or below the one requested) whose resulting window physically
    // fits. Never crops or exceeds the work area silently; never returns
    // null -- Compact is the guaranteed floor, and Compact x the native
    // frame (826x490) is expected to fit any desktop this launcher
    // targets.
    public static LauncherScaleOption FitToWorkArea(
        double nativeWidth, double nativeHeight,
        double workAreaWidth, double workAreaHeight,
        LauncherScaleOption requested)
    {
        var candidates = LauncherScaleOptions.All
            .Where(option => option.Factor <= requested.Factor)
            .OrderByDescending(option => option.Factor);

        foreach (var option in candidates)
        {
            if (nativeWidth * option.Factor <= workAreaWidth &&
                nativeHeight * option.Factor <= workAreaHeight)
            {
                return option;
            }
        }

        // Nothing at or below the request fits (an unusually small
        // desktop) -- Compact is still the safest available floor rather
        // than throwing or silently exceeding the work area.
        return LauncherScaleOptions.All[LauncherScaleOptions.IndexOf(LauncherScaleLevel.Compact)];
    }
}
