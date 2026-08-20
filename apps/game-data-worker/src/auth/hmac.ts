// Verifies the canonical-request HMAC signed by HmacRequestSigner.cs
// (Agent) / apps/api's game-data.client.ts (apps/api). The canonical string
// MUST match exactly:
//   clientId \n METHOD \n path \n query \n timestampMs \n nonce \n sha256(body)
// A signature is therefore bound to the exact client, method, path, query
// and body it authenticates -- a signature captured for one route can never
// verify against another route (see test/hmac.spec.ts).

export type VerifyResult = { ok: true; clientId: string } | { ok: false; reason: string }

export async function verifySignedRequest(
  request: Request,
  rawBody: string,
  secretsByClientId: Record<string, string>,
  clockToleranceMs: number
): Promise<VerifyResult> {
  const clientId = request.headers.get('X-Agent-Id')
  const timestamp = request.headers.get('X-Agent-Timestamp')
  const nonce = request.headers.get('X-Agent-Nonce')
  const signature = request.headers.get('X-Agent-Signature')

  if (!clientId || !timestamp || !nonce || !signature) {
    return { ok: false, reason: 'MISSING_HEADERS' }
  }

  const secret = secretsByClientId[clientId]
  if (!secret) {
    return { ok: false, reason: 'UNKNOWN_CLIENT' }
  }

  const timestampMs = Number(timestamp)
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > clockToleranceMs) {
    return { ok: false, reason: 'CLOCK_SKEW' }
  }

  const url = new URL(request.url)
  const canonicalQuery = url.search.startsWith('?') ? url.search.slice(1) : url.search
  const bodyHash = await sha256Hex(rawBody)
  const canonical = [clientId, request.method.toUpperCase(), url.pathname, canonicalQuery, timestamp, nonce, bodyHash].join('\n')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  let signatureBytes: Uint8Array
  try {
    signatureBytes = hexToBytes(signature)
  } catch {
    return { ok: false, reason: 'MALFORMED_SIGNATURE' }
  }

  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(canonical))
  if (!valid) {
    return { ok: false, reason: 'INVALID_SIGNATURE' }
  }

  return { ok: true, clientId }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(digest))
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
