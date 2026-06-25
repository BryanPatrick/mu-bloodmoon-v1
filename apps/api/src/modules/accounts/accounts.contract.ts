import type { CurrencyCode, UserRole } from '@blood-moon/shared'

export type AccountStatus = 'active' | 'pending' | 'blocked'

export type AccountDto = {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  status: AccountStatus
  personalIdHash?: string
  currencies: Record<CurrencyCode, number>
  createdAt: string
  updatedAt: string
}
