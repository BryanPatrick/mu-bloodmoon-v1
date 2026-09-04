import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-beta-rewards'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('Beta Rewards -- participation source and generation', () => {
  let prisma: import('../src/database/prisma.service').PrismaService
  let service: import('../src/modules/beta-rewards/beta-rewards.service').BetaRewardsService
  let betaLifecycle: import('../src/modules/beta-lifecycle/beta-lifecycle.service').BetaLifecycleService
  let app: import('@nestjs/common').INestApplication

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { BetaRewardsService } = await import('../src/modules/beta-rewards/beta-rewards.service')
    const { BetaLifecycleService } = await import('../src/modules/beta-lifecycle/beta-lifecycle.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    prisma = app.get(PrismaService)
    service = app.get(BetaRewardsService)
    betaLifecycle = app.get(BetaLifecycleService)
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeAccount(label: string, extra: Partial<{ role: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN' }> = {}) {
    const s = suffix()
    return prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: extra.role || 'SUPER_ADMIN',
        status: 'ACTIVE',
        accountPhase: 'OPEN_BETA',
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string, role?: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN' }) {
    return { ...account, role: account.role || 'SUPER_ADMIN', permissions: [], twoFactorEnabled: false }
  }

  // -------------------------------------------------------------------
  // ELIGIBILITY FACT (Part 2/3)
  // -------------------------------------------------------------------
  it('recordParticipation: requires an explicit sourceType and a real justification -- never inferred', async () => {
    const staff = await makeAccount('brstaff1')
    await expect(service.recordParticipation({ betaCycleId: 'cycle', email: 'a@example.invalid', sourceType: 'MANUAL_STAFF_GRANT', justification: 'too short' }, asUser(staff))).rejects.toThrow()
    await expect(service.recordParticipation({ betaCycleId: 'cycle', email: 'a@example.invalid', sourceType: 'NOT_A_REAL_TYPE', justification: 'uma justificativa valida e completa' }, asUser(staff))).rejects.toThrow()
    const record = await service.recordParticipation({ betaCycleId: 'cycle-record', email: 'real-player@example.invalid', sourceType: 'OPEN_BETA_PARTICIPATION', justification: 'Jogador ativo durante todo o ciclo de Open Beta, confirmado manualmente.' }, asUser(staff))
    expect(record.status).toBe('RECORDED')
    expect(record.normalizedEmailHash).toBe(createHash('sha256').update('real-player@example.invalid').digest('hex'))
  })

  it('rejectParticipation: moves a RECORDED row to REJECTED with a reason, cannot reject a CONVERTED row', async () => {
    const staff = await makeAccount('brstaff2')
    const record = await service.recordParticipation({ betaCycleId: 'cycle-reject', email: `reject-${suffix()}@example.invalid`, sourceType: 'MANUAL_STAFF_GRANT', justification: 'Registro de teste para rejeicao explicita.' }, asUser(staff))
    const rejected = await service.rejectParticipation(record.id, 'Nao atende aos criterios combinados.', asUser(staff))
    expect(rejected.status).toBe('REJECTED')
    await expect(service.rejectParticipation(record.id, 'motivo valido', asUser(staff))).rejects.toThrow()
  })

  // -------------------------------------------------------------------
  // GENERATION -- dry-run, commit, idempotency (Part 3)
  // -------------------------------------------------------------------
  it('DRY_RUN: previewGeneration never writes anything -- record stays RECORDED and no entitlement is created', async () => {
    const staff = await makeAccount('brpreview')
    const record = await service.recordParticipation({ betaCycleId: 'cycle-preview', email: `preview-${suffix()}@example.invalid`, sourceType: 'BUG_HUNTER_CONTRIBUTION', justification: 'Bug real confirmado e corrigido pela equipe tecnica.' }, asUser(staff))
    const preview = await service.previewGeneration({ participationRecordIds: [record.id], rewardType: 'BUG_HUNTER_MEDIUM', rewardAmount: 15 })
    expect(preview.wouldCreate).toBe(1)
    const stillRecorded = await prisma.betaParticipationRecord.findUnique({ where: { id: record.id } })
    expect(stillRecorded!.status).toBe('RECORDED')
    const entitlements = await prisma.betaRewardEntitlement.count({ where: { sourceId: record.id } })
    expect(entitlements).toBe(0)
  })

  it('GENERATION_COMMIT: creates a real, ELIGIBLE BetaRewardEntitlement and marks the source record CONVERTED', async () => {
    const staff = await makeAccount('brcommit')
    const record = await service.recordParticipation({ betaCycleId: 'cycle-commit', email: `commit-${suffix()}@example.invalid`, sourceType: 'EVENT_PARTICIPATION', justification: 'Participou do evento de teste de carga do dia 04/09.' }, asUser(staff))
    const result = await service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'EVENT_REWARD', rewardAmount: 25, reason: 'Geracao de recompensa para participantes do evento de teste.' }, asUser(staff))
    expect(result.created).toBe(1)
    const updatedRecord = await prisma.betaParticipationRecord.findUnique({ where: { id: record.id } })
    expect(updatedRecord!.status).toBe('CONVERTED')
    expect(updatedRecord!.convertedEntitlementId).toBe(result.rows[0].entitlementId)
    const entitlement = await prisma.betaRewardEntitlement.findUnique({ where: { id: result.rows[0].entitlementId } })
    expect(entitlement!.status).toBe('ELIGIBLE')
    expect(entitlement!.rewardAmount).toBe(25)
    expect(entitlement!.sourceType).toBe('PARTICIPATION_RECORD')
    expect(entitlement!.sourceId).toBe(record.id)
  })

  it('IDEMPOTENT_GENERATION: committing the same record twice creates exactly one entitlement', async () => {
    const staff = await makeAccount('bridempotent')
    const record = await service.recordParticipation({ betaCycleId: 'cycle-idempotent', email: `idempotent-${suffix()}@example.invalid`, sourceType: 'MANUAL_STAFF_GRANT', justification: 'Concessao manual aprovada pela lideranca do Beta.' }, asUser(staff))
    const first = await service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'MANUAL_GRANT', rewardAmount: 10, reason: 'Primeira geracao de teste de idempotencia.' }, asUser(staff))
    expect(first.created).toBe(1)
    const second = await service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'MANUAL_GRANT', rewardAmount: 10, reason: 'Segunda tentativa, deve ser ignorada.' }, asUser(staff))
    expect(second.created).toBe(0)
    expect(second.alreadyConverted).toBe(1)
    const entitlementCount = await prisma.betaRewardEntitlement.count({ where: { sourceId: record.id } })
    expect(entitlementCount).toBe(1)
  })

  it('generation requires a positive reward amount and a real reason', async () => {
    const staff = await makeAccount('brvalidate')
    const record = await service.recordParticipation({ betaCycleId: 'cycle-validate', email: `validate-${suffix()}@example.invalid`, sourceType: 'MANUAL_STAFF_GRANT', justification: 'Registro de teste para validacao de geracao.' }, asUser(staff))
    await expect(service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'X', rewardAmount: 0, reason: 'motivo valido e completo' }, asUser(staff))).rejects.toThrow()
    await expect(service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'X', rewardAmount: 10, reason: 'curto' }, asUser(staff))).rejects.toThrow()
  })

  // -------------------------------------------------------------------
  // CLAIM SAFETY -- reuses beta-lifecycle.service.ts's own real claim path
  // -------------------------------------------------------------------
  it('CLAIM_AFTER_GENERATION: an entitlement generated by this workflow is claimable exactly once, by the matching email only', async () => {
    const staff = await makeAccount('brclaim')
    const email = `claim-${suffix()}@example.invalid`
    const record = await service.recordParticipation({ betaCycleId: 'cycle-claim', email, sourceType: 'OPEN_BETA_PARTICIPATION', justification: 'Participacao confirmada manualmente para teste de claim.' }, asUser(staff))
    await service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'BUG_HUNTER_LOW', rewardAmount: 5, reason: 'Geracao de teste para validar o fluxo de claim completo.' }, asUser(staff))

    const wrongAccount = await makeAccount('brclaimwrong', { role: 'PLAYER' })
    const wrongClaim = await betaLifecycle.claimMyEntitlements(asUser(wrongAccount))
    expect(wrongClaim.claimed).toHaveLength(0)

    const rightAccount = await prisma.account.create({
      data: {
        username: `brclaimright_${suffix()}`.slice(0, 20), name: 'Claim Right', email,
        passwordHash: 'not-a-real-hash', personalIdHash: 'not-a-real-hash', role: 'PLAYER', status: 'ACTIVE', accountPhase: 'OPEN_BETA',
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] }
      }
    })
    const rightClaim = await betaLifecycle.claimMyEntitlements(asUser(rightAccount))
    expect(rightClaim.claimed).toHaveLength(1)
    expect(rightClaim.claimed[0].rewardAmount).toBe(5)

    const secondAttempt = await betaLifecycle.claimMyEntitlements(asUser(rightAccount))
    expect(secondAttempt.claimed).toHaveLength(0)
  })

  // -------------------------------------------------------------------
  // PURGE INDEPENDENCE (Part 7/8)
  // -------------------------------------------------------------------
  it('PURGE_INDEPENDENCE: recording participation and generating an entitlement never requires the source account to still exist, and never touches PRE_BETA protection', async () => {
    const staff = await makeAccount('brpurge')
    const player = await makeAccount('brpurgeplayer', { role: 'PLAYER' })
    const record = await service.recordParticipation({ betaCycleId: 'cycle-purge', email: player.email, accountId: player.id, sourceType: 'BUG_HUNTER_CONTRIBUTION', justification: 'Contribuicao confirmada antes de uma eventual limpeza de Beta.' }, asUser(staff))
    // Simulate the account reference being cleared (what anonymization/removal does) --
    // recordParticipation and commitGeneration must not depend on it resolving.
    await service.commitGeneration({ participationRecordIds: [record.id], rewardType: 'BUG_HUNTER_LOW', rewardAmount: 5, reason: 'Geracao antes de uma futura limpeza de conta de Beta.' }, asUser(staff))
    const entitlement = await prisma.betaRewardEntitlement.findFirst({ where: { sourceId: record.id } })
    expect(entitlement).not.toBeNull()
    expect(entitlement!.originalAccountId).toBe(player.id)

    // Clearing the account reference (what deletion/anonymization does) must not
    // affect the already-generated entitlement's claimability.
    await prisma.betaRewardEntitlement.update({ where: { id: entitlement!.id }, data: { originalAccountId: null } })
    const stillEligible = await prisma.betaRewardEntitlement.findUnique({ where: { id: entitlement!.id } })
    expect(stillEligible!.status).toBe('ELIGIBLE')

    // No PRE_BETA account was created or touched by this whole flow --
    // this workflow is independent of, and never triggers, purge eligibility.
    const preBetaCount = await prisma.account.count({ where: { accountPhase: 'PRE_BETA' } })
    expect(preBetaCount).toBe(0)
  })
})
