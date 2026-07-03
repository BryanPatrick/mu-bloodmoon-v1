import type { CurrencyCode, PurchaseIntentStatus, RechargeIntentStatus, ShopProductStatus } from '@prisma/client'

export type CommerceQuery = {
  page?: string
  pageSize?: string
  search?: string
  currency?: CurrencyCode
  category?: string
  status?: ShopProductStatus
}

export type ShopProductPayload = {
  key?: string
  name: string
  short: string
  category: string
  description: string
  price: number
  currency: CurrencyCode
  status?: ShopProductStatus
  stock?: number | null
}

export type RechargePackagePayload = {
  key?: string
  currency: CurrencyCode
  amount: number
  bonus?: number
  price: string
  highlight?: boolean
  active?: boolean
}

export type CreatePurchaseIntentPayload = {
  productId: string
}

export type CreateRechargeIntentPayload = {
  packageId: string
}

export type UpdatePurchaseStatusPayload = {
  status: PurchaseIntentStatus
}

export type UpdateRechargeStatusPayload = {
  status: RechargeIntentStatus
}
