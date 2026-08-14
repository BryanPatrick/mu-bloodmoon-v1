import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Etapa 14: one coherent end-to-end journey through the real Community
// feature (same routes/services as every other community-*.e2e-spec.ts --
// no parallel/mock system), organized as a single continuous story instead
// of per-feature isolation, plus the explicit error-class coverage the beta
// validation brief asks for (401/403/404/validation/storage-failure/empty
// states). "API unavailable" is intentionally not simulated here: Community
// has no synchronous external dependency (DB + local filesystem only,
// confirmed against every other spec in this suite and the marketplace/
// GameBridge code, which is an async job queue, not an inline call) -- there
// is nothing to fake being "down" without inventing new, unrelated test
// infrastructure (e.g. killing the disposable DB mid-request), which the
// Etapa 14 brief explicitly asks us not to do beyond what's needed to make
// tests pass. Documented as not applicable, see docs/handoff for the report.
const CONTAINER = 'bloodmoon-e2e-community-journey'
let mediaDir = ''

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  mediaDir = mkdtempSync(join(tmpdir(), 'bloodmoon-e2e-journey-'))

  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.COMMUNITY_MEDIA_DIR = mediaDir

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  stopDisposableDatabase(CONTAINER)
  try {
    rmSync(mediaDir, { recursive: true, force: true })
  } catch {
    /* best effort cleanup */
  }
})

jest.setTimeout(30000)

describe('Community end-to-end beta journey (Etapa 14, real data, no mocks, no real players)', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server
  let prisma: import('../src/database/prisma.service').PrismaService
  let sharp: typeof import('sharp')

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')
    const { PrismaService } = await import('../src/database/prisma.service')
    sharp = (await import('sharp')).default as unknown as typeof import('sharp')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
    prisma = app.get(PrismaService)

    // Same cooldown relaxation as every other Community E2E spec -- the
    // journey creates several posts/comments back-to-back.
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
  const userA = {
    name: 'E2E Journey Author',
    username: `e2ejrny_a_${uniqueSuffix}`,
    password: 'e2e-test-password-journey-a',
    personalId: '10293847561',
    email: `e2e-journey-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E Journey Other',
    username: `e2ejrny_b_${uniqueSuffix}`,
    password: 'e2e-test-password-journey-b',
    personalId: '19283746550',
    email: `e2e-journey-b-${uniqueSuffix}@example.invalid`
  }
  const userM = {
    name: 'E2E Journey Moderator',
    username: `e2ejrny_m_${uniqueSuffix}`,
    password: 'e2e-test-password-journey-m',
    personalId: '28374655910',
    email: `e2e-journey-m-${uniqueSuffix}@example.invalid`
  }
  const userS = {
    name: 'E2E Journey Super Admin',
    username: `e2ejrny_s_${uniqueSuffix}`,
    password: 'e2e-test-password-journey-s',
    personalId: '37465591028',
    email: `e2e-journey-s-${uniqueSuffix}@example.invalid`
  }

  let tokenA = ''
  let tokenB = ''
  let tokenM = ''
  let tokenS = ''
  let postId = ''
  let commentId = ''
  let bPostId = ''
  let reportId = ''

  it('1. cadastro e login de um usuario de teste real', async () => {
    const anon = await (await request()).get('/api/community/me')
    expect(anon.status).toBe(401) // 401: rota protegida sem nenhum token

    const register = await (await request()).post('/api/auth/register').send(userA)
    expect(register.status).toBe(201)
    expect(register.body.username).toBe(userA.username)

    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    expect(login.status).toBe(201)
    expect(typeof login.body.accessToken).toBe('string')
    tokenA = login.body.accessToken
  })

  it('validation error: rejeita cadastro com username invalido antes de criar qualquer coisa', async () => {
    const res = await (
      await request()
    )
      .post('/api/auth/register')
      .send({ ...userA, username: 'a', email: `alt.${userA.email}` })
    expect(res.status).toBe(400)
  })

  it('2. perfil: GET /community/me logo apos o cadastro mostra o estado vazio real (nao inventado)', async () => {
    const me = await (
      await request()
    )
      .get('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(me.status).toBe(200)
    expect(me.body.username).toBe(userA.username)
    expect(me.body.communityProfile.bio).toBeFalsy()
    expect(me.body.communityProfile.avatarUrl).toBeFalsy()
    expect(me.body.communityProfile.displayName).toBe(userA.name)

    // empty state: nada foi salvo ainda
    const saved = await (
      await request()
    )
      .get('/api/community/feed/authenticated')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ feed: 'saved' })
    expect(saved.status).toBe(200)
    expect(saved.body.data).toEqual([])
  })

  it('3. edicao de perfil: PATCH /community/me persiste em releitura independente', async () => {
    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        displayName: 'E2E Journey Author (editado)',
        bio: 'Bio real definida pelo E2E de jornada.',
        mainCharacterName: 'JornadaDK'
      })
    expect(update.status).toBe(200)
    expect(update.body.bio).toBe('Bio real definida pelo E2E de jornada.')

    const reloaded = await (
      await request()
    )
      .get('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(reloaded.body.communityProfile.displayName).toBe('E2E Journey Author (editado)')
    expect(reloaded.body.communityProfile.bio).toBe('Bio real definida pelo E2E de jornada.')
    expect(reloaded.body.communityProfile.mainCharacterName).toBe('JornadaDK')
  })

  it('validation error: rejeita um profileVisibility invalido', async () => {
    const res = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ profileVisibility: 'NOT_A_REAL_VALUE' })
    expect(res.status).toBe(400)
  })

  it('storage failure (quando simulavel): upload de midia falha com 500 real quando o storage esta indisponivel', async () => {
    // Mesmo mecanismo real (nao mock) do community-media.e2e-spec.ts:
    // aponta COMMUNITY_MEDIA_DIR para dentro de um arquivo (nao diretorio),
    // provocando um ENOTDIR genuino de filesystem.
    const blockerPath = join(mediaDir, 'this-is-a-file-not-a-directory')
    writeFileSync(blockerPath, 'blocking')
    const previous = process.env.COMMUNITY_MEDIA_DIR
    process.env.COMMUNITY_MEDIA_DIR = join(blockerPath, 'nested')
    try {
      const png = await sharp({
        create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } }
      })
        .png()
        .toBuffer()
      const res = await (
        await request()
      )
        .post('/api/community/media')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('file', png, 'storage-fail.png')
      expect(res.status).toBe(500)
    } finally {
      process.env.COMMUNITY_MEDIA_DIR = previous
      unlinkSync(blockerPath)
    }
  })

  it('4. avatar/midia: upload real e associacao ao perfil via a mesma pipeline dos posts', async () => {
    const png = await sharp({
      create: { width: 48, height: 48, channels: 3, background: { r: 5, g: 100, b: 5 } }
    })
      .png()
      .toBuffer()
    const upload = await (
      await request()
    )
      .post('/api/community/media')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', png, 'avatar.png')
    expect(upload.status).toBe(201)
    expect(upload.body.kind).toBe('IMAGE')

    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ avatarUrl: upload.body.url })
    expect(update.status).toBe(200)
    expect(update.body.avatarUrl).toBe(upload.body.url)
  })

  it('5. criar post: valida antes (erro) e depois publica o post real da jornada', async () => {
    const invalid = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: '' })
    expect(invalid.status).toBe(400)

    const create = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'Publicacao real da jornada E2E da Etapa 14.' })
    expect(create.status).toBe(201)
    postId = create.body.id
  })

  it('6. feed: a publicacao aparece no feed publico', async () => {
    const feed = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', pageSize: 20 })
    expect(feed.status).toBe(200)
    const found = feed.body.data.find((item: any) => item.id === postId)
    expect(found).toBeTruthy()
    expect(found.content).toBe('Publicacao real da jornada E2E da Etapa 14.')
  })

  it('7. visualizar post: permalink real; comentarios comecam vazios (empty state)', async () => {
    const res = await (await request()).get(`/api/community/posts/${postId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(postId)
    expect(res.body.comments).toEqual([])
  })

  it('404: retorna 404 para um post inexistente', async () => {
    const res = await (
      await request()
    ).get('/api/community/posts/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('8. comentario: criar e ver refletido na releitura do post', async () => {
    const comment = await (
      await request()
    )
      .post(`/api/community/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Comentario real da jornada E2E.' })
    expect(comment.status).toBe(201)
    commentId = comment.body.id

    const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
    expect(reloaded.body.comments.some((item: any) => item.id === commentId)).toBe(true)
  })

  it('9. reacao: reagir ao post e ver o contador refletido', async () => {
    const react = await (
      await request()
    )
      .post('/api/community/reactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ postId, type: 'LIKE' })
    expect(react.status).toBe(201)
    expect(react.body.active).toBe(true)

    const reloaded = await (await request()).get(`/api/community/posts/${postId}`)
    expect(reloaded.body._count.reactions).toBe(1)
  })

  it('10. save: salvar o post e ve-lo na lista de salvos', async () => {
    const save = await (
      await request()
    )
      .post(`/api/community/posts/${postId}/save`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(save.status).toBe(201)
    expect(save.body.saved).toBe(true)

    const saved = await (
      await request()
    )
      .get('/api/community/feed/authenticated')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ feed: 'saved' })
    expect(saved.body.data.some((item: any) => item.id === postId)).toBe(true)
  })

  it('11. repost: registra um segundo usuario real e reposta o conteudo dele (repostar o proprio post e rejeitado)', async () => {
    const register = await (await request()).post('/api/auth/register').send(userB)
    expect(register.status).toBe(201)
    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userB.username, password: userB.password })
    expect(login.status).toBe(201)
    tokenB = login.body.accessToken

    const cannotRepostOwn = await (
      await request()
    )
      .post(`/api/community/posts/${postId}/repost`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(cannotRepostOwn.status).toBe(400)

    const bPost = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ type: 'TEXT', content: 'Publicacao real de outro usuario da jornada E2E.' })
    expect(bPost.status).toBe(201)
    bPostId = bPost.body.id

    const repost = await (
      await request()
    )
      .post(`/api/community/posts/${bPostId}/repost`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(repost.status).toBe(201)
    expect(repost.body.reposted).toBe(true)
  })

  it('12. perfil de outro usuario: visualizacao publica real do perfil de B', async () => {
    const res = await (await request()).get(`/api/community/profiles/${userB.username}`)
    expect(res.status).toBe(200)
    expect(res.body.communityProfile).toBeTruthy()
    expect(res.body.communityPosts.some((item: any) => item.id === bPostId)).toBe(true)
    expect(res.body.communityProfile.email).toBeUndefined()
  })

  it('13. tentativa de edicao indevida: A nao consegue editar/excluir o post de B (404) nem agir via rota administrativa sem permissao (403)', async () => {
    const edit = await (
      await request()
    )
      .patch(`/api/community/posts/${bPostId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Tentativa indevida.' })
    expect(edit.status).toBe(404)

    const remove = await (
      await request()
    )
      .delete(`/api/community/posts/${bPostId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(remove.status).toBe(404)

    const forceViaAdmin = await (
      await request()
    )
      .post(`/api/admin/community/posts/${bPostId}/actions`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ action: 'HIDE', reason: 'tentativa indevida' })
    expect(forceViaAdmin.status).toBe(403)

    const stillThere = await (await request()).get(`/api/community/posts/${bPostId}`)
    expect(stillThere.status).toBe(200)
    expect(stillThere.body.content).toBe('Publicacao real de outro usuario da jornada E2E.')
  })

  it('14. denuncia: A denuncia o post de B com um motivo real', async () => {
    const report = await (
      await request()
    )
      .post('/api/community/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ postId: bPostId, reason: 'Conteudo real denunciado no E2E de jornada.' })
    expect(report.status).toBe(201)
    expect(report.body.status).toBe('NEW')
    reportId = report.body.id
  })

  it('15. moderacao: um moderador com permissoes reais ve a fila, age no conteudo e resolve a denuncia', async () => {
    const register = await (await request()).post('/api/auth/register').send(userM)
    expect(register.status).toBe(201)
    const accountM = await prisma.account.findUnique({
      where: { username: userM.username },
      select: { id: true }
    })
    await prisma.account.update({ where: { id: accountM!.id }, data: { role: 'ADMIN' } })
    // Mesmo padrao das Etapas 12/13: role: 'ADMIN' sozinho nao concede nada
    // -- overrides explicitos e reais em AccountPermission autorizam o
    // moderador, escopados ao que ele de fato pode fazer.
    await prisma.accountPermission.createMany({
      data: [
        { accountId: accountM!.id, key: 'admin.community.view', granted: true },
        { accountId: accountM!.id, key: 'admin.community.posts.moderate', granted: true },
        { accountId: accountM!.id, key: 'admin.community.reports.moderate', granted: true }
      ]
    })
    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userM.username, password: userM.password })
    expect(login.status).toBe(201)
    tokenM = login.body.accessToken
    // 2FA is mandatory for any non-PLAYER role reaching a role-gated route.
    // Flip it on after login so the already-issued token keeps working.
    await prisma.account.update({ where: { id: accountM!.id }, data: { twoFactorEnabled: true } })

    const queue = await (
      await request()
    )
      .get('/api/admin/community/reports')
      .set('Authorization', `Bearer ${tokenM}`)
      .query({ status: 'NEW' })
    expect(queue.status).toBe(200)
    expect(queue.body.data.some((item: any) => item.id === reportId)).toBe(true)

    const hide = await (
      await request()
    )
      .post(`/api/admin/community/posts/${bPostId}/actions`)
      .set('Authorization', `Bearer ${tokenM}`)
      .send({ action: 'HIDE', reason: 'Conteudo violou diretrizes -- E2E de jornada.' })
    expect(hide.status).toBe(201)
    expect(hide.body.status).toBe('HIDDEN')

    const resolve = await (
      await request()
    )
      .patch(`/api/admin/community/reports/${reportId}`)
      .set('Authorization', `Bearer ${tokenM}`)
      .send({ status: 'RESOLVED', reason: 'Post ocultado -- E2E de jornada.' })
    expect(resolve.status).toBe(200)
    expect(resolve.body.status).toBe('RESOLVED')

    const feedAfter = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', pageSize: 20 })
    expect(feedAfter.body.data.some((item: any) => item.id === bPostId)).toBe(false)
  })

  it('16. administracao: super admin gerencia a policy da Community; o moderador continua fora desse escopo (403)', async () => {
    const registerS = await (await request()).post('/api/auth/register').send(userS)
    expect(registerS.status).toBe(201)
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
    await prisma.account.update({ where: { username: userS.username }, data: { twoFactorEnabled: true } })

    const deniedForModerator = await (
      await request()
    )
      .patch('/api/admin/community/policy')
      .set('Authorization', `Bearer ${tokenM}`)
      .send({ maxPostsPerHour: 1 })
    expect(deniedForModerator.status).toBe(403)

    const dashboard = await (
      await request()
    )
      .get('/api/admin/community/dashboard')
      .set('Authorization', `Bearer ${tokenS}`)
    expect(dashboard.status).toBe(200)

    const policy = await (
      await request()
    )
      .patch('/api/admin/community/policy')
      .set('Authorization', `Bearer ${tokenS}`)
      .send({ maxPostsPerHour: 40 })
    expect(policy.status).toBe(200)
    expect(policy.body.maxPostsPerHour).toBe(40)
  })

  it('17. logout/login: a sessao real e encerrada, o token antigo para de funcionar, um novo login gera um token valido', async () => {
    const logout = await (
      await request()
    )
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(logout.status).toBe(201)

    const withOldToken = await (
      await request()
    )
      .get('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(withOldToken.status).toBe(401)

    const login = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    expect(login.status).toBe(201)
    tokenA = login.body.accessToken
  })

  it('18. persistencia apos nova sessao: perfil, post, comentario, reacao e salvo continuam intactos', async () => {
    const me = await (
      await request()
    )
      .get('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(me.status).toBe(200)
    expect(me.body.communityProfile.displayName).toBe('E2E Journey Author (editado)')
    expect(me.body.communityProfile.bio).toBe('Bio real definida pelo E2E de jornada.')
    expect(typeof me.body.communityProfile.avatarUrl).toBe('string')

    const post = await (await request()).get(`/api/community/posts/${postId}`)
    expect(post.status).toBe(200)
    expect(post.body.content).toBe('Publicacao real da jornada E2E da Etapa 14.')
    expect(post.body.comments.some((item: any) => item.id === commentId)).toBe(true)
    expect(post.body._count.reactions).toBe(1)

    const feed = await (
      await request()
    )
      .get('/api/community/feed')
      .query({ feed: 'recent', pageSize: 20 })
    expect(feed.body.data.some((item: any) => item.id === postId)).toBe(true)

    const saved = await (
      await request()
    )
      .get('/api/community/feed/authenticated')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ feed: 'saved' })
    expect(saved.body.data.some((item: any) => item.id === postId)).toBe(true)
  })
})
