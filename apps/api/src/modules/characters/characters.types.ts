import type { CharacterRuntimeStatus } from '@prisma/client'

export type CharacterQuery = {
  search?: string
  className?: string
  status?: CharacterRuntimeStatus
}

export type CharacterActionPayload = {
  action: 'details' | 'reset-request'
}
