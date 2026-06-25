export type CharacterStatus = 'online' | 'offline' | 'blocked'

export type CharacterDto = {
  id: string
  accountId: string
  name: string
  className: string
  level: number
  reset: number
  masterReset: number
  map: string
  guild?: string
  pkStatus: string
  status: CharacterStatus
}

export type AdminCharacterAction =
  | 'block'
  | 'unblock'
  | 'move-map'
  | 'clear-pk'
  | 'reset-character'
  | 'disconnect'
