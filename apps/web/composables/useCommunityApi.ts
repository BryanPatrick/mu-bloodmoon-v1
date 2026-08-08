type Query = Record<string, string | number | undefined>
export type CommunityPage<T = Record<string, any>> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useCommunityApi = () => {
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
  // Same endpoint for post attachments, avatar and cover -- the pipeline
  // (real byte validation, re-encode, server-generated filename) doesn't
  // care what the caller intends to do with the resulting media id/url.
  const uploadMedia = (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ id: string, kind: 'IMAGE' | 'GIF', url: string, mimeType: string, width: number, height: number }>('/community/media', { method: 'POST', body })
  }

  return {
    feed: (value: Query = {}, authenticated = false) => request<CommunityPage>(authenticated ? '/community/feed/authenticated' : '/community/feed', query(value)),
    publicProfile: (username: string) => request(`/community/profiles/${encodeURIComponent(username)}`),
    followProfile: (username: string) => request(`/community/profiles/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
    unfollowProfile: (username: string) => request(`/community/profiles/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),
    profileRelationship: (username: string) => request<{ ownProfile: boolean; following: boolean; blocked: boolean; blockedBy: boolean }>(`/community/profiles/${encodeURIComponent(username)}/relationship`),
    blockProfile: (username: string) => request(`/community/profiles/${encodeURIComponent(username)}/block`, { method: 'POST' }),
    unblockProfile: (username: string) => request(`/community/profiles/${encodeURIComponent(username)}/block`, { method: 'DELETE' }),
    myProfile: () => request('/community/me'),
    updateProfile: (body: unknown) => request('/community/me', { method: 'PATCH', body }),
    createPost: (body: unknown) => request('/community/posts', { method: 'POST', body }),
    uploadMedia,
    uploadPostMedia: uploadMedia,
    getPost: (id: string, authenticated = false) => request(authenticated ? `/community/posts/${id}/authenticated` : `/community/posts/${id}`),
    updatePost: (id: string, body: unknown) => request(`/community/posts/${id}`, { method: 'PATCH', body }),
    removePost: (id: string) => request(`/community/posts/${id}`, { method: 'DELETE' }),
    comment: (id: string, body: unknown) => request(`/community/posts/${id}/comments`, { method: 'POST', body }),
    updateComment: (id: string, body: unknown) => request(`/community/comments/${id}`, { method: 'PATCH', body }),
    removeComment: (id: string) => request(`/community/comments/${id}`, { method: 'DELETE' }),
    react: (body: unknown) => request('/community/reactions', { method: 'POST', body }),
    toggleSave: (id: string) => request(`/community/posts/${id}/save`, { method: 'POST' }),
    toggleRepost: (id: string) => request(`/community/posts/${id}/repost`, { method: 'POST' }),
    report: (body: unknown) => request('/community/reports', { method: 'POST', body }),
    quests: () => request<any[]>('/community/quests'),
    joinQuest: (id: string) => request(`/community/quests/${id}/join`, { method: 'POST' }),

    adminDashboard: () => request<Record<string, number>>('/admin/community/dashboard'),
    adminPosts: (value: Query = {}) => request<CommunityPage>('/admin/community/posts', query(value)),
    adminPostHistory: (id: string) => request(`/admin/community/posts/${id}/history`),
    adminPostAction: (id: string, body: unknown) => request(`/admin/community/posts/${id}/actions`, { method: 'POST', body }),
    adminComments: (value: Query = {}) => request<CommunityPage>('/admin/community/comments', query(value)),
    adminCommentAction: (id: string, body: unknown) => request(`/admin/community/comments/${id}/actions`, { method: 'POST', body }),
    adminReactions: (value: Query = {}) => request<CommunityPage>('/admin/community/reactions', query(value)),
    adminReactionAction: (id: string, body: unknown) => request(`/admin/community/reactions/${id}/actions`, { method: 'POST', body }),
    adminUsers: (value: Query = {}) => request<CommunityPage>('/admin/community/users', query(value)),
    adminModerateUser: (id: string, body: unknown) => request(`/admin/community/users/${id}/moderation`, { method: 'POST', body }),
    adminRestoreUser: (id: string, reason: string) => request(`/admin/community/users/${id}/restore`, { method: 'POST', body: { reason } }),
    adminReports: (value: Query = {}) => request<CommunityPage>('/admin/community/reports', query(value)),
    adminReportAction: (id: string, body: unknown) => request(`/admin/community/reports/${id}`, { method: 'PATCH', body }),
    adminAchievements: (value: Query = {}) => request<CommunityPage>('/admin/community/achievements', query(value)),
    saveAchievement: (id: string | null, body: unknown) => request(`/admin/community/achievements${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    achievementAction: (id: string, action: string, reason: string) => request(`/admin/community/achievements/${id}/actions/${action}`, { method: 'POST', body: { reason } }),
    grantAchievement: (id: string, body: unknown) => request(`/admin/community/achievements/${id}/grants`, { method: 'POST', body }),
    adminQuests: (value: Query = {}) => request<CommunityPage>('/admin/community/quests', query(value)),
    saveQuest: (id: string | null, body: unknown) => request(`/admin/community/quests${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    questAction: (id: string, action: string, reason: string) => request(`/admin/community/quests/${id}/actions/${action}`, { method: 'POST', body: { reason } }),
    questParticipants: (id: string) => request<any[]>(`/admin/community/quests/${id}/participants`),
    updateQuestProgress: (id: string, accountId: string, body: unknown) => request(`/admin/community/quests/${id}/participants/${accountId}`, { method: 'PATCH', body }),
    validateQuestReward: (id: string, accountId: string, reason: string) => request(`/admin/community/quests/${id}/participants/${accountId}/reward`, { method: 'POST', body: { reason } }),
    adminBadges: (value: Query = {}) => request<CommunityPage>('/admin/community/badges', query(value)),
    saveBadge: (id: string | null, body: unknown) => request(`/admin/community/badges${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    grantBadge: (id: string, body: unknown) => request(`/admin/community/badges/${id}/grants`, { method: 'POST', body }),
    revokeBadge: (id: string, accountId: string, reason: string) => request(`/admin/community/badges/${id}/grants/${accountId}/revoke`, { method: 'POST', body: { reason } }),
    policy: () => request('/admin/community/policy'),
    updatePolicy: (body: unknown) => request('/admin/community/policy', { method: 'PATCH', body }),
    adminTasks: (value: Query = {}) => request<CommunityPage>('/admin/community/tasks', query(value)),
    saveTask: (id: string | null, body: unknown) => request(`/admin/community/tasks${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body }),
    analytics: () => request<Record<string, any>>('/admin/community/analytics')
  }
}
