using System.Windows;
using System.Windows.Media;

namespace BloodMoon.Launcher.Services;

// Part AT -- maps a CMS visual token (a plain string, e.g. "CRIMSON") to a
// real local WPF resource. The CMS never sends a Brush, a hex color, or a
// FontFamily -- only the token name (VISUAL_TOKEN_VALUES in slot-registry.
// ts); this is the one place that turns a token into something WPF can
// actually render, and it never falls through to anything other than a
// known-safe default for an unrecognized token.
public static class TokenMapper
{
    public static Brush ColorBrush(string? token) => token switch
    {
        "TEXT_PRIMARY" => Resource<Brush>("Brush.TextPrimary"),
        "TEXT_MUTED" => Resource<Brush>("Brush.TextMuted"),
        "CRIMSON" => Resource<Brush>("Brush.Crimson"),
        "GOLD" => Resource<Brush>("Brush.Gold"),
        "PURPLE" => Resource<Brush>("Brush.Purple"),
        "SUCCESS" => Resource<Brush>("Brush.Success"),
        "WARNING" => Resource<Brush>("Brush.Warning"),
        _ => Resource<Brush>("Brush.TextPrimary")
    };

    public static FontFamily Font(string? token) => token switch
    {
        "DISPLAY" => Resource<FontFamily>("Font.Display"),
        "SERIF" => Resource<FontFamily>("Font.Serif"),
        "UI" => Resource<FontFamily>("Font.Ui"),
        "COMPACT" => Resource<FontFamily>("Font.Compact"),
        _ => Resource<FontFamily>("Font.Compact")
    };

    public static double FontSize(string? token) => token switch
    {
        "SM" => Resource<double>("FontSize.Sm"),
        "MD" => Resource<double>("FontSize.Md"),
        "LG" => Resource<double>("FontSize.Lg"),
        "XL" => Resource<double>("FontSize.Xl"),
        "DISPLAY" => Resource<double>("FontSize.Display"),
        _ => Resource<double>("FontSize.Md")
    };

    public static TextAlignment Alignment(string? token) => token switch
    {
        "START" => TextAlignment.Left,
        "CENTER" => TextAlignment.Center,
        "END" => TextAlignment.Right,
        _ => TextAlignment.Left
    };

    public static double Opacity(string? token) => token switch
    {
        "FULL" => 1.0,
        "MUTED" => 0.72,
        "FAINT" => 0.45,
        _ => 1.0
    };

    private static T Resource<T>(string key) => (T)Application.Current.Resources[key];
}
