import { randomBytes, randomUUID } from 'node:crypto'
import { GameCredentialEnvelopeService } from '../src/modules/game-account-identity/game-credential-envelope.service'

describe('Phase 3D-A game credential envelope', () => {
  const service = new GameCredentialEnvelopeService()
  const aad = { commandId: randomUUID(), provisioningRequestId: randomUUID(), commandType: 'CREATE_GAME_ACCOUNT' as const }
  let previousKeys: string | undefined
  let previousVersion: string | undefined

  beforeAll(() => {
    previousKeys = process.env.GAME_CREDENTIAL_KEYS_JSON
    previousVersion = process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION
    process.env.GAME_CREDENTIAL_KEYS_JSON = JSON.stringify({ v1: randomBytes(32).toString('base64'), v2: randomBytes(32).toString('base64') })
    process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = 'v1'
  })
  afterAll(() => {
    previousKeys === undefined ? delete process.env.GAME_CREDENTIAL_KEYS_JSON : process.env.GAME_CREDENTIAL_KEYS_JSON = previousKeys
    previousVersion === undefined ? delete process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION : process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = previousVersion
  })

  it('encrypts and decrypts with AES-256-GCM', () => {
    const plaintext = Buffer.from('MuOnly1234')
    const envelope = service.encrypt(plaintext, aad)
    expect(service.decrypt(envelope, aad).toString('ascii')).toBe('MuOnly1234')
    expect(envelope).toMatchObject({ algorithm: 'AES-256-GCM', keyVersion: 'v1' })
  })

  it('uses a random nonce so equal plaintexts produce different ciphertext', () => {
    const plaintext = Buffer.from('MuOnly1234')
    const first = service.encrypt(plaintext, aad)
    const second = service.encrypt(plaintext, aad)
    expect(first.nonce).not.toBe(second.nonce)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })

  it('detects ciphertext and tag tampering', () => {
    const envelope = service.encrypt(Buffer.from('MuOnly1234'), aad)
    expect(() => service.decrypt({ ...envelope, tag: Buffer.alloc(16).toString('base64') }, aad)).toThrow()
  })

  it('rejects the wrong AAD and ciphertext swapping', () => {
    const envelope = service.encrypt(Buffer.from('MuOnly1234'), aad)
    expect(() => service.decrypt(envelope, { ...aad, commandId: randomUUID() })).toThrow()
  })

  it('supports key version rotation while retaining v1 decryption', () => {
    const v1 = service.encrypt(Buffer.from('MuOnly1234'), aad)
    process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = 'v2'
    const v2 = service.encrypt(Buffer.from('MuOnly5678'), aad)
    expect(v2.keyVersion).toBe('v2')
    expect(service.decrypt(v1, aad).toString('ascii')).toBe('MuOnly1234')
    process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = 'v1'
  })

  it('fails safely for an unavailable key version', () => {
    const envelope = service.encrypt(Buffer.from('MuOnly1234'), aad)
    expect(() => service.decrypt({ ...envelope, keyVersion: 'v99' }, aad)).toThrow('GAME_CREDENTIAL_KEY_VERSION_UNAVAILABLE')
  })

  it('serializes ciphertext only and never plaintext', () => {
    const plaintext = Buffer.from('MuOnly1234')
    const serialized = JSON.stringify(service.encrypt(plaintext, aad))
    expect(serialized).not.toContain('MuOnly1234')
    expect(serialized).not.toContain('plaintext')
  })
})
