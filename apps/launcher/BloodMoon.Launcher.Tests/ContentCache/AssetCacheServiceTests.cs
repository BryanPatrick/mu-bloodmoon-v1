using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services.ContentCache;
using BloodMoon.Launcher.Tests.Fakes;
using Xunit;

namespace BloodMoon.Launcher.Tests.ContentCache;

public sealed class AssetCacheServiceTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "bm-launcher-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static string Sha1Hex(byte[] bytes) => Convert.ToHexString(SHA1.HashData(bytes)).ToLowerInvariant();

    private static LauncherAssetManifestEntry Entry(byte[] bytes, string id = "asset-1", string? hash = null) => new()
    {
        Id = id,
        Url = "https://cdn.example/asset.webp",
        ContentType = "image/webp",
        Hash = hash ?? Sha1Hex(bytes),
        Size = bytes.Length,
        Kind = "NEWS_IMAGE"
    };

    [Fact]
    public async Task GetOrDownloadAsync_DownloadsAndCachesANewAsset()
    {
        var bytes = Encoding.UTF8.GetBytes("fake-image-bytes");
        var downloader = new FakeAssetDownloader { Bytes = bytes };
        var service = new AssetCacheService(downloader, _dir);

        var path = await service.GetOrDownloadAsync(Entry(bytes), CancellationToken.None);

        Assert.True(File.Exists(path));
        Assert.Equal(bytes, await File.ReadAllBytesAsync(path));
        Assert.Equal(1, downloader.CallCount);
    }

    // Part J: "Se hash já existe localmente: não baixar novamente."
    [Fact]
    public async Task GetOrDownloadAsync_WhenByteIdenticalCopyAlreadyCached_NeverHitsTheNetwork()
    {
        var bytes = Encoding.UTF8.GetBytes("fake-image-bytes");
        var downloader = new FakeAssetDownloader { Bytes = bytes };
        var service = new AssetCacheService(downloader, _dir);
        var entry = Entry(bytes);

        await service.GetOrDownloadAsync(entry, CancellationToken.None);
        Assert.Equal(1, downloader.CallCount);

        await service.GetOrDownloadAsync(entry, CancellationToken.None);
        Assert.Equal(1, downloader.CallCount); // still 1 -- second call was a pure cache hit.
    }

    // Part K: a mismatched download must never be promoted into the cache.
    [Fact]
    public async Task GetOrDownloadAsync_WhenDownloadedBytesDontMatchTheManifestHash_ThrowsAndDoesNotWriteAFile()
    {
        var expectedBytes = Encoding.UTF8.GetBytes("expected-bytes");
        var wrongBytes = Encoding.UTF8.GetBytes("some-other-bytes-entirely");
        var downloader = new FakeAssetDownloader { Bytes = wrongBytes };
        var service = new AssetCacheService(downloader, _dir);

        var ex = await Assert.ThrowsAsync<AssetCacheException>(
            () => service.GetOrDownloadAsync(Entry(expectedBytes), CancellationToken.None));

        Assert.Equal(AssetValidationFailure.HashMismatch, ex.Failure);
        Assert.False(Directory.Exists(_dir) && Directory.GetFiles(_dir).Any(f => !f.EndsWith(".tmp")));
    }

    [Fact]
    public async Task GetOrDownloadAsync_WhenDownloadedPayloadIsEmpty_Throws()
    {
        var downloader = new FakeAssetDownloader { Bytes = [] };
        var service = new AssetCacheService(downloader, _dir);

        var ex = await Assert.ThrowsAsync<AssetCacheException>(
            () => service.GetOrDownloadAsync(Entry([1, 2, 3]), CancellationToken.None));

        Assert.Equal(AssetValidationFailure.EmptyPayload, ex.Failure);
    }

    [Fact]
    public async Task GetOrDownloadAsync_WhenTheDownloadItselfFails_WrapsItAsAssetCacheException()
    {
        var downloader = new FakeAssetDownloader { ThrowOnNextCall = new HttpRequestException("network down") };
        var service = new AssetCacheService(downloader, _dir);

        var ex = await Assert.ThrowsAsync<AssetCacheException>(
            () => service.GetOrDownloadAsync(Entry([1, 2, 3]), CancellationToken.None));

        Assert.Equal(AssetValidationFailure.HttpFailure, ex.Failure);
    }

    // Part K/L: remote content is data, never trusted as executable/HTTP
    // beyond plain HTTPS.
    [Fact]
    public async Task DownloadAsync_RejectsNonHttpsUrls()
    {
        var downloader = new HttpAssetDownloader();
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => downloader.DownloadAsync("http://insecure.example/image.png", CancellationToken.None));
    }

    // Launcher Phase L3 -- the CMS asset library hashes with SHA-256
    // (LauncherAsset.sha256), not bootstrap's SHA-1 (ReferenceAsset.sha1).
    // A manifest entry carrying a SHA-1 hash must be rejected by a
    // Sha256-mode cache, and vice versa -- proves the algorithm selection
    // is real, not just accepted and ignored.
    [Fact]
    public async Task GetOrDownloadAsync_WithSha256Mode_AcceptsASha256HashAndRejectsASha1Hash()
    {
        var bytes = Encoding.UTF8.GetBytes("cms-asset-bytes");
        var sha256Hex = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var sha1Hex = Sha1Hex(bytes);

        var downloaderOk = new FakeAssetDownloader { Bytes = bytes };
        var serviceOk = new AssetCacheService(downloaderOk, _dir, AssetHashAlgorithm.Sha256);
        var path = await serviceOk.GetOrDownloadAsync(Entry(bytes, "cms-asset-1", sha256Hex), CancellationToken.None);
        Assert.True(File.Exists(path));

        var downloaderFail = new FakeAssetDownloader { Bytes = bytes };
        var serviceFail = new AssetCacheService(downloaderFail, _dir, AssetHashAlgorithm.Sha256);
        var ex = await Assert.ThrowsAsync<AssetCacheException>(
            () => serviceFail.GetOrDownloadAsync(Entry(bytes, "cms-asset-2", sha1Hex), CancellationToken.None));
        Assert.Equal(AssetValidationFailure.HashMismatch, ex.Failure);
    }
}
