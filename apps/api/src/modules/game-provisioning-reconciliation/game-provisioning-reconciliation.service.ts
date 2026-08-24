import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { GameAccountIdentity } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { GameAccountProvisioningService } from '../game-account-identity/game-account-provisioning.service'

// Phase 3D-B Part I/J/K/L. Calls only the two public, already-reviewed
// Phase 3D-A entry points (dispatch/reconcile) -- this file never talks to
// the command transport, the credential envelope, or MU SQL directly, and
// never touches game-account-identity.module.ts or its files. All new
// state this worker needs (attempt counts, backoff timing) lives in its
// own GameProvisioningAttempt table so nothing here requires editing a
// Phase 3D-A-owned model.
//
// Safety net for Part I's crash scenario: register() fires a best-effort
// dispatch() right after its transaction commits, but if that process
// dies before the call lands, the identity is left PENDING with no
// GameProvisioningAttempt row yet -- runOnce() below finds it (attempt
// count 0, no backoff wait) on its very next tick regardless.
const BACKOFF_SCHEDULE_MS = [0, 30_000, 120_000, 600_000, 1_800_000]
const MAX_AUTOMATIC_ATTEMPTS = 8
const STALE_PROVISIONING_THRESHOLD_MS = 5 * 60_000
const JITTER_RATIO = 0.2
const DEFAULT_INTERVAL_MS = 30_000

export type ReconciliationOutcome =
  | 'DISPATCHED'
  | 'RECONCILED_ACTIVE'
  | 'RECONCILED_FAILED'
  | 'RECONCILED_PENDING'
  | 'ERROR'

export interface ReconciliationTickResult {
  scanned: number
  acted: number
  skippedBackoff: number
  skippedAttemptCeiling: number
  errors: number
}

@Injectable()
export class GameProvisioningReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameProvisioningReconciliationService.name)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: GameAccountProvisioningService
  ) {}

  onModuleInit() {
    if (process.env.GAME_PROVISIONING_RECONCILIATION_ENABLED !== 'true') return
    const intervalMs = Number(process.env.GAME_PROVISIONING_RECONCILIATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => this.logger.error(`Reconciliation tick failed: ${safeMessage(error)}`))
    }, intervalMs)
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  // Part J -- finds PENDING, retryable FAILED, and stale PROVISIONING
  // identities and decides safely what to do with each, one at a time, in
  // isolation (one item's failure never stops the batch). Always acts via
  // the SAME provisioningRequestId already stored on the identity --
  // dispatch()/reconcile() enforce that themselves; this worker never
  // fabricates a new one.
  async runOnce(): Promise<ReconciliationTickResult> {
    const result: ReconciliationTickResult = { scanned: 0, acted: 0, skippedBackoff: 0, skippedAttemptCeiling: 0, errors: 0 }
    const candidates = await this.prisma.gameAccountIdentity.findMany({
      where: { provisioningStatus: { in: ['PENDING', 'PROVISIONING', 'FAILED'] } }
    })
    result.scanned = candidates.length

    for (const identity of candidates) {
      try {
        const acted = await this.considerOne(identity)
        if (acted === 'ACTED') result.acted++
        else if (acted === 'BACKOFF') result.skippedBackoff++
        else if (acted === 'CEILING') result.skippedAttemptCeiling++
      } catch (error) {
        result.errors++
        await this.logAttempt(identity, 'ERROR', safeMessage(error))
        this.logger.warn(`Reconciliation failed for account ${identity.accountId}: ${safeMessage(error)}`)
      }
    }
    return result
  }

  // Part AN -- the one manual admin action, deliberately narrow: it always
  // goes through dispatch()/reconcile() (never a raw command, never a new
  // provisioningRequestId), and it deliberately ignores automatic backoff
  // and the attempt ceiling -- an explicit human click is not the "don't
  // retry forever automatically" case Part L guards against, and Part M
  // requires the ability to reconcile later regardless of how many
  // automatic attempts already happened.
  async manualRetry(accountId: string): Promise<{ provisioningStatus: string }> {
    const identity = await this.prisma.gameAccountIdentity.findUnique({ where: { accountId } })
    if (!identity) throw new Error('GAME_ACCOUNT_IDENTITY_NOT_FOUND')
    if (identity.provisioningStatus === 'ACTIVE') return { provisioningStatus: 'ACTIVE' }

    const attemptsSoFar = await this.prisma.gameProvisioningAttempt.count({
      where: { provisioningRequestId: identity.provisioningRequestId }
    })

    // dispatch()/reconcile() can throw (e.g. the credential keyring or
    // transport isn't configured) -- logged as the same ERROR outcome
    // considerOne() uses, then re-thrown so the caller (the admin
    // controller) still reports the failure instead of a false success.
    try {
      if (identity.provisioningStatus === 'PROVISIONING') {
        const status = await this.provisioning.reconcile(accountId)
        const outcome: ReconciliationOutcome =
          status === 'SUCCEEDED' ? 'RECONCILED_ACTIVE' : status === 'FAILED_FINAL' || status === 'EXPIRED' ? 'RECONCILED_FAILED' : 'RECONCILED_PENDING'
        await this.logAttempt(identity, outcome, null, attemptsSoFar + 1)
      } else {
        await this.provisioning.dispatch(accountId)
        await this.logAttempt(identity, 'DISPATCHED', null, attemptsSoFar + 1)
      }
    } catch (error) {
      await this.logAttempt(identity, 'ERROR', safeMessage(error), attemptsSoFar + 1)
      throw error
    }

    const updated = await this.prisma.gameAccountIdentity.findUniqueOrThrow({ where: { accountId } })
    return { provisioningStatus: updated.provisioningStatus }
  }

  // Part AN -- safe fields only: account reference, status, attempt count,
  // timestamps, and the same structured errorCode GameAccountIdentity
  // already carries. Never the credential, ciphertext, or a raw SQL error.
  async listNeedingAttention() {
    const identities = await this.prisma.gameAccountIdentity.findMany({
      where: { provisioningStatus: { in: ['PENDING', 'PROVISIONING', 'FAILED'] } },
      orderBy: { createdAt: 'asc' }
    })
    return Promise.all(
      identities.map(async (identity) => ({
        accountId: identity.accountId,
        provisioningStatus: identity.provisioningStatus,
        attemptCount: await this.prisma.gameProvisioningAttempt.count({
          where: { provisioningRequestId: identity.provisioningRequestId }
        }),
        createdAt: identity.createdAt,
        lastAttemptAt: identity.lastAttemptAt,
        errorCode: identity.lastErrorCode
      }))
    )
  }

  private async considerOne(identity: GameAccountIdentity): Promise<'ACTED' | 'BACKOFF' | 'CEILING' | 'NOOP'> {
    const attempts = await this.prisma.gameProvisioningAttempt.findMany({
      where: { provisioningRequestId: identity.provisioningRequestId },
      orderBy: { attemptedAt: 'desc' },
      take: 1
    })
    const attemptsSoFar = await this.prisma.gameProvisioningAttempt.count({
      where: { provisioningRequestId: identity.provisioningRequestId }
    })
    const lastAttemptAt = attempts[0]?.attemptedAt ?? identity.createdAt
    const now = Date.now()

    if (identity.provisioningStatus === 'FAILED' && attemptsSoFar >= MAX_AUTOMATIC_ATTEMPTS) {
      return 'CEILING'
    }

    if (identity.provisioningStatus === 'PROVISIONING') {
      if (now - lastAttemptAt.getTime() < STALE_PROVISIONING_THRESHOLD_MS) return 'NOOP'
      const status = await this.provisioning.reconcile(identity.accountId)
      const outcome: ReconciliationOutcome =
        status === 'SUCCEEDED'
          ? 'RECONCILED_ACTIVE'
          : status === 'FAILED_FINAL' || status === 'EXPIRED'
            ? 'RECONCILED_FAILED'
            : 'RECONCILED_PENDING'
      await this.logAttempt(identity, outcome, null, attemptsSoFar + 1)
      return 'ACTED'
    }

    const delay = backoffDelayMs(attemptsSoFar)
    if (now - lastAttemptAt.getTime() < delay) return 'BACKOFF'

    await this.provisioning.dispatch(identity.accountId)
    await this.logAttempt(identity, 'DISPATCHED', null, attemptsSoFar + 1)
    return 'ACTED'
  }

  private async logAttempt(
    identity: GameAccountIdentity,
    outcome: ReconciliationOutcome,
    errorCode: string | null,
    attemptNumber?: number
  ) {
    const count = attemptNumber ?? (await this.prisma.gameProvisioningAttempt.count({
      where: { provisioningRequestId: identity.provisioningRequestId }
    })) + 1
    await this.prisma.gameProvisioningAttempt.create({
      data: {
        accountId: identity.accountId,
        provisioningRequestId: identity.provisioningRequestId,
        attemptNumber: count,
        outcome,
        errorCode: errorCode?.slice(0, 191) ?? null
      }
    })
  }
}

function backoffDelayMs(attemptsSoFar: number): number {
  const base = BACKOFF_SCHEDULE_MS[Math.min(attemptsSoFar, BACKOFF_SCHEDULE_MS.length - 1)]
  if (base === 0) return 0
  const jitter = base * JITTER_RATIO * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(base + jitter))
}

// Codex's dispatch()/reconcile() already throw safe, structured error codes
// (e.g. GAME_COMMAND_TRANSPORT_NOT_CONFIGURED, INVALID_LEGACY_LOGIN) rather
// than raw SQL/infra exceptions -- this just guards against an unexpected
// non-Error throw and caps length defensively before it's ever persisted.
function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 191)
}
