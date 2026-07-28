using System.Diagnostics;
using System.IO;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class GameProcessService
{
    public void Start(LauncherSettings settings)
    {
        var executable = PathGuard.ResolveInside(AppContext.BaseDirectory, settings.GameExecutable);
        if (!File.Exists(executable))
        {
            throw new FileNotFoundException(
                "O launcher deve ficar na pasta do cliente, ao lado de main.exe.",
                executable);
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = executable,
            WorkingDirectory = Path.GetDirectoryName(executable)!,
            UseShellExecute = true
        });
    }
}
