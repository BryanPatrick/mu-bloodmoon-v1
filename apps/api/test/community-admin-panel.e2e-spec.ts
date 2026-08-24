import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other Community E2E specs -- a
// dedicated, disposable MariaDB container, never bloodmoon-mysql, never
// production, and never real player data.
const CONTAINER = 'bloodmoon-e2e-community-admin-panel'

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)

  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('Community admin panel: three-tier RBAC (player / scoped moderator / super admin)', () => {
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

    await prisma.communityPolicy.upsert({
      where: { id: 'default' },
      create: {
        postCooldownSeconds: 0,
        commentCooldownSeconds: 0,
        maxPostsPerHour: 999,
        maxCommentsPerHour: 999
      },
      update: {
        postCooldownSeconds: 0,
        commentCooldownSeconds: 0,
        maxPostsPerHour: 999,
        maxCommentsPerHour: 999
      }
    })
  }, 60000)

  afterAll(async () => {
    await app?.close()
  })

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const uniqueSuffix = Date.now().toString(36)
  const userD = {
    name: 'E2E Admin Player',
    username: `e2eadm_d_${uniqueSuffix}`,
    password: 'e2e-test-password-adm-d',
    personalId: '13579246801',
    email: `e2e-adm-d-${uniqueSuffix}@example.invalid`
  }
  const userM = {
    name: 'E2E Admin Moderator',
    username: `e2eadm_m_${uniqueSuffix}`,
    password: 'e2e-test-password-adm-m',
    personalId: '24681357902',
    email: `e2e-adm-m-${uniqueSuffix}@example.invalid`
  }
  const userS = {
    name: 'E2E Admin Super',
    username: `e2eadm_s_${uniqueSuffix}`,
    password: 'e2e-test-password-adm-s',
    personalId: '97531864203',
    email: `e2e-adm-s-${uniqueSuffix}@example.invalid`
  }
  let tokenD = ''
  let tokenM = ''
  let tokenS = ''
  let postId = ''
  let commentId = ''

  it('registers three accounts; M becomes a scoped moderator (ADMIN role + explicit permission grants, not a blanket role check), S becomes SUPER_ADMIN', async () => {
    const req = await request()
    for (const user of [userD, userM, userS]) {
      const res = await req.post('/api/auth/register').send(user)
      expect(res.status).toBe(201)
    }
    const loginD = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userD.username, password: userD.password })
    tokenD = loginD.body.accessToken

    const accountM = await prisma.account.findUnique({
      where: { username: userM.username },
      select: { id: true }
    })
    await prisma.account.update({ where: { id: accountM!.id }, data: { role: 'ADMIN' } })
    // A real content-moderator scope: can view/moderate posts, comments,
    // reports, and users -- but not manage the achievement/quest/badge
    // catalog, spam policy, admin tasks, or analytics. role: 'ADMIN' alone
    // grants none of this (confirmed in Etapa 12) -- these explicit
    // AccountPermission rows are what actually authorizes the moderator.
    await prisma.accountPermission.createMany({
      data: [
        { accountId: accountM!.id, key: 'admin.community.view', granted: true },
        { accountId: accountM!.id, key: 'admin.community.posts.moderate', granted: true },
        { accountId: accountM!.id, key: 'admin.community.comments.moderate', granted: true },
        { accountId: accountM!.id, key: 'admin.community.reports.moderate', granted: true },
        { accountId: accountM!.id, key: 'admin.community.users.moderate', granted: true }
      ]
    })
    const loginM = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userM.username, password: userM.password })
    expect(loginM.status).toBe(201)
    tokenM = loginM.body.accessToken
    // 2FA is mandatory for any non-PLAYER role reaching a role-gated route
    // (roles.guard.ts). Flip it on *after* login (which doesn't require a
    // real TOTP secret here -- this suite isn't testing 2FA itself) so the
    // already-issued token keeps working for the rest of this file's
    // role-gated requests, which re-check twoFactorEnabled live per request.
    await prisma.account.update({ where: { id: accountM!.id }, data: { twoFactorEnabled: true } })

    await prisma.account.update({
      where: { username: userS.username },
      data: { role: 'SUPER_ADMIN' }
    })
    const loginS = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userS.username, password: userS.password })
    expect(loginS.status).toBe(201)
    tokenS = loginS.body.accessToken
    await prisma.account.update({
      where: { username: userS.username },
      data: { twoFactorEnabled: true }
    })
  })

  describe('PLAYER: acesso negado', () => {
    it('is rejected from the admin panel unauthenticated (401) and authenticated as a plain player (403)', async () => {
      const anon = await (await request()).get('/api/admin/community/dashboard')
      expect(anon.status).toBe(401)

      const asPlayer = await (
        await request()
      )
        .get('/api/admin/community/dashboard')
        .set('Authorization', `Bearer ${tokenD}`)
      expect(asPlayer.status).toBe(403)

      const actionAsPlayer = await (
        await request()
      )
        .post('/api/admin/community/posts/00000000-0000-0000-0000-000000000000/actions')
        .set('Authorization', `Bearer ${tokenD}`)
        .send({ action: 'HIDE', reason: 'tentativa indevida' })
      expect(actionAsPlayer.status).toBe(403)
    })
  })

  it('D publishes a post and comments on it (content for the moderator to act on)', async () => {
    const post = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenD}`)
      .send({ type: 'TEXT', content: 'Post real do E2E de administracao da Community.' })
    expect(post.status).toBe(201)
    postId = post.body.id

    const comment = await (
      await request()
    )
      .post(`/api/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenD}`)
      .send({ content: 'Comentario real do E2E de administracao.' })
    expect(comment.status).toBe(201)
    commentId = comment.body.id
  })

  describe('MODERADOR: somente permissoes correspondentes', () => {
    it('can view posts with real filters, search, and pagination', async () => {
      const filtered = await (
        await request()
      )
        .get('/api/admin/community/posts')
        .set('Authorization', `Bearer ${tokenM}`)
        .query({ status: 'PUBLISHED', page: 1, pageSize: 10, search: 'administracao da Community' })
      expect(filtered.status).toBe(200)
      expect(filtered.body.page).toBe(1)
      expect(typeof filtered.body.total).toBe('number')
      expect(typeof filtered.body.totalPages).toBe('number')
      expect(filtered.body.data.some((item: any) => item.id === postId)).toBe(true)

      const noMatch = await (
        await request()
      )
        .get('/api/admin/community/posts')
        .set('Authorization', `Bearer ${tokenM}`)
        .query({ search: 'string-que-nao-deveria-existir-em-nenhum-post-e2e' })
      expect(noMatch.status).toBe(200)
      expect(noMatch.body.data).toHaveLength(0)
      expect(noMatch.body.total).toBe(0)
    })

    it('can moderate posts, comments, reports, and users (granted permissions)', async () => {
      const hidePost = await (
        await request()
      )
        .post(`/api/admin/community/posts/${postId}/actions`)
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ action: 'HIDE', reason: 'Moderador com permissao real de posts -- E2E.' })
      expect(hidePost.status).toBe(201)
      expect(hidePost.body.status).toBe('HIDDEN')

      const hideComment = await (
        await request()
      )
        .post(`/api/admin/community/comments/${commentId}/actions`)
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ action: 'HIDE', reason: 'Moderador com permissao real de comentarios -- E2E.' })
      expect(hideComment.status).toBe(201)
      expect(hideComment.body.status).toBe('HIDDEN')

      // Reported by M, not D -- D is the post's author, and the backend
      // correctly rejects self-reports ("Você não pode denunciar seu
      // próprio conteúdo."), confirmed by this test tripping over it first.
      const report = await (
        await request()
      )
        .post('/api/community/reports')
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ postId, reason: 'Denuncia real para o moderador tratar -- E2E.' })
      expect(report.status).toBe(201)

      const resolveReport = await (
        await request()
      )
        .patch(`/api/admin/community/reports/${report.body.id}`)
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ status: 'RESOLVED', reason: 'Tratado pelo moderador com permissao real -- E2E.' })
      expect(resolveReport.status).toBe(200)

      const accountD = await prisma.account.findUnique({
        where: { username: userD.username },
        select: { id: true }
      })
      const warn = await (
        await request()
      )
        .post(`/api/admin/community/users/${accountD!.id}/moderation`)
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ type: 'WARNING', reason: 'Moderador com permissao real de usuarios -- E2E.' })
      expect(warn.status).toBe(201)
    })

    it('is rejected from actions outside its granted scope: achievements, policy, tasks, analytics', async () => {
      const achievement = await (
        await request()
      )
        .post('/api/admin/community/achievements')
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ name: 'Nao deveria ser criada', description: 'x', category: 'geral' })
      expect(achievement.status).toBe(403)

      const policy = await (
        await request()
      )
        .patch('/api/admin/community/policy')
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ maxPostsPerHour: 1 })
      expect(policy.status).toBe(403)

      const task = await (
        await request()
      )
        .post('/api/admin/community/tasks')
        .set('Authorization', `Bearer ${tokenM}`)
        .send({ title: 'Nao deveria ser criada', entityType: 'COMMUNITY' })
      expect(task.status).toBe(403)

      const analytics = await (
        await request()
      )
        .get('/api/admin/community/analytics')
        .set('Authorization', `Bearer ${tokenM}`)
      expect(analytics.status).toBe(403)
    })
  })

  describe('AUDITORIA (comentario, alem do post/report ja cobertos na Etapa 12)', () => {
    it('the comment-hide action by the moderator produced a real audit entry', async () => {
      const events = await prisma.auditEvent.findMany({
        where: {
          targetType: 'CommunityComment',
          targetId: commentId,
          action: 'admin.community.comment.hide'
        }
      })
      expect(events).toHaveLength(1)
      expect(events[0]!.actorUsername).toBe(userM.username)
      expect(events[0]!.reason).toBe('Moderador com permissao real de comentarios -- E2E.')
    })
  })

  describe('ADMIN: acoes autorizadas (SUPER_ADMIN, permissao total)', () => {
    let achievementId = ''

    it('can manage the achievement catalog -- and editing an already-active achievement does not silently deactivate it', async () => {
      const create = await (
        await request()
      )
        .post('/api/admin/community/achievements')
        .set('Authorization', `Bearer ${tokenS}`)
        .send({
          name: `Conquista real do E2E ${uniqueSuffix}`,
          description: 'Descricao real.',
          category: 'geral',
          isActive: true
        })
      expect(create.status).toBe(201)
      expect(create.body.isActive).toBe(true)
      achievementId = create.body.id

      // Simulates exactly what the (now-fixed) admin UI sends on edit: the
      // form is pre-filled with the record's real current isActive, not a
      // hardcoded value -- so an edit that doesn't touch activation status
      // must send back the same `true` it read, and the record must stay
      // active. Before the frontend fix this etapa, the UI always sent
      // isActive:false on every achievement save regardless of edit vs
      // create, silently unpublishing it.
      const editKeepingActive = await (
        await request()
      )
        .patch(`/api/admin/community/achievements/${achievementId}`)
        .set('Authorization', `Bearer ${tokenS}`)
        .send({
          name: `Conquista real do E2E ${uniqueSuffix} (corrigida)`,
          description: 'Descricao real.',
          category: 'geral',
          isActive: true
        })
      expect(editKeepingActive.status).toBe(200)
      expect(editKeepingActive.body.isActive).toBe(true)

      // And the field is genuinely settable, not silently ignored either way.
      const editDeactivating = await (
        await request()
      )
        .patch(`/api/admin/community/achievements/${achievementId}`)
        .set('Authorization', `Bearer ${tokenS}`)
        .send({
          name: `Conquista real do E2E ${uniqueSuffix} (corrigida)`,
          description: 'Descricao real.',
          category: 'geral',
          isActive: false
        })
      expect(editDeactivating.status).toBe(200)
      expect(editDeactivating.body.isActive).toBe(false)
    })

    it('can manage the community policy and view analytics -- outside the moderator scope', async () => {
      const policy = await (
        await request()
      )
        .patch('/api/admin/community/policy')
        .set('Authorization', `Bearer ${tokenS}`)
        .send({ maxPostsPerHour: 15 })
      expect(policy.status).toBe(200)
      expect(policy.body.maxPostsPerHour).toBe(15)

      const analytics = await (
        await request()
      )
        .get('/api/admin/community/analytics')
        .set('Authorization', `Bearer ${tokenS}`)
      expect(analytics.status).toBe(200)
    })
  })
})
