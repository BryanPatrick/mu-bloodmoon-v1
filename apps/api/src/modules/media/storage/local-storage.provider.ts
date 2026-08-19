import { mkdir, rename, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { StorageKey, StorageProvider } from './storage-provider'

export interface LocalStorageProviderOptions {
  // The existing, publicly-served directory (COMMUNITY_MEDIA_DIR /
  // GUILD_MEDIA_DIR) -- kept exactly where main.ts's express.static mount
  // already points, so promoting a file here is all that's needed for it to
  // become reachable. Never listed/served directly by anything else.
  availableDir: string
  // Never mounted by express.static. Holds raw, not-yet-validated uploads.
  quarantineDir: string
  // Never mounted by express.static. Holds moderated/replaced files -- moved
  // here instead of deleted, so a moderation mistake stays recoverable.
  removedDir: string
  publicUrlPrefix: string
}

// A filename with no separators is the whole safety property this provider
// needs from callers -- it's what keeps every path below inside its own
// directory. MediaService only ever passes `${randomUUID()}.${extension}`,
// never anything client-supplied.
function assertSafeKey(key: StorageKey) {
  if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
    throw new Error(`Unsafe storage key: ${key}`)
  }
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const

  constructor(private readonly options: LocalStorageProviderOptions) {}

  private path(root: string, key: StorageKey) {
    assertSafeKey(key)
    return resolve(join(root, key))
  }

  async writeQuarantine(key: StorageKey, body: Buffer) {
    await mkdir(this.options.quarantineDir, { recursive: true })
    await writeFile(this.path(this.options.quarantineDir, key), body)
  }

  // contentType is unused on disk (no content-type header to set for a
  // local file) -- kept as a parameter so this method's arity matches the
  // StorageProvider interface exactly, not just structurally.
  async writeAvailable(key: StorageKey, body: Buffer, _contentType?: string) {
    await mkdir(this.options.availableDir, { recursive: true })
    await writeFile(this.path(this.options.availableDir, key), body)
    return { storagePath: this.path(this.options.availableDir, key), url: this.publicUrl(key) }
  }

  async moveAvailableToRemoved(key: StorageKey) {
    await mkdir(this.options.removedDir, { recursive: true })
    await rename(this.path(this.options.availableDir, key), this.path(this.options.removedDir, key))
  }

  async moveRemovedToAvailable(key: StorageKey, _contentType?: string) {
    await mkdir(this.options.availableDir, { recursive: true })
    await rename(this.path(this.options.removedDir, key), this.path(this.options.availableDir, key))
    return { storagePath: this.path(this.options.availableDir, key), url: this.publicUrl(key) }
  }

  async deleteQuarantine(key: StorageKey) {
    await unlink(this.path(this.options.quarantineDir, key)).catch(() => undefined)
  }

  publicUrl(key: StorageKey) {
    assertSafeKey(key)
    return `${this.options.publicUrlPrefix.replace(/\/+$/, '')}/${key}`
  }
}
