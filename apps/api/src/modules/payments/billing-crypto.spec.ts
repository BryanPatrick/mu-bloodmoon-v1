import { BillingEnvelopeInvalidError, BillingKeyNotConfiguredError, activeKeyVersion, keyVersionOf, openField, sealField } from './billing-crypto'

const original = {
  v1: process.env.BILLING_PII_KEY_B64,
  v2: process.env.BILLING_PII_KEY_V2_B64,
  active: process.env.BILLING_PII_ACTIVE_KEY_VERSION
}

const V1_KEY = Buffer.alloc(32, 7).toString('base64')
const V2_KEY = Buffer.alloc(32, 9).toString('base64')

beforeEach(() => {
  process.env.BILLING_PII_KEY_B64 = V1_KEY
  delete process.env.BILLING_PII_KEY_V2_B64
  delete process.env.BILLING_PII_ACTIVE_KEY_VERSION
})

afterEach(() => {
  const values = {
    BILLING_PII_KEY_B64: original.v1,
    BILLING_PII_KEY_V2_B64: original.v2,
    BILLING_PII_ACTIVE_KEY_VERSION: original.active
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('billing-crypto: version behavior', () => {
  it('v1 encrypt/decrypt round-trips', () => {
    const envelope = sealField('12345678900', 'acc1', 'cpfCnpj')
    expect(openField(envelope, 'acc1', 'cpfCnpj')).toBe('12345678900')
  })

  it('v2 encrypt/decrypt round-trips once configured and active', () => {
    process.env.BILLING_PII_KEY_V2_B64 = V2_KEY
    process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'
    const envelope = sealField('Maria Silva', 'acc1', 'legalName')
    expect(keyVersionOf(envelope)).toBe('v2')
    expect(openField(envelope, 'acc1', 'legalName')).toBe('Maria Silva')
  })

  it('ACTIVE=v1 (default) writes under v1', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    expect(keyVersionOf(envelope)).toBe('v1')
    expect(activeKeyVersion()).toBe('v1')
  })

  it('ACTIVE=v2 writes under v2', () => {
    process.env.BILLING_PII_KEY_V2_B64 = V2_KEY
    process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'
    expect(activeKeyVersion()).toBe('v2')
    expect(keyVersionOf(sealField('value', 'acc1', 'legalName'))).toBe('v2')
  })

  it('a v1 record still decrypts correctly while ACTIVE is v2', () => {
    const v1Envelope = sealField('old-value', 'acc1', 'legalName')
    process.env.BILLING_PII_KEY_V2_B64 = V2_KEY
    process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'
    expect(openField(v1Envelope, 'acc1', 'legalName')).toBe('old-value')
  })

  it('the pre-existing 4-part legacy envelope (no explicit format field) still decrypts as v1', () => {
    // Exactly the shape billing-profile.service.ts wrote before this
    // change: `v1.nonce.tag.ciphertext`.
    const modern = sealField('legacy-compatible', 'acc1', 'cpfCnpj')
    const parts = modern.split('.')
    expect(parts).toHaveLength(5) // [format, version, nonce, tag, ciphertext]
    const legacyShape = parts.slice(1).join('.') // drop the explicit format segment
    expect(openField(legacyShape, 'acc1', 'cpfCnpj')).toBe('legacy-compatible')
  })

  it('missing key for the required version fails closed', () => {
    delete process.env.BILLING_PII_KEY_B64
    expect(() => sealField('value', 'acc1', 'legalName')).toThrow(BillingKeyNotConfiguredError)
  })

  it('a value written under an unconfigured key version fails closed on decrypt, not silently falls back to another key', () => {
    process.env.BILLING_PII_KEY_V2_B64 = V2_KEY
    process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'
    const envelope = sealField('value', 'acc1', 'legalName')
    delete process.env.BILLING_PII_KEY_V2_B64 // simulate v2 key removed/misconfigured later
    expect(() => openField(envelope, 'acc1', 'legalName')).toThrow(BillingKeyNotConfiguredError)
  })

  it('a syntactically valid but unconfigured version fails closed with a clear "not configured" error', () => {
    // v99 matches the version format but nothing set BILLING_PII_KEY_V99_B64.
    expect(() => openField('1.v99.abc.def.ghi', 'acc1', 'legalName')).toThrow(BillingKeyNotConfiguredError)
  })

  it('a malformed version string (fails the version format itself) is rejected as an invalid envelope', () => {
    expect(() => openField('1.version-two.abc.def.ghi', 'acc1', 'legalName')).toThrow(BillingEnvelopeInvalidError)
  })
})

describe('billing-crypto: tamper resistance', () => {
  function tamperLastSegment(envelope: string, mutate: (b64url: string) => string): string {
    const parts = envelope.split('.')
    parts[parts.length - 1] = mutate(parts[parts.length - 1]!)
    return parts.join('.')
  }

  it('modified ciphertext does not decrypt', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    const tampered = tamperLastSegment(envelope, (b64url) => b64url.slice(0, -2) + (b64url.at(-2) === 'A' ? 'B' : 'A') + b64url.at(-1))
    expect(() => openField(tampered, 'acc1', 'legalName')).toThrow()
  })

  it('modified nonce does not decrypt', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    const parts = envelope.split('.')
    const nonceIdx = 2
    parts[nonceIdx] = parts[nonceIdx]!.slice(0, -2) + (parts[nonceIdx]!.at(-2) === 'A' ? 'B' : 'A') + parts[nonceIdx]!.at(-1)
    expect(() => openField(parts.join('.'), 'acc1', 'legalName')).toThrow()
  })

  it('modified auth tag does not decrypt', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    const parts = envelope.split('.')
    const tagIdx = 3
    parts[tagIdx] = parts[tagIdx]!.slice(0, -2) + (parts[tagIdx]!.at(-2) === 'A' ? 'B' : 'A') + parts[tagIdx]!.at(-1)
    expect(() => openField(parts.join('.'), 'acc1', 'legalName')).toThrow()
  })

  it('modified envelope format field is rejected', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    const parts = envelope.split('.')
    parts[0] = '2'
    expect(() => openField(parts.join('.'), 'acc1', 'legalName')).toThrow(BillingEnvelopeInvalidError)
  })

  it('modified key version field fails closed (unconfigured version), not silent reinterpretation', () => {
    const envelope = sealField('value', 'acc1', 'legalName')
    const parts = envelope.split('.')
    parts[1] = 'v7'
    expect(() => openField(parts.join('.'), 'acc1', 'legalName')).toThrow(BillingKeyNotConfiguredError)
  })
})

describe('billing-crypto: AAD binding (field/account substitution)', () => {
  it('ciphertext for Account A cannot be decrypted under Account B', () => {
    const envelope = sealField('12345678900', 'accountA', 'cpfCnpj')
    expect(() => openField(envelope, 'accountB', 'cpfCnpj')).toThrow()
  })

  it('cpfCnpj ciphertext cannot be decrypted as legalName, even for the same account/key', () => {
    const cpfEnvelope = sealField('12345678900', 'acc1', 'cpfCnpj')
    expect(() => openField(cpfEnvelope, 'acc1', 'legalName')).toThrow()
  })

  it('legalName ciphertext cannot be decrypted as cpfCnpj, even for the same account/key', () => {
    const nameEnvelope = sealField('Maria Silva', 'acc1', 'legalName')
    expect(() => openField(nameEnvelope, 'acc1', 'cpfCnpj')).toThrow()
  })
})

describe('billing-crypto: rotation scenario', () => {
  it('create under v1, rotate active to v2, new writes use v2, old v1 record still decrypts', () => {
    const v1Record = sealField('old-name', 'acc1', 'legalName')
    expect(keyVersionOf(v1Record)).toBe('v1')

    process.env.BILLING_PII_KEY_V2_B64 = V2_KEY
    process.env.BILLING_PII_ACTIVE_KEY_VERSION = 'v2'

    const v2Record = sealField('new-name', 'acc2', 'legalName')
    expect(keyVersionOf(v2Record)).toBe('v2')

    // Old record, written before rotation, still decrypts correctly.
    expect(openField(v1Record, 'acc1', 'legalName')).toBe('old-name')
    expect(openField(v2Record, 'acc2', 'legalName')).toBe('new-name')

    // Explicit re-encryption (what a future migration tool would do):
    // decrypt under the old key, re-seal under the now-active key.
    const plaintext = openField(v1Record, 'acc1', 'legalName')
    const reEncrypted = sealField(plaintext, 'acc1', 'legalName')
    expect(keyVersionOf(reEncrypted)).toBe('v2')
    expect(openField(reEncrypted, 'acc1', 'legalName')).toBe('old-name')
  })
})
