# WPF ↔ CMS binding (Launcher Phase L3)

## Two content sources, two responsibilities

`GET /launcher/bootstrap` (unchanged, pre-existing) and `GET /launcher/
content` (new, Launcher CMS Studio phase) are consumed by two parallel,
independently-cached pipelines that mirror each other exactly:

| Concern | Bootstrap | Slot content |
|---|---|---|
| API client method | `LauncherApiClient.GetBootstrapAsync` | `LauncherApiClient.GetContentAsync` |
| Cache | `LauncherContentCache` | `SlotContentCache` |
| Orchestrator | `LauncherContentService` | `SlotContentService` |
| Payload | `LauncherBootstrap` | `LauncherContentPayload` (`ResolvedSlot[]` + asset manifest) |
| Typed access | direct properties | `SlotRegistryMapper` (Part D) |

**Bootstrap** = base launcher/global content: server status, links, patch
notes, campaign/socials/utilities (`SiteSetting`-backed), news
(`KnowledgeEntry`-backed). **Content** = published CMS slot values from
the Launcher Studio slot registry (`apps/api/.../launcher-studio/
slot-registry.ts`) — hero, campaign*, class-icon maps, currency icons,
banners.

Two separate services rather than one merged call: they're fetched
together in `MainWindow.xaml.cs`'s `Window_Loaded`/`ContentTimer_Tick`
(no duplicate *requests* — Part B's "avoid duplicate requests" is about
not re-fetching the same thing twice, not about merging two genuinely
different concerns into one call), keeping the bootstrap pipeline
untouched and low-risk (Part A's audit found it real/tested/working) while
the new slot pipeline can evolve independently.

`* home.campaign.*` slots exist in both places today (bootstrap's
`SiteSetting`-backed `campaign` field, and the registry's `home.campaign.*`
slots) -- an intentional overlap carried over from the CMS Studio phase's
own additive-not-replacing decision (`docs/launcher/remote-content.md`'s
Update section). This phase's pages read from the slot registry
(`SlotRegistryMapper`), not the legacy bootstrap `campaign` field.

## Part D: the typed binding layer

`SlotRegistryMapper` (`Services/SlotRegistryMapper.cs`) is the *only*
place a view interprets a `ResolvedSlot`'s raw `JsonElement` value. A page
calls `mapper.GetText("home.hero.title")`, never touches `JsonElement`
itself, and every accessor degrades to a typed default (`null`/`false`/
empty list) rather than throwing on an unexpected shape:

```
LauncherContentPayload (ResolvedSlot[])
  -> SlotRegistryMapper           (typed accessors: GetText/GetBool/GetList/...)
    -> Views/*.xaml.cs            (HomePage, AccountPage, ... read via the mapper)
      -> WPF Views (XAML)         (bind to plain TextBlock.Text/Visibility set in code-behind)
```

No XAML anywhere binds directly to a `ResolvedSlot`/`JsonElement`. No
remote value is ever interpreted as a XAML resource key, a Style, a
Binding path, or code.

## Asset resolution (Part E)

An `IMAGE`/asset-`REFERENCE` slot's value is a `LauncherAsset` id, never a
URL. `GET /launcher/content` additively returns an `assets[]` manifest
(same shape as bootstrap's own, but hashed with SHA-256 —
`LauncherAsset.sha256` — instead of bootstrap's SHA-1) resolving every id
actually referenced in the response to a real URL/hash/size. Views call
`SlotImageResolver.ResolveAsync(context, assetId, ct)`, which:
`assetId -> manifest entry (context.SlotAssets) -> AssetCacheService.
CmsAssetCache.GetOrDownloadAsync (hash-verified) -> BitmapImage`, returning
`null` on any failure (asset missing from the manifest, download failure,
hash mismatch) -- callers fall back to a neutral background, never a
broken-image icon (Part F).

`AssetCacheService` gained a constructor-selectable `AssetHashAlgorithm`
(`Sha1` default, unchanged for bootstrap; `Sha256` for CMS assets) rather
than a second near-duplicate class -- see `docs/assets/central-asset-
library.md` on the API side for why the CMS asset library hashes
differently from `ReferenceAsset` in the first place.

## Visual tokens (Part AT)

`TokenMapper` (`Services/TokenMapper.cs`) maps a CMS token string
(`"CRIMSON"`, `"DISPLAY"`, `"LG"`, ...) to a real local WPF resource
(`Brush.Crimson`, `Font.Display`, `FontSize.Lg`, ...) defined in `Styles/
Palette.xaml`/`Styles/Typography.xaml`. The CMS never sends a hex color, a
font family, or a Brush -- only the token name.

## A real bug this phase's own testing caught

`ResolvedSlot.Value` is a `JsonElement`. Its C# default (`ValueKind ==
Undefined`) is not valid JSON -- `JsonSerializer.Serialize` throws on it
rather than writing anything. A malformed API response missing a slot's
`value` key would deserialize into that default and then crash
`SlotContentCache.ComputeHash` the next time the app tried to cache it,
taking down the whole boot sequence instead of degrading. Fixed by
initializing `Value` to a real `JsonDocument.Parse("null").RootElement`;
regression test: `SlotContentServiceTests.
GetContentAsync_WithASlotMissingAnExplicitValue_CachesAndReturnsWithoutCrashing`.
