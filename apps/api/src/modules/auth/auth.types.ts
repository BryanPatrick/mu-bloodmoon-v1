import type { Role } from '@prisma/client'

export type AuthenticatedUser = {
  id: string
  username: string
  name: string
  email: string
  role: Role
  permissions: string[]
  twoFactorEnabled: boolean
  sessionVersion?: number
  sessionId?: string
}

export type AccessTokenPayload = {
  sub: string
  username: string
  role: Role
  sessionVersion: number
  sid: string
  type?: 'refresh'
}

export type StepUpTokenPayload = {
  sub: string
  sessionVersion: number
  sid: string
  type: 'step-up'
}
