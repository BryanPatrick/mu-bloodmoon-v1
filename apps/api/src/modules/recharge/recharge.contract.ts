import type { CurrencyCode } from '@blood-moon/shared'

export type RechargePackDto = {
  id: string
  currency: CurrencyCode
  amount: number
  bonus: number
  priceCents: number
  active: boolean
  highlight: boolean
}

export type RechargeStatus = 'pending' | 'paid' | 'refused' | 'cancelled' | 'refunded'
