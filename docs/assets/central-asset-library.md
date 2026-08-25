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
- `R2LauncherAssetStorageProvider` -- a contract stub only. Its `save()`
  throws `NotImplementedException`; no Cloudflare R2 credential is read,
  touched, or referenced anywhere in this phase, per the task's absolute
  local/repo-only boundary. The contract (`SavedAsset`'s shape) is written
  to be R2-compatible later -- activating R2 is meant to be a provider
  swap in `launcher-studio.module.ts`'s DI binding, not a rewrite of
  `LauncherStudioService` or the controllers that call it.

## Upload path

`POST /admin/launcher-studio/assets/upload` -- same base64 `dataUrl`
convention as `admin-content`'s existing upload route (`{name?, category,
dataUrl}`), PNG/JPEG/WebP only, 5 MB cap. Requires
`admin.launcher.assets.manage`.

## What's not built this phase

Image dimension probing (`width`/`height` are left `null` on upload --
no image-decoding library was added this phase to keep the dependency
footprint minimal), bulk asset management UI beyond the picker grid in
the slot inspector, and any real R2 wiring.
