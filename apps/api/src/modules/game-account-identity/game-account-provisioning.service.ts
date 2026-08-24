import { createHash, randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { GameCommandTransportClient } from './game-command-transport.client'
import { GameCredentialEnvelopeService, type GameCredentialAad, type GameCredentialEnvelope } from './game-credential-envelope.service'

@Injectable()
export class GameAccountProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: GameCredentialEnvelopeService,
    private readonly transport: GameCommandTransportClient
  ) {}

  // Intentionally has no public controller. Phase 3D-A proves infrastructure;
  // public /auth/register remains disconnected until a reviewed later phase.
  async dispatch(accountId: string, requestedLegacyLogin?: string): Promise<{ commandId: string; provisioningRequestId: string }> {
    const identity = await this.prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId } })
    if (identity.provisioningStatus === 'ACTIVE') {
      const existing = await this.prisma.gameAccountCredential.findUniqueOrThrow({ where: { accountId } })
      return { commandId: existing.commandId, provisioningRequestId: identity.provisioningRequestId }
    }

    let stored = await this.prisma.gameAccountCredential.findUnique({ where: { accountId } })
    if (!stored) {
      const commandId = randomUUID()
      const commandExpiresAt = new Date(Date.now() + 60 * 60_000)
      const legacyLogin = requestedLegacyLogin ?? await this.allocateLegacyLogin(accountId)
      if (!/^[A-Za-z0-9]{4,10}$/.test(legacyLogin)) throw new Error('INVALID_LEGACY_LOGIN')
      const aad: GameCredentialAad = { commandId, provisioningRequestId: identity.provisioningRequestId, commandType: 'CREATE_GAME_ACCOUNT' }
      const plaintext = this.crypto.generateCredential()
      try {
        const envelope = this.crypto.encrypt(plaintext, aad)
        stored = await this.prisma.$transaction(async tx => {
          const credential = await tx.gameAccountCredential.create({ data: {
            accountId, commandId, legacyLogin, ciphertext: envelope.ciphertext, nonce: envelope.nonce,
            tag: envelope.tag, keyVersion: envelope.keyVersion, algorithm: envelope.algorithm,
            envelopeCreatedAt: new Date(envelope.createdAt), commandExpiresAt
          } })
          await tx.gameAccountIdentity.update({ where: { id: identity.id }, data: {
            provisioningStatus: 'PROVISIONING', legacyLogin, lastAttemptAt: new Date(), lastErrorCode: null
          } })
          return credential
        })
      } finally { plaintext.fill(0) }
    } else if (identity.provisioningStatus === 'FAILED') {
      // Requeue first. If transport rejects the retry (for example because the
      // command expired), Portal remains honestly FAILED and recoverable.
      await this.transport.retry(stored.commandId, identity.provisioningRequestId)
      await this.prisma.gameAccountIdentity.update({ where: { id: identity.id }, data: {
        provisioningStatus: 'PROVISIONING', legacyLogin: stored.legacyLogin, lastAttemptAt: new Date(), lastErrorCode: null
      } })
      return { commandId: stored.commandId, provisioningRequestId: identity.provisioningRequestId }
    } else if (identity.provisioningStatus === 'PENDING') {
      await this.prisma.gameAccountIdentity.update({ where: { id: identity.id }, data: {
        provisioningStatus: 'PROVISIONING', legacyLogin: stored.legacyLogin, lastAttemptAt: new Date(), lastErrorCode: null
      } })
    }

    await this.transport.create({
      commandId: stored.commandId, provisioningRequestId: identity.provisioningRequestId,
      commandType: 'CREATE_GAME_ACCOUNT', environment: process.env.GAME_COMMAND_ENVIRONMENT || 'production',
      serverId: process.env.GAME_COMMAND_SERVER_ID || 'mu-primary', legacyLogin: stored.legacyLogin,
      expiresAt: stored.commandExpiresAt.toISOString(), credential: toEnvelope(stored)
    })
    return { commandId: stored.commandId, provisioningRequestId: identity.provisioningRequestId }
  }

  async reconcile(accountId: string): Promise<string> {
    const identity = await this.prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId } })
    const credential = await this.prisma.gameAccountCredential.findUniqueOrThrow({ where: { accountId } })
    const state = await this.transport.get(credential.commandId)
    if (state.provisioningRequestId !== identity.provisioningRequestId) throw new Error('PROVISIONING_IDENTITY_CONFLICT')
    if (state.status === 'SUCCEEDED' && state.membGuid) {
      if (identity.provisioningStatus !== 'ACTIVE') await this.prisma.gameAccountIdentity.update({ where: { id: identity.id }, data: {
        provisioningStatus: 'ACTIVE', membGuid: state.membGuid, legacyLogin: credential.legacyLogin,
        provisionedAt: new Date(state.completedAt || Date.now()), lastErrorCode: null
      } })
    } else if ((state.status === 'FAILED_FINAL' || state.status === 'EXPIRED') && identity.provisioningStatus === 'PROVISIONING') {
      await this.prisma.gameAccountIdentity.update({ where: { id: identity.id }, data: {
        provisioningStatus: 'FAILED', lastErrorCode: state.resultCode || state.status
      } })
    }
    return state.status
  }

  private async allocateLegacyLogin(accountId: string): Promise<string> {
    const base = `u${createHash('sha256').update(accountId).digest('hex').slice(0, 9)}`
    const exists = await this.prisma.gameAccountCredential.findFirst({ where: { legacyLogin: base } })
    if (!exists) return base
    for (let i = 0; i < 20; i++) {
      const candidate = `u${randomUUID().replace(/-/g, '').slice(0, 9)}`
      if (!await this.prisma.gameAccountCredential.findFirst({ where: { legacyLogin: candidate } })) return candidate
    }
    throw new Error('LEGACY_LOGIN_ALLOCATION_FAILED')
  }
}

function toEnvelope(value: { ciphertext: string; nonce: string; tag: string; keyVersion: string; algorithm: string; envelopeCreatedAt: Date }): GameCredentialEnvelope {
  if (value.algorithm !== 'AES-256-GCM') throw new Error('GAME_CREDENTIAL_ALGORITHM_UNSUPPORTED')
  return { ciphertext: value.ciphertext, nonce: value.nonce, tag: value.tag, keyVersion: value.keyVersion,
    algorithm: 'AES-256-GCM', createdAt: value.envelopeCreatedAt.toISOString() }
}
