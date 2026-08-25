using System.Text.Json;
using BloodMoon.Launcher.Models;

namespace BloodMoon.Launcher.Services;

// Part D -- the only place a view is allowed to interpret a ResolvedSlot's
// raw JsonElement Value. Every accessor is narrow and typed: a view calls
// mapper.GetText("home.hero.title"), never touches JsonElement itself.
// Anything the JSON doesn't actually contain, or contains in an
// unsupported shape, degrades to the typed default -- never a crash, never
// silently rendering raw JSON.
public sealed class SlotRegistryMapper
{
    private readonly Dictionary<string, ResolvedSlot> _byId;

    public SlotRegistryMapper(IEnumerable<ResolvedSlot> slots)
    {
        _byId = slots.ToDictionary(s => s.Id, s => s);
    }

    public static SlotRegistryMapper Empty { get; } = new([]);

    private bool TryGet(string slotId, out ResolvedSlot slot) => _byId.TryGetValue(slotId, out slot!);

    public string? GetText(string slotId) =>
        TryGet(slotId, out var slot) && slot.Value.ValueKind == JsonValueKind.String
            ? slot.Value.GetString()
            : null;

    public bool GetBool(string slotId, bool fallback = false) =>
        TryGet(slotId, out var slot) && slot.Value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? slot.Value.GetBoolean()
            : fallback;

    // IMAGE/REFERENCE(LAUNCHER_ASSET) slots store a LauncherAsset id as a
    // plain string -- semantically distinct from GetText but the same
    // underlying shape, named separately so callers read intent, not shape.
    public string? GetAssetId(string slotId) => GetText(slotId);

    public string? GetReferenceId(string slotId) => GetText(slotId);

    public DateTimeOffset? GetDateTime(string slotId)
    {
        var text = GetText(slotId);
        return text is not null && DateTimeOffset.TryParse(text, out var value) ? value : null;
    }

    public IReadOnlyDictionary<string, string> GetTokens(string slotId) =>
        TryGet(slotId, out var slot) ? slot.Tokens : new Dictionary<string, string>();

    // ORDERED_LIST slots -- Value is a JSON array of objects; map maps each
    // element to a typed row. An element that fails to map (unexpected
    // shape from a stale cache) is skipped, never thrown.
    public List<T> GetList<T>(string slotId, Func<JsonElement, T?> map) where T : class
    {
        if (!TryGet(slotId, out var slot) || slot.Value.ValueKind != JsonValueKind.Array)
        {
            return [];
        }
        var result = new List<T>();
        foreach (var element in slot.Value.EnumerateArray())
        {
            if (map(element) is { } mapped)
            {
                result.Add(mapped);
            }
        }
        return result;
    }

    public static string? StringField(JsonElement element, string field) =>
        element.TryGetProperty(field, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    public static bool BoolField(JsonElement element, string field, bool fallback = false) =>
        element.TryGetProperty(field, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean()
            : fallback;
}
