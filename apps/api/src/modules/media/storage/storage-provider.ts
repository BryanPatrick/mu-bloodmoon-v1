// A namespaced object key, e.g. "community/3f2a.../photo.webp" or
// "guild/.../emblem.webp" -- callers own the namespace prefix so one
// provider instance can serve every media domain (Community today, Guild
// later) without the provider itself knowing about them.
export type StorageKey = string

export interface StorageProvider {
  readonly name: 'local' | 'r2'

  // Writes to a location never served publicly. Used for the raw upload
  // before it has been validated -- kept as a forensic trail even when
  // validation rejects it, since the served file (if any) is always the
  // re-encoded output below, never these bytes.
  writeQuarantine(key: StorageKey, body: Buffer): Promise<void>

  // Writes the final, validated/re-encoded bytes to the publicly-servable
  // location and returns the public URL. Not a move -- the available key
  // commonly differs from the quarantine key (extension is only known after
  // validation), and the bytes always differ (re-encoded).
  writeAvailable(key: StorageKey, body: Buffer, contentType: string): Promise<{ storagePath: string; url: string }>

  // Moves an AVAILABLE object out of public reach (moderation, replacement,
  // orphan cleanup) without destroying it -- a soft delete at the storage
  // layer, mirroring the DB's REMOVED status.
  moveAvailableToRemoved(key: StorageKey): Promise<void>

  // Restores a previously-removed object back to AVAILABLE (moderation
  // restore).
  moveRemovedToAvailable(key: StorageKey, contentType: string): Promise<{ storagePath: string; url: string }>

  // Discards a quarantined object outright (validation rejected it, or the
  // request never completed). Never applies to AVAILABLE/REMOVED objects --
  // those are moved, never deleted, so a mistaken moderation action stays
  // recoverable.
  deleteQuarantine(key: StorageKey): Promise<void>

  publicUrl(key: StorageKey): string
}
