import { randomBytes, randomUUID } from 'node:crypto'
import { PrismaService } from '../src/database/prisma.service'
import { GameAccountProvisioningService } from '../src/modules/game-account-identity/game-account-provisioning.service'
import { GameCommandTransportClient, type CreateGameCommandEnvelope, type GameCommandState } from '../src/modules/game-account-identity/game-command-transport.client'
import { GameCredentialEnvelopeService } from '../src/modules/game-account-identity/game-credential-envelope.service'

class FakeTransport extends GameCommandTransportClient {
  created: CreateGameCommandEnvelope[] = []
  state: GameCommandState | null = null
  override async create(command: CreateGameCommandEnvelope): Promise<void> { this.created.push(command) }
  override async get(): Promise<GameCommandState> { if (!this.state) throw new Error('NO_RESULT'); return this.state }
}

describe('Phase 3D-A Portal provisioning dispatcher', () => {
  const prisma = new PrismaService()
  const crypto = new GameCredentialEnvelopeService()
  const transport = new FakeTransport()
  const service = new GameAccountProvisioningService(prisma, crypto, transport)
  const accountIds: string[] = []
  let oldKeys: string | undefined
  let oldVersion: string | undefined

  beforeAll(async () => {
    oldKeys = process.env.GAME_CREDENTIAL_KEYS_JSON
    oldVersion = process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION
    process.env.GAME_CREDENTIAL_KEYS_JSON = JSON.stringify({ v1: randomBytes(32).toString('base64') })
    process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = 'v1'
    await prisma.$connect()
  })
  afterAll(async () => {
    for (const id of accountIds) await prisma.account.deleteMany({ where: { id } })
    await prisma.$disconnect()
    oldKeys === undefined ? delete process.env.GAME_CREDENTIAL_KEYS_JSON : process.env.GAME_CREDENTIAL_KEYS_JSON = oldKeys
    oldVersion === undefined ? delete process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION : process.env.GAME_CREDENTIAL_ACTIVE_KEY_VERSION = oldVersion
  })

  it('persists ciphertext, reuses one command on retry, and reconciles ACTIVE', async () => {
    const id = randomUUID(); accountIds.push(id)
    const suffix = randomUUID().replace(/-/g, '').slice(0, 12)
    const account = await prisma.account.create({ data: {
      id, username: `p3da_${suffix}`, name: 'Phase 3D-A', email: `p3da_${suffix}@example.invalid`,
      passwordHash: 'portal-hash-never-transported', status: 'ACTIVE', role: 'PLAYER',
      gameIdentity: { create: { provisioningRequestId: randomUUID(), provisioningStatus: 'PENDING' } }
    } })

    const first = await service.dispatch(account.id, `q${suffix.slice(0, 8)}`)
    const second = await service.dispatch(account.id)
    expect(second).toEqual(first)
    expect(transport.created).toHaveLength(2)
    expect(transport.created[0]?.credential).toEqual(transport.created[1]?.credential)
    expect(JSON.stringify(transport.created)).not.toContain('portal-hash-never-transported')
    expect(JSON.stringify(transport.created)).not.toContain('@example.invalid')

    const stored = await prisma.gameAccountCredential.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(stored.algorithm).toBe('AES-256-GCM')
    expect(stored.keyVersion).toBe('v1')
    expect(stored.ciphertext).not.toMatch(/^[A-Za-z0-9]{8,10}$/)
    const identity = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(identity.provisioningStatus).toBe('PROVISIONING')

    transport.state = { commandId: first.commandId, provisioningRequestId: first.provisioningRequestId,
      status: 'SUCCEEDED', resultCode: 'SUCCEEDED', membGuid: 987654,
      completedAt: new Date().toISOString(), attemptCount: 1, expiresAt: new Date(Date.now() + 60_000).toISOString() }
    expect(await service.reconcile(account.id)).toBe('SUCCEEDED')
    const active = await prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId: account.id } })
    expect(active).toMatchObject({ provisioningStatus: 'ACTIVE', membGuid: 987654, legacyLogin: `q${suffix.slice(0, 8)}` })
  })
})
