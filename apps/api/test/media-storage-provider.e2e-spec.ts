// Provider-abstraction tests using LocalStorageProvider against a throwaway
// temp directory -- no DB, no HTTP, no network (R2StorageProvider is not
// exercised here: it would need real or mocked AWS SDK calls, out of scope
// for this phase's "must exist and be usable" bar). Named *.e2e-spec.ts to
// match this repo's single Jest config, same reasoning as
// media-image-validation.e2e-spec.ts.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStorageProvider } from '../src/modules/media/storage/local-storage.provider'

describe('LocalStorageProvider', () => {
  let root = ''
  let provider: LocalStorageProvider

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'bloodmoon-storage-provider-'))
    provider = new LocalStorageProvider({
      availableDir: join(root, 'available'),
      quarantineDir: join(root, 'quarantine'),
      removedDir: join(root, 'removed'),
      publicUrlPrefix: '/api/media/community'
    })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('writeQuarantine writes to the quarantine dir only -- never the available (publicly-served) dir', async () => {
    await provider.writeQuarantine('a.upload', Buffer.from('raw upload bytes'))
    expect(existsSync(join(root, 'quarantine', 'a.upload'))).toBe(true)
    expect(existsSync(join(root, 'available', 'a.upload'))).toBe(false)
  })

  it('writeAvailable writes final bytes to the available dir and returns a public URL under the given prefix', async () => {
    const { url, storagePath } = await provider.writeAvailable('b.webp', Buffer.from('final bytes'), 'image/webp')
    expect(url).toBe('/api/media/community/b.webp')
    expect(existsSync(storagePath)).toBe(true)
    expect(readFileSync(storagePath, 'utf8')).toBe('final bytes')
  })

  it('writeAvailable on an existing key overwrites rather than throwing (duplicate key is well-defined, not a crash)', async () => {
    await provider.writeAvailable('c.webp', Buffer.from('first'), 'image/webp')
    await provider.writeAvailable('c.webp', Buffer.from('second'), 'image/webp')
    expect(readFileSync(join(root, 'available', 'c.webp'), 'utf8')).toBe('second')
  })

  it('moveAvailableToRemoved takes a file out of the available (served) dir into removed', async () => {
    await provider.writeAvailable('d.webp', Buffer.from('x'), 'image/webp')
    await provider.moveAvailableToRemoved('d.webp')
    expect(existsSync(join(root, 'available', 'd.webp'))).toBe(false)
    expect(existsSync(join(root, 'removed', 'd.webp'))).toBe(true)
  })

  it('moveRemovedToAvailable restores a removed file back to the served dir', async () => {
    await provider.writeAvailable('e.webp', Buffer.from('y'), 'image/webp')
    await provider.moveAvailableToRemoved('e.webp')
    const { url } = await provider.moveRemovedToAvailable('e.webp', 'image/webp')
    expect(url).toBe('/api/media/community/e.webp')
    expect(existsSync(join(root, 'available', 'e.webp'))).toBe(true)
    expect(existsSync(join(root, 'removed', 'e.webp'))).toBe(false)
  })

  it('deleteQuarantine removes the file and is a safe no-op when the file is already gone', async () => {
    await provider.writeQuarantine('f.upload', Buffer.from('z'))
    await provider.deleteQuarantine('f.upload')
    expect(existsSync(join(root, 'quarantine', 'f.upload'))).toBe(false)
    await expect(provider.deleteQuarantine('f.upload')).resolves.toBeUndefined()
  })

  const maliciousKeys = [
    '../../../etc/passwd',
    '..\\..\\windows\\system32\\config',
    'sub/dir/escape.png',
    'sub\\dir\\escape.png',
    '..',
    ''
  ]

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on writeQuarantine', async (key) => {
    await expect(provider.writeQuarantine(key, Buffer.from('x'))).rejects.toThrow()
  })

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on writeAvailable', async (key) => {
    await expect(provider.writeAvailable(key, Buffer.from('x'), 'image/webp')).rejects.toThrow()
  })

  it.each(maliciousKeys)('rejects a path-traversal-shaped key %j on publicUrl', (key) => {
    expect(() => provider.publicUrl(key)).toThrow()
  })
})
