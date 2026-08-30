import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { VipTier } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WalletLedgerService } from '../wallet/wallet-ledger.service'
import type { PurchaseVipPayload, UpsertVipBenefitConfigPayload, UpsertVipProductConfigPayload } from './vip.contract'

const DAY_MS = 86_400_000

@Injectable()
export class VipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly walletLedger: WalletLedgerService
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
      await this.walletLedger.debit(tx, user.id, product.currency, product.price, {
        idempotencyKey: `vip-purchase-debit:${idempotencyKey}`,
        type: 'STORE_PURCHASE',
        sourceType: 'VipProductConfig',
        sourceId: product.id,
        metadata: { tier: product.tier, durationDays: product.durationDays }
      })

      const now = new Date()
      const current = await tx.vipEntitlement.findUnique({ where: { accountId: user.id } })
      // Extend-in-place: if currently active with remaining time, the new
      // duration is added on top rather than lost (repurchase-while-active
      // safety). If inactive/expired, the new period starts from now.
      // Tier policy (not fully decided upstream, documented here as this
      // implementation's choice): the tier of the LATEST purchase applies
      // going forward; days always stack additively regardless of tier
      // changes between purchases.
      const baseExpiry = current?.expiresAt && current.expiresAt > now ? current.expiresAt : now
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
      enabled: false,
      updatedBy: null,
      updatedAt: null
    })
  }

  /**
   * Admin-only. Deliberately does NOT let a caller set a nonzero bonus
   * without an explicit, separate confirmation this phase forbids by
   * design -- every bonus percent request is clamped to 0 here
   * regardless of what's sent, and `enabled` can never be set true. See
   * ECONOMY_PHASE_13 scope: "Do NOT define Bronze +X XP... yet."
   * Removing this clamp is a deliberate, separate future decision, not
   * an oversight.
   */
  async upsertBenefitConfig(payload: UpsertVipBenefitConfigPayload, user: AuthenticatedUser) {
    const row = await this.prisma.vipBenefitConfig.upsert({
      where: { tier: payload.tier },
      create: {
        tier: payload.tier,
        xpBonusPercent: 0,
        dropBonusPercent: 0,
        chaosMachineBonusPercent: 0,
        resetBenefitEnabled: false,
        enabled: false,
        updatedBy: user.username
      },
      update: {
        // Values are recorded (so an admin can see what WOULD be
        // configured) but never activated this phase.
        xpBonusPercent: 0,
        dropBonusPercent: 0,
        chaosMachineBonusPercent: 0,
        resetBenefitEnabled: false,
        enabled: false,
        updatedBy: user.username
      }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'admin.vip.benefit.upsert',
      targetType: 'VipBenefitConfig',
      targetId: row.tier,
      metadata: { requested: payload, appliedEnabled: false, note: 'VIP benefits are not approved this phase; request clamped to disabled/zero' }
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
