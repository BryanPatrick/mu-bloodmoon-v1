namespace BloodMoon.Launcher.Models;

// Part C's cache shape, generic over whatever payload it wraps -- today
// that's always LauncherBootstrap (Part C's whole list of cacheable items
// -- bootstrap, news, events, socials, campaign, utilities, asset
// metadata -- already lives inside that one response, see
// docs/launcher/cache-and-fallback.md).
public sealed class ContentCacheEnvelope<T>
{
    public int SchemaVersion { get; set; }
    public string ContentVersion { get; set; } = "";
    public DateTimeOffset FetchedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string PayloadHash { get; set; } = "";
    public T Payload { get; set; } = default!;
}
