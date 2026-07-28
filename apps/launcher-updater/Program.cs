using System.Diagnostics;

if (args.Length != 3 ||
    !int.TryParse(args[0], out var launcherProcessId))
{
    return 2;
}

var targetPath = Path.GetFullPath(args[1]);
var stagedPath = Path.GetFullPath(args[2]);
var backupPath = $"{targetPath}.previous";

try
{
    try
    {
        using var launcher = Process.GetProcessById(launcherProcessId);
        await launcher.WaitForExitAsync();
    }
    catch (ArgumentException)
    {
        // O launcher já encerrou.
    }

    if (!File.Exists(stagedPath))
    {
        return 3;
    }
    if (File.Exists(targetPath))
    {
        File.Move(targetPath, backupPath, true);
    }
    File.Move(stagedPath, targetPath, true);
    Process.Start(new ProcessStartInfo
    {
        FileName = targetPath,
        WorkingDirectory = Path.GetDirectoryName(targetPath)!,
        UseShellExecute = true
    });
    return 0;
}
catch
{
    if (!File.Exists(targetPath) && File.Exists(backupPath))
    {
        File.Move(backupPath, targetPath, true);
    }
    return 1;
}
