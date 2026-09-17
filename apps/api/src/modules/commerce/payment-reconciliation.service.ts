import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { ObservabilityService } from '../observability/observability.service'
import { CommerceService } from './commerce.service'
import { PaymentRiskService } from './payment-risk.service'

// PHASE O (2026-08-31), payment-readiness-contract.md Part 12
// ("Reconciliation... Do not rely only on webhooks"). Confirmed during
// this phase's own audit: no scheduled/cron reconciliation of any kind
// existed anywhere in this codebase before this file -- every prior
// "reconciliation" was either manual (the admin "Ressincronizar com
// Mercado Pago" button, commerce.service.ts's resyncRechargeFromProvider)
// or scoped to VIP only (VipDeliveryService.reconcileEntitlements()).
// Mirrors the exact setInterval + MySQL GET_LOCK + *_ENABLED-flag pattern
// already proven in vip-sync.service.ts / game-provisioning-reconciliation.service.ts
// -- this project does not use @Cron anywhere (confirmed by a real search),
// so this follows the established convention rather than introducing a
// new one.
//
// Deliberately does NOT call the Mercado Pago API itself -- that's what
// the existing manual resync button is for, and a scheduled job making
// real outbound provider calls on every tick is a materially different
// (and riskier) capability than what this phase can safely build and
// verify without live sandbox credentials (see
// docs/payments/mercado-pago-sandbox-qa-blocker.md). This job is a pure,
// local DB-consistency check: does every PAID RechargeIntent have the
// WC_PURCHASE_CREDIT ledger row it should always have (per
// transitionRechargeStatus's own atomic transaction), and has any
// RechargeIntent been stuck in a non-terminal state for an anomalously
// long time (a candidate for a human to manually resync). It only
// DETECTS and REPORTS -- it never auto-corrects anything, matching every
// other reconciliation job in this codebase (VipDeliveryService's own
// reconcileEntitlements() has the identical "detect, never auto-fix"
// design and the identical reasoning: there is nothing safe to
// auto-correct without a human decision).
const DEFAULT_INTERVAL_MS = 5 * 60_000
const RECONCILIATION_LOCK_NAME = 'bloodmoon:payment-reconciliation'
const STUCK_NON_TERMINAL_THRESHOLD_MS = 60 * 60_000

// PHASE P (2026-08-31), Part 13 -- a SEPARATE, independently-gated
// mechanism from the local-only check above. Deliberately does not run by
// default and does not share the local reconciliation's lock/timer --
// this one makes REAL outbound Mercado Pago calls, which ADR-0018
// (Phase O) explicitly deferred until sandbox credentials existed to
// verify it against. Building it now (Phase P) satisfies "the mechanism
// itself must exist, rate-limited/idempotent/observable/retry-safe" --
// but MERCADO_PAGO_PROVIDER_POLL_ENABLED stays unset/false in every real
// environment until that verification actually happens.
// SANDBOX_VALIDATION_REQUIRED.
const PROVIDER_POLL_LOCK_NAME = 'bloodmoon:payment-provider-poll'
const DEFAULT_PROVIDER_POLL_INTERVAL_MS = 10 * 60_000
const DEFAULT_PROVIDER_POLL_BATCH_SIZE = 20
// Rate-limiting: never re-poll a record that changed status (updatedAt)
// more recently than this -- avoids hammering the provider for something
// that just moved.
const PROVIDER_POLL_MIN_AGE_MS = 5 * 60_000
// A small delay between individual provider calls within one batch -- a
// real outbound API deserves pacing, not a tight loop.
const PROVIDER_POLL_INTER_CALL_DELAY_MS = 250

export interface ProviderPollResult {
  enabled: boolean
  candidates: number
  polled: number
  failed: number
}

export interface PaymentReconciliationRow {
  rechargeIntentId: string
  accountId: string
  issue: 'PAID_WITHOUT_LEDGER_CREDIT' | 'STUCK_NON_TERMINAL'
  status: string
  detail: string
  createdAt: string
}

export interface PaymentReconciliationTickResult {
  scanned: number
  anomalies: number
}

@Injectable()
export class PaymentReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReconciliationService.name)
  private timer: ReturnType<typeof setInterval> | null = null
  private providerPollTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly paymentRisk: PaymentRiskService,
    private readonly commerce: CommerceService
  ) {}

  onModuleInit() {
    if (process.env.PAYMENT_RECONCILIATION_ENABLED === 'true') {
      const intervalMs = Number(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS) || DEFAULT_INTERVAL_MS
      this.timer = setInterval(() => {
        void this.runOnce().catch((error) => this.logger.error(`Payment reconciliation tick failed: ${safeMessage(error)}`))
      }, intervalMs)
      this.timer.unref?.()
    }

    if (process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED === 'true') {
      const intervalMs = Number(process.env.MERCADO_PAGO_PROVIDER_POLL_INTERVAL_MS) || DEFAULT_PROVIDER_POLL_INTERVAL_MS
      this.providerPollTimer = setInterval(() => {
        void this.pollProviderForStuckPayments().catch((error) => this.logger.error(`Provider poll tick failed: ${safeMessage(error)}`))
      }, intervalMs)
      this.providerPollTimer.unref?.()
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
    if (this.providerPollTimer) clearInterval(this.providerPollTimer)
  }

  async runOnce(): Promise<PaymentReconciliationTickResult> {
    return this.withReconciliationLock(
      () => this.runOnceWithLock(),
      () => ({ scanned: 0, anomalies: 0 })
    )
  }

  private async runOnceWithLock(): Promise<PaymentReconciliationTickResult> {
    const rows = await this.findAnomalies()
    for (const row of rows) {
      await this.observability.recordOperationalEvent({
        module: 'store',
        severity: 'CRITICAL',
        eventType: row.issue === 'PAID_WITHOUT_LEDGER_CREDIT' ? 'PAYMENT_RECONCILIATION_MISSING_CREDIT' : 'PAYMENT_RECONCILIATION_STUCK_NON_TERMINAL',
        entityType: 'RechargeIntent',
        entityId: row.rechargeIntentId,
        description: row.detail,
        data: { accountId: row.accountId, status: row.status }
      })
      // PHASE P (2026-08-31): a reconciliation anomaly is real evidence of
      // a delivery/payment inconsistency -- feeds the antifraud
      // foundation's DELIVERY_ANOMALY signal type. Wrapped so a risk-
      // service failure never breaks the reconciliation tick itself.
      try {
        await this.paymentRisk.evaluateOnDeliveryAnomaly(row)
      } catch (error) {
        this.logger.error(`Failed to record DELIVERY_ANOMALY risk signal for ${row.rechargeIntentId}: ${safeMessage(error)}`)
      }
    }
    return { scanned: rows.length, anomalies: rows.length }
  }

  // Read-only, real-time (not from the last scheduled tick) -- for the
  // admin reconciliation report endpoint, so an admin viewing the report
  // never sees a stale result just because the last tick hasn't run yet.
  async findAnomalies(): Promise<PaymentReconciliationRow[]> {
    const rows: PaymentReconciliationRow[] = []

    // PAID_WITHOUT_LEDGER_CREDIT: transitionRechargeStatus credits the
    // ledger in the SAME transaction as the PAID status write, so under
    // correct code this should never actually find anything -- that's
    // exactly the point of a reconciliation check: it exists to catch
    // this invariant being violated for any reason (a future code
    // regression, a direct DB edit, a partial rollback edge case this
    // phase didn't anticipate), not because it's expected to fire today.
    const paidRecharges = await this.prisma.rechargeIntent.findMany({
      where: { status: 'PAID' },
      select: { id: true, accountId: true, status: true, createdAt: true }
    })
    if (paidRecharges.length > 0) {
      const credited = await this.prisma.walletLedgerEntry.findMany({
        where: { sourceType: 'RechargeIntent', sourceId: { in: paidRecharges.map((r) => r.id) }, type: 'WC_PURCHASE_CREDIT' },
        select: { sourceId: true }
      })
      const creditedIds = new Set(credited.map((c) => c.sourceId))
      for (const recharge of paidRecharges) {
        if (!creditedIds.has(recharge.id)) {
          rows.push({
            rechargeIntentId: recharge.id,
            accountId: recharge.accountId,
            issue: 'PAID_WITHOUT_LEDGER_CREDIT',
            status: recharge.status,
            detail: `RechargeIntent ${recharge.id} is PAID but has no matching WC_PURCHASE_CREDIT ledger row -- a player may have paid without receiving WC.`,
            createdAt: recharge.createdAt.toISOString()
          })
        }
      }
    }

    // STUCK_NON_TERMINAL: a recharge that's been PENDING/PROCESSING/
    // MANUAL_REVIEW for over an hour is a real candidate for the existing
    // manual "Ressincronizar com Mercado Pago" action -- this job only
    // surfaces the candidate, an admin still decides and clicks resync.
    const stuckSince = new Date(Date.now() - STUCK_NON_TERMINAL_THRESHOLD_MS)
    const stuck = await this.prisma.rechargeIntent.findMany({
      where: { status: { in: ['PENDING', 'PROCESSING', 'MANUAL_REVIEW'] }, createdAt: { lt: stuckSince } },
      select: { id: true, accountId: true, status: true, createdAt: true }
    })
    for (const recharge of stuck) {
      rows.push({
        rechargeIntentId: recharge.id,
        accountId: recharge.accountId,
        issue: 'STUCK_NON_TERMINAL',
        status: recharge.status,
        detail: `RechargeIntent ${recharge.id} has been ${recharge.status} for over an hour -- consider resyncing with Mercado Pago.`,
        createdAt: recharge.createdAt.toISOString()
      })
    }

    return rows
  }

  // PHASE P (2026-08-31), Part 13 -- the provider-polling mechanism.
  // Rate-limited (PROVIDER_POLL_MIN_AGE_MS + capped batch size),
  // idempotent (reconcileFromProviderPoll -> reconcileWithProvider ->
  // transitionRechargeStatus, the exact same idempotent state machine
  // every other reconciliation path already uses -- a record already at
  // its correct status is a same-status no-op), observable (one
  // operational event per candidate plus a summary), retry-safe (a
  // failure on one candidate never blocks the rest of the batch, and the
  // record simply becomes a candidate again on the next tick since its
  // status/updatedAt didn't change). Returns `{enabled: false, ...}`
  // rather than throwing when the feature flag is off, so an admin
  // dashboard can display "external verification pending" instead of an
  // error.
  async pollProviderForStuckPayments(): Promise<ProviderPollResult> {
    if (process.env.MERCADO_PAGO_PROVIDER_POLL_ENABLED !== 'true') {
      return { enabled: false, candidates: 0, polled: 0, failed: 0 }
    }
    return this.withNamedLock(
      PROVIDER_POLL_LOCK_NAME,
      () => this.pollProviderForStuckPaymentsWithLock(),
      () => ({ enabled: true, candidates: 0, polled: 0, failed: 0 })
    )
  }

  private async pollProviderForStuckPaymentsWithLock(): Promise<ProviderPollResult> {
    const batchSize = Number(process.env.MERCADO_PAGO_PROVIDER_POLL_BATCH_SIZE) || DEFAULT_PROVIDER_POLL_BATCH_SIZE
    const notPolledSince = new Date(Date.now() - PROVIDER_POLL_MIN_AGE_MS)

    // Priority order matches Part 13's own list: pending/in_review first
    // (most likely to have actually changed), then refund-pending and
    // manual-review (which covers the chargeback/dispute case -- see
    // ChargebackCaseService) last, since those need a human regardless of
    // what the poll finds.
    const candidates = await this.prisma.rechargeIntent.findMany({
      where: {
        provider: 'mercadopago',
        externalOrderId: { not: null },
        updatedAt: { lt: notPolledSince },
        status: { in: ['PENDING', 'PROCESSING', 'REFUND_PENDING', 'MANUAL_REVIEW'] }
      },
      select: { id: true, status: true },
      orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }],
      take: batchSize
    })

    let polled = 0
    let failed = 0
    for (const candidate of candidates) {
      try {
        await this.commerce.reconcileFromProviderPoll(candidate.id)
        polled += 1
      } catch (error) {
        failed += 1
        await this.observability.recordOperationalEvent({
          module: 'store',
          severity: 'CRITICAL',
          eventType: 'PAYMENT_PROVIDER_POLL_FAILED',
          entityType: 'RechargeIntent',
          entityId: candidate.id,
          description: `Falha ao consultar o Mercado Pago para a recarga ${candidate.id} durante a reconciliacao automatica.`,
          data: { error: safeMessage(error) }
        })
      }
      if (candidates.length > 1) await sleep(PROVIDER_POLL_INTER_CALL_DELAY_MS)
    }

    await this.observability.recordOperationalEvent({
      module: 'store',
      eventType: 'PAYMENT_PROVIDER_POLL_COMPLETED',
      entityType: 'RechargeIntent',
      description: `Reconciliacao com o provedor: ${polled} consultadas, ${failed} falharam, de ${candidates.length} candidatas.`,
      data: { candidates: candidates.length, polled, failed }
    })

    return { enabled: true, candidates: candidates.length, polled, failed }
  }

  // Same MySQL named-lock pattern as vip-sync.service.ts / vip-delivery.service.ts
  // -- see either for the full rationale. Generalized to accept a lock
  // name so the local-only tick and the provider-polling tick (Phase P)
  // never contend for the same lock unnecessarily.
  private async withNamedLock<T>(lockName: string, work: () => Promise<T>, whenBusy: () => T): Promise<T> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) throw new Error('DATABASE_URL_NOT_CONFIGURED')

    const lockUrl = new URL(databaseUrl)
    lockUrl.searchParams.set('connection_limit', '1')
    const lockClient = new PrismaClient({ datasources: { db: { url: lockUrl.toString() } } })
    let acquired = false

    try {
      await lockClient.$connect()
      const rows = await lockClient.$queryRaw<Array<{ acquired: number | bigint | null }>>`
        SELECT GET_LOCK(${lockName}, 0) AS acquired
      `
      if (Number(rows[0]?.acquired ?? 0) !== 1) return whenBusy()
      acquired = true

      return await work()
    } finally {
      if (acquired) {
        await lockClient.$queryRaw`
          SELECT RELEASE_LOCK(${lockName})
        `
      }
      await lockClient.$disconnect()
    }
  }

  private async withReconciliationLock<T>(work: () => Promise<T>, whenBusy: () => T): Promise<T> {
    return this.withNamedLock(RECONCILIATION_LOCK_NAME, work, whenBusy)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Error.message may include a provider response or a future caller's PII.
// Operational logs retain only a small allowlist of exception classes and
// Prisma's non-sensitive error code, never arbitrary message text.
export function safeMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return /^P\d{4}$/.test(error.code) ? `Prisma:${error.code}` : 'PrismaError'
  }
  if (!(error instanceof Error)) return 'UnknownError'
  return [
    'AbortError', 'BadRequestException', 'ConflictException',
    'NotFoundException', 'ServiceUnavailableException', 'TimeoutError'
  ].includes(error.name) ? error.name : 'Error'
}
