import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-bug-hunters'

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

describe('Bug Hunters MVP', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let service: import('../src/modules/bug-hunters/bug-hunters.service').BugHuntersService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { BugHuntersService } = await import('../src/modules/bug-hunters/bug-hunters.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    service = app.get(BugHuntersService)
  }, 60000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((m) => m.default(httpServer))
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
        role: extra.role || 'PLAYER',
        status: 'ACTIVE',
        accountPhase: 'OPEN_BETA',
        currencies: { create: [{ currency: 'WCOIN', balance: 0 }] }
      }
    })
  }

  function asUser(account: { id: string, username: string, name: string, email: string, role?: 'PLAYER' | 'GM' | 'ADMIN' | 'SUPER_ADMIN' }) {
    return { ...account, role: account.role || 'PLAYER', permissions: [], twoFactorEnabled: false }
  }

  const validPayload = (overrides: Record<string, unknown> = {}) => ({
    category: 'GAMEPLAY', title: 'Personagem trava ao usar skill X',
    description: 'Ao usar a skill X perto de uma parede o personagem trava por 10 segundos.',
    stepsToReproduce: '1. Ir ate Devias 2. Usar skill X perto da parede norte 3. Observar o travamento',
    expectedBehavior: 'O personagem deveria usar a skill normalmente.',
    actualBehavior: 'O personagem trava e nao responde por cerca de 10 segundos.',
    playerSeverity: 'MEDIUM', consentAcknowledged: true,
    ...overrides
  })

  // -------------------------------------------------------------------
  // CREATE / VALIDATION
  // -------------------------------------------------------------------
  it('create: a valid report is created with a CREATED event and OPEN status', async () => {
    const account = await makeAccount('bhcreate')
    const report = await service.createReport(validPayload(), asUser(account))
    expect(report.status).toBe('OPEN')
    expect(report.accountId).toBe(account.id)
    const full = await service.getOwnReport(report.id, asUser(account))
    expect(full.events).toHaveLength(1)
    expect(full.events[0].type).toBe('CREATED')
  })

  it('validation: missing required fields are rejected with no report created', async () => {
    const account = await makeAccount('bhvalid')
    await expect(service.createReport(validPayload({ title: '' }), asUser(account))).rejects.toThrow()
    await expect(service.createReport(validPayload({ consentAcknowledged: false }), asUser(account))).rejects.toThrow()
    await expect(service.createReport(validPayload({ category: 'NOT_A_REAL_CATEGORY' }), asUser(account))).rejects.toThrow()
    const reports = await service.listOwnReports(asUser(account))
    expect(reports).toHaveLength(0)
  })

  it('INJECTION_SAFE: HTML/script-like content is stored and returned verbatim, never executed or stripped server-side (rendering safety is Vue auto-escaping, not server sanitization)', async () => {
    const account = await makeAccount('bhxss')
    const payload = validPayload({ title: '<script>alert(1)</script> Bug real', description: '<img src=x onerror=alert(1)> Descricao real do bug aqui.' })
    const report = await service.createReport(payload, asUser(account))
    expect(report.title).toBe(payload.title)
    expect(report.description).toBe(payload.description)
  })

  // -------------------------------------------------------------------
  // RATE LIMIT / DUPLICATE
  // -------------------------------------------------------------------
  it('rate-limit: a second submission within the cooldown window is rejected', async () => {
    const account = await makeAccount('bhrate')
    await service.createReport(validPayload({ title: 'Primeiro relato unico' }), asUser(account))
    await expect(service.createReport(validPayload({ title: 'Segundo relato imediato' }), asUser(account))).rejects.toThrow()
  })

  it('duplicate handling: a same-title resubmission is flagged as a possible duplicate but NOT blocked (advisory only)', async () => {
    const account = await makeAccount('bhdup')
    const first = await service.createReport(validPayload({ title: 'Titulo identico de teste' }), asUser(account))
    // Bypass the cooldown directly at the DB layer (simulating a later, non-cooldown-blocked resubmission)
    await prisma.bugReport.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 120000) } })
    const second = await service.createReport(validPayload({ title: 'Titulo identico de teste' }), asUser(account))
    expect(second.possibleDuplicateOf).toContain(first.id)
    // Both reports genuinely exist -- duplicate detection never deletes/blocks.
    const reports = await service.listOwnReports(asUser(account))
    expect(reports.length).toBeGreaterThanOrEqual(2)
  })

  // -------------------------------------------------------------------
  // OWNERSHIP / LIST OWN
  // -------------------------------------------------------------------
  it('ownership: a player cannot view another accounts report', async () => {
    const owner = await makeAccount('bhowner')
    const intruder = await makeAccount('bhintruder')
    const report = await service.createReport(validPayload(), asUser(owner))
    await expect(service.getOwnReport(report.id, asUser(intruder))).rejects.toThrow()
  })

  it('list own: only the callers own reports are returned', async () => {
    const a = await makeAccount('bhlista')
    const b = await makeAccount('bhlistb')
    await service.createReport(validPayload({ title: 'Relato da conta A' }), asUser(a))
    await service.createReport(validPayload({ title: 'Relato da conta B' }), asUser(b))
    const listA = await service.listOwnReports(asUser(a))
    expect(listA.every((r) => r.title === 'Relato da conta A')).toBe(true)
  })

  // -------------------------------------------------------------------
  // STAFF TRIAGE
  // -------------------------------------------------------------------
  it('staff list: returns reports across accounts, filterable by status', async () => {
    const player = await makeAccount('bhstafflist')
    const staff = await makeAccount('bhstaff1', { role: 'ADMIN' })
    await service.createReport(validPayload({ title: 'Relato para lista de staff' }), asUser(player))
    const openList = await service.listForStaff({ status: 'OPEN' })
    expect(openList.some((r) => r.title === 'Relato para lista de staff')).toBe(true)
    void staff
  })

  it('assign: a report can be assigned to a valid staff account, recorded as an internal event', async () => {
    const player = await makeAccount('bhassignp')
    const staff = await makeAccount('bhassigns', { role: 'GM' })
    const report = await service.createReport(validPayload(), asUser(player))
    const updated = await service.assign(report.id, staff.id, asUser(staff))
    expect(updated.assignedToAccountId).toBe(staff.id)
    const full = await service.getForStaff(report.id)
    expect(full.events.some((e) => e.type === 'ASSIGNED' && e.isInternal)).toBe(true)
  })

  it('status change: transitions to RESOLVED sets resolvedAt and records a public STATUS_CHANGED event', async () => {
    const player = await makeAccount('bhresolvep')
    const staff = await makeAccount('bhresolves', { role: 'ADMIN' })
    const report = await service.createReport(validPayload(), asUser(player))
    const updated = await service.changeStatus(report.id, 'RESOLVED', 'Corrigido no build interno.', asUser(staff))
    expect(updated.status).toBe('RESOLVED')
    expect(updated.resolvedAt).not.toBeNull()
    const own = await service.getOwnReport(report.id, asUser(player))
    expect(own.events.some((e) => e.type === 'STATUS_CHANGED' && !e.isInternal)).toBe(true)
  })

  it('status change: rejects an invalid status and requires a justification', async () => {
    const player = await makeAccount('bhbadstatusp')
    const staff = await makeAccount('bhbadstatuss', { role: 'ADMIN' })
    const report = await service.createReport(validPayload(), asUser(player))
    await expect(service.changeStatus(report.id, 'NOT_A_REAL_STATUS', 'motivo valido', asUser(staff))).rejects.toThrow()
    await expect(service.changeStatus(report.id, 'CONFIRMED', '', asUser(staff))).rejects.toThrow()
  })

  it('staff reply: visible to the player as a non-internal event', async () => {
    const player = await makeAccount('bhreplyp')
    const staff = await makeAccount('bhreplys', { role: 'ADMIN' })
    const report = await service.createReport(validPayload(), asUser(player))
    await service.reply(report.id, 'Obrigado pelo relato, estamos investigando.', asUser(staff))
    const own = await service.getOwnReport(report.id, asUser(player))
    expect(own.events.some((e) => e.type === 'STAFF_REPLY' && e.message?.includes('investigando'))).toBe(true)
  })

  it('INTERNAL_NOTE_PRIVACY: an internal note is never returned by the player-facing endpoint', async () => {
    const player = await makeAccount('bhnotep')
    const staff = await makeAccount('bhnotes', { role: 'ADMIN' })
    const report = await service.createReport(validPayload(), asUser(player))
    await service.addInternalNote(report.id, 'Nota interna sensivel -- nunca deve vazar ao jogador.', asUser(staff))
    const own = await service.getOwnReport(report.id, asUser(player))
    expect(own.events.some((e) => e.message?.includes('sensivel'))).toBe(false)
    const staffView = await service.getForStaff(report.id)
    expect(staffView.events.some((e) => e.type === 'INTERNAL_NOTE' && e.isInternal)).toBe(true)
  })

  it('staff severity: distinct from player severity, never overwrites it', async () => {
    const player = await makeAccount('bhsevp')
    const staff = await makeAccount('bhsevs', { role: 'ADMIN' })
    const report = await service.createReport(validPayload({ playerSeverity: 'LOW' }), asUser(player))
    const updated = await service.setStaffSeverity(report.id, 'CRITICAL', asUser(staff))
    expect(updated.playerSeverity).toBe('LOW')
    expect(updated.staffSeverity).toBe('CRITICAL')
  })

  // -------------------------------------------------------------------
  // RBAC (real HTTP boundary)
  // -------------------------------------------------------------------
  it('RBAC: an unauthenticated request to the staff queue is rejected', async () => {
    const res = await (await request()).get('/api/admin/bug-reports')
    expect([401, 403]).toContain(res.status)
  })

  it('RBAC: an unauthenticated request to submit a report is rejected', async () => {
    const res = await (await request()).post('/api/account/bug-reports').send(validPayload())
    expect([401, 403]).toContain(res.status)
  })

  // -------------------------------------------------------------------
  // REWARD LINKAGE -- never auto-pays
  // -------------------------------------------------------------------
  it('reward eligibility: recording eligibility creates only a BetaParticipationRecord, never a wallet credit or BetaRewardEntitlement', async () => {
    const player = await makeAccount('bhrewardp')
    const staff = await makeAccount('bhrewards', { role: 'SUPER_ADMIN' })
    const report = await service.createReport(validPayload(), asUser(player))
    const before = await prisma.walletLedgerEntry.count({ where: { accountId: player.id } }).catch(() => 0)
    const record = await service.recordRewardEligibility(report.id, { betaCycleId: 'test-cycle-reward', justification: 'Relato confirmado e reproduzido pela equipe.' }, asUser(staff))
    expect(record.status).toBe('RECORDED')
    expect(record.sourceType).toBe('BUG_HUNTER_CONTRIBUTION')
    expect(record.sourceId).toBe(report.id)
    const entitlementCount = await prisma.betaRewardEntitlement.count({ where: { sourceId: record.id } })
    expect(entitlementCount).toBe(0)
    const after = await prisma.walletLedgerEntry.count({ where: { accountId: player.id } }).catch(() => 0)
    expect(after).toBe(before)
  })
})
