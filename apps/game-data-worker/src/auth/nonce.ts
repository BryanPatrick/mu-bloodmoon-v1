import type { Env } from '../env'

// INSERT-first is the authority for replay protection: a UNIQUE-constraint
// failure on (nonce, scope) *is* the replay detection, never a prior
// SELECT-then-INSERT (which would race under two simultaneous requests).
// Distinct from event_dedupe (business-level) -- this is transport/auth-level.
export async function checkAndRecordNonce(env: Env, nonce: string, scope: string, ttlSeconds: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  try {
    await env.DB.prepare('INSERT INTO request_nonce (nonce, scope, expires_at) VALUES (?, ?, ?)')
      .bind(nonce, scope, expiresAt)
      .run()
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return false
    }
    throw err
  }

  // Opportunistic cleanup -- not required for correctness (replay
  // protection is the INSERT above), just keeps the table bounded.
  await env.DB.prepare('DELETE FROM request_nonce WHERE expires_at < ?')
    .bind(new Date().toISOString())
    .run()
    .catch(() => {})

  return true
}

export function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('UNIQUE constraint failed')
}
