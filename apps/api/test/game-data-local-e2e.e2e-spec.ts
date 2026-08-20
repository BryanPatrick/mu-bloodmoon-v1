import { execSync, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { startDisposableDatabase, stopDisposableDatabase } from './support/disposable-mysql'

// Game Data Platform Phase 1 -- the "minimal end-to-end proof". Drives a
// REAL, locally-running `wrangler dev` process (real workerd + real local
// D1, not the vitest-pool-workers in-process harness) so the wire contract
// between apps/api's GameDataClient (Node crypto HMAC) and the Worker's
// verifier (Web Crypto HMAC) is actually exercised, not just unit-tested in
// isolation on each side. This is END_TO_END_LOCAL_SIMULATION -- there is
// no real Cloudflare account and no real MU SQL Server here, so this can
// never be reported as REAL_CLOUDFLARE_CONNECTION or END_TO_END_REAL_INFRA.
const WORKER_DIR = path.resolve(__dirname, '..', '..', 'game-data-worker')
const WORKER_PORT = 18788
const WORKER_BASE_URL = `http://127.0.0.1:${WORKER_PORT}`
const AGENT_CLIENT_ID = 'e2e-test-agent'
const AGENT_SECRET = 'e2e-agent-secret-not-for-production-use'
const API_READ_SECRET = 'e2e-api-read-secret-not-for-production-use'

const CONTAINER = 'bloodmoon-e2e-game-data-local'

let wranglerProcess: ChildProcess | undefined

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

async function waitForWorkerReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      await fetch(WORKER_BASE_URL)
      return
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`wrangler dev did not become ready within ${timeoutMs}ms: ${String(lastError)}`)
}

beforeAll(async () => {
  // apps/api side (Nest app + real MySQL, same disposable-DB pattern as
  // every other e2e spec in this repo).
  const database = await startDisposableDatabase(CONTAINER)
  process.env.DATABASE_URL = database.databaseUrl
  process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-not-for-production-use'
  process.env.JWT_REFRESH_SECRET ||= 'e2e-test-refresh-secret-not-for-production-use'
  process.env.TWO_FACTOR_ENCRYPTION_KEY ||= 'e2e-test-two-factor-key-at-least-32-characters'
  process.env.TEST_PERSONA_MODE = 'true'
  process.env.TEST_PERSONA_ALLOW_SUPER_ADMIN = 'true'
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', env: process.env, stdio: 'pipe' })

  // Worker side: this test writes its own throwaway local secrets rather
  // than depending on a developer's own .dev.vars -- self-contained from a
  // clean checkout, as long as apps/game-data-worker's devDependencies
  // (wrangler) are installed.
  writeFileSync(
    path.join(WORKER_DIR, '.dev.vars'),
    `AGENT_SECRETS_JSON={"${AGENT_CLIENT_ID}":"${AGENT_SECRET}"}\nAPI_READ_SECRETS_JSON={"apps-api":"${API_READ_SECRET}"}\n`
  )
  execSync('npx wrangler d1 migrations apply bloodmoon-game-data --local', { cwd: WORKER_DIR, stdio: 'pipe' })

  wranglerProcess = spawn(`npx wrangler dev --port ${WORKER_PORT} --local`, {
    cwd: WORKER_DIR,
    shell: true,
    stdio: 'pipe'
  })
  await waitForWorkerReady(60_000)
}, 180_000)

afterAll(async () => {
  if (wranglerProcess?.pid) {
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${wranglerProcess.pid} /T /F`, { stdio: 'ignore' })
      } catch {
        // best-effort -- the process may have already exited
      }
    } else {
      wranglerProcess.kill('SIGTERM')
    }
  }
  stopDisposableDatabase(CONTAINER)
})

jest.setTimeout(60_000)

describe('Game Data Platform Phase 1 -- minimal local end-to-end proof', () => {
  let app: import('@nestjs/common').INestApplication
  let httpServer: import('http').Server

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing')
    const { AppModule } = await import('../src/app.module')
    const { SafeExceptionFilter } = await import('../src/common/safe-exception.filter')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalFilters(app.get(SafeExceptionFilter))
    await app.init()
    httpServer = app.getHttpServer()
  }, 60_000)

  afterAll(async () => app?.close())

  const request = () => import('supertest').then((m) => m.default(httpServer))

  const superAdminToken = async () => {
    const activation = await (await request()).post('/api/test-personas/activate').send({ persona: 'SUPER_ADMIN' })
    expect(activation.status).toBe(201)
    return activation.body.accessToken as string
  }

  it('degrades to UNKNOWN, not a 500, when the platform is not configured', async () => {
    delete process.env.GAME_DATA_WORKER_URL
    delete process.env.GAME_DATA_API_READ_SECRET
    const token = await superAdminToken()

    const res = await (await request()).get('/api/admin/game-data/status').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ bridgeStatus: 'UNKNOWN', lastHeartbeatAt: null })
  })

  it('reads a real heartbeat through the whole chain: signed Agent write -> real local Worker -> real local D1 -> GameDataClient -> the diagnostic endpoint', async () => {
    // The Agent side of the chain, standing in for BloodMoon.GameBridgeAgent
    // (proven separately, in .NET, against a fake DB reader).
    const heartbeatBody = JSON.stringify({
      agentId: AGENT_CLIENT_ID,
      serverId: 'bloodmoon-s6',
      bufferState: 'NORMAL',
      bufferDepth: 0,
      lastEventAt: null
    })
    const heartbeatHeaders = await signRequest(AGENT_CLIENT_ID, AGENT_SECRET, 'POST', '/ingest/heartbeat', heartbeatBody)
    const ingestRes = await fetch(`${WORKER_BASE_URL}/ingest/heartbeat`, {
      method: 'POST',
      headers: heartbeatHeaders,
      body: heartbeatBody
    })
    expect(ingestRes.status).toBe(200)

    // apps/api's side: point GameDataClient at the real local Worker and
    // exercise the real diagnostic endpoint end to end.
    process.env.GAME_DATA_WORKER_URL = WORKER_BASE_URL
    process.env.GAME_DATA_API_READ_SECRET = API_READ_SECRET
    const token = await superAdminToken()

    const statusRes = await (await request()).get('/api/admin/game-data/status').set('Authorization', `Bearer ${token}`)

    expect(statusRes.status).toBe(200)
    expect(statusRes.body.bridgeStatus).toBe('HEALTHY')
    expect(typeof statusRes.body.lastHeartbeatAt).toBe('string')

    // Never leaks Worker URL, secrets or SQL details -- only these two keys.
    expect(Object.keys(statusRes.body).sort()).toEqual(['bridgeStatus', 'lastHeartbeatAt'])
  })

  it('an ADMIN token without the delegated permission is refused, not silently allowed', async () => {
    const activation = await (await request()).post('/api/test-personas/activate').send({ persona: 'ADMIN' })
    expect(activation.status).toBe(201)
    const token = activation.body.accessToken as string

    const res = await (await request()).get('/api/admin/game-data/status').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })
})
