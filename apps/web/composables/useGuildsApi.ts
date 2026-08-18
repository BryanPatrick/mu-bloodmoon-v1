type Query = Record<string, string | number | undefined>
export type GuildPage<T = Record<string, any>> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useGuildsApi = () => {
  const config = useRuntimeConfig()
  const { accessToken } = useAuth()
  const request = <T>(path: string, options: Record<string, any> = {}) => $fetch<T>(`${config.public.apiBase}${path}`, {
    ...options,
    headers: {
      ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
      ...(options.headers || {})
    }
  })
  const query = (value: Query = {}) => ({ query: Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) })
  const uploadImage = (slug: string, kind: 'emblem' | 'banner', file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request(`/guilds/${encodeURIComponent(slug)}/${kind}`, { method: 'POST', body })
  }

  return {
    directory: (value: Query = {}) => request<GuildPage>('/guilds', query(value)),
    mine: () => request<any[]>('/guilds/mine'),
    bySlug: (slug: string) => request(`/guilds/${encodeURIComponent(slug)}`),
    updateGuild: (slug: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}`, { method: 'PATCH', body }),
    members: (slug: string, value: Query = {}) => request<GuildPage>(`/guilds/${encodeURIComponent(slug)}/members`, query(value)),
    requests: (slug: string, value: Query = {}) => request<GuildPage>(`/guilds/${encodeURIComponent(slug)}/requests`, query(value)),
    projects: (slug: string, value: Query = {}) => request<GuildPage>(`/guilds/${encodeURIComponent(slug)}/projects`, query(value)),
    treasury: (slug: string) => request<{ balances: any[] }>(`/guilds/${encodeURIComponent(slug)}/treasury`),
    vault: (slug: string) => request<{ items: any[] }>(`/guilds/${encodeURIComponent(slug)}/vault`),
    uploadEmblem: (slug: string, file: File) => uploadImage(slug, 'emblem', file),
    uploadBanner: (slug: string, file: File) => uploadImage(slug, 'banner', file),
    join: (slug: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/join`, { method: 'POST', body }),
    joinRequests: (slug: string) => request<any[]>(`/guilds/${encodeURIComponent(slug)}/join-requests`),
    approveJoinRequest: (slug: string, id: string, body: unknown = {}) => request(`/guilds/${encodeURIComponent(slug)}/join-requests/${id}/approve`, { method: 'POST', body }),
    rejectJoinRequest: (slug: string, id: string, body: unknown = {}) => request(`/guilds/${encodeURIComponent(slug)}/join-requests/${id}/reject`, { method: 'POST', body }),
    inviteCandidates: (slug: string, search: string) => request<any[]>(`/guilds/${encodeURIComponent(slug)}/invite-candidates`, query({ search })),
    inviteToGuild: (slug: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/invites`, { method: 'POST', body }),
    guildInvites: (slug: string) => request<any[]>(`/guilds/${encodeURIComponent(slug)}/invites`),
    myInvites: () => request<any[]>('/guilds/invites/mine'),
    acceptInvite: (slug: string, id: string) => request(`/guilds/${encodeURIComponent(slug)}/invites/${id}/accept`, { method: 'POST' }),
    declineInvite: (slug: string, id: string) => request(`/guilds/${encodeURIComponent(slug)}/invites/${id}/decline`, { method: 'POST' }),
    cancelInvite: (slug: string, id: string) => request(`/guilds/${encodeURIComponent(slug)}/invites/${id}/cancel`, { method: 'POST' }),
    leave: (slug: string) => request(`/guilds/${encodeURIComponent(slug)}/members/me`, { method: 'DELETE' }),
    updateMemberRole: (slug: string, id: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/members/${id}/role`, { method: 'PATCH', body }),
    kickMember: (slug: string, id: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/members/${id}`, { method: 'DELETE', body }),
    createRequest: (slug: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/requests`, { method: 'POST', body }),
    updateRequest: (slug: string, id: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/requests/${id}`, { method: 'PATCH', body }),
    cancelRequest: (slug: string, id: string) => request(`/guilds/${encodeURIComponent(slug)}/requests/${id}`, { method: 'DELETE' }),
    createProject: (slug: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/projects`, { method: 'POST', body }),
    updateProject: (slug: string, id: string, body: unknown) => request(`/guilds/${encodeURIComponent(slug)}/projects/${id}`, { method: 'PATCH', body }),
    cancelProject: (slug: string, id: string) => request(`/guilds/${encodeURIComponent(slug)}/projects/${id}`, { method: 'DELETE' }),

    adminList: (value: Query = {}) => request<GuildPage>('/admin/guilds', query(value)),
    adminDetail: (id: string) => request(`/admin/guilds/${id}`),
    adminCreate: (body: unknown) => request('/admin/guilds', { method: 'POST', body }),
    adminAction: (id: string, body: unknown) => request(`/admin/guilds/${id}/actions`, { method: 'POST', body }),
    adminLevelConfig: () => request<any[]>('/admin/guilds/config/levels'),
    saveLevelConfig: (id: string | null, body: unknown) => request(`/admin/guilds/config/levels${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    adminXpRules: () => request<any[]>('/admin/guilds/config/xp-rules'),
    saveXpRule: (id: string | null, body: unknown) => request(`/admin/guilds/config/xp-rules${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    deleteXpRule: (id: string) => request(`/admin/guilds/config/xp-rules/${id}`, { method: 'DELETE' }),
    adminReports: () => request<Record<string, any>>('/admin/guilds/reports')
  }
}
