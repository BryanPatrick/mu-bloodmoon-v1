import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-gm-events'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-gm-events-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-gm-events-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-gm-events-two-factor-key-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'
  process.env.AUTH_RATE_SENSITIVE_IP_LIMIT = '1000'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => {
  delete process.env.AUTH_RATE_SENSITIVE_IP_LIMIT
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('GM events MVP (definitions, agenda, runs, results)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)

  const player = {
    name: 'GM Events E2E Player',
    username: `gme_p_${suffix}`,
    password: 'gm-events-player-password-1',
    personalId: '10102020301',
    email: `gme-player-${suffix}@example.invalid`
  }
  const gmNoPerms = {
    name: 'GM Events E2E GM (view only)',
    username: `gme_gv_${suffix}`,
    password: 'gm-events-gm-view-password-1',
    personalId: '20203030401',
    email: `gme-gm-view-${suffix}@example.invalid`
  }
  const gmExecutor = {
    name: 'GM Events E2E GM (executor)',
    username: `gme_ge_${suffix}`,
    password: 'gm-events-gm-exec-password-1',
    personalId: '30304040501',
    email: `gme-gm-exec-${suffix}@example.invalid`
  }
  const superAdmin = {
    name: 'GM Events E2E Super Admin',
    username: `gme_s_${suffix}`,
    password: 'gm-events-super-password-1',
    personalId: '40405050601',
    email: `gme-super-${suffix}@example.invalid`
  }

  let playerToken = ''
  let gmNoPermsToken = ''
  let gmExecutorToken = ''
  let superAdminToken = ''
  let definitionId = ''
  let automatedDefinitionId = ''
  let runId = ''
  let scheduleId = ''

  const request = () => import('supertest').then((module) => module.default(httpServer))

  const login = async (username: string, password: string, secret?: string) => {
    const totpCode = secret ? generateSync({ secret }) : undefined
    const result = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username, password, ...(totpCode ? { totpCode } : {}) })
    expect(result.status).toBe(201)
    return result.body.accessToken as string
  }

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { TwoFactorService } = await import('../src/modules/auth/two-factor.service')
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
    twoFactorService = app.get(TwoFactorService)
  }, 60000)

  afterAll(async () => app?.close())

  it('sets up PLAYER, two GMs (one view-only, one with execute+cancel+validate delegated) and SUPER_ADMIN', async () => {
    const req = await request()
    for (const account of [player, gmNoPerms, gmExecutor, superAdmin]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }

    const gmNoPermsSecret = generateSecret({ length: 20 })
    const gmExecutorSecret = generateSecret({ length: 20 })
    const superAdminSecret = generateSecret({ length: 20 })
    await prisma.account.update({
      where: { username: gmNoPerms.username },
      data: { role: 'GM', twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(gmNoPermsSecret) }
    })
    await prisma.account.update({
      where: { username: gmExecutor.username },
      data: { role: 'GM', twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(gmExecutorSecret) }
    })
    await prisma.account.update({
      where: { username: superAdmin.username },
      data: { role: 'SUPER_ADMIN', twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(superAdminSecret) }
    })

    playerToken = await login(player.username, player.password)
    gmNoPermsToken = await login(gmNoPerms.username, gmNoPerms.password, gmNoPermsSecret)
    gmExecutorToken = await login(gmExecutor.username, gmExecutor.password, gmExecutorSecret)
    superAdminToken = await login(superAdmin.username, superAdmin.password, superAdminSecret)

    // Delegate gm.events.execute, gm.events.cancel and gm.events.results.validate
    // to gmExecutor only -- gmNoPerms keeps just the role baseline (view only).
    const executorAccount = await prisma.account.findUniqueOrThrow({ where: { username: gmExecutor.username } })
    const grant = await (
      await request()
    )
      .patch(`/api/admin/accounts/${executorAccount.id}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        permissions: [
          { key: 'gm.events.execute', granted: true },
          { key: 'gm.events.cancel', granted: true },
          { key: 'gm.events.results.validate', granted: true }
        ],
        reason: 'Delegando permissoes de eventos ao GM executor em teste e2e'
      })
    expect(grant.status).toBe(200)
    // Granting a permission bumps sessionVersion -- refresh the token.
    gmExecutorToken = await login(gmExecutor.username, gmExecutor.password, gmExecutorSecret)
  })

  it('blocks a PLAYER from every /gm/events endpoint', async () => {
    const list = await (await request()).get('/api/gm/events/definitions').set('Authorization', `Bearer ${playerToken}`)
    expect(list.status).toBe(403)
    const create = await (
      await request()
    )
      .post('/api/gm/events/definitions')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ key: 'nope', name: 'Nope', category: 'test', executionMode: 'MANUAL_GM' })
    expect(create.status).toBe(403)
  })

  it('lets SUPER_ADMIN create an event definition and schedule (GM cannot configure these)', async () => {
    const gmAttempt = await (
      await request()
    )
      .post('/api/gm/events/definitions')
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ key: 'golden-invasion', name: 'Golden Invasion', category: 'invasion', executionMode: 'MANUAL_GM' })
    expect(gmAttempt.status).toBe(403)

    const created = await (
      await request()
    )
      .post('/api/gm/events/definitions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `golden-invasion-${suffix}`, name: 'Golden Invasion', category: 'invasion', executionMode: 'MANUAL_GM' })
    expect(created.status).toBe(201)
    definitionId = created.body.id

    const automated = await (
      await request()
    )
      .post('/api/gm/events/definitions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ key: `auto-event-${suffix}`, name: 'Evento Automatico Futuro', category: 'system', executionMode: 'AUTOMATED' })
    expect(automated.status).toBe(201)
    automatedDefinitionId = automated.body.id

    const schedule = await (
      await request()
    )
      .post(`/api/gm/events/definitions/${definitionId}/schedules`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ startsAt: new Date(Date.now() + 3600_000).toISOString() })
    expect(schedule.status).toBe(201)
  })

  it('lets both GMs view definitions and the agenda', async () => {
    const asViewOnly = await (
      await request()
    )
      .get('/api/gm/events/definitions')
      .set('Authorization', `Bearer ${gmNoPermsToken}`)
    expect(asViewOnly.status).toBe(200)
    expect(asViewOnly.body.some((item: { id: string }) => item.id === definitionId)).toBe(true)

    const agenda = await (
      await request()
    )
      .get('/api/gm/events/agenda')
      .set('Authorization', `Bearer ${gmNoPermsToken}`)
    expect(agenda.status).toBe(200)
    expect(Array.isArray(agenda.body)).toBe(true)
  })

  it('blocks a GM without gm.events.execute from starting a run', async () => {
    const result = await (
      await request()
    )
      .post('/api/gm/events/runs')
      .set('Authorization', `Bearer ${gmNoPermsToken}`)
      .send({ definitionId })
    expect(result.status).toBe(403)
  })

  it('refuses to start a run for an AUTOMATED definition -- no live game-server driver exists yet', async () => {
    const result = await (
      await request()
    )
      .post('/api/gm/events/runs')
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ definitionId: automatedDefinitionId })
    expect(result.status).toBe(400)
  })

  it('lets the authorized GM start a run, recorded as PORTAL_ONLY (never claims the game was actually changed)', async () => {
    const result = await (
      await request()
    )
      .post('/api/gm/events/runs')
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ definitionId })
    expect(result.status).toBe(201)
    expect(result.body.status).toBe('ACTIVE')
    expect(result.body.origin).toBe('PORTAL_ONLY')
    expect(result.body.startedBy).toBe(gmExecutor.username)
    runId = result.body.id

    const events = await prisma.auditEvent.findMany({ where: { targetType: 'GmEventRun', targetId: runId, action: 'gm.event.run.started' } })
    expect(events).toHaveLength(1)
    expect(events[0]!.actorUsername).toBe(gmExecutor.username)
  })

  it('requires a reason to cancel, and blocks a GM without gm.events.cancel from cancelling at all', async () => {
    const withoutReason = await (
      await request()
    )
      .patch(`/api/gm/events/runs/${runId}/cancel`)
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({})
    expect(withoutReason.status).toBe(400)

    const withoutPermission = await (
      await request()
    )
      .patch(`/api/gm/events/runs/${runId}/cancel`)
      .set('Authorization', `Bearer ${gmNoPermsToken}`)
      .send({ reason: 'Tentando cancelar sem permissao delegada' })
    expect(withoutPermission.status).toBe(403)
  })

  it('lets the GM end the run, submit a result, and a validator-permissioned GM validate it', async () => {
    const ended = await (
      await request()
    )
      .patch(`/api/gm/events/runs/${runId}/end`)
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ note: 'Evento concluido sem incidentes.' })
    expect(ended.status).toBe(200)
    expect(ended.body.status).toBe('COMPLETED')

    const resultSubmission = await (
      await request()
    )
      .post(`/api/gm/events/runs/${runId}/result`)
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ summary: 'Evento realizado com 12 participantes, sem problemas.', participantCount: 12 })
    expect(resultSubmission.status).toBe(201)
    expect(resultSubmission.body.result.status).toBe('PENDING_VALIDATION')

    const validation = await (
      await request()
    )
      .patch(`/api/gm/events/runs/${runId}/result/validate`)
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ status: 'VALIDATED' })
    expect(validation.status).toBe(200)
    expect(validation.body.result.status).toBe('VALIDATED')
    expect(validation.body.result.validatedBy).toBe(gmExecutor.username)

    const events = await prisma.auditEvent.findMany({ where: { targetType: 'GmEventRun', targetId: runId } })
    const actions = events.map((event) => event.action)
    expect(actions).toEqual(expect.arrayContaining(['gm.event.run.started', 'gm.event.run.ended', 'gm.event.result.submitted', 'gm.event.result.validated']))
  })

  it('lets SUPER_ADMIN see and cancel a second run with a reason, exercising the ADMIN/SUPER_ADMIN policy path', async () => {
    const started = await (
      await request()
    )
      .post('/api/gm/events/runs')
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ definitionId })
    expect(started.status).toBe(201)
    const secondRunId = started.body.id

    const list = await (
      await request()
    )
      .get('/api/gm/events/runs')
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data.some((item: { id: string }) => item.id === secondRunId)).toBe(true)

    const cancelled = await (
      await request()
    )
      .patch(`/api/gm/events/runs/${secondRunId}/cancel`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ reason: 'Cancelado pelo Super ADM por decisao operacional.' })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('CANCELLED')
  })

  it('blocks a GM from every definition-configuration endpoint (get/update/history/schedule update/schedule delete)', async () => {
    const get = await (await request()).get(`/api/gm/events/definitions/${definitionId}`).set('Authorization', `Bearer ${gmExecutorToken}`)
    expect(get.status).toBe(200) // viewing a single definition is allowed by gm.events.view

    const update = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ name: 'GM tentando renomear' })
    expect(update.status).toBe(403)

    const history = await (await request()).get(`/api/gm/events/definitions/${definitionId}/history`).set('Authorization', `Bearer ${gmExecutorToken}`)
    expect(history.status).toBe(403)
  })

  it('lets SUPER_ADMIN fetch a definition detail with its schedules', async () => {
    const detail = await (
      await request()
    )
      .get(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(detail.status).toBe(200)
    expect(detail.body.id).toBe(definitionId)
    expect(Array.isArray(detail.body.schedules)).toBe(true)
    expect(detail.body.schedules.length).toBeGreaterThan(0)
    scheduleId = detail.body.schedules[0].id
  })

  it('requires a reason to change status or executionMode, but not for a plain rename', async () => {
    const withoutReason = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'INACTIVE' })
    expect(withoutReason.status).toBe(400)

    const rename = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Golden Invasion (renomeado)' })
    expect(rename.status).toBe(200)
    expect(rename.body.name).toBe('Golden Invasion (renomeado)')
    expect(rename.body.status).toBe('ACTIVE')

    const withReason = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'INACTIVE', reason: 'Suspendendo temporariamente para ajuste de balanceamento' })
    expect(withReason.status).toBe(200)
    expect(withReason.body.status).toBe('INACTIVE')

    // Reactivate so it does not interfere with earlier assertions if this file is re-run.
    const reactivate = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'ACTIVE', reason: 'Reativando apos ajuste de balanceamento' })
    expect(reactivate.status).toBe(200)
  })

  it('records definition and schedule changes in the merged history/audit view', async () => {
    const history = await (
      await request()
    )
      .get(`/api/gm/events/definitions/${definitionId}/history`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(history.status).toBe(200)
    const actions = history.body.map((entry: { action: string }) => entry.action)
    expect(actions).toEqual(
      expect.arrayContaining(['gm.event.definition.created', 'gm.event.definition.updated', 'gm.event.schedule.created'])
    )
  })

  it('lets SUPER_ADMIN update a schedule, and blocks deleting one that already has a run recorded against it', async () => {
    const updated = await (
      await request()
    )
      .patch(`/api/gm/events/definitions/${definitionId}/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ recurrenceNote: 'Semanal, todo domingo' })
    expect(updated.status).toBe(200)
    expect(updated.body.recurrenceNote).toBe('Semanal, todo domingo')

    // scheduleId itself has no run referencing it -- deleting it should succeed.
    const okDelete = await (
      await request()
    )
      .delete(`/api/gm/events/definitions/${definitionId}/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(okDelete.status).toBe(200)
    expect(okDelete.body.ok).toBe(true)

    // A schedule referenced by a run cannot be deleted.
    const linkedSchedule = await (
      await request()
    )
      .post(`/api/gm/events/definitions/${definitionId}/schedules`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ startsAt: new Date(Date.now() + 7200_000).toISOString() })
    expect(linkedSchedule.status).toBe(201)

    const linkedRun = await (
      await request()
    )
      .post('/api/gm/events/runs')
      .set('Authorization', `Bearer ${gmExecutorToken}`)
      .send({ definitionId, scheduleId: linkedSchedule.body.id })
    expect(linkedRun.status).toBe(201)

    const blockedDelete = await (
      await request()
    )
      .delete(`/api/gm/events/definitions/${definitionId}/schedules/${linkedSchedule.body.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
    expect(blockedDelete.status).toBe(400)
  })
})
