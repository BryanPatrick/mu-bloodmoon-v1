export type ChronicleCategory =
  'Mundo' | 'Guilds' | 'PvP' | 'Bosses' | 'Economia' | 'Comunidade' | 'Curiosidades' | 'Temporadas'

export type ChronicleSource = 'CMS' | 'DEMO'

export type ChronicleStory = {
  id: string
  slug: string
  title: string
  summary: string
  category: ChronicleCategory
  image: string | null
  publishedAt: string
  source: ChronicleSource
  isDemo: boolean
  kind: 'NEWS' | 'EVENT'
}

export type ChroniclePeriod = {
  id: 'yesterday' | 'week' | 'month'
  eyebrow: string
  title: string
  description: string
  topics: string[]
}
