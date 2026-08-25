using System.IO;
using System.Windows;

namespace BloodMoon.Launcher;

public partial class App : Application
{
    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

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
        window.ShowActivated = false;
        window.Left = -10000;
        window.Top = -10000;
        window.Show();
        // Loaded (async) must finish -- pages/bootstrap/slot content are
        // populated there -- before navigating for a QA screenshot.
        await Task.Delay(TimeSpan.FromSeconds(2));
        if (pageArgument is not null &&
            Enum.TryParse<Services.Navigation.PageKey>(pageArgument.Split('=', 2)[1], out var page))
        {
            window.NavigateForPreview(page);
        }
        await window.RenderPreviewAsync(outputPath);
        window.Close();
        Shutdown();
    }
}
