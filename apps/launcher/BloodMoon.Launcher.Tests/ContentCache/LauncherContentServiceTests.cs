using System.Net.Http;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services.ContentCache;
using BloodMoon.Launcher.Tests.Fakes;
using Xunit;

namespace BloodMoon.Launcher.Tests.ContentCache;

public sealed class LauncherContentServiceTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "bm-launcher-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static LauncherBootstrap Bootstrap(string contentVersion, int schemaVersion = 1) => new()
    {
        SchemaVersion = schemaVersion,
        ContentVersion = contentVersion,
        Server = new LauncherServer { Status = "ONLINE" }
    };

    [Fact]
    public async Task GetContentAsync_WhenApiSucceeds_ReturnsFreshAndPersistsCache()
    {
        var source = new FakeBootstrapSource { Response = Bootstrap("v1") };
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var service = new LauncherContentService(source, cache);

        var result = await service.GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.Fresh, result.Source);
        Assert.False(result.IsStale);
        Assert.Equal("v1", result.Bootstrap.ContentVersion);
        Assert.NotNull(await cache.LoadAsync(CancellationToken.None));
    }

    // Part B: "Se API falhar: usar último cache válido."
    [Fact]
    public async Task GetContentAsync_WhenApiIsOffline_FallsBackToLastValidCache()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var warmSource = new FakeBootstrapSource { Response = Bootstrap("v1") };
        await new LauncherContentService(warmSource, cache).GetContentAsync(CancellationToken.None);

        var offlineSource = new FakeBootstrapSource { ThrowOnNextCall = new HttpRequestException("offline") };
        var result = await new LauncherContentService(offlineSource, cache).GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.Cache, result.Source);
        Assert.True(result.IsStale);
        Assert.Equal("v1", result.Bootstrap.ContentVersion);
    }

    // Part B: "Se não existir cache: usar conteúdo fallback empacotado."
    [Fact]
    public async Task GetContentAsync_WhenApiIsOfflineAndNoCacheExists_FallsBackToPackagedContent()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var source = new FakeBootstrapSource { ThrowOnNextCall = new HttpRequestException("offline") };
        var service = new LauncherContentService(source, cache, () => Bootstrap("packaged"));

        var result = await service.GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.PackagedFallback, result.Source);
        Assert.True(result.IsStale);
        Assert.Equal("packaged", result.Bootstrap.ContentVersion);
    }

    // Part AB: an unsupported schemaVersion must never crash the Launcher --
    // it falls back exactly like an offline API.
    [Fact]
    public async Task GetContentAsync_WhenServerSendsAnUnsupportedSchemaVersion_FallsBackToCacheWithoutCrashing()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var warmSource = new FakeBootstrapSource { Response = Bootstrap("v1", schemaVersion: 1) };
        await new LauncherContentService(warmSource, cache).GetContentAsync(CancellationToken.None);

        var futureSource = new FakeBootstrapSource { Response = Bootstrap("v2", schemaVersion: 99) };
        var result = await new LauncherContentService(futureSource, cache).GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.Cache, result.Source);
        Assert.Equal("v1", result.Bootstrap.ContentVersion);
    }

    [Fact]
    public async Task GetContentAsync_WhenServerSendsAnUnsupportedSchemaVersionAndNoCacheExists_FallsBackToPackaged()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var source = new FakeBootstrapSource { Response = Bootstrap("v99", schemaVersion: 99) };
        var service = new LauncherContentService(source, cache, () => Bootstrap("packaged"));

        var result = await service.GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.PackagedFallback, result.Source);
    }

    // Part Z: don't write to disk on every poll when nothing changed.
    [Fact]
    public async Task GetContentAsync_WhenContentVersionUnchanged_DoesNotRewriteTheCacheFile()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var source = new FakeBootstrapSource { Response = Bootstrap("v1") };
        var service = new LauncherContentService(source, cache);

        await service.GetContentAsync(CancellationToken.None);
        var firstWriteTime = File.GetLastWriteTimeUtc(Path.Combine(_dir, "bootstrap.json"));
        await Task.Delay(50);
        await service.GetContentAsync(CancellationToken.None);
        var secondWriteTime = File.GetLastWriteTimeUtc(Path.Combine(_dir, "bootstrap.json"));

        Assert.Equal(firstWriteTime, secondWriteTime);
    }

    // A malformed/unparseable response (e.g. the server returned HTML for a
    // 502, or truncated JSON) surfaces the same way as any other bootstrap
    // fetch failure: ILauncherBootstrapSource.GetBootstrapAsync throws
    // (System.Text.Json throws JsonException for bad JSON, same as
    // LauncherApiClient.ReadAsync already does today), and the service
    // falls back exactly like an offline API -- never a crash.
    [Fact]
    public async Task GetContentAsync_WhenTheBootstrapResponseIsInvalid_FallsBackWithoutCrashing()
    {
        var cache = new LauncherContentCache("bootstrap.json", _dir);
        var source = new FakeBootstrapSource { ThrowOnNextCall = new InvalidOperationException("invalid payload") };
        var service = new LauncherContentService(source, cache, () => Bootstrap("packaged"));

        var result = await service.GetContentAsync(CancellationToken.None);

        Assert.Equal(ContentSource.PackagedFallback, result.Source);
    }

    [Fact]
    public void IsSchemaSupported_OnlyAcceptsTheCurrentVersion()
    {
        Assert.True(LauncherContentService.IsSchemaSupported(1));
        Assert.False(LauncherContentService.IsSchemaSupported(2));
        Assert.False(LauncherContentService.IsSchemaSupported(0));
    }
}
