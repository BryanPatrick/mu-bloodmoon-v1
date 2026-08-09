import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

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
      throw new Error(`Nuxt route-error-handling server exited with code ${serverProcess.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl)
      if (response.status === 200) return
    } catch {
      // The local listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Nuxt route-error-handling server did not become ready in 30 seconds')
}

before(async () => {
  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  serverProcess = spawn(process.execPath, [outputEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
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

test('an unknown route returns a real HTTP 404 with the branded page and no leaks', async () => {
  const response = await fetch(`${baseUrl}/etapa-19-4-route-that-does-not-exist`, {
    headers: { accept: 'text/html' }
  })
  const html = await response.text()

  assert.equal(response.status, 404)
  assert.match(html, /Pagina nao encontrada/)
  assert.doesNotMatch(html.toLowerCase(), /undefined/)
  assert.doesNotMatch(html.toLowerCase(), /at object\.|at module\./)
})

test('an unknown route stays a real 404 when reloaded with an Accept: application/json header', async () => {
  const response = await fetch(`${baseUrl}/etapa-19-4-route-that-does-not-exist`, {
    headers: { accept: 'application/json' }
  })
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.equal('stack' in body, false, 'production responses must never include a stack trace')
})

test('the roadmap listing still renders after moving it into pages/roadmap/index.vue', async () => {
  const response = await fetch(`${baseUrl}/roadmap`, { headers: { accept: 'text/html' } })
  const html = await response.text()

  assert.equal(response.status, 200)
  assert.match(html, /Buscar iniciativa/)
})

test('an unknown roadmap slug renders the real 404 page instead of falling back to the listing', async () => {
  const response = await fetch(`${baseUrl}/roadmap/etapa-19-4-slug-that-does-not-exist`, {
    headers: { accept: 'text/html' }
  })
  const html = await response.text()

  assert.equal(response.status, 404)
  assert.match(html, /Pagina nao encontrada/)
  assert.doesNotMatch(html, /Buscar iniciativa/)
})
