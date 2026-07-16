export type WebSourceFileRow = {
  name: string
  bytes?: number
  files?: number
  dirs?: number
}

export type WebSourceSummary = {
  generatedAt: string
  cms: {
    name: string
    package: string | null
    version: string | null
    php: string | null
  }
  totals: {
    files: number
    dirs: number
    bytes: number
  }
  sections: Record<string, number>
  migration: {
    groups: number
    highPriority: number
    items: number
    readyToMap: number
    needsReview: number
    future: number
  }
  warning: string
}

export type WebSourceMigrationItem = {
  label: string
  source: string
  target: string
  status: 'cataloged' | 'ready-to-map' | 'needs-review' | 'future'
}

export type WebSourceMigrationGroup = {
  key: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  sourceAreas: string[]
  targetModules: string[]
  items: WebSourceMigrationItem[]
}

export type WebSourceReusePlanItem = {
  area: string
  source: string
  use: string
}

export type WebSourceNormalizedEntity = {
  name: string
  source: string
  target: string
  priority: 'high' | 'medium' | 'low'
  status: 'cataloged' | 'ready-to-map' | 'needs-review' | 'future'
}

export type WebSourceNormalizedDomain = {
  key: string
  title: string
  description: string
  entities: WebSourceNormalizedEntity[]
}

export type WebSourceNormalizedCatalog = {
  generatedAt: string
  domains: WebSourceNormalizedDomain[]
}

const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) {
    return ''
  }

  try {
    const saved = localStorage.getItem(authStorageKey)
    return saved ? JSON.parse(saved)?.accessToken || '' : ''
  } catch {
    return ''
  }
}

export const useWebSourceApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const fetchWebSource = <T>(path: string) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      headers: readAccessToken()
        ? { Authorization: `Bearer ${readAccessToken()}` }
        : {}
    })

  return {
    summary: () => fetchWebSource<WebSourceSummary>('/source-web/current/summary'),
    controllers: () => fetchWebSource<WebSourceFileRow[]>('/source-web/current/controllers'),
    models: () => fetchWebSource<WebSourceFileRow[]>('/source-web/current/models'),
    plugins: () => fetchWebSource<WebSourceFileRow[]>('/source-web/current/plugins'),
    serverData: () => fetchWebSource<WebSourceFileRow[]>('/source-web/current/server-data'),
    itemImageGroups: () => fetchWebSource<WebSourceFileRow[]>('/source-web/current/item-image-groups'),
    reusePlan: () => fetchWebSource<WebSourceReusePlanItem[]>('/source-web/current/reuse-plan'),
    migrationBoard: () => fetchWebSource<WebSourceMigrationGroup[]>('/source-web/current/migration-board'),
    normalizedDomains: () => fetchWebSource<WebSourceNormalizedCatalog>('/source-web/current/normalized-domains')
  }
}
