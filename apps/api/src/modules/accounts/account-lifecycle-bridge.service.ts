import { randomUUID } from 'node:crypto'
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaClient, type GameBridgeJob, type GameBridgeOperation } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import { GameCommandTransportClient } from '../game-account-identity/game-command-transport.client'

// GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
// decision C + Bryan's 2026-08-30 follow-up. The real sender for the two
// GameBridgeJob operations that had queueing but no delivery
// (ANONYMIZE_GAME_ACCOUNT since account-deletion.service.ts#executeNormalDeletion,
// PURGE_GAME_ACCOUNT since account-deletion.service.ts#executePreBetaPurge).
// Mirrors vip-delivery.service.ts's claim/backoff/ceiling/lock shape, with
// one structural difference: this service also needs to POLL for a
// terminal transport result (like vip-sync.service.ts's reconcileInFlight)
// since these two commands are async, not a single "deliver and forget"
// step -- so a job goes PENDING -> PROCESSING (dispatched, in flight) ->
// COMPLETED/FAILED, with the in-flight commandId/provisioningRequestId
// stashed in the job's own `result` JSON column until a terminal outcome
// overwrites it.
//
// AuditEvent mirroring (decision C): a send-side and a receive-side
// AuditEvent, correlated via `commandId` as `correlationId` -- the thing
// Part 10 of the plan explicitly asked for on these two operations (unlike
// GRANT_VIP/SYNC_VIP_TIER, which only need commercial traceability, not
// this legal-shaped audit trail).
const BACKOFF_SCHEDULE_MS = [0, 30_000, 120_000, 600_000, 1_800_000]
const MAX_ATTEMPTS = 8
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60_000
const JITTER_RATIO = 0.2
const DEFAULT_INTERVAL_MS = 30_000
const DEFAULT_BATCH_SIZE = 20
const LOCK_NAME = 'bloodmoon:account-lifecycle-bridge'
// Short-lived, matching vip-sync.service.ts's own reasoning -- a single
// procedure call, no reason to reuse CREATE_GAME_ACCOUNT's 24h window.
const COMMAND_EXPIRY_MS = 60 * 60_000
const OPERATIONS: GameBridgeOperation[] = ['ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT']

type DispatchRecord = { commandId: string; provisioningRequestId: string }
type LifecyclePayload = { accountId: string; legacyLogin: string; betaCycleId?: string }

export interface AccountLifecycleBridgeTickResult {
  scanned: number
  dispatched: number
  completed: number
  retried: number
  failedFinal: number
  errors: number
}

@Injectable()
export class AccountLifecycleBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountLifecycleBridgeService.name)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly transport: GameCommandTransportClient,
    private readonly audit: AuditService
  ) {}

  onModuleInit() {
    if (process.env.ACCOUNT_LIFECYCLE_BRIDGE_ENABLED !== 'true') return
    const intervalMs = Number(process.env.ACCOUNT_LIFECYCLE_BRIDGE_INTERVAL_MS) || DEFAULT_INTERVAL_MS
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => this.logger.error(`Account lifecycle bridge tick failed: ${safeMessage(error)}`))
    }, intervalMs)
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(): Promise<AccountLifecycleBridgeTickResult> {
    return this.withLock(
      () => this.runOnceWithLock(),
      () => ({ scanned: 0, dispatched: 0, completed: 0, retried: 0, failedFinal: 0, errors: 0 })
    )
  }

  private async runOnceWithLock(): Promise<AccountLifecycleBridgeTickResult> {
    const result: AccountLifecycleBridgeTickResult = { scanned: 0, dispatched: 0, completed: 0, retried: 0, failedFinal: 0, errors: 0 }
    await this.recoverStaleProcessing()

    // Phase 1: reconcile everything already dispatched -- poll for a
    // terminal transport result before dispatching anything new.
    const inFlight = await this.prisma.gameBridgeJob.findMany({
      where: { operation: { in: OPERATIONS }, status: 'PROCESSING' }
    })
    for (const job of inFlight) {
      try {
        const outcome = await this.reconcileOne(job)
        if (outcome === 'COMPLETED') result.completed++
        else if (outcome === 'RETRIED') result.retried++
        else if (outcome === 'FAILED_FINAL') result.failedFinal++
      } catch (error) {
        result.errors++
        this.logger.warn(`Account lifecycle bridge reconcile failed for job ${job.id}: ${safeMessage(error)}`)
      }
    }

    // Phase 2: dispatch newly-PENDING jobs.
    const batchSize = Number(process.env.ACCOUNT_LIFECYCLE_BRIDGE_BATCH_SIZE) || DEFAULT_BATCH_SIZE
    const candidates = await this.prisma.gameBridgeJob.findMany({
      where: { operation: { in: OPERATIONS }, status: 'PENDING', availableAt: { lte: new Date() } },
      orderBy: { availableAt: 'asc' },
      take: batchSize
    })
    result.scanned = inFlight.length + candidates.length

    for (const job of candidates) {
      try {
        const outcome = await this.dispatchOne(job)
        if (outcome === 'DISPATCHED') result.dispatched++
      } catch (error) {
        result.errors++
        this.logger.warn(`Account lifecycle bridge dispatch failed for job ${job.id}: ${safeMessage(error)}`)
      }
    }
    return result
  }

  // A job stuck in PROCESSING with no dispatch record at all (crash before
  // transport.create() ever succeeded) goes back to PENDING for a fresh
  // dispatch attempt. A job WITH a dispatch record is left alone --
  // reconcileOne() above is what polls it; a stale PROCESSING there just
  // means the command is still genuinely in flight at the Worker/Agent.
  private async recoverStaleProcessing() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS)
    const stale = await this.prisma.gameBridgeJob.findMany({
      where: { operation: { in: OPERATIONS }, status: 'PROCESSING', updatedAt: { lt: staleBefore } }
    })
    for (const job of stale) {
      if (readDispatch(job)) continue
      await this.prisma.gameBridgeJob.updateMany({ where: { id: job.id, status: 'PROCESSING' }, data: { status: 'PENDING' } })
    }
  }

  private async dispatchOne(job: GameBridgeJob): Promise<'DISPATCHED' | 'SKIPPED'> {
    const claim = await this.prisma.gameBridgeJob.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    })
    if (claim.count !== 1) return 'SKIPPED'

    const claimed = await this.prisma.gameBridgeJob.findUniqueOrThrow({ where: { id: job.id } })
    const payload = claimed.payload as unknown as LifecyclePayload
    const commandId = randomUUID()
    const provisioningRequestId = randomUUID()
    const dispatch: DispatchRecord = { commandId, provisioningRequestId }

    await this.audit.record({
      actorId: null, actorUsername: 'system-gamebridge-lifecycle',
      action: claimed.operation === 'ANONYMIZE_GAME_ACCOUNT' ? 'gamebridge.anonymize.sent' : 'gamebridge.purge.sent',
      targetType: 'Account', targetId: payload.accountId, correlationId: commandId,
      metadata: { legacyLogin: payload.legacyLogin, betaCycleId: payload.betaCycleId ?? null }
    })

    try {
      const base = {
        commandId, provisioningRequestId,
        environment: process.env.GAME_COMMAND_ENVIRONMENT || 'production',
        serverId: process.env.GAME_COMMAND_SERVER_ID || 'bloodmoon-s6',
        legacyLogin: payload.legacyLogin,
        expiresAt: new Date(Date.now() + COMMAND_EXPIRY_MS).toISOString()
      }
      if (claimed.operation === 'ANONYMIZE_GAME_ACCOUNT') {
        await this.transport.create({ ...base, commandType: 'ANONYMIZE_GAME_ACCOUNT' })
      } else {
        if (!payload.betaCycleId) throw new Error('BETA_CYCLE_ID_REQUIRED')
        await this.transport.create({ ...base, commandType: 'PURGE_GAME_ACCOUNT', payload: { betaCycleId: payload.betaCycleId } })
      }
    } catch (error) {
      await this.prisma.gameBridgeJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', availableAt: new Date(Date.now() + backoffDelayMs(claimed.attempts)), error: safeMessage(error) }
      })
      return 'SKIPPED'
    }

    // Dispatch succeeded -- stash the in-flight commandId so Phase 1 can
    // poll it next tick. `result` stays a "dispatch record" (never the
    // final outcome) until reconcileOne() overwrites it with a terminal one.
    await this.prisma.gameBridgeJob.update({ where: { id: job.id }, data: { result: dispatch as object, error: null } })
    return 'DISPATCHED'
  }

  private async reconcileOne(job: GameBridgeJob): Promise<'COMPLETED' | 'RETRIED' | 'FAILED_FINAL' | 'STILL_IN_FLIGHT'> {
    const dispatch = readDispatch(job)
    if (!dispatch) return 'STILL_IN_FLIGHT'

    const payload = job.payload as unknown as LifecyclePayload
    const state = await this.transport.get(dispatch.commandId)

    if (state.status === 'SUCCEEDED') {
      await this.prisma.gameBridgeJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', processedAt: new Date(), error: null, result: { ...dispatch, resultCode: state.resultCode, detailJson: state.detailJson } as object }
      })
      await this.audit.record({
        actorId: null, actorUsername: 'system-gamebridge-lifecycle',
        action: job.operation === 'ANONYMIZE_GAME_ACCOUNT' ? 'gamebridge.anonymize.completed' : 'gamebridge.purge.completed',
        targetType: 'Account', targetId: payload.accountId, correlationId: dispatch.commandId,
        metadata: { resultCode: state.resultCode, detailJson: state.detailJson }
      })
      return 'COMPLETED'
    }

    if (state.status === 'FAILED_FINAL' || state.status === 'EXPIRED') {
      if (job.attempts >= MAX_ATTEMPTS) {
        await this.prisma.gameBridgeJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', processedAt: new Date(), error: (state.resultCode ?? state.status).slice(0, 500) }
        })
        await this.audit.record({
          actorId: null, actorUsername: 'system-gamebridge-lifecycle',
          action: job.operation === 'ANONYMIZE_GAME_ACCOUNT' ? 'gamebridge.anonymize.failed' : 'gamebridge.purge.failed',
          targetType: 'Account', targetId: payload.accountId, correlationId: dispatch.commandId,
          result: 'FAILURE', severity: 'error', metadata: { resultCode: state.resultCode, status: state.status }
        })
        return 'FAILED_FINAL'
      }
      // Reset to PENDING for a FRESH dispatch on the next pass, rather than
      // transport.retry() -- that Worker route only accepts a command still
      // in FAILED_FINAL status with its original expiresAt unexpired,
      // neither of which EXPIRED satisfies. A brand-new commandId is always
      // safe here: both stored procedures are idempotent by design
      // (ALREADY_ANONYMIZED/ALREADY_PURGED), so re-dispatching under a new
      // commandId can never double-execute.
      await this.prisma.gameBridgeJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', availableAt: new Date(Date.now() + backoffDelayMs(job.attempts)), error: (state.resultCode ?? state.status).slice(0, 500) }
      })
      return 'RETRIED'
    }

    return 'STILL_IN_FLIGHT'
  }

  // Operational visibility (the "batch report" for PURGE, and the general
  // needing-attention view for ANONYMIZE) -- mirrors vip-delivery.service.ts's
  // own listNeedingAttention() shape. Never exposes legacyLogin/detailJson
  // contents beyond resultCode -- the account-facing detail already lives
  // in AccountDeletionRecord/PurgeBatchRecord, this is purely GameBridge
  // transport-layer status.
  async listNeedingAttention() {
    const jobs = await this.prisma.gameBridgeJob.findMany({
      where: { operation: { in: OPERATIONS }, status: { in: ['FAILED', 'PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'asc' }
    })
    return jobs
      .filter((job) => job.status === 'FAILED' || job.attempts > 0)
      .map((job) => {
        const payload = job.payload as unknown as LifecyclePayload
        return {
          id: job.id,
          operation: job.operation,
          accountId: payload.accountId,
          betaCycleId: payload.betaCycleId ?? null,
          status: job.status,
          attempts: job.attempts,
          availableAt: job.availableAt.toISOString(),
          error: job.error,
          createdAt: job.createdAt.toISOString()
        }
      })
  }

  // Batch report for a specific PURGE_GAME_ACCOUNT betaCycleId -- shows
  // every job queued for that batch and its current GameBridge status,
  // the post-verification step Bryan's workflow asks for beyond the
  // Portal-side dryRunPreBetaPurge() re-check.
  async purgeBatchReport(betaCycleId: string) {
    const jobs = await this.prisma.gameBridgeJob.findMany({
      where: { operation: 'PURGE_GAME_ACCOUNT' },
      orderBy: { createdAt: 'asc' }
    })
    return jobs
      .map((job) => ({ job, payload: job.payload as unknown as LifecyclePayload }))
      .filter(({ payload }) => payload.betaCycleId === betaCycleId)
      .map(({ job, payload }) => ({
        accountId: payload.accountId,
        status: job.status,
        attempts: job.attempts,
        resultCode: (readTerminalResult(job))?.resultCode ?? null,
        processedAt: job.processedAt?.toISOString() ?? null,
        error: job.error
      }))
  }

  private async withLock<T>(work: () => Promise<T>, whenBusy: () => T): Promise<T> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL_NOT_CONFIGURED')

    const lockUrl = new URL(databaseUrl)
    lockUrl.searchParams.set('connection_limit', '1')
    const lockClient = new PrismaClient({ datasources: { db: { url: lockUrl.toString() } } })
    let acquired = false

    try {
      await lockClient.$connect()
      const rows = await lockClient.$queryRaw<Array<{ acquired: number | bigint | null }>>`
        SELECT GET_LOCK(${LOCK_NAME}, 0) AS acquired
      `
      if (Number(rows[0]?.acquired ?? 0) !== 1) return whenBusy()
      acquired = true

      return await work()
    } finally {
      if (acquired) {
        await lockClient.$queryRaw`
          SELECT RELEASE_LOCK(${LOCK_NAME})
        `
      }
      await lockClient.$disconnect()
    }
  }
}

function readDispatch(job: GameBridgeJob): DispatchRecord | null {
  const value = job.result as unknown as (DispatchRecord & { resultCode?: string }) | null
  return value?.commandId && value?.provisioningRequestId ? { commandId: value.commandId, provisioningRequestId: value.provisioningRequestId } : null
}

function readTerminalResult(job: GameBridgeJob): { resultCode: string } | null {
  const value = job.result as unknown as { resultCode?: string } | null
  return value?.resultCode ? { resultCode: value.resultCode } : null
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
