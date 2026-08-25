using System.Text.Json;

namespace BloodMoon.Launcher.Models;

// Launcher Phase L3 -- the typed client shape of GET /launcher/content's
// ResolvedSlot[] (apps/api/src/modules/launcher-studio/launcher-studio.
// types.ts). Value is deliberately JsonElement, not object/dynamic -- the
// slot registry allows several different shapes (string, bool, an array of
// objects for ORDERED_LIST) per slot type, and SlotRegistryMapper (Part D)
// is the only place that ever interprets it. No XAML binds directly to
// this class.
public sealed class ResolvedSlot
{
    public string Id { get; set; } = "";
    public string Page { get; set; } = "";

    // A default(JsonElement) has ValueKind == Undefined, which
    // System.Text.Json refuses to serialize (throws InvalidOperationException
    // instead of writing anything) -- a real risk here specifically, since
    // this type round-trips through SlotContentCache's own
    // JsonSerializer.Serialize (Part AB's "malformed CMS payload" case: a
    // response missing a slot's "value" key would leave this at its C#
    // default, and caching that payload would crash instead of degrading).
    // Initializing to a real, valid "null" JsonElement means a missing
    // property just reads back as JSON null (SlotRegistryMapper's own
    // ValueKind checks already treat that as "no usable value" for every
    // accessor), never a serialization crash.
    public JsonElement Value { get; set; } = JsonDocument.Parse("null").RootElement;
    public Dictionary<string, string> Tokens { get; set; } = new();
    public string Status { get; set; } = "UNSET";
}

public sealed class LauncherContentPayload
{
    public int SchemaVersion { get; set; } = 1;
    public int ContentVersion { get; set; }
    public DateTimeOffset GeneratedAt { get; set; }
    public List<ResolvedSlot> Slots { get; set; } = [];

    // Part E -- resolves every IMAGE/asset-REFERENCE slot's asset id to a
    // real URL/hash, the same LauncherAssetManifestEntry shape (Models/
    // ApiModels.cs) bootstrap's own assets[] already uses. hash is SHA-256
    // here (LauncherAsset.sha256), not bootstrap's SHA-1 (ReferenceAsset.
    // sha1) -- SlotAssetResolver hashes accordingly.
    public List<LauncherAssetManifestEntry> Assets { get; set; } = [];
}
