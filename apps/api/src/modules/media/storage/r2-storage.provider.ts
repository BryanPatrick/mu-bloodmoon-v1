import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import type { StorageKey, StorageProvider } from './storage-provider'

export interface R2StorageProviderOptions {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  // Public base URL for the bucket (a custom domain or r2.dev subdomain) --
  // R2 objects are not reachable via the S3 API endpoint itself.
  publicBaseUrl: string
  // Optional key namespace so more than one media domain (community, guild,
  // ...) can share one bucket + one credential set without their
  // available/quarantine/removed prefixes colliding -- e.g. 'guild/'
  // produces keys under 'guild/available/<key>' instead of 'available/<key>'.
  // Defaults to '' (today's community-media behavior, unchanged). Added
  // Phase CF-R2-02; never retroactively applied to already-written community
  // keys, since community has always used the empty namespace.
  namespace?: string
}

function assertSafeKey(key: StorageKey) {
  if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
    throw new Error(`Unsafe storage key: ${key}`)
  }
}

export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2' as const
  private readonly client: S3Client
  // Per-instance, not module-level -- namespace varies per caller (see
  // R2StorageProviderOptions.namespace above).
  private readonly prefix: { quarantine: string; available: string; removed: string }

  constructor(private readonly options: R2StorageProviderOptions) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey }
    })
    const ns = options.namespace || ''
    this.prefix = { quarantine: `${ns}quarantine/`, available: `${ns}available/`, removed: `${ns}removed/` }
  }

  async writeQuarantine(key: StorageKey, body: Buffer) {
    assertSafeKey(key)
    await this.client.send(
      new PutObjectCommand({ Bucket: this.options.bucket, Key: this.prefix.quarantine + key, Body: body })
    )
  }

  private async move(fromPrefix: string, toPrefix: string, key: StorageKey, contentType?: string) {
    assertSafeKey(key)
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.options.bucket,
        CopySource: `${this.options.bucket}/${fromPrefix}${key}`,
        Key: toPrefix + key,
        ...(contentType ? { ContentType: contentType, MetadataDirective: 'REPLACE' } : {})
      })
    )
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: fromPrefix + key }))
  }

  async writeAvailable(key: StorageKey, body: Buffer, contentType: string) {
    assertSafeKey(key)
    await this.client.send(
      new PutObjectCommand({ Bucket: this.options.bucket, Key: this.prefix.available + key, Body: body, ContentType: contentType })
    )
    return { storagePath: this.prefix.available + key, url: this.publicUrl(key) }
  }

  async moveAvailableToRemoved(key: StorageKey) {
    await this.move(this.prefix.available, this.prefix.removed, key)
  }

  async moveRemovedToAvailable(key: StorageKey, contentType: string) {
    await this.move(this.prefix.removed, this.prefix.available, key, contentType)
    return { storagePath: this.prefix.available + key, url: this.publicUrl(key) }
  }

  async deleteQuarantine(key: StorageKey) {
    assertSafeKey(key)
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: this.prefix.quarantine + key }))
      .catch(() => undefined)
  }

  // Always the available/ prefix, regardless of what the caller is doing --
  // quarantine/removed content must never have a public URL constructed for
  // it, so this method can't accidentally be pointed at those prefixes.
  // BUG FIX (Phase CF-R2-02): this previously omitted the available/ prefix
  // entirely, so the returned URL never matched where writeAvailable()
  // actually stored the object -- caught by this phase's new test coverage,
  // R2StorageProvider had zero tests before now so it went unnoticed.
  publicUrl(key: StorageKey) {
    assertSafeKey(key)
    return `${this.options.publicBaseUrl.replace(/\/+$/, '')}/${this.prefix.available}${key}`
  }
}
