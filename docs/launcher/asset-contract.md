# Asset contract — Launcher Foundation phase

## Manifest shape

Every image the Launcher can trust by hash appears in
`GET /launcher/bootstrap`'s `assets[]` array:

```json
{
  "id": "reference-asset-uuid",
  "url": "https://.../image.webp",
  "contentType": "image/webp",
  "hash": "sha1-hex-40-chars",
  "size": 12345,
  "kind": "NEWS_IMAGE" | "EVENT_IMAGE" | "SOCIAL_ICON"
}
```

`hash` is the backend's `ReferenceAsset.sha1` column verbatim — **SHA-1**,
not SHA-256 (`apps/api/src/modules/launcher/launcher.service.ts`'s
`buildAssetManifest`). `AssetCacheService` on the client hashes downloads
with SHA-1 specifically so a byte-identical file is recognized as already
cached; using a different algorithm there would silently defeat every
dedupe check (Part J).

## Only backend-hashed assets get a manifest entry

An image referenced only as a plain URL string (today: `campaign.imageUrl`)
has no manifest entry — `LauncherService.buildAssetManifest` only emits an
entry when the underlying `ReferenceAsset` row has both `sha1` and `bytes`
captured. This is a documented, honest gap (Part I: "Não confiar só em
URL"), not a fabricated hash. Closing it means teaching the CMS to back a
plain `imageUrl` field with a real `ReferenceAsset` row — a real, scoped
future change, not something to fake now.

## Download / cache / validate (Parts I/J/K)

`AssetCacheService.GetOrDownloadAsync(entry)`:

1. If a file already exists at the local cache path for `entry.Id` and its
   SHA-1 matches `entry.Hash`, return it — **no network call at all**
   (Part J: "Se hash já existe localmente: não baixar novamente").
2. Otherwise download via `IAssetDownloader` (`HttpAssetDownloader` in
   production — HTTPS-only, matching `BrowserService`'s existing rule
   elsewhere in this app).
3. Reject an empty payload (`AssetValidationFailure.EmptyPayload`).
4. Reject a hash mismatch (`AssetValidationFailure.HashMismatch`) — a
   corrupted or tampered download is never promoted into the cache.
5. Write to a temp file, then atomically move it into place (same pattern
   as `LauncherContentCache`).

A download failure or validation failure throws `AssetCacheException`; a
caller maps it to `RemoteContentFailureKind.AssetDownloadFailed` or
`.AssetHashMismatch` (`Models/RemoteContentFailure.cs`) for a translated,
non-raw-exception user message (Part X).

## Security boundary (Parts K/L)

Remote content is **data**, never executable behavior. `AssetCacheService`
only ever writes image bytes to disk under a fixed, id-derived filename in
a fixed cache directory — it never executes, never interprets the bytes as
anything beyond "content to display," and never accepts a caller-supplied
path. `HttpAssetDownloader` rejects any non-HTTPS URL outright.

## Not wired into any view yet

`AssetCacheService` is built and unit-tested standalone
(`AssetCacheServiceTests.cs`, 6 tests) but no XAML currently renders a
downloaded asset — Part AJ defers the actual visual implementation. The
neutral, hand-authored placeholders in `Assets/Placeholders.xaml`
(`docs/launcher/page-data-contracts.md`'s placeholder section) are the only
image-related resource merged into the running app this phase.
