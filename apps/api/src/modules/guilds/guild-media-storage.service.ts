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

// Guild media's own StorageProvider selection, independent of community's
// MEDIA_STORAGE_PROVIDER -- added Phase CF-R2-02 (guild media previously had
// no StorageProvider abstraction at all, see docs/cloudflare-migration/
// R2_ASSETS.md). A separate GUILD_MEDIA_STORAGE_PROVIDER switch, defaulting
// to 'local', means this change is zero-behavior-change by default: guild
// media keeps writing to GUILD_MEDIA_DIR via plain local disk exactly as
// before, and only moves to R2 if GUILD_MEDIA_STORAGE_PROVIDER=r2 is
// explicitly set later -- never tied to community's own provider choice.
//
// When R2 is selected, guild media reuses the same R2_ACCOUNT_ID/
// R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_PUBLIC_BASE_URL as community (one
// Cloudflare account, one credential set -- no reason to provision a second
// one), but writes under its own 'guild/' key namespace so the two domains'
// available/quarantine/removed prefixes can never collide inside a shared
// bucket. GUILD_R2_BUCKET can point guild media at a different bucket than
// community's R2_BUCKET if ever desired; unset, it falls back to R2_BUCKET.
@Injectable()
export class GuildMediaStorageService {
  private get provider(): StorageProvider {
    return GuildMediaStorageService.buildProvider()
  }

  static buildProvider(): StorageProvider {
    const kind = (process.env.GUILD_MEDIA_STORAGE_PROVIDER || 'local').toLowerCase()
    if (kind === 'r2') {
      return new R2StorageProvider({
        accountId: requireEnv('R2_ACCOUNT_ID'),
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        bucket: process.env.GUILD_R2_BUCKET || requireEnv('R2_BUCKET'),
        publicBaseUrl: requireEnv('R2_PUBLIC_BASE_URL'),
        namespace: 'guild/'
      })
    }
    if (kind !== 'local') throw new Error(`Unknown GUILD_MEDIA_STORAGE_PROVIDER: ${kind}`)
    return new LocalStorageProvider({
      availableDir: resolve(process.env.GUILD_MEDIA_DIR || join(process.cwd(), 'storage', 'guild-media')),
      quarantineDir: resolve(process.env.MEDIA_QUARANTINE_DIR || join(process.cwd(), 'storage', 'media-quarantine')),
      removedDir: resolve(process.env.MEDIA_REMOVED_DIR || join(process.cwd(), 'storage', 'media-removed')),
      publicUrlPrefix: `${apiPrefixPath()}/media/guild`
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
