// Phase 7F: compiled API acceptance against a disposable localhost DB only.
// The child preloads a fail-closed synthetic Asaas transport; no real key,
// provider call, production DB, or outbound alert destination is used.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const preload = resolve(apiRoot, 'test/support/asaas-compiled-local-mock.cjs')
const artifact = resolve(apiRoot, 'dist/apps/api/src/main.js')
const port = 13319
const base = `http://127.0.0.1:${port}/api`
const dbUrl = process.env.E2E_LOCAL_MYSQL_URL || ''
if (!/^mysql:\/\/[^@]*@(?:127\.0\.0\.1|localhost):13317\/phase7e_db$/.test(dbUrl)) {
  throw new Error('Phase 7F compiled test requires the isolated localhost:13317/phase7e_db URL')
}
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
const token = 'synthetic-phase7f-webhook-token'
const run = randomUUID().slice(0, 8)
let child = null
let gracefulStops = 0
let runtimeEnv = null

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(predicate, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await predicate()
    if (value) return value
    await pause(150)
  }
  throw new Error(`LOCAL_TEST_TIMEOUT: ${label}`)
}
async function get(path) {
  try { return await fetch(`${base}${path}`) } catch { return null }
}
async function post(body, header) {
  return fetch(`${base}/payments/webhooks/asaas`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(header ? { 'asaas-access-token': header } : {}) },
    body: JSON.stringify(body)
  })
}
async function start(enabled, pollMs = 1000) {
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl, NODE_ENV: 'test', API_PORT: String(port),
    ASAAS_ENABLED: 'true', ASAAS_ENVIRONMENT: 'sandbox',
    ASAAS_BASE_URL: 'https://api-sandbox.asaas.com/v3',
    ASAAS_API_KEY: '$aact_hmlg_synthetic_phase7f', ASAAS_WEBHOOK_TOKEN: token,
    ASAAS_WEBHOOK_PROCESSING_ENABLED: String(enabled), ASAAS_WEBHOOK_POLL_MS: String(pollMs),
    ASAAS_FRONTEND_ENABLED: 'false', ASAAS_PAYMENT_CREATION_ENABLED: 'false',
    ASAAS_RECONCILIATION_ENABLED: 'false', ALERT_SWEEP_ENABLED: 'false',
    PAYMENT_RECONCILIATION_ENABLED: 'false', MERCADO_PAGO_PROVIDER_POLL_ENABLED: 'false',
    JWT_ACCESS_SECRET: 'synthetic-phase7f-access', JWT_REFRESH_SECRET: 'synthetic-phase7f-refresh',
    BILLING_PII_KEY_B64: Buffer.alloc(32, 29).toString('base64')
  }
  runtimeEnv = env
  child = spawn(process.execPath, ['--require', preload, artifact], {
    cwd: apiRoot, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  })
  let stopped = false
  child.stdout.on('data', (chunk) => { if (String(chunk).includes('ASAAS_INBOX_STOPPED')) stopped = true })
  child.stderr.on('data', () => {})
  child.localStopped = () => stopped
  child.on('error', () => {})
  await until(async () => (await get('/health'))?.status === 200, 'compiled API start', 30000)
}
async function stop() {
  if (!child) return
  const target = child
  child = null
  if (target.exitCode === null) target.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => target.once('exit', resolve)), pause(5000)])
  if (target.exitCode === null) target.kill('SIGKILL')
  if (target.localStopped()) gracefulStops++
  await until(async () => !(await get('/health')), 'compiled API stop', 5000)
}
async function fixture(kind, accountId, packageId) {
  const paymentId = `pay_local_${run}_${kind}`
  const externalReference = `ref_local_${run}_${kind}`
  const intent = await prisma.rechargeIntent.create({ data: {
    accountId, packageId, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00',
    status: 'PENDING', provider: 'asaas', providerEnvironment: 'sandbox',
    providerCreateState: 'CREATED', correlationId: randomUUID(),
    externalReference, externalOrderId: paymentId, paymentMethod: 'PIX'
  } })
  return { intent, paymentId, body: { id: `evt_${run}_${kind}`, event: 'PAYMENT_RECEIVED', payment: { id: paymentId } } }
}
async function state(eventId) {
  return prisma.paymentWebhookEvent.findFirst({ where: { provider: 'asaas', eventId } })
}
async function credits(intentId) {
  return prisma.walletLedgerEntry.count({ where: { idempotencyKey: `recharge-credit:${intentId}` } })
}

try {
  const account = await prisma.account.create({ data: {
    username: `phase7f_${run}`, name: 'Synthetic QA', email: `phase7f-${run}@example.invalid`,
    passwordHash: 'synthetic-not-a-login', status: 'ACTIVE'
  } })
  const pack = await prisma.rechargePackage.create({ data: {
    key: `phase7f-${run}`, currency: 'WCOIN', amount: 10, bonus: 0, price: '10,00'
  } })
  await prisma.providerCustomer.create({ data: {
    accountId: account.id, provider: 'asaas', environment: 'sandbox',
    externalReference: `bm-account:${account.id}`, providerCustomerId: `cus_${run}`, createState: 'CREATED'
  } })
  const normal = await fixture('normal', account.id, pack.id)
  const restart = await fixture('restart', account.id, pack.id)
  const timeout = await fixture('timeout_once', account.id, pack.id)
  const review = await fixture('review_mismatch', account.id, pack.id)

  await start(false)
  const healthDisabled = (await get('/health'))?.status
  const readyDisabled = (await get('/ready'))?.status
  const disabledStatus = (await post(normal.body, token)).status
  if (healthDisabled !== 200 || readyDisabled !== 200 || disabledStatus !== 503 || await state(normal.body.id))
    throw new Error('LOCAL_TEST_DISABLED_PATH_FAILED')
  await stop()

  await start(true, 1000)
  const health = (await get('/health'))?.status
  const readiness = (await get('/ready'))?.status
  const missing = (await post(normal.body)).status
  const wrong = (await post(normal.body, 'synthetic-wrong')).status
  const valid = (await post(normal.body, token)).status
  const duplicate = (await post(normal.body, token)).status
  if ([health, readiness, missing, wrong, valid, duplicate].join(',') !== '200,200,401,401,200,200')
    throw new Error('LOCAL_TEST_COMPILED_HTTP_STATUS_FAILED')
  await until(async () => (await state(normal.body.id))?.status === 'PROCESSED', 'normal worker')
  if (await credits(normal.intent.id) !== 1) throw new Error('LOCAL_TEST_NORMAL_CREDIT_FAILED')
  const reviewStatus = (await post(review.body, token)).status
  await until(async () => (await state(review.body.id))?.status === 'MANUAL_REVIEW', 'manual review')
  if (reviewStatus !== 200 || await credits(review.intent.id) !== 0)
    throw new Error('LOCAL_TEST_MANUAL_REVIEW_FAILED')
  const timeoutStatus = (await post(timeout.body, token)).status
  await until(async () => (await state(timeout.body.id))?.status === 'RETRY', 'provider timeout retry')
  if (timeoutStatus !== 200 || await credits(timeout.intent.id) !== 0)
    throw new Error('LOCAL_TEST_PROVIDER_TIMEOUT_FAILED')
  await prisma.paymentWebhookEvent.updateMany({ where: { eventId: timeout.body.id }, data: { nextAttemptAt: new Date(0) } })
  await until(async () => (await state(timeout.body.id))?.status === 'PROCESSED', 'timeout recovery')
  if (await credits(timeout.intent.id) !== 1) throw new Error('LOCAL_TEST_RETRY_CREDIT_FAILED')
  await stop()

  await start(true, 300000)
  const restartAck = (await post(restart.body, token)).status
  if (restartAck !== 200 || (await state(restart.body.id))?.status !== 'RECEIVED')
    throw new Error('LOCAL_TEST_PRE_RESTART_FAILED')
  await stop()
  await start(true, 1000)
  await until(async () => (await state(restart.body.id))?.status === 'PROCESSED', 'compiled restart recovery')
  if (await credits(restart.intent.id) !== 1) throw new Error('LOCAL_TEST_RESTART_CREDIT_FAILED')
  await stop()
  const shutdown = spawn(process.execPath, [resolve(apiRoot, 'test/support/asaas-compiled-shutdown.cjs')], {
    cwd: apiRoot, env: { ...runtimeEnv, ASAAS_WEBHOOK_POLL_MS: '300000' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  })
  let shutdownOutput = ''
  shutdown.stdout.on('data', (chunk) => { shutdownOutput += String(chunk) })
  shutdown.stderr.on('data', () => {})
  const shutdownExit = await new Promise((resolve) => shutdown.once('exit', resolve))
  if (shutdownExit !== 0 || !shutdownOutput.includes('COMPILED_WORKER_GRACEFUL_STOP_PASS'))
    throw new Error('LOCAL_TEST_COMPILED_GRACEFUL_SHUTDOWN_FAILED')
  console.log(`COMPILED_LOCAL_PASS health=200 ready=200 disabled=503 missing=401 wrong=401 valid=200 duplicate=200 worker=PASS timeout_retry=PASS manual_review=PASS restart=PASS exactly_once=PASS graceful_close=PASS windows_sigterm_hooks_observed=${gracefulStops}`)
} finally {
  await stop()
  await prisma.$disconnect()
}
