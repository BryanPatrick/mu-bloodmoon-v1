const betaRewardsAuthStorageKey = 'blood-moon-auth'
const betaRewardsHeaders = (): Record<string, string> => {
  if (!import.meta.client) return {}
  try { const session = JSON.parse(localStorage.getItem(betaRewardsAuthStorageKey) || '{}'); return session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {} } catch { return {} }
}

export type ParticipationRecord = {
  id: string; betaCycleId: string; normalizedEmailHash: string; accountId?: string | null
  sourceType: string; sourceId?: string | null; justification: string; status: string
  recordedAt: string; convertedEntitlementId?: string | null; convertedAt?: string | null
  recordedBy?: { username: string }
}
export type GenerationPreview = { rewardType: string; rewardAmount: number; total: number; wouldCreate: number; alreadyConverted: number; skipped: number; rows: Array<{ participationRecordId: string; disposition: string; betaCycleId: string | null; sourceType: string | null }> }
export type GenerationResult = { requested: number; created: number; alreadyConverted: number; skipped: number; rows: Array<{ participationRecordId: string; entitlementId: string }> }

export const participationSourceTypes = ['OPEN_BETA_PARTICIPATION', 'BUG_HUNTER_CONTRIBUTION', 'EVENT_PARTICIPATION', 'MANUAL_STAFF_GRANT', 'IMPORTED_REVIEWED_LIST'] as const

export const useBetaRewardsApi = () => {
  const config = useRuntimeConfig(); const base = computed(() => String(config.public.apiBase || 'http://localhost:3333/api').replace(/\/$/, ''))
  const get = <T>(path: string, query: Record<string, unknown> = {}) => $fetch<T>(`${base.value}${path}`, { query, headers: betaRewardsHeaders() })
  const send = <T>(method: 'POST' | 'PATCH', path: string, body: unknown) => $fetch<T>(`${base.value}${path}`, { method, body: body as Record<string, any> | BodyInit | null | undefined, headers: betaRewardsHeaders() })
  return {
    listParticipation: (filters: Record<string, unknown> = {}) => get<ParticipationRecord[]>('/admin/beta-rewards/participation', filters),
    recordParticipation: (body: Record<string, unknown>) => send<ParticipationRecord>('POST', '/admin/beta-rewards/participation', body),
    rejectParticipation: (id: string, reason: string) => send<ParticipationRecord>('PATCH', `/admin/beta-rewards/participation/${id}/reject`, { reason }),
    previewGeneration: (body: Record<string, unknown>) => send<GenerationPreview>('POST', '/admin/beta-rewards/generate/preview', body),
    commitGeneration: (body: Record<string, unknown>) => send<GenerationResult>('POST', '/admin/beta-rewards/generate/commit', body)
  }
}
