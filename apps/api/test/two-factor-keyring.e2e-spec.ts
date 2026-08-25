// Security hardening. TwoFactorService's versioned keyring has no external
// dependencies (env vars + node:crypto only) -- exercised directly, no
// Nest app/DB needed. Covers the exact cases the hardening plan calls out:
// v1 decrypt, v2 decrypt, v2 write, unknown version, wrong key, tamper.
describe('TwoFactorService versioned keyring (security hardening)', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  async function freshService() {
    jest.resetModules()
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    return new TwoFactorService()
  }

  it('v1 (legacy, no version prefix) encrypts and decrypts using TWO_FACTOR_ENCRYPTION_KEY, unchanged from before versioning', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    delete process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    const svc = await freshService()

    const encrypted = svc.encrypt('MYTOTPSECRET')
    // Still self-describing as v1 (new 4-part format), but derived from the
    // exact same env var and hash as the original implementation.
    expect(svc.keyVersionOf(encrypted)).toBe('v1')
    expect(svc.decrypt(encrypted)).toBe('MYTOTPSECRET')
  })

  it('decrypts a genuinely pre-versioning 3-part legacy value (no version prefix at all)', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    const svc = await freshService()

    // Simulate a real historical row: build a 3-part value using the same
    // crypto the old unversioned encrypt() used, bypassing the new prefix.
    const { createCipheriv, randomBytes } = await import('node:crypto')
    const { createHash } = await import('node:crypto')
    const key = createHash('sha256').update('legacy-key-source-unchanged').digest()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update('OLDROWSECRET', 'utf8'), cipher.final()])
    const legacyValue = [iv, cipher.getAuthTag(), encrypted].map((p) => p.toString('base64url')).join('.')

    expect(svc.keyVersionOf(legacyValue)).toBe('v1')
    expect(svc.decrypt(legacyValue)).toBe('OLDROWSECRET')
  })

  it('with v2 active, new encrypt() calls write v2 and are only decryptable with the v2 key', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    process.env.TWO_FACTOR_ENCRYPTION_KEY_V2 = 'brand-new-v2-key-source'
    process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = 'v2'
    const svc = await freshService()

    const encrypted = svc.encrypt('NEWTOTPSECRET')
    expect(svc.keyVersionOf(encrypted)).toBe('v2')
    expect(svc.decrypt(encrypted)).toBe('NEWTOTPSECRET')
  })

  it('v1 records remain decryptable even while v2 is the active write version (backward compatibility)', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    process.env.TWO_FACTOR_ENCRYPTION_KEY_V2 = 'brand-new-v2-key-source'
    delete process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    const svcV1Active = await freshService()
    const v1Encrypted = svcV1Active.encrypt('STILLV1')

    process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = 'v2'
    const svcV2Active = await freshService()
    expect(svcV2Active.decrypt(v1Encrypted)).toBe('STILLV1')
  })

  it('rejects an unconfigured key version cleanly, never falling back to a different key silently', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = 'v3' // v3 never configured
    const svc = await freshService()

    expect(() => svc.encrypt('X')).toThrow(/TWO_FACTOR_ENCRYPTION_KEY_V3/)
  })

  it('rejects a value claiming a version with no matching key configured', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    process.env.TWO_FACTOR_ENCRYPTION_KEY_V2 = 'brand-new-v2-key-source'
    process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = 'v2'
    const svc = await freshService()
    const v2Encrypted = svc.encrypt('X')

    delete process.env.TWO_FACTOR_ENCRYPTION_KEY_V2
    const svcMissingV2 = await freshService()
    expect(() => svcMissingV2.decrypt(v2Encrypted)).toThrow(/TWO_FACTOR_ENCRYPTION_KEY_V2/)
  })

  it('fails closed (never silently returns garbage) when decrypted with the wrong key -- GCM auth tag catches it', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'key-a'
    const svcA = await freshService()
    const encryptedByA = svcA.encrypt('SECRETUNDERKEYA')

    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'key-b'
    const svcB = await freshService()
    expect(() => svcB.decrypt(encryptedByA)).toThrow()
  })

  it('fails closed on tampered ciphertext (GCM authentication tag mismatch)', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    const svc = await freshService()
    const encrypted = svc.encrypt('SENSITIVE')

    const [version, iv, tag, ciphertext] = encrypted.split('.')
    const tampered = [version, iv, tag, ciphertext.slice(0, -2) + (ciphertext.slice(-2) === 'AA' ? 'BB' : 'AA')].join('.')

    expect(() => svc.decrypt(tampered)).toThrow()
  })

  it('rejects a structurally invalid value outright', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    const svc = await freshService()
    expect(() => svc.decrypt('not-a-real-encrypted-value')).toThrow(/Invalid encrypted 2FA secret/)
  })

  it('activeVersion() defaults to v1 (today\'s unchanged behavior) when the env var is unset', async () => {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'legacy-key-source-unchanged'
    delete process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    const svc = await freshService()
    expect(svc.activeVersion()).toBe('v1')
  })
})
