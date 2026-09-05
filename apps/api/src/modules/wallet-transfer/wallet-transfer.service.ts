import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PaymentRiskService } from '../commerce/payment-risk.service'
import { ObservabilityService } from '../observability/observability.service'
import { WalletLedgerService } from '../wallet/wallet-ledger.service'

// PHASE Q (2026-08-31), Part 4 -- direct player-to-player WC transfer.
// A real search this phase confirmed NO endpoint/service anywhere in this
// codebase ever created a `PLAYER_DIRECT_TRANSFER` ledger row -- the enum
// value existed (schema.prisma), and docs/decisions/0011-direct-wcoin-transfer-minimum.md
// was explicitly `DECIDED_BUT_NOT_IMPLEMENTED`, but the feature itself
// never existed. Built now because TRANSFER_RESTRICTION enforcement
// (Phase Q's own mandate) has nothing real to enforce against otherwise.
//
// The 20 WC minimum below is the ALREADY-DOCUMENTED number from ADR-0011
// (a real test-comment-derived value, not invented fresh) -- ADR-0011
// itself still marks this threshold as provisional pending a separate,
// explicit reconfirmation from Bryan (see docs/open-questions.md OQ-002,
// left open). Using an already-recorded number and disclosing its
// provisional status is different from inventing a new one from nothing.
//
// WCOIN only, matching ADR-0011's own scope -- GOBLIN_POINT/HUNT_POINT
// direct transfer is out of scope, not decided here either way.
const DIRECT_TRANSFER_MIN_WC = Number(process.env.WALLET_DIRECT_TRANSFER_MIN_WC) || 20
const IMMEDIATE_TRANSFER_WINDOW_MINUTES = Number(process.env.RISK_IMMEDIATE_TRANSFER_WINDOW_MINUTES) || 30
const NEAR_FULL_BALANCE_PERCENT = Number(process.env.RISK_NEAR_FULL_BALANCE_PERCENT) || 90
const MANY_RECIPIENTS_WINDOW_HOURS = Number(process.env.RISK_MANY_RECIPIENTS_WINDOW_HOURS) || 24
const MANY_RECIPIENTS_THRESHOLD = Number(process.env.RISK_MANY_RECIPIENTS_THRESHOLD) || 3
const REPEATED_RECIPIENT_WINDOW_HOURS = Number(process.env.RISK_REPEATED_RECIPIENT_WINDOW_HOURS) || 24
const REPEATED_RECIPIENT_SENDERS_THRESHOLD = Number(process.env.RISK_REPEATED_RECIPIENT_SENDERS_THRESHOLD) || 3

export interface TransferWcPayload {
  recipientUsername: string
  amount: number
  idempotencyKey?: string
}

@Injectable()
export class WalletTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly observability: ObservabilityService,
    private readonly walletLedger: WalletLedgerService,
    private readonly paymentRisk: PaymentRiskService
  ) {}

  async transfer(sender: AuthenticatedUser, payload: TransferWcPayload) {
    // PHASE Q Part 4/5/6 -- the one real enforcement point for
    // TRANSFER_RESTRICTION, and ACCOUNT_RESTRICTION also applies (a
    // commercial/security hold covers WC transfer, per Part 5).
    await this.paymentRisk.assertNoActiveTransferRestriction(sender.id)
    await this.paymentRisk.assertNoActiveAccountRestriction(sender.id, 'transferencia direta de WC')

    const amount = Math.trunc(Number(payload.amount))
    if (!Number.isInteger(amount) || amount < DIRECT_TRANSFER_MIN_WC) {
      throw new BadRequestException(`Transferencias diretas exigem um minimo de ${DIRECT_TRANSFER_MIN_WC} WC.`)
    }

    const recipientUsername = payload.recipientUsername?.trim().toLowerCase()
    if (!recipientUsername) {
      throw new BadRequestException('Informe o destinatario da transferencia.')
    }
    const recipient = await this.prisma.account.findUnique({ where: { username: recipientUsername } })
    if (!recipient || recipient.status !== 'ACTIVE') {
      throw new NotFoundException('Destinatario nao encontrado.')
    }
    if (recipient.id === sender.id) {
      throw new BadRequestException('Nao e possivel transferir WC para a propria conta.')
    }

    const senderBalanceBefore = await this.walletLedger.getBalance(sender.id, 'WCOIN')
    if (senderBalanceBefore < amount) {
      throw new BadRequestException('Saldo insuficiente para esta transferencia.')
    }

    const idempotencyKey = payload.idempotencyKey?.trim() || randomUUID()
    const correlationId = randomUUID()

    const result = await this.prisma.$transaction(async (tx) => {
      await this.walletLedger.debit(tx, sender.id, 'WCOIN', amount, {
        idempotencyKey: `wc-transfer-debit:${idempotencyKey}`,
        type: 'PLAYER_DIRECT_TRANSFER',
        sourceType: 'WalletTransfer',
        sourceId: correlationId
      })
      // Taxed, same as every other real P2P WC movement in this codebase
      // (marketplace settlement) -- a direct transfer is exactly the P2P
      // case settleTaxedCredit()'s own header comment already anticipated.
      const settled = await this.walletLedger.settleTaxedCredit(tx, recipient.id, sender.id, 'WCOIN', amount, {
        idempotencyKey: `wc-transfer-credit:${idempotencyKey}`,
        type: 'PLAYER_DIRECT_TRANSFER',
        sourceType: 'WalletTransfer',
        sourceId: correlationId
      })
      return settled
    })

    await this.audit.record({
      actorId: sender.id,
      actorUsername: sender.username,
      action: 'wallet.transfer.direct',
      targetType: 'Account',
      targetId: recipient.id,
      correlationId,
      metadata: { recipientUsername: recipient.username, amount, feeCollected: result.feeAmountCollected }
    })
    await this.observability.recordOperationalEvent({
      module: 'wallet',
      eventType: 'WC_DIRECT_TRANSFER',
      entityType: 'Account',
      entityId: sender.id,
      actorUserId: sender.id,
      targetUserId: recipient.id,
      correlationId,
      description: `Transferencia direta de ${amount} WC de ${sender.username} para ${recipient.username}.`,
      data: { amount, netAmount: result.netAmount, feeCollected: result.feeAmountCollected }
    })

    // PHASE Q Part 7 -- fired after commit, same "advisory, never blocks
    // the real transaction" pattern as commerce.service.ts's fireRiskHooks.
    await this.evaluateTransferRiskSignals(sender.id, recipient.id, amount, senderBalanceBefore, correlationId)

    return { transferred: amount, netAmount: result.netAmount, feeCollected: result.feeAmountCollected, recipientUsername: recipient.username }
  }

  // PHASE Q DECISION CLOSURE (2026-08-31), Part 2 -- "estimated receiver
  // amount after tax" and "the 20 WC minimum" must be shown BEFORE the
  // player confirms, not guessed client-side. The real tax rate is
  // admin-configurable (MarketplaceEconomyConfig.wcoinTaxPercent, the
  // exact same row settleTaxedCredit() itself reads) -- exposing only
  // this one number (not the full admin-only /admin/marketplace/economy
  // payload, which also carries publicationFee/minimumPrice/etc that are
  // marketplace-specific and none of a transfer UI's business) keeps the
  // displayed estimate honest without duplicating a second source of
  // truth that could silently drift from the real rate.
  async getFeeInfo() {
    const economy = await this.prisma.marketplaceEconomyConfig.findUnique({ where: { id: 'default' } })
    const taxPercent = Math.max(0, Math.min(100, economy?.wcoinTaxPercent ?? 0))
    return { currency: 'WCOIN' as const, taxPercent, minimumAmount: DIRECT_TRANSFER_MIN_WC }
  }

  // PHASE Q DECISION CLOSURE (2026-08-31), Part 2 -- "player should be
  // able to see relevant transfer history: sent, received, gross, fee,
  // net, date, status." Never exposes risk/security metadata (Part 10) --
  // this reads only WalletLedgerEntry rows, never PaymentRiskSignal/Case.
  //
  // Each real transfer produces exactly two ledger rows sharing the same
  // sourceId (the transfer's own correlationId): a debit on the sender
  // (netAmount negative, no counterpartyAccountId -- debit() doesn't
  // carry one) and a taxed credit on the recipient (netAmount positive,
  // counterpartyAccountId = the sender). Paired here by sourceId so each
  // transfer appears once, from the caller's own point of view, with the
  // OTHER party's username resolved for display.
  async listMyTransferHistory(user: AuthenticatedUser) {
    const rows = await this.prisma.walletLedgerEntry.findMany({
      where: {
        type: 'PLAYER_DIRECT_TRANSFER',
        OR: [{ accountId: user.id }, { counterpartyAccountId: user.id }]
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    })

    const bySource = new Map<string, typeof rows>()
    for (const row of rows) {
      if (!row.sourceId) continue
      const list = bySource.get(row.sourceId) ?? []
      list.push(row)
      bySource.set(row.sourceId, list)
    }

    type HistoryDraft = { sourceId: string; direction: 'SENT' | 'RECEIVED'; grossAmount: number; feeAmount: number; netAmount: number; currency: string; occurredAt: Date; counterpartyAccountId: string | null }
    const drafts: HistoryDraft[] = []
    for (const [sourceId, entries] of bySource) {
      const mine = entries.find((entry) => entry.accountId === user.id)
      if (!mine) continue
      const isSender = mine.netAmount < 0
      const other = entries.find((entry) => entry.id !== mine.id)
      // The credit (recipient) row is the only one carrying the real
      // fee/net figures -- debit()'s own row always has taxAmount 0. Use
      // it for BOTH directions so a SENT row shows what the recipient
      // actually received, not just what left the sender's balance.
      const creditRow = isSender ? other : mine
      drafts.push({
        sourceId,
        direction: isSender ? 'SENT' : 'RECEIVED',
        grossAmount: mine.grossAmount,
        feeAmount: creditRow?.taxAmount ?? 0,
        netAmount: creditRow ? Math.abs(creditRow.netAmount) : Math.abs(mine.netAmount),
        currency: mine.currency,
        occurredAt: mine.createdAt,
        counterpartyAccountId: isSender ? (other?.accountId ?? null) : mine.counterpartyAccountId
      })
    }

    const counterpartyIds = [...new Set(drafts.map((d) => d.counterpartyAccountId).filter((id): id is string => Boolean(id)))]
    const counterparties = counterpartyIds.length
      ? await this.prisma.account.findMany({ where: { id: { in: counterpartyIds } }, select: { id: true, username: true } })
      : []
    const usernameById = new Map(counterparties.map((account) => [account.id, account.username]))

    return drafts
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .map((draft) => ({
        id: draft.sourceId,
        direction: draft.direction,
        counterpartyUsername: draft.counterpartyAccountId ? usernameById.get(draft.counterpartyAccountId) ?? 'conta removida' : 'conta removida',
        grossAmount: draft.grossAmount,
        feeAmount: draft.feeAmount,
        netAmount: draft.netAmount,
        currency: draft.currency,
        occurredAt: draft.occurredAt.toISOString(),
        status: 'SETTLED' as const
      }))
  }

  private async evaluateTransferRiskSignals(
    senderId: string,
    recipientId: string,
    amount: number,
    senderBalanceBefore: number,
    correlationId: string
  ) {
    try {
      // IMMEDIATE_WCOIN_TRANSFER -- a real, provable timing correlation
      // (most recent WC_PURCHASE_CREDIT for this account happened inside
      // the window), NOT a claim that these are literally "the same
      // coins" -- WC is fungible, this codebase never pretends otherwise
      // (see ChargebackCase's own accountBalanceAtCaseOpen comment).
      const recentCredit = await this.prisma.walletLedgerEntry.findFirst({
        where: { accountId: senderId, type: 'WC_PURCHASE_CREDIT' },
        orderBy: { createdAt: 'desc' }
      })
      if (recentCredit) {
        const minutesSinceCredit = (Date.now() - recentCredit.createdAt.getTime()) / 60_000
        if (minutesSinceCredit <= IMMEDIATE_TRANSFER_WINDOW_MINUTES) {
          await this.paymentRisk.recordSignal({
            accountId: senderId,
            signalType: 'IMMEDIATE_WCOIN_TRANSFER',
            severity: 'MEDIUM',
            reason: `Transferencia de ${amount} WC ${minutesSinceCredit.toFixed(1)} minutos apos a recarga mais recente desta conta (janela configurada: ${IMMEDIATE_TRANSFER_WINDOW_MINUTES} min).`,
            evidence: { originPaymentLedgerEntryId: recentCredit.id, originCreditSourceId: recentCredit.sourceId, originatedAt: recentCredit.createdAt.toISOString(), transferAmount: amount, minutesSinceCredit: Number(minutesSinceCredit.toFixed(2)) },
            sourceType: 'WalletTransfer',
            sourceId: correlationId
          })
        }
      }

      // NEAR_FULL_BALANCE_TRANSFER
      const percentOfBalance = senderBalanceBefore > 0 ? (amount / senderBalanceBefore) * 100 : 100
      if (percentOfBalance >= NEAR_FULL_BALANCE_PERCENT) {
        await this.paymentRisk.recordSignal({
          accountId: senderId,
          signalType: 'NEAR_FULL_BALANCE_TRANSFER',
          severity: 'MEDIUM',
          reason: `Transferencia de ${percentOfBalance.toFixed(1)}% do saldo da conta (limite configurado: ${NEAR_FULL_BALANCE_PERCENT}%).`,
          evidence: { amount, balanceBefore: senderBalanceBefore, percentageOfBalance: Number(percentOfBalance.toFixed(2)) },
          sourceType: 'WalletTransfer',
          sourceId: correlationId
        })
      }

      // MANY_RECIPIENTS_AFTER_PURCHASE -- only meaningful in combination
      // with a recent real credit (fan-out of freshly-purchased WC), same
      // provenance-correlation reasoning as IMMEDIATE_WCOIN_TRANSFER.
      if (recentCredit) {
        const windowStart = new Date(Date.now() - MANY_RECIPIENTS_WINDOW_HOURS * 3_600_000)
        const recentTransfersOut = await this.prisma.walletLedgerEntry.findMany({
          where: { counterpartyAccountId: senderId, type: 'PLAYER_DIRECT_TRANSFER', createdAt: { gte: windowStart } },
          select: { accountId: true },
          distinct: ['accountId']
        })
        const distinctRecipients = new Set(recentTransfersOut.map((r) => r.accountId).filter((id): id is string => Boolean(id)))
        distinctRecipients.add(recipientId)
        if (distinctRecipients.size >= MANY_RECIPIENTS_THRESHOLD) {
          await this.paymentRisk.recordSignal({
            accountId: senderId,
            signalType: 'MANY_RECIPIENTS_AFTER_PURCHASE',
            severity: distinctRecipients.size >= MANY_RECIPIENTS_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
            reason: `${distinctRecipients.size} destinatarios distintos em ${MANY_RECIPIENTS_WINDOW_HOURS}h apos uma recarga (limite configurado: ${MANY_RECIPIENTS_THRESHOLD}).`,
            evidence: { recipientCount: distinctRecipients.size, windowHours: MANY_RECIPIENTS_WINDOW_HOURS, threshold: MANY_RECIPIENTS_THRESHOLD },
            sourceType: 'WalletTransfer',
            sourceId: correlationId
          })
        }
      }

      // REPEATED_RECIPIENT_NETWORK -- this recipient receiving from many
      // distinct senders recently (a fan-in pattern, evaluated on the
      // RECEIVING account).
      const repeatedWindowStart = new Date(Date.now() - REPEATED_RECIPIENT_WINDOW_HOURS * 3_600_000)
      const recentSendersToRecipient = await this.prisma.walletLedgerEntry.findMany({
        where: { accountId: recipientId, type: 'PLAYER_DIRECT_TRANSFER', createdAt: { gte: repeatedWindowStart } },
        select: { counterpartyAccountId: true },
        distinct: ['counterpartyAccountId']
      })
      const distinctSenders = new Set(recentSendersToRecipient.map((r) => r.counterpartyAccountId).filter((id): id is string => Boolean(id)))
      distinctSenders.add(senderId)
      if (distinctSenders.size >= REPEATED_RECIPIENT_SENDERS_THRESHOLD) {
        await this.paymentRisk.recordSignal({
          accountId: recipientId,
          signalType: 'REPEATED_RECIPIENT_NETWORK',
          severity: distinctSenders.size >= REPEATED_RECIPIENT_SENDERS_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
          reason: `Conta recebeu transferencias de ${distinctSenders.size} contas distintas em ${REPEATED_RECIPIENT_WINDOW_HOURS}h (limite configurado: ${REPEATED_RECIPIENT_SENDERS_THRESHOLD}).`,
          evidence: { distinctSenderCount: distinctSenders.size, windowHours: REPEATED_RECIPIENT_WINDOW_HOURS, threshold: REPEATED_RECIPIENT_SENDERS_THRESHOLD },
          sourceType: 'WalletTransfer',
          sourceId: correlationId
        })
      }
    } catch (error) {
      await this.observability.recordOperationalEvent({
        module: 'payment-risk',
        severity: 'CRITICAL',
        eventType: 'PAYMENT_RISK_HOOK_FAILED',
        entityType: 'WalletTransfer',
        entityId: correlationId,
        description: 'Falha ao avaliar sinais de risco para uma transferencia direta de WC.',
        data: { error: error instanceof Error ? error.message : 'unknown' }
      })
    }
  }
}
