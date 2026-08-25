using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

public sealed record SlotContentResult(LauncherContentPayload Content, ContentSource Source, bool IsStale);

// Launcher Phase L3 -- the same boot sequence LauncherContentService
// already implements for the bootstrap contract (fresh -> compare
// ContentVersion -> atomic cache promote -> cache -> fallback), applied to
// GET /launcher/content. There is no packaged/bundled slot-content file
// (unlike PackagedFallbackContent.json for bootstrap) -- an empty payload
// is the correct last resort here, because every individual slot access
// already degrades to its own neutral placeholder/default value
// (SlotRegistryMapper), so "no CMS content at all yet" and "this one slot
// was never published" are the same, already-handled case.
public sealed class SlotContentService(ISlotContentSource source, SlotContentCache cache)
{
    public const int SupportedSchemaVersion = 1;

    public static bool IsSchemaSupported(int schemaVersion) => schemaVersion == SupportedSchemaVersion;

    public async Task<SlotContentResult> GetContentAsync(string? page, CancellationToken cancellationToken)
    {
        var cached = await cache.LoadAsync(cancellationToken);

        LauncherContentPayload? fresh = null;
        try
        {
            fresh = await source.GetContentAsync(page, cancellationToken);
        }
        catch
        {
            // API offline/timeout/invalid payload -- fall through below,
            // matching LauncherContentService's identical failure handling.
        }

        if (fresh is not null && IsSchemaSupported(fresh.SchemaVersion))
        {
            if (cached is null || cached.ContentVersion != fresh.ContentVersion.ToString())
            {
                var envelope = new ContentCacheEnvelope<LauncherContentPayload>
                {
                    SchemaVersion = fresh.SchemaVersion,
                    ContentVersion = fresh.ContentVersion.ToString(),
                    FetchedAt = DateTimeOffset.UtcNow,
                    PayloadHash = SlotContentCache.ComputeHash(fresh),
                    Payload = fresh
                };
                await cache.SaveAsync(envelope, cancellationToken);
            }
            return new SlotContentResult(fresh, ContentSource.Fresh, IsStale: false);
        }

        if (cached is not null && IsSchemaSupported(cached.SchemaVersion))
        {
            return new SlotContentResult(cached.Payload, ContentSource.Cache, IsStale: true);
        }

        return new SlotContentResult(new LauncherContentPayload(), ContentSource.PackagedFallback, IsStale: true);
    }
}
