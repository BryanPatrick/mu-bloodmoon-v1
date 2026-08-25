# Content cache and fallback chain (Launcher Phase L3)

Extends `docs/launcher/cache-and-fallback.md` (the Foundation phase's
bootstrap-only cache design) to the new slot content pipeline. Read that
document first; this one only covers what's new/different.

## Boot sequence (Part C), both pipelines identically

```
load packaged fallback (bootstrap only -- see below)
  -> load local cache
    -> request remote content
      -> compare version/hash
        -> download changed assets
          -> atomically promote cache
            -> render
```

`LauncherContentService` (bootstrap) and `SlotContentService` (slot
content) implement this identically -- same fresh/cache/fallback
decision tree, same "only rewrite the cache file when the version
actually changed" optimization, same "an unsupported schemaVersion
degrades exactly like an offline API" rule (Part AB). See `docs/launcher/
wpf-cms-binding.md`'s table for exactly which class does which half.

## One real difference: what "last resort" means

Bootstrap has a genuine packaged fallback file (`fallback-content.json`,
shipped next to the exe, loaded by `PackagedFallbackContent.Load`) for
the true first-run-offline case. Slot content does not ship an
equivalent file -- its last resort is an **empty** `LauncherContentPayload`
(zero slots). This is correct, not a missing feature: every individual
slot access already degrades to its own neutral default/placeholder via
`SlotRegistryMapper` (a missing slot's `GetText` returns `null`, `GetBool`
returns its caller-supplied fallback, `GetList` returns an empty list),
so "no CMS content reachable at all" and "this one slot was never
published" are already the same, already-handled code path. Shipping a
second bundled JSON file with a guessed value for every registry slot
would be redundant with that, not additive.

## Asset cache: two instances, two hash algorithms

`LauncherAppContext.AssetCache` (bootstrap images, SHA-1, unchanged) and
`LauncherAppContext.CmsAssetCache` (CMS slot images, SHA-256, new --
matches `LauncherAsset.sha256`), writing to separate cache subdirectories
(`cache/assets/` vs `cache/cms-assets/`) so a UUID collision between the
two independent id namespaces (`ReferenceAsset.id` vs `LauncherAsset.id`)
is structurally impossible, not just unlikely. `AssetCacheService` gained
a constructor-selectable `AssetHashAlgorithm` (default `Sha1`, so every
pre-existing caller/test is unaffected) rather than a second near-
duplicate class.

## Offline/degraded rendering, verified

`docs/launcher/resolution-engine.md` and `docs/launcher/page-data-
sources.md` both reference the real screenshots taken this phase
(`--render-preview=`/`--render-preview-page=`, offline mode, no reachable
API): the Home hero falls back to `"Bem-vindo ao Blood Moon"` +
`"JOGAR AGORA"`, the Events page surfaces
`RemoteContentFailureMessages.For(ApiOffline)` as a toast and
`NoEvents` text in both event cards, and every other page renders its
structural chrome with empty-but-not-broken content areas. The Launcher
never blocked rendering, never crashed, and never showed a broken-image
icon during this verification (Part BD/F).
