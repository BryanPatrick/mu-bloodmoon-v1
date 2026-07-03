import type { ManagedCharacter } from '~/data/management'

type CharactersResponse = {
  data: ManagedCharacter[]
  total: number
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

const statusToApi = (status: string) => {
  if (status === 'Online') return 'ONLINE'
  if (status === 'Offline') return 'OFFLINE'
  if (status === 'Bloqueado') return 'BLOCKED'
  return undefined
}

export const useCharactersApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))

  const headers = () => readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {}

  return {
    list: (query: { search?: string, className?: string, status?: string } = {}) =>
      $fetch<CharactersResponse>(`${apiBase.value}/characters`, {
        query: {
          search: query.search || undefined,
          className: query.className && query.className !== 'Todas' ? query.className : undefined,
          status: query.status && query.status !== 'Todos' ? statusToApi(query.status) : undefined
        },
        headers: headers()
      }),
    action: (id: string, action: 'details' | 'reset-request') =>
      $fetch<{ ok: boolean, message: string, character: ManagedCharacter }>(`${apiBase.value}/characters/${id}/actions`, {
        method: 'POST',
        body: { action },
        headers: headers()
      })
  }
}
