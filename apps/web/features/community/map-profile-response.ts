import type { CommunityAchievement, CommunitySocialProfile } from './types/profile'

const achievementRarity = (rarity: string) =>
  (({ COMMON: 'Comum', RARE: 'Raro', EPIC: 'Épico', LEGENDARY: 'Lendário' })[
    rarity
  ] as CommunityAchievement['rarity']) || 'Comum'

const mediaUrl = (media: unknown) => {
  if (typeof media === 'string') return media
  if (media && typeof media === 'object') {
    const item = media as Record<string, unknown>
    return String(item.url || item.src || item.imageUrl || '')
  }
  return ''
}

/** Maps a real `GET /community/profiles/:username` response onto the display
 * shape shared by the profile page and the home rail's own-profile card. No
 * mock/fallback data -- fields the account hasn't set render empty, never
 * invented. `entries`/`media` come only from real `communityPosts`. */
export const mapProfileResponse = (value: any): CommunitySocialProfile => {
  const profile = value.communityProfile
  const achievements: CommunityAchievement[] = (value.achievementGrants || []).map(
    (grant: any) => ({
      id: grant.achievement.id,
      name: grant.achievement.name,
      description: grant.achievement.description,
      rarity: achievementRarity(grant.achievement.rarity),
      earnedAt: new Date(grant.grantedAt).toLocaleDateString('pt-BR'),
      playerPercentage: '—',
      icon: 'trophy'
    })
  )
  const posts = value.communityPosts || []
  const entries = posts.map((post: any) => ({
    id: post.id,
    kind: 'publication' as const,
    title: post.title || 'Publicação',
    content: post.content,
    createdAt: new Date(post.createdAt).toLocaleDateString('pt-BR')
  }))
  const media = posts.flatMap((post: any) =>
    (Array.isArray(post.media) ? post.media : [])
      .map((item: any, index: number) => ({
        id: `${post.id}-${index}`,
        imageUrl: mediaUrl(item),
        alt: post.title || 'Mídia da publicação'
      }))
      .filter((item: any) => item.imageUrl)
  )
  return {
    displayName: profile?.displayName || value.name || value.username,
    username: value.username,
    avatarUrl: profile?.avatarUrl || '',
    coverUrl: profile?.coverUrl || '',
    bio: profile?.bio || '',
    mainCharacter: {
      name: profile?.mainCharacterName || '',
      className: profile?.mainCharacterClass || ''
    },
    guild: profile?.guildName || '',
    stats: value.stats || { posts: 0, followers: 0, following: 0 },
    achievements,
    entries,
    media,
    privacy: {
      profile: profile?.profileVisibility || 'PUBLIC',
      characters: profile?.charactersVisibility || 'MAIN_ONLY',
      equipment: profile?.equipmentVisibility || 'VISIBLE',
      statistics: profile?.statisticsVisibility || 'PRIVATE',
      guild: profile?.guildVisibility || 'VISIBLE',
      activity: profile?.activityVisibility || 'VISIBLE'
    }
  }
}
