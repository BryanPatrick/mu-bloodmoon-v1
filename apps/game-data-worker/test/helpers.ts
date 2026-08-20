import { env } from 'cloudflare:test'
// Vite raw import -- bundled as a string at transform time. Test files run
// inside the real Workers runtime (workerd), which has no filesystem, so
// this is the only reliable way to load schema.sql for setup.
import schemaSql from '../db/schema.sql?raw'

export async function applySchema(): Promise<void> {
  const statements = schemaSql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const statement of statements) {
    await env.DB.prepare(statement).run()
  }
}

type SignOptions = {
  clientId: string
  secret: string
  method: string
  path: string
  query?: string
  body: string
  timestampMs?: number
  nonce?: string
}

// Mirrors HmacRequestSigner.cs / src/auth/hmac.ts's canonical string exactly
// -- this is the test-side stand-in for both real signers.
export async function signRequest(options: SignOptions): Promise<Record<string, string>> {
  const timestamp = String(options.timestampMs ?? Date.now())
  const nonce = options.nonce ?? crypto.randomUUID()
  const query = options.query ?? ''
  const bodyHash = await sha256Hex(options.body)
  const canonical = [options.clientId, options.method.toUpperCase(), options.path, query, timestamp, nonce, bodyHash].join('\n')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(options.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical))

  return {
    'X-Agent-Id': options.clientId,
    'X-Agent-Timestamp': timestamp,
    'X-Agent-Nonce': nonce,
    'X-Agent-Signature': bytesToHex(new Uint8Array(signatureBuffer)),
    'content-type': 'application/json'
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
