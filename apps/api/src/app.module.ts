export const apiModules = [
  'auth',
  'accounts',
  'characters',
  'shop',
  'recharge',
  'audit',
  'references',
  'tickets',
  'game-integration'
] as const

export type ApiModuleName = typeof apiModules[number]
