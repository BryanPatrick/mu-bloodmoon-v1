import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// Regression coverage for the real bug: on a refresh of /comunidade while
// logged in, the guest sign-in banner used to flash (because the guest/
// authenticated decision was based on `accessToken`, which is only ever
// populated client-side from localStorage -- never from the SSR-readable
// auth-state cookie). These tests hit the actual built SSR output with a
// crafted `blood-moon-auth-state` cookie, the same one useAuth() reads via
// useCookie(), so they exercise the real server-side code path rather than
// a mock.

const outputEntry = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))
let serverProcess
let baseUrl

const freePort = async () =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })

const waitUntilReady = async () => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Community auth SSR server exited with code ${serverProcess.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl)
      if (response.status === 200) return
    } catch {
      // The local listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Community auth SSR server did not become ready in 30 seconds')
}

before(async () => {
  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  serverProcess = spawn(process.execPath, [outputEntry], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      // Deliberately unreachable: these tests care about the SSR guest-vs-
      // authenticated decision, not a real profile payload. The
      // authenticated case is expected to land on the honest
      // "could not load" retry state, never on the guest banner.
      NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:9/api'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })
  await waitUntilReady()
})

after(async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  serverProcess.kill()
  await Promise.race([
    new Promise((resolve) => serverProcess.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000))
  ])
})

const guestCtaText = 'Entre na sua conta para ver seu perfil'

const authCookie = (overrides = {}) => {
  const payload = {
    user: {
      username: 'ssr-test-user',
      name: 'SSR Test User',
      role: 'player',
      currencies: [],
      permissions: [],
      ...overrides.user
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    ...overrides
  }
  return `blood-moon-auth-state=${encodeURIComponent(JSON.stringify(payload))}`
}

test('guest (no session cookie) renders the guest CTA', async () => {
  const response = await fetch(`${baseUrl}/comunidade`)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.match(html, new RegExp(guestCtaText))
})

test('a valid session cookie never renders the guest CTA, even though the profile fetch itself has no backend to reach', async () => {
  const response = await fetch(`${baseUrl}/comunidade`, {
    headers: { cookie: authCookie() }
  })
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.doesNotMatch(
    html,
    new RegExp(guestCtaText),
    'an authenticated request must never render the guest sign-in banner'
  )
})

test('an expired session cookie is treated as guest, not authenticated', async () => {
  const response = await fetch(`${baseUrl}/comunidade`, {
    headers: { cookie: authCookie({ expiresAt: Date.now() - 1000 }) }
  })
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.match(html, new RegExp(guestCtaText))
})
