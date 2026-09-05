import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, PaymentRiskAction, PaymentRiskSeverity, PaymentRiskSignalType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'

// PHASE P (2026-08-31): payment antifraud FOUNDATION -- explicit,
// auditable signals with a human-readable `reason` on every row, never an
// opaque score. Detectors below are pure, deterministic, threshold-based
// checks against real data already in this schema (RechargeIntent history,
// ChargebackCase count, PaymentReconciliation anomalies) -- no ML, no
// invented data. Six of the eleven PaymentRiskSignalType values are wired
// to a real call site here; the remaining five (IMMEDIATE_WCOIN_TRANSFER/
// NEAR_FULL_BALANCE_TRANSFER/MANY_RECIPIENTS_AFTER_PURCHASE/
// REPEATED_RECIPIENT_NETWORK/PAYMENT_ACCOUNT_MISMATCH) are real, valid
// enum members but have no detector call site yet -- see
// docs/decisions/0019-payment-risk-and-chargeback-case-model.md.
//
// Signals never take action on their own. The only enforcement in this
// file (PHASE Q, 2026-08-31: PAYMENT_RESTRICTION/TRANSFER_RESTRICTION/
// ACCOUNT_RESTRICTION, see assertNoActive*() below) reads an action a
// human already applied to a case -- a signal firing never restricts
// anything by itself.
//
// PHASE Q (2026-08-31), Part 4/7: IMMEDIATE_WCOIN_TRANSFER/
// NEAR_FULL_BALANCE_TRANSFER/MANY_RECIPIENTS_AFTER_PURCHASE/
// REPEATED_RECIPIENT_NETWORK are now wired -- see
// wallet-transfer.service.ts's evaluateTransferRiskSignals(), the new
// direct-WC-transfer feature this phase built specifically because these
// signals had no real P2P movement to observe before.
//
// PAYMENT_ACCOUNT_MISMATCH remains UNSUPPORTED (Part 8, checked this
// phase): Mercado Pago's real Orders API response (`MercadoPagoOrderResponse`,
// mercadopago.types.ts) does not return any payer identifier at all on
// GET/webhook -- `payer: {email}` is only ever sent in the CREATE
// request body, never echoed back. There is no reliable field to compare
// against the account's registered email, and this codebase does not use
// fragile proxies (payer display name, etc.) for a fraud signal. See
// docs/open-questions.md OQ-023.

const NEW_ACCOUNT_AGE_HOURS = Number(process.env.RISK_NEW_ACCOUNT_AGE_HOURS) || 24
const HIGH_VALUE_BRL_THRESHOLD = Number(process.env.RISK_HIGH_VALUE_BRL_THRESHOLD) || 200
const MULTIPLE_FAILED_PAYMENTS_THRESHOLD = Number(process.env.RISK_MULTIPLE_FAILED_PAYMENTS_THRESHOLD) || 3
const MULTIPLE_FAILED_PAYMENTS_WINDOW_HOURS = Number(process.env.RISK_MULTIPLE_FAILED_PAYMENTS_WINDOW_HOURS) || 24
const RAPID_PURCHASE_COUNT_THRESHOLD = Number(process.env.RISK_RAPID_PURCHASE_COUNT_THRESHOLD) || 3
const RAPID_PURCHASE_WINDOW_MINUTES = Number(process.env.RISK_RAPID_PURCHASE_WINDOW_MINUTES) || 10

export interface RecordSignalInput {
  accountId: string | null
  signalType: PaymentRiskSignalType
  severity: PaymentRiskSeverity
  reason: string
  evidence?: Record<string, unknown>
  sourceType?: string
  sourceId?: string
}

const severityRank: Record<PaymentRiskSeverity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
}

@Injectable()
export class PaymentRiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService
  ) {}

  // ---- Detectors (called from commerce.service.ts / payment-reconciliation.service.ts) ----

  // `paidAt` is the payment CONFIRMATION timestamp (when this hook fires,
  // i.e. now) -- deliberately not the RechargeIntent's own createdAt,
  // since an intent can sit PENDING for a while before actually being
  // confirmed PAID; "how old was this account when the money actually
  // moved" is the semantically correct question for this signal.
  async evaluateOnRechargePaid(recharge: { id: string; accountId: string; amountBRL: number; paidAt: Date }) {
    const account = await this.prisma.account.findUnique({ where: { id: recharge.accountId }, select: { createdAt: true } })
    if (!account) return

    const accountAgeHours = (recharge.paidAt.getTime() - account.createdAt.getTime()) / 3_600_000
    if (accountAgeHours <= NEW_ACCOUNT_AGE_HOURS && recharge.amountBRL >= HIGH_VALUE_BRL_THRESHOLD) {
      await this.recordSignal({
        accountId: recharge.accountId,
        signalType: 'NEW_ACCOUNT_HIGH_VALUE_PURCHASE',
        severity: 'MEDIUM',
        reason: `Conta criada ha ${accountAgeHours.toFixed(1)}h realizou uma recarga de R$${recharge.amountBRL.toFixed(2)} (limite configurado: R$${HIGH_VALUE_BRL_THRESHOLD}).`,
        evidence: { accountAgeHours: Number(accountAgeHours.toFixed(2)), amountBRL: recharge.amountBRL, thresholdBRL: HIGH_VALUE_BRL_THRESHOLD },
        sourceType: 'RechargeIntent',
        sourceId: recharge.id
      })
    }

    const windowStart = new Date(recharge.paidAt.getTime() - RAPID_PURCHASE_WINDOW_MINUTES * 60_000)
    const recentPaidCount = await this.prisma.rechargeIntent.count({
      where: { accountId: recharge.accountId, status: 'PAID', approvedAt: { gte: windowStart } }
    })
    if (recentPaidCount >= RAPID_PURCHASE_COUNT_THRESHOLD) {
      await this.recordSignal({
        accountId: recharge.accountId,
        signalType: 'RAPID_PURCHASE_SEQUENCE',
        severity: recentPaidCount >= RAPID_PURCHASE_COUNT_THRESHOLD * 2 ? 'HIGH' : 'LOW',
        reason: `${recentPaidCount} recargas aprovadas em ${RAPID_PURCHASE_WINDOW_MINUTES} minutos (limite configurado: ${RAPID_PURCHASE_COUNT_THRESHOLD}).`,
        evidence: { count: recentPaidCount, windowMinutes: RAPID_PURCHASE_WINDOW_MINUTES, threshold: RAPID_PURCHASE_COUNT_THRESHOLD },
        sourceType: 'RechargeIntent',
        sourceId: recharge.id
      })
    }
  }

  async evaluateOnRechargeFailed(recharge: { id: string; accountId: string; createdAt: Date }) {
    const windowStart = new Date(recharge.createdAt.getTime() - MULTIPLE_FAILED_PAYMENTS_WINDOW_HOURS * 3_600_000)
    const failedCount = await this.prisma.rechargeIntent.count({
      where: { accountId: recharge.accountId, status: 'FAILED', updatedAt: { gte: windowStart } }
    })
    if (failedCount >= MULTIPLE_FAILED_PAYMENTS_THRESHOLD) {
      await this.recordSignal({
        accountId: recharge.accountId,
        signalType: 'MULTIPLE_FAILED_PAYMENTS',
        severity: failedCount >= MULTIPLE_FAILED_PAYMENTS_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
        reason: `${failedCount} pagamentos falharam nas ultimas ${MULTIPLE_FAILED_PAYMENTS_WINDOW_HOURS}h (limite configurado: ${MULTIPLE_FAILED_PAYMENTS_THRESHOLD}).`,
        evidence: { count: failedCount, windowHours: MULTIPLE_FAILED_PAYMENTS_WINDOW_HOURS, threshold: MULTIPLE_FAILED_PAYMENTS_THRESHOLD },
        sourceType: 'RechargeIntent',
        sourceId: recharge.id
      })
    }
  }

  // reason is RechargeIntent.manualReviewReason -- excludes the
  // charged_back: prefix path, which goes through evaluateOnChargeback
  // instead so the same event is never signalled under two types.
  async evaluateOnManualReview(recharge: { id: string; accountId: string }, reason: string | undefined) {
    if (reason?.startsWith('charged_back:')) return
    await this.recordSignal({
      accountId: recharge.accountId,
      signalType: 'PROVIDER_REVIEW_STATE',
      severity: 'LOW',
      reason: `Recarga ${recharge.id} colocada em revisao manual pelo provedor/reconciliacao (motivo: ${reason || 'nao informado'}).`,
      evidence: { reason: reason || null },
      sourceType: 'RechargeIntent',
      sourceId: recharge.id
    })
  }

  async evaluateOnChargeback(recharge: { id: string; accountId: string }) {
    const priorCount = await this.prisma.chargebackCase.count({ where: { accountId: recharge.accountId } })
    // priorCount includes the case just created by ChargebackCaseService
    // for THIS event (created before this call) -- so 1 means "first ever."
    await this.recordSignal({
      accountId: recharge.accountId,
      signalType: 'REPEATED_CHARGEBACK',
      severity: priorCount >= 2 ? 'HIGH' : 'MEDIUM',
      reason: priorCount >= 2
        ? `Chargeback numero ${priorCount} desta conta -- padrao repetido.`
        : `Primeiro chargeback registrado desta conta.`,
      evidence: { chargebackCount: priorCount },
      sourceType: 'RechargeIntent',
      sourceId: recharge.id
    })
  }

  async evaluateOnDeliveryAnomaly(row: { rechargeIntentId: string; accountId: string; issue: string; detail: string }) {
    await this.recordSignal({
      accountId: row.accountId,
      signalType: 'DELIVERY_ANOMALY',
      severity: 'MEDIUM',
      reason: row.detail,
      evidence: { issue: row.issue },
      sourceType: 'RechargeIntent',
      sourceId: row.rechargeIntentId
    })
  }

  // ---- Signal recording + case aggregation ----

  async recordSignal(input: RecordSignalInput) {
    const signal = await this.prisma.$transaction(async (tx) => {
      let riskCaseId: string | null = null

      if (input.accountId) {
        const openCase = await tx.paymentRiskCase.findFirst({
          where: { accountId: input.accountId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
          orderBy: { openedAt: 'desc' }
        })

        if (openCase) {
          riskCaseId = openCase.id
          if (severityRank[input.severity] > severityRank[openCase.highestSeverity]) {
            await tx.paymentRiskCase.update({ where: { id: openCase.id }, data: { highestSeverity: input.severity } })
          }
        } else {
          const created = await tx.paymentRiskCase.create({
            data: {
              accountId: input.accountId,
              status: 'OPEN',
              highestSeverity: input.severity,
              summary: `Caso aberto automaticamente pelo sinal ${input.signalType}.`
            }
          })
          riskCaseId = created.id
        }
      }

      return tx.paymentRiskSignal.create({
        data: {
          accountId: input.accountId,
          signalType: input.signalType,
          severity: input.severity,
          reason: input.reason,
          evidence: input.evidence ? (input.evidence as Prisma.InputJsonValue) : undefined,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          riskCaseId
        }
      })
    })

    await this.observability.recordOperationalEvent({
      module: 'payment-risk',
      severity: input.severity === 'CRITICAL' || input.severity === 'HIGH' ? 'CRITICAL' : undefined,
      eventType: 'PAYMENT_RISK_SIGNAL_RECORDED',
      entityType: 'PaymentRiskSignal',
      entityId: signal.id,
      targetUserId: input.accountId ?? undefined,
      description: input.reason,
      data: { signalType: input.signalType, severity: input.severity, riskCaseId: signal.riskCaseId }
    })

    return signal
  }

  // ---- Enforcement (the ONE place a risk case actually blocks something this phase) ----

  // PHASE Q (2026-08-31), Part 6 -- centralized enforcement, three
  // distinct restriction types, never overlapping/duplicated checks:
  //   PAYMENT_RESTRICTION   -> cannot initiate a new real-money payment
  //   TRANSFER_RESTRICTION  -> cannot initiate an eligible P2P WC movement
  //   ACCOUNT_RESTRICTION   -> broader commercial/security hold (payment
  //                            creation, WC transfer, VIP purchase, store
  //                            purchase -- never login/game access)
  // All three share the same underlying query shape (an un-lifted
  // PaymentRiskCaseAction of that type on any of the account's cases) --
  // kept as one small private helper so a future 4th restriction type
  // extends this pattern instead of copy-pasting the query.
  private async hasActiveAction(accountId: string, action: PaymentRiskAction): Promise<boolean> {
    const activeRestriction = await this.prisma.paymentRiskCaseAction.findFirst({
      where: { action, liftedAt: null, riskCase: { accountId } }
    })
    return Boolean(activeRestriction)
  }

  async assertNoActivePaymentRestriction(accountId: string): Promise<void> {
    if (await this.hasActiveAction(accountId, 'PAYMENT_RESTRICTION')) {
      throw new ForbiddenException({
        code: 'PAYMENT_RESTRICTION_ACTIVE',
        message: 'Novas compras estao temporariamente indisponiveis para esta conta.'
      })
    }
  }

  async assertNoActiveTransferRestriction(accountId: string): Promise<void> {
    if (await this.hasActiveAction(accountId, 'TRANSFER_RESTRICTION')) {
      throw new ForbiddenException({
        code: 'TRANSFER_RESTRICTION_ACTIVE',
        message: 'Transferencias de WC estao temporariamente indisponiveis para esta conta.'
      })
    }
  }

  // `context` is included in the audit-observability trail only (which
  // commercial action was actually blocked) -- the player-facing message
  // stays the same generic, minimal text regardless, per Part 10's
  // "do not expose internal detail" rule.
  async assertNoActiveAccountRestriction(accountId: string, context: string): Promise<void> {
    if (await this.hasActiveAction(accountId, 'ACCOUNT_RESTRICTION')) {
      await this.observability.recordOperationalEvent({
        module: 'payment-risk',
        eventType: 'ACCOUNT_RESTRICTION_BLOCKED_ATTEMPT',
        entityType: 'Account',
        entityId: accountId,
        targetUserId: accountId,
        description: `Tentativa de ${context} bloqueada por restricao de conta ativa.`,
        data: { context }
      })
      throw new ForbiddenException({
        code: 'ACCOUNT_RESTRICTION_ACTIVE',
        message: 'Algumas operacoes da conta estao temporariamente restritas. Entre em contato com o suporte.'
      })
    }
  }

  // Real-time status summary for the admin Risk UI (Part 9) -- "no hidden
  // state," every currently-active restriction on an account visible in
  // one call, each with who/when/why/linked case.
  async getActiveRestrictions(accountId: string) {
    const actions = await this.prisma.paymentRiskCaseAction.findMany({
      where: {
        action: { in: ['PAYMENT_RESTRICTION', 'TRANSFER_RESTRICTION', 'ACCOUNT_RESTRICTION'] },
        liftedAt: null,
        riskCase: { accountId }
      },
      orderBy: { performedAt: 'desc' }
    })
    return actions.map((action) => ({
      id: action.id,
      action: action.action,
      reason: action.reason,
      performedByUsername: action.performedByUsername,
      performedAt: action.performedAt.toISOString(),
      riskCaseId: action.riskCaseId
    }))
  }

  // ---- Admin read/manage surface ----

  async listCases(query: { status?: string; accountId?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25))
    const where: Prisma.PaymentRiskCaseWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {})
    }
    const [total, items] = await Promise.all([
      this.prisma.paymentRiskCase.count({ where }),
      this.prisma.paymentRiskCase.findMany({
        where,
        include: { account: { select: { username: true, email: true } }, signals: true, actions: true },
        orderBy: [{ openedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])
    return {
      data: items.map((item) => this.mapCase(item)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async getCase(id: string) {
    const item = await this.prisma.paymentRiskCase.findUnique({
      where: { id },
      include: { account: { select: { username: true, email: true } }, signals: { orderBy: { detectedAt: 'desc' } }, actions: { orderBy: { performedAt: 'desc' } } }
    })
    if (!item) throw new NotFoundException(`Risk case not found: ${id}`)
    return this.mapCase(item)
  }

  async applyAction(caseId: string, action: PaymentRiskAction, reason: string, user: AuthenticatedUser) {
    if (!reason?.trim()) throw new BadRequestException('Informe um motivo para esta acao.')
    const riskCase = await this.prisma.paymentRiskCase.findUnique({ where: { id: caseId } })
    if (!riskCase) throw new NotFoundException(`Risk case not found: ${caseId}`)

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.paymentRiskCaseAction.create({
        data: {
          riskCaseId: caseId,
          action,
          reason: reason.trim(),
          performedByAccountId: user.id,
          performedByUsername: user.username
        }
      })
      if (riskCase.status === 'OPEN') {
        await tx.paymentRiskCase.update({ where: { id: caseId }, data: { status: 'UNDER_REVIEW' } })
      }
      return record
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.finance.risk-case.action',
      targetType: 'PaymentRiskCase',
      targetId: caseId,
      reason: reason.trim(),
      metadata: { action, targetAccountId: riskCase.accountId }
    })
    await this.observability.recordOperationalEvent({
      module: 'payment-risk',
      eventType: 'PAYMENT_RISK_ACTION_APPLIED',
      entityType: 'PaymentRiskCase',
      entityId: caseId,
      actorUserId: user.id,
      targetUserId: riskCase.accountId ?? undefined,
      description: `Acao ${action} aplicada ao caso ${caseId}.`,
      data: { action, reason: reason.trim() }
    })

    return created
  }

  async liftAction(actionId: string, user: AuthenticatedUser) {
    const record = await this.prisma.paymentRiskCaseAction.findUnique({ where: { id: actionId } })
    if (!record) throw new NotFoundException(`Risk case action not found: ${actionId}`)
    if (record.liftedAt) return record

    const updated = await this.prisma.paymentRiskCaseAction.update({
      where: { id: actionId },
      data: { liftedAt: new Date(), liftedByAccountId: user.id }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.finance.risk-case.action-lifted',
      targetType: 'PaymentRiskCaseAction',
      targetId: actionId,
      metadata: { action: record.action, riskCaseId: record.riskCaseId }
    })

    return updated
  }

  async resolveCase(caseId: string, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED', resolution: string, user: AuthenticatedUser) {
    if (!resolution?.trim()) throw new BadRequestException('Informe a resolucao deste caso.')
    const riskCase = await this.prisma.paymentRiskCase.findUnique({ where: { id: caseId } })
    if (!riskCase) throw new NotFoundException(`Risk case not found: ${caseId}`)
    if (riskCase.status === 'CLOSED') throw new BadRequestException('Este caso ja esta encerrado.')

    const updated = await this.prisma.paymentRiskCase.update({
      where: { id: caseId },
      data: { status, resolution: resolution.trim(), resolvedAt: new Date(), resolvedByAccountId: user.id }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.finance.risk-case.resolved',
      targetType: 'PaymentRiskCase',
      targetId: caseId,
      reason: resolution.trim(),
      metadata: { previousStatus: riskCase.status, nextStatus: status }
    })

    return this.mapCase({ ...updated, account: null, signals: [], actions: [] } as never)
  }

  private mapCase(item: Prisma.PaymentRiskCaseGetPayload<{ include: { account: { select: { username: true; email: true } }; signals: true; actions: true } }>) {
    return {
      id: item.id,
      accountId: item.accountId,
      username: item.account?.username ?? null,
      status: item.status,
      highestSeverity: item.highestSeverity,
      summary: item.summary,
      reviewNotes: item.reviewNotes,
      resolution: item.resolution,
      openedAt: item.openedAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString() || null,
      signals: item.signals.map((signal) => ({
        id: signal.id,
        signalType: signal.signalType,
        severity: signal.severity,
        reason: signal.reason,
        evidence: signal.evidence,
        sourceType: signal.sourceType,
        sourceId: signal.sourceId,
        detectedAt: signal.detectedAt.toISOString()
      })),
      actions: item.actions.map((action) => ({
        id: action.id,
        action: action.action,
        reason: action.reason,
        performedByUsername: action.performedByUsername,
        performedAt: action.performedAt.toISOString(),
        liftedAt: action.liftedAt?.toISOString() || null
      }))
    }
  }
}
