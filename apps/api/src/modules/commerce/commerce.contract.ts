import type {
  CurrencyCode,
  PurchaseIntentStatus,
  RechargeIntentStatus,
  ShopProductStatus,
  StoreDeliveryStatus,
  StoreDeliveryTarget
} from '@prisma/client'

export type CommerceQuery = {
  page?: string
  pageSize?: string
  search?: string
  currency?: CurrencyCode
  category?: string
  categoryId?: string
  status?: ShopProductStatus
  featured?: string
  includeDeleted?: string
  missingImage?: string
  missingPrice?: string
  ambiguous?: string
  from?: string
  to?: string
}

export type StoreCategoryPayload = {
  name: string
  slug?: string
  description?: string | null
  image?: string | null
  sortOrder?: number
  active?: boolean
}

export type ShopProductPayload = {
  key?: string
  slug?: string
  name: string
  short?: string
  category: string
  categoryId?: string | null
  summary?: string | null
  description: string
  price?: number
  currency?: CurrencyCode
  status?: ShopProductStatus
  stock?: number | null
  images?: string[]
  featured?: boolean
  deliveryTarget?: StoreDeliveryTarget
  accountLimit?: number | null
  periodLimit?: number | null
  periodDays?: number | null
  saleStartsAt?: string | null
  saleEndsAt?: string | null
  scheduledPublishAt?: string | null
  technicalCode?: string | null
  sourceOrigin?: string | null
  ambiguous?: boolean
  internalNotes?: string | null
  revisionReason?: string | null
  sortOrder?: number
  workDescription?: string
  workEvidence?: unknown
  workDurationMinutes?: number
}

export type ShopProductVariantPayload = {
  name: string
  sku?: string
  durationSeconds?: number | null
  quantity?: number
  itemLevel?: number | null
  options?: unknown
  price: number
  currency: CurrencyCode
  stock?: number | null
  available?: boolean
  accountLimit?: number | null
  periodLimit?: number | null
  periodDays?: number | null
  deliveryTarget?: StoreDeliveryTarget | null
  sortOrder?: number
  technicalData?: unknown
}

export type StoreProductTransitionPayload = {
  action: 'submit-review' | 'approve' | 'reject' | 'publish' | 'schedule' | 'deactivate' | 'archive' | 'restore' | 'delete'
  reason?: string
  scheduledPublishAt?: string
  workDescription?: string
  evidence?: unknown
  durationMinutes?: number
}

export type StoreReorderPayload = {
  ids: string[]
}

export type StoreBulkProductPayload = {
  ids: string[]
  action: StoreProductTransitionPayload['action']
  reason?: string
  scheduledPublishAt?: string
}

export type StoreCatalogImportPayload = {
  limit?: number
  dryRun?: boolean
}

export type CreatePurchaseIntentPayload = {
  productId: string
  variantId?: string
  quantity?: number
  destinationCharacterId?: string
  // Launcher CMS Studio phase (Part V/W) -- required whenever an active
  // StorePurchaseTerms version exists. The frontend checkbox is UX only;
  // this is what the backend actually checks.
  termsVersion?: number
}

export type StoreOrderActionPayload = {
  action: 'mark-paid' | 'deliver' | 'manual-review' | 'cancel' | 'refund'
  reason?: string
  note?: string
  evidence?: unknown
}

export type StoreOrderNotePayload = {
  content: string
  evidence?: unknown
}

export type StoreDeliveryActionPayload = {
  action: 'process' | 'complete' | 'fail' | 'reprocess' | 'manual-review' | 'refund'
  error?: string
  evidence?: unknown
}

export type StoreProductTestPayload = {
  productId: string
  variantId?: string
  testAccountId: string
  testCharacter?: string
  simulatePurchase?: boolean
  testDelivery?: boolean
  rollback?: boolean
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

export type CreateRechargeIntentPayload = {
  packageId: string
}

export type UpdatePurchaseStatusPayload = {
  status: PurchaseIntentStatus
}

export type UpdateRechargeStatusPayload = {
  status: RechargeIntentStatus
  reason?: string
}

export type MercadoPagoWebhookInput = {
  signature: string | undefined
  requestId: string | undefined
  dataId: string | undefined
  body: { action: string; type: string; data: { id: string } }
}
