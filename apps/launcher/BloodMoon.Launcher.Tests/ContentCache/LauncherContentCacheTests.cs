using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services.ContentCache;
using Xunit;

namespace BloodMoon.Launcher.Tests.ContentCache;

public sealed class LauncherContentCacheTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "bm-launcher-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static ContentCacheEnvelope<LauncherBootstrap> Envelope(string contentVersion) => new()
    {
        SchemaVersion = 1,
        ContentVersion = contentVersion,
        FetchedAt = DateTimeOffset.UtcNow,
        PayloadHash = LauncherContentCache.ComputeHash(new LauncherBootstrap { ContentVersion = contentVersion }),
        Payload = new LauncherBootstrap { ContentVersion = contentVersion }
    };

    [Fact]
    public async Task LoadAsync_WithNoCacheFile_ReturnsNull()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        Assert.Null(await cache.LoadAsync(CancellationToken.None));
    }

    [Fact]
    public async Task SaveThenLoad_RoundTripsTheEnvelope()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var envelope = Envelope("v1");

        await cache.SaveAsync(envelope, CancellationToken.None);
        var loaded = await cache.LoadAsync(CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal("v1", loaded!.ContentVersion);
    }

    [Fact]
    public async Task SaveAsync_NeverLeavesATempFileBehind()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        await cache.SaveAsync(Envelope("v1"), CancellationToken.None);

        var leftovers = Directory.GetFiles(_dir, "*.tmp");
        Assert.Empty(leftovers);
    }

    [Fact]
    public async Task SaveAsync_PromotesAtomically_SecondSaveNeverLeavesThePreviousFilePartial()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        await cache.SaveAsync(Envelope("v1"), CancellationToken.None);
        await cache.SaveAsync(Envelope("v2"), CancellationToken.None);

        var loaded = await cache.LoadAsync(CancellationToken.None);
        Assert.Equal("v2", loaded!.ContentVersion);
        // Exactly one cache file on disk -- the promote replaced the old
        // one in a single atomic move, it didn't leave two versions around.
        Assert.Single(Directory.GetFiles(_dir, "bootstrap.json"));
    }

    [Fact]
    public async Task LoadAsync_WithCorruptedJson_ReturnsNullInsteadOfThrowing()
    {
        Directory.CreateDirectory(_dir);
        await File.WriteAllTextAsync(Path.Combine(_dir, "bootstrap.json"), "{ this is not valid json");

        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var loaded = await cache.LoadAsync(CancellationToken.None);

        Assert.Null(loaded);
    }

    [Fact]
    public async Task LoadAsync_WithTamperedPayloadHash_TreatsItAsNoCache()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var envelope = Envelope("v1");
        await cache.SaveAsync(envelope, CancellationToken.None);

        // Simulate corruption/tampering: the on-disk payload no longer
        // matches its recorded hash.
        var path = Path.Combine(_dir, "bootstrap.json");
        var text = await File.ReadAllTextAsync(path);
        text = text.Replace("\"v1\"", "\"tampered\"");
        await File.WriteAllTextAsync(path, text);

        var loaded = await cache.LoadAsync(CancellationToken.None);
        Assert.Null(loaded);
    }

    [Fact]
    public async Task LoadAsync_WhenNothingHasEverWrittenTheDirectory_DoesNotCreateIt()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        await cache.LoadAsync(CancellationToken.None);
        Assert.False(Directory.Exists(_dir));
    }
}
