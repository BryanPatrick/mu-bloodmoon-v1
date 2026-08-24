# Launcher runtime architecture — Launcher Foundation phase

Scope: `apps/launcher` (WPF, .NET 8). This phase adds a **remote content
runtime** underneath the existing, unchanged visual shell — it does not
redesign anything visual (see `docs/launcher/page-data-contracts.md`'s note
on why page ViewModels exist without page views yet).

## What existed before this phase

An audit of `apps/launcher` (Part A) found: a single monolithic
`MainWindow.xaml`/`.xaml.cs` (shell canvas + three overlay `Grid`s, no
`Frame`/`Page`/ViewModel/DI anywhere), `LauncherApiClient` (auth + bootstrap
+ account, no retry, its own `HttpClient`), `SessionStore` (DPAPI-encrypted,
`%LOCALAPPDATA%\BloodMoon\Launcher\session.bin`), `SettingsService`
(plain JSON, `%LOCALAPPDATA%\BloodMoon\Launcher\launcher.settings.json`
with a bundled fallback), and `PatchService`/`LauncherUpdateService` (a
completely separate file-integrity/self-update system — not a content
cache, see `docs/launcher/cache-and-fallback.md`). **No response cache, no
navigation system, and no page-state model of any kind existed** — this
phase is genuinely new territory, not an extension of a partial existing
system.

## What this phase adds

```
Models/
  ApiModels.cs              (extended additively: LauncherCampaign,
                              LauncherSocialLink, LauncherUtilityLink,
                              LauncherAssetManifestEntry, LauncherMe,
                              LauncherMeCharacters, LauncherServer.
                              StatusSource/StatusUpdatedAt)
  PageState.cs               ViewModel/state contracts for the 7 pages
  ContentCacheEnvelope.cs    generic on-disk cache envelope shape
  RemoteContentFailure.cs    failure-kind catalogue + translated messages
Services/
  ContentCache/
    LauncherContentCache.cs    atomic on-disk cache read/write
    LauncherContentService.cs  the Part B boot sequence, orchestrated
    PackagedFallbackContent.cs first-run/offline packaged content
    AssetCacheService.cs       hash-identified asset download/cache
  Navigation/
    NavigationService.cs       PageKey + enter/leave hooks (untied to WPF)
  PageStateMappers.cs         real mappers (Home/Account/News) + pure
                               shaping helpers (Events/Ranking/Store/Social)
  RefreshPolicy.cs, CountdownFormatter.cs, PlaceholderResolver.cs
Assets/Placeholders.xaml      neutral vector placeholder resources
fallback-content.json         packaged first-run/offline content
BloodMoon.Launcher.Tests/     new xunit project, 68 tests
```

`LauncherApiClient` gained two new methods (`GetMeAsync`,
`GetMeCharactersAsync`, Phase 3B's routes, previously never called from the
client) and now implements a small `ILauncherBootstrapSource` seam so
`LauncherContentService` can be unit tested without touching its internal
`HttpClient` at all — nothing about its existing behavior changed.

## Boot sequence (Part B)

`LauncherContentService.GetContentAsync()` implements, in one call:

```
load on-disk cache (if any, integrity-checked)
  -> query GET /launcher/bootstrap
  -> if it succeeded AND schemaVersion is supported:
       -> write the cache only if contentVersion actually changed (atomic promote)
       -> return the fresh content
  -> else (API offline/timeout/invalid payload, or an unsupported schemaVersion):
       -> return the last valid cache if one exists
       -> else return the packaged fallback content
```

`LauncherContentResult` always carries a renderable `LauncherBootstrap` —
there is no "nothing available" state, matching Part B's rule that the
Launcher can never open to an empty screen just because the backend is
offline.

This service is built and fully unit-tested (`ContentCache/
LauncherContentServiceTests.cs`) but **not yet wired into `MainWindow`**
—`RefreshLauncherAsync` still calls `LauncherApiClient.GetBootstrapAsync`
directly today. Wiring it in is a small, low-risk follow-up (swap one call
site) deliberately left for the phase that also does the real page-view
work, since testing it end-to-end well deserves its own change, not a
one-line edit bundled into a large foundation commit.

## Why no DI container was introduced

`apps/launcher` has never used one; every service is a field on
`MainWindow` constructed with `new()`. Introducing a container now would be
a structural change well beyond "foundation," so the new services
(`LauncherContentService`, `AssetCacheService`, `NavigationService`) are
plain constructor-injected classes — callable the same way as every
existing service, ready to be wired into `MainWindow` (or a future
composition root) without needing a framework change first.
