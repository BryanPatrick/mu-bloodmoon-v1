using System.IO;
using System.IO.Compression;

namespace BloodMoon.Launcher.Services;

public sealed class BackupService
{
    private readonly string _backupRoot = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "BloodMoon",
        "Launcher",
        "Backups");

    public Task<string> CreateAsync(string gameRoot, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_backupRoot);
        var archivePath = Path.Combine(
            _backupRoot,
            $"client-{DateTimeOffset.Now:yyyyMMdd-HHmmss}.zip");

        return Task.Run(() =>
        {
            using var archive = ZipFile.Open(archivePath, ZipArchiveMode.Create);
            foreach (var file in Directory.EnumerateFiles(gameRoot, "*", SearchOption.AllDirectories))
            {
                cancellationToken.ThrowIfCancellationRequested();
                var relativePath = Path.GetRelativePath(gameRoot, file);
                if (file.StartsWith(_backupRoot, StringComparison.OrdinalIgnoreCase) ||
                    relativePath.StartsWith(
                        $".bloodmoon{Path.DirectorySeparatorChar}",
                        StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                archive.CreateEntryFromFile(file, relativePath, CompressionLevel.Fastest);
            }

            return archivePath;
        }, cancellationToken);
    }

    public Task<string> RestoreLatestAsync(string gameRoot, CancellationToken cancellationToken = default)
    {
        var latest = Directory.Exists(_backupRoot)
            ? Directory.EnumerateFiles(_backupRoot, "client-*.zip")
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault()
            : null;

        if (latest is null)
        {
            throw new FileNotFoundException("Ainda não existe backup local do cliente.");
        }

        return Task.Run(() =>
        {
            using var archive = ZipFile.OpenRead(latest);
            foreach (var entry in archive.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (string.IsNullOrEmpty(entry.Name))
                {
                    continue;
                }

                var destination = PathGuard.ResolveInside(gameRoot, entry.FullName);
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                entry.ExtractToFile(destination, true);
            }

            return latest;
        }, cancellationToken);
    }
}
