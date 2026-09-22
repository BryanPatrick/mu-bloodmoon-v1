// Part O -- storage abstraction for the central asset library. LOCAL is
// real and used today (mirrors the existing pattern in
// admin-content.service.ts's uploadImage/media.controller.ts: files under
// storage/<dir>, streamed back by a narrow, allowlist-validated route).
// R2LauncherAssetStorageProvider is now a real implementation (Phase
// CF-R2-02, wired up under LAUNCHER_MEDIA_STORAGE_PROVIDER -- see
// launcher-studio.module.ts; still LOCAL by default, never activated in
// production this phase). Swapping the active provider is a config change,
// not a rewrite: callers only ever see `save`/`resolveUrl`.
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Injectable } from '@nestjs/common'
import { R2StorageProvider } from '../media/storage/r2-storage.provider'

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

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml'
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

// Real implementation as of Phase CF-R2-02 -- reuses R2StorageProvider
// (the same class community media uses) under its own 'launcher-assets/'
// namespace, so it can share the R2_* account credentials/bucket with
// community/guild media without key collisions. Config is read lazily on
// every save() (not cached at construction) so it stays testable and
// consistent with the rest of this codebase's storage services. Still not
// activated anywhere by default -- launcher-studio.module.ts keeps LOCAL as
// the active provider; switching requires an explicit config change, never
// implied by this class merely existing.
@Injectable()
export class R2LauncherAssetStorageProvider implements LauncherAssetStorageProvider {
  readonly kind = 'R2' as const

  private client() {
    return new R2StorageProvider({
      accountId: requireEnv('R2_ACCOUNT_ID'),
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      bucket: process.env.LAUNCHER_R2_BUCKET || requireEnv('R2_BUCKET'),
      publicBaseUrl: requireEnv('R2_PUBLIC_BASE_URL'),
      namespace: 'launcher-assets/'
    })
  }

  async save(buffer: Buffer, extension: string): Promise<SavedAsset> {
    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const fileName = `${randomUUID()}.${extension}`
    const contentType = MIME_BY_EXTENSION[extension.toLowerCase()] || 'application/octet-stream'
    const { url } = await this.client().writeAvailable(fileName, buffer, contentType)
    return {
      storageKey: fileName,
      publicUrl: url,
      sha256,
      sizeBytes: buffer.length
    }
  }
}
