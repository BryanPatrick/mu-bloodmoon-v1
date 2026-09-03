using System.Net.Http;
using System.Text.Json;
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

    [Fact]
    public async Task GetContentAsync_WhenCmsRecoversWithNewVersion_RefreshesCache()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var source = new FakeSlotContentSource { Response = Payload(1) };
        var service = new SlotContentService(source, cache);
        await service.GetContentAsync(null, CancellationToken.None);

        source.Response = Payload(2);
        var recovered = await service.GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Fresh, recovered.Source);
        Assert.False(recovered.IsStale);
        Assert.Equal(2, recovered.Content.ContentVersion);
        Assert.Equal("2", (await cache.LoadAsync(CancellationToken.None))!.ContentVersion);
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

    // Phase 2D Part 15 -- CMS_STALE_REMOTE_REMOVAL_LOCAL. Production could
    // not safely test this (Phase 2C: "zero linhas de slot... não existe
    // slot isolado/não público"); this exercises the same real code path
    // against local fake data instead of production. A slot that WAS
    // resolved (REMOTE_ASSET-equivalent) and then genuinely disappears
    // from a fresh server response (reverted to INHERIT_DEFAULT/NONE)
    // must not linger from a stale local cache -- SlotRegistryMapper is
    // rebuilt fresh from each GetContentAsync result, never merged with
    // a prior one, so the old value must be gone, not just unreachable.
    [Fact]
    public async Task GetContentAsync_WhenAPreviouslyResolvedSlotIsRemovedRemotely_TheNextFreshFetchNoLongerReturnsIt()
    {
        var cache = new SlotContentCache("slot-content.json", _dir);
        var withAsset = new LauncherContentPayload
        {
            SchemaVersion = 1,
            ContentVersion = 1,
            Slots = [new ResolvedSlot { Id = "home.brandLogo", Page = "HOME", Status = "PUBLISHED", Value = JsonDocument.Parse("\"asset-123\"").RootElement }]
        };
        var firstSource = new FakeSlotContentSource { Response = withAsset };
        var firstResult = await new SlotContentService(firstSource, cache).GetContentAsync(null, CancellationToken.None);
        var firstMapper = new SlotRegistryMapper(firstResult.Content.Slots);
        Assert.Equal("asset-123", firstMapper.GetAssetId("home.brandLogo"));

        // The slot is now entirely absent from a fresh server response --
        // reverted to INHERIT_DEFAULT, not merely emptied.
        var withoutAsset = new LauncherContentPayload { SchemaVersion = 1, ContentVersion = 2, Slots = [] };
        var secondSource = new FakeSlotContentSource { Response = withoutAsset };
        var secondResult = await new SlotContentService(secondSource, cache).GetContentAsync(null, CancellationToken.None);

        Assert.Equal(ContentSource.Fresh, secondResult.Source);
        var secondMapper = new SlotRegistryMapper(secondResult.Content.Slots);
        Assert.Null(secondMapper.GetAssetId("home.brandLogo"));
    }

    // Phase 2D Part 15 -- the three real CMS resolution states, tested
    // against local fake data (production has zero slot rows -- Phase 2C
    // could not safely exercise any of these there). All three route
    // through the identical, already-existing SlotRegistryMapper logic
    // (Services/SlotRegistryMapper.cs) -- no new resolution engine was
    // built, since none was needed: absence of a slot IS INHERIT_DEFAULT
    // by construction, a present slot with a value IS REMOTE_ASSET, and a
    // present-but-empty slot IS the NONE case, all already handled.
    [Fact]
    public void CMS_INHERIT_DEFAULT_LOCAL()
    {
        // A slot never resolved server-side simply isn't in the payload --
        // this is INHERIT_DEFAULT's real, structural shape.
        var mapper = new SlotRegistryMapper([]);
        Assert.Null(mapper.GetText("home.brandLogo"));
        Assert.Null(mapper.GetAssetId("home.hero.image"));
        Assert.False(mapper.GetBool("home.hero.enabled"));
    }

    [Fact]
    public void CMS_REMOTE_ASSET_LOCAL()
    {
        var slots = new[] { new ResolvedSlot { Id = "home.brandLogo", Page = "HOME", Status = "PUBLISHED", Value = JsonDocument.Parse("\"asset-real-123\"").RootElement } };
        var mapper = new SlotRegistryMapper(slots);

        Assert.Equal("asset-real-123", mapper.GetAssetId("home.brandLogo"));
    }

    [Fact]
    public void CMS_NONE_LOCAL()
    {
        // A slot explicitly present but with no real value (server-side
        // "NONE") -- ValueKind stays Undefined/default, and every typed
        // accessor degrades to its neutral fallback, never a crash and
        // never rendering raw JSON.
        var slots = new[] { new ResolvedSlot { Id = "home.brandLogo", Page = "HOME", Status = "UNSET" } };
        var mapper = new SlotRegistryMapper(slots);

        Assert.Null(mapper.GetAssetId("home.brandLogo"));
        Assert.Null(mapper.GetText("home.brandLogo"));
    }

    [Fact]
    public void IsSchemaSupported_OnlyAcceptsTheCurrentVersion()
    {
        Assert.True(SlotContentService.IsSchemaSupported(1));
        Assert.False(SlotContentService.IsSchemaSupported(2));
        Assert.False(SlotContentService.IsSchemaSupported(0));
    }
}
