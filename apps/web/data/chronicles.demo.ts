import type { ChroniclePeriod, ChronicleStory } from '~/types/chronicles'

const isoDaysAgo = (days: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

// Presentation-only editorial content. It must never be treated as game telemetry.
export const createChronicleDemoStories = (): ChronicleStory[] => [
  {
    id: 'demo-selupan',
    slug: 'demo-selupan-cai-novamente',
    title: 'Selupan cai novamente',
    summary:
      'Uma demonstração de como as grandes batalhas poderão ganhar contexto, personagens e memória dentro da Gazeta.',
    category: 'Bosses',
    image: '/images/guide-dark-lord-hero.png',
    publishedAt: isoDaysAgo(0),
    source: 'DEMO',
    isDemo: true,
    kind: 'NEWS'
  },
  {
    id: 'demo-noria',
    slug: 'demo-arquivos-de-noria',
    title: 'Os caminhos que atravessam Noria',
    summary:
      'Uma pauta de arquivo para mostrar como mapas, lendas e descobertas poderão compor a memória do continente.',
    category: 'Mundo',
    image: '/images/hero-elfa-noria.png',
    publishedAt: isoDaysAgo(1),
    source: 'DEMO',
    isDemo: true,
    kind: 'NEWS'
  },
  {
    id: 'demo-castle-siege',
    slug: 'demo-cronica-castle-siege',
    title: 'Crônicas antes do próximo cerco',
    summary:
      'Um exemplo editorial de preparação para narrar alianças, estratégias e resultados futuros do Castle Siege.',
    category: 'Guilds',
    image: '/images/guide-dark-lord-hero.png',
    publishedAt: isoDaysAgo(3),
    source: 'DEMO',
    isDemo: true,
    kind: 'EVENT'
  },
  {
    id: 'demo-guardia',
    slug: 'demo-guardia-de-noria',
    title: 'A guarda de Noria em foco',
    summary:
      'Perfil demonstrativo para futuras histórias da comunidade, conquistas e personagens que marcarem a temporada.',
    category: 'Comunidade',
    image: '/images/guide-elfa-hero.png',
    publishedAt: isoDaysAgo(6),
    source: 'DEMO',
    isDemo: true,
    kind: 'NEWS'
  }
]

export const chronicleDemoPeriods: ChroniclePeriod[] = [
  {
    id: 'yesterday',
    eyebrow: 'Diário',
    title: 'Ontem no Blood Moon',
    description: 'Aguardando a futura integração com eventos reais do servidor.',
    topics: ['Bosses e eventos', 'Conquistas', 'Curiosidades']
  },
  {
    id: 'week',
    eyebrow: 'Semanal',
    title: 'Esta semana no Blood Moon',
    description: 'O resumo semanal será revisado editorialmente antes de ser publicado.',
    topics: ['Guilds em destaque', 'PvP', 'Economia']
  },
  {
    id: 'month',
    eyebrow: 'Mensal',
    title: 'Este mês no Blood Moon',
    description: 'Uma futura retrospectiva reunirá os acontecimentos que merecem permanecer.',
    topics: ['Recordes', 'Server firsts', 'Histórias da comunidade']
  }
]
