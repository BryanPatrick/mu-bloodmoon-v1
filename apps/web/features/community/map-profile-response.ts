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

/** Resolves a CommunityMedia URL (relative, e.g. `/api/media/community/xxx.webp`)
 * to an absolute one the browser can load. Real uploads are always stored and
 * returned as API-relative paths; already-absolute URLs pass through
 * unchanged. Shared so post cards, the profile header (avatar/cover) and the
 * editor preview all resolve the exact same way. */
export const resolveMediaUrl = (url: string) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase || '').replace(/\/api\/?$/, '')
  return `${base}${url}`
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
  const publications = posts.map((post: any) => ({
    id: post.id,
    kind: 'publication' as const,
    title: post.title || 'Publicação',
    content: post.content,
    createdAt: new Date(post.createdAt).toLocaleDateString('pt-BR')
  }))
  const reposts = (value.reposts || []).map((repost: any) => ({
    id: `repost-${repost.post.id}`,
    kind: 'repost' as const,
    title: repost.post.title || 'Publicação',
    content: repost.post.content,
    createdAt: new Date(repost.createdAt).toLocaleDateString('pt-BR'),
    // Template renders this as "@{{author}}" (CommunityProfileTabs.vue) --
    // a real username, not the display name, so the "@" prefix is accurate.
    author: repost.post.author?.username
  }))
  const entries = [...publications, ...reposts]
  const media = posts.flatMap((post: any) =>
    (Array.isArray(post.media) ? post.media : [])
      .map((item: any, index: number) => ({
        id: `${post.id}-${index}`,
        imageUrl: resolveMediaUrl(mediaUrl(item)),
        alt: post.title || 'Mídia da publicação'
      }))
      .filter((item: any) => item.imageUrl)
  )
  return {
    displayName: profile?.displayName || value.name || value.username,
    username: value.username,
    // Resolved here (not left to each render site) so every consumer gets
    // an already-loadable URL -- CommunityProfileHeader used to compensate
    // by calling resolveMediaUrl itself at render time, but CommunityUserRail
    // and the profile page's own mobile-avatar button rendered this raw,
    // producing a relative path the browser resolved against the Web app's
    // own origin instead of the API's -- a broken image whenever they run on
    // different origins (true in dev, and in production). resolveMediaUrl is
    // idempotent on an already-absolute URL, so CommunityProfileHeader's own
    // call stays a safe no-op.
    avatarUrl: resolveMediaUrl(profile?.avatarUrl || ''),
    coverUrl: resolveMediaUrl(profile?.coverUrl || ''),
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
