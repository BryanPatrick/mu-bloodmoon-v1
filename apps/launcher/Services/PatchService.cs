using System.Buffers;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

public sealed class PatchService : IDisposable
{
    private const string ManifestPublicKeyPem = """
-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA22FXnNT7qgqkwvU6/of4
CXVAlT3SH8Qfms8c4jjgwAxVFwPmqrB9x2SBcJKicEfd+NSvVYsJwwOF7VtiI+XA
57JjfkE0LfZF40M0EY2T+ztWYaFinqgRnqZ8kcUpB+GHFo0yEe0Jk6O/er+fwXGa
GS6agMMppJVdpENLifcVcu+XojLzo15WN8XQDrNc2Dk5QVFkFFuOZbNFmQfvsJCR
mPLMx4IJivTM1bm8PEUDzZFzJknynxD8uBu77wjY+qcRl4dkpFHPvBfFO6WR5vFL
g5Cf7GmtCrPrg3MPixLYpbWIF90tt/Bqnyo/3Yg3iqg0qwg7S5v2eQBTaQeWIrwN
O3VCbJb4wnmo6LFwJ5/db9FWmktQmJzQ+iGsGGNmUGGb6HPmfpkczOpYLXpds8jq
bmxD7O9QweXGut4Sjoa/iQGNe2dLCWcaHlLL0WhFsFEgDUKocGV9RyWroBTOpbRX
lIlPqttw2ycg3qtxk6hUEwuNjhMPS8s2pHR2eUzRpv2xAgMBAAE=
-----END PUBLIC KEY-----
""";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient = new()
    {
        Timeout = TimeSpan.FromMinutes(15)
    };

    public async Task<PatchManifest> GetManifestAsync(
        string manifestUrl,
        bool requireSignature = false,
        CancellationToken cancellationToken = default)
    {
        var uri = RequireHttps(manifestUrl);
        await using var stream = await _httpClient.GetStreamAsync(uri, cancellationToken);
        var manifest = await JsonSerializer.DeserializeAsync<PatchManifest>(
            stream,
            JsonOptions,
            cancellationToken)
            ?? throw new InvalidDataException("O manifesto de atualização está vazio.");
        ValidateManifest(manifest, requireSignature);
        return manifest;
    }

    public async Task<IReadOnlyList<PatchFile>> FindInvalidFilesAsync(
        string gameRoot,
        PatchManifest manifest,
        IProgress<PatchProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var invalid = new List<PatchFile>();
        var processedBytes = 0L;
        var totalBytes = manifest.Files.Sum(file => Math.Max(0, file.Size));

        for (var index = 0; index < manifest.Files.Count; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var patchFile = manifest.Files[index];
            var localPath = PathGuard.ResolveInside(gameRoot, patchFile.Path);
            var valid = File.Exists(localPath) &&
                        string.Equals(
                            await ComputeSha256Async(localPath, cancellationToken),
                            patchFile.Sha256,
                            StringComparison.OrdinalIgnoreCase);
            if (!valid)
            {
                invalid.Add(patchFile);
            }

            processedBytes += Math.Max(0, patchFile.Size);
            progress?.Report(new PatchProgress(
                patchFile.Path,
                index + 1,
                manifest.Files.Count,
                processedBytes,
                totalBytes));
        }

        return invalid;
    }

    public IReadOnlyList<string> FindPendingDeletions(string gameRoot, PatchManifest manifest) =>
        manifest.Delete
            .Where(path => File.Exists(PathGuard.ResolveInside(gameRoot, path)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public async Task ApplyAsync(
        string gameRoot,
        PatchManifest manifest,
        IReadOnlyCollection<PatchFile> files,
        IProgress<PatchProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        if (files.Count == 0 && manifest.Delete.Count == 0)
        {
            return;
        }

        var baseUri = RequireHttps(manifest.BaseUrl);
        var transactionRoot = Path.Combine(
            gameRoot,
            ".bloodmoon",
            "transactions",
            DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff"));
        var stagedRoot = Path.Combine(transactionRoot, "staged");
        var backupRoot = Path.Combine(transactionRoot, "backup");
        Directory.CreateDirectory(stagedRoot);
        Directory.CreateDirectory(backupRoot);

        var totalBytes = files.Sum(file => Math.Max(0, file.Size));
        var downloadedBeforeCurrent = 0L;
        var completed = 0;

        foreach (var patchFile in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var remoteUri = new Uri(baseUri, patchFile.Path.Replace('\\', '/'));
            var stagedPath = PathGuard.ResolveInside(stagedRoot, patchFile.Path);
            Directory.CreateDirectory(Path.GetDirectoryName(stagedPath)!);

            using var response = await _httpClient.GetAsync(
                remoteUri,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            response.EnsureSuccessStatusCode();
            await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
            await using var destination = File.Create(stagedPath);

            var buffer = ArrayPool<byte>.Shared.Rent(128 * 1024);
            var currentBytes = 0L;
            try
            {
                int read;
                while ((read = await source.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    currentBytes += read;
                    progress?.Report(new PatchProgress(
                        patchFile.Path,
                        completed,
                        files.Count,
                        downloadedBeforeCurrent + currentBytes,
                        totalBytes));
                }
            }
            finally
            {
                ArrayPool<byte>.Shared.Return(buffer);
            }

            await destination.FlushAsync(cancellationToken);
            destination.Close();
            var stagedHash = await ComputeSha256Async(stagedPath, cancellationToken);
            if (!string.Equals(stagedHash, patchFile.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidDataException($"Falha de integridade no arquivo {patchFile.Path}.");
            }

            downloadedBeforeCurrent += currentBytes;
            completed++;
        }

        foreach (var patchFile in files)
        {
            var stagedPath = PathGuard.ResolveInside(stagedRoot, patchFile.Path);
            var targetPath = PathGuard.ResolveInside(gameRoot, patchFile.Path);
            var backupPath = PathGuard.ResolveInside(backupRoot, patchFile.Path);
            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
            if (File.Exists(targetPath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(backupPath)!);
                File.Move(targetPath, backupPath, true);
            }
            File.Move(stagedPath, targetPath, true);
        }

        foreach (var relativePath in manifest.Delete.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var targetPath = PathGuard.ResolveInside(gameRoot, relativePath);
            if (!File.Exists(targetPath))
            {
                continue;
            }

            var backupPath = PathGuard.ResolveInside(backupRoot, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(backupPath)!);
            File.Move(targetPath, backupPath, true);
        }

        var transaction = new PatchTransaction
        {
            Version = manifest.Version,
            AppliedAt = DateTimeOffset.UtcNow,
            Updated = files.Select(file => file.Path).ToList(),
            Deleted = manifest.Delete.ToList()
        };
        await File.WriteAllTextAsync(
            Path.Combine(transactionRoot, "transaction.json"),
            JsonSerializer.Serialize(transaction, new JsonSerializerOptions { WriteIndented = true }),
            cancellationToken);
    }

    public async Task<string> RollbackLatestAsync(
        string gameRoot,
        CancellationToken cancellationToken = default)
    {
        var transactionsRoot = Path.Combine(gameRoot, ".bloodmoon", "transactions");
        var transactionRoot = Directory.Exists(transactionsRoot)
            ? Directory.EnumerateDirectories(transactionsRoot)
                .OrderByDescending(path => path, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(path => File.Exists(Path.Combine(path, "transaction.json")))
            : null;
        if (transactionRoot is null)
        {
            throw new FileNotFoundException("Ainda não existe uma atualização para reverter.");
        }

        var transactionPath = Path.Combine(transactionRoot, "transaction.json");
        var transaction = JsonSerializer.Deserialize<PatchTransaction>(
            await File.ReadAllTextAsync(transactionPath, cancellationToken),
            JsonOptions) ?? throw new InvalidDataException("Histórico de atualização inválido.");
        var backupRoot = Path.Combine(transactionRoot, "backup");
        foreach (var relativePath in transaction.Updated.Concat(transaction.Deleted).Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var targetPath = PathGuard.ResolveInside(gameRoot, relativePath);
            var backupPath = PathGuard.ResolveInside(backupRoot, relativePath);
            if (File.Exists(backupPath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);
                File.Move(backupPath, targetPath, true);
            }
            else if (transaction.Updated.Contains(relativePath) && File.Exists(targetPath))
            {
                File.Delete(targetPath);
            }
        }

        File.Move(transactionPath, Path.Combine(transactionRoot, "transaction.rolled-back.json"), true);
        return transaction.Version;
    }

    public static string BuildCanonicalContent(PatchManifest manifest)
    {
        var lines = new List<string>
        {
            $"schemaVersion={manifest.SchemaVersion}",
            $"channel={manifest.Channel.Trim().ToLowerInvariant()}",
            $"version={manifest.Version.Trim()}",
            $"baseUrl={manifest.BaseUrl.TrimEnd('/')}/"
        };
        lines.AddRange(manifest.Files
            .OrderBy(file => file.Path, StringComparer.OrdinalIgnoreCase)
            .Select(file =>
                $"file={file.Path.Replace('\\', '/').ToLowerInvariant()}|{file.Sha256.ToUpperInvariant()}|{file.Size}"));
        lines.AddRange(manifest.Delete
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .Select(path => $"delete={path.Replace('\\', '/').ToLowerInvariant()}"));
        if (manifest.Launcher is not null)
        {
            lines.Add(
                $"launcher={manifest.Launcher.Version}|{manifest.Launcher.Url}|{manifest.Launcher.Sha256.ToUpperInvariant()}|{manifest.Launcher.Size}");
        }
        return string.Join("\n", lines);
    }

    public static void ValidateManifest(PatchManifest manifest, bool requireSignature)
    {
        RequireHttps(manifest.BaseUrl);
        foreach (var patchFile in manifest.Files)
        {
            ValidateSha256(patchFile.Sha256, patchFile.Path);
            PathGuard.ResolveInside(Path.GetTempPath(), patchFile.Path);
        }
        foreach (var relativePath in manifest.Delete)
        {
            PathGuard.ResolveInside(Path.GetTempPath(), relativePath);
        }
        if (manifest.Launcher is not null)
        {
            RequireHttps(manifest.Launcher.Url);
            ValidateSha256(manifest.Launcher.Sha256, "launcher");
        }

        var hasSignature = !string.IsNullOrWhiteSpace(manifest.ContentSha256) &&
                           !string.IsNullOrWhiteSpace(manifest.Signature);
        if (!hasSignature)
        {
            if (requireSignature)
            {
                throw new InvalidDataException("O manifesto não possui assinatura digital.");
            }
            return;
        }

        var canonical = BuildCanonicalContent(manifest);
        var contentHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
        if (!string.Equals(contentHash, manifest.ContentSha256, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("O conteúdo do manifesto foi alterado.");
        }
        if (ManifestPublicKeyPem.Contains("REPLACE_WITH_", StringComparison.Ordinal))
        {
            if (requireSignature)
            {
                throw new InvalidOperationException("A chave pública de atualização não foi configurada.");
            }
            return;
        }

        using var rsa = RSA.Create();
        rsa.ImportFromPem(ManifestPublicKeyPem);
        var valid = rsa.VerifyData(
            Encoding.UTF8.GetBytes(manifest.ContentSha256.ToUpperInvariant()),
            Convert.FromBase64String(manifest.Signature),
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);
        if (!valid)
        {
            throw new InvalidDataException("Assinatura digital do manifesto inválida.");
        }
    }

    private static Uri RequireHttps(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("Atualizações só podem ser baixadas por HTTPS.");
        }
        return uri;
    }

    private static void ValidateSha256(string value, string label)
    {
        if (value.Length != 64 || value.Any(character => !Uri.IsHexDigit(character)))
        {
            throw new InvalidDataException($"SHA-256 inválido em {label}.");
        }
    }

    private static async Task<string> ComputeSha256Async(
        string path,
        CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            128 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan);
        var hash = await SHA256.HashDataAsync(stream, cancellationToken);
        return Convert.ToHexString(hash);
    }

    public void Dispose() => _httpClient.Dispose();
}

public sealed class PatchTransaction
{
    public string Version { get; set; } = "0.0.0";
    public DateTimeOffset AppliedAt { get; set; }
    public List<string> Updated { get; set; } = [];
    public List<string> Deleted { get; set; } = [];
}
