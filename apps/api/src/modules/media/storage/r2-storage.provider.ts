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
}

// Key prefixes, not separate buckets -- keeps this to one set of credentials
// and one bucket, which is all this phase needs (R2StorageProvider must
// exist and be usable/testable, not be live in production yet).
const PREFIX = { quarantine: 'quarantine/', available: 'available/', removed: 'removed/' } as const

function assertSafeKey(key: StorageKey) {
  if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
    throw new Error(`Unsafe storage key: ${key}`)
  }
}

export class R2StorageProvider implements StorageProvider {
  readonly name = 'r2' as const
  private readonly client: S3Client

  constructor(private readonly options: R2StorageProviderOptions) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey }
    })
  }

  async writeQuarantine(key: StorageKey, body: Buffer) {
    assertSafeKey(key)
    await this.client.send(
      new PutObjectCommand({ Bucket: this.options.bucket, Key: PREFIX.quarantine + key, Body: body })
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
      new PutObjectCommand({ Bucket: this.options.bucket, Key: PREFIX.available + key, Body: body, ContentType: contentType })
    )
    return { storagePath: PREFIX.available + key, url: this.publicUrl(key) }
  }

  async moveAvailableToRemoved(key: StorageKey) {
    await this.move(PREFIX.available, PREFIX.removed, key)
  }

  async moveRemovedToAvailable(key: StorageKey, contentType: string) {
    await this.move(PREFIX.removed, PREFIX.available, key, contentType)
    return { storagePath: PREFIX.available + key, url: this.publicUrl(key) }
  }

  async deleteQuarantine(key: StorageKey) {
    assertSafeKey(key)
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: PREFIX.quarantine + key }))
      .catch(() => undefined)
  }

  publicUrl(key: StorageKey) {
    assertSafeKey(key)
    return `${this.options.publicBaseUrl.replace(/\/+$/, '')}/${key}`
  }
}
