// Part O -- storage abstraction for the central asset library. LOCAL is
// real and used today (mirrors the existing pattern in
// admin-content.service.ts's uploadImage/media.controller.ts: files under
// storage/<dir>, streamed back by a narrow, allowlist-validated route).
// R2 is a documented contract stub only -- no Cloudflare credentials are
// touched this phase (the CMS Launcher Studio task is explicitly
// local/repo-only). Swapping the active provider later is a config change,
// not a rewrite: callers only ever see `save`/`resolveUrl`.
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Injectable, NotImplementedException } from '@nestjs/common'

export interface SavedAsset {
  storageKey: string
  publicUrl: string
  sha256: string
  sizeBytes: number
}

export interface LauncherAssetStorageProvider {
  readonly kind: 'LOCAL' | 'R2'
  save(buffer: Buffer, extension: string): Promise<SavedAsset>
}

@Injectable()
export class LocalLauncherAssetStorageProvider implements LauncherAssetStorageProvider {
  readonly kind = 'LOCAL' as const

  async save(buffer: Buffer, extension: string): Promise<SavedAsset> {
    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const fileName = `${randomUUID()}.${extension}`
    const directory = join(process.cwd(), 'storage', 'launcher-assets')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, fileName), buffer)
    return {
      storageKey: fileName,
      publicUrl: `/media/launcher-assets/${fileName}`,
      sha256,
      sizeBytes: buffer.length
    }
  }
}

// Not wired to real Cloudflare R2 credentials this phase -- Part AR/the
// task's own absolute local/repo-only boundary. Kept R2-compatible in
// shape (save() returns the same SavedAsset contract) so activating it
// later is a provider swap in launcher-studio.module.ts, not a rewrite of
// callers.
@Injectable()
export class R2LauncherAssetStorageProvider implements LauncherAssetStorageProvider {
  readonly kind = 'R2' as const

  async save(): Promise<SavedAsset> {
    throw new NotImplementedException(
      'R2 storage is not configured this phase -- see docs/assets/central-asset-library.md.'
    )
  }
}
