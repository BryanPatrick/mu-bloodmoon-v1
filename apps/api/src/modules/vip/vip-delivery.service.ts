import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaClient, type GameBridgeJob } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { GrantVipDeliveryPayload, VipGameBridgeGateway } from './vip-delivery.gateway'
import { UnconfiguredVipGameBridgeGateway } from './vip-delivery.gateway'

// Phase 14 Part C. Mirrors the claim/backoff/ceiling/lock pattern already
// proven in game-provisioning-reconciliation.service.ts, applied to
// GameBridgeJob(operation=GRANT_VIP) rows instead of GameAccountIdentity.
// Unlike that module, per-job attempt state lives directly on GameBridgeJob
// (attempts/availableAt/status/error/result) -- no separate attempt-log
// table is needed for this operation.
const BACKOFF_SCHEDULE_MS = [0, 30_000, 120_000, 600_000, 1_800_000]
const MAX_ATTEMPTS = 8
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60_000
const JITTER_RATIO = 0.2
const DEFAULT_INTERVAL_MS = 30_000
const DEFAULT_BATCH_SIZE = 20
const DELIVERY_LOCK_NAME = 'bloodmoon:vip-delivery-worker'

export interface VipDeliveryTickResult {
  scanned: number
  delivered: number
  retried: number
  failedFinal: number
  errors: number
}

export interface VipSyncDriftRow {
  accountId: string
  tier: string | null
  expiresAt: string | null
  grantIdempotencyKey: string
  bridgeJobStatus: string | 'MISSING'
  bridgeJobError: string | null
}

@Injectable()
export class VipDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VipDeliveryService.name)
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly gateway: VipGameBridgeGateway

  constructor(private readonly prisma: PrismaService) {
    // The only gateway implementation that exists today -- see
    // vip-delivery.gateway.ts's header comment. Not read from a DI token
    // keyed off MU_BRIDGE_ENABLED, deliberately: that flag has never
    // pointed at a real GRANT_VIP-capable implementation, and pretending
    // otherwise here would silently start reporting fake deliveries the
    // moment someone flips an unrelated flag.
    this.gateway = new UnconfiguredVipGameBridgeGateway()
  }

  onModuleInit() {
    if (process.env.VIP_DELIVERY_WORKER_ENABLED !== 'true') return
    const intervalMs = Number(process.env.VIP_DELIVERY_WORKER_INTERVAL_MS) || DEFAULT_INTERVAL_MS
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => this.logger.error(`VIP delivery tick failed: ${safeMessage(error)}`))
    }, intervalMs)
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(): Promise<VipDeliveryTickResult> {
    return this.withDeliveryLock(
      () => this.runOnceWithLock(),
      () => ({ scanned: 0, delivered: 0, retried: 0, failedFinal: 0, errors: 0 })
    )
  }

  private async runOnceWithLock(): Promise<VipDeliveryTickResult> {
    const result: VipDeliveryTickResult = { scanned: 0, delivered: 0, retried: 0, failedFinal: 0, errors: 0 }
    await this.recoverStaleProcessing()

    const batchSize = Number(process.env.VIP_DELIVERY_WORKER_BATCH_SIZE) || DEFAULT_BATCH_SIZE
    const candidates = await this.prisma.gameBridgeJob.findMany({
      where: { operation: 'GRANT_VIP', status: 'PENDING', availableAt: { lte: new Date() } },
      orderBy: { availableAt: 'asc' },
      take: batchSize
    })
    result.scanned = candidates.length

    for (const job of candidates) {
      try {
        const outcome = await this.considerOne(job)
        if (outcome === 'DELIVERED') result.delivered++
        else if (outcome === 'RETRIED') result.retried++
        else if (outcome === 'FAILED_FINAL') result.failedFinal++
      } catch (error) {
        result.errors++
        this.logger.warn(`VIP delivery failed for job ${job.id}: ${safeMessage(error)}`)
      }
    }
    return result
  }

  // A job left in PROCESSING past the stale threshold means the process
  // handling it died mid-delivery (crash-safety net) -- put it back to
  // PENDING with no extra backoff so it's retried on the very next tick.
  // It keeps its already-incremented attempts count, so the ceiling still
  // applies correctly across the crash.
  private async recoverStaleProcessing() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS)
    await this.prisma.gameBridgeJob.updateMany({
      where: { operation: 'GRANT_VIP', status: 'PROCESSING', updatedAt: { lt: staleBefore } },
      data: { status: 'PENDING' }
    })
  }

  private async considerOne(job: GameBridgeJob): Promise<'DELIVERED' | 'RETRIED' | 'FAILED_FINAL' | 'SKIPPED'> {
    // Atomic claim: only the caller that actually flips PENDING->PROCESSING
    // proceeds. A second worker instance racing on the same row loses this
    // updateMany (count 0) and moves on -- duplicate-delivery protection
    // without needing a separate lock per job.
    const claim = await this.prisma.gameBridgeJob.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    })
    if (claim.count !== 1) return 'SKIPPED'

    const claimed = await this.prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    const payload = claimed.payload as unknown as GrantVipDeliveryPayload

    let outcome: Awaited<ReturnType<VipGameBridgeGateway['deliver']>>
    try {
      outcome = await this.gateway.deliver(payload)
    } catch (error) {
      outcome = { delivered: false, reason: safeMessage(error) }
    }

    if (outcome.delivered) {
      await this.prisma.gameBridgeJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', processedAt: new Date(), error: null, result: (outcome.detail ?? {}) as object }
      })
      return 'DELIVERED'
    }

    if (claimed.attempts >= MAX_ATTEMPTS) {
      await this.prisma.gameBridgeJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', processedAt: new Date(), error: (outcome.reason ?? 'UNKNOWN_DELIVERY_FAILURE').slice(0, 500) }
      })
      return 'FAILED_FINAL'
    }

    await this.prisma.gameBridgeJob.update({
      where: { id: job.id },
      data: {
        status: 'PENDING',
        availableAt: new Date(Date.now() + backoffDelayMs(claimed.attempts)),
        error: (outcome.reason ?? 'UNKNOWN_DELIVERY_FAILURE').slice(0, 500)
      }
    })
    return 'RETRIED'
  }

  // Operational visibility for admins: jobs that need a human to look
  // (terminal FAILED, or still PENDING after using up meaningful retries).
  // Never exposes payload/result contents beyond what's already
  // non-sensitive (accountId/tier/expiresAt -- no credential, no ciphertext).
  async listNeedingAttention() {
    const jobs = await this.prisma.gameBridgeJob.findMany({
      where: { operation: 'GRANT_VIP', status: { in: ['FAILED', 'PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'asc' }
    })
    return jobs
      .filter((job) => job.status === 'FAILED' || job.attempts > 0)
      .map((job) => ({
        id: job.id,
        accountId: job.accountId,
        status: job.status,
        attempts: job.attempts,
        availableAt: job.availableAt.toISOString(),
        error: job.error,
        createdAt: job.createdAt.toISOString()
      }))
  }

  // Manual admin retry: resets attempts and clears backoff, but goes
  // through the exact same considerOne() claim/deliver/outcome logic --
  // there is no separate "force success" path, so a manual retry against
  // the still-unconfigured gateway fails the same honest way an automatic
  // one would.
  async manualRetry(jobId: string): Promise<{ status: string }> {
    const job = await this.prisma.gameBridgeJob.findUnique({ where: { id: jobId } })
    if (!job || job.operation !== 'GRANT_VIP') throw new Error('VIP_DELIVERY_JOB_NOT_FOUND')
    if (job.status === 'COMPLETED') return { status: 'COMPLETED' }

    await this.prisma.gameBridgeJob.update({
      where: { id: jobId },
      data: { status: 'PENDING', availableAt: new Date() }
    })
    const outcome = await this.considerOne(await this.prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: jobId } }))
    const updated = await this.prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: jobId } })
    this.logger.log(`Manual VIP delivery retry for job ${jobId}: ${outcome}`)
    return { status: updated.status }
  }

  // Reconciliation: apps/api's VipEntitlement is marked ACTIVE synchronously
  // at purchase time (vip.service.ts), independent of whether the
  // GameBridge sync ever actually completes. This finds every ACTIVE
  // entitlement whose most recent grant's bridge job did NOT complete, and
  // reports it -- it never auto-corrects anything (there is nothing safe to
  // auto-correct without a real gateway), it only makes the drift visible.
  async reconcileEntitlements(): Promise<VipSyncDriftRow[]> {
    const activeEntitlements = await this.prisma.vipEntitlement.findMany({
      where: { status: 'ACTIVE' },
      include: { grants: { orderBy: { grantedAt: 'desc' }, take: 1 } }
    })

    const drift: VipSyncDriftRow[] = []
    for (const entitlement of activeEntitlements) {
      const latestGrant = entitlement.grants[0]
      if (!latestGrant) continue

      const bridgeKey = `vip-bridge:${latestGrant.idempotencyKey}`
      const job = await this.prisma.gameBridgeJob.findUnique({ where: { idempotencyKey: bridgeKey } })

      if (!job || job.status !== 'COMPLETED') {
        drift.push({
          accountId: entitlement.accountId,
          tier: entitlement.tier,
          expiresAt: entitlement.expiresAt?.toISOString() ?? null,
          grantIdempotencyKey: latestGrant.idempotencyKey,
          bridgeJobStatus: job?.status ?? 'MISSING',
          bridgeJobError: job?.error ?? null
        })
      }
    }
    return drift
  }

  // Same MySQL named-lock pattern as game-provisioning-reconciliation.service.ts
  // -- a dedicated single-connection Prisma client pins GET_LOCK/RELEASE_LOCK
  // to one connection so a crashed process still releases the lock when
  // MySQL closes it, without holding an interactive transaction on the pool
  // production cron shares.
  private async withDeliveryLock<T>(work: () => Promise<T>, whenBusy: () => T): Promise<T> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL_NOT_CONFIGURED')

    const lockUrl = new URL(databaseUrl)
    lockUrl.searchParams.set('connection_limit', '1')
    const lockClient = new PrismaClient({ datasources: { db: { url: lockUrl.toString() } } })
    let acquired = false

    try {
      await lockClient.$connect()
      const rows = await lockClient.$queryRaw<Array<{ acquired: number | bigint | null }>>`
        SELECT GET_LOCK(${DELIVERY_LOCK_NAME}, 0) AS acquired
      `
      if (Number(rows[0]?.acquired ?? 0) !== 1) return whenBusy()
      acquired = true

      return await work()
    } finally {
      if (acquired) {
        await lockClient.$queryRaw`
          SELECT RELEASE_LOCK(${DELIVERY_LOCK_NAME})
        `
      }
      await lockClient.$disconnect()
    }
  }
}

function backoffDelayMs(attemptsSoFar: number): number {
  const base = BACKOFF_SCHEDULE_MS[Math.min(attemptsSoFar, BACKOFF_SCHEDULE_MS.length - 1)]
  if (base === 0) return 0
  const jitter = base * JITTER_RATIO * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(base + jitter))
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 500)
}
