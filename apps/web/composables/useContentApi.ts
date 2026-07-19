export type PublicContentQuery = {
  kind?: string
  page?: number
  pageSize?: number
  search?: string
}

export const useContentApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  return {
    entries: <T>(query: PublicContentQuery = {}) => $fetch<T>(`${apiBase.value}/content/entries`, { query }),
    entry: <T>(slug: string) => $fetch<T>(`${apiBase.value}/content/entries/${encodeURIComponent(slug)}`),
    settings: <T>() => $fetch<T>(`${apiBase.value}/content/settings`)
  }
}
