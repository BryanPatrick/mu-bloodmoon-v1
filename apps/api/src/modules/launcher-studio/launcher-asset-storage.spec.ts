// R2LauncherAssetStorageProvider previously threw NotImplementedException
// unconditionally -- this phase (CF-R2-02) made it a real implementation.
// Mocked S3Client, same reasoning as r2-storage.provider.spec.ts: no live
// Cloudflare credentials, no real network call.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { S3Client } from '@aws-sdk/client-s3'
import { LocalLauncherAssetStorageProvider, R2LauncherAssetStorageProvider } from './launcher-asset-storage'

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3')
  return { ...actual, S3Client: jest.fn() }
})

describe('LocalLauncherAssetStorageProvider', () => {
  const originalCwd = process.cwd()
  let root = ''

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bloodmoon-launcher-asset-'))
    jest.spyOn(process, 'cwd').mockReturnValue(root)
  })
  afterEach(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(originalCwd)
    rmSync(root, { recursive: true, force: true })
  })

  it('writes under storage/launcher-assets, returns a /media/launcher-assets/ public URL, and the sha256 matches the real bytes', async () => {
    const provider = new LocalLauncherAssetStorageProvider()
    const buffer = Buffer.from('fake png bytes')
    const result = await provider.save(buffer, 'png')
    expect(result.publicUrl).toBe(`/media/launcher-assets/${result.storageKey}`)
    expect(result.sizeBytes).toBe(buffer.length)
    const written = join(root, 'storage', 'launcher-assets', result.storageKey)
    expect(existsSync(written)).toBe(true)
    expect(readFileSync(written)).toEqual(buffer)
  })
})

describe('R2LauncherAssetStorageProvider', () => {
  const ENV_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL', 'LAUNCHER_R2_BUCKET'] as const
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) { saved[key] = process.env[key]; delete process.env[key] }
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
  })
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    jest.clearAllMocks()
  })

  function mockSend() {
    const send = jest.fn().mockResolvedValue({})
    ;(S3Client as unknown as jest.Mock).mockImplementation(() => ({ send }))
    return send
  }

  it('uploads under the launcher-assets/ namespace and returns a real R2 public URL (not the local /media/launcher-assets/ route)', async () => {
    const send = mockSend()
    const provider = new R2LauncherAssetStorageProvider()
    const buffer = Buffer.from('fake png bytes')
    const result = await provider.save(buffer, 'png')
    expect(result.publicUrl).toBe(`https://pub-test.r2.dev/launcher-assets/available/${result.storageKey}`)
    expect(result.sizeBytes).toBe(buffer.length)
    const put = send.mock.calls[0][0]
    expect(put.input).toMatchObject({ Bucket: 'community-bucket', Key: `launcher-assets/available/${result.storageKey}`, ContentType: 'image/png' })
  })

  it('falls back to R2_BUCKET when LAUNCHER_R2_BUCKET is unset, but prefers LAUNCHER_R2_BUCKET when set', async () => {
    process.env.LAUNCHER_R2_BUCKET = 'launcher-only-bucket'
    const send = mockSend()
    const provider = new R2LauncherAssetStorageProvider()
    await provider.save(Buffer.from('x'), 'jpg')
    expect(send.mock.calls[0][0].input.Bucket).toBe('launcher-only-bucket')
  })

  it('derives Content-Type from the extension, defaulting to application/octet-stream for an unrecognized one', async () => {
    const send = mockSend()
    const provider = new R2LauncherAssetStorageProvider()
    await provider.save(Buffer.from('x'), 'bin')
    expect(send.mock.calls[0][0].input.ContentType).toBe('application/octet-stream')
  })

  it('rejects with a secret-free error naming the missing variable when a required R2 credential is absent', async () => {
    delete process.env.R2_ACCESS_KEY_ID
    const provider = new R2LauncherAssetStorageProvider()
    await expect(provider.save(Buffer.from('x'), 'png')).rejects.toThrow('Missing required environment variable: R2_ACCESS_KEY_ID')
  })

  it('propagates a real S3 API failure rather than swallowing it', async () => {
    const send = jest.fn().mockRejectedValue(new Error('503 Service Unavailable'))
    ;(S3Client as unknown as jest.Mock).mockImplementation(() => ({ send }))
    const provider = new R2LauncherAssetStorageProvider()
    await expect(provider.save(Buffer.from('x'), 'png')).rejects.toThrow('503 Service Unavailable')
  })
})
