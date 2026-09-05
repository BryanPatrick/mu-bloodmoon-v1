import { Injectable } from '@nestjs/common'
import { http5xxBurstCooldownMs, http5xxBurstThreshold, http5xxBurstWindowMs, isHttp5xxBurstDetectionEnabled } from './alerting.env'

// Part 13's "repeated 5xx threshold" -- deliberately in-memory, per
// process, no new table. This project runs as a single Node process on
// cPanel's Node.js Selector (confirmed during this phase's deployment
// audit -- no multi-instance/load-balanced deployment exists), so a
// process-local sliding window is a correct, sufficient MVP rather than a
// missing feature; a restart resets it, which is an acceptable and
// documented limitation ("Do not build a full enterprise monitoring
// platform"). SafeExceptionFilter already inspects every 5xx individually
// (per-fingerprint SystemError dedup) -- this class answers a different
// question: how many DISTINCT 5xx responses (any fingerprint) happened
// recently, which the fingerprint-based dedup cannot see on its own.
@Injectable()
export class Http5xxBurstDetector {
  private timestamps: number[] = []
  private cooldownUntil = 0

  // Records one 5xx occurrence "now" and returns true exactly once per
  // burst (threshold crossed AND not already inside its own cooldown) --
  // never on every request once the threshold stays crossed, which is
  // what Part 14 means by "don't send 100 emails for the same 5xx loop."
  recordAndCheck(now: number = Date.now()): boolean {
    if (!isHttp5xxBurstDetectionEnabled()) return false

    const windowMs = http5xxBurstWindowMs()
    this.timestamps.push(now)
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp <= windowMs)

    if (this.timestamps.length < http5xxBurstThreshold()) return false
    if (now < this.cooldownUntil) return false

    this.cooldownUntil = now + http5xxBurstCooldownMs()
    return true
  }

  currentCount(now: number = Date.now()): number {
    const windowMs = http5xxBurstWindowMs()
    return this.timestamps.filter((timestamp) => now - timestamp <= windowMs).length
  }

  reset(): void {
    this.timestamps = []
    this.cooldownUntil = 0
  }
}
