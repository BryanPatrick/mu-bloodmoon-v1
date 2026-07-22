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
  reason?: string
}

export type UpdateAccountPermissionsPayload = {
  permissions?: Array<{ key: string; granted: boolean }>
  reason?: string
}

export type RevokeSessionsPayload = {
  reason?: string
}
