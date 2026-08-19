import { Injectable } from '@nestjs/common'
import { join, resolve } from 'node:path'
import { LocalStorageProvider } from './local-storage.provider'
import { R2StorageProvider } from './r2-storage.provider'
import type { StorageProvider } from './storage-provider'

function requireEnv(name: string): string {
  const value = process.env[name]
  // Deliberately no value in the message -- this only ever fires for a
  // missing R2_* credential, and even the failure path must not become a
  // place secrets leak into logs.
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function apiPrefixPath(): string {
  const prefix = (process.env.API_GLOBAL_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '')
  return prefix ? `/${prefix}` : ''
}

// Community-scoped for this phase -- Guild keeps using its own existing
// local-only path (guilds-media.service.ts) untouched. The class itself has
// no Community-specific logic, so pointing a second instance at
// GUILD_MEDIA_DIR later is a config change, not a rewrite.
@Injectable()
export class MediaStorageService {
  // Rebuilt on every access rather than cached at construction time -- like
  // the pre-existing MediaService.directory(), this always reflects the
  // current COMMUNITY_MEDIA_DIR/MEDIA_STORAGE_PROVIDER/etc. env vars, which
  // the e2e suite relies on by reassigning them mid-run (see
  // community-media.e2e-spec.ts's storage-failure test).
  private get provider(): StorageProvider {
    return MediaStorageService.buildProvider()
  }

  static buildProvider(): StorageProvider {
    const kind = (process.env.MEDIA_STORAGE_PROVIDER || 'local').toLowerCase()
    if (kind === 'r2') {
      return new R2StorageProvider({
        accountId: requireEnv('R2_ACCOUNT_ID'),
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        bucket: requireEnv('R2_BUCKET'),
        publicBaseUrl: requireEnv('R2_PUBLIC_BASE_URL')
      })
    }
    if (kind !== 'local') throw new Error(`Unknown MEDIA_STORAGE_PROVIDER: ${kind}`)
    return new LocalStorageProvider({
      availableDir: resolve(process.env.COMMUNITY_MEDIA_DIR || join(process.cwd(), 'storage', 'community-media')),
      quarantineDir: resolve(process.env.MEDIA_QUARANTINE_DIR || join(process.cwd(), 'storage', 'media-quarantine')),
      removedDir: resolve(process.env.MEDIA_REMOVED_DIR || join(process.cwd(), 'storage', 'media-removed')),
      publicUrlPrefix: `${apiPrefixPath()}/media/community`
    })
  }

  get name() {
    return this.provider.name
  }

  writeQuarantine(...args: Parameters<StorageProvider['writeQuarantine']>) {
    return this.provider.writeQuarantine(...args)
  }

  writeAvailable(...args: Parameters<StorageProvider['writeAvailable']>) {
    return this.provider.writeAvailable(...args)
  }

  moveAvailableToRemoved(...args: Parameters<StorageProvider['moveAvailableToRemoved']>) {
    return this.provider.moveAvailableToRemoved(...args)
  }

  moveRemovedToAvailable(...args: Parameters<StorageProvider['moveRemovedToAvailable']>) {
    return this.provider.moveRemovedToAvailable(...args)
  }

  deleteQuarantine(...args: Parameters<StorageProvider['deleteQuarantine']>) {
    return this.provider.deleteQuarantine(...args)
  }

  publicUrl(...args: Parameters<StorageProvider['publicUrl']>) {
    return this.provider.publicUrl(...args)
  }
}
