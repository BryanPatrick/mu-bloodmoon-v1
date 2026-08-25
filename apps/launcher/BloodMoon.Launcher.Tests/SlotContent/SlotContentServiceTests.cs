using System.Net.Http;
using BloodMoon.Launcher.Models;
using BloodMoon.Launcher.Services;
using BloodMoon.Launcher.Services.ContentCache;
using BloodMoon.Launcher.Tests.Fakes;
using Xunit;

namespace BloodMoon.Launcher.Tests.SlotContent;

// Mirrors LauncherContentServiceTests' exact scenarios (Part B/AB's boot
// sequence -- fresh -> compare version -> cache -> packaged/empty
// fallback) applied to GET /launcher/content instead of bootstrap.
public sealed class SlotContentServiceTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "bm-launcher-slot-tests-" + Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_dir)) Directory.Delete(_dir, recursive: true);
    }

    private static LauncherContentPayload Payload(int contentVersion, int schemaVersion = 1) => new()
    {
        SchemaVersion = schemaVersion,
        ContentVersion = contentVersion,
        Slots = [new ResolvedSlot { Id = "home.hero.title", Page = "HOME", Status = "PUBLISHED" }]
    };

    [Fact]
    public async Task GetContentAsync_WhenApiSucceeds_ReturnsFreshAndPersistsCache()
    {
        var source = new FakeSlotContentSource { Response = Payload(1) };
        var cache = new SlotContentCache("slot-content.json", _dir);
        var service = new SlotContentService(source, cache);

        var result = await service.GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Fresh, result.Source);
        Assert.False(result.IsStale);
        Assert.Equal(1, result.Content.ContentVersion);
        Assert.NotNull(await cache.LoadAsync(CancellationToken.None));
    }

    [Fact]
    public async Task GetContentAsync_WhenApiIsOffline_FallsBackToLastValidCache()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var warmSource = new FakeSlotContentSource { Response = Payload(1) };
        await new SlotContentService(warmSource, cache).GetContentAsync(null, CancellationToken.None);

        var offlineSource = new FakeSlotContentSource { ThrowOnNextCall = new HttpRequestException("offline") };
        var result = await new SlotContentService(offlineSource, cache).GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Cache, result.Source);
        Assert.True(result.IsStale);
        Assert.Equal(1, result.Content.ContentVersion);
    }

    [Fact]
    public async Task GetContentAsync_WhenApiIsOfflineAndNoCacheExists_FallsBackToEmptyPayload()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var source = new FakeSlotContentSource { ThrowOnNextCall = new HttpRequestException("offline") };
        var service = new SlotContentService(source, cache);

        var result = await service.GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.PackagedFallback, result.Source);
        Assert.True(result.IsStale);
        // No bundled slot-content file exists (unlike bootstrap's
        // fallback-content.json) -- an empty slot list is the correct
        // last resort, since every individual slot access already
        // degrades to its own neutral default (SlotRegistryMapper).
        Assert.Empty(result.Content.Slots);
    }

    [Fact]
    public async Task GetContentAsync_WhenServerSendsAnUnsupportedSchemaVersion_FallsBackToCacheWithoutCrashing()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var warmSource = new FakeSlotContentSource { Response = Payload(1, schemaVersion: 1) };
        await new SlotContentService(warmSource, cache).GetContentAsync(null, CancellationToken.None);

        var futureSource = new FakeSlotContentSource { Response = Payload(2, schemaVersion: 99) };
        var result = await new SlotContentService(futureSource, cache).GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Cache, result.Source);
        Assert.Equal(1, result.Content.ContentVersion);
    }

    [Fact]
    public async Task GetContentAsync_WhenContentVersionUnchanged_DoesNotRewriteTheCacheFile()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var source = new FakeSlotContentSource { Response = Payload(1) };
        var service = new SlotContentService(source, cache);

        await service.GetContentAsync(null, CancellationToken.None);
        var firstWriteTime = File.GetLastWriteTimeUtc(Path.Combine(_dir, "slot-content.json"));
        await Task.Delay(50);
        await service.GetContentAsync(null, CancellationToken.None);
        var secondWriteTime = File.GetLastWriteTimeUtc(Path.Combine(_dir, "slot-content.json"));

        Assert.Equal(firstWriteTime, secondWriteTime);
    }

    // Part BF's "malformed CMS payload" case -- a slot with no explicit
    // Value (as a truncated/malformed API response might produce) must
    // still cache and round-trip cleanly, never crash the whole boot
    // sequence. Regression test for the real bug this suite caught: a
    // default(JsonElement) (ValueKind Undefined) used to throw inside
    // JsonSerializer.Serialize during ComputeHash.
    [Fact]
    public async Task GetContentAsync_WithASlotMissingAnExplicitValue_CachesAndReturnsWithoutCrashing()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var malformed = new LauncherContentPayload
        {
            SchemaVersion = 1,
            ContentVersion = 1,
            Slots = [new ResolvedSlot { Id = "home.hero.title", Page = "HOME", Status = "UNSET" }]
        };
        var source = new FakeSlotContentSource { Response = malformed };
        var service = new SlotContentService(source, cache);

        var result = await service.GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Fresh, result.Source);
        Assert.Single(result.Content.Slots);
        var mapper = new SlotRegistryMapper(result.Content.Slots);
        Assert.Null(mapper.GetText("home.hero.title"));
    }

    [Fact]
    public void IsSchemaSupported_OnlyAcceptsTheCurrentVersion()
    {
        Assert.True(SlotContentService.IsSchemaSupported(1));
        Assert.False(SlotContentService.IsSchemaSupported(2));
        Assert.False(SlotContentService.IsSchemaSupported(0));
    }
}
