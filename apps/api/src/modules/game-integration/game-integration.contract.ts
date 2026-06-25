export type GameAccountSnapshot = {
  username: string
  blocked: boolean
  warehouseLocked: boolean
  lastGameLoginAt?: string
}

export type GameCharacterSnapshot = {
  name: string
  accountUsername: string
  classCode: number
  level: number
  reset: number
  masterReset: number
  mapCode: number
  x: number
  y: number
}

export type GameWriteOperation =
  | 'credit-currency'
  | 'deliver-item'
  | 'move-character'
  | 'disconnect-character'
  | 'block-account'
