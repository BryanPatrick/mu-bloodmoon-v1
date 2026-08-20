import { verifySignedRequest } from './auth/hmac'
import { checkAndRecordNonce } from './auth/nonce'
import { CLOCK_TOLERANCE_MS, NONCE_TTL_SECONDS } from './config'
import type { Env } from './env'
import { handleHeartbeat } from './heartbeat'
import { handleIngestEvent } from './ingest'
import { jsonResponse } from './json'
import { handleReadStatus } from './read'

export function parseSecrets(json: string | undefined): Record<string, string> {
  if (!json) return {}
  try {
    // `wrangler secret put` reading piped stdin on Windows (this
    // project's wrangler 3.114.17) prepends a UTF-8 BOM (U+FEFF) to the
    // stored secret value regardless of the piped string's own encoding
    // -- confirmed by direct inspection (Phase 2D). Strip it defensively
    // so a real, external CLI quirk can never turn into every clientId
    // silently reading as unknown.
    const cleaned = json.charCodeAt(0) === 0xfeff ? json.slice(1) : json
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

async function authenticate(
  request: Request,
  rawBody: string,
  secretsByClientId: Record<string, string>,
  scope: string,
  env: Env
): Promise<{ ok: true; clientId: string } | { ok: false; response: Response }> {
  const verified = await verifySignedRequest(request, rawBody, secretsByClientId, CLOCK_TOLERANCE_MS)
  if (!verified.ok) {
    return { ok: false, response: jsonResponse({ error: verified.reason }, 401) }
  }

  const nonce = request.headers.get('X-Agent-Nonce') ?? ''
  const nonceOk = await checkAndRecordNonce(env, nonce, scope, NONCE_TTL_SECONDS)
  if (!nonceOk) {
    return { ok: false, response: jsonResponse({ error: 'REPLAYED_REQUEST' }, 401) }
  }

  return { ok: true, clientId: verified.clientId }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      if (request.method === 'POST' && url.pathname === '/ingest/events') {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.AGENT_SECRETS_JSON), 'ingest:events', env)
        if (!auth.ok) return auth.response
        return await handleIngestEvent(rawBody, env)
      }

      if (request.method === 'POST' && url.pathname === '/ingest/heartbeat') {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.AGENT_SECRETS_JSON), 'ingest:heartbeat', env)
        if (!auth.ok) return auth.response
        return await handleHeartbeat(rawBody, env)
      }

      if (request.method === 'GET' && url.pathname === '/internal/state/status') {
        const rawBody = ''
        const auth = await authenticate(request, rawBody, parseSecrets(env.API_READ_SECRETS_JSON), 'read:status', env)
        if (!auth.ok) return auth.response
        return await handleReadStatus(env)
      }

      return jsonResponse({ error: 'NOT_FOUND' }, 404)
    } catch {
      return jsonResponse({ error: 'INTERNAL_ERROR' }, 500)
    }
  }
} satisfies ExportedHandler<Env>
