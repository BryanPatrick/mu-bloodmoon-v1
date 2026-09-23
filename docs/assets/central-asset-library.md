# Central asset library (Launcher CMS Studio, Part M/N/O)

`LauncherAsset` (`schema.prisma`) + `apps/api/src/modules/launcher-studio/
launcher-asset-storage.ts`.

## Why a new model instead of ReferenceAsset

`ReferenceAsset` already exists, but its shape (`sourceUrl`,
`duplicateOfId`, a relation to `ReferenceSource`, consumed via
`KnowledgeEntryAsset.role`) is purpose-built for the web-scraped
knowledge-base/wiki pipeline -- a different domain than a general,
operator-curated editorial asset library with consumer categories
(Launcher/Website/Game/Classes/Items/Events/News/Campaigns/Branding/
System). Reusing it here would conflate two different concerns rather
than avoid a duplicate one; this is a deliberate, audited decision, not a
missed reuse opportunity (see `docs/launcher/launcher-slot-registry.md`'s
Part A note on the same question for News/Events, decided the other way).
**Confirmed again, Phase CF-R2-03**: the full `ReferenceAsset` write-path
audit found it backs a broad editorial/scraping pipeline (manual admin
CRUD, a bulk importer that upserts metadata for 1200+ already-committed
static repo files, provenance/dedup fields tied to that pipeline) --
genuinely a different domain than this model's curated asset library, not
just a naming difference. See `docs/cloudflare-migration/R2_ASSETS.md`'s
CF-R2-03 section for the full audit.

## Metadata

`id, name, category, mimeType, width?, height?, sizeBytes, sha256,
storageProvider, storageKey, publicUrl?, status (EditorialStatus, reused),
createdBy?, createdAt, updatedAt`. No heavy binary is ever stored in
MySQL -- only the metadata row; the bytes live in the storage provider.

Dedication by content: uploading an image whose `sha256` already exists
under the same `category` returns the existing row instead of creating a
duplicate -- "one asset, many consumers" (Part M) is enforced at upload
time, not left to operator discipline.

## Storage abstraction (Part O)

`LauncherAssetStorageProvider` interface, one method: `save(buffer,
extension) -> { storageKey, publicUrl, sha256, sizeBytes }`.

- `LocalLauncherAssetStorageProvider` -- real, used today. Mirrors the
  exact pattern `admin-content.service.ts`'s `uploadImage` /
  `media.controller.ts` already established: files under
  `storage/launcher-assets/<uuid>.<ext>`, streamed back by
  `launcher-asset-media.controller.ts` at `GET /media/launcher-assets/
  :fileName`, with the same `basename()` + strict extension allowlist
  (`^[a-f0-9-]+\.(?:png|jpg|webp)$`) that prevents path traversal.
- `R2LauncherAssetStorageProvider` -- **real as of Phase CF-R2-02**
  (`docs/cloudflare-migration/R2_ASSETS.md`). Reuses
  `R2StorageProvider` (the same class community media uses) under a
  `launcher-assets/` key namespace, sharing the `R2_*` account
  credentials/bucket (or `LAUNCHER_R2_BUCKET` if a dedicated bucket is
  set). Activated via `LAUNCHER_MEDIA_STORAGE_PROVIDER=r2` in
  `launcher-studio.module.ts`'s DI factory -- **local remains the
  default, not activated in production this phase**. One caveat:
  `launcher-asset-media.controller.ts`'s read route
  (`/media/launcher-assets/:fileName`) is still local-disk-only
  regardless of this switch; an R2-stored asset's real, working URL is
  the one `save()` returns in `SavedAsset.publicUrl` (an R2 URL), not
  that local route.

## Upload path

`POST /admin/launcher-studio/assets/upload` -- same base64 `dataUrl`
convention as `admin-content`'s existing upload route (`{name?, category,
dataUrl}`), PNG/JPEG/WebP only, 5 MB cap. Requires
`admin.launcher.assets.manage`.

## What's not built this phase

Image dimension probing (`width`/`height` are left `null` on upload --
no image-decoding library was added this phase to keep the dependency
footprint minimal), bulk asset management UI beyond the picker grid in
the slot inspector. Real R2 wiring was added in Phase CF-R2-02 (see
above) -- not activated in production, no production launcher artifact
uploaded to R2.
