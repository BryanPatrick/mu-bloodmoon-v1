export type WikiPagination = {
  page?: number
  pageSize?: number
}

export type WikiEntryQuery = WikiPagination & {
  kind?: string
  scope?: string
  season?: number
  search?: string
}

export type WikiEquipmentQuery = WikiPagination & {
  group?: string
  quality?: string
  season?: number
  search?: string
  character?: string
  className?: string
  category?: string
}

export type WikiEquipmentSetQuery = WikiPagination & {
  quality?: string
  season?: number
  search?: string
  character?: string
  className?: string
  category?: string
}

const cleanQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const useWikiApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const fetchWiki = <T>(path: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      query: cleanQuery(query)
    })

  return {
    summary: () => fetchWiki('/wiki/summary'),
    entries: (query: WikiEntryQuery = {}) => fetchWiki('/wiki/entries', query),
    characters: () => fetchWiki('/wiki/characters'),
    equipment: (query: WikiEquipmentQuery = {}) => fetchWiki('/wiki/equipment', query),
    equipmentSets: (query: WikiEquipmentSetQuery = {}) => fetchWiki('/wiki/equipment/sets', query),
    equipmentMissingReferences: (query: WikiEquipmentSetQuery = {}) => fetchWiki('/wiki/equipment/missing-references', query),
    equipmentDetail: (key: string) => fetchWiki(`/wiki/equipment/${encodeURIComponent(key)}`)
  }
}
