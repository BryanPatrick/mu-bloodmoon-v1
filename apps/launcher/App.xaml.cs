using System.IO;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using BloodMoon.Launcher.Services;

namespace BloodMoon.Launcher;

public partial class App : Application
{
    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Scale/accessibility -- TextScale is resolved once, here, before
        // any page XAML is parsed. Typography.xaml's FontSize.* tokens are
        // consumed as StaticResource everywhere (baked in at XAML parse
        // time) -- this is the one point where overriding
        // Application.Resources[key] still reaches every page, because
        // MainWindow (and every page inside it) hasn't been constructed
        // yet. A later, live change requires a restart -- see
        // docs/launcher/launcher-scale-and-text-scale.md.
        var startupSettings = await new SettingsService().LoadAsync();
        ApplyTextScale(TextScaleOptions.ForIndex(startupSettings.TextScaleIndex).Factor);

        var window = new MainWindow();
        var previewArgument = e.Args.FirstOrDefault(value =>
            value.StartsWith("--render-preview=", StringComparison.OrdinalIgnoreCase));

        if (previewArgument is null)
        {
            MainWindow = window;
            window.Show();
            return;
        }

        var outputPath = previewArgument.Split('=', 2)[1].Trim('"');
        var pageArgument = e.Args.FirstOrDefault(value =>
            value.StartsWith("--render-preview-page=", StringComparison.OrdinalIgnoreCase));
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outputPath))!);
        RenderOptions.ProcessRenderMode = RenderMode.SoftwareOnly;
        window.PreviewMode = true;
        window.ShowActivated = false;
        window.Show();
        // Loaded (async) must finish -- pages/bootstrap/slot content are
        // populated there -- before navigating for a QA screenshot.
        await Task.Delay(TimeSpan.FromSeconds(2));
        if (pageArgument is not null &&
            Enum.TryParse<Services.Navigation.PageKey>(pageArgument.Split('=', 2)[1], out var page))
        {
            window.NavigateForPreview(page);
        }
        await Task.Delay(TimeSpan.FromMilliseconds(750));
        await window.RenderPreviewAsync(outputPath);
        window.Close();
        Shutdown();
    }

    // Rescales Typography.xaml's base FontSize.* values by the persisted
    // TextScale factor -- reads the CURRENT (already-merged, 100%) value as
    // its base rather than hardcoding the numbers a second time, so
    // Typography.xaml stays the single source of truth for what "Padrão"
    // actually means.
    private void ApplyTextScale(double factor)
    {
        if (factor == 1.0) return;
        foreach (var key in new[] { "FontSize.Sm", "FontSize.Md", "FontSize.Lg", "FontSize.Xl", "FontSize.Display" })
        {
            if (Resources[key] is double baseSize)
            {
                Resources[key] = Math.Round(baseSize * factor, 1);
            }
        }
    }
}
