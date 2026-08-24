# Cache and fallback — Launcher Foundation phase

## What gets cached, and where

Every item in Part C's list (bootstrap, news summaries, event schedule,
social links, campaign/Open Beta/Season content, utility links, image/icon
metadata, page content metadata) already lives inside the single
`GET /launcher/bootstrap` response (see
`docs/launcher/remote-content-contract.md`). One cache file is therefore
enough — there is no need for a per-content-type cache file, and adding one
would just be N places for the same atomic-promotion logic to be
re-implemented.

- **Bootstrap content**: `LauncherContentCache`, one JSON file at
  `%LOCALAPPDATA%\BloodMoon\Launcher\cache\bootstrap.json`, mirroring
  `SessionStore`'s existing `%LOCALAPPDATA%\BloodMoon\Launcher\` convention
  rather than a game-install-relative path (this is Launcher/Portal state,
  not game client state).
- **Assets** (images backed by a real `ReferenceAsset` hash): `AssetCacheService`,
  one file per asset at `%LOCALAPPDATA%\BloodMoon\Launcher\cache\assets\<id><ext>`.

Neither ever stores a password, session secret, game credential, SQL
detail, or Cloudflare secret — the cached payload is exactly
`LauncherBootstrap`, which carries none of those fields
(`Models/ApiModels.cs`).

## Cache envelope shape

```csharp
public sealed class ContentCacheEnvelope<T>
{
    public int SchemaVersion { get; set; }
    public string ContentVersion { get; set; } = "";
    public DateTimeOffset FetchedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string PayloadHash { get; set; } = "";
    public T Payload { get; set; } = default!;
}
```

`PayloadHash` (SHA-256 over the serialized payload) is checked on every
`LoadAsync` — a partially written or externally tampered cache file fails
the check and is treated exactly like "no cache," never trusted
half-corrupted (`LauncherContentCacheTests.LoadAsync_WithTamperedPayloadHash_TreatsItAsNoCache`).

## Atomic promotion (Part D)

```
download -> validate (schemaVersion) -> write to a fresh temp file
   -> File.Move(temp, real path, overwrite: true)  -- atomic on NTFS
   -> delete the temp file if anything above failed
```

`File.Move` with `overwrite: true` to a destination on the same volume is
atomic on NTFS: a reader observes either the complete previous file or the
complete new one, never a half-written one. If the process is interrupted
before the move, the previous valid cache file is untouched — there is
nothing to roll back because nothing was overwritten yet
(`LauncherContentCacheTests.SaveAsync_PromotesAtomically_...`).

## Offline / degraded behavior (Part B)

| Situation | Result |
|---|---|
| API reachable, schemaVersion supported | Fresh content; cache rewritten only if `contentVersion` changed |
| API unreachable/timeout/invalid response | Last valid cache, if one exists |
| API sends an unsupported `schemaVersion` | Same as unreachable — never a crash (Part AB) |
| No cache exists either | Packaged fallback content (`fallback-content.json`, shipped next to the exe) |
| Even the packaged file can't be read | A hardcoded, disk-independent default (`PackagedFallbackContent.HardcodedDefault`) |

The Launcher can never open to an empty screen purely because the backend
is offline — every path above ends in a renderable `LauncherBootstrap`.

## What isn't wired in yet

`LauncherContentService` is not yet called from `MainWindow` — see
`docs/launcher/runtime-architecture.md`'s note. The cache and fallback
logic above is real and fully tested standalone, not simulated.
