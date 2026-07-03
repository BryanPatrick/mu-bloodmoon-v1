import type { AccountStatus, Role } from '@prisma/client'

export type AdminAccountsQuery = {
  page?: string
  pageSize?: string
  role?: Role
  status?: AccountStatus
  search?: string
}

export type UpdateAccountPayload = {
  role?: Role
  status?: AccountStatus
}
