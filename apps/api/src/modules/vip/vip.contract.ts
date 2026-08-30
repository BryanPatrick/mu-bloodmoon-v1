import type { CurrencyCode, VipTier } from '@prisma/client'

export type PurchaseVipPayload = {
  tier: VipTier
  durationDays: number
  idempotencyKey?: string
}

export type UpsertVipProductConfigPayload = {
  tier: VipTier
  durationDays: number
  price: number
  currency: CurrencyCode
  enabled: boolean
}

export type UpsertVipBenefitConfigPayload = {
  tier: VipTier
  xpBonusPercent?: number
  dropBonusPercent?: number
  chaosMachineBonusPercent?: number
  resetBenefitEnabled?: boolean
  enabled?: boolean
}
