const supportAuthStorageKey = 'blood-moon-auth'
const supportHeaders = () => {
  if (!import.meta.client) return {}
  try { const session = JSON.parse(localStorage.getItem(supportAuthStorageKey) || '{}'); return session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {} } catch { return {} }
}

export type SupportTicket = { id: string; subject: string; category: string; message: string; response?: string | null; status: string; createdAt: string; updatedAt: string; account?: { username: string; name: string; email: string } }
export type ModerationRecord = { id: string; accountId: string; type: string; reason: string; expiresAt?: string | null; createdAt: string; account?: { username: string; name: string; role: string }; actor?: { username: string } }

export const useSupportApi = () => {
  const config = useRuntimeConfig(); const base = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const get = <T>(path: string, query: Record<string, unknown> = {}) => $fetch<T>(`${base.value}${path}`, { query, headers: supportHeaders() })
  const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown) => $fetch<T>(`${base.value}${path}`, { method, body, headers: supportHeaders() })
  return {
    ownTickets: () => get<SupportTicket[]>('/account/tickets'), createTicket: (body: Record<string, unknown>) => send<SupportTicket>('POST', '/account/tickets', body),
    adminTickets: (status = '') => get<SupportTicket[]>('/admin/tickets', { status: status || undefined }), updateTicket: (id: string, body: Record<string, unknown>) => send<SupportTicket>('PATCH', `/admin/tickets/${id}`, body),
    moderation: (accountId = '') => get<ModerationRecord[]>('/admin/moderation', { accountId: accountId || undefined }), moderate: (body: Record<string, unknown>) => send<ModerationRecord>('POST', '/admin/moderation', body)
  }
}
