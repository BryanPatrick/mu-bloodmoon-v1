import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
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
