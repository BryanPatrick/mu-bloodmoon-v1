import { execSync } from 'node:child_process'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// PHASE O (2026-08-31): the real GameBridgeVipGateway, configured (unlike
// vip-delivery.e2e-spec.ts, which deliberately leaves the transport
// unconfigured to prove the honest-degradation path). This suite proves
// the submit-then-poll two-phase flow against a mocked Cloudflare Worker
// HTTP layer -- no real network call, no real GameServer write.
const CONTAINER = 'bloodmoon-e2e-vip-gamebridge-delivery'
const originalFetch = global.fetch

type GameCommandState = {
  commandId: string
  status: string
  resultCode: string | null
  membGuid: number | null
}

let fetchHandler: (url: string, init: RequestInit | undefined) => Promise<Response>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeAll(async () => {
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-vip-gamebridge-access-secret'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-vip-gamebridge-refresh-secret'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-vip-gamebridge-two-factor-key-32c'
  process.env.GAME_DATA_WORKER_URL = 'https://game-data-worker.invalid'
  process.env.GAME_COMMAND_PORTAL_SECRET = 'e2e-game-command-secret'

  global.fetch = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    return fetchHandler(url, init)
  }) as typeof fetch

  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })
}, 120000)

afterAll(() => {
  global.fetch = originalFetch
  return stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(30000)

describe('VIP GameBridge delivery -- real gateway, mocked Worker transport', () => {
  let app: import('@nestjs/common').INestApplication
  let prisma: import('../src/database/prisma.service').PrismaService
  let delivery: import('../src/modules/vip/vip-delivery.service').VipDeliveryService

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { PrismaService } = await import('../src/database/prisma.service')
    const { VipDeliveryService } = await import('../src/modules/vip/vip-delivery.service')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
    prisma = app.get(PrismaService)
    delivery = app.get(VipDeliveryService)

    // Same isolation hygiene as vip-delivery.e2e-spec.ts -- see that
    // file's comment for why this is scoped narrowly and local-only.
    await prisma.gameBridgeJob.deleteMany({ where: { operation: 'GRANT_VIP', status: { in: ['PENDING', 'FAILED'] } } })
  }, 60000)

  afterAll(async () => app?.close())

  const suffix = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  async function makeProvisionedAccount(label: string) {
    const s = suffix()
    const account = await prisma.account.create({
      data: {
        username: `${label}_${s}`.slice(0, 20),
        name: `${label} ${s}`,
        email: `${label}-${s}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
    const legacyLogin = `t${s}`.slice(0, 10)
    await prisma.gameAccountIdentity.create({
      data: {
        accountId: account.id,
        legacyLogin,
        provisioningStatus: 'ACTIVE',
        provisioningRequestId: `prov-${s}`,
        provisionedAt: new Date()
      }
    })
    return { ...account, legacyLogin }
  }

  async function makeGrantVipJob(accountId: string, tier: string) {
    return prisma.gameBridgeJob.create({
      data: {
        accountId,
        operation: 'GRANT_VIP',
        idempotencyKey: `vip-bridge:${suffix()}`,
        payload: { accountId, tier, expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }
      }
    })
  }

  test('DELIVERY_VIP: submits once, polls the same command, delivers on SUCCEEDED -- no double submission', async () => {
    const account = await makeProvisionedAccount('gbvipok')
    const job = await makeGrantVipJob(account.id, 'GOLD')

    let postCount = 0
    let submittedCommandId: string | undefined
    let pollCount = 0
    fetchHandler = async (url, init) => {
      if (init?.method === 'POST' && url.includes('/internal/game-commands')) {
        postCount++
        const body = JSON.parse(String(init.body))
        expect(body.commandType).toBe('GRANT_VIP')
        expect(body.payload.targetLevel).toBe(3) // GOLD -> AL3, ADR-0010
        expect(body.legacyLogin).toBe(account.legacyLogin)
        submittedCommandId = body.commandId
        return jsonResponse({}, 200)
      }
      if (url.includes(`/internal/game-commands/${submittedCommandId}`)) {
        pollCount++
        const status: GameCommandState = pollCount === 1
          ? { commandId: submittedCommandId!, status: 'CLAIMED', resultCode: null, membGuid: null }
          : { commandId: submittedCommandId!, status: 'SUCCEEDED', resultCode: 'SUCCEEDED', membGuid: null }
        return jsonResponse(status, 200)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    }

    // Tick 1: submits, no poll yet (first phase never polls its own submission).
    const tick1 = await delivery.runOnce()
    expect(tick1.retried).toBe(1)
    expect(postCount).toBe(1)
    const afterTick1 = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(afterTick1.status).toBe('PENDING')
    expect((afterTick1.payload as { gameCommandId?: string }).gameCommandId).toBe(submittedCommandId)

    // Force past backoff so tick 2 runs immediately.
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date() } })

    // Tick 2: polls, still CLAIMED -- retries again, same commandId, no new POST.
    const tick2 = await delivery.runOnce()
    expect(tick2.retried).toBe(1)
    expect(postCount).toBe(1) // still just one submission
    expect(pollCount).toBe(1)

    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date() } })

    // Tick 3: polls, now SUCCEEDED -- delivered, job COMPLETED.
    const tick3 = await delivery.runOnce()
    expect(tick3.delivered).toBe(1)
    expect(postCount).toBe(1) // never resubmitted

    const final = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(final.status).toBe('COMPLETED')
  })

  test('DELIVERY_RETRY: a terminal FAILED_FINAL command clears gameCommandId so the next attempt submits fresh (real bug fixed this phase)', async () => {
    const account = await makeProvisionedAccount('gbvipfail')
    const job = await makeGrantVipJob(account.id, 'BRONZE')

    let postCount = 0
    const submittedIds: string[] = []
    fetchHandler = async (url, init) => {
      if (init?.method === 'POST' && url.includes('/internal/game-commands')) {
        postCount++
        const body = JSON.parse(String(init.body))
        submittedIds.push(body.commandId)
        return jsonResponse({}, 200)
      }
      const polledId = submittedIds.find((id) => url.includes(`/internal/game-commands/${id}`))
      if (polledId) {
        return jsonResponse({ commandId: polledId, status: 'FAILED_FINAL', resultCode: 'MU_TRANSACTION_FAILED', membGuid: null }, 200)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    }

    // Tick 1: submits command A.
    await delivery.runOnce()
    expect(postCount).toBe(1)
    const afterSubmit = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect((afterSubmit.payload as { gameCommandId?: string }).gameCommandId).toBe(submittedIds[0])
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date() } })

    // Tick 2: polls command A -> FAILED_FINAL. Without the fix, gameCommandId
    // would stay stuck on the dead command A forever; with the fix, it's
    // cleared so tick 3 submits a brand-new command B.
    const tick2 = await delivery.runOnce()
    expect(tick2.retried).toBe(1)
    const afterFail = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect((afterFail.payload as { gameCommandId?: string }).gameCommandId).toBeUndefined()
    await prisma.gameBridgeJob.update({ where: { id: job.id }, data: { availableAt: new Date() } })

    // Tick 3: submits a genuinely new command (proves the fix -- postCount
    // increments again instead of polling the same dead commandId forever).
    await delivery.runOnce()
    expect(postCount).toBe(2)
    expect(submittedIds[1]).not.toBe(submittedIds[0])
  })

  test('DELIVERY_VIP account not provisioned yet -- retryable, never a false success', async () => {
    const account = await prisma.account.create({
      data: {
        username: `gbvipnoprov_${suffix()}`.slice(0, 20),
        name: 'gbvipnoprov',
        email: `gbvipnoprov-${suffix()}@example.invalid`,
        passwordHash: 'not-a-real-hash',
        personalIdHash: 'not-a-real-hash',
        role: 'PLAYER',
        status: 'ACTIVE'
      }
    })
    const job = await makeGrantVipJob(account.id, 'SILVER')

    fetchHandler = async () => {
      throw new Error('should never call the transport for an unprovisioned account')
    }

    const tick = await delivery.runOnce()
    expect(tick.retried).toBe(1)
    expect(tick.delivered).toBe(0)
    const updated = await prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    expect(updated.error).toBe('GAME_ACCOUNT_NOT_PROVISIONED')
  })
})
