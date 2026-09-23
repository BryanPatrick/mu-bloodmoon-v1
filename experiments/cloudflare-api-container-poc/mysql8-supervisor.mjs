import { createServer, request as httpRequest } from 'node:http'
import { readdir } from 'node:fs/promises'
import { spawn, spawnSync } from 'node:child_process'

const databaseUrl = 'mysql://root@127.0.0.1:3306/bloodmoon'
const controlToken = process.env.CF_POC_CONTROL_TOKEN || ''
const state = {
  phase: 'mysql-starting',
  mysqlVersion: null,
  tlsAvailable: null,
  migrationCount: 0,
  migrationStatus: 'PENDING',
  apiExit: null,
  apiLog: '',
  error: null
}
let api = null
let mysql = null
let stopping = false

function captureApiOutput(chunk, target) {
  target.write(chunk)
  let text = chunk.toString()
  for (const name of [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'TWO_FACTOR_ENCRYPTION_KEY',
    'BILLING_PII_ENCRYPTION_KEY',
    'SESSION_SECRET',
    'CF_POC_CONTROL_TOKEN'
  ]) {
    const value = process.env[name]
    if (value) text = text.split(value).join('[REDACTED]')
  }
  state.apiLog = (state.apiLog + text).slice(-4000)
}

function authorized(request) {
  return Boolean(controlToken) && request.headers['x-cf-poc-key'] === controlToken
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: databaseUrl },
    ...options
  })
}

async function waitForMysql() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ping = run('mysqladmin', ['--protocol=tcp', '--host=127.0.0.1', '--port=3306', '--user=root', 'ping'])
    if (ping.status === 0) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('MYSQL_START_TIMEOUT')
}

async function bootstrap() {
  mysql = spawn('/usr/local/bin/docker-entrypoint.sh', [
    'mysqld',
    '--bind-address=127.0.0.1',
    '--skip-log-bin',
    '--mysqlx=0'
  ], { env: process.env, stdio: 'inherit' })

  await waitForMysql()
  state.phase = 'migrating'
  state.migrationCount = (await readdir('/app/prisma/migrations', { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).length

  const deploy = run('node', [
    '/app/node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--schema',
    '/app/prisma/schema.prisma'
  ])
  if (deploy.status !== 0) throw new Error(`MIGRATE_DEPLOY_FAILED:${deploy.stderr.slice(-500)}`)

  const status = run('node', [
    '/app/node_modules/prisma/build/index.js',
    'migrate',
    'status',
    '--schema',
    '/app/prisma/schema.prisma'
  ])
  if (status.status !== 0 || !status.stdout.includes('Database schema is up to date')) {
    throw new Error(`MIGRATE_STATUS_FAILED:${status.stderr.slice(-500)}`)
  }
  state.migrationStatus = 'CLEAN'

  const version = run('mysql', [
    '--protocol=tcp', '--host=127.0.0.1', '--port=3306', '--user=root',
    '--batch', '--skip-column-names', '--execute=SELECT VERSION(); SHOW VARIABLES LIKE "tls_version";'
  ])
  if (version.status !== 0) throw new Error(`MYSQL_VERSION_QUERY_FAILED:${version.stderr.slice(-300)}`)
  const lines = version.stdout.trim().split(/\r?\n/)
  state.mysqlVersion = lines[0]?.trim() || null
  state.tlsAvailable = lines.slice(1).join(' ').includes('TLSv') ? 'YES' : 'NO'

  api = spawn('node', ['/app/dist/apps/api/src/main.js'], {
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: '8081' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  api.stdout.on('data', (chunk) => captureApiOutput(chunk, process.stdout))
  api.stderr.on('data', (chunk) => captureApiOutput(chunk, process.stderr))
  api.on('exit', (code, signal) => {
    state.apiExit = { code, signal }
    if (!stopping) state.phase = 'api-failed'
  })
  api.on('error', (error) => {
    state.error = `API_SPAWN_FAILED:${error.message}`
    state.phase = 'api-failed'
  })
  state.phase = 'ready'
}

const server = createServer((request, response) => {
  if (request.url === '/__cf_mysql8_validation') {
    if (!authorized(request)) {
      response.writeHead(404).end('Not found')
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(state))
    return
  }

  if (state.phase !== 'ready' || !api) {
    response.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: state.phase }))
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
    response.end('{"status":"api-starting"}')
  })
  request.pipe(upstream)
})

server.listen(8080, '0.0.0.0')

bootstrap().catch((error) => {
  state.phase = 'failed'
  state.error = String(error instanceof Error ? error.message : error).slice(0, 800)
  console.error(state.error)
})

process.on('SIGTERM', async () => {
  if (stopping) return
  stopping = true
  state.phase = 'stopping'
  if (api) {
    api.kill('SIGTERM')
    await new Promise((resolve) => api.once('exit', resolve))
  }
  run('mysqladmin', ['--protocol=tcp', '--host=127.0.0.1', '--port=3306', '--user=root', 'shutdown'])
  if (mysql) await new Promise((resolve) => mysql.once('exit', resolve))
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 30_000).unref()
})
