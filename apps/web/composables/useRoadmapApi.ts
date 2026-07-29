export type RoadmapHorizon = 'NOW' | 'NEXT' | 'FUTURE' | 'ANALYSIS' | 'COMPLETED' | 'CANCELLED'
export type RoadmapStatus = 'PROPOSED' | 'ANALYSIS' | 'PLANNED' | 'DESIGN' | 'DEVELOPMENT' | 'TESTING' | 'CLOSED_BETA' | 'PUBLIC_BETA' | 'READY' | 'RELEASED' | 'PAUSED' | 'POSTPONED' | 'CANCELLED'
export type RoadmapWorkflow = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED' | 'REJECTED'

export type RoadmapItem = {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  objective: string | null
  problem: string | null
  playerBenefit: string | null
  scopeIncluded: string[] | null
  scopeExcluded: string[] | null
  category: string
  horizon: RoadmapHorizon
  status: RoadmapStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  progress: number
  estimatedPeriod: string | null
  completedAt: string | null
  image: string | null
  icon: string | null
  tags: string[] | null
  dependencies: string[] | null
  visibility: 'PUBLIC' | 'UNLISTED' | 'ADMIN_ONLY'
  sortOrder: number
  ownerId: string | null
  owner?: { id: string; name: string; username: string } | null
  internalDeadline: string | null
  lastWorkAt: string | null
  workSituation: string
  workflowStatus: RoadmapWorkflow
  internalNotes: string | null
  publicNotes: string | null
  revisionReason: string | null
  version: number
  scheduledPublishAt: string | null
  publishedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  updates?: RoadmapUpdate[]
  tasks?: RoadmapTask[]
  relations?: Array<Record<string, unknown>>
  _count?: { updates: number; tasks: number; relations: number }
}

export type RoadmapUpdate = {
  id: string
  title: string
  content: string
  updateType: string
  oldStatus: RoadmapStatus | null
  newStatus: RoadmapStatus | null
  oldProgress: number | null
  newProgress: number | null
  visibility: string
  createdAt: string
  roadmapTitle?: string
  roadmapSlug?: string
}

export type RoadmapTask = {
  id: string
  title: string
  description: string | null
  status: string
  assigneeId: string | null
  dueAt: string | null
  completedAt: string | null
}

const authStorageKey = 'blood-moon-auth'
const accessToken = () => {
  if (!import.meta.client) return ''
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || '{}')?.accessToken || ''
  } catch {
    return ''
  }
}
const clean = (query: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '' && value !== undefined && value !== null))

export const useRoadmapApi = () => {
  const config = useRuntimeConfig()
  const apiBase = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const request = <T>(path: string, options: Record<string, unknown> = {}) =>
    $fetch<T>(`${apiBase.value}${path}`, {
      ...options,
      headers: {
        ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
        ...(options.headers as Record<string, string> || {})
      }
    })

  return {
    publicOverview: (query: Record<string, unknown> = {}) =>
      request<{ presentation: Record<string, string | null>; categories: string[]; items: RoadmapItem[]; delivered: RoadmapItem[]; history: RoadmapUpdate[] }>('/roadmap', { query: clean(query) }),
    publicDetail: (slug: string) => request<RoadmapItem>(`/roadmap/${encodeURIComponent(slug)}`),
    summary: () => request<Record<string, number | Array<Record<string, unknown>>>>('/admin/roadmap/summary'),
    list: (query: Record<string, unknown> = {}) =>
      request<{ items: RoadmapItem[]; total: number; page: number; pageSize: number; totalPages: number }>('/admin/roadmap', { query: clean(query) }),
    detail: (id: string) => request<RoadmapItem>(`/admin/roadmap/${id}`),
    create: (body: Record<string, unknown>) => request<RoadmapItem>('/admin/roadmap', { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>) => request<RoadmapItem>(`/admin/roadmap/${id}`, { method: 'PATCH', body }),
    duplicate: (id: string) => request<RoadmapItem>(`/admin/roadmap/${id}/duplicate`, { method: 'POST' }),
    transition: (id: string, body: Record<string, unknown>) => request<RoadmapItem>(`/admin/roadmap/${id}/transition`, { method: 'POST', body }),
    reorder: (items: Array<{ id: string; order: number }>) => request('/admin/roadmap/order/apply', { method: 'POST', body: { items } }),
    addUpdate: (id: string, body: Record<string, unknown>) => request(`/admin/roadmap/${id}/updates`, { method: 'POST', body }),
    createTask: (id: string, body: Record<string, unknown>) => request(`/admin/roadmap/${id}/tasks`, { method: 'POST', body }),
    updateTask: (id: string, body: Record<string, unknown>) => request(`/admin/roadmap/tasks/${id}`, { method: 'PATCH', body }),
    addRelation: (id: string, body: Record<string, unknown>) => request(`/admin/roadmap/${id}/relations`, { method: 'POST', body }),
    removeRelation: (id: string) => request(`/admin/roadmap/relations/${id}`, { method: 'DELETE' }),
    history: (id: string) => request<Array<Record<string, unknown>>>(`/admin/roadmap/${id}/history`)
  }
}
