export type AdminContentPagination = {
  page?: number
  pageSize?: number
  search?: string
}

export type AdminContentEntryQuery = AdminContentPagination & {
  kind?: string
  scope?: string
  status?: string
}

export type AdminContentAssetQuery = AdminContentPagination & {
  kind?: string
  status?: string
}

export type AdminContentEquipmentQuery = AdminContentPagination & {
  group?: string
  status?: string
  category?: string
}

export type AdminContentSettingQuery = AdminContentPagination & {
  category?: string
  status?: string
}

const cleanAdminQuery = (query: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

const authStorageKey = 'blood-moon-auth'

const readAccessToken = () => {
  if (!import.meta.client) {
    return ''
  }

  try {
    const saved = localStorage.getItem(authStorageKey)
    if (!saved) {
      return ''
    }

    return JSON.parse(saved)?.accessToken || ''
  } catch {
    return ''
  }
}

export const useAdminContentApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const fetchAdmin = <T>(path: string, query: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      query: cleanAdminQuery(query),
      headers: readAccessToken()
        ? { Authorization: `Bearer ${readAccessToken()}` }
        : {}
    })

  const sendAdmin = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      method,
      body,
      headers: readAccessToken()
        ? { Authorization: `Bearer ${readAccessToken()}` }
        : {}
    })

  return {
    summary: () => fetchAdmin('/admin/content/summary'),
    entries: (query: AdminContentEntryQuery = {}) => fetchAdmin('/admin/content/entries', query),
    createEntry: (payload: Record<string, unknown>) => sendAdmin('POST', '/admin/content/entries', payload),
    updateEntry: (id: string, payload: Record<string, unknown>) => sendAdmin('PATCH', `/admin/content/entries/${id}`, payload),
    archiveEntry: (id: string) => sendAdmin('DELETE', `/admin/content/entries/${id}`),
    settings: (query: AdminContentSettingQuery = {}) => fetchAdmin('/admin/content/settings', query),
    createSetting: (payload: Record<string, unknown>) => sendAdmin('POST', '/admin/content/settings', payload),
    updateSetting: (id: string, payload: Record<string, unknown>) => sendAdmin('PATCH', `/admin/content/settings/${id}`, payload),
    archiveSetting: (id: string) => sendAdmin('DELETE', `/admin/content/settings/${id}`),
    assets: (query: AdminContentAssetQuery = {}) => fetchAdmin('/admin/content/assets', query),
    createAsset: (payload: Record<string, unknown>) => sendAdmin('POST', '/admin/content/assets', payload),
    updateAsset: (id: string, payload: Record<string, unknown>) => sendAdmin('PATCH', `/admin/content/assets/${id}`, payload),
    archiveAsset: (id: string) => sendAdmin('DELETE', `/admin/content/assets/${id}`),
    equipment: (query: AdminContentEquipmentQuery = {}) => fetchAdmin('/admin/content/equipment', query),
    equipmentMetadata: () => fetchAdmin('/admin/content/equipment-metadata'),
    equipmentDetail: (id: string) => fetchAdmin(`/admin/content/equipment/record/${id}`),
    createEquipment: (payload: Record<string, unknown>) => sendAdmin('POST', '/admin/content/equipment', payload),
    updateEquipment: (id: string, payload: Record<string, unknown>) => sendAdmin('PATCH', `/admin/content/equipment/${id}`, payload),
    archiveEquipment: (id: string) => sendAdmin('DELETE', `/admin/content/equipment/${id}`),
    equipmentGaps: (query: AdminContentPagination = {}) => fetchAdmin('/admin/content/equipment-gaps', query)
  }
}
