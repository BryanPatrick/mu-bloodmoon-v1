using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services.ContentCache;

public enum ContentSource
{
    Fresh,
    Cache,
    PackagedFallback
}

public sealed record LauncherContentResult(LauncherBootstrap Bootstrap, ContentSource Source, bool IsStale);

// Part B's boot sequence as one orchestrated call:
//   load cache -> query bootstrap -> compare contentVersion -> validate
//   schemaVersion -> atomically update cache -> return renderable content.
// If the API call fails (Part B's "usar último cache válido") or returns
// a schemaVersion this build doesn't understand (Part AB), falls back to
// the cache; if there's no usable cache either, falls back to the packaged
// content (Part B). Something renderable is always returned -- this type
// has no "nothing available" state on purpose.
public sealed class LauncherContentService(
    ILauncherBootstrapSource source,
    LauncherContentCache cache,
    Func<LauncherBootstrap>? packagedFallback = null)
{
    public const int SupportedSchemaVersion = 1;

    private readonly Func<LauncherBootstrap> _packagedFallback = packagedFallback ?? PackagedFallbackContent.Load;

    public static bool IsSchemaSupported(int schemaVersion) => schemaVersion == SupportedSchemaVersion;

    public async Task<LauncherContentResult> GetContentAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.LoadAsync(cancellationToken);

        LauncherBootstrap? fresh = null;
        try
        {
            fresh = await source.GetBootstrapAsync(cancellationToken);
        }
        catch
        {
            // API offline, timed out, or the response failed to parse --
            // all fall through to the cache/packaged-fallback path below,
            // exactly like Part B/X's ApiOffline/Timeout/InvalidPayload
            // failure states.
        }

        if (fresh is not null && IsSchemaSupported(fresh.SchemaVersion))
        {
            // Only rewrite the on-disk cache when content actually changed
            // -- avoids a disk write on every single poll (Part Z).
            if (cached is null || cached.ContentVersion != fresh.ContentVersion)
            {
                var envelope = new ContentCacheEnvelope<LauncherBootstrap>
                {
                    SchemaVersion = fresh.SchemaVersion,
                    ContentVersion = fresh.ContentVersion,
                    FetchedAt = DateTimeOffset.UtcNow,
                    PayloadHash = LauncherContentCache.ComputeHash(fresh),
                    Payload = fresh
                };
                await cache.SaveAsync(envelope, cancellationToken);
            }
            return new LauncherContentResult(fresh, ContentSource.Fresh, IsStale: false);
        }

        // fresh is null (API unreachable) or carries a schemaVersion this
        // build doesn't understand (Part AB) -- both degrade the same way.
        if (cached is not null && IsSchemaSupported(cached.SchemaVersion))
        {
            return new LauncherContentResult(cached.Payload, ContentSource.Cache, IsStale: true);
        }

        return new LauncherContentResult(_packagedFallback(), ContentSource.PackagedFallback, IsStale: true);
    }
}
