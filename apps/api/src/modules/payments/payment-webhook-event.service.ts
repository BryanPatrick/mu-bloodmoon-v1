import { Injectable } from '@nestjs/common'
import { PaymentWebhookEvent, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { toSafeJson } from '../../common/sensitive-data'

export type RecordAndClaimInput = {
  provider: string
  topic: string
  eventId: string
  externalOrderId?: string
  signatureValid: boolean
  signatureHeader?: string
  rawPayload: unknown
}

export type ClaimResult =
  | { outcome: 'claimed'; eventId: string }
  | { outcome: 'duplicate-processed'; eventId: string }
  | { outcome: 'retryable'; eventId: string }

@Injectable()
export class PaymentWebhookEventService {
  constructor(private readonly prisma: PrismaService) {}

  // The HTTP ACK is permitted only after this insert (or a confirmed
  // existing unique row) has committed. No in-memory queue is authoritative.
  async receiveAsaas(input: { topic: string; eventId: string; paymentId: string }): Promise<PaymentWebhookEvent> {
    try {
      return await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: 'asaas', topic: input.topic, eventId: input.eventId,
          externalOrderId: input.paymentId, signatureValid: true,
          rawPayload: { id: input.eventId, event: input.topic, payment: { id: input.paymentId } }
        }
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const existing = await this.prisma.paymentWebhookEvent.findUnique({
        where: { provider_topic_eventId: { provider: 'asaas', topic: input.topic, eventId: input.eventId } }
      })
      if (!existing) throw error // Never ACK a race without a durable row.
      // An event ID reused for a different payment is an integrity alarm,
      // not a legitimate duplicate notification.
      if (existing.externalOrderId !== input.paymentId) throw new Error('ASAAS_EVENT_ID_CONFLICT')
      return existing
    }
  }

  async claimNextAsaas(owner: string, leaseMs: number): Promise<PaymentWebhookEvent | null> {
    const now = new Date()
    const eligible: Prisma.PaymentWebhookEventWhereInput = {
      OR: [
        { status: 'RECEIVED' },
        { status: 'RETRY', nextAttemptAt: { lte: now } },
        { status: 'PROCESSING', leaseExpiresAt: { lte: now } }
      ]
    }
    // The candidate read is advisory. Only one worker can win the atomic
    // conditional UPDATE; this works without a process-local lock or SKIP LOCKED.
    const candidates = await this.prisma.paymentWebhookEvent.findMany({
      where: { provider: 'asaas', ...eligible },
      select: { id: true }, orderBy: { receivedAt: 'asc' }, take: 20
    })
    for (const candidate of candidates) {
      const won = await this.prisma.paymentWebhookEvent.updateMany({
        where: { id: candidate.id, provider: 'asaas', ...eligible },
        data: {
          status: 'PROCESSING', processingOwner: owner,
          processingStartedAt: now, leaseExpiresAt: new Date(now.getTime() + leaseMs),
          attemptCount: { increment: 1 }, nextAttemptAt: null,
          processingError: null, lastErrorCode: null
        }
      })
      if (won.count === 1) return this.prisma.paymentWebhookEvent.findUniqueOrThrow({ where: { id: candidate.id } })
    }
    return null
  }

  async renewAsaasLease(id: string, owner: string, leaseMs: number): Promise<boolean> {
    const now = new Date()
    const renewed = await this.prisma.paymentWebhookEvent.updateMany({
      where: { id, provider: 'asaas', status: 'PROCESSING', processingOwner: owner, leaseExpiresAt: { gt: now } },
      data: { leaseExpiresAt: new Date(now.getTime() + leaseMs) }
    })
    return renewed.count === 1
  }

  async completeAsaas(id: string, owner: string, result: { status: 'PROCESSED' | 'IGNORED' | 'MANUAL_REVIEW'; rechargeIntentId?: string; code?: string }): Promise<boolean> {
    const completed = await this.prisma.paymentWebhookEvent.updateMany({
      where: { id, provider: 'asaas', status: 'PROCESSING', processingOwner: owner },
      data: {
        status: result.status, rechargeIntentId: result.rechargeIntentId,
        processingError: result.code, lastErrorCode: result.code,
        processedAt: new Date(), processingOwner: null, leaseExpiresAt: null, nextAttemptAt: null
      }
    })
    return completed.count === 1
  }

  async failAsaas(id: string, owner: string, attemptCount: number, code: string, maxAttempts: number): Promise<'RETRY' | 'MANUAL_REVIEW' | 'LOST_LEASE'> {
    const exhausted = attemptCount >= maxAttempts
    const delayMs = Math.min(15 * 60_000, 30_000 * 2 ** Math.min(attemptCount - 1, 5))
    const changed = await this.prisma.paymentWebhookEvent.updateMany({
      where: { id, provider: 'asaas', status: 'PROCESSING', processingOwner: owner },
      data: {
        status: exhausted ? 'MANUAL_REVIEW' : 'RETRY',
        lastErrorCode: code, lastErrorAt: new Date(), processingError: code,
        processedAt: exhausted ? new Date() : null,
        nextAttemptAt: exhausted ? null : new Date(Date.now() + delayMs),
        processingOwner: null, leaseExpiresAt: null
      }
    })
    return changed.count !== 1 ? 'LOST_LEASE' : exhausted ? 'MANUAL_REVIEW' : 'RETRY'
  }

  // Claims the (provider, topic, eventId) unique slot. A true redelivery of
  // an already-PROCESSED event short-circuits with no side effects; a
  // previously RECEIVED/FAILED row (in-flight or crashed prior attempt) is
  // safe to retry. This is the fast-path dedup guard -- the real
  // double-credit guarantee is the status-transition check inside
  // CommerceService's transaction, not this table alone.
  async recordAndClaim(input: RecordAndClaimInput): Promise<ClaimResult> {
    try {
      const created = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: input.provider,
          topic: input.topic,
          eventId: input.eventId,
          externalOrderId: input.externalOrderId,
          signatureValid: input.signatureValid,
          signatureHeader: input.signatureHeader,
          rawPayload: toSafeJson(input.rawPayload, { maskPersonalData: true }) ?? {}
        }
      })
      return { outcome: 'claimed', eventId: created.id }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.paymentWebhookEvent.findUnique({
          where: {
            provider_topic_eventId: { provider: input.provider, topic: input.topic, eventId: input.eventId }
          }
        })
        if (existing?.status === 'PROCESSED') {
          return { outcome: 'duplicate-processed', eventId: existing.id }
        }
        return { outcome: 'retryable', eventId: existing?.id || input.eventId }
      }
      throw error
    }
  }

  async markProcessed(id: string, rechargeIntentId: string) {
    await this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', rechargeIntentId, processedAt: new Date() }
    })
  }

  async markIgnored(id: string, reason: string) {
    await this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { status: 'IGNORED', processingError: reason, processedAt: new Date() }
    })
  }

  async markFailed(id: string, error: string) {
    await this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { status: 'FAILED', processingError: error }
    })
  }
}
