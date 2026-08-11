// Small, self-contained sliding-window rate limiter for the Mercado Pago
// webhook route specifically. Not @nestjs/throttler -- see payments.module.ts
// for why a second ThrottlerModule.forRoot() would collide with the one
// media.module.ts already registers app-wide.
const WINDOW_MS = 60_000
const LIMIT = 120
const hits = new Map<string, number[]>()

export function isWebhookRateLimited(key: string, now = Date.now()): boolean {
  const timestamps = (hits.get(key) || []).filter((ts) => now - ts < WINDOW_MS)
  if (timestamps.length >= LIMIT) {
    hits.set(key, timestamps)
    return true
  }
  timestamps.push(now)
  hits.set(key, timestamps)
  return false
}
