import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import {
  asaasInvalidWebhookAuthThreshold,
  asaasInvalidWebhookAuthWindowMs,
  asaasManualReviewAgeMs,
  asaasOperationalAlertIntervalMs,
  asaasProvider5xxThreshold,
  asaasProvider5xxWindowMs,
  asaasReconcileRequiredAgeMs,
  isAsaasOperationalAlertingEnabled
} from './alerting.env'

type GateKey = 'provider-5xx' | 'invalid-webhook-auth' | 'reconcile-required-age' | 'manual-review-age'

interface GateCondition {
  key: GateKey
  active: boolean
  title: string
  message: string
  metadata: Record<string, string | number>
}

export interface AsaasOperationalAlertResult {
  evaluated: number
  active: number
  opened: number
  recovered: number
}

// Phase 7G -- evaluates Asaas operational gates entirely from durable rows.
// Rolling windows use OperationalEvent.occurredAt; age gates use the payment
// records themselves. A stable source key gives one alert per condition, and
// AlertDispatchState retains outbound cooldown state across process restarts.
@Injectable()
export class AsaasOperationalAlertService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsaasOperationalAlertService.name)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!isAsaasOperationalAlertingEnabled()) return
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => this.logger.error('ASAAS_OPERATIONAL_ALERT_SWEEP_FAILED'))
    }, asaasOperationalAlertIntervalMs())
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(now = new Date()): Promise<AsaasOperationalAlertResult> {
    const providerWindowStart = new Date(now.getTime() - asaasProvider5xxWindowMs())
    const authWindowStart = new Date(now.getTime() - asaasInvalidWebhookAuthWindowMs())
    const reconcileBefore = new Date(now.getTime() - asaasReconcileRequiredAgeMs())
    const reviewBefore = new Date(now.getTime() - asaasManualReviewAgeMs())

    const [provider5xx, invalidAuth, reconcileRequired, reviewRecharges, reviewEvents] = await Promise.all([
      this.prisma.operationalEvent.count({
        where: { module: 'payments', eventType: 'ASAAS_PROVIDER_5XX', occurredAt: { gte: providerWindowStart, lte: now } }
      }),
      this.prisma.operationalEvent.count({
        where: { module: 'store', eventType: 'ASAAS_WEBHOOK_AUTH_REJECTED', occurredAt: { gte: authWindowStart, lte: now } }
      }),
      this.prisma.rechargeIntent.count({
        where: { provider: 'asaas', providerCreateState: 'RECONCILE_REQUIRED', updatedAt: { lt: reconcileBefore } }
      }),
      this.prisma.rechargeIntent.count({
        where: { provider: 'asaas', status: 'MANUAL_REVIEW', updatedAt: { lt: reviewBefore } }
      }),
      this.prisma.paymentWebhookEvent.count({
        where: {
          provider: 'asaas', status: 'MANUAL_REVIEW',
          OR: [
            { lastErrorAt: { lt: reviewBefore } },
            { lastErrorAt: null, receivedAt: { lt: reviewBefore } }
          ]
        }
      })
    ])

    const manualReview = reviewRecharges + reviewEvents
    const conditions: GateCondition[] = [
      {
        key: 'provider-5xx', active: provider5xx >= asaasProvider5xxThreshold(),
        title: 'Asaas provider 5xx threshold reached',
        message: 'O provedor Asaas atingiu o limite configurado de respostas 5xx na janela operacional.',
        metadata: { category: 'PROVIDER_5XX', count: provider5xx, windowMs: asaasProvider5xxWindowMs() }
      },
      {
        key: 'invalid-webhook-auth', active: invalidAuth >= asaasInvalidWebhookAuthThreshold(),
        title: 'Asaas invalid webhook authentication threshold reached',
        message: 'O endpoint Asaas atingiu o limite configurado de autenticacoes de webhook rejeitadas.',
        metadata: { category: 'INVALID_WEBHOOK_AUTH', count: invalidAuth, windowMs: asaasInvalidWebhookAuthWindowMs() }
      },
      {
        key: 'reconcile-required-age', active: reconcileRequired > 0,
        title: 'Asaas reconciliation is overdue',
        message: 'Existem recargas Asaas em RECONCILE_REQUIRED acima da idade operacional configurada.',
        metadata: { category: 'RECONCILE_REQUIRED', count: reconcileRequired, ageMs: asaasReconcileRequiredAgeMs() }
      },
      {
        key: 'manual-review-age', active: manualReview > 0,
        title: 'Asaas manual review is overdue',
        message: 'Existem registros Asaas em MANUAL_REVIEW acima da idade operacional configurada.',
        metadata: { category: 'MANUAL_REVIEW', count: manualReview, ageMs: asaasManualReviewAgeMs() }
      }
    ]

    const result: AsaasOperationalAlertResult = { evaluated: conditions.length, active: 0, opened: 0, recovered: 0 }
    for (const condition of conditions) {
      if (condition.active) result.active += 1
      const transition = await this.persistCondition(condition, now)
      if (transition === 'opened') result.opened += 1
      if (transition === 'recovered') result.recovered += 1
    }
    return result
  }

  private async persistCondition(condition: GateCondition, now: Date): Promise<'opened' | 'recovered' | 'unchanged'> {
    const sourceType = 'AsaasOperationalGate'
    const existing = await this.prisma.systemAlert.findFirst({
      where: { sourceType, sourceId: condition.key },
      orderBy: { createdAt: 'desc' }
    })

    if (condition.active) {
      if (!existing) {
        await this.prisma.systemAlert.create({
          data: {
            module: 'payments', alertType: 'ASAAS_OPERATIONAL_THRESHOLD', severity: 'CRITICAL',
            title: condition.title, message: condition.message, sourceType, sourceId: condition.key,
            metadata: condition.metadata
          }
        })
        return 'opened'
      }
      if (existing.status === 'RESOLVED' || existing.status === 'IGNORED') {
        await this.prisma.systemAlert.update({
          where: { id: existing.id },
          data: {
            status: 'OPEN', title: condition.title, message: condition.message,
            metadata: condition.metadata, resolvedAt: null, resolvedBy: null,
            acknowledgedAt: null, acknowledgedBy: null
          }
        })
        await this.prisma.alertDispatchState.updateMany({
          where: { systemAlertId: existing.id },
          data: { lastNotifiedAt: null, resolvedAt: null, lastSeenAt: now }
        })
        return 'opened'
      }
      await this.prisma.systemAlert.update({
        where: { id: existing.id },
        data: { title: condition.title, message: condition.message, metadata: condition.metadata }
      })
      return 'unchanged'
    }

    if (existing && ['OPEN', 'ACKNOWLEDGED'].includes(existing.status)) {
      await this.prisma.systemAlert.update({
        where: { id: existing.id },
        data: { status: 'RESOLVED', resolvedAt: now }
      })
      await this.prisma.alertDispatchState.updateMany({
        where: { systemAlertId: existing.id }, data: { resolvedAt: now, lastSeenAt: now }
      })
      await this.prisma.operationalEvent.create({
        data: {
          module: 'payments', eventType: 'ASAAS_OPERATIONAL_CONDITION_RECOVERED', severity: 'INFO',
          entityType: 'AsaasOperationalGate', entityId: condition.key,
          description: 'Condicao operacional Asaas recuperada.', data: { category: condition.metadata.category }
        }
      })
      return 'recovered'
    }
    return 'unchanged'
  }
}
