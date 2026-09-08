import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { PrismaService } from './database/prisma.service'
import { GameCredentialEnvelopeService, type GameCredentialEnvelope } from './modules/game-account-identity/game-credential-envelope.service'

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  try {
    const prisma = app.get(PrismaService)
    const crypto = app.get(GameCredentialEnvelopeService)
    const activeVersion = process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION || ''
    if (!/^v[1-9][0-9]{0,3}$/.test(activeVersion)) throw new Error('GAME_CREDENTIAL_ACTIVE_KEY_NOT_CONFIGURED')

    const credentials = await prisma.gameAccountCredential.findMany({ orderBy: { id: 'asc' } })
    let scanned = 0
    let migrated = 0
    let current = 0
    for (const credential of credentials) {
      if (credential.keyVersion === activeVersion) {
        current++
        continue
      }
      scanned++
      const identity = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: credential.accountId } })
      const aad = {
        commandId: credential.commandId,
        provisioningRequestId: identity.provisioningRequestId,
        commandType: 'CREATE_GAME_ACCOUNT' as const
      }
      const envelope: GameCredentialEnvelope = {
        ciphertext: credential.ciphertext,
        nonce: credential.nonce,
        tag: credential.tag,
        keyVersion: credential.keyVersion,
        algorithm: 'AES-256-GCM',
        createdAt: credential.envelopeCreatedAt.toISOString()
      }
      const plaintext = crypto.decrypt(envelope, aad)
      try {
        const rotated = crypto.encrypt(plaintext, aad)
        if (!dryRun) {
          await prisma.gameAccountCredential.update({
            where: { id: credential.id },
            data: {
              ciphertext: rotated.ciphertext,
              nonce: rotated.nonce,
              tag: rotated.tag,
              keyVersion: rotated.keyVersion,
              algorithm: rotated.algorithm,
              envelopeCreatedAt: new Date(rotated.createdAt),
              rotatedAt: new Date()
            }
          })
        }
        migrated++
      } finally {
        plaintext.fill(0)
      }
    }
    process.stdout.write(JSON.stringify({ dryRun, activeVersion, scanned, migrated, current }) + '\n')
  } finally {
    await app.close()
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`GAME_CREDENTIAL_MIGRATION_FAILED:${error instanceof Error ? error.message.slice(0, 191) : 'UNKNOWN'}\n`)
  process.exitCode = 1
})
