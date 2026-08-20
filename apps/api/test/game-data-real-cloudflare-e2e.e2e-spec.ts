import { execSync } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Game Data Platform Phase 2D -- the REAL-infra counterpart to
// game-data-local-e2e.e2e-spec.ts. That spec proves the wire contract
// against a locally-spawned `wrangler dev` (END_TO_END_LOCAL_SIMULATION).
// This one proves the exact same apps/api code (GameDataClient, the real
// /admin/game-data/status controller, real JwtAuthGuard/RolesGuard/
// PermissionsGuard) against the REAL deployed Cloudflare Worker + real D1
// provisioned this phase -- closing the "apps/api leg" of
// END_TO_END_REAL_INFRA.
//
// Real credentials are never hardcoded here: they are read from the same
// gitignored local files the Phase 2D provisioning step wrote
// (D:\MU\.secrets\game-data-agent-local.json /
// game-data-api-read-local.json), identical in spirit to how
// appsettings.Local.json/.env already keep every other real secret out of
// git. This spec is SKIPPED (not failed) when those files are absent --
// e.g. on a clean checkout, or a machine that never ran the Phase 2D
// provisioning step -- so it can never block routine local development.
const AGENT_LOCAL_CONFIG_PATH = 'D:\\MU\\.secrets\\game-data-agent-local.json'
const API_READ_LOCAL_CONFIG_PATH = 'D:\\MU\\.secrets\\game-data-api-read-local.json'

const hasRealConfig = existsSync(AGENT_LOCAL_CONFIG_PATH) && existsSync(API_READ_LOCAL_CONFIG_PATH)
const describeOrSkip = hasRealConfig ? describe : describe.skip

const CONTAINER = 'bloodmoon-e2e-game-data-real'

async function signRequest(clientId: string, secret: string, method: string, requestPath: string, body: string) {
  const timestamp = Date.now().toString()
  const nonce = randomUUID()
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const canonical = [clientId, method, requestPath, '', timestamp, nonce, bodyHash].join('\n')
  const signature = createHmac('sha256', secret).update(canonical).digest('hex')
  return {
    'X-Agent-Id': clientId,
    'X-Agent-Timestamp': timestamp,
    'X-Agent-Nonce': nonce,
    'X-Agent-Signature': signature,
    'content-type': 'application/json'
  }
}

describeOrSkip('Game Data Platform Phase 2D -- real Cloudflare end-to-end proof', () => {
  const agentConfig = hasRealConfig
    ? (JSON.parse(readFileSync(AGENT_LOCAL_CONFIG_PATH, 'utf8')) as { AgentId: string; WorkerBaseUrl: string; HmacSecret: string })
    : null
  const apiReadConfig = hasRealConfig
    ? (JSON.parse(readFileSync(API_READ_LOCAL_CONFIG_PATH, 'utf8')) as { ClientId: string; Secret: string })
    : null

  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    const database = await startDisposableDatabase(CONTAINER)
    process.env.DATABASE_URL = database.databaseUrl
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
    process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
    process.env.TEST_PERSONA_MODE = 'true'
    process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN = 'true'
    execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

    // Point GameDataClient at the REAL deployed Worker -- never a
    // localhost URL, never a throwaway secret, in this spec only.
    process.env.GAME_DATA_WORKER_URL = agentConfig!.WorkerBaseUrl
    process.env.GAME_DATA_API_READ_SECRET = apiReadConfig!.Secret

    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    stopDisposableDatabase(CONTAINER)
  })

  jest.setTimeout(60_000)

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const superAdminToken = async () => {
    const activation = await (await request()).post('/api/test-personas/activate').send({ persona: 'SUPER_ADMIN' })
    expect(activation.status).toBe(201)
    return activation.body.accessToken as string
  }

  it('reads the REAL bridge heartbeat, through the whole real chain: signed real heartbeat -> real deployed Worker -> real D1 -> real GameDataClient -> the real admin diagnostic endpoint', async () => {
    // A fresh real heartbeat, signed with the real Agent HMAC secret,
    // sent to the real deployed Worker -- guarantees the real D1 row is
    // within the HEALTHY freshness window (2 minutes) regardless of when
    // this spec runs relative to any earlier manual probe run.
    const heartbeatBody = JSON.stringify({
      agentId: agentConfig!.AgentId,
      serverId: 'bloodmoon-s6',
      bufferState: 'NORMAL',
      bufferDepth: 0,
      lastEventAt: null
    })
    const heartbeatHeaders = await signRequest(agentConfig!.AgentId, agentConfig!.HmacSecret, 'POST', '/ingest/heartbeat', heartbeatBody)
    const ingestRes = await fetch(`${agentConfig!.WorkerBaseUrl}/ingest/heartbeat`, {
      method: 'POST',
      headers: heartbeatHeaders,
      body: heartbeatBody
    })
    expect(ingestRes.status).toBe(200)

    const token = await superAdminToken()
    const statusRes = await (await request()).get('/api/admin/game-data/status').set('Authorization', `Bearer ${token}`)

    expect(statusRes.status).toBe(200)
    expect(statusRes.body.bridgeStatus).toBe('HEALTHY')
    expect(typeof statusRes.body.lastHeartbeatAt).toBe('string')

    // Never leaks Worker URL, secrets or SQL details -- only these two keys,
    // exactly as the local-simulation spec already asserts.
    expect(Object.keys(statusRes.body).sort()).toEqual(['bridgeStatus', 'lastHeartbeatAt'])
  })
})
