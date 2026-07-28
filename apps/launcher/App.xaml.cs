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
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(outputPath))!);
        window.ShowActivated = false;
        window.Left = -10000;
        window.Top = -10000;
        window.Show();
        await window.RenderPreviewAsync(outputPath);
        window.Close();
        Shutdown();
    }
}
