import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other E2E specs -- a dedicated,
// disposable MariaDB container, never bloodmoon-mysql, never production.
const CONTAINER = 'bloodmoon-e2e-guilds'

const KNOWN_RESOURCE_KEYS = ['ZEN', 'WCOIN', 'GOBLIN_POINT', 'HUNT_POINT', 'JEWEL_BLESS', 'JEWEL_SOUL', 'JEWEL_CHAOS']

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET = 'e2e-guilds-access-secret'
  process.env.JWT_REFRESH_SECRET = 'e2e-guilds-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY = 'e2e-guilds-two-factor-encryption-key-32c'

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Guilds MVP', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))
  const suffix = Date.now().toString(36)

  const register = async (label: string) => {
    const player = {
      name: `E2E Guilds ${label}`,
      username: `e2egld${label}_${suffix}`.slice(0, 20),
      password: 'e2e-test-password-guilds',
      personalId: `1112223334${label.length}`,
      email: `e2e-guilds-${label}-${suffix}@example.invalid`
    }
    const res = await (await request()).post('/api/auth/register').send(player)
    expect(res.status).toBe(201)
    return player
  }

  const login = async (username: string, password: string) => {
    const res = await (await request()).post('/api/auth/login').send({ username, password })
    expect(res.status).toBe(201)
    return res.body.accessToken as string
  }

  const createCharacter = async (accountUsername: string, label: string) => {
    const account = await prisma.account.findUniqueOrThrow({ where: { username: accountUsername } })
    return prisma.accountCharacter.create({
      data: {
        accountId: account.id,
        key: `e2e-gld-char-${label}-${suffix}`,
        name: `EGld${label}${suffix}`.slice(0, 20),
        className: 'Dark Knight'
      }
    })
  }

  let admin: { username: string, password: string }
  let leader: { username: string, password: string }
  let joiner: { username: string, password: string }
  let outsider: { username: string, password: string }
  let plainAdmin: { username: string, password: string }
  let adminToken = ''
  let leaderToken = ''
  let joinerToken = ''
  let outsiderToken = ''
  let plainAdminToken = ''
  let leaderCharacterId = ''
  let joinerCharacterId = ''

  it('registers synthetic accounts and characters; promotes one to SUPER_ADMIN and one to a permission-less ADMIN', async () => {
    admin = await register('A')
    leader = await register('L')
    joiner = await register('J')
    outsider = await register('O')
    plainAdmin = await register('P')

    await prisma.account.update({ where: { username: admin.username }, data: { role: 'SUPER_ADMIN' } })
    // Same precedent as the Community suite: role: 'ADMIN' alone grants
    // nothing -- confirms guild admin routes are gated by explicit
    // permission keys, not just the ADMIN role.
    await prisma.account.update({ where: { username: plainAdmin.username }, data: { role: 'ADMIN' } })

    adminToken = await login(admin.username, admin.password)
    leaderToken = await login(leader.username, leader.password)
    joinerToken = await login(joiner.username, joiner.password)
    outsiderToken = await login(outsider.username, outsider.password)
    plainAdminToken = await login(plainAdmin.username, plainAdmin.password)

    leaderCharacterId = (await createCharacter(leader.username, 'L')).id
    joinerCharacterId = (await createCharacter(joiner.username, 'J')).id
  })

  it('rejects self-service guild creation and permission-less admin creation; only SUPER_ADMIN with the permission can create', async () => {
    const asPlayer = await (await request())
      .post('/api/admin/guilds')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: 'Should Not Exist', tag: 'NOPE' })
    expect(asPlayer.status).toBe(403)

    const asPlainAdmin = await (await request())
      .post('/api/admin/guilds')
      .set('Authorization', `Bearer ${plainAdminToken}`)
      .send({ name: 'Should Not Exist Either', tag: 'NOPE2' })
    expect(asPlainAdmin.status).toBe(403)

    const anon = await (await request()).post('/api/admin/guilds').send({ name: 'Anon', tag: 'ANON' })
    expect(anon.status).toBe(401)
  })

  let guildSlug = ''
  let guildId = ''

  it('creates a guild as SUPER_ADMIN with a leader character; treasury auto-seeds zero-value balances for the known resource keys', async () => {
    const res = await (await request())
      .post('/api/admin/guilds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Blood Legion ${suffix}`, tag: 'BLD', description: 'Guilda de teste E2E.', recruitment: 'APPROVAL_REQUIRED', leaderCharacterId })
    expect(res.status).toBe(201)
    expect(res.body.tag).toBe('BLD')
    expect(res.body.source).toBe('PORTAL')
    expect(res.body.syncStatus).toBe('NOT_LINKED')
    guildSlug = res.body.slug
    guildId = res.body.id

    const treasury = await (await request()).get(`/api/guilds/${guildSlug}/treasury`)
    expect(treasury.status).toBe(200)
    const keys = treasury.body.balances.map((balance: any) => balance.resourceKey).sort()
    expect(keys).toEqual([...KNOWN_RESOURCE_KEYS].sort())
    for (const balance of treasury.body.balances) {
      expect(Number(balance.availableAmount)).toBe(0)
      expect(Number(balance.reservedAmount)).toBe(0)
    }

    const leaderRow = await prisma.guildMember.findUnique({ where: { characterId: leaderCharacterId } })
    expect(leaderRow?.roleKey).toBe('LEADER')
    expect(leaderRow?.memberXp).toBe(0)
    expect(leaderRow?.contributionScore).toBe(0)
  })

  it('auto-suffixes the slug on a duplicate guild name', async () => {
    const res = await (await request())
      .post('/api/admin/guilds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Blood Legion ${suffix}`, tag: 'BLD2' })
    expect(res.status).toBe(201)
    expect(res.body.slug).not.toBe(guildSlug)
    expect(res.body.slug.startsWith(guildSlug)).toBe(true)
    // Second fixture guild isn't used further -- disband it to keep the
    // public directory listing scoped to the primary fixture for later
    // assertions.
    await (await request())
      .post(`/api/admin/guilds/${res.body.id}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'DISBAND', reason: 'Fixture cleanup.' })
  })

  it('lists the guild in the public directory and profile', async () => {
    const directory = await (await request()).get('/api/guilds').query({ search: 'Blood Legion' })
    expect(directory.status).toBe(200)
    expect(directory.body.data.some((guild: any) => guild.slug === guildSlug)).toBe(true)

    const profile = await (await request()).get(`/api/guilds/${guildSlug}`)
    expect(profile.status).toBe(200)
    expect(profile.body.members.some((member: any) => member.roleKey === 'LEADER')).toBe(true)
  })

  it('enforces edit authorization: non-member is forbidden, LEADER succeeds', async () => {
    const asOutsider = await (await request())
      .patch(`/api/guilds/${guildSlug}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ description: 'Tentativa não autorizada.' })
    expect(asOutsider.status).toBe(403)

    const asLeader = await (await request())
      .patch(`/api/guilds/${guildSlug}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ description: 'Descrição atualizada pelo líder.', focusTags: ['PVP', 'CASTLE_SIEGE'] })
    expect(asLeader.status).toBe(200)
    expect(asLeader.body.description).toBe('Descrição atualizada pelo líder.')
  })

  it('join flow: APPROVAL_REQUIRED guild creates a GuildJoinRequest, LEADER approves, member appears', async () => {
    const joinRes = await (await request())
      .post(`/api/guilds/${guildSlug}/join`)
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ characterId: joinerCharacterId, message: 'Quero entrar!' })
    expect(joinRes.status).toBe(201)
    expect(joinRes.body.status).toBe('REQUESTED')

    const asJoinerListing = await (await request())
      .get(`/api/guilds/${guildSlug}/join-requests`)
      .set('Authorization', `Bearer ${joinerToken}`)
    expect(asJoinerListing.status).toBe(403)

    const pending = await (await request())
      .get(`/api/guilds/${guildSlug}/join-requests`)
      .set('Authorization', `Bearer ${leaderToken}`)
    expect(pending.status).toBe(200)
    expect(pending.body.length).toBe(1)
    const requestId = pending.body[0].id

    const approve = await (await request())
      .post(`/api/guilds/${guildSlug}/join-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({})
    expect(approve.status).toBe(201)
    expect(approve.body.roleKey).toBe('MEMBER')

    const member = await prisma.guildMember.findUnique({ where: { characterId: joinerCharacterId } })
    expect(member?.guildId).toBe(guildId)
    expect(member?.removedAt).toBeNull()
  })

  it('role change: LEADER promotes the joiner to OFFICER; a non-LEADER member cannot change roles', async () => {
    const memberRow = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: joinerCharacterId } })

    const asJoiner = await (await request())
      .patch(`/api/guilds/${guildSlug}/members/${memberRow.id}/role`)
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ roleKey: 'OFFICER' })
    expect(asJoiner.status).toBe(403)

    const asLeader = await (await request())
      .patch(`/api/guilds/${guildSlug}/members/${memberRow.id}/role`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ roleKey: 'OFFICER' })
    expect(asLeader.status).toBe(200)
    expect(asLeader.body.roleKey).toBe('OFFICER')
  })

  it('kick requires a reason and requires LEADER/OFFICER role', async () => {
    const memberRow = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: joinerCharacterId } })

    const noReason = await (await request())
      .delete(`/api/guilds/${guildSlug}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({})
    expect(noReason.status).toBe(400)

    const asOutsider = await (await request())
      .delete(`/api/guilds/${guildSlug}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ reason: 'Não autorizado.' })
    expect(asOutsider.status).toBe(403)

    const kicked = await (await request())
      .delete(`/api/guilds/${guildSlug}/members/${memberRow.id}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ reason: 'Inatividade prolongada.' })
    expect(kicked.status).toBe(200)

    const after = await prisma.guildMember.findUnique({ where: { characterId: joinerCharacterId } })
    expect(after?.removedAt).not.toBeNull()
  })

  it('leave: the LEADER cannot leave while other members remain; rejoining then leaving as a regular member succeeds', async () => {
    // Rejoin the kicked character (OPEN would auto-join, but this guild is
    // APPROVAL_REQUIRED -- go through the request/approve cycle again).
    await (await request()).post(`/api/guilds/${guildSlug}/join`).set('Authorization', `Bearer ${joinerToken}`).send({ characterId: joinerCharacterId })
    const pending = await (await request()).get(`/api/guilds/${guildSlug}/join-requests`).set('Authorization', `Bearer ${leaderToken}`)
    await (await request()).post(`/api/guilds/${guildSlug}/join-requests/${pending.body[0].id}/approve`).set('Authorization', `Bearer ${leaderToken}`).send({})

    const leaderBlocked = await (await request()).delete(`/api/guilds/${guildSlug}/members/me`).set('Authorization', `Bearer ${leaderToken}`)
    expect(leaderBlocked.status).toBe(400)

    const memberLeaves = await (await request()).delete(`/api/guilds/${guildSlug}/members/me`).set('Authorization', `Bearer ${joinerToken}`)
    expect(memberLeaves.status).toBe(200)
  })

  let requestId = ''

  it('GuildRequest CRUD: LOOKING_FOR_ITEM always carries the server-populated disclaimer', async () => {
    const nonMember = await (await request())
      .post(`/api/guilds/${guildSlug}/requests`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ type: 'LOOKING_FOR_ITEM', title: 'Empréstimo de Wing' })
    expect(nonMember.status).toBe(403)

    const created = await (await request())
      .post(`/api/guilds/${guildSlug}/requests`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ type: 'LOOKING_FOR_ITEM', title: 'Empréstimo de Wing', description: 'Preciso para o evento.' })
    expect(created.status).toBe(201)
    expect(created.body.disclaimer).toBe('Blood Moon não garante devolução de empréstimos entre players.')
    requestId = created.body.id

    const otherType = await (await request())
      .post(`/api/guilds/${guildSlug}/requests`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ type: 'ZEN', title: 'Doação de Zen' })
    expect(otherType.status).toBe(201)
    expect(otherType.body.disclaimer).toBeNull()

    const updated = await (await request())
      .patch(`/api/guilds/${guildSlug}/requests/${requestId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ description: 'Atualizado.' })
    expect(updated.status).toBe(200)
    expect(updated.body.description).toBe('Atualizado.')

    const cancelled = await (await request())
      .delete(`/api/guilds/${guildSlug}/requests/${requestId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('CANCELLED')
  })

  it('GuildProject CRUD: creation requires LEADER/OFFICER/TREASURER', async () => {
    const asPlainMember = await (await request())
      .post(`/api/guilds/${guildSlug}/projects`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ title: 'Projeto não autorizado' })
    expect(asPlainMember.status).toBe(403)

    const created = await (await request())
      .post(`/api/guilds/${guildSlug}/projects`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ title: 'Reforma do Castle Siege', goal: 'Organizar squads' })
    expect(created.status).toBe(201)
    const projectId = created.body.id

    const updated = await (await request())
      .patch(`/api/guilds/${guildSlug}/projects/${projectId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: 'ACTIVE' })
    expect(updated.status).toBe(200)
    expect(updated.body.status).toBe('ACTIVE')

    const cancelled = await (await request())
      .delete(`/api/guilds/${guildSlug}/projects/${projectId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('CANCELLED')
  })

  it('admin level-config and XP-rule CRUD never touches GuildTreasuryBalance; permission-gated per key', async () => {
    const asPlainAdmin = await (await request())
      .post('/api/admin/guilds/config/levels')
      .set('Authorization', `Bearer ${plainAdminToken}`)
      .send({ level: 2, xpRequired: 1000, title: 'Nível 2' })
    expect(asPlainAdmin.status).toBe(403)

    const level = await (await request())
      .post('/api/admin/guilds/config/levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: 2, xpRequired: 1000, title: 'Nível 2', active: true })
    expect(level.status).toBe(201)

    const before = await (await request()).get(`/api/guilds/${guildSlug}/treasury`)
    const beforeSnapshot = JSON.stringify(before.body.balances.map((b: any) => [b.resourceKey, b.availableAmount, b.reservedAmount]).sort())

    const rule = await (await request())
      .post('/api/admin/guilds/config/xp-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resourceType: 'JEWEL', resourceKey: 'JEWEL_BLESS', amountRequired: 100, guildXpGranted: 50, active: true })
    expect(rule.status).toBe(201)
    expect(rule.body.active).toBe(true)
    const ruleId = rule.body.id

    const after = await (await request()).get(`/api/guilds/${guildSlug}/treasury`)
    const afterSnapshot = JSON.stringify(after.body.balances.map((b: any) => [b.resourceKey, b.availableAmount, b.reservedAmount]).sort())
    expect(afterSnapshot).toBe(beforeSnapshot)

    const removed = await (await request())
      .delete(`/api/admin/guilds/config/xp-rules/${ruleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(removed.status).toBe(200)
  })

  it('admin suspend/restore/disband requires the moderate permission and a reason', async () => {
    const noReason = await (await request())
      .post(`/api/admin/guilds/${guildId}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'SUSPEND' })
    expect(noReason.status).toBe(400)

    const suspend = await (await request())
      .post(`/api/admin/guilds/${guildId}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'SUSPEND', reason: 'Investigação de denúncia.' })
    expect(suspend.status).toBe(201)
    expect(suspend.body.status).toBe('SUSPENDED')

    const restore = await (await request())
      .post(`/api/admin/guilds/${guildId}/actions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'RESTORE', reason: 'Denúncia arquivada.' })
    expect(restore.status).toBe(201)
    expect(restore.body.status).toBe('ACTIVE')
  })
})
