export type CommunityAchievementMock = {
  id: string
  name: string
  description: string
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário'
  earnedAt: string
  playerPercentage: string
  icon: 'trophy' | 'shield' | 'swords' | 'star' | 'crown'
}

export type CommunityProfileMock = {
  displayName: string
  username: string
  avatarUrl: string
  mainCharacter: { name: string; className: string }
  guild: string
  achievements: CommunityAchievementMock[]
}

export type CommunityPostMock = {
  id: string
  type: 'normal' | 'achievement' | 'official' | 'sponsored' | 'event' | 'marketplace'
  badge: string
  author: { name: string; username: string; avatarUrl: string }
  createdAt: string
  title?: string
  content: string
  imageUrl?: string
  meta?: string
  reactions: number
  comments: number
}

export const communityProfileMock: CommunityProfileMock = {
  displayName: 'Bryan Patrick',
  username: 'bryan',
  avatarUrl: '/images/logo-bloodmoon.png',
  mainCharacter: { name: 'BloodKnight', className: 'Blade Master' },
  guild: 'BloodLegion',
  achievements: [
    { id: 'first-blood', name: 'Primeiro sangue', description: 'Venceu o primeiro duelo na comunidade.', rarity: 'Comum', earnedAt: '12 jul 2026', playerPercentage: '64%', icon: 'swords' },
    { id: 'guardian', name: 'Guardião', description: 'Participou de uma defesa de guild.', rarity: 'Raro', earnedAt: '18 jul 2026', playerPercentage: '31%', icon: 'shield' },
    { id: 'collector', name: 'Colecionador', description: 'Registrou cinco conquistas no perfil.', rarity: 'Raro', earnedAt: '21 jul 2026', playerPercentage: '24%', icon: 'star' },
    { id: 'champion', name: 'Campeão da Lua', description: 'Alcançou uma colocação de destaque.', rarity: 'Épico', earnedAt: '25 jul 2026', playerPercentage: '8%', icon: 'trophy' },
    { id: 'blood-crown', name: 'Coroa de Sangue', description: 'Conquista especial da temporada.', rarity: 'Lendário', earnedAt: '30 jul 2026', playerPercentage: '2%', icon: 'crown' }
  ]
}

export const communityPostsMock: CommunityPostMock[] = [
  {
    id: 'post-normal', type: 'normal', badge: 'Seguindo', createdAt: 'há 12 min',
    author: { name: 'Lyra Moon', username: 'lyramoon', avatarUrl: '/images/hero-elfa-noria.png' },
    content: 'Qual mapa vocês preferem para começar a progressão em grupo? Estou organizando uma rota para a guild.',
    reactions: 28, comments: 11
  },
  {
    id: 'post-achievement', type: 'achievement', badge: 'Conquista', createdAt: 'há 36 min',
    author: { name: 'Darius', username: 'dariusbm', avatarUrl: '/images/guide-dark-lord-hero.png' },
    title: 'Campeão da Lua desbloqueado',
    content: 'Uma nova conquista foi adicionada ao perfil. A jornada continua.',
    meta: 'Conquista épica', reactions: 74, comments: 19
  },
  {
    id: 'post-official', type: 'official', badge: 'Oficial', createdAt: 'há 1 h',
    author: { name: 'Blood Moon', username: 'bloodmoon', avatarUrl: '/images/logo-bloodmoon.png' },
    title: 'Community Blood Moon',
    content: 'Estamos preparando um novo espaço para jogadores, guilds, eventos e conquistas. Esta publicação demonstra a composição visual da experiência.',
    imageUrl: '/images/guide-dark-lord-hero.png', reactions: 132, comments: 42
  },
  {
    id: 'post-sponsored', type: 'sponsored', badge: 'Patrocinado', createdAt: 'hoje',
    author: { name: 'Loja Blood Moon', username: 'lojabloodmoon', avatarUrl: '/images/logo-bloodmoon.png' },
    title: 'Novidades da loja',
    content: 'Espaço reservado para campanhas oficiais claramente identificadas.',
    reactions: 18, comments: 3
  },
  {
    id: 'post-event', type: 'event', badge: 'Evento', createdAt: 'amanhã, 20:00',
    author: { name: 'Eventos Blood Moon', username: 'eventos', avatarUrl: '/images/logo-bloodmoon.png' },
    title: 'Blood Castle', content: 'Reúna seu grupo e prepare-se para o próximo evento do servidor.',
    meta: 'Servidor · 20:00', reactions: 51, comments: 16
  },
  {
    id: 'post-marketplace', type: 'marketplace', badge: 'Marketplace', createdAt: 'há 2 h',
    author: { name: 'Kael', username: 'kaeltrade', avatarUrl: '/images/guide-elfa-hero.png' },
    title: 'Item anunciado', content: 'Um novo anúncio foi compartilhado com a comunidade.',
    meta: 'Visualização de integração futura', reactions: 9, comments: 4
  }
]

export const communityAdsMock = [
  { id: 'store', label: 'Publicidade', title: 'Loja Blood Moon', description: 'Confira as novidades preparadas para o servidor.', imageUrl: '/images/guide-dark-lord-hero.png', action: 'Conhecer a loja', to: '/loja' },
  { id: 'season', label: 'Patrocinado', title: 'Temporada Blood Moon', description: 'Acompanhe eventos, novidades e atualizações oficiais.', imageUrl: '/images/hero-elfa-noria.png', action: 'Ver notícias', to: '/noticias' }
]

export const communityEventsMock = [
  { id: 'blood-castle', time: '20:00', type: 'Servidor', title: 'Blood Castle' },
  { id: 'castle-training', time: '21:00', type: 'Guild', title: 'Treino Castle Siege' },
  { id: 'community-live', time: '22:30', type: 'Community', title: 'Encontro da comunidade' }
]

export const communityTrendingMock = ['#BloodCastle', '#FairyElf', '#CastleSiege', '#Marketplace']

export const communitySuggestionsMock = [
  { id: 'asterion', name: 'Asterion', username: 'asterion', description: 'Guias e progressão', avatarUrl: '/images/guide-dark-lord-hero.png' },
  { id: 'noria', name: 'Guardians of Noria', username: 'noria', description: 'Guild e eventos', avatarUrl: '/images/hero-elfa-noria.png' },
  { id: 'moonkeeper', name: 'Moonkeeper', username: 'moonkeeper', description: 'Notícias do servidor', avatarUrl: '/images/logo-bloodmoon.png' }
]
