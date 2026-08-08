// Canonical Community profile types. Not mock data -- these describe the real
// shape rendered from the API response (see mapProfileResponse in
// pages/comunidade/[username].vue). Moved out of features/community/data/
// (the mock directory) so components that render real profiles don't import
// their types from a file named "mock".

export type CommunityAchievement = {
  id: string
  name: string
  description: string
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário'
  earnedAt: string
  playerPercentage: string
  icon: 'trophy' | 'shield' | 'swords' | 'star' | 'crown'
}

export type CommunityPrivacySettings = {
  profile: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  characters: 'ALL' | 'MAIN_ONLY' | 'HIDDEN'
  equipment: 'VISIBLE' | 'HIDDEN'
  statistics: 'PRIVATE' | 'SELECTIVE' | 'PUBLIC'
  guild: 'VISIBLE' | 'HIDDEN'
  activity: 'VISIBLE' | 'HIDDEN'
}

export type CommunityProfileMedia = { id: string; imageUrl: string; alt: string }

export type CommunityProfileEntry = {
  id: string
  kind: 'publication' | 'repost'
  title: string
  content: string
  createdAt: string
  author?: string
}

export type CommunitySocialProfile = {
  displayName: string
  username: string
  avatarUrl: string
  coverUrl: string
  bio: string
  mainCharacter: { name: string; className: string }
  guild: string
  stats: { posts: number; followers: number; following: number }
  achievements: CommunityAchievement[]
  privacy: CommunityPrivacySettings
  media: CommunityProfileMedia[]
  entries: CommunityProfileEntry[]
}

/** A minimal, honest default -- used only while data hasn't loaded yet or for
 * fields the account genuinely hasn't set. Never presented as if it were the
 * account's real content; callers gate rendering on a separate load state. */
export const emptySocialProfile = (username: string): CommunitySocialProfile => ({
  displayName: username,
  username,
  avatarUrl: '',
  coverUrl: '',
  bio: '',
  mainCharacter: { name: '', className: '' },
  guild: '',
  stats: { posts: 0, followers: 0, following: 0 },
  achievements: [],
  privacy: {
    profile: 'PUBLIC',
    characters: 'MAIN_ONLY',
    equipment: 'VISIBLE',
    statistics: 'PRIVATE',
    guild: 'VISIBLE',
    activity: 'VISIBLE'
  },
  media: [],
  entries: []
})
