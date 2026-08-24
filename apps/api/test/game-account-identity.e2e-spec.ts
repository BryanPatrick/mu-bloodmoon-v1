import { randomUUID } from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Phase 3B -- GameAccountIdentity Portal-side scaffold. Tests the real
// service against the real local database (this project's established
// convention -- there are no mocked-Prisma unit specs anywhere in
// apps/api). No GameBridge command exists; nothing here writes to MU SQL.
const CONTAINER = 'bloodmoon-e2e-game-account-identity'

describe('GameAccountIdentity (Phase 3B)', () => {
  let prisma: import('../src/database/prisma.service').PrismaService
  let service: import('../src/modules/game-account-identity/game-account-identity.service').GameAccountIdentityService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl

    const { Test } = await import('@nestjs/testing')
    const { DatabaseModule } = await import('../src/database/database.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { GameAccountIdentityModule } = await import('../src/modules/game-account-identity/game-account-identity.module')
    const { GameAccountIdentityService } = await import('../src/modules/game-account-identity/game-account-identity.service')

    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule, GameAccountIdentityModule] }).compile()
    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(GameAccountIdentityService)
  }, 120_000)

  afterAll(async () => {
    stopDisposableDatabase(CONTAINER)
  })

  async function createAccount(usernameSeed: string) {
    return prisma.account.create({
      data: {
        username: `gai_${usernameSeed}_${randomUUID().slice(0, 8)}`,
        name: 'GameAccountIdentity Test',
        email: `gai-${usernameSeed}-${randomUUID().slice(0, 8)}@example.test`,
        passwordHash: await bcrypt.hash('irrelevant-not-under-test', 4),
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
  }

  // Randomized rather than fixed literals: E2E_LOCAL_MYSQL_URL makes
  // bloodmoon_local persist across test runs (this project's own
  // documented convention), so a fixed membGuid/legacyLogin would collide
  // with a leftover row from a *previous* run of this same file and fail
  // with a spurious unique-constraint error -- not a real regression, but
  // a real test-hygiene bug. A fresh random base every run avoids it.
  function randomMembGuid(): number {
    return Math.floor(Math.random() * 900_000_000) + 100_000_000
  }
  function randomLogin(): string {
    return randomUUID().replace(/-/g, '').slice(0, 10)
  }

  it('ensurePendingForAccount creates exactly one PENDING row, idempotently', async () => {
    const account = await createAccount('idempotent')

    const first = await service.ensurePendingForAccount(account.id)
    const second = await service.ensurePendingForAccount(account.id)

    expect(first.id).toBe(second.id)
    expect(first.provisioningStatus).toBe('PENDING')
    expect(first.provisioningRequestId).toBe(second.provisioningRequestId)
    expect(first.membGuid).toBeNull()

    const count = await prisma.gameAccountIdentity.count({ where: { accountId: account.id } })
    expect(count).toBe(1)
  })

  it('accountId is unique -- a raw second insert for the same account is rejected at the DB level', async () => {
    const account = await createAccount('unique-account')
    await service.ensurePendingForAccount(account.id)

    await expect(
      prisma.gameAccountIdentity.create({
        data: { accountId: account.id, provisioningRequestId: randomUUID(), provisioningStatus: 'PENDING' }
      })
    ).rejects.toThrow()
  })

  it('provisioningRequestId is unique across different accounts', async () => {
    const accountA = await createAccount('req-a')
    const accountB = await createAccount('req-b')
    const identityA = await service.ensurePendingForAccount(accountA.id)

    await expect(
      prisma.gameAccountIdentity.create({
        data: { accountId: accountB.id, provisioningRequestId: identityA.provisioningRequestId, provisioningStatus: 'PENDING' }
      })
    ).rejects.toThrow()
  })

  it('membGuid is unique when present, but multiple PENDING rows may all have it null', async () => {
    const accountA = await createAccount('membguid-a')
    const accountB = await createAccount('membguid-b')
    const identityA = await service.ensurePendingForAccount(accountA.id)
    const identityB = await service.ensurePendingForAccount(accountB.id)
    expect(identityA.membGuid).toBeNull()
    expect(identityB.membGuid).toBeNull()

    const sharedGuid = randomMembGuid()
    await service.transitionToProvisioning(identityA.id)
    const activeA = await service.markActive(identityA.id, sharedGuid, randomLogin())
    expect(activeA.membGuid).toBe(sharedGuid)

    await service.transitionToProvisioning(identityB.id)
    await expect(service.markActive(identityB.id, sharedGuid, randomLogin())).rejects.toThrow()
  })

  it('legacyLogin is unique when present', async () => {
    const accountA = await createAccount('login-a')
    const accountB = await createAccount('login-b')
    const identityA = await service.ensurePendingForAccount(accountA.id)
    const identityB = await service.ensurePendingForAccount(accountB.id)

    const sharedLogin = randomLogin()
    await service.transitionToProvisioning(identityA.id)
    await service.markActive(identityA.id, randomMembGuid(), sharedLogin)

    await service.transitionToProvisioning(identityB.id)
    await expect(service.markActive(identityB.id, randomMembGuid(), sharedLogin)).rejects.toThrow()
  })

  it('valid transition: PENDING -> PROVISIONING -> ACTIVE', async () => {
    const account = await createAccount('valid-flow')
    const identity = await service.ensurePendingForAccount(account.id)

    const provisioning = await service.transitionToProvisioning(identity.id)
    expect(provisioning.provisioningStatus).toBe('PROVISIONING')
    expect(provisioning.lastAttemptAt).not.toBeNull()

    const guid = randomMembGuid()
    const login = randomLogin()
    const active = await service.markActive(identity.id, guid, login)
    expect(active.provisioningStatus).toBe('ACTIVE')
    expect(active.membGuid).toBe(guid)
    expect(active.legacyLogin).toBe(login)
    expect(active.provisionedAt).not.toBeNull()
  })

  it('valid transition: PROVISIONING -> FAILED, then FAILED -> PROVISIONING reuses the same provisioningRequestId', async () => {
    const account = await createAccount('retry-flow')
    const identity = await service.ensurePendingForAccount(account.id)
    const originalRequestId = identity.provisioningRequestId

    await service.transitionToProvisioning(identity.id)
    const failed = await service.markFailed(identity.id, 'SIMULATED_FAILURE')
    expect(failed.provisioningStatus).toBe('FAILED')
    expect(failed.lastErrorCode).toBe('SIMULATED_FAILURE')
    expect(failed.provisioningRequestId).toBe(originalRequestId)

    const retried = await service.retry(identity.id)
    expect(retried.provisioningStatus).toBe('PROVISIONING')
    expect(retried.provisioningRequestId).toBe(originalRequestId)
  })

  it('rejects an invalid transition: PENDING -> ACTIVE directly', async () => {
    const account = await createAccount('invalid-pending-active')
    const identity = await service.ensurePendingForAccount(account.id)

    await expect(service.markActive(identity.id, randomMembGuid(), randomLogin())).rejects.toThrow(
      /Cannot transition GameAccountIdentity from PENDING to ACTIVE/
    )
  })

  it('rejects an invalid transition: ACTIVE has no further legal transitions', async () => {
    const account = await createAccount('terminal-active')
    const identity = await service.ensurePendingForAccount(account.id)
    await service.transitionToProvisioning(identity.id)
    await service.markActive(identity.id, randomMembGuid(), randomLogin())

    await expect(service.transitionToProvisioning(identity.id)).rejects.toThrow(
      /Cannot transition GameAccountIdentity from ACTIVE to PROVISIONING/
    )
  })

  it('rejects an invalid transition: PENDING -> FAILED directly (must go through PROVISIONING)', async () => {
    const account = await createAccount('invalid-pending-failed')
    const identity = await service.ensurePendingForAccount(account.id)

    await expect(service.markFailed(identity.id, 'X')).rejects.toThrow(
      /Cannot transition GameAccountIdentity from PENDING to FAILED/
    )
  })

  it('isGameReady is true only for ACTIVE with a real membGuid, never for any other state', async () => {
    const { GameAccountIdentityService } = await import('../src/modules/game-account-identity/game-account-identity.service')
    const account = await createAccount('game-ready')
    const identity = await service.ensurePendingForAccount(account.id)

    expect(GameAccountIdentityService.isGameReady(identity)).toBe(false)
    expect(GameAccountIdentityService.isGameReady(null)).toBe(false)

    const provisioning = await service.transitionToProvisioning(identity.id)
    expect(GameAccountIdentityService.isGameReady(provisioning)).toBe(false)

    const active = await service.markActive(identity.id, randomMembGuid(), randomLogin())
    expect(GameAccountIdentityService.isGameReady(active)).toBe(true)
  })
})
