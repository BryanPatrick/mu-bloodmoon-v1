import { communityProfileMock, communityPostsMock, type CommunityAchievementMock } from './stage-one.mock'

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
  kind: 'publication' | 'repost' | 'tagged' | 'collaboration'
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
  achievements: CommunityAchievementMock[]
  privacy: CommunityPrivacySettings
  media: CommunityProfileMedia[]
  entries: CommunityProfileEntry[]
}

export const usernamePolicy = {
  minLength: 3,
  maxLength: 24,
  pattern: 'Letras minúsculas, números, ponto, hífen ou underline.',
  cooldownDays: 30,
  administrativeHistory: true
}

export const communitySocialProfileMock: CommunitySocialProfile = {
  ...communityProfileMock,
  coverUrl: '/images/hero-elfa-noria.png',
  bio: 'Explorando o continente de MU, organizando a guild e registrando cada conquista sob a Lua de Sangue.',
  stats: { posts: 24, followers: 1284, following: 186 },
  privacy: {
    profile: 'PUBLIC', characters: 'MAIN_ONLY', equipment: 'VISIBLE', statistics: 'SELECTIVE', guild: 'VISIBLE', activity: 'VISIBLE'
  },
  media: [
    { id: 'm1', imageUrl: '/images/hero-elfa-noria.png', alt: 'Expedição em Noria' },
    { id: 'm2', imageUrl: '/images/guide-dark-lord-hero.png', alt: 'Batalha no continente' },
    { id: 'm3', imageUrl: '/images/guide-elfa-hero.png', alt: 'Fairy Elf em combate' },
    { id: 'm4', imageUrl: '/images/hero-elfa-noria.png', alt: 'Encontro da guild' },
    { id: 'm5', imageUrl: '/images/guide-dark-lord-hero.png', alt: 'Evento Blood Castle' },
    { id: 'm6', imageUrl: '/images/guide-elfa-hero.png', alt: 'Conquista da temporada' }
  ],
  entries: [
    ...communityPostsMock.slice(0, 3).map((post) => ({ id: post.id, kind: 'publication' as const, title: post.title || 'Publicação', content: post.content, createdAt: post.createdAt })),
    { id: 'share-1', kind: 'repost', title: 'Rota de progressão compartilhada', content: 'Conteúdo de @lyramoon compartilhado com a guild.', createdAt: 'há 2 dias', author: 'lyramoon' },
    { id: 'tag-1', kind: 'tagged', title: 'Treino de Castle Siege', content: 'Marcado por @dariusbm no registro do treino.', createdAt: 'há 4 dias', author: 'dariusbm' },
    { id: 'collab-1', kind: 'collaboration', title: 'Guia de progressão em grupo', content: 'Publicação criada em colaboração com @lyramoon.', createdAt: 'há 1 semana', author: 'lyramoon' }
  ]
}

export const profileForUsername = (username: string): CommunitySocialProfile => ({
  ...communitySocialProfileMock,
  username: username.toLowerCase(),
  displayName: username.toLowerCase() === communitySocialProfileMock.username ? communitySocialProfileMock.displayName : username
})
