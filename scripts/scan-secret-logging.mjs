#!/usr/bin/env node
// Security hardening Part X/AF -- static scan of apps/api/src for logging
// call sites that risk emitting secret material. Read-only, no mutation
// path, no network access. Does not (and cannot, from this machine) read
// production log files -- there is no SSH/shell to the cPanel host, so
// this is a compile-time/static safeguard rather than a post-hoc leak
// detector; it catches the risky pattern before a log line is ever
// written in the first place.
//
// Heuristic: flags any logger.*/console.* call whose argument text
// mentions a suspicious identifier (password, secret, token, key,
// credential, ciphertext, envelope, authorization, connection string)
// UNLESS that same argument also shows an explicit redaction marker
// (.slice(, '***', 'REDACTED', typeof, .length, safeMessage(, error
// instanceof) -- these are the patterns already used throughout this
// codebase (e.g. auth.service.ts's errorMessage()/safeMessage() helpers)
// to summarize an error without repeating its payload.
//
// Exit code 0 = no findings. Exit code 1 = findings reported (never
// prints the actual secret, only the file:line and the matched call).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const ROOT = join(process.cwd(), 'apps/api/src')
const SUSPICIOUS = [
  'password', 'passwordHash', 'secret', 'token', 'apiKey', 'privateKey',
  'credential', 'ciphertext', 'envelope', 'authorization', 'connectionString',
  'databaseUrl', 'jwtSecret', 'hmac', 'keyRing', 'keyring'
]
const SAFE_MARKERS = [
  '.slice(', "'***'", '"REDACTED"', 'typeof ', '.length', 'safeMessage(',
  'errorMessage(', 'error instanceof', '.code', 'keyVersion', '.status'
]
const LOG_CALL = /\b(logger|console)\.(log|warn|error|debug|verbose)\(/

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      walk(full, files)
    } else if (extname(entry) === '.ts' && !entry.endsWith('.spec.ts')) {
      files.push(full)
    }
  }
  return files
}

const findings = []
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, idx) => {
    if (!LOG_CALL.test(line)) return
    const lower = line.toLowerCase()
    const hitsSuspicious = SUSPICIOUS.some((word) => lower.includes(word.toLowerCase()))
    if (!hitsSuspicious) return
    const looksSafe = SAFE_MARKERS.some((marker) => line.includes(marker))
    if (looksSafe) return
    findings.push({ file: file.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''), line: idx + 1, text: line.trim() })
  })
}

if (findings.length === 0) {
  console.log('LOG_SECRET_SCAN: PASS (0 risky logging call sites found)')
  process.exit(0)
}

console.log(`LOG_SECRET_SCAN: NEEDS_REVIEW (${findings.length} call site(s) reference a suspicious identifier without a recognized redaction marker)`)
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.text}`)
}
console.log('\nThis is a heuristic, not proof of an actual leak -- review each site manually. A false positive (e.g. logging only a boolean like hasPassword) is expected sometimes.')
process.exit(1)
