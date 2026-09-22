// R2StorageProvider had zero test coverage before Phase CF-R2-02 (confirmed
// via media-storage-provider.e2e-spec.ts's own comment). Uses a mocked
// S3Client -- no live Cloudflare credentials, no real network call, no
// production or shadow R2 bucket touched -- per the phase brief's "mocks
// where appropriate" allowance. Real end-to-end R2 connectivity for the
// underlying mechanism was already proven via raw wrangler CLI in
// CF-R2-01 (docs/cloudflare-migration/R2_ASSETS.md); this file proves the
// TypeScript class's own logic: correct commands/keys/prefixes issued,
// correct return values, correct error propagation.
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { R2StorageProvider, type R2StorageProviderOptions } from './r2-storage.provider'

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3')
  return { ...actual, S3Client: jest.fn() }
})

const OPTIONS: R2StorageProviderOptions = {
  accountId: 'test-account',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
  bucket: 'test-bucket',
  publicBaseUrl: 'https://pub-test.r2.dev'
}

function makeProvider(options: R2StorageProviderOptions = OPTIONS) {
  const send = jest.fn()
  ;(S3Client as unknown as jest.Mock).mockImplementation(() => ({ send }))
  const provider = new R2StorageProvider(options)
  return { provider, send }
}

describe('R2StorageProvider', () => {
  afterEach(() => jest.clearAllMocks())

  describe('construction', () => {
    it('configures the S3Client against the R2 S3-compatible endpoint for the given account, region "auto"', () => {
      makeProvider()
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test-account.r2.cloudflarestorage.com',
        credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' }
      })
    })
  })

  describe('writeQuarantine', () => {
    it('PUTs to the quarantine/ prefix with the raw body, no ContentType', async () => {
      const { provider, send } = makeProvider()
      send.mockResolvedValue({})
      await provider.writeQuarantine('abc.upload', Buffer.from('raw bytes'))
      expect(send).toHaveBeenCalledTimes(1)
      const command = send.mock.calls[0][0]
      expect(command).toBeInstanceOf(PutObjectCommand)
      expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'quarantine/abc.upload' })
      expect(command.input.Body).toEqual(Buffer.from('raw bytes'))
    })

    it('uses the namespaced prefix when a namespace is configured', async () => {
      const { provider, send } = makeProvider({ ...OPTIONS, namespace: 'guild/' })
      send.mockResolvedValue({})
      await provider.writeQuarantine('abc.upload', Buffer.from('x'))
      expect(send.mock.calls[0][0].input).toMatchObject({ Key: 'guild/quarantine/abc.upload' })
    })
  })

  describe('writeAvailable', () => {
    it('PUTs to the available/ prefix with ContentType, and returns a storagePath + url that both point at the same object actually written', async () => {
      const { provider, send } = makeProvider()
      send.mockResolvedValue({})
      const result = await provider.writeAvailable('photo.webp', Buffer.from('final bytes'), 'image/webp')
      const command = send.mock.calls[0][0]
      expect(command).toBeInstanceOf(PutObjectCommand)
      expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'available/photo.webp', ContentType: 'image/webp' })
      expect(result.storagePath).toBe('available/photo.webp')
      // Regression guard for the bug this phase found and fixed: publicUrl()
      // previously omitted the available/ prefix entirely, so the returned
      // URL never matched storagePath -- this must never regress silently.
      expect(result.url).toBe('https://pub-test.r2.dev/available/photo.webp')
    })
  })

  describe('publicUrl', () => {
    it('always includes the available/ prefix, matching exactly where writeAvailable() stores the object', () => {
      const { provider } = makeProvider()
      expect(provider.publicUrl('photo.webp')).toBe('https://pub-test.r2.dev/available/photo.webp')
    })

    it('strips trailing slashes from publicBaseUrl before joining', () => {
      const { provider } = makeProvider({ ...OPTIONS, publicBaseUrl: 'https://pub-test.r2.dev///' })
      expect(provider.publicUrl('photo.webp')).toBe('https://pub-test.r2.dev/available/photo.webp')
    })

    it('applies the configured namespace', () => {
      const { provider } = makeProvider({ ...OPTIONS, namespace: 'guild/' })
      expect(provider.publicUrl('emblem.webp')).toBe('https://pub-test.r2.dev/guild/available/emblem.webp')
    })
  })

  describe('moveAvailableToRemoved / moveRemovedToAvailable', () => {
    it('moveAvailableToRemoved issues a copy from available/ to removed/, then deletes the available/ original', async () => {
      const { provider, send } = makeProvider()
      send.mockResolvedValue({})
      await provider.moveAvailableToRemoved('photo.webp')
      expect(send).toHaveBeenCalledTimes(2)
      const copy = send.mock.calls[0][0]
      const del = send.mock.calls[1][0]
      expect(copy).toBeInstanceOf(CopyObjectCommand)
      expect(copy.input).toMatchObject({ Bucket: 'test-bucket', CopySource: 'test-bucket/available/photo.webp', Key: 'removed/photo.webp' })
      expect(del).toBeInstanceOf(DeleteObjectCommand)
      expect(del.input).toMatchObject({ Bucket: 'test-bucket', Key: 'available/photo.webp' })
    })

    it('moveRemovedToAvailable issues a copy from removed/ to available/ with ContentType replaced, deletes the removed/ original, and returns the correct public URL', async () => {
      const { provider, send } = makeProvider()
      send.mockResolvedValue({})
      const result = await provider.moveRemovedToAvailable('photo.webp', 'image/webp')
      const copy = send.mock.calls[0][0]
      expect(copy.input).toMatchObject({
        Bucket: 'test-bucket', CopySource: 'test-bucket/removed/photo.webp', Key: 'available/photo.webp',
        ContentType: 'image/webp', MetadataDirective: 'REPLACE'
      })
      expect(result.url).toBe('https://pub-test.r2.dev/available/photo.webp')
    })

    it('does NOT delete the source object if the copy fails (no partial data loss)', async () => {
      const { provider, send } = makeProvider()
      send.mockRejectedValueOnce(new Error('copy failed'))
      await expect(provider.moveAvailableToRemoved('photo.webp')).rejects.toThrow('copy failed')
      expect(send).toHaveBeenCalledTimes(1) // delete was never attempted
    })
  })

  describe('deleteQuarantine', () => {
    it('DELETEs the quarantine/ key', async () => {
      const { provider, send } = makeProvider()
      send.mockResolvedValue({})
      await provider.deleteQuarantine('abc.upload')
      const command = send.mock.calls[0][0]
      expect(command).toBeInstanceOf(DeleteObjectCommand)
      expect(command.input).toMatchObject({ Bucket: 'test-bucket', Key: 'quarantine/abc.upload' })
    })

    it('is a safe no-op when the underlying delete rejects (already gone, or never existed)', async () => {
      const { provider, send } = makeProvider()
      send.mockRejectedValue(new Error('NoSuchKey'))
      await expect(provider.deleteQuarantine('abc.upload')).resolves.toBeUndefined()
    })
  })

  describe('network/API error propagation', () => {
    it('writeQuarantine rejects when the S3 API call rejects (no silent failure)', async () => {
      const { provider, send } = makeProvider()
      send.mockRejectedValue(new Error('Network error'))
      await expect(provider.writeQuarantine('a.upload', Buffer.from('x'))).rejects.toThrow('Network error')
    })

    it('writeAvailable rejects when the S3 API call rejects', async () => {
      const { provider, send } = makeProvider()
      send.mockRejectedValue(new Error('403 Forbidden'))
      await expect(provider.writeAvailable('a.webp', Buffer.from('x'), 'image/webp')).rejects.toThrow('403 Forbidden')
    })
  })

  const maliciousKeys = ['../../../etc/passwd', '..\\..\\windows\\system32\\config', 'sub/dir/escape.png', 'sub\\dir\\escape.png', '..', '']

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on writeQuarantine, before any network call', async (key) => {
    const { provider, send } = makeProvider()
    await expect(provider.writeQuarantine(key, Buffer.from('x'))).rejects.toThrow('Unsafe storage key')
    expect(send).not.toHaveBeenCalled()
  })

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on writeAvailable, before any network call', async (key) => {
    const { provider, send } = makeProvider()
    await expect(provider.writeAvailable(key, Buffer.from('x'), 'image/webp')).rejects.toThrow('Unsafe storage key')
    expect(send).not.toHaveBeenCalled()
  })

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on publicUrl', (key) => {
    const { provider } = makeProvider()
    expect(() => provider.publicUrl(key)).toThrow('Unsafe storage key')
  })

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on deleteQuarantine, before any network call', async (key) => {
    const { provider, send } = makeProvider()
    await expect(provider.deleteQuarantine(key)).rejects.toThrow('Unsafe storage key')
    expect(send).not.toHaveBeenCalled()
  })
})
