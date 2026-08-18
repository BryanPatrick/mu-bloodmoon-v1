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
  // This file's register()/login() helpers are called well over the default
  // anti-abuse limits (register: 10/hour/IP; login: 20/5min/IP -- see
  // auth-rate-limit.service.ts) once Guild Step 1's profile self-management
  // and Guild Step 2's invite-flow fixtures are added on top of the
  // pre-existing MVP and leadership-transfer fixtures. Same override pattern
  // already used by password-recovery.e2e-spec.ts; scoped to this test
  // process only.
  process.env.AUTH_RATE_REGISTER_IP_LIMIT = '50'
  process.env.AUTH_RATE_REGISTER_SUBJECT_LIMIT = '50'
  process.env.AUTH_RATE_LOGIN_IP_LIMIT = '100'

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
    // 2FA is mandatory for any non-PLAYER role reaching a role-gated route.
    // Flip it on after login so the already-issued tokens keep working.
    await prisma.account.update({ where: { username: admin.username }, data: { twoFactorEnabled: true } })
    await prisma.account.update({ where: { username: plainAdmin.username }, data: { twoFactorEnabled: true } })

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

  // PHASE 0 regression (2026-08-18): promoting a member to LEADER via the
  // generic role-change endpoint used to only update the promoted member's
  // roleKey and guild.leaderMemberId -- it never demoted the previous
  // LEADER, so a guild could end up with two members holding roleKey
  // 'LEADER' at once. assertRole() checks roleKey directly (not
  // leaderMemberId), so the stale ex-leader kept real LEADER-only authority,
  // not just a cosmetic data glitch. Fixed by making the promotion an
  // atomic transfer: any other member with roleKey 'LEADER' is demoted to
  // 'OFFICER' in the same transaction as the promotion. This block uses a
  // separate, isolated guild+members fixture so it cannot interfere with
  // the shared fixture used by the tests above.
  describe('leadership transfer -- single LEADER invariant', () => {
    let transferGuildSlug = ''
    let transferGuildId = ''
    let originalLeader: { username: string, password: string }
    let memberX: { username: string, password: string }
    let memberY: { username: string, password: string }
    let originalLeaderToken = ''
    let memberXToken = ''
    let memberYToken = ''
    let originalLeaderMemberId = ''
    let memberXId = ''
    let memberYId = ''

    const countLeaders = async () =>
      prisma.guildMember.count({ where: { guildId: transferGuildId, roleKey: 'LEADER', removedAt: null } })

    it('sets up an isolated guild with a leader and two ordinary members', async () => {
      originalLeader = await register('TL')
      memberX = await register('TX')
      memberY = await register('TY')

      const leaderCharId = (await createCharacter(originalLeader.username, 'TL')).id
      const memberXCharId = (await createCharacter(memberX.username, 'TX')).id
      const memberYCharId = (await createCharacter(memberY.username, 'TY')).id

      originalLeaderToken = await login(originalLeader.username, originalLeader.password)
      memberXToken = await login(memberX.username, memberX.password)
      memberYToken = await login(memberY.username, memberY.password)

      const created = await (await request())
        .post('/api/admin/guilds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Transfer Fixture ${suffix}`, tag: 'TRF', leaderCharacterId: leaderCharId })
      expect(created.status).toBe(201)
      transferGuildSlug = created.body.slug
      transferGuildId = created.body.id

      const leaderRow = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: leaderCharId } })
      originalLeaderMemberId = leaderRow.id

      const memberXRow = await prisma.guildMember.create({
        data: { guildId: transferGuildId, characterId: memberXCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: memberX.username } })).id, roleKey: 'OFFICER' }
      })
      memberXId = memberXRow.id
      const memberYRow = await prisma.guildMember.create({
        data: { guildId: transferGuildId, characterId: memberYCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: memberY.username } })).id, roleKey: 'MEMBER' }
      })
      memberYId = memberYRow.id

      expect(await countLeaders()).toBe(1)
    })

    it('transfers leadership to Member X: exactly one LEADER before and after, previous leader demoted to OFFICER (not invented)', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${transferGuildSlug}/members/${memberXId}/role`)
        .set('Authorization', `Bearer ${originalLeaderToken}`)
        .send({ roleKey: 'LEADER' })
      expect(result.status).toBe(200)
      expect(result.body.roleKey).toBe('LEADER')

      expect(await countLeaders()).toBe(1)

      const demotedOriginal = await prisma.guildMember.findUniqueOrThrow({ where: { id: originalLeaderMemberId } })
      expect(demotedOriginal.roleKey).toBe('OFFICER')

      const guildRow = await prisma.guild.findUniqueOrThrow({ where: { id: transferGuildId } })
      expect(guildRow.leaderMemberId).toBe(memberXId)
    })

    it('rejects a role change from a member who no longer holds LEADER (the demoted original leader)', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${transferGuildSlug}/members/${memberYId}/role`)
        .set('Authorization', `Bearer ${originalLeaderToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(result.status).toBe(403)
    })

    it('transfers leadership back to the original leader: still exactly one LEADER, Member X demoted to OFFICER', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${transferGuildSlug}/members/${originalLeaderMemberId}/role`)
        .set('Authorization', `Bearer ${memberXToken}`)
        .send({ roleKey: 'LEADER' })
      expect(result.status).toBe(200)

      expect(await countLeaders()).toBe(1)
      const demotedX = await prisma.guildMember.findUniqueOrThrow({ where: { id: memberXId } })
      expect(demotedX.roleKey).toBe('OFFICER')
    })

    it('re-promoting the current leader to LEADER is an idempotent no-op, never creating a second LEADER', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${transferGuildSlug}/members/${originalLeaderMemberId}/role`)
        .set('Authorization', `Bearer ${originalLeaderToken}`)
        .send({ roleKey: 'LEADER' })
      expect(result.status).toBe(200)
      expect(result.body.roleKey).toBe('LEADER')
      expect(await countLeaders()).toBe(1)
    })

    it('rejects an unauthorized outsider attempting a leadership transfer', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${transferGuildSlug}/members/${memberYId}/role`)
        .set('Authorization', `Bearer ${memberYToken}`)
        .send({ roleKey: 'LEADER' })
      expect(result.status).toBe(403)
      expect(await countLeaders()).toBe(1)
    })

    it('never ends up with zero or two LEADERs even under two concurrent transfer attempts', async () => {
      const [first, second] = await Promise.all([
        (await request())
          .patch(`/api/guilds/${transferGuildSlug}/members/${memberXId}/role`)
          .set('Authorization', `Bearer ${originalLeaderToken}`)
          .send({ roleKey: 'LEADER' }),
        (await request())
          .patch(`/api/guilds/${transferGuildSlug}/members/${memberYId}/role`)
          .set('Authorization', `Bearer ${originalLeaderToken}`)
          .send({ roleKey: 'LEADER' })
      ])
      // At least one concurrent request may be rejected if the actor's own
      // LEADER status was already transferred away by the other request
      // racing ahead of it -- the invariant under test is never "both
      // succeed", it's "the guild never has zero or two LEADERs afterward".
      expect([first.status, second.status].filter((status) => status === 200).length).toBeGreaterThanOrEqual(1)
      expect(await countLeaders()).toBe(1)
    })
  })

  // GUILD STEP 1 (2026-08-18): connects the frontend to backend
  // self-management that already existed (updateGuild/uploadEmblem/
  // uploadBanner) but had no UI wired to it. This block verifies the
  // backend side of that connection: an authorized member (LEADER or
  // OFFICER, not just LEADER) can edit and upload; an unauthorized member
  // and a non-member cannot; validation rejects out-of-range input; a real
  // image upload actually works end-to-end. Isolated fixture, does not
  // touch the shared guild used by earlier tests in this file.
  describe('profile self-management (Guild Step 1)', () => {
    let mgmtGuildSlug = ''
    let mgmtLeaderToken = ''
    let mgmtOfficerToken = ''
    let mgmtRecruit: { username: string, password: string }
    let mgmtRecruitToken = ''
    let mgmtOutsiderToken = ''

    it('sets up an isolated guild with a LEADER, an OFFICER and a plain RECRUIT member', async () => {
      const mgmtLeader = await register('ML')
      const mgmtOfficer = await register('MO')
      mgmtRecruit = await register('MR')
      const mgmtOutsider = await register('MX')

      const leaderCharId = (await createCharacter(mgmtLeader.username, 'ML')).id
      const officerCharId = (await createCharacter(mgmtOfficer.username, 'MO')).id
      const recruitCharId = (await createCharacter(mgmtRecruit.username, 'MR')).id

      mgmtLeaderToken = await login(mgmtLeader.username, mgmtLeader.password)
      mgmtOfficerToken = await login(mgmtOfficer.username, mgmtOfficer.password)
      mgmtRecruitToken = await login(mgmtRecruit.username, mgmtRecruit.password)
      mgmtOutsiderToken = await login(mgmtOutsider.username, mgmtOutsider.password)

      const created = await (await request())
        .post('/api/admin/guilds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Management Fixture ${suffix}`, tag: 'MGT', leaderCharacterId: leaderCharId })
      expect(created.status).toBe(201)
      mgmtGuildSlug = created.body.slug
      const mgmtGuildId = created.body.id

      await prisma.guildMember.create({
        data: { guildId: mgmtGuildId, characterId: officerCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: mgmtOfficer.username } })).id, roleKey: 'OFFICER' }
      })
      await prisma.guildMember.create({
        data: { guildId: mgmtGuildId, characterId: recruitCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: mgmtRecruit.username } })).id, roleKey: 'RECRUIT' }
      })
    })

    it('rejects profile updates from a non-member (403) and a RECRUIT member (403) -- only LEADER/OFFICER may edit', async () => {
      const asOutsider = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtOutsiderToken}`)
        .send({ description: 'Tentativa de não-membro.' })
      expect(asOutsider.status).toBe(403)

      const asRecruit = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtRecruitToken}`)
        .send({ description: 'Tentativa de recruta comum.' })
      expect(asRecruit.status).toBe(403)
    })

    it('lets an OFFICER (not just LEADER) edit the profile -- matches assertRole([LEADER, OFFICER]) in guilds.service.ts', async () => {
      const result = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtOfficerToken}`)
        .send({ name: `Management Fixture ${suffix}`, tag: 'MGT', description: 'Editado por um OFFICER.', focusTags: ['PVE', 'FARM'] })
      expect(result.status).toBe(200)
      expect(result.body.description).toBe('Editado por um OFFICER.')
      expect(result.body.focusTags.map((entry: any) => entry.tag).sort()).toEqual(['FARM', 'PVE'])
    })

    it('validates field bounds server-side regardless of what the UI sends', async () => {
      const shortName = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        .send({ name: 'ab' })
      expect(shortName.status).toBe(400)

      const shortTag = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        .send({ tag: 'a' })
      expect(shortTag.status).toBe(400)

      const longDescription = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        .send({ description: 'x'.repeat(4001) })
      // description is silently truncated to 4000 chars server-side (not
      // rejected) -- confirm that behavior explicitly rather than assuming.
      expect(longDescription.status).toBe(200)
      expect(longDescription.body.description.length).toBe(4000)
    })

    it('never lets the update endpoint change owner/leader/role/permissions fields -- only the documented profile fields exist on the payload type', async () => {
      const before = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      const attempt = await (await request())
        .patch(`/api/guilds/${mgmtGuildSlug}`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        // leaderMemberId/status/source are not part of GuildUpdatePayload --
        // even if sent, Prisma's typed update() call in updateGuild() only
        // ever reads name/tag/description/recruitment/focusTags off the
        // payload, so extra fields are silently ignored, not applied.
        .send({ description: 'Ainda editando.', leaderMemberId: 'not-a-real-id', status: 'SUSPENDED' })
      expect(attempt.status).toBe(200)
      const after = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      expect(after.leaderMemberId).toBe(before.leaderMemberId)
      expect(after.status).toBe(before.status)
    })

    it('rejects an emblem upload from a non-member (403) and a RECRUIT (403)', async () => {
      const sharp = (await import('sharp')).default
      const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 120, g: 10, b: 10 } } }).png().toBuffer()

      const asOutsider = await (await request())
        .post(`/api/guilds/${mgmtGuildSlug}/emblem`)
        .set('Authorization', `Bearer ${mgmtOutsiderToken}`)
        .attach('file', png, 'emblem.png')
      expect(asOutsider.status).toBe(403)

      const asRecruit = await (await request())
        .post(`/api/guilds/${mgmtGuildSlug}/emblem`)
        .set('Authorization', `Bearer ${mgmtRecruitToken}`)
        .attach('file', png, 'emblem.png')
      expect(asRecruit.status).toBe(403)
    })

    it('lets LEADER upload a real emblem end-to-end: resized to 512x512, re-encoded to webp, guild.emblemUrl updated', async () => {
      const sharp = (await import('sharp')).default
      const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 10, g: 200, b: 10 } } }).png().toBuffer()

      const result = await (await request())
        .post(`/api/guilds/${mgmtGuildSlug}/emblem`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        .attach('file', png, 'emblem.png')
      expect(result.status).toBe(201)
      expect(result.body.width).toBe(512)
      expect(result.body.height).toBe(512)
      expect(result.body.mimeType).toBe('image/webp')
      expect(result.body.url).toMatch(/^\/api\/media\/guild\/[a-f0-9-]+\.webp$/)

      const guildRow = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      expect(guildRow.emblemUrl).toBe(result.body.url)
    })

    it('lets OFFICER upload a real banner end-to-end: resized to 1600x480', async () => {
      const sharp = (await import('sharp')).default
      const png = await sharp({ create: { width: 2000, height: 2000, channels: 3, background: { r: 10, g: 10, b: 200 } } }).png().toBuffer()

      const result = await (await request())
        .post(`/api/guilds/${mgmtGuildSlug}/banner`)
        .set('Authorization', `Bearer ${mgmtOfficerToken}`)
        .attach('file', png, 'banner.png')
      expect(result.status).toBe(201)
      expect(result.body.width).toBe(1600)
      expect(result.body.height).toBe(480)

      const guildRow = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      expect(guildRow.bannerUrl).toBe(result.body.url)
    })

    it('rejects a non-image file with a clear error, leaving the previous emblem untouched', async () => {
      const beforeGuild = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      const result = await (await request())
        .post(`/api/guilds/${mgmtGuildSlug}/emblem`)
        .set('Authorization', `Bearer ${mgmtLeaderToken}`)
        .attach('file', Buffer.from('not an image'), 'notes.txt')
      expect(result.status).toBe(400)
      const afterGuild = await prisma.guild.findUniqueOrThrow({ where: { slug: mgmtGuildSlug } })
      expect(afterGuild.emblemUrl).toBe(beforeGuild.emblemUrl)
    })
  })

  // GUILD STEP 2 (2026-08-18): closes the INVITE_ONLY dead end. join()
  // already covers OPEN (instant) and APPROVAL_REQUIRED (join-request,
  // tested above at "join flow: APPROVAL_REQUIRED..."); OPEN and CLOSED get
  // one light confirmation test each here since neither had dedicated
  // coverage before, but the bulk of this block is the genuinely new
  // GuildInvite model/endpoints.
  describe('recruitment / invite flow (Guild Step 2)', () => {
    let inviteGuildSlug = ''
    let inviteGuildLeaderToken = ''
    let inviteGuildOfficerToken = ''
    let inviteGuildRecruitToken = ''
    let inviteGuildOutsiderToken = ''
    let inviteGuildOfficerCharId = ''
    let target1: { username: string, password: string }
    let target1Token = ''
    let target1CharId = ''
    let target2Token = ''
    let target2CharId = ''
    let target3: { username: string, password: string }
    let target3Token = ''
    let target3CharId = ''

    it('sets up an isolated INVITE_ONLY guild with a LEADER, OFFICER, RECRUIT, and three unaffiliated target characters', async () => {
      const leader = await register('IL')
      const officer = await register('IO')
      const recruit = await register('IR')
      const outsider = await register('IX')
      target1 = await register('T1')
      const target2 = await register('T2')
      target3 = await register('T3')

      const leaderCharId = (await createCharacter(leader.username, 'IL')).id
      const officerCharId = (await createCharacter(officer.username, 'IO')).id
      inviteGuildOfficerCharId = officerCharId
      const recruitCharId = (await createCharacter(recruit.username, 'IR')).id
      target1CharId = (await createCharacter(target1.username, 'T1')).id
      target2CharId = (await createCharacter(target2.username, 'T2')).id
      target3CharId = (await createCharacter(target3.username, 'T3')).id

      inviteGuildLeaderToken = await login(leader.username, leader.password)
      inviteGuildOfficerToken = await login(officer.username, officer.password)
      inviteGuildRecruitToken = await login(recruit.username, recruit.password)
      inviteGuildOutsiderToken = await login(outsider.username, outsider.password)
      target1Token = await login(target1.username, target1.password)
      target2Token = await login(target2.username, target2.password)
      target3Token = await login(target3.username, target3.password)

      const created = await (await request())
        .post('/api/admin/guilds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Invite Fixture ${suffix}`, tag: 'INV', recruitment: 'INVITE_ONLY', leaderCharacterId: leaderCharId })
      expect(created.status).toBe(201)
      expect(created.body.recruitment).toBe('INVITE_ONLY')
      inviteGuildSlug = created.body.slug
      const inviteGuildId = created.body.id

      await prisma.guildMember.create({
        data: { guildId: inviteGuildId, characterId: officerCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: officer.username } })).id, roleKey: 'OFFICER' }
      })
      await prisma.guildMember.create({
        data: { guildId: inviteGuildId, characterId: recruitCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: recruit.username } })).id, roleKey: 'RECRUIT' }
      })
    })

    it('confirms the dead end directly: a player cannot self-join an INVITE_ONLY guild', async () => {
      const attempt = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/join`)
        .set('Authorization', `Bearer ${target1Token}`)
        .send({ characterId: target1CharId })
      expect(attempt.status).toBe(403)
    })

    it('rejects invite creation from a non-member (403), a RECRUIT (403), and requires a real character (400)', async () => {
      const asOutsider = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildOutsiderToken}`)
        .send({ characterId: target1CharId })
      expect(asOutsider.status).toBe(403)

      const asRecruit = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildRecruitToken}`)
        .send({ characterId: target1CharId })
      expect(asRecruit.status).toBe(403)

      const badCharacter = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
        .send({ characterId: 'not-a-real-character-id' })
      expect(badCharacter.status).toBe(400)
    })

    it('invite-candidates search (LEADER/OFFICER only) finds eligible targets and excludes existing members', async () => {
      const asRecruit = await (await request())
        .get(`/api/guilds/${inviteGuildSlug}/invite-candidates`)
        .query({ search: 'T1' })
        .set('Authorization', `Bearer ${inviteGuildRecruitToken}`)
      expect(asRecruit.status).toBe(403)

      // Search matches on character name (e.g. "EGldT1<suffix>", per
      // createCharacter's naming), not account username.
      const byName = await (await request())
        .get(`/api/guilds/${inviteGuildSlug}/invite-candidates`)
        .query({ search: 'T1' })
        .set('Authorization', `Bearer ${inviteGuildOfficerToken}`)
      expect(byName.status).toBe(200)
      expect(byName.body.some((c: any) => c.id === target1CharId)).toBe(true)
    })

    it('LEADER creates a PENDING invite; a duplicate attempt updates the same row instead of creating a second one', async () => {
      const first = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
        .send({ characterId: target1CharId, message: 'Venha para a guilda!' })
      expect(first.status).toBe(201)
      expect(first.body.status).toBe('PENDING')

      const second = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildOfficerToken}`)
        .send({ characterId: target1CharId, message: 'Convite atualizado.' })
      expect(second.status).toBe(201)
      expect(second.body.id).toBe(first.body.id)
      expect(second.body.message).toBe('Convite atualizado.')

      const count = await prisma.guildInvite.count({ where: { guildId: (await prisma.guild.findUniqueOrThrow({ where: { slug: inviteGuildSlug } })).id, characterId: target1CharId } })
      expect(count).toBe(1)
    })

    it('rejects an invite to a character who already belongs to the guild', async () => {
      const attempt = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
        .send({ characterId: inviteGuildOfficerCharId })
      expect(attempt.status).toBe(400)
    })

    it('lists the pending invite for LEADER/OFFICER (guild side) and for the target account (player side)', async () => {
      const asRecruit = await (await request())
        .get(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildRecruitToken}`)
      expect(asRecruit.status).toBe(403)

      const guildSide = await (await request())
        .get(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
      expect(guildSide.status).toBe(200)
      expect(guildSide.body.some((invite: any) => invite.characterId === target1CharId)).toBe(true)

      const playerSide = await (await request())
        .get('/api/guilds/invites/mine')
        .set('Authorization', `Bearer ${target1Token}`)
      expect(playerSide.status).toBe(200)
      expect(playerSide.body.length).toBe(1)
      expect(playerSide.body[0].guild.slug).toBe(inviteGuildSlug)
    })

    it('rejects accept/decline from an account the invite was not sent to', async () => {
      const playerSide = await (await request()).get('/api/guilds/invites/mine').set('Authorization', `Bearer ${target1Token}`)
      const inviteId = playerSide.body[0].id

      const wrongAccept = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${inviteId}/accept`)
        .set('Authorization', `Bearer ${target2Token}`)
      expect(wrongAccept.status).toBe(403)

      const wrongDecline = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${inviteId}/decline`)
        .set('Authorization', `Bearer ${inviteGuildOutsiderToken}`)
      expect(wrongDecline.status).toBe(403)
    })

    it('ACCEPT is transactional: membership is created, invite is marked ACCEPTED, and the character now shows as an active member', async () => {
      const playerSide = await (await request()).get('/api/guilds/invites/mine').set('Authorization', `Bearer ${target1Token}`)
      const inviteId = playerSide.body[0].id

      const accept = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${inviteId}/accept`)
        .set('Authorization', `Bearer ${target1Token}`)
      expect(accept.status).toBe(201)
      expect(accept.body.roleKey).toBe('MEMBER')

      const invite = await prisma.guildInvite.findUniqueOrThrow({ where: { id: inviteId } })
      expect(invite.status).toBe('ACCEPTED')
      const member = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: target1CharId } })
      expect(member.removedAt).toBeNull()
      expect(member.guildId).toBe((await prisma.guild.findUniqueOrThrow({ where: { slug: inviteGuildSlug } })).id)

      // Already decided -- a second accept attempt is rejected, not silently
      // re-applied.
      const again = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${inviteId}/accept`)
        .set('Authorization', `Bearer ${target1Token}`)
      expect(again.status).toBe(400)
    })

    it('DECLINE leaves no membership behind', async () => {
      const invite = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
        .send({ characterId: target2CharId })
      expect(invite.status).toBe(201)

      const decline = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${invite.body.id}/decline`)
        .set('Authorization', `Bearer ${target2Token}`)
      expect(decline.status).toBe(201)

      const row = await prisma.guildInvite.findUniqueOrThrow({ where: { id: invite.body.id } })
      expect(row.status).toBe('DECLINED')
      const member = await prisma.guildMember.findUnique({ where: { characterId: target2CharId } })
      expect(member).toBeNull()
    })

    it('CANCEL (guild side) invalidates a PENDING invite; a cancelled invite can no longer be accepted', async () => {
      const invite = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites`)
        .set('Authorization', `Bearer ${inviteGuildLeaderToken}`)
        .send({ characterId: target3CharId })
      expect(invite.status).toBe(201)

      const asRecruitCancel = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${invite.body.id}/cancel`)
        .set('Authorization', `Bearer ${inviteGuildRecruitToken}`)
      expect(asRecruitCancel.status).toBe(403)

      const cancel = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${invite.body.id}/cancel`)
        .set('Authorization', `Bearer ${inviteGuildOfficerToken}`)
      expect(cancel.status).toBe(201)

      const acceptAfterCancel = await (await request())
        .post(`/api/guilds/${inviteGuildSlug}/invites/${invite.body.id}/accept`)
        .set('Authorization', `Bearer ${target3Token}`)
      expect(acceptAfterCancel.status).toBe(400)
    })

    it('membership integrity + concurrency: the same character invited by two different guilds ends up in exactly one, and the losing accept fails cleanly (not 500)', async () => {
      const guildALeader = await register('CA')
      const guildBLeader = await register('CB')
      const concurrencyTarget = await register('CT')
      const guildALeaderCharId = (await createCharacter(guildALeader.username, 'CA')).id
      const guildBLeaderCharId = (await createCharacter(guildBLeader.username, 'CB')).id
      const concurrencyTargetCharId = (await createCharacter(concurrencyTarget.username, 'CT')).id
      const guildALeaderToken = await login(guildALeader.username, guildALeader.password)
      const guildBLeaderToken = await login(guildBLeader.username, guildBLeader.password)
      const concurrencyTargetToken = await login(concurrencyTarget.username, concurrencyTarget.password)

      const guildA = await (await request()).post('/api/admin/guilds').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Concurrency A ${suffix}`, tag: 'CCA', recruitment: 'INVITE_ONLY', leaderCharacterId: guildALeaderCharId })
      const guildB = await (await request()).post('/api/admin/guilds').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Concurrency B ${suffix}`, tag: 'CCB', recruitment: 'INVITE_ONLY', leaderCharacterId: guildBLeaderCharId })
      expect(guildA.status).toBe(201)
      expect(guildB.status).toBe(201)

      const inviteA = await (await request()).post(`/api/guilds/${guildA.body.slug}/invites`).set('Authorization', `Bearer ${guildALeaderToken}`).send({ characterId: concurrencyTargetCharId })
      const inviteB = await (await request()).post(`/api/guilds/${guildB.body.slug}/invites`).set('Authorization', `Bearer ${guildBLeaderToken}`).send({ characterId: concurrencyTargetCharId })
      expect(inviteA.status).toBe(201)
      expect(inviteB.status).toBe(201)

      const [acceptA, acceptB] = await Promise.all([
        (await request()).post(`/api/guilds/${guildA.body.slug}/invites/${inviteA.body.id}/accept`).set('Authorization', `Bearer ${concurrencyTargetToken}`),
        (await request()).post(`/api/guilds/${guildB.body.slug}/invites/${inviteB.body.id}/accept`).set('Authorization', `Bearer ${concurrencyTargetToken}`)
      ])

      // Never both succeed, never both fail -- and whichever loses gets a
      // clean 400 (BadRequestException from the pre-check or the P2002
      // catch in acceptInvite), never a 500.
      const statuses = [acceptA.status, acceptB.status].sort()
      expect(statuses).toEqual([201, 400])
      expect([acceptA.status, acceptB.status]).not.toContain(500)

      const member = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: concurrencyTargetCharId } })
      expect(member.removedAt).toBeNull()
      expect([guildA.body.id, guildB.body.id]).toContain(member.guildId)

      const memberCount = await prisma.guildMember.count({ where: { characterId: concurrencyTargetCharId, removedAt: null } })
      expect(memberCount).toBe(1)
    })

    it('OPEN flow: join() creates the membership immediately, no request/invite needed', async () => {
      const openLeader = await register('OL')
      const openJoiner = await register('OJ')
      const openLeaderCharId = (await createCharacter(openLeader.username, 'OL')).id
      const openJoinerCharId = (await createCharacter(openJoiner.username, 'OJ')).id
      const openJoinerToken = await login(openJoiner.username, openJoiner.password)

      const openGuild = await (await request()).post('/api/admin/guilds').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Open Fixture ${suffix}`, tag: 'OPN', recruitment: 'OPEN', leaderCharacterId: openLeaderCharId })
      expect(openGuild.status).toBe(201)

      const join = await (await request())
        .post(`/api/guilds/${openGuild.body.slug}/join`)
        .set('Authorization', `Bearer ${openJoinerToken}`)
        .send({ characterId: openJoinerCharId })
      expect(join.status).toBe(201)
      expect(join.body.status).toBe('JOINED')

      const member = await prisma.guildMember.findUniqueOrThrow({ where: { characterId: openJoinerCharId } })
      expect(member.removedAt).toBeNull()
    })

    it('CLOSED flow: neither self-join nor a guild-initiated invite is accepted', async () => {
      const closedLeader = await register('XL')
      const closedLeaderCharId = (await createCharacter(closedLeader.username, 'XL')).id
      const closedLeaderToken = await login(closedLeader.username, closedLeader.password)

      const closedGuild = await (await request()).post('/api/admin/guilds').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Closed Fixture ${suffix}`, tag: 'CLS', recruitment: 'CLOSED', leaderCharacterId: closedLeaderCharId })
      expect(closedGuild.status).toBe(201)

      const join = await (await request())
        .post(`/api/guilds/${closedGuild.body.slug}/join`)
        .set('Authorization', `Bearer ${target1Token}`)
        .send({ characterId: target1CharId })
      expect(join.status).toBe(400)

      const invite = await (await request())
        .post(`/api/guilds/${closedGuild.body.slug}/invites`)
        .set('Authorization', `Bearer ${closedLeaderToken}`)
        .send({ characterId: target2CharId })
      expect(invite.status).toBe(400)
    })
  })

  // GUILD STEP 3 (2026-08-18): member list / role management / kick UI.
  // updateMemberRole is LEADER-only (assertRole(['LEADER']) in
  // guilds.service.ts) -- stricter than kickMember, invites, and profile
  // edits, which all allow LEADER+OFFICER. This block exists specifically to
  // pin that asymmetry down with real requests, plus the two integrity
  // guards added this step: a LEADER cannot demote themselves via this
  // generic endpoint (self-escalation-adjacent -- would orphan the guild),
  // and a role change against a concurrently-removed member is rejected
  // instead of silently landing on a ghost row.
  describe('member management / roles (Guild Step 3)', () => {
    let roleGuildSlug = ''
    let roleGuildId = ''
    let roleLeaderToken = ''
    let roleLeaderMemberId = ''
    let roleOfficerToken = ''
    let roleOfficerMemberId = ''
    let roleRecruitToken = ''
    let roleOutsiderToken = ''
    let m1Id = ''
    let m2Id = ''

    it('sets up an isolated guild with LEADER, OFFICER, RECRUIT, two plain MEMBERs, and an outsider', async () => {
      const leader = await register('RL')
      const officer = await register('RO')
      const recruit = await register('RR')
      const outsider = await register('RX')
      const m1 = await register('M1')
      const m2 = await register('M2')

      const leaderCharId = (await createCharacter(leader.username, 'RL')).id
      const officerCharId = (await createCharacter(officer.username, 'RO')).id
      const recruitCharId = (await createCharacter(recruit.username, 'RR')).id
      const m1CharId = (await createCharacter(m1.username, 'M1')).id
      const m2CharId = (await createCharacter(m2.username, 'M2')).id

      roleLeaderToken = await login(leader.username, leader.password)
      roleOfficerToken = await login(officer.username, officer.password)
      roleRecruitToken = await login(recruit.username, recruit.password)
      roleOutsiderToken = await login(outsider.username, outsider.password)

      const created = await (await request()).post('/api/admin/guilds').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Roles Fixture ${suffix}`, tag: 'ROL', leaderCharacterId: leaderCharId })
      expect(created.status).toBe(201)
      roleGuildSlug = created.body.slug
      roleGuildId = created.body.id
      roleLeaderMemberId = (await prisma.guildMember.findUniqueOrThrow({ where: { characterId: leaderCharId } })).id

      const officerMember = await prisma.guildMember.create({
        data: { guildId: roleGuildId, characterId: officerCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: officer.username } })).id, roleKey: 'OFFICER' }
      })
      roleOfficerMemberId = officerMember.id
      await prisma.guildMember.create({
        data: { guildId: roleGuildId, characterId: recruitCharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: recruit.username } })).id, roleKey: 'RECRUIT' }
      })
      const m1Member = await prisma.guildMember.create({
        data: { guildId: roleGuildId, characterId: m1CharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: m1.username } })).id, roleKey: 'MEMBER' }
      })
      m1Id = m1Member.id
      const m2Member = await prisma.guildMember.create({
        data: { guildId: roleGuildId, characterId: m2CharId, accountId: (await prisma.account.findUniqueOrThrow({ where: { username: m2.username } })).id, roleKey: 'MEMBER' }
      })
      m2Id = m2Member.id
    })

    it('confirms the real permission asymmetry: OFFICER, RECRUIT, and outsider can all not change roles -- only LEADER can', async () => {
      const asOfficer = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m1Id}/role`)
        .set('Authorization', `Bearer ${roleOfficerToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(asOfficer.status).toBe(403)

      const asRecruit = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m1Id}/role`)
        .set('Authorization', `Bearer ${roleRecruitToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(asRecruit.status).toBe(403)

      const asOutsider = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m1Id}/role`)
        .set('Authorization', `Bearer ${roleOutsiderToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(asOutsider.status).toBe(403)
    })

    it('OFFICER cannot alter the LEADER (blocked at the role-change guard itself, not just RBAC)', async () => {
      // OFFICER never even reaches the LEADER-target guard -- assertRole
      // rejects first, same 403 as the generic case above. Kept as its own
      // test because it is the literal case the spec asks about.
      const attempt = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${roleLeaderMemberId}/role`)
        .set('Authorization', `Bearer ${roleOfficerToken}`)
        .send({ roleKey: 'MEMBER' })
      expect(attempt.status).toBe(403)
    })

    it('self-escalation: the LEADER cannot change their own role via this generic endpoint', async () => {
      const attempt = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${roleLeaderMemberId}/role`)
        .set('Authorization', `Bearer ${roleLeaderToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(attempt.status).toBe(400)

      const leaderRow = await prisma.guildMember.findUniqueOrThrow({ where: { id: roleLeaderMemberId } })
      expect(leaderRow.roleKey).toBe('LEADER')
      const guildRow = await prisma.guild.findUniqueOrThrow({ where: { id: roleGuildId } })
      expect(guildRow.leaderMemberId).toBe(roleLeaderMemberId)
    })

    it('valid promotion and demotion by LEADER', async () => {
      const promote = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m1Id}/role`)
        .set('Authorization', `Bearer ${roleLeaderToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(promote.status).toBe(200)
      expect(promote.body.roleKey).toBe('OFFICER')

      const demote = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m1Id}/role`)
        .set('Authorization', `Bearer ${roleLeaderToken}`)
        .send({ roleKey: 'RECRUIT' })
      expect(demote.status).toBe(200)
      expect(demote.body.roleKey).toBe('RECRUIT')

      const row = await prisma.guildMember.findUniqueOrThrow({ where: { id: m1Id } })
      expect(row.roleKey).toBe('RECRUIT')
    })

    it('kick: OFFICER can kick a MEMBER (allowed), RECRUIT and outsider cannot (denied), LEADER cannot be kicked by anyone', async () => {
      const asRecruit = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${m2Id}`)
        .set('Authorization', `Bearer ${roleRecruitToken}`)
        .send({ reason: 'Tentativa não autorizada.' })
      expect(asRecruit.status).toBe(403)

      const asOutsider = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${m2Id}`)
        .set('Authorization', `Bearer ${roleOutsiderToken}`)
        .send({ reason: 'Tentativa não autorizada.' })
      expect(asOutsider.status).toBe(403)

      const leaderKickedByOfficer = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${roleLeaderMemberId}`)
        .set('Authorization', `Bearer ${roleOfficerToken}`)
        .send({ reason: 'Tentativa inválida contra o líder.' })
      expect(leaderKickedByOfficer.status).toBe(400)

      const noReason = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${m2Id}`)
        .set('Authorization', `Bearer ${roleOfficerToken}`)
        .send({})
      expect(noReason.status).toBe(400)

      const validKick = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${m2Id}`)
        .set('Authorization', `Bearer ${roleOfficerToken}`)
        .send({ reason: 'Inatividade prolongada.' })
      expect(validKick.status).toBe(200)

      const row = await prisma.guildMember.findUniqueOrThrow({ where: { id: m2Id } })
      expect(row.removedAt).not.toBeNull()
    })

    it('operations against an already-removed member fail cleanly, not with a corrupted or crashed state', async () => {
      // m2 was kicked in the previous test -- a role change against it now
      // must reject, not silently write a role onto a ghost membership row.
      const roleChangeAfterKick = await (await request())
        .patch(`/api/guilds/${roleGuildSlug}/members/${m2Id}/role`)
        .set('Authorization', `Bearer ${roleLeaderToken}`)
        .send({ roleKey: 'OFFICER' })
      expect(roleChangeAfterKick.status).toBe(404)

      const secondKick = await (await request())
        .delete(`/api/guilds/${roleGuildSlug}/members/${m2Id}`)
        .set('Authorization', `Bearer ${roleLeaderToken}`)
        .send({ reason: 'Segunda tentativa.' })
      // guildAndMember() filters removedAt: null, so an already-removed
      // member is simply not found -- same clean 404, not a 500 or a
      // silently-reapplied kick.
      expect(secondKick.status).toBe(404)
    })

    it('concurrency: two simultaneous role changes on the same member resolve to exactly one valid final value, no crash', async () => {
      const [first, second] = await Promise.all([
        (await request()).patch(`/api/guilds/${roleGuildSlug}/members/${roleOfficerMemberId}/role`).set('Authorization', `Bearer ${roleLeaderToken}`).send({ roleKey: 'TREASURER' }),
        (await request()).patch(`/api/guilds/${roleGuildSlug}/members/${roleOfficerMemberId}/role`).set('Authorization', `Bearer ${roleLeaderToken}`).send({ roleKey: 'MEMBER' })
      ])
      expect([first.status, second.status]).not.toContain(500)
      expect(first.status).toBe(200)
      expect(second.status).toBe(200)

      const row = await prisma.guildMember.findUniqueOrThrow({ where: { id: roleOfficerMemberId } })
      expect(['TREASURER', 'MEMBER']).toContain(row.roleKey)
    })

    it('concurrency: a kick racing a role change against the same member ends in a valid, deterministic state -- never a 500, member ends up removed either way', async () => {
      const targetCharacter = await createCharacter((await register('M3')).username, 'M3')
      const targetMember = await prisma.guildMember.create({
        data: { guildId: roleGuildId, characterId: targetCharacter.id, accountId: targetCharacter.accountId, roleKey: 'MEMBER' }
      })

      const [kick, roleChange] = await Promise.all([
        (await request()).delete(`/api/guilds/${roleGuildSlug}/members/${targetMember.id}`).set('Authorization', `Bearer ${roleLeaderToken}`).send({ reason: 'Removido durante corrida de concorrência.' }),
        (await request()).patch(`/api/guilds/${roleGuildSlug}/members/${targetMember.id}/role`).set('Authorization', `Bearer ${roleLeaderToken}`).send({ roleKey: 'OFFICER' })
      ])

      expect([kick.status, roleChange.status]).not.toContain(500)
      // The kick has no concurrent-removal guard of its own (nothing else
      // can race it into removing the SAME row twice in this scenario), so
      // it always lands. The role change either wins the race and succeeds
      // (200) or loses to the kick and is rejected (404 via the same
      // updateMany+count guard exercised deterministically above) -- both
      // are valid, neither is a crash or a silently corrupted row.
      expect(kick.status).toBe(200)
      expect([200, 404]).toContain(roleChange.status)

      const row = await prisma.guildMember.findUniqueOrThrow({ where: { id: targetMember.id } })
      expect(row.removedAt).not.toBeNull()
    })
  })
})
