import type { ChronicleCategory, ChronicleStory } from '~/types/chronicles'

type UnknownRecord = Record<string, unknown>

type ContentAsset = {
  asset?: {
    publicPath?: string | null
    kind?: string
  }
}

type ContentEntry = {
  id: string
  slug: string
  title: string
  kind: 'NEWS' | 'EVENT'
  summary?: string | null
  normalizedData?: UnknownRecord | null
  updatedAt: string
  assets?: ContentAsset[]
}

type ContentResponse = { data: ContentEntry[] }

const categories: ChronicleCategory[] = [
  'Mundo',
  'Guilds',
  'PvP',
  'Bosses',
  'Economia',
  'Comunidade',
  'Curiosidades',
  'Temporadas'
]

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const categoryFrom = (entry: ContentEntry): ChronicleCategory => {
  const data = asRecord(entry.normalizedData)
  const requested = String(data.chronicleCategory || data.category || '')
  return (
    categories.find((category) => category.toLowerCase() === requested.toLowerCase()) ||
    (entry.kind === 'EVENT' ? 'Mundo' : 'Comunidade')
  )
}

const imageFrom = (entry: ContentEntry) => {
  const data = asRecord(entry.normalizedData)
  const normalizedImage = typeof data.image === 'string' ? data.image : null
  const assetImage = entry.assets?.find(({ asset }) => asset?.kind === 'IMAGE' && asset.publicPath)
    ?.asset?.publicPath
  const value = normalizedImage || assetImage || null
  return value && (/^https?:\/\//.test(value) || value.startsWith('/')) ? value : null
}

const normalize = (entry: ContentEntry): ChronicleStory => {
  const data = asRecord(entry.normalizedData)
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    summary:
      entry.summary ||
      (typeof data.excerpt === 'string' ? data.excerpt : '') ||
      'Matéria editorial publicada pela equipe Blood Moon.',
    category: categoryFrom(entry),
    image: imageFrom(entry),
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : entry.updatedAt,
    source: 'CMS',
    isDemo: false,
    kind: entry.kind
  }
}

export const useChronicles = () => {
  const contentApi = useContentApi()

  const loadPublishedStories = async () => {
    const requests = await Promise.allSettled([
      contentApi.entries<ContentResponse>({ kind: 'NEWS', pageSize: 36 }),
      contentApi.entries<ContentResponse>({ kind: 'EVENT', pageSize: 24 })
    ])
    const entries = requests.flatMap((result) =>
      result.status === 'fulfilled' ? result.value.data : []
    )
    return entries
      .map(normalize)
      .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
  }

  return { loadPublishedStories }
}
