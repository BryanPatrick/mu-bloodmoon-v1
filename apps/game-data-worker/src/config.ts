export const CLOCK_TOLERANCE_MS = 5 * 60_000
// Must be >= CLOCK_TOLERANCE_MS -- otherwise a request accepted right at the
// edge of clock tolerance could have its nonce row expire and become
// replayable again before the tolerance window itself would reject it.
export const NONCE_TTL_SECONDS = 10 * 60
export const EVENT_DEDUPE_RETENTION_HOURS = 72
export const BRIDGE_HEALTHY_MAX_AGE_MS = 2 * 60_000
export const BRIDGE_STALE_MAX_AGE_MS = 10 * 60_000
