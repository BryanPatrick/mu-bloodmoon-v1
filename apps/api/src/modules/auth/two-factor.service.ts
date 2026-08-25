import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'

const RECOVERY_CODE_COUNT = 10
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

@Injectable()
export class TwoFactorService {
  generateSecret() {
    return generateSecret({ length: 20 })
  }

  generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
    return Array.from({ length: count }, () => {
      const group = () =>
        Array.from({ length: 4 }, () => RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)]).join('')
      return `${group()}-${group()}`
    })
  }

  hashRecoveryCode(code: string) {
    return bcrypt.hash(this.normalizeRecoveryCode(code), 10)
  }

  compareRecoveryCode(code: string, hash: string) {
    return bcrypt.compare(this.normalizeRecoveryCode(code), hash)
  }

  private normalizeRecoveryCode(code: string) {
    return code.trim().toUpperCase()
  }

  uri(username: string, secret: string) {
    return generateURI({ issuer: 'Blood Moon', label: username, secret })
  }

  qrCode(uri: string) {
    return QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 256 })
  }

  async isValid(secret: string, token?: string) {
    const normalized = token?.replace(/\s/g, '')
    if (!normalized || !/^\d{6}$/.test(normalized)) return false
    const result = await verify({ secret, token: normalized, epochTolerance: 30 })
    return result.valid
  }

  // Versioned keyring, added for safe key rotation. Storage format is
  // self-describing -- `v{N}.iv.tag.ciphertext` for anything encrypted
  // under this scheme, vs. the original (pre-versioning) 3-part
  // `iv.tag.ciphertext` with no version marker at all. A 3-part value is
  // therefore unambiguously "v1, from before versioning existed" -- no
  // schema/migration needed to carry version metadata, since every
  // existing row already announces its own version by its shape. New
  // writes always use the current active version; decrypt() accepts
  // either shape and picks the matching key.
  //
  // `v1`'s key source is deliberately still exactly
  // `TWO_FACTOR_ENCRYPTION_KEY` (or its historical fallbacks) -- the
  // already-deployed secret, untouched -- so introducing this keyring
  // requires zero knowledge of the current production key and cannot by
  // itself invalidate a single existing record. A new version's source
  // lives in `TWO_FACTOR_ENCRYPTION_KEY_{VERSION}` (e.g.
  // `TWO_FACTOR_ENCRYPTION_KEY_V2`); `TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION`
  // selects which version encrypt() uses for new writes (defaults to
  // `v1`, i.e. today's unchanged behavior, until explicitly advanced).
  encrypt(secret: string) {
    const version = this.activeVersion()
    const key = this.keyForVersion(version)
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
    const parts = [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url'))
    return [version, ...parts].join('.')
  }

  decrypt(value: string) {
    const segments = value.split('.')
    const [version, ivValue, tagValue, encryptedValue] =
      segments.length === 4
        ? segments
        : segments.length === 3
          ? ['v1', ...segments]
          : []
    if (!version || !ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted 2FA secret')
    const decipher = createDecipheriv('aes-256-gcm', this.keyForVersion(version), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final()
    ]).toString('utf8')
  }

  // The keyVersion actually encrypted a given value with -- exposed so the
  // migration tool (Part H) can find not-yet-migrated records without
  // decrypting them first.
  keyVersionOf(value: string): string {
    const segments = value.split('.')
    return segments.length === 4 ? segments[0] : 'v1'
  }

  activeVersion(): string {
    return process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION || 'v1'
  }

  private keyForVersion(version: string) {
    if (!/^v[1-9][0-9]{0,3}$/.test(version)) throw new Error(`Invalid 2FA key version: ${version}`)
    const source =
      version === 'v1'
        ? process.env.TWO_FACTOR_ENCRYPTION_KEY ||
          process.env.JWT_REFRESH_SECRET ||
          (process.env.NODE_ENV === 'production' ? '' : 'dev-two-factor-key-change-me')
        : process.env[`TWO_FACTOR_ENCRYPTION_KEY_${version.toUpperCase()}`] || ''
    if (!source) {
      const envHint = version === 'v1' ? 'TWO_FACTOR_ENCRYPTION_KEY' : `TWO_FACTOR_ENCRYPTION_KEY_${version.toUpperCase()}`
      throw new Error(`${envHint} is required (key version ${version} is not configured)`)
    }
    return createHash('sha256').update(source).digest()
  }
}
