// Right-rail decoration only (ads, events, trending topics, follow
// suggestions) -- out of scope for the Etapa 7 profile work. The profile mock
// chain that used to live in this file (CommunityProfileMock, CommunityPostMock,
// communityProfileMock, communityPostsMock) was removed once the profile page
// and the home rail's own-profile card started reading real API data instead
// -- see features/community/types/profile.ts and map-profile-response.ts.

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
