import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { CurrencyCode, WalletTransactionType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

// Open Beta P0 foundation -- the single place every AccountCurrency
// balance mutation in the app should go through, replacing the three
// separate, duplicated debitCurrency/creditCurrency pairs previously
// living in marketplace.service.ts, commerce.service.ts, and a raw
// upsert in store-admin.service.ts. Every mutation here writes exactly
// one WalletLedgerEntry row, in the same transaction as the balance
// change, so "what happened to this currency after it was credited" is
// always answerable from the ledger alone.
//
// 1 WC (or GP/HP) = 10,000 subunits. Every arithmetic operation below is
// integer-only -- no floating point anywhere, matching the already-tested
// docs/product/wc-fee-model/wc-fee-accumulator.mjs reference design this
// implementation follows.
export const SUBUNITS_PER_UNIT = 10_000

export type LedgerContext = {
  idempotencyKey: string
  type: WalletTransactionType
  sourceType?: string
  sourceId?: string
  paymentProvenanceRef?: string
  metadata?: Prisma.InputJsonValue
}

function jsonOrNull(value: Prisma.InputJsonValue | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === undefined ? Prisma.JsonNull : value
}

@Injectable()
export class WalletLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retry the entire aborted financial transaction, never an individual
   * wallet statement. MariaDB can report 1020 under SERIALIZABLE after a
   * concurrent writer; replaying only the increment would break the ledger
   * invariant. The idempotency key remains authoritative across attempts. */
  async runSerializableTransactionWithRetry<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const maxAttempts = 8
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' })
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
        const message = error instanceof Error ? error.message : ''
        const retryable = code === 'P2034' || /(?:code:\s*1020|Record has changed since last read)/i.test(message)
        if (!retryable || attempt === maxAttempts - 1) throw error
        await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1) + Math.floor(Math.random() * 20)))
      }
    }
    throw new Error('Unreachable wallet transaction retry state')
  }

  private async ledgerRowForIdempotencyKey(tx: Prisma.TransactionClient, idempotencyKey: string) {
    return tx.walletLedgerEntry.findUnique({ where: { idempotencyKey } })
  }

  /**
   * Non-taxed credit -- SERVER_REWARD, BUG_HUNTER_REWARD, WC_PURCHASE_CREDIT,
   * REFUND, PAYMENT_REVERSAL (credit direction), ADMIN_ADJUSTMENT,
   * SYSTEM_CORRECTION. Idempotent: a retry with the same idempotencyKey
   * returns the existing ledger row without mutating the balance again.
   */
  async credit(
    tx: Prisma.TransactionClient,
    accountId: string,
    currency: CurrencyCode,
    amount: number,
    ctx: LedgerContext
  ) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Valor de credito invalido.')
    }

    // The parent row exists even if this currency row does not. Serialize
    // same-account credits before checking the idempotency key. A SERIALIZABLE
    // conflict still requires retrying the *whole* transaction by its owner.
    await tx.$queryRaw`SELECT id FROM Account WHERE id = ${accountId} FOR UPDATE`

    const existing = await this.ledgerRowForIdempotencyKey(tx, ctx.idempotencyKey)
    if (existing) return existing

    await tx.accountCurrency.upsert({
      where: { accountId_currency: { accountId, currency } },
      create: { accountId, currency, balance: amount },
      update: { balance: { increment: amount } }
    })

    return tx.walletLedgerEntry.create({
      data: {
        idempotencyKey: ctx.idempotencyKey,
        type: ctx.type,
        currency,
        accountId,
        grossAmount: amount,
        taxAmount: 0,
        netAmount: amount,
        sourceType: ctx.sourceType,
        sourceId: ctx.sourceId,
        paymentProvenanceRef: ctx.paymentProvenanceRef,
        metadata: jsonOrNull(ctx.metadata)
      }
    })
  }

  /**
   * Non-taxed debit -- STORE_PURCHASE, ADMIN_ADJUSTMENT, PAYMENT_REVERSAL
   * (clawback direction), SYSTEM_CORRECTION. Throws BadRequestException on
   * insufficient balance -- FAILED_MUTATION_NO_LEDGER_COMMIT holds because
   * the throw happens before any write in this method.
   */
  async debit(
    tx: Prisma.TransactionClient,
    accountId: string,
    currency: CurrencyCode,
    amount: number,
    ctx: LedgerContext
  ) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Valor de debito invalido.')
    }

    const existing = await this.ledgerRowForIdempotencyKey(tx, ctx.idempotencyKey)
    if (existing) return existing

    const wallet = await tx.accountCurrency.findUnique({ where: { accountId_currency: { accountId, currency } } })
    const balance = wallet?.balance || 0
    if (balance < amount) {
      throw new BadRequestException('Saldo insuficiente para concluir a operacao.')
    }

    await tx.accountCurrency.update({
      where: { accountId_currency: { accountId, currency } },
      data: { balance: { decrement: amount } }
    })

    return tx.walletLedgerEntry.create({
      data: {
        idempotencyKey: ctx.idempotencyKey,
        type: ctx.type,
        currency,
        accountId,
        grossAmount: amount,
        taxAmount: 0,
        netAmount: -amount,
        sourceType: ctx.sourceType,
        sourceId: ctx.sourceId,
        paymentProvenanceRef: ctx.paymentProvenanceRef,
        metadata: jsonOrNull(ctx.metadata)
      }
    })
  }

  /**
   * Reads the per-currency P2P tax rate from MarketplaceEconomyConfig.
   * WCOIN uses the fixed-point accumulator (settleTaxedCredit below);
   * GOBLIN_POINT/HUNT_POINT keep the pre-existing floor-based percentage
   * behavior, explicitly preserved at their current rate per instruction
   * ("do NOT raise GP/HP to 10% in this phase").
   */
  private async taxRatePercent(tx: Prisma.TransactionClient, currency: CurrencyCode): Promise<number> {
    const economy = await tx.marketplaceEconomyConfig.findUnique({ where: { id: 'default' } })
    if (!economy) return 0
    const raw =
      currency === 'WCOIN'
        ? economy.wcoinTaxPercent
        : currency === 'GOBLIN_POINT'
          ? economy.goblinPointTaxPercent
          : economy.huntPointTaxPercent
    return Math.max(0, Math.min(100, raw))
  }

  /**
   * Settles the receiving account's fee accumulator against its CURRENT
   * balance, never driving it negative. If the account can't cover the
   * full collectible whole-unit amount (e.g. it was drained by a spend
   * between accrual and settlement), collects only what's affordable and
   * leaves the remainder in the accumulator for the next attempt --
   * correctness converges over time rather than blocking in the moment,
   * and the no-negative-balance invariant always holds.
   */
  private async settleAccumulator(tx: Prisma.TransactionClient, accountId: string, currency: CurrencyCode) {
    const wallet = await tx.accountCurrency.findUnique({ where: { accountId_currency: { accountId, currency } } })
    const accumulator = wallet?.feeAccumulatorSubunits || 0
    const balance = wallet?.balance || 0
    const collectibleWc = Math.floor(accumulator / SUBUNITS_PER_UNIT)
    if (collectibleWc <= 0) return { collectedWc: 0, accumulatorAfter: accumulator }

    const actuallyCollectedWc = Math.min(collectibleWc, balance)
    const accumulatorAfter = accumulator - actuallyCollectedWc * SUBUNITS_PER_UNIT

    await tx.accountCurrency.update({
      where: { accountId_currency: { accountId, currency } },
      data: {
        balance: { decrement: actuallyCollectedWc },
        feeAccumulatorSubunits: accumulatorAfter
      }
    })

    return { collectedWc: actuallyCollectedWc, accumulatorAfter }
  }

  /**
   * The core taxed P2P transfer: buyer already debited the full gross
   * amount elsewhere (matches the real, existing marketplace flow where
   * the buyer is charged at order-creation time, before this settlement
   * runs at completion time). This method credits the SELLER the full
   * gross amount, accrues the exact fee obligation into their
   * accumulator, and immediately attempts to settle whatever whole-unit
   * amount that accumulator now supports -- for a WHOLE-unit-multiple
   * gross amount (e.g. 100 WC at 10% = 10 WC), the fee is exact and
   * collects in this same call; for a small amount (e.g. 1 WC), the
   * seller gets the full 1 WC now and the 0.1 WC obligation waits in the
   * accumulator across future transactions (EXACT_CUMULATIVE_10_PERCENT
   * still holds -- see wc-fee-accumulator.test.mjs for the reference
   * proof this mirrors).
   *
   * Deliberately does NOT touch the buyer's side -- that debit already
   * happened via `debit()` elsewhere in the same outer transaction, with
   * its own ledger entry. This keeps "the buyer paid X" and "the seller's
   * fee settled to Y" as two independently-idempotent, independently-
   * retriable steps rather than one large one.
   */
  async settleTaxedCredit(
    tx: Prisma.TransactionClient,
    accountId: string,
    counterpartyAccountId: string,
    currency: CurrencyCode,
    grossAmount: number,
    ctx: LedgerContext
  ): Promise<{ feeAmountCollected: number; netAmount: number; entry: Prisma.WalletLedgerEntryGetPayload<object> }> {
    if (!Number.isInteger(grossAmount) || grossAmount <= 0) {
      throw new BadRequestException('Valor de credito taxado invalido.')
    }

    const existing = await this.ledgerRowForIdempotencyKey(tx, ctx.idempotencyKey)
    if (existing) {
      return { feeAmountCollected: existing.taxAmount, netAmount: existing.netAmount, entry: existing }
    }

    const ratePercent = await this.taxRatePercent(tx, currency)

    // Exact fee obligation in subunits -- grossAmount * SUBUNITS_PER_UNIT
    // * ratePercent / 100. For WCOIN's default 10% this is always an
    // exact integer (grossAmount * 1,000), no remainder ever possible;
    // for any other configured rate this integer division floors toward
    // zero, which is the conservative direction (never invents fee
    // obligation that wasn't actually configured).
    const feeObligationSubunits = Math.floor((grossAmount * SUBUNITS_PER_UNIT * ratePercent) / 100)

    const beforeWallet = await tx.accountCurrency.upsert({
      where: { accountId_currency: { accountId, currency } },
      create: { accountId, currency, balance: grossAmount, feeAccumulatorSubunits: feeObligationSubunits },
      update: {
        balance: { increment: grossAmount },
        feeAccumulatorSubunits: { increment: feeObligationSubunits }
      }
    })
    const accumulatorBefore = beforeWallet.feeAccumulatorSubunits - feeObligationSubunits

    const { collectedWc, accumulatorAfter } = await this.settleAccumulator(tx, accountId, currency)

    const entry = await tx.walletLedgerEntry.create({
      data: {
        idempotencyKey: ctx.idempotencyKey,
        type: ctx.type,
        currency,
        accountId,
        counterpartyAccountId,
        grossAmount,
        taxAmount: collectedWc,
        netAmount: grossAmount - collectedWc,
        feeObligationSubunits,
        feeAccumulatorSubunitsBefore: accumulatorBefore,
        feeAccumulatorSubunitsAfter: accumulatorAfter,
        sourceType: ctx.sourceType,
        sourceId: ctx.sourceId,
        paymentProvenanceRef: ctx.paymentProvenanceRef,
        metadata: jsonOrNull(ctx.metadata)
      }
    })

    return { feeAmountCollected: collectedWc, netAmount: grossAmount - collectedWc, entry }
  }

  /** Read-only helper for tests/UI: current whole-unit balance. */
  async getBalance(accountId: string, currency: CurrencyCode) {
    const wallet = await this.prisma.accountCurrency.findUnique({ where: { accountId_currency: { accountId, currency } } })
    return wallet?.balance || 0
  }

  /** Read-only helper for tests/UI: current fee accumulator (subunits). */
  async getFeeAccumulator(accountId: string, currency: CurrencyCode) {
    const wallet = await this.prisma.accountCurrency.findUnique({ where: { accountId_currency: { accountId, currency } } })
    return wallet?.feeAccumulatorSubunits || 0
  }

  /**
   * PHASE O (2026-08-31), chargeback dispersal traceability -- Decision 2
   * (docs/decisions/0016-rmt-policy-gap.md): "we must be able to trace:
   * payment -> initial credit -> A -> subsequent WC movements ->
   * counterparties. Primary responsibility remains with originator/
   * fraudster. Do not automatically punish innocent downstream players."
   *
   * Real WC provenance already exists on every ledger row
   * (paymentProvenanceRef links a credit back to its RechargeIntent), and
   * settleTaxedCredit() is the one place counterpartyAccountId is ever
   * populated: a taxed credit's own `accountId` is the RECEIVING account,
   * `counterpartyAccountId` is who paid them (see that method's own
   * comment). This traces forward from the account a payment originally
   * credited: does it appear as a counterpartyAccountId on any LATER
   * ledger row (meaning it paid someone else), and does THAT recipient in
   * turn appear as a counterparty on a still-later row, etc. -- a
   * breadth-first walk, bounded in both depth and time, so a real
   * production trace can never run unbounded.
   *
   * This is a READ-ONLY report. It never freezes, restricts, or adjusts
   * any account -- see Part 15 (risk/antifraud foundation) for where an
   * actual action would be decided, separately, by a human reviewing this
   * report's output.
   */
  async traceChargebackDispersal(rechargeIntentId: string, options: { maxHops?: number } = {}): Promise<{
    rechargeIntentId: string
    originAccountId: string | null
    originCurrency: CurrencyCode | null
    originAmount: number | null
    originatedAt: Date | null
    dispersalChain: Array<{
      hop: number
      fromAccountId: string
      toAccountId: string
      ledgerEntryId: string
      amount: number
      type: WalletTransactionType
      occurredAt: Date
    }>
    involvedAccountIds: string[]
    truncated: boolean
  }> {
    const maxHops = Math.max(1, Math.min(options.maxHops ?? 5, 10))

    const originCredit = await this.prisma.walletLedgerEntry.findFirst({
      where: { sourceType: 'RechargeIntent', sourceId: rechargeIntentId, type: 'WC_PURCHASE_CREDIT' }
    })
    if (!originCredit || !originCredit.accountId) {
      return {
        rechargeIntentId,
        originAccountId: null,
        originCurrency: null,
        originAmount: null,
        originatedAt: null,
        dispersalChain: [],
        involvedAccountIds: [],
        truncated: false
      }
    }

    const dispersalChain: Array<{
      hop: number
      fromAccountId: string
      toAccountId: string
      ledgerEntryId: string
      amount: number
      type: WalletTransactionType
      occurredAt: Date
    }> = []
    const involved = new Set<string>([originCredit.accountId])
    let frontier = [originCredit.accountId]
    let truncated = false

    for (let hop = 1; hop <= maxHops && frontier.length > 0; hop++) {
      // Only entries strictly AFTER the original credit -- tracing must
      // never pick up unrelated PRIOR activity that happens to share a
      // counterparty relationship, only what genuinely descends from this
      // specific payment.
      const outgoing = await this.prisma.walletLedgerEntry.findMany({
        where: {
          counterpartyAccountId: { in: frontier },
          currency: originCredit.currency,
          createdAt: { gt: originCredit.createdAt }
        },
        orderBy: { createdAt: 'asc' }
      })

      const nextFrontier = new Set<string>()
      for (const entry of outgoing) {
        if (!entry.accountId || !entry.counterpartyAccountId) continue
        dispersalChain.push({
          hop,
          fromAccountId: entry.counterpartyAccountId,
          toAccountId: entry.accountId,
          ledgerEntryId: entry.id,
          amount: entry.grossAmount,
          type: entry.type,
          occurredAt: entry.createdAt
        })
        if (!involved.has(entry.accountId)) {
          involved.add(entry.accountId)
          nextFrontier.add(entry.accountId)
        }
      }
      frontier = Array.from(nextFrontier)
      if (hop === maxHops && frontier.length > 0) truncated = true
    }

    return {
      rechargeIntentId,
      originAccountId: originCredit.accountId,
      originCurrency: originCredit.currency,
      originAmount: originCredit.grossAmount,
      originatedAt: originCredit.createdAt,
      dispersalChain,
      involvedAccountIds: Array.from(involved),
      truncated
    }
  }
}
