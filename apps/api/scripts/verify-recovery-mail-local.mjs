#!/usr/bin/env node
// Local end-to-end proof of the password-recovery mail path over a REAL SMTP conversation.
//
// What it proves (Phase 17R, 2026-09-21):
//   * the real MailTransportService (not the NODE_ENV=test bypass, not a mock) opens an implicit-TLS
//     SMTP session (port 465, TLS >= 1.2, certificate verification ON), authenticates, and delivers;
//   * the delivered message goes to the requested address only, carries a reset link built from
//     WEB_PUBLIC_URL, and the link's token works exactly once (reuse -> TOKEN_USED, expired ->
//     TOKEN_EXPIRED, an older token is invalidated by a newer request);
//   * an unknown address yields the same generic response and sends nothing (anti-enumeration);
//   * the old password stops working, the new one works, and the old access token is revoked;
//   * concurrent resets with one token succeed at most once (single-use under a race).
//
// What it does NOT prove: delivery to a real external mailbox (SPF/DKIM/DMARC, spam folder,
// provider behaviour). For that, run the same flow with the real SMTP_* deployment values against a
// mailbox you control -- see docs/operations/open-beta-password-recovery-validation.md.
//
// Safety: a local TLS server on 127.0.0.1:465 receives the mail; a throw-away self-signed certificate
// is generated in the OS temp folder (needs `openssl`) and trusted ONLY for the spawned API process via
// NODE_EXTRA_CA_CERTS. The API runs on a random local port against the DATABASE_URL in the environment
// (use the disposable local database, never a production one). Reset tokens are held in memory and are
// never printed. Exit code 0 only if every check passes.
//
//   node scripts/verify-recovery-mail-local.mjs      (from apps/api, after `npm run build`)
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tls from 'node:tls'
import net from 'node:net'
import { PrismaClient } from '@prisma/client'

const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(here, '..')
const SMTP_USER = 'sink-user@example.invalid'
const SMTP_PASS = `sink-${Math.random().toString(36).slice(2)}-pass`
const WEB_URL = 'http://localhost:3999'
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

function findOpenssl() {
  const candidates = [process.env.OPENSSL_BIN, 'openssl', 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', 'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe'].filter(Boolean)
  for (const bin of candidates) {
    try { execFileSync(bin, ['version'], { stdio: 'pipe' }); return bin } catch { /* try next */ }
  }
  throw new Error('openssl not found: set OPENSSL_BIN to an openssl executable')
}

function makeCertificate(dir) {
  const bin = findOpenssl()
  execFileSync(bin, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], { stdio: 'pipe' })
  return { key: readFileSync(join(dir, 'key.pem')), cert: readFileSync(join(dir, 'cert.pem')), certPath: join(dir, 'cert.pem') }
}

// minimal implicit-TLS ESMTP receiver: EHLO, AUTH PLAIN/LOGIN, MAIL, RCPT, DATA, QUIT
function startSink({ key, cert }) {
  const messages = []
  const server = tls.createServer({ key, cert, minVersion: 'TLSv1.2' }, (socket) => {
    socket.setEncoding('utf8')
    let buffer = ''
    let inData = false
    let auth = null
    let authed = false
    let from = ''
    let to = []
    const send = (line) => socket.write(`${line}\r\n`)
    const b64 = (value) => Buffer.from(value, 'base64').toString('utf8')
    const finishAuth = (user, pass) => {
      authed = user === SMTP_USER && pass === SMTP_PASS
      send(authed ? '235 2.7.0 authenticated' : '535 5.7.8 authentication failed')
    }
    send('220 sink.local ESMTP')
    socket.on('error', () => {})
    socket.on('data', (chunk) => {
      buffer += chunk
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n')
          if (end === -1) return
          messages.push({ from, to: [...to], raw: buffer.slice(0, end) })
          buffer = buffer.slice(end + 5)
          inData = false
          to = []
          send('250 2.0.0 queued')
          continue
        }
        const eol = buffer.indexOf('\r\n')
        if (eol === -1) return
        const line = buffer.slice(0, eol)
        buffer = buffer.slice(eol + 2)
        if (auth?.stage === 'plain') { const [, user, pass] = b64(line).split('\0'); auth = null; finishAuth(user, pass); continue }
        if (auth?.stage === 'login-user') { auth = { stage: 'login-pass', user: b64(line) }; send('334 UGFzc3dvcmQ6'); continue }
        if (auth?.stage === 'login-pass') { const user = auth.user; auth = null; finishAuth(user, b64(line)); continue }
        const upper = line.toUpperCase()
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) send('250-sink.local\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME')
        else if (upper.startsWith('AUTH PLAIN')) {
          const initial = line.slice(10).trim()
          if (initial) { const [, user, pass] = b64(initial).split('\0'); finishAuth(user, pass) } else { auth = { stage: 'plain' }; send('334 ') }
        } else if (upper.startsWith('AUTH LOGIN')) { auth = { stage: 'login-user' }; send('334 VXNlcm5hbWU6') }
        else if (upper.startsWith('MAIL FROM')) { if (!authed) send('530 5.7.0 authentication required'); else { from = line.slice(10); send('250 2.1.0 ok') } }
        else if (upper.startsWith('RCPT TO')) { to.push(line.slice(8)); send('250 2.1.5 ok') }
        else if (upper === 'DATA') { inData = true; send('354 end with <CRLF>.<CRLF>') }
        else if (upper === 'QUIT') { send('221 2.0.0 bye'); socket.end() }
        else if (upper === 'RSET' || upper === 'NOOP') send('250 ok')
        else send('502 5.5.2 not implemented')
      }
    })
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    // the transport insists on port 465 for implicit TLS
    server.listen(465, '127.0.0.1', () => resolve({ server, messages }))
  })
}

function decodeBody(raw) {
  const split = raw.indexOf('\r\n\r\n')
  const head = raw.slice(0, split)
  let body = raw.slice(split + 4)
  if (/content-transfer-encoding:\s*quoted-printable/i.test(head)) body = body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  else if (/content-transfer-encoding:\s*base64/i.test(head)) body = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
  return { head, body }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(fn, what, ms = 15000) {
  const start = Date.now()
  for (;;) {
    const value = await fn()
    if (value) return value
    if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}`)
    await sleep(150)
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (use the disposable local database)')
  if (/mubloodxz|production/i.test(process.env.DATABASE_URL)) throw new Error('refusing to run against a production-looking DATABASE_URL')
  if (!existsSync(join(apiRoot, 'dist', 'apps', 'api', 'src', 'main.js'))) throw new Error('dist/ is missing: run `npm run build` in apps/api first')

  const dir = mkdtempSync(join(tmpdir(), 'bm-recovery-mail-'))
  let api = null
  let sink = null
  const prisma = new PrismaClient()
  try {
    const certificate = makeCertificate(dir)
    sink = await startSink(certificate)
    const port = await new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })
    const base = `http://127.0.0.1:${port}/api`
    const env = {
      ...process.env,
      NODE_ENV: 'test', // only enables AUTH_CAPTCHA_TEST_BYPASS; the MAIL bypass stays OFF so the real transport runs
      AUTH_CAPTCHA_TEST_BYPASS: '1',
      API_PORT: String(port),
      WEB_PUBLIC_URL: WEB_URL,
      JWT_ACCESS_SECRET: 'local-recovery-proof-access-secret',
      JWT_REFRESH_SECRET: 'local-recovery-proof-refresh-secret',
      TWO_FACTOR_ENCRYPTION_KEY: 'local-recovery-proof-two-factor-key-32chars',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_REQUIRE_TLS: 'false',
      SMTP_USER,
      SMTP_PASSWORD: SMTP_PASS,
      SMTP_FROM_EMAIL: 'no-reply@example.invalid',
      SMTP_FROM_NAME: 'BloodMoon',
      NODE_EXTRA_CA_CERTS: certificate.certPath,
      AUTH_PASSWORD_RESET_TTL_MINUTES: '30',
      // the reset endpoint shares the recovery policy, so ~25 calls from one IP would trip the default
      // 10-per-15-minutes IP window; raise ONLY the IP window here. The per-address window (3 per 15
      // minutes) stays at its default and is asserted below.
      AUTH_RATE_RECOVERY_IP_LIMIT: '500'
    }
    delete env.AUTH_MAIL_TEST_BYPASS
    api = spawn(process.execPath, ['dist/apps/api/src/main.js'], { cwd: apiRoot, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let apiLog = ''
    api.stdout.on('data', (d) => { apiLog += d })
    api.stderr.on('data', (d) => { apiLog += d })
    await waitFor(async () => { try { return (await fetch(`${base}/health`)).ok } catch { return false } }, 'API health', 60000)

    const post = async (path, body, token) => {
      const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
      let json = null
      try { json = await res.json() } catch { /* empty body */ }
      return { status: res.status, body: json }
    }
    const get = async (path, token) => {
      const res = await fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      return { status: res.status }
    }
    const nextMessage = async (count) => { await waitFor(() => sink.messages.length >= count, 'a delivered message'); return decodeBody(sink.messages[count - 1].raw) }
    const tokenFrom = ({ body }) => {
      const match = body.match(/\/redefinir-senha\?token=([0-9a-f]{64})/)
      return match ? match[1] : null
    }

    // ---- account under test
    const stamp = Date.now().toString(36)
    const email = `recovery-proof-${stamp}@example.invalid`
    const username = `rp_${stamp.slice(-8)}`
    const oldPassword = `old-pass-${stamp}`
    const account = { name: 'Recovery Proof', username, password: oldPassword, personalId: `${String(Date.now()).slice(-8)}901`, email }
    const registered = await post('/auth/register', account)
    check('test account registered', registered.status === 201, `status ${registered.status}`)
    const login1 = await post('/auth/login', { username, password: oldPassword })
    const oldAccessToken = login1.body?.accessToken
    check('login with the original password works', login1.status === 201 && !!oldAccessToken)
    check('old access token is accepted before recovery', (await get('/account/marketplace/orders', oldAccessToken)).status === 200)

    // ---- anti-enumeration: unknown address
    const t0 = Date.now()
    const unknown = await post('/auth/password-recovery/request', { email: `nobody-${stamp}@example.invalid` })
    const unknownMs = Date.now() - t0
    await sleep(800)
    check('unknown address gets the generic 2xx response', unknown.status === 201 && unknown.body?.ok === true, `status ${unknown.status}`)
    check('unknown address sends NO mail', sink.messages.length === 0)

    // ---- known address: real SMTP delivery
    const t1 = Date.now()
    const requested = await post('/auth/password-recovery/request', { email })
    const knownMs = Date.now() - t1
    check('known address gets the same generic 2xx response body', requested.status === 201 && requested.body?.ok === true && JSON.stringify(requested.body) === JSON.stringify(unknown.body))
    const first = await nextMessage(1)
    check('exactly one message reached the SMTP server, to the requested address only', sink.messages.length === 1 && sink.messages[0].to.length === 1 && sink.messages[0].to[0].toLowerCase().includes(email))
    check('message went through an authenticated implicit-TLS session (server saw AUTH before MAIL)', sink.messages[0].from.length > 0)
    const token1 = tokenFrom(first)
    check('message contains a reset link on WEB_PUBLIC_URL with a 64-hex token', !!token1 && first.body.includes(`${WEB_URL}/redefinir-senha?token=`), token1 ? 'token present, not printed' : 'no token found')
    check('message body carries no password or SMTP credential', !first.body.includes(oldPassword) && !first.body.includes(SMTP_PASS))
    console.log(`INFO  response time unknown=${unknownMs}ms known=${knownMs}ms (a large gap is a timing side channel for account enumeration)`)

    // ---- reset: weak password does not consume the token; then success
    const weak = await post('/auth/password-recovery/reset', { token: token1, newPassword: 'short' })
    check('weak password is rejected with PASSWORD_INVALID', weak.status === 400 && weak.body?.code === 'PASSWORD_INVALID')
    const newPassword = `new-pass-${stamp}`
    const reset1 = await post('/auth/password-recovery/reset', { token: token1, newPassword })
    check('reset with the emailed token succeeds', reset1.status === 201 && reset1.body?.ok === true, `status ${reset1.status}`)
    check('old password no longer logs in', (await post('/auth/login', { username, password: oldPassword })).status === 401)
    check('new password logs in', (await post('/auth/login', { username, password: newPassword })).status === 201)
    check('old access token is revoked by the reset', (await get('/account/marketplace/orders', oldAccessToken)).status === 401)
    const reuse = await post('/auth/password-recovery/reset', { token: token1, newPassword: `again-${stamp}` })
    check('reusing the token fails with TOKEN_USED', reuse.status === 400 && reuse.body?.code === 'TOKEN_USED')
    check('the reused token did NOT change the password', (await post('/auth/login', { username, password: newPassword })).status === 201)

    // the recovery policy allows 3 requests per address and 10 per IP per 15 minutes, so each flow below
    // uses its own throw-away account (and the rate-limit check gets its own address on purpose)
    let mailCount = 1
    let accountCounter = 0
    const freshAccount = async (label) => {
      accountCounter += 1
      const addr = `recovery-${label}-${stamp}@example.invalid`
      const user = `rp${label}_${stamp.slice(-6)}`
      const res = await post('/auth/register', { name: `Recovery ${label}`, username: user, password: `pw-${label}-${stamp}`, personalId: `${String(Date.now()).slice(-8)}${String(900 + accountCounter)}`, email: addr })
      if (res.status !== 201) throw new Error(`could not register ${label}: ${res.status}`)
      return { email: addr, username: user }
    }
    const requestAndRead = async (addr) => {
      const res = await post('/auth/password-recovery/request', { email: addr })
      if (res.status !== 201) throw new Error(`recovery request failed: ${res.status}`)
      mailCount += 1
      return tokenFrom(await nextMessage(mailCount))
    }

    // ---- an older token is invalidated by a newer request; expiry
    const flowB = await freshAccount('b')
    const token2 = await requestAndRead(flowB.email)
    const token3 = await requestAndRead(flowB.email)
    check('a newer request invalidates the previous token', (await post('/auth/password-recovery/reset', { token: token2, newPassword: `x-${stamp}-2` })).body?.code === 'TOKEN_USED')
    await prisma.passwordResetToken.updateMany({ where: { account: { username: flowB.username }, consumedAt: null }, data: { expiresAt: new Date(Date.now() - 60_000) } })
    const expired = await post('/auth/password-recovery/reset', { token: token3, newPassword: `x-${stamp}-3` })
    check('an expired token fails with TOKEN_EXPIRED', expired.status === 400 && expired.body?.code === 'TOKEN_EXPIRED')

    // ---- single use under a race
    const flowC = await freshAccount('c')
    const token4 = await requestAndRead(flowC.email)
    const racers = await Promise.all(Array.from({ length: 6 }, (_, i) => post('/auth/password-recovery/reset', { token: token4, newPassword: `race-${stamp}-${i}` })))
    const winners = racers.filter((r) => r.status === 201).length
    check('6 simultaneous resets with one token succeed exactly once', winners === 1, `${winners} succeeded`)

    // ---- per-address rate limit (default policy: 3 per 15 minutes)
    const flowD = await freshAccount('d')
    const statuses = []
    for (let i = 0; i < 4; i += 1) statuses.push((await post('/auth/password-recovery/request', { email: flowD.email })).status)
    check('the 4th recovery request for one address inside the window is rate limited (429)', statuses.slice(0, 3).every((s) => s === 201) && statuses[3] === 429, statuses.join(','))
    await sleep(800)
    check('the rate-limited request sent no extra mail', sink.messages.length === mailCount + 3, `messages=${sink.messages.length}`)

    // ---- forged / malformed tokens
    check('a random 64-hex token is rejected as TOKEN_INVALID', (await post('/auth/password-recovery/reset', { token: 'a'.repeat(64), newPassword: `x-${stamp}-4` })).body?.code === 'TOKEN_INVALID')
    check('an empty token is rejected as TOKEN_INVALID', (await post('/auth/password-recovery/reset', { token: '', newPassword: `x-${stamp}-5` })).body?.code === 'TOKEN_INVALID')

    check('no reset token and no SMTP password appear in the API log', !/[0-9a-f]{64}/.test(apiLog.replace(/[0-9a-f]{64}(?=\.js)/g, '')) && !apiLog.includes(SMTP_PASS))
  } finally {
    await prisma.$disconnect().catch(() => {})
    if (api) { api.kill(); await sleep(300) }
    if (sink) await new Promise((r) => sink.server.close(r))
    rmSync(dir, { recursive: true, force: true })
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  if (failed.length) { console.log(`FAILED: ${failed.map((f) => f.name).join(' | ')}`); process.exitCode = 1 }
}

main().catch((error) => { console.error(`ERROR  ${error.message}`); process.exitCode = 2 })
