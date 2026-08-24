import { createRequire } from 'node:module'
import { randomBytes, randomUUID } from 'node:crypto'

if (process.env.RUN_PHASE3D_REAL_QA !== '1') throw new Error('REAL_QA_FLAG_REQUIRED')
const legacyLogin = process.env.PHASE3D_QA_LEGACY_LOGIN || ''
if (!/^[A-Za-z0-9]{4,10}$/.test(legacyLogin)) throw new Error('INVALID_QA_LEGACY_LOGIN')

const require = createRequire(import.meta.url)
const { PrismaService } = require('../dist/apps/api/src/database/prisma.service.js')
const { GameAccountProvisioningService } = require('../dist/apps/api/src/modules/game-account-identity/game-account-provisioning.service.js')
const { GameCredentialEnvelopeService } = require('../dist/apps/api/src/modules/game-account-identity/game-credential-envelope.service.js')
const { GameCommandTransportClient } = require('../dist/apps/api/src/modules/game-account-identity/game-command-transport.client.js')
const bcrypt = require('bcryptjs')

const prisma = new PrismaService()
await prisma.$connect()
try {
  const existingAccountId = process.env.PHASE3D_QA_ACCOUNT_ID
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const account = existingAccountId
    ? await prisma.account.findUniqueOrThrow({ where: { id: existingAccountId } })
    : await prisma.account.create({ data: {
        username: `phase3da_${suffix}`,
        name: 'PHASE_3D_A_PRODUCTION_TRANSPORT_QA',
        email: `phase3da_${suffix}@example.invalid`,
        passwordHash: await bcrypt.hash(randomBytes(32).toString('base64url'), 10),
        role: 'PLAYER', status: 'ACTIVE',
        gameIdentity: { create: { provisioningRequestId: randomUUID(), provisioningStatus: 'PENDING' } }
      } })
  const service = new GameAccountProvisioningService(prisma, new GameCredentialEnvelopeService(), new GameCommandTransportClient())
  const dispatched = await service.dispatch(account.id, legacyLogin)
  let status = 'QUEUED'
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 3_000))
    status = await service.reconcile(account.id)
    if (status === 'SUCCEEDED' || status === 'FAILED_FINAL' || status === 'EXPIRED') break
  }
  const identity = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: account.id } })
  console.log(JSON.stringify({
    qaAccountId: account.id,
    commandId: dispatched.commandId,
    provisioningRequestId: dispatched.provisioningRequestId,
    legacyLogin,
    transportStatus: status,
    portalStatus: identity.provisioningStatus,
    membGuid: identity.membGuid,
    credentialStored: 'ENCRYPTED'
  }))
  if (status !== 'SUCCEEDED' || identity.provisioningStatus !== 'ACTIVE' || !identity.membGuid) process.exitCode = 2
} finally {
  await prisma.$disconnect()
}
