import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Same disposable-database pattern as the other Community E2E specs -- a
// dedicated, disposable MariaDB container, never bloodmoon-mysql, never
// production, and never real player data.
const CONTAINER = 'bloodmoon-e2e-community-profile-privacy'

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

describe('Community profile privacy and relationships (real data, no invented follow/friend beyond what exists)', () => {
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

  const uniqueSuffix = Date.now().toString(36)
  const userA = {
    name: 'E2E Privacy Owner',
    username: `e2epriv_a_${uniqueSuffix}`,
    password: 'e2e-test-password-privacy-a',
    personalId: '44455566677',
    email: `e2e-privacy-a-${uniqueSuffix}@example.invalid`
  }
  const userB = {
    name: 'E2E Privacy Viewer',
    username: `e2epriv_b_${uniqueSuffix}`,
    password: 'e2e-test-password-privacy-b',
    personalId: '88899900011',
    email: `e2e-privacy-b-${uniqueSuffix}@example.invalid`
  }
  let tokenA = ''
  let tokenB = ''
  let accountAId = ''

  it('registers and logs in two synthetic accounts', async () => {
    const req = await request()
    for (const user of [userA, userB]) {
      const res = await req.post('/api/auth/register').send(user)
      expect(res.status).toBe(201)
    }
    const loginA = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userA.username, password: userA.password })
    expect(loginA.status).toBe(201)
    tokenA = loginA.body.accessToken
    const loginB = await (
      await request()
    )
      .post('/api/auth/login')
      .send({ username: userB.username, password: userB.password })
    expect(loginB.status).toBe(201)
    tokenB = loginB.body.accessToken

    const meA = await (
      await request()
    )
      .get('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(meA.status).toBe(200)
    accountAId = meA.body.id
  })

  it('PUBLIC (default) profile is visible anonymously and to any authenticated non-follower', async () => {
    const anon = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(anon.status).toBe(200)
    expect(anon.body.username).toBe(userA.username)

    const asB = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asB.status).toBe(200)
  })

  it('does not expose email, moderation-internal profile fields, or admin-only grant fields', async () => {
    const achievement = await prisma.communityAchievement.create({
      data: {
        name: 'Conquista de teste E2E',
        slug: `e2e-achievement-${uniqueSuffix}`,
        description: 'Descricao publica.',
        category: 'geral',
        isActive: true,
        createdBy: 'e2e-seed',
        updatedBy: 'e2e-seed'
      }
    })
    await prisma.communityAchievementGrant.create({
      data: {
        achievementId: achievement.id,
        accountId: accountAId,
        grantedBy: 'admin-internal-id',
        reason: 'Justificativa interna nao publica.'
      }
    })
    const badge = await prisma.communityBadge.create({
      data: {
        name: 'Emblema de teste E2E',
        slug: `e2e-badge-${uniqueSuffix}`,
        description: 'Descricao publica.',
        createdBy: 'e2e-seed',
        updatedBy: 'e2e-seed'
      }
    })
    await prisma.communityBadgeGrant.create({
      data: {
        badgeId: badge.id,
        accountId: accountAId,
        grantedBy: 'admin-internal-id',
        reason: 'Justificativa interna nao publica.'
      }
    })

    const res = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBeUndefined()

    const profile = res.body.communityProfile
    expect(profile.socialSuspendedUntil).toBeUndefined()
    expect(profile.postBlockedUntil).toBeUndefined()
    expect(profile.commentBlockedUntil).toBeUndefined()
    expect(profile.messagesLimitedUntil).toBeUndefined()
    expect(profile.reachLimitedUntil).toBeUndefined()
    expect(profile.warningCount).toBeUndefined()

    expect(res.body.achievementGrants).toHaveLength(1)
    const achievementGrant = res.body.achievementGrants[0]
    expect(achievementGrant.grantedBy).toBeUndefined()
    expect(achievementGrant.reason).toBeUndefined()
    expect(achievementGrant.progressData).toBeUndefined()
    expect(achievementGrant.achievement.createdBy).toBeUndefined()
    expect(achievementGrant.achievement.condition).toBeUndefined()
    expect(achievementGrant.achievement.name).toBe('Conquista de teste E2E')

    expect(res.body.badgeGrants).toHaveLength(1)
    const badgeGrant = res.body.badgeGrants[0]
    expect(badgeGrant.grantedBy).toBeUndefined()
    expect(badgeGrant.reason).toBeUndefined()
    expect(badgeGrant.badge.createdBy).toBeUndefined()
    expect(badgeGrant.badge.name).toBe('Emblema de teste E2E')
  })

  it('rejects setting an invalid profileVisibility (400) -- keeps the enum honest before the tier tests below', async () => {
    const res = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ profileVisibility: 'FRIENDS_ONLY' })
    expect(res.status).toBe(400)
  })

  it('FOLLOWERS visibility: hidden from anonymous and non-followers, visible to followers, always visible to the owner', async () => {
    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ profileVisibility: 'FOLLOWERS' })
    expect(update.status).toBe(200)

    const anon = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(anon.status).toBe(404)

    const asBBeforeFollow = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asBBeforeFollow.status).toBe(404)

    // Owner sees their own FOLLOWERS-restricted profile without following
    // themselves -- a user must never be locked out of their own profile by
    // their own privacy setting.
    const asOwner = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(asOwner.status).toBe(200)

    const follow = await (
      await request()
    )
      .post(`/api/community/profiles/${userA.username}/follow`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(follow.status).toBe(201)

    const asBAfterFollow = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asBAfterFollow.status).toBe(200)
    expect(asBAfterFollow.body.username).toBe(userA.username)
  })

  it('PRIVATE visibility: hidden from everyone including existing followers, still visible to the owner', async () => {
    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ profileVisibility: 'PRIVATE' })
    expect(update.status).toBe(200)

    const anon = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(anon.status).toBe(404)

    // B is still following A from the previous test -- PRIVATE overrides
    // following, unlike FOLLOWERS.
    const asFollowerB = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asFollowerB.status).toBe(404)

    const asOwner = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(asOwner.status).toBe(200)
  })

  it('guildVisibility HIDDEN strips guildName for non-owners but not for the owner', async () => {
    const update = await (
      await request()
    )
      .patch('/api/community/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        profileVisibility: 'PUBLIC',
        guildName: 'Guild Secreta E2E',
        guildVisibility: 'HIDDEN'
      })
    expect(update.status).toBe(200)

    const asB = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asB.status).toBe(200)
    expect(asB.body.communityProfile.guildName).toBeFalsy()

    const asOwner = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(asOwner.body.communityProfile.guildName).toBe('Guild Secreta E2E')
  })

  it("reposts appear on the reposting account's own profile, referencing the original post and author", async () => {
    const post = await (
      await request()
    )
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'TEXT', content: 'Post real de A para ser repostado por B no E2E.' })
    expect(post.status).toBe(201)

    const repost = await (
      await request()
    )
      .post(`/api/community/posts/${post.body.id}/repost`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(repost.status).toBe(201)

    const profileB = await (await request()).get(`/api/community/profiles/${userB.username}`)
    expect(profileB.status).toBe(200)
    const found = profileB.body.reposts.find((item: any) => item.post.id === post.body.id)
    expect(found).toBeTruthy()
    expect(found.post.author.username).toBe(userA.username)
    expect(found.post.content).toBe('Post real de A para ser repostado por B no E2E.')
  })

  it('block hides the profile from the blocked account but not from anonymous visitors', async () => {
    const block = await (
      await request()
    )
      .post(`/api/community/profiles/${userB.username}/block`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(block.status).toBe(201)

    // A blocked B -- B can no longer open A's authenticated profile view...
    const asBlockedB = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(asBlockedB.status).toBe(404)

    // ...but A's profile is PUBLIC, so an anonymous visitor (no relationship
    // to check) is unaffected.
    const anon = await (await request()).get(`/api/community/profiles/${userA.username}`)
    expect(anon.status).toBe(200)

    const relationship = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/relationship`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(relationship.status).toBe(200)
    expect(relationship.body.blockedBy).toBe(true)

    const unblock = await (
      await request()
    )
      .delete(`/api/community/profiles/${userB.username}/block`)
      .set('Authorization', `Bearer ${tokenA}`)
    expect(unblock.status).toBe(200)

    const afterUnblock = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/authenticated`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(afterUnblock.status).toBe(200)
  })

  it('follow/unfollow reflects correctly in the relationship endpoint after each step', async () => {
    // B followed A in the FOLLOWERS-tier test above, but blocking (previous
    // test) correctly removes any existing follow in both directions as a
    // real side effect of block() -- confirmed by reading
    // community.service.ts, not assumed -- so B follows again here fresh.
    const follow = await (
      await request()
    )
      .post(`/api/community/profiles/${userA.username}/follow`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(follow.status).toBe(201)

    const before = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/relationship`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(before.body.following).toBe(true)

    const unfollow = await (
      await request()
    )
      .delete(`/api/community/profiles/${userA.username}/follow`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(unfollow.status).toBe(200)

    const after = await (
      await request()
    )
      .get(`/api/community/profiles/${userA.username}/relationship`)
      .set('Authorization', `Bearer ${tokenB}`)
    expect(after.body.following).toBe(false)
  })
})
