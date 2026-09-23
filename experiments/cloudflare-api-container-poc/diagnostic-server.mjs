import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

const sensitiveNames = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'TWO_FACTOR_ENCRYPTION_KEY',
  'BILLING_PII_ENCRYPTION_KEY',
  'SESSION_SECRET'
]

const rawLog = await readFile('/tmp/bloodmoon-api.log', 'utf8').catch(() => '')
let sanitizedLog = rawLog
for (const name of sensitiveNames) {
  const value = process.env[name]
  if (value) sanitizedLog = sanitizedLog.split(value).join('[REDACTED]')
}
sanitizedLog = sanitizedLog.replace(/mysql:\/\/[^\s]+/gi, 'mysql://[REDACTED]')

const body = JSON.stringify({
  diagnostic: true,
  apiExitCode: Number(process.env.BM_API_EXIT_CODE || -1),
  log: sanitizedLog.slice(-16_000)
})

createServer((_request, response) => {
  response.writeHead(503, { 'content-type': 'application/json; charset=utf-8' })
  response.end(body)
}).listen(8080, '0.0.0.0')
