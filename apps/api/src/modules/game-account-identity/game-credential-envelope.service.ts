import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Injectable } from '@nestjs/common'

export const GAME_CREDENTIAL_ALGORITHM = 'AES-256-GCM' as const

export type GameCredentialEnvelope = {
  ciphertext: string
  nonce: string
  tag: string
  keyVersion: string
  algorithm: typeof GAME_CREDENTIAL_ALGORITHM
  createdAt: string
}

export type GameCredentialAad = {
  commandId: string
  provisioningRequestId: string
  commandType: 'CREATE_GAME_ACCOUNT'
}

type KeyRing = { activeVersion: string; keys: Map<string, Buffer> }

@Injectable()
export class GameCredentialEnvelopeService {
  encrypt(plaintext: Buffer, aad: GameCredentialAad): GameCredentialEnvelope {
    const ring = loadKeyRing()
    const key = ring.keys.get(ring.activeVersion)
    if (!key) throw new Error('GAME_CREDENTIAL_ACTIVE_KEY_UNAVAILABLE')
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    cipher.setAAD(Buffer.from(canonicalAad(aad), 'utf8'))
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
      ciphertext: ciphertext.toString('base64'), nonce: nonce.toString('base64'), tag: tag.toString('base64'),
      keyVersion: ring.activeVersion, algorithm: GAME_CREDENTIAL_ALGORITHM, createdAt: new Date().toISOString()
    }
  }

  // Internal provisioning/auth use only. No controller calls this method.
  decrypt(envelope: GameCredentialEnvelope, aad: GameCredentialAad): Buffer {
    if (envelope.algorithm !== GAME_CREDENTIAL_ALGORITHM) throw new Error('GAME_CREDENTIAL_ALGORITHM_UNSUPPORTED')
    const key = loadKeyRing().keys.get(envelope.keyVersion)
    if (!key) throw new Error('GAME_CREDENTIAL_KEY_VERSION_UNAVAILABLE')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.nonce, 'base64'))
    decipher.setAAD(Buffer.from(canonicalAad(aad), 'utf8'))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()])
  }

  generateCredential(): Buffer {
    const alphabet = Buffer.from('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 'ascii')
    const output = Buffer.alloc(10)
    let written = 0
    while (written < output.length) {
      const candidate = randomBytes(output.length * 2)
      for (const byte of candidate) {
        if (byte >= 252) continue
        output[written++] = alphabet[byte % alphabet.length]!
        if (written === output.length) break
      }
      candidate.fill(0)
    }
    return output
  }
}

export function canonicalAad(value: GameCredentialAad): string {
  return `${value.commandId}\n${value.provisioningRequestId}\n${value.commandType}`
}

function loadKeyRing(): KeyRing {
  const activeVersion = process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION || ''
  let raw: unknown
  try { raw = JSON.parse(process.env.GAME_CREDENTIAL_KEYS_JSON || '') } catch { raw = null }
  if (!raw || typeof raw !== 'object' || !/^v[1-9][0-9]{0,3}$/.test(activeVersion)) {
    throw new Error('GAME_CREDENTIAL_KEYRING_NOT_CONFIGURED')
  }
  const keys = new Map<string, Buffer>()
  for (const [version, encoded] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^v[1-9][0-9]{0,3}$/.test(version) || typeof encoded !== 'string') continue
    const key = Buffer.from(encoded, 'base64')
    if (key.length === 32) keys.set(version, key)
  }
  return { activeVersion, keys }
}
