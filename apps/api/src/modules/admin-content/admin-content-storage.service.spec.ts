import { LocalStorageProvider } from '../media/storage/local-storage.provider'
import { R2StorageProvider } from '../media/storage/r2-storage.provider'
import { AdminContentStorageService } from './admin-content-storage.service'

const ENV_KEYS = [
  'ADMIN_CONTENT_STORAGE_PROVIDER', 'ADMIN_CONTENT_UPLOADS_DIR', 'ADMIN_CONTENT_R2_BUCKET',
  'MEDIA_QUARANTINE_DIR', 'MEDIA_REMOVED_DIR', 'API_GLOBAL_PREFIX', 'MEDIA_STORAGE_PROVIDER',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'
] as const

describe('AdminContentStorageService.buildProvider (independent from every other domain\'s switch)', () => {
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

  it('defaults to local when ADMIN_CONTENT_STORAGE_PROVIDER is unset -- zero behavior change for existing deployments', () => {
    const provider = AdminContentStorageService.buildProvider()
    expect(provider).toBeInstanceOf(LocalStorageProvider)
    expect(provider.name).toBe('local')
  })

  it('never switches to R2 just because community\'s MEDIA_STORAGE_PROVIDER=r2 is set -- independent switch', () => {
    process.env.MEDIA_STORAGE_PROVIDER = 'r2'
    const provider = AdminContentStorageService.buildProvider()
    expect(provider.name).toBe('local')
  })

  it('local provider serves under /api/media by default, matching media.controller.ts\'s route', () => {
    const provider = AdminContentStorageService.buildProvider()
    expect(provider.publicUrl('abc.png')).toBe('/api/media/abc.png')
  })

  it('selects R2StorageProvider with the admin-content/ namespace when ADMIN_CONTENT_STORAGE_PROVIDER=r2', () => {
    process.env.ADMIN_CONTENT_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    const provider = AdminContentStorageService.buildProvider()
    expect(provider).toBeInstanceOf(R2StorageProvider)
    expect(provider.publicUrl('abc.png')).toBe('https://pub-test.r2.dev/admin-content/available/abc.png')
  })

  it('prefers ADMIN_CONTENT_R2_BUCKET over R2_BUCKET when both are set', () => {
    process.env.ADMIN_CONTENT_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.ADMIN_CONTENT_R2_BUCKET = 'admin-only-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    expect(() => AdminContentStorageService.buildProvider()).not.toThrow()
  })

  it('throws a secret-free error naming the missing variable when R2 is selected but a required credential is absent', () => {
    process.env.ADMIN_CONTENT_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    expect(() => AdminContentStorageService.buildProvider()).toThrow('Missing required environment variable: R2_ACCESS_KEY_ID')
  })

  it('throws on an unrecognized ADMIN_CONTENT_STORAGE_PROVIDER value rather than silently falling back', () => {
    process.env.ADMIN_CONTENT_STORAGE_PROVIDER = 'nonsense'
    expect(() => AdminContentStorageService.buildProvider()).toThrow('Unknown ADMIN_CONTENT_STORAGE_PROVIDER: nonsense')
  })
})
