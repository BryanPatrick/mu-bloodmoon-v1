import type { Role } from '@prisma/client'

export type AuthenticatedUser = {
  id: string
  username: string
  name: string
  email: string
  role: Role
  permissions: string[]
}

export type AccessTokenPayload = {
  sub: string
  username: string
  role: Role
  sessionVersion: number
}
