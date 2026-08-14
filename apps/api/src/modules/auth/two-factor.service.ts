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

  encrypt(secret: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv)
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
  }

  decrypt(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split('.')
    if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted 2FA secret')
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final()
    ]).toString('utf8')
  }

  private key() {
    const source = process.env.TWO_FACTOR_ENCRYPTION_KEY
      || process.env.JWT_REFRESH_SECRET
      || (process.env.NODE_ENV === 'production' ? '' : 'dev-two-factor-key-change-me')
    if (!source) throw new Error('TWO_FACTOR_ENCRYPTION_KEY is required in production')
    return createHash('sha256').update(source).digest()
  }
}
