import { randomUUID } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Security hardening -- exercises the real migrate-two-factor-keys.ts
// dry-run/real-run passes against a real database (bloodmoon_local_claude
// via E2E_LOCAL_MYSQL_URL), never production. Covers dry-run, resume,
// partial failure, and already-migrated records, using synthetic v1 test
// keys -- never any production secret.
const CONTAINER = 'bloodmoon-e2e-two-factor-key-migration'

describe('Two-factor key migration (security hardening)', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactor: import('../src/modules/auth/two-factor.service').TwoFactorService
  let migration: typeof import('../src/migrate-two-factor-keys')

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-synthetic-v1-key-never-production'
    process.env.TWO_FACTOR_ENCRYPTION_KEY_V2 = 'e2e-synthetic-v2-key-never-production'
    process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = 'v2'

    const { execSync } = await import('node:child_process')
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = moduleRef.get(PrismaService)
    twoFactor = moduleRef.get(TwoFactorService)
    migration = await import('../src/migrate-two-factor-keys')
  }, 120_000)

  const createdAccountIds: string[] = []

  afterAll(async () => {
    // Every dryRunPass()/realRunPass() call in this file is scoped to the
    // specific account id(s) each test created (see migrate-two-factor-keys.ts's
    // accountIds parameter), so cleanup here is just tidiness -- it doesn't
    // add to the shared bloodmoon_local_claude database's growing pile of
    // test-era 2FA rows for the next session to wade through.
    if (createdAccountIds.length) {
      await prisma?.account.deleteMany({ where: { id: { in: createdAccountIds } } })
    }
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  async function makeV1Account(secretValue = 'REALTOTPSECRET') {
    const seed = randomUUID().slice(0, 8)
    // Encrypt with v1 explicitly, independent of whatever the active
    // version is currently set to, by toggling env around a single call.
    const previousActive = process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    delete process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    const v1Encrypted = twoFactor.encrypt(secretValue)
    if (previousActive) process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = previousActive
    expect(twoFactor.keyVersionOf(v1Encrypted)).toBe('v1')

    const account = await prisma.account.create({
      data: {
        username: `tfkm${seed}`,
        email: `tfkm-${seed}@example.test`,
        name: 'Two Factor Migration Test',
        passwordHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        twoFactorEnabled: true,
        twoFactorSecret: v1Encrypted
      }
    })
    createdAccountIds.push(account.id)
    return account
  }

  it('dry-run reports migratable v1 accounts and writes nothing', async () => {
    const account = await makeV1Account()

    const summary = migration.emptySummary()
    // Scoped to this test's own account id: bloodmoon_local_claude is
    // shared and persistent across e2e runs AND across concurrent sessions
    // (see project memory on concurrent-session DB risk) -- an unscoped
    // pass would race against any other process exercising this same
    // global migration function against the same table mid-test. Passing
    // this test's own id makes the ARRANGE/ACT/ASSERT fully self-contained,
    // immune to both residual rows and concurrent mutation.
    await migration.dryRunPass(prisma, twoFactor, 'v2', summary, [account.id])

    expect(summary.migrated).toBe(1)
    expect(summary.failedAccountIds).not.toContain(account.id)

    const unchanged = await prisma.account.findUniqueOrThrow({ where: { id: account.id } })
    expect(twoFactor.keyVersionOf(unchanged.twoFactorSecret as string)).toBe('v1')
  })

  it('real run migrates a v1 account to v2, decryptable to the same original secret', async () => {
    const account = await makeV1Account('MIGRATEDVALUE')

    const summary = migration.emptySummary()
    await migration.realRunPass(prisma, twoFactor, 'v2', summary, [account.id])

    const updated = await prisma.account.findUniqueOrThrow({ where: { id: account.id } })
    expect(twoFactor.keyVersionOf(updated.twoFactorSecret as string)).toBe('v2')
    expect(twoFactor.decrypt(updated.twoFactorSecret as string)).toBe('MIGRATEDVALUE')
  })

  it('is idempotent -- a second run right after the first always finds nothing left for this account', async () => {
    const account = await makeV1Account('IDEMPOTENCYCHECK')

    // Scoped to this account's own id -- the defining idempotency property
    // is that nothing remains for THIS row on the very next pass.
    await migration.realRunPass(prisma, twoFactor, 'v2', migration.emptySummary(), [account.id])

    const second = migration.emptySummary()
    await migration.realRunPass(prisma, twoFactor, 'v2', second, [account.id])
    expect(second.migrated).toBe(0)
    expect(second.alreadyCurrent).toBe(1)
  })

  it('an already-migrated (v2) record is correctly skipped and left untouched', async () => {
    const seed = randomUUID().slice(0, 8)
    const v2Encrypted = twoFactor.encrypt('ALREADYV2')
    expect(twoFactor.keyVersionOf(v2Encrypted)).toBe('v2')
    const account = await prisma.account.create({
      data: {
        username: `tfkmv2${seed}`,
        email: `tfkmv2-${seed}@example.test`,
        name: 'Already V2',
        passwordHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        twoFactorEnabled: true,
        twoFactorSecret: v2Encrypted
      }
    })
    createdAccountIds.push(account.id)

    const summary = migration.emptySummary()
    await migration.realRunPass(prisma, twoFactor, 'v2', summary, [account.id])

    const unchanged = await prisma.account.findUniqueOrThrow({ where: { id: account.id } })
    expect(unchanged.twoFactorSecret).toBe(v2Encrypted) // byte-for-byte untouched
  })

  it('a partial failure (one bad row) does not block other rows from migrating', async () => {
    const good = await makeV1Account('GOODROW')
    const seed = randomUUID().slice(0, 8)
    const corrupted = await prisma.account.create({
      data: {
        username: `tfkmbad${seed}`,
        email: `tfkmbad-${seed}@example.test`,
        name: 'Corrupted Row',
        passwordHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        twoFactorEnabled: true,
        twoFactorSecret: 'this-is-not-a-valid-encrypted-value'
      }
    })
    createdAccountIds.push(corrupted.id)

    const summary = migration.emptySummary()
    await migration.realRunPass(prisma, twoFactor, 'v2', summary, [good.id, corrupted.id])

    expect(summary.failed).toBe(1)
    expect(summary.failedAccountIds).toContain(corrupted.id)

    const goodUpdated = await prisma.account.findUniqueOrThrow({ where: { id: good.id } })
    expect(twoFactor.keyVersionOf(goodUpdated.twoFactorSecret as string)).toBe('v2')
    expect(twoFactor.decrypt(goodUpdated.twoFactorSecret as string)).toBe('GOODROW')

    const badUnchanged = await prisma.account.findUniqueOrThrow({ where: { id: corrupted.id } })
    expect(badUnchanged.twoFactorSecret).toBe('this-is-not-a-valid-encrypted-value') // left as-is, not corrupted further
  })

  it('twoFactorPending is migrated the same way as twoFactorSecret', async () => {
    const previousActive = process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    delete process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION
    const v1Pending = twoFactor.encrypt('PENDINGSETUPSECRET')
    if (previousActive) process.env.TWO_FACTOR_ENCRYPTION_ACTIVE_KEY_VERSION = previousActive

    const seed = randomUUID().slice(0, 8)
    const account = await prisma.account.create({
      data: {
        username: `tfkmpend${seed}`,
        email: `tfkmpend-${seed}@example.test`,
        name: 'Pending Setup',
        passwordHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE',
        twoFactorPending: v1Pending
      }
    })
    createdAccountIds.push(account.id)

    const summary = migration.emptySummary()
    await migration.realRunPass(prisma, twoFactor, 'v2', summary, [account.id])

    const updated = await prisma.account.findUniqueOrThrow({ where: { id: account.id } })
    expect(twoFactor.keyVersionOf(updated.twoFactorPending as string)).toBe('v2')
    expect(twoFactor.decrypt(updated.twoFactorPending as string)).toBe('PENDINGSETUPSECRET')
  })
})
