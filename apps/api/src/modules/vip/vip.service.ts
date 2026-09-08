import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { VipTier } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PaymentRiskService } from '../commerce/payment-risk.service'
import { WalletLedgerService } from '../wallet/wallet-ledger.service'
import type { PurchaseVipPayload, UpsertVipBenefitConfigPayload, UpsertVipProductConfigPayload } from './vip.contract'

const DAY_MS = 86_400_000

function clampNonNegativeInt(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < 0) return fallback
  return Math.min(value as number, max)
}

@Injectable()
export class VipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly walletLedger: WalletLedgerService,
    private readonly paymentRisk: PaymentRiskService
  ) {}

  /** Public catalog -- only enabled, priced combinations are shown. */
  async listCatalog() {
    const rows = await this.prisma.vipProductConfig.findMany({
      where: { enabled: true, price: { gt: 0 } },
      orderBy: [{ tier: 'asc' }, { durationDays: 'asc' }]
    })
    return rows.map((row) => this.mapProduct(row))
  }

  async getMyEntitlement(user: AuthenticatedUser) {
    const entitlement = await this.prisma.vipEntitlement.findUnique({ where: { accountId: user.id } })
    return this.mapEntitlement(entitlement, user.id)
  }

  // PHASE Q (2026-08-31), Part 3 -- public, player-facing benefit list.
  // Deliberately returns ONLY the two real, approved benefit fields
  // (warehouseBonusPages/commandCostReductionPercent) and only when
  // actually > 0 -- xpBonusPercent/dropBonusPercent/chaosMachineBonusPercent/
  // resetBenefitEnabled are never included at all, not even as "disabled"
  // placeholders, so the purchase page can never accidentally tease an
  // unapproved benefit as coming soon. See upsertBenefitConfig()'s own
  // comment for why those four stay hard-clamped.
  async listPublicBenefits() {
    const configs = await this.listBenefitConfigs()
    return configs.map((config) => ({
      tier: config.tier,
      benefits: [
        ...(config.warehouseBonusPages > 0 ? [{ key: 'warehouseBonusPages', label: `+${config.warehouseBonusPages} paginas de warehouse`, value: config.warehouseBonusPages }] : []),
        ...(config.commandCostReductionPercent > 0 ? [{ key: 'commandCostReductionPercent', label: `-${config.commandCostReductionPercent}% no custo de comandos`, value: config.commandCostReductionPercent }] : [])
      ]
    }))
  }

  // PHASE Q (2026-08-31), Part 15 -- VIP purchase history for the
  // player's own "Meus Pedidos" page. Payment status is always "PAID" for
  // an existing VipGrant row -- the WC debit is atomic with the grant
  // itself (see purchase()'s own transaction), there is no
  // pending/failed payment state to represent here, unlike a real-money
  // recharge. Delivery status is derived from the entitlement's CURRENT
  // state, not raw GameBridgeJob/AccountLevel internals (ADR-0001: the
  // Portal's own VipEntitlement is the source of truth; the GameServer
  // sync is a background reconciliation concern already surfaced to
  // admins elsewhere, not something to expose to the player here).
  async listMyVipHistory(user: AuthenticatedUser) {
    const grants = await this.prisma.vipGrant.findMany({
      where: { accountId: user.id },
      orderBy: { grantedAt: 'desc' },
      take: 50
    })
    if (!grants.length) return []

    // The real price actually paid, from the ledger row itself -- not
    // the CURRENT VipProductConfig price, which may have changed since
    // (grossAmount on the debit row this purchase's own idempotencyKey
    // produced is the honest historical figure).
    const debitKeys = grants.map((grant) => `vip-purchase-debit:${grant.idempotencyKey}`)
    const debits = await this.prisma.walletLedgerEntry.findMany({
      where: { idempotencyKey: { in: debitKeys } },
      select: { idempotencyKey: true, grossAmount: true, currency: true }
    })
    const debitByKey = new Map(debits.map((debit) => [debit.idempotencyKey, debit]))

    const now = Date.now()
    return grants.map((grant) => {
      const debit = debitByKey.get(`vip-purchase-debit:${grant.idempotencyKey}`)
      return {
        id: grant.id,
        tier: grant.tier,
        durationDays: grant.durationDays,
        price: debit?.grossAmount ?? null,
        currency: debit?.currency ?? 'WCOIN',
        grantedAt: grant.grantedAt.toISOString(),
        newExpiresAt: grant.newExpiresAt.toISOString(),
        paymentStatus: 'PAID' as const,
        deliveryStatus: grant.newExpiresAt.getTime() > now ? ('ACTIVE' as const) : ('EXPIRED' as const)
      }
    })
  }

  /**
   * Purchases (tier, durationDays) if a matching, enabled
   * VipProductConfig row exists. Not driven by any hardcoded
   * duration whitelist -- whatever the admin has configured and enabled
   * is what's purchasable, which is why a request for an unconfigured
   * duration is naturally rejected (VIP_INVALID_DURATION_REJECTED)
   * without this service needing to know the old GameServer's 15-30 day
   * range at all.
   *
   * Completes synchronously in one transaction: debit -> extend
   * VipEntitlement -> VipGrant row -> queue GameBridge sync. Idempotent
   * on `payload.idempotencyKey` (client-supplied, defaults to a fresh
   * UUID) -- VIP_DUPLICATE_DELIVERY_SAFE holds because both the ledger
   * debit and the VipGrant row share unique-constrained idempotency keys.
   */
  async purchase(user: AuthenticatedUser, payload: PurchaseVipPayload) {
    // PHASE Q (2026-08-31), Part 5 -- ACCOUNT_RESTRICTION covers VIP
    // purchase (a commercial action, spends WC balance).
    await this.paymentRisk.assertNoActiveAccountRestriction(user.id, 'compra de VIP')

    if (!Number.isInteger(payload.durationDays) || payload.durationDays <= 0) {
      throw new BadRequestException('Duracao de VIP invalida.')
    }

    const product = await this.prisma.vipProductConfig.findUnique({
      where: { tier_durationDays: { tier: payload.tier, durationDays: payload.durationDays } }
    })
    if (!product || !product.enabled || product.price <= 0) {
      throw new BadRequestException('Este plano de VIP nao esta disponivel para compra.')
    }

    const idempotencyKey = payload.idempotencyKey?.trim() || randomUUID()

    const existingGrant = await this.prisma.vipGrant.findUnique({ where: { idempotencyKey } })
    if (existingGrant) {
      const entitlement = await this.prisma.vipEntitlement.findUnique({ where: { id: existingGrant.vipEntitlementId } })
      return this.mapEntitlement(entitlement, user.id)
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date()
      const current = await tx.vipEntitlement.findUnique({ where: { accountId: user.id } })
      const currentlyActive = Boolean(current?.expiresAt && current.expiresAt > now)

      // PHASE Q DECISION CLOSURE (2026-08-31), Decision 3 -- Bryan's own
      // explicit reversal of the previous "latest-tier-wins + additive
      // days" behavior (that rule could silently convert e.g. 20
      // remaining Bronze days + a 30-day Gold purchase into 50 Gold
      // days, destroying/inflating value with no real conversion basis).
      // Conservative interim policy until a real value-conversion model
      // is designed (see OQ-025, VIP_TIER_CHANGE_VALUE_CONVERSION):
      // SAME tier while active -> allowed, extends normally (unchanged).
      // DIFFERENT tier while active -> blocked outright, current VIP
      // must expire first. Never silent -- a clear, specific error.
      if (currentlyActive && current!.tier !== product.tier) {
        throw new BadRequestException({
          code: 'VIP_TIER_CHANGE_BLOCKED',
          message: `Voce ja possui VIP ${current!.tier} ativo. Aguarde expirar para comprar um nivel diferente -- um sistema de troca/upgrade entre niveis ainda esta sendo desenhado.`
        })
      }

      await this.walletLedger.debit(tx, user.id, product.currency, product.price, {
        idempotencyKey: `vip-purchase-debit:${idempotencyKey}`,
        type: 'STORE_PURCHASE',
        sourceType: 'VipProductConfig',
        sourceId: product.id,
        metadata: { tier: product.tier, durationDays: product.durationDays }
      })

      // Extend-in-place: if currently active with remaining time (now
      // always the SAME tier, per the check above), the new duration is
      // added on top rather than lost (repurchase-while-active safety).
      // If inactive/expired, the new period starts from now.
      const baseExpiry = currentlyActive ? current!.expiresAt! : now
      const newExpiresAt = new Date(baseExpiry.getTime() + product.durationDays * DAY_MS)

      const entitlement = await tx.vipEntitlement.upsert({
        where: { accountId: user.id },
        create: {
          accountId: user.id,
          tier: product.tier,
          activatedAt: now,
          expiresAt: newExpiresAt,
          totalDaysGranted: product.durationDays,
          status: 'ACTIVE'
        },
        update: {
          tier: product.tier,
          activatedAt: current?.status === 'ACTIVE' ? current.activatedAt : now,
          expiresAt: newExpiresAt,
          totalDaysGranted: { increment: product.durationDays },
          status: 'ACTIVE'
        }
      })

      await tx.vipGrant.create({
        data: {
          vipEntitlementId: entitlement.id,
          accountId: user.id,
          tier: product.tier,
          durationDays: product.durationDays,
          sourceType: 'VipProductConfig',
          sourceId: product.id,
          idempotencyKey,
          previousExpiresAt: current?.expiresAt || null,
          newExpiresAt
        }
      })

      // GameServer sync foundation only -- no worker consumes GRANT_VIP
      // jobs yet this phase (see the schema comment on GameBridgeOperation).
      // apps/api remains the source of truth for entitlement status in
      // the meantime.
      await tx.gameBridgeJob.create({
        data: {
          accountId: user.id,
          operation: 'GRANT_VIP',
          idempotencyKey: `vip-bridge:${idempotencyKey}`,
          payload: { accountId: user.id, tier: product.tier, expiresAt: newExpiresAt.toISOString() }
        }
      })

      return entitlement
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'vip.purchased',
      targetType: 'VipEntitlement',
      targetId: result.id,
      metadata: { tier: product.tier, durationDays: product.durationDays, price: product.price, currency: product.currency }
    })

    return this.mapEntitlement(result, user.id)
  }

  // --- Admin catalog/benefit management ---------------------------------

  async listAllProducts() {
    const rows = await this.prisma.vipProductConfig.findMany({ orderBy: [{ tier: 'asc' }, { durationDays: 'asc' }] })
    return rows.map((row) => this.mapProduct(row))
  }

  async upsertProduct(payload: UpsertVipProductConfigPayload, user: AuthenticatedUser) {
    if (!Number.isInteger(payload.durationDays) || payload.durationDays <= 0) {
      throw new BadRequestException('Duracao invalida.')
    }
    if (!Number.isInteger(payload.price) || payload.price < 0) {
      throw new BadRequestException('Preco invalido.')
    }

    const row = await this.prisma.vipProductConfig.upsert({
      where: { tier_durationDays: { tier: payload.tier, durationDays: payload.durationDays } },
      create: {
        tier: payload.tier,
        durationDays: payload.durationDays,
        price: payload.price,
        currency: payload.currency,
        enabled: payload.enabled,
        updatedBy: user.username
      },
      update: {
        price: payload.price,
        currency: payload.currency,
        enabled: payload.enabled,
        updatedBy: user.username
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.vip.product.upsert',
      targetType: 'VipProductConfig',
      targetId: row.id,
      metadata: payload as unknown as Record<string, unknown>
    })

    return this.mapProduct(row)
  }

  async listBenefitConfigs() {
    const tiers: VipTier[] = ['BRONZE', 'SILVER', 'GOLD']
    const rows = await this.prisma.vipBenefitConfig.findMany()
    const byTier = new Map(rows.map((row) => [row.tier, row]))
    return tiers.map((tier) => byTier.get(tier) || {
      tier,
      xpBonusPercent: 0,
      dropBonusPercent: 0,
      chaosMachineBonusPercent: 0,
      resetBenefitEnabled: false,
      warehouseBonusPages: 0,
      commandCostReductionPercent: 0,
      enabled: false,
      updatedBy: null,
      updatedAt: null
    })
  }

  /**
   * Admin-only. Bryan approved exactly two benefit categories as
   * non-power "convenience" (docs/vip/vip-benefit-decisions.md):
   * warehouseBonusPages and commandCostReductionPercent -- those two are
   * persisted as real, requested values (clamped only to a sane range,
   * never forced to 0). Every other bonus field (xpBonusPercent,
   * dropBonusPercent, chaosMachineBonusPercent, resetBenefitEnabled) is
   * still hard-clamped to 0/false regardless of what's requested --
   * those remain "candidates pending balance analysis," not approved.
   * Removing a clamp is always a deliberate, separate future decision
   * per field, never a blanket unlock.
   */
  async upsertBenefitConfig(payload: UpsertVipBenefitConfigPayload, user: AuthenticatedUser) {
    const warehouseBonusPages = clampNonNegativeInt(payload.warehouseBonusPages, 0, 50)
    const commandCostReductionPercent = clampNonNegativeInt(payload.commandCostReductionPercent, 0, 100)

    const row = await this.prisma.vipBenefitConfig.upsert({
      where: { tier: payload.tier },
      create: {
        tier: payload.tier,
        xpBonusPercent: 0,
        dropBonusPercent: 0,
        chaosMachineBonusPercent: 0,
        resetBenefitEnabled: false,
        warehouseBonusPages,
        commandCostReductionPercent,
        enabled: payload.enabled ?? false,
        updatedBy: user.username
      },
      update: {
        // These four remain forced to 0/false -- not approved.
        xpBonusPercent: 0,
        dropBonusPercent: 0,
        chaosMachineBonusPercent: 0,
        resetBenefitEnabled: false,
        // These two are real, per Bryan's explicit approval.
        warehouseBonusPages,
        commandCostReductionPercent,
        enabled: payload.enabled ?? false,
        updatedBy: user.username
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.vip.benefit.upsert',
      targetType: 'VipBenefitConfig',
      targetId: row.tier,
      metadata: {
        requested: payload,
        applied: { warehouseBonusPages, commandCostReductionPercent, xpBonusPercent: 0, dropBonusPercent: 0, chaosMachineBonusPercent: 0, resetBenefitEnabled: false },
        note: 'xp/drop/chaosMachine/reset benefits remain clamped to disabled/zero pending balance analysis; warehouse pages and command cost reduction are real per Bryan\'s approval'
      }
    })

    return row
  }

  private mapProduct(row: { id: string, tier: VipTier, durationDays: number, price: number, currency: string, enabled: boolean }) {
    return {
      id: row.id,
      tier: row.tier,
      durationDays: row.durationDays,
      price: row.price,
      currency: row.currency,
      enabled: row.enabled
    }
  }

  private mapEntitlement(
    entitlement: { id: string, tier: VipTier | null, activatedAt: Date | null, expiresAt: Date | null, totalDaysGranted: number, status: string } | null,
    accountId: string
  ) {
    if (!entitlement) {
      return { accountId, tier: null, activatedAt: null, expiresAt: null, totalDaysGranted: 0, status: 'INACTIVE' as const, isActiveNow: false }
    }
    const isActiveNow = !!entitlement.expiresAt && entitlement.expiresAt.getTime() > Date.now()
    return {
      accountId,
      tier: entitlement.tier,
      activatedAt: entitlement.activatedAt?.toISOString() || null,
      expiresAt: entitlement.expiresAt?.toISOString() || null,
      totalDaysGranted: entitlement.totalDaysGranted,
      status: isActiveNow ? 'ACTIVE' : 'EXPIRED',
      isActiveNow
    }
  }
}
