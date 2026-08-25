namespace BloodMoon.Launcher.Services;

// Part G -- the six approved profiles, real numbers, never Small/Medium/
// Large labels. Maximized has no fixed Width/Height (0 sentinel) -- Part K
// computes its real bounds from the work area at runtime.
public enum ResolutionProfileKey
{
    Baseline1280x720,
    Widescreen1600x900,
    Widescreen1920x1080,
    Wide1600x720,
    Wide1920x800,
    Maximized
}

public sealed record ResolutionProfile(ResolutionProfileKey Key, string Label, double Width, double Height, bool IsWide);

public static class ResolutionProfiles
{
    public static readonly IReadOnlyList<ResolutionProfile> All =
    [
        new(ResolutionProfileKey.Baseline1280x720, "1280 × 720", 1280, 720, false),
        new(ResolutionProfileKey.Widescreen1600x900, "1600 × 900", 1600, 900, false),
        new(ResolutionProfileKey.Widescreen1920x1080, "1920 × 1080", 1920, 1080, false),
        new(ResolutionProfileKey.Wide1600x720, "1600 × 720 — WIDE", 1600, 720, true),
        new(ResolutionProfileKey.Wide1920x800, "1920 × 800 — WIDE", 1920, 800, true),
        new(ResolutionProfileKey.Maximized, "MAXIMIZADO", 0, 0, true)
    ];

    public static ResolutionProfile ForIndex(int index) =>
        index >= 0 && index < All.Count ? All[index] : All[0];

    public static int IndexOf(ResolutionProfileKey key)
    {
        for (var i = 0; i < All.Count; i++)
        {
            if (All[i].Key == key) return i;
        }
        return 0;
    }
}

// Part H/I -- baseline-relative scaling, bounded, and deliberately NOT
// uniform across every region. Nav/utility/updater/small typography stay
// at fixed pixel sizes in the shell's XAML (the simplest, most literal way
// to satisfy "don't scale everything blindly" -- they simply don't scale).
// This class only computes the bounded multiplier for the regions that
// Part I explicitly calls expandable: central content, hero, card/table
// grids, and their headline typography.
public static class ResolutionEngine
{
    public const double BaselineWidth = 1280;
    public const double BaselineHeight = 720;

    // Expandable regions grow with window width but never below baseline
    // (min 1.0) and never past a sane ceiling (max 1.6) -- Part H's
    // "sensible min/max constraints."
    public static double ContentScale(double actualWidth) =>
        actualWidth <= 0 ? 1.0 : Math.Clamp(actualWidth / BaselineWidth, 1.0, 1.6);

    // Typography scales more conservatively than raw content area -- large
    // headline text at 1.6x content scale would overwhelm the compact
    // launcher proportions Part core visual language calls for.
    public static double TypographyScale(double actualWidth) =>
        actualWidth <= 0 ? 1.0 : Math.Clamp(1.0 + (actualWidth / BaselineWidth - 1.0) * 0.4, 1.0, 1.25);

    public static double ScaledFontSize(double baseSize, double actualWidth) =>
        Math.Round(baseSize * TypographyScale(actualWidth), 1);

    // Part J -- WIDE profiles hand their extra horizontal space to content,
    // not the side nav. The nav column's pixel width is intentionally NOT
    // a function of window width at all (constant in the shell's XAML);
    // this only reports the content column's effective share so a view can
    // decide how much of that extra space its hero/grid should claim.
    public static double NavColumnWidth(bool isWide) => isWide ? 196 : 220;
}
