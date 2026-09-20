import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { ObservabilityService } from '../observability/observability.service'
import { loadAsaasConfig } from '../payments/asaas.config'
import { asaasEventCorrelationId, PaymentWebhookEventService } from '../payments/payment-webhook-event.service'
import { CommerceService } from './commerce.service'

const bounded = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

@Injectable()
export class AsaasWebhookInboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsaasWebhookInboxWorker.name)
  private readonly owner = randomUUID()
  private readonly leaseMs = bounded(process.env.ASAAS_WEBHOOK_LEASE_MS, 120_000, 30_000, 300_000)
  private readonly maxAttempts = bounded(process.env.ASAAS_WEBHOOK_MAX_ATTEMPTS, 8, 1, 20)
  private timer: ReturnType<typeof setInterval> | null = null
  private active: Promise<void> | null = null
  private stopping = false

  constructor(
    private readonly events: PaymentWebhookEventService,
    private readonly commerce: CommerceService,
    private readonly observability: ObservabilityService
  ) {}

  onModuleInit() {
    if (!this.isEnabled()) return
    const interval = bounded(process.env.ASAAS_WEBHOOK_POLL_MS, 10_000, 1000, 300_000)
    this.timer = setInterval(() => void this.runOnce().catch(() => this.logger.error('ASAAS_INBOX_POLL_FAILED')), interval)
    this.timer.unref?.()
  }

  async onModuleDestroy() {
    this.stopping = true
    if (this.timer) clearInterval(this.timer)
    if (this.active) await this.active
    this.logger.log('ASAAS_INBOX_STOPPED')
  }

  private isEnabled() {
    const config = loadAsaasConfig()
    return config.enabled && config.webhookProcessingEnabled
  }

  async runOnce(): Promise<number> {
    if (this.stopping || !this.isEnabled()) return 0
    if (this.active) { await this.active; return 0 }
    let processed = 0
    let retry = 0
    let manualReview = 0
    let reclaimed = 0
    let processingError = 0
    const run = async () => {
      const batch = bounded(process.env.ASAAS_WEBHOOK_BATCH_SIZE, 10, 1, 50)
      for (let i = 0; i < batch && !this.stopping; i++) {
        const event = await this.events.claimNextAsaas(this.owner, this.leaseMs)
        if (!event) break
        processed++
        if (event.attemptCount > 1) {
          reclaimed++
          this.logger.warn(`ASAAS_INBOX_RECLAIMED correlationId=${asaasEventCorrelationId(event)} eventRecordId=${event.id} attempt=${event.attemptCount}`)
        }
        const heartbeat = setInterval(() => {
          void this.events.renewAsaasLease(event.id, this.owner, this.leaseMs)
            .then((renewed) => { if (!renewed) this.logger.warn(`ASAAS_INBOX_LEASE_LOST eventRecordId=${event.id}`) })
            .catch(() => this.logger.error(`ASAAS_INBOX_LEASE_RENEW_FAILED eventRecordId=${event.id}`))
        }, Math.floor(this.leaseMs / 3))
        heartbeat.unref?.()
        try {
          const result = await this.commerce.processStoredAsaasEvent(event, () => this.events.renewAsaasLease(event.id, this.owner, this.leaseMs))
          const saved = await this.events.completeAsaas(event.id, this.owner, result)
          if (!saved) throw new Error('ASAAS_INBOX_LEASE_LOST')
          const providerEventHash = createHash('sha256').update(event.eventId).digest('hex').slice(0, 16)
          const providerPaymentHash = createHash('sha256').update(event.externalOrderId || '').digest('hex').slice(0, 16)
          this.logger.log(`ASAAS_INBOX_${result.status} correlationId=${asaasEventCorrelationId(event)} eventRecordId=${event.id} providerEventHash=${providerEventHash} providerPaymentHash=${providerPaymentHash} rechargeIntentId=${result.rechargeIntentId || 'none'}`)
          if (result.status === 'MANUAL_REVIEW') {
            manualReview++
            await this.recordReview(event.id, asaasEventCorrelationId(event), result.code || 'ASAAS_INBOX_REVIEW')
          }
        } catch (error) {
          processingError++
          const code = error instanceof Error && error.message === 'ASAAS_INBOX_LEASE_LOST'
            ? 'ASAAS_INBOX_LEASE_LOST'
            : error instanceof Error && error.message === 'ASAAS_WALLET_CREDIT_FAILED'
              ? 'ASAAS_WALLET_CREDIT_FAILED' : 'ASAAS_INBOX_PROCESSING_FAILED'
          const state = await this.events.failAsaas(event.id, this.owner, event.attemptCount, code, this.maxAttempts)
          this.logger.warn(`ASAAS_INBOX_${state} eventRecordId=${event.id} attempt=${event.attemptCount}`)
          if (state === 'RETRY') retry++
          if (state === 'MANUAL_REVIEW') {
            manualReview++
            await this.recordReview(event.id, asaasEventCorrelationId(event), code)
          }
        } finally {
          clearInterval(heartbeat)
        }
      }
      if (processed) this.logger.log(`ASAAS_INBOX_SWEEP claimed=${processed} retry=${retry} manualReview=${manualReview} reclaimed=${reclaimed} processingError=${processingError}`)
    }
    this.active = run()
    try { await this.active } finally { this.active = null }
    return processed
  }

  private async recordReview(id: string, correlationId: string, code: string) {
    try {
      if (code === 'ASAAS_WALLET_CREDIT_FAILED') {
        await this.observability.recordOperationalEvent({
          module: 'store', severity: 'CRITICAL', eventType: 'ASAAS_CONFIRMED_CREDIT_FAILURE',
          entityType: 'PaymentWebhookEvent', entityId: id, correlationId,
          description: 'Pagamento Asaas confirmado, mas o credito falhou apos as retentativas.', data: { code }
        })
      }
      await this.observability.recordOperationalEvent({
        module: 'store', severity: 'CRITICAL', eventType: 'ASAAS_INBOX_MANUAL_REVIEW',
        entityType: 'PaymentWebhookEvent', entityId: id, correlationId,
        description: 'Evento Asaas requer revisao operacional.', data: { code }
      })
    } catch {
      this.logger.error(`ASAAS_INBOX_ALERT_RECORD_FAILED eventRecordId=${id}`)
    }
  }
}
