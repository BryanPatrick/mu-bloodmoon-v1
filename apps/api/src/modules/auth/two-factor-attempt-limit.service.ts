import { Injectable } from '@nestjs/common'

// Per-account (not per-IP) protection against TOTP/recovery-code guessing.
// A fixed-window IP limiter (AuthRateLimitService) already exists for the
// 'sensitive' policy, but it is shared across every account hitting that IP
// -- an attacker spraying guesses for one specific account from many IPs, or
// simply sharing an IP with other legitimate users, is not meaningfully
// slowed by it. This tracks failed *verification* attempts per account id,
// with an escalating cooldown that is always finite (never a permanent
// lockout) and resets on the next successful code.
type Streak = { failures: number; lockedUntil: number; updatedAt: number }

@Injectable()
export class TwoFactorAttemptLimitService {
  private readonly streaks = new Map<string, Streak>()

  checkAllowed(accountId: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const streak = this.streaks.get(accountId)
    if (streak && streak.lockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((streak.lockedUntil - now) / 1000)) }
    }
    return { allowed: true, retryAfterSeconds: 0 }
  }

  recordFailure(accountId: string, now = Date.now()) {
    const streak = this.streaks.get(accountId) || { failures: 0, lockedUntil: 0, updatedAt: now }
    streak.failures += 1
    streak.updatedAt = now
    streak.lockedUntil = now + this.cooldownMs(streak.failures)
    this.streaks.set(accountId, streak)
    this.cleanup(now)
  }

  recordSuccess(accountId: string) {
    this.streaks.delete(accountId)
  }

  reset() {
    this.streaks.clear()
  }

  // First N failures are free (typos happen); each one after that doubles
  // the cooldown, capped at a maximum so a legitimate account is always able
  // to try again eventually.
  private cooldownMs(failures: number) {
    const freeAttempts = this.envInt('AUTH_TWO_FACTOR_FREE_ATTEMPTS', 4)
    if (failures <= freeAttempts) return 0
    const baseMs = this.envInt('AUTH_TWO_FACTOR_BASE_COOLDOWN_MS', 30_000)
    const maxMs = this.envInt('AUTH_TWO_FACTOR_MAX_COOLDOWN_MS', 30 * 60_000)
    const tier = failures - freeAttempts
    return Math.min(baseMs * 2 ** Math.min(tier - 1, 10), maxMs)
  }

  private envInt(name: string, fallback: number) {
    const value = Number(process.env[name])
    return Number.isInteger(value) && value > 0 ? value : fallback
  }

  private cleanup(now: number) {
    if (this.streaks.size < 5000) return
    for (const [accountId, streak] of this.streaks) {
      if (streak.lockedUntil <= now && now - streak.updatedAt > 60 * 60_000) this.streaks.delete(accountId)
    }
  }
}
