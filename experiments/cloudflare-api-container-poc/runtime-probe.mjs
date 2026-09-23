import { createServer, request as httpRequest } from 'node:http'
import { spawn } from 'node:child_process'
import { access, writeFile } from 'node:fs/promises'

const markerPath = '/tmp/bloodmoon-cf-api02r2-marker'
const controlToken = process.env.CF_POC_CONTROL_TOKEN || ''
const output = []
let childExit = null

const child = spawn('node', ['dist/apps/api/src/main.js'], {
  env: { ...process.env, PORT: '8081' },
  stdio: ['ignore', 'pipe', 'pipe']
})

function capture(chunk, target) {
  const text = chunk.toString()
  output.push(text)
  if (output.length > 400) output.shift()
  target.write(chunk)
}

child.stdout.on('data', (chunk) => capture(chunk, process.stdout))
child.stderr.on('data', (chunk) => capture(chunk, process.stderr))
child.on('exit', (code, signal) => {
  childExit = { code, signal }
})

function authorized(request) {
  return Boolean(controlToken) && request.headers['x-cf-poc-key'] === controlToken
}

async function childStopped() {
  if (childExit) return childExit
  return await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({ code: null, signal: 'TIMEOUT' }), 20_000)
    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      resolve({ code, signal })
    })
  })
}

const server = createServer(async (request, response) => {
  if (request.url?.startsWith('/__cf_poc/')) {
    if (!authorized(request)) {
      response.writeHead(404).end('Not found')
      return
    }

    if (request.method === 'POST' && request.url === '/__cf_poc/fs-write') {
      await writeFile(markerPath, 'ephemeral-shadow-probe', 'utf8')
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"written":true}')
      return
    }

    if (request.method === 'GET' && request.url === '/__cf_poc/fs-check') {
      const exists = await access(markerPath).then(() => true).catch(() => false)
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ exists }))
      return
    }

    if (request.method === 'POST' && request.url === '/__cf_poc/app-sigterm') {
      if (!childExit) child.kill('SIGTERM')
      const exit = await childStopped()
      const logs = output.join('')
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        exit,
        prismaDisconnected: logs.includes('Prisma disconnected cleanly')
      }))
      return
    }

    response.writeHead(404).end('Not found')
    return
  }

  if (childExit) {
    response.writeHead(503, { 'content-type': 'application/json' }).end('{"status":"api-stopped"}')
    return
  }

  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: 8081,
    path: request.url,
    method: request.method,
    headers: request.headers
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers)
    upstreamResponse.pipe(response)
  })
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(503, { 'content-type': 'application/json' })
    response.end('{"status":"starting"}')
  })
  request.pipe(upstream)
})

server.listen(8080, '0.0.0.0')

process.on('SIGTERM', async () => {
  if (!childExit) child.kill('SIGTERM')
  await childStopped()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 25_000).unref()
})
