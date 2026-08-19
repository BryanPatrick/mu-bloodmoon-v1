export const ACCOUNT_PERSONAS = ['PLAYER', 'GM', 'ADMIN', 'SUPER_ADMIN'] as const
export const GUILD_PERSONAS = [
  'GUILD_LEADER',
  'GUILD_OFFICER',
  'GUILD_TREASURER',
  'GUILD_MEMBER',
  'GUILD_RECRUIT'
] as const

export type AccountPersonaId = typeof ACCOUNT_PERSONAS[number]
export type GuildPersonaId = typeof GUILD_PERSONAS[number]
export type PersonaId = AccountPersonaId | GuildPersonaId

export const ALL_PERSONAS: readonly PersonaId[] = [...ACCOUNT_PERSONAS, ...GUILD_PERSONAS]

export const GUILD_PERSONA_ROLE_KEY: Record<GuildPersonaId, 'LEADER' | 'OFFICER' | 'TREASURER' | 'MEMBER' | 'RECRUIT'> = {
  GUILD_LEADER: 'LEADER',
  GUILD_OFFICER: 'OFFICER',
  GUILD_TREASURER: 'TREASURER',
  GUILD_MEMBER: 'MEMBER',
  GUILD_RECRUIT: 'RECRUIT'
}

export type ActivatePersonaRequest = { persona?: string }

export type ActivatePersonaResponse = {
  accessToken: string
  refreshToken: string
  persona: PersonaId
  user: {
    id: string
    username: string
    role: string
  }
  guild?: {
    slug: string
    tag: string
    roleKey: string
  }
}

export type AvailablePersonasResponse = {
  personas: PersonaId[]
}
