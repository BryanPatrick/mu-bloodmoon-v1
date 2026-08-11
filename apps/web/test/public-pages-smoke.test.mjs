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
      throw new Error(`Nuxt smoke server exited with code ${serverProcess.exitCode}`)
    }
    try {
      const response = await fetch(baseUrl)
      if (response.status === 200) return
    } catch {
      // The local listener may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Nuxt smoke server did not become ready in 30 seconds')
}

before(async () => {
  const port = await freePort()
  baseUrl = `http://127.0.0.1:${port}`
  serverProcess = spawn(process.execPath, [outputEntry], {
    env: {
      ...process.env,
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

for (const path of [
  '/',
  '/wiki',
  '/gazeta',
  '/roadmap',
  '/downloads',
  '/marketplace',
  '/marketplace?mercado=oficial'
]) {
  test(`renders public page ${path}`, async () => {
    const response = await fetch(`${baseUrl}${path}`)
    const html = await response.text()
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') || '', /text\/html/)
    assert.ok(html.length > 500, `${path} returned unexpectedly short HTML`)
  })
}

test('redirects the legacy store index to the official marketplace context', async () => {
  const response = await fetch(`${baseUrl}/loja`, { redirect: 'manual' })
  assert.equal(response.status, 301)
  assert.equal(response.headers.get('location'), '/marketplace?mercado=oficial')
})

test('returns a real 404 page for an unknown route', async () => {
  const response = await fetch(`${baseUrl}/baseline-route-that-does-not-exist`, {
    headers: { accept: 'text/html' }
  })
  const html = await response.text()
  assert.equal(response.status, 404)
  assert.match(html, /Pagina nao encontrada/)
})
