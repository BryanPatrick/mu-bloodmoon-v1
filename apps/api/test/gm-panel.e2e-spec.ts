import { execSync } from 'node:child_process'
import { generateSecret, generateSync } from 'otplib'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

const CONTAINER = 'bloodmoon-e2e-gm-panel'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-gm-panel-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-gm-panel-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-gm-panel-two-factor-key-32-characters'
  process.env.AUTH_CAPTCHA_TEST_BYPASS = '1'
  process.env.AUTH_MAIL_TEST_BYPASS = '1'

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: process.env,
    stdio: 'pipe'
  })
}, 120000)

afterAll(() => stopDisposableDatabase(CONTAINER))

jest.setTimeout(30000)

describe('GM operational panel (dashboard, logs, occurrences)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let twoFactorService: import('../src/modules/auth/two-factor.service').TwoFactorService
  const suffix = Date.now().toString(36)

  const player = {
    name: 'GM Panel E2E Player',
    username: `gmp_p_${suffix}`,
    password: 'gm-panel-player-password-1',
    personalId: '77788899911',
    email: `gmp-player-${suffix}@example.invalid`
  }
  const gm = {
    name: 'GM Panel E2E GM',
    username: `gmp_g_${suffix}`,
    password: 'gm-panel-gm-password-1',
    personalId: '88899900022',
    email: `gmp-gm-${suffix}@example.invalid`
  }

  let playerToken = ''
  let gmToken = ''
  let occurrenceId = ''

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

  it('registers a PLAYER and a GM (with active 2FA, required to reach role-gated routes)', async () => {
    const req = await request()
    for (const account of [player, gm]) {
      const result = await req.post('/api/auth/register').send(account)
      expect(result.status).toBe(201)
    }
    const gmSecret = generateSecret({ length: 20 })
    await prisma.account.update({
      where: { username: gm.username },
      data: { role: 'GM', twoFactorEnabled: true, twoFactorSecret: twoFactorService.encrypt(gmSecret) }
    })
    playerToken = await login(player.username, player.password)
    gmToken = await login(gm.username, gm.password, gmSecret)
  })

  it('blocks a PLAYER from every /gm endpoint', async () => {
    const req = await request()
    const dashboard = await req.get('/api/gm/dashboard').set('Authorization', `Bearer ${playerToken}`)
    expect(dashboard.status).toBe(403)
    const logs = await (await request()).get('/api/gm/logs').set('Authorization', `Bearer ${playerToken}`)
    expect(logs.status).toBe(403)
    const occurrences = await (await request()).get('/api/gm/occurrences').set('Authorization', `Bearer ${playerToken}`)
    expect(occurrences.status).toBe(403)
    const create = await (
      await request()
    )
      .post('/api/gm/occurrences')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ type: 'denuncia', description: 'Nao deveria funcionar' })
    expect(create.status).toBe(403)
  })

  it('lets a GM with active 2FA see the dashboard, excluding financial/strategic data', async () => {
    const result = await (
      await request()
    )
      .get('/api/gm/dashboard')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(result.status).toBe(200)
    expect(result.body).toHaveProperty('occurrences')
    expect(result.body).toHaveProperty('characters')
    expect(result.body).not.toHaveProperty('revenue')
    expect(result.body).not.toHaveProperty('financeiro')
    expect(JSON.stringify(result.body).toLowerCase()).not.toContain('mercadopago')
  })

  it('lets a GM view the operational log, scoped to game-facing modules only', async () => {
    const result = await (
      await request()
    )
      .get('/api/gm/logs')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(result.status).toBe(200)
    expect(Array.isArray(result.body.data)).toBe(true)
  })

  it('lets a GM create an occurrence, which is then auditable', async () => {
    const result = await (
      await request()
    )
      .post('/api/gm/occurrences')
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ type: 'denuncia', description: 'Comportamento suspeito reportado por outro jogador.' })
    expect(result.status).toBe(201)
    expect(result.body.status).toBe('OPEN')
    expect(result.body.createdBy).toBe(gm.username)
    occurrenceId = result.body.id

    const events = await prisma.auditEvent.findMany({ where: { targetType: 'GmOccurrence', targetId: occurrenceId, action: 'gm.occurrence.created' } })
    expect(events).toHaveLength(1)
    expect(events[0]!.actorUsername).toBe(gm.username)
  })

  it('lists the occurrence and lets a GM add an operational note', async () => {
    const list = await (
      await request()
    )
      .get('/api/gm/occurrences')
      .set('Authorization', `Bearer ${gmToken}`)
    expect(list.status).toBe(200)
    expect(list.body.data.some((item: { id: string }) => item.id === occurrenceId)).toBe(true)

    const withNote = await (
      await request()
    )
      .post(`/api/gm/occurrences/${occurrenceId}/notes`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ note: 'Aguardando confirmacao do jogador denunciado.' })
    expect(withNote.status).toBe(201)
    expect(withNote.body.notes).toHaveLength(1)
    expect(withNote.body.notes[0].author).toBe(gm.username)
  })

  it('requires a reason to resolve or dismiss an occurrence, and none to move it to in-review', async () => {
    const withoutReason = await (
      await request()
    )
      .patch(`/api/gm/occurrences/${occurrenceId}`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ status: 'RESOLVED' })
    expect(withoutReason.status).toBe(400)

    const inReview = await (
      await request()
    )
      .patch(`/api/gm/occurrences/${occurrenceId}`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ status: 'IN_REVIEW' })
    expect(inReview.status).toBe(200)
    expect(inReview.body.status).toBe('IN_REVIEW')

    const resolved = await (
      await request()
    )
      .patch(`/api/gm/occurrences/${occurrenceId}`)
      .set('Authorization', `Bearer ${gmToken}`)
      .send({ status: 'RESOLVED', reason: 'Denuncia investigada e falsa, sem violacao confirmada.' })
    expect(resolved.status).toBe(200)
    expect(resolved.body.status).toBe('RESOLVED')
    expect(resolved.body.resolvedAt).toBeTruthy()

    const events = await prisma.auditEvent.findMany({ where: { targetType: 'GmOccurrence', targetId: occurrenceId, action: 'gm.occurrence.updated' } })
    expect(events.length).toBeGreaterThanOrEqual(2)
  })
})
