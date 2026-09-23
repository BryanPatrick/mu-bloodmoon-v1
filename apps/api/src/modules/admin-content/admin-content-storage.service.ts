import { Injectable } from '@nestjs/common'
import { join, resolve } from 'node:path'
import { LocalStorageProvider } from '../media/storage/local-storage.provider'
import { R2StorageProvider } from '../media/storage/r2-storage.provider'
import type { StorageProvider } from '../media/storage/storage-provider'

function requireEnv(name: string): string {
  const value = process.env[name]
  // Deliberately no value in the message -- see media-storage.service.ts's
  // identical helper for why.
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function apiPrefixPath(): string {
  const prefix = (process.env.API_GLOBAL_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '')
  return prefix ? `/${prefix}` : ''
}

// Admin-content's own StorageProvider selection (Phase CF-R2-03), the third
// domain-specific switch after guild (CF-R2-02) and launcher-studio
// (CF-R2-02) -- same pattern each time: an independent
// ADMIN_CONTENT_STORAGE_PROVIDER switch, default 'local', never tied to
// MEDIA_STORAGE_PROVIDER or the other domains' switches. Only used by
// AdminContentService.uploadImage() -- createAsset/updateAsset/archiveAsset
// never touch a file, and the bulk importer (scripts/import-prepared-data.mjs)
// upserts metadata for already-committed static repo files, never writes
// through this service either (see docs/cloudflare-migration/R2_ASSETS.md's
// CF-R2-03 section for the full write-path audit this is based on).
//
// When R2 is selected, reuses the same R2_* account credentials as
// community/guild/launcher (one Cloudflare account, no reason to provision a
// fourth credential), under its own 'admin-content/' key namespace so none
// of the four domains' objects can collide in a shared bucket.
// ADMIN_CONTENT_R2_BUCKET can point this domain at a dedicated bucket
// instead, falling back to R2_BUCKET.
@Injectable()
export class AdminContentStorageService {
  private get provider(): StorageProvider {
    return AdminContentStorageService.buildProvider()
  }

  static buildProvider(): StorageProvider {
    const kind = (process.env.ADMIN_CONTENT_STORAGE_PROVIDER || 'local').toLowerCase()
    if (kind === 'r2') {
      return new R2StorageProvider({
        accountId: requireEnv('R2_ACCOUNT_ID'),
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        bucket: process.env.ADMIN_CONTENT_R2_BUCKET || requireEnv('R2_BUCKET'),
        publicBaseUrl: requireEnv('R2_PUBLIC_BASE_URL'),
        namespace: 'admin-content/'
      })
    }
    if (kind !== 'local') throw new Error(`Unknown ADMIN_CONTENT_STORAGE_PROVIDER: ${kind}`)
    return new LocalStorageProvider({
      availableDir: resolve(process.env.ADMIN_CONTENT_UPLOADS_DIR || join(process.cwd(), 'storage', 'uploads')),
      quarantineDir: resolve(process.env.MEDIA_QUARANTINE_DIR || join(process.cwd(), 'storage', 'media-quarantine')),
      removedDir: resolve(process.env.MEDIA_REMOVED_DIR || join(process.cwd(), 'storage', 'media-removed')),
      publicUrlPrefix: `${apiPrefixPath()}/media`
    })
  }

  get name() {
    return this.provider.name
  }

  writeAvailable(...args: Parameters<StorageProvider['writeAvailable']>) {
    return this.provider.writeAvailable(...args)
  }

  publicUrl(...args: Parameters<StorageProvider['publicUrl']>) {
    return this.provider.publicUrl(...args)
  }
}
