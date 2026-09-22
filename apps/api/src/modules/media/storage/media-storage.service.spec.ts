// MediaStorageService.buildProvider() had no unit coverage before Phase
// CF-R2-02 -- its behavior was only ever exercised indirectly through
// community-media.e2e-spec.ts's local-provider path. This file covers the
// selection logic itself, including the R2 branch and invalid-configuration
// errors, without a real database or real R2 credentials.
import { LocalStorageProvider } from './local-storage.provider'
import { R2StorageProvider } from './r2-storage.provider'
import { MediaStorageService } from './media-storage.service'

const ENV_KEYS = [
  'MEDIA_STORAGE_PROVIDER', 'COMMUNITY_MEDIA_DIR', 'MEDIA_QUARANTINE_DIR', 'MEDIA_REMOVED_DIR', 'API_GLOBAL_PREFIX',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'
] as const

describe('MediaStorageService.buildProvider', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const key of ENV_KEYS) { saved[key] = process.env[key]; delete process.env[key] }
  })
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('defaults to local when MEDIA_STORAGE_PROVIDER is unset', () => {
    const provider = MediaStorageService.buildProvider()
    expect(provider).toBeInstanceOf(LocalStorageProvider)
    expect(provider.name).toBe('local')
    expect(provider.publicUrl('photo.webp')).toBe('/api/media/community/photo.webp')
  })

  it('selects R2StorageProvider (no namespace -- community keeps the bare available/ prefix) when MEDIA_STORAGE_PROVIDER=r2', () => {
    process.env.MEDIA_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    const provider = MediaStorageService.buildProvider()
    expect(provider).toBeInstanceOf(R2StorageProvider)
    expect(provider.publicUrl('photo.webp')).toBe('https://pub-test.r2.dev/available/photo.webp')
  })

  it.each(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'])(
    'throws a secret-free error naming the missing variable when %s is absent under MEDIA_STORAGE_PROVIDER=r2',
    (missing) => {
      process.env.MEDIA_STORAGE_PROVIDER = 'r2'
      const values: Record<string, string> = {
        R2_ACCOUNT_ID: 'acct', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret',
        R2_BUCKET: 'bucket', R2_PUBLIC_BASE_URL: 'https://pub-test.r2.dev'
      }
      for (const [key, value] of Object.entries(values)) {
        if (key !== missing) process.env[key] = value
      }
      expect(() => MediaStorageService.buildProvider()).toThrow(`Missing required environment variable: ${missing}`)
    }
  )

  it('throws on an unrecognized MEDIA_STORAGE_PROVIDER value rather than silently falling back to local', () => {
    process.env.MEDIA_STORAGE_PROVIDER = 'nonsense'
    expect(() => MediaStorageService.buildProvider()).toThrow('Unknown MEDIA_STORAGE_PROVIDER: nonsense')
  })

  it('a MediaStorageService instance always reflects the CURRENT env, not a value cached at construction (relied on by community-media.e2e-spec.ts)', () => {
    const service = new MediaStorageService()
    expect(service.name).toBe('local')
    process.env.MEDIA_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    expect(service.name).toBe('r2')
  })
})
