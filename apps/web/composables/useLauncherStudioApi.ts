const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) return ''
  try {
    const saved = localStorage.getItem(authStorageKey)
    if (!saved) return ''
    return JSON.parse(saved)?.accessToken || ''
  } catch {
    return ''
  }
}

export const useLauncherStudioApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const apiOrigin = computed(() => apiBase.value.replace(/\/api$/, ''))

  const fetchAdmin = <T>(path: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      query,
      headers: readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}
    })

  const sendAdmin = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      method,
      body,
      headers: readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}
    })

  const resolveUrl = (url: string | null) => (!url ? null : url.startsWith('http') ? url : `${apiOrigin.value}${url}`)

  return {
    pages: () => fetchAdmin<Array<{ page: string; slotCount: number }>>('/admin/launcher-studio/pages'),
    registry: (page?: string) => fetchAdmin<unknown[]>('/admin/launcher-studio/registry', page ? { page } : {}),
    draft: (page?: string) => fetchAdmin<unknown[]>('/admin/launcher-studio/draft', page ? { page } : {}),
    updateSlot: (slotId: string, payload: { value: unknown; tokens?: Record<string, string> }) =>
      sendAdmin('PATCH', `/admin/launcher-studio/slots/${encodeURIComponent(slotId)}`, payload),
    publish: (note?: string) => sendAdmin('POST', '/admin/launcher-studio/publish', { note }),
    rollback: (version: number, note?: string) => sendAdmin('POST', '/admin/launcher-studio/rollback', { version, note }),
    publishHistory: () => fetchAdmin<Array<{ id: string; version: number; kind: string; note: string | null; publishedAt: string }>>('/admin/launcher-studio/publish-history'),
    assets: (query: Record<string, unknown> = {}) => fetchAdmin<{ items: Array<Record<string, unknown>>; total: number }>('/admin/launcher-studio/assets', query),
    uploadAsset: async (payload: { name: string; category: string; dataUrl: string }) => {
      const asset = await sendAdmin<{ id: string; publicUrl: string | null }>('POST', '/admin/launcher-studio/assets/upload', payload)
      return { ...asset, publicUrl: resolveUrl(asset.publicUrl) }
    },
    archiveAsset: (id: string) => sendAdmin('DELETE', `/admin/launcher-studio/assets/${id}`),
    terms: () => fetchAdmin<Array<Record<string, unknown>>>('/admin/launcher-studio/terms'),
    createTerms: (payload: { title: string; content: string; effectiveAt?: string }) =>
      sendAdmin('POST', '/admin/launcher-studio/terms', payload),
    previewFixtures: (state: string) => fetchAdmin<Record<string, unknown>>('/admin/launcher-studio/preview/fixtures', { state }),
    resolveUrl
  }
}
