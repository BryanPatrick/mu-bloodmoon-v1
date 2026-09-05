import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { WalletLedgerService } from '../wallet/wallet-ledger.service'

// PHASE P (2026-08-31), Part 3 -- replaces the previously-informal
// "RechargeIntentStatus.MANUAL_REVIEW + failureReason prefixed
// 'charged_back:'" convention (see mercadopago.status-map.ts) with an
// explicit, structured ChargebackCase, WITHOUT removing the underlying
// trigger -- a Mercado Pago charged_back status still lands the recharge
// in MANUAL_REVIEW exactly as before; this service additionally opens a
// formal case for a human to work.
//
// Responsibility rule (Phase P instruction, reaffirming
// docs/decisions/0016-rmt-policy-gap.md Decision 2): the purchase
// ORIGINATOR is primarily responsible. Downstream WC recipients are never
// automatically punished -- dispersalTraceSnapshot exists purely so a
// human investigator can see the forward trail, never to drive an
// automatic clawback chain.
@Injectable()
export class ChargebackCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService,
    private readonly walletLedger: WalletLedgerService
  ) {}

  // Idempotent: a redelivered webhook for the same already-charged-back
  // order must never create a second case.
  async openCaseForRecharge(rechargeIntentId: string, options: { providerChargebackReason?: string; sourceWebhookEventId?: string }) {
    const existing = await this.prisma.chargebackCase.findUnique({ where: { rechargeIntentId } })
    if (existing) return existing

    const recharge = await this.prisma.rechargeIntent.findUnique({ where: { id: rechargeIntentId } })
    if (!recharge) throw new NotFoundException(`Recharge not found: ${rechargeIntentId}`)

    const [balance, trace] = await Promise.all([
      this.walletLedger.getBalance(recharge.accountId, recharge.currency),
      this.walletLedger.traceChargebackDispersal(rechargeIntentId)
    ])

    let created: Prisma.ChargebackCaseGetPayload<object>
    try {
      created = await this.prisma.chargebackCase.create({
        data: {
          rechargeIntentId,
          accountId: recharge.accountId,
          provider: recharge.provider,
          externalOrderId: recharge.externalOrderId,
          currency: recharge.currency,
          originalAmountCredited: recharge.amount + recharge.bonus,
          accountBalanceAtCaseOpen: balance,
          dispersalTraceSnapshot: trace as unknown as Prisma.InputJsonValue,
          providerChargebackReason: options.providerChargebackReason,
          sourceWebhookEventId: options.sourceWebhookEventId,
          chargebackDate: new Date()
        }
      })
    } catch {
      // Unique constraint race: another concurrent webhook delivery won.
      const raced = await this.prisma.chargebackCase.findUnique({ where: { rechargeIntentId } })
      if (raced) return raced
      throw new BadRequestException('Falha ao abrir caso de chargeback.')
    }

    await this.audit.record({
      action: 'system.chargeback.case-opened',
      targetType: 'ChargebackCase',
      targetId: created.id,
      metadata: { rechargeIntentId, accountId: recharge.accountId, involvedAccounts: trace.involvedAccountIds.length }
    })
    await this.observability.recordOperationalEvent({
      module: 'chargeback',
      severity: 'CRITICAL',
      eventType: 'CHARGEBACK_CASE_OPENED',
      entityType: 'ChargebackCase',
      entityId: created.id,
      targetUserId: recharge.accountId,
      correlationId: recharge.correlationId ?? undefined,
      description: `Caso de chargeback aberto para a recarga ${rechargeIntentId}.`,
      data: { involvedAccounts: trace.involvedAccountIds, dispersalHops: trace.dispersalChain.length }
    })

    return created
  }

  async listCases(query: { status?: string; accountId?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25))
    const where: Prisma.ChargebackCaseWhereInput = {
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {})
    }
    const [total, items] = await Promise.all([
      this.prisma.chargebackCase.count({ where }),
      this.prisma.chargebackCase.findMany({
        where,
        include: { account: { select: { username: true, email: true } }, rechargeIntent: { select: { id: true, price: true, createdAt: true } } },
        orderBy: [{ createdAt: 'desc' }],
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
    const item = await this.prisma.chargebackCase.findUnique({
      where: { id },
      include: { account: { select: { username: true, email: true } }, rechargeIntent: { select: { id: true, price: true, createdAt: true } } }
    })
    if (!item) throw new NotFoundException(`Chargeback case not found: ${id}`)
    return this.mapCase(item)
  }

  async updateReviewNotes(id: string, reviewNotes: string, user: AuthenticatedUser) {
    const existing = await this.prisma.chargebackCase.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Chargeback case not found: ${id}`)
    const updated = await this.prisma.chargebackCase.update({
      where: { id },
      data: { status: existing.status === 'OPEN' ? 'UNDER_REVIEW' : existing.status, reviewNotes: reviewNotes?.trim() || null }
    })
    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.finance.chargeback-case.note',
      targetType: 'ChargebackCase',
      targetId: id
    })
    return updated
  }

  async resolveCase(id: string, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED', resolution: string, user: AuthenticatedUser) {
    if (!resolution?.trim()) throw new BadRequestException('Informe a resolucao deste caso.')
    const existing = await this.prisma.chargebackCase.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException(`Chargeback case not found: ${id}`)
    if (existing.status === 'CLOSED') throw new BadRequestException('Este caso ja esta encerrado.')

    const updated = await this.prisma.chargebackCase.update({
      where: { id },
      data: { status, resolution: resolution.trim(), resolvedAt: new Date(), resolvedByAccountId: user.id }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.finance.chargeback-case.resolved',
      targetType: 'ChargebackCase',
      targetId: id,
      reason: resolution.trim(),
      metadata: { previousStatus: existing.status, nextStatus: status }
    })

    return updated
  }

  private mapCase(item: Prisma.ChargebackCaseGetPayload<{ include: { account: { select: { username: true; email: true } }; rechargeIntent: { select: { id: true; price: true; createdAt: true } } } }>) {
    return {
      id: item.id,
      rechargeIntentId: item.rechargeIntentId,
      accountId: item.accountId,
      username: item.account?.username ?? null,
      provider: item.provider,
      externalOrderId: item.externalOrderId,
      currency: item.currency,
      originalAmountCredited: item.originalAmountCredited,
      accountBalanceAtCaseOpen: item.accountBalanceAtCaseOpen,
      dispersalTraceSnapshot: item.dispersalTraceSnapshot,
      providerChargebackReason: item.providerChargebackReason,
      chargebackDate: item.chargebackDate?.toISOString() || null,
      status: item.status,
      reviewNotes: item.reviewNotes,
      resolution: item.resolution,
      resolvedAt: item.resolvedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      rechargePrice: item.rechargeIntent.price
    }
  }
}
