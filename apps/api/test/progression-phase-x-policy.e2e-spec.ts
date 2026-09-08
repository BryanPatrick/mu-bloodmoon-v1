import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE X (2026-09-04) -- reset.stat_points originally seeded as
// POLICY_DRIFT: Bryan's then-Decision 2 wanted 450 desired for every
// tier, conflicting with the real effective 450/500/500/500.
//
// PHASE AD (2026-09-05) -- Bryan explicitly revisited and resolved that
// conflict: the desired policy is now Free (AL0) = 450, Bronze/Silver/
// Gold (AL1-3) = 500 -- i.e. desired now equals effective, and
// policyStatus is APPROVED, not POLICY_DRIFT. This file's tests were
// rewritten to assert the current, approved policy rather than the
// superseded Phase X one; the seed data itself
// (progression-config-seed-data.ts) documents the full supersede
// history inline.
const CONTAINER = 'bloodmoon-e2e-progression-phase-x-policy'

describe('Progression policy -- Phase X reset point equality', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let progression: import('../src/modules/progression/progression-config.service').ProgressionConfigService

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-progression-phase-x-access-secret'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-progression-phase-x-refresh-secret'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-progression-phase-x-two-factor-32'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { ProgressionConfigService } = await import('../src/modules/progression/progression-config.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    progression = app.get(ProgressionConfigService)
  }, 120000)

  afterAll(async () => {
    await app?.close()
    await stopDisposableDatabase(CONTAINER)
  })

  jest.setTimeout(60000)

  const suffix = Date.now().toString(36)
  let fullAdmin: { id: string, username: string, name: string, email: string, role: 'SUPER_ADMIN', permissions: string[], twoFactorEnabled: boolean }

  beforeAll(async () => {
    const full = await prisma.account.create({
      data: { username: `ppx_full_${suffix}`.slice(0, 20), name: 'Full Admin', email: `ppx-full-${suffix}@example.invalid`, passwordHash: 'x', personalIdHash: 'x', role: 'SUPER_ADMIN', status: 'ACTIVE', twoFactorEnabled: true }
    })
    fullAdmin = { id: full.id, username: full.username, name: full.name, email: full.email, role: 'SUPER_ADMIN', permissions: ['*'], twoFactorEnabled: true }

    await prisma.progressionConfigItem.deleteMany({})
    await progression.seedAll(fullAdmin)
  })

  it('RESET_POINTS_DESIRED_MATCHES_APPROVED_POLICY: a fresh seed persists reset.stat_points desired = Free 450 / Bronze-Silver-Gold 500', async () => {
    const resetStatPoints = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.stat_points' } } })
    expect(resetStatPoints.desiredValue).toEqual({ AL0: 450, AL1: 500, AL2: 500, AL3: 500 })
    expect(resetStatPoints.desiredReason).toContain('Fase AD')
  })

  it('RESET_POINT_POLICY_APPROVED_NOT_DRIFT: reset.stat_points seeds with policyStatus=APPROVED, and effective now equals the desired policy for every tier', async () => {
    const resetStatPoints = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.stat_points' } } })
    expect(resetStatPoints.policyStatus).toBe('APPROVED')
    const effective = resetStatPoints.effectiveValue as { AL0: number, AL1: number, AL2: number, AL3: number }
    const desired = resetStatPoints.desiredValue as { AL0: number, AL1: number, AL2: number, AL3: number }
    expect(effective).toEqual({ AL0: 450, AL1: 500, AL2: 500, AL3: 500 })
    expect(desired).toEqual({ AL0: 450, AL1: 500, AL2: 500, AL3: 500 })
    expect(effective).toEqual(desired)
  })

  it('No production sync was performed -- reseeding never mutates effectiveValue, only desiredValue/policyStatus are policy-layer fields', async () => {
    const before = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.stat_points' } } })
    await progression.seedAll(fullAdmin)
    const after = await prisma.progressionConfigItem.findUniqueOrThrow({ where: { domain_key: { domain: 'RESET', key: 'reset.stat_points' } } })
    expect(after.effectiveValue).toEqual(before.effectiveValue)
    expect(after.desiredValue).toEqual(before.desiredValue)
  })
})
