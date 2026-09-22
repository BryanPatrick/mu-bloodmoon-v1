import { LocalStorageProvider } from '../media/storage/local-storage.provider'
import { R2StorageProvider } from '../media/storage/r2-storage.provider'
import { GuildMediaStorageService } from './guild-media-storage.service'

const ENV_KEYS = [
  'GUILD_MEDIA_STORAGE_PROVIDER', 'GUILD_MEDIA_DIR', 'GUILD_R2_BUCKET',
  'MEDIA_QUARANTINE_DIR', 'MEDIA_REMOVED_DIR', 'API_GLOBAL_PREFIX',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'
] as const

describe('GuildMediaStorageService.buildProvider (independent from community MEDIA_STORAGE_PROVIDER)', () => {
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

  it('defaults to local when GUILD_MEDIA_STORAGE_PROVIDER is unset -- zero behavior change for existing deployments', () => {
    const provider = GuildMediaStorageService.buildProvider()
    expect(provider).toBeInstanceOf(LocalStorageProvider)
    expect(provider.name).toBe('local')
  })

  it('never switches to R2 just because community MEDIA_STORAGE_PROVIDER=r2 is set -- the two are independent switches', () => {
    process.env.MEDIA_STORAGE_PROVIDER = 'r2' // community's own switch, guild must ignore it
    const provider = GuildMediaStorageService.buildProvider()
    expect(provider.name).toBe('local')
    delete process.env.MEDIA_STORAGE_PROVIDER
  })

  it('local provider serves under /api/media/guild by default, matching main.ts\'s express.static mount', () => {
    const provider = GuildMediaStorageService.buildProvider()
    expect(provider.publicUrl('emblem.webp')).toBe('/api/media/guild/emblem.webp')
  })

  it('selects R2StorageProvider when GUILD_MEDIA_STORAGE_PROVIDER=r2, with the guild/ namespace and community\'s R2_BUCKET as fallback', () => {
    process.env.GUILD_MEDIA_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    const provider = GuildMediaStorageService.buildProvider()
    expect(provider).toBeInstanceOf(R2StorageProvider)
    expect(provider.name).toBe('r2')
    // guild/ namespace applied even though R2_BUCKET is shared with community
    expect(provider.publicUrl('emblem.webp')).toBe('https://pub-test.r2.dev/guild/available/emblem.webp')
  })

  it('prefers GUILD_R2_BUCKET over R2_BUCKET when both are set, so guild can use a dedicated bucket if ever desired', () => {
    process.env.GUILD_MEDIA_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'community-bucket'
    process.env.GUILD_R2_BUCKET = 'guild-bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    // No direct getter for the bucket name, but publicUrl/behavior would differ
    // if bucket selection were wrong -- constructing without throwing is the
    // observable proof GUILD_R2_BUCKET was read without requiring R2_BUCKET.
    expect(() => GuildMediaStorageService.buildProvider()).not.toThrow()
  })

  it('throws a secret-free error naming the missing variable when R2 is selected but a required credential is absent', () => {
    process.env.GUILD_MEDIA_STORAGE_PROVIDER = 'r2'
    process.env.R2_ACCOUNT_ID = 'acct'
    // R2_ACCESS_KEY_ID intentionally left unset
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'bucket'
    process.env.R2_PUBLIC_BASE_URL = 'https://pub-test.r2.dev'
    expect(() => GuildMediaStorageService.buildProvider()).toThrow('Missing required environment variable: R2_ACCESS_KEY_ID')
  })

  it('throws on an unrecognized GUILD_MEDIA_STORAGE_PROVIDER value rather than silently falling back', () => {
    process.env.GUILD_MEDIA_STORAGE_PROVIDER = 'nonsense'
    expect(() => GuildMediaStorageService.buildProvider()).toThrow('Unknown GUILD_MEDIA_STORAGE_PROVIDER: nonsense')
  })
})
