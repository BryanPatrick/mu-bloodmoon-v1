import type { CurrencyCode } from '@blood-moon/shared'

export type ProductStatus = 'active' | 'draft' | 'archived'

export type ProductDto = {
  id: string
  name: string
  category: string
  description: string
  price: number
  currency: CurrencyCode
  status: ProductStatus
  stock: number | null
}

export type PurchaseStatus = 'pending' | 'paid' | 'delivered' | 'cancelled' | 'failed'
