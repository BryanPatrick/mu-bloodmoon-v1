using System.IO;

namespace BloodMoon.Launcher.Services;

public static class PathGuard
{
    public static string ResolveInside(string rootDirectory, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
        {
            throw new InvalidDataException("O manifesto contém um caminho inválido.");
        }

        var normalizedRoot = Path.GetFullPath(rootDirectory)
            .TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var resolved = Path.GetFullPath(Path.Combine(normalizedRoot, relativePath));

        if (!resolved.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("O manifesto tentou acessar um caminho fora do cliente.");
        }

        return resolved;
    }
}
