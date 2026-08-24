import { verifySignedRequest } from './auth/hmac'
import { checkAndRecordNonce } from './auth/nonce'
import { CLOCK_TOLERANCE_MS, NONCE_TTL_SECONDS } from './config'
import type { Env, GameCommandQueueMessage } from './env'
import { handleHeartbeat } from './heartbeat'
import { handleIngestEvent } from './ingest'
import { jsonResponse } from './json'
import { handleReadStatus } from './read'
import { claimCommands, createCommand, deleteExpiredCommandHistory, getCommandResult, makeQueuedCommandAvailable, reportCommandResult, retryFailedCommand } from './commands'

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

      if (request.method === 'POST' && url.pathname === '/internal/game-commands') {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.COMMAND_PORTAL_SECRETS_JSON), 'command:create', env)
        if (!auth.ok) return auth.response
        return await createCommand(rawBody, env)
      }

      if (request.method === 'POST' && url.pathname === '/game-commands/claim') {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.COMMAND_AGENT_SECRETS_JSON), 'command:claim', env)
        if (!auth.ok) return auth.response
        return await claimCommands(rawBody, auth.clientId, env)
      }

      if (request.method === 'POST' && url.pathname === '/game-commands/result') {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.COMMAND_AGENT_SECRETS_JSON), 'command:result', env)
        if (!auth.ok) return auth.response
        return await reportCommandResult(rawBody, auth.clientId, env)
      }

      if (request.method === 'GET' && url.pathname.startsWith('/internal/game-commands/')) {
        const rawBody = ''
        const auth = await authenticate(request, rawBody, parseSecrets(env.COMMAND_PORTAL_SECRETS_JSON), 'command:reconcile', env)
        if (!auth.ok) return auth.response
        return await getCommandResult(url.pathname.slice('/internal/game-commands/'.length), env)
      }

      if (request.method === 'POST' && url.pathname.startsWith('/internal/game-commands/') && url.pathname.endsWith('/retry')) {
        const rawBody = await request.text()
        const auth = await authenticate(request, rawBody, parseSecrets(env.COMMAND_PORTAL_SECRETS_JSON), 'command:retry', env)
        if (!auth.ok) return auth.response
        const commandId = url.pathname.slice('/internal/game-commands/'.length, -'/retry'.length)
        return await retryFailedCommand(commandId, rawBody, env)
      }

      return jsonResponse({ error: 'NOT_FOUND' }, 404)
    } catch {
      return jsonResponse({ error: 'INTERNAL_ERROR' }, 500)
    }
  },

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    for (const message of batch.messages) await makeQueuedCommandAvailable(message as Message<GameCommandQueueMessage>, env)
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await deleteExpiredCommandHistory(env)
  }
} satisfies ExportedHandler<Env>
