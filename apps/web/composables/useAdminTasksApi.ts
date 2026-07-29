type TaskQuery = Record<string, string | number | boolean | undefined>

export type AdminTaskPage = {
  data: Record<string, any>[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const useAdminTasksApi = () => {
  const config = useRuntimeConfig()
  const { accessToken } = useAuth()
  const request = <T>(path: string, options: Record<string, any> = {}) =>
    $fetch<T>(`${config.public.apiBase}${path}`, {
      ...options,
      headers: {
        ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
        ...(options.headers || {})
      }
    })
  const query = (value: TaskQuery = {}) => ({
    query: Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined && item !== '')
    )
  })

  return {
    list: (value: TaskQuery = {}) => request<AdminTaskPage>('/admin/tasks', query(value)),
    details: (id: string) => request<Record<string, any>>(`/admin/tasks/${id}`),
    create: (body: unknown) => request('/admin/tasks', { method: 'POST', body }),
    update: (id: string, body: unknown) => request(`/admin/tasks/${id}`, { method: 'PATCH', body }),
    action: (id: string, body: unknown) => request(`/admin/tasks/${id}/actions`, { method: 'POST', body }),
    addComment: (id: string, body: unknown) => request(`/admin/tasks/${id}/comments`, { method: 'POST', body }),
    editComment: (id: string, body: unknown) => request(`/admin/tasks/comments/${id}`, { method: 'PATCH', body }),
    addEvidence: (id: string, body: unknown) => request(`/admin/tasks/${id}/evidence`, { method: 'POST', body }),
    addLink: (id: string, body: unknown) => request(`/admin/tasks/${id}/links`, { method: 'POST', body }),
    removeLink: (id: string, linkId: string) => request(`/admin/tasks/${id}/links/${linkId}/remove`, { method: 'POST' }),
    personalDashboard: () => request<Record<string, any>>('/admin/tasks/dashboard/me'),
    managementDashboard: () => request<Record<string, any>>('/admin/tasks/dashboard/management'),
    reports: () => request<Record<string, any>>('/admin/tasks/reports'),
    administrators: () => request<Record<string, any>[]>('/admin/tasks/administrators')
  }
}
