import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { AuthAbusePolicy } from './auth-abuse.decorator'

type RateBucket = { count: number; resetAt: number }
type RateRule = { limit: number; windowMs: number }
type RateLimitResult = { allowed: boolean; retryAfterSeconds: number; tracker: 'ip' | 'subject' }

const DEFAULTS: Record<AuthAbusePolicy, { ip: RateRule; subject?: RateRule }> = {
  login: { ip: { limit: 20, windowMs: 5 * 60_000 }, subject: { limit: 10, windowMs: 15 * 60_000 } },
  register: {
    ip: { limit: 10, windowMs: 60 * 60_000 },
    subject: { limit: 3, windowMs: 60 * 60_000 }
  },
  refresh: { ip: { limit: 60, windowMs: 60_000 } },
  sensitive: { ip: { limit: 10, windowMs: 15 * 60_000 } },
  recovery: {
    ip: { limit: 10, windowMs: 15 * 60_000 },
    subject: { limit: 3, windowMs: 15 * 60_000 }
  }
}

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, RateBucket>()

  consume(
    policy: AuthAbusePolicy,
    ip: string | null,
    subject: unknown,
    now = Date.now()
  ): RateLimitResult {
    const rules = DEFAULTS[policy]
    const checks: Array<{ key: string; rule: RateRule; tracker: 'ip' | 'subject' }> = [
      {
        key: `${policy}:ip:${ip || 'unknown'}`,
        rule: this.rule(policy, 'ip', rules.ip),
        tracker: 'ip'
      }
    ]
    const normalizedSubject = typeof subject === 'string' ? subject.trim().toLowerCase() : ''
    if (rules.subject && normalizedSubject) {
      checks.push({
        key: `${policy}:subject:${this.hash(normalizedSubject)}`,
        rule: this.rule(policy, 'subject', rules.subject),
        tracker: 'subject'
      })
    }

    for (const check of checks) {
      const bucket = this.buckets.get(check.key)
      if (bucket && bucket.resetAt > now && bucket.count >= check.rule.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
          tracker: check.tracker
        }
      }
    }

    for (const check of checks) {
      const bucket = this.buckets.get(check.key)
      if (!bucket || bucket.resetAt <= now) {
        this.buckets.set(check.key, { count: 1, resetAt: now + check.rule.windowMs })
      } else {
        bucket.count += 1
      }
    }
    this.cleanup(now)
    return { allowed: true, retryAfterSeconds: 0, tracker: 'ip' }
  }

  reset() {
    this.buckets.clear()
  }

  private rule(policy: AuthAbusePolicy, tracker: 'ip' | 'subject', fallback: RateRule): RateRule {
    const prefix = `AUTH_RATE_${policy.toUpperCase()}_${tracker.toUpperCase()}`
    return {
      limit: this.positiveInteger(process.env[`${prefix}_LIMIT`], fallback.limit),
      windowMs: this.positiveInteger(process.env[`${prefix}_WINDOW_MS`], fallback.windowMs)
    }
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex')
  }

  private cleanup(now: number) {
    if (this.buckets.size < 5000) return
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }

  private positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
