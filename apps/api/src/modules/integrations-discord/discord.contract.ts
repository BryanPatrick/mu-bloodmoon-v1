// Phase 3B Part P/Q -- explicit, PUBLIC-safe DTOs only. Never
// memb___id/memb_guid, email, Account.id, password, game credential, IP,
// 2FA, session, private account status, WCoin balances, private
// inventory, private guild admin data, Admin-only data, or raw Game
// Data/D1 rows. See docs/integrations/discord-read-api.md.

export type DiscordServerStatusResponse = {
  status: string
  statusSource: 'MANUAL' | 'LIVE' | 'UNKNOWN'
  maintenance: { active: boolean; message: string }
}

export type DiscordEventDto = {
  id: string
  name: string
  active: boolean
  startsAt: string | null
  guideUrl: string | null
}

export type DiscordEventsResponse = {
  activeEvent: DiscordEventDto | null
  upcoming: DiscordEventDto[]
}

export type DiscordRankingEntryDto = {
  position: number
  characterName: string
  className: string
  value: number
}

export type DiscordRankingsResponse = {
  // Portal-side display data (AccountCharacter), not a real MU SQL query
  // -- see discord.service.ts's doc comment for why.
  metric: 'level' | 'masterReset'
  entries: DiscordRankingEntryDto[]
}

export type DiscordNewsItemDto = {
  title: string
  category: string
  summary: string
  publicationDate: string
  websiteUrl: string
}

export type DiscordNewsResponse = {
  items: DiscordNewsItemDto[]
}
