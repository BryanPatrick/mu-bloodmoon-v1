export type AdminReportCategory =
  | 'team'
  | 'roadmap'
  | 'store'
  | 'marketplace'
  | 'community'
  | 'audit'
  | 'errors'
  | 'security'

export type AdminReportQuery = {
  category?: AdminReportCategory
  dateFrom?: string
  dateTo?: string
  module?: string
  userId?: string
  status?: string
  priority?: string
  type?: string
  result?: string
}

export type AdminReportResult = {
  category: AdminReportCategory
  title: string
  generatedAt: string
  period: { from: string; to: string }
  financialVisible: boolean
  summary: Array<{ key: string; label: string; value: number | string; sensitive?: boolean }>
  groups: Array<{ key: string; label: string; rows: Array<Record<string, unknown>> }>
  notes?: string[]
}

export type AdminReportOptions = {
  categories: Array<{ key: AdminReportCategory; label: string }>
  administrators: Array<{ id: string; username: string; name: string; role: string }>
  formats: Array<{ key: 'csv' | 'xlsx' | 'pdf'; label: string; available: boolean; note?: string }>
  financialVisible: boolean
}

type ExportPayload = {
  filename: string
  contentType: string
  encoding: 'base64' | 'utf8'
  content: string
  recordCount: number
  checksum: string
}

export const useAdminReportsApi = () => {
  const config = useRuntimeConfig()
  const { accessToken } = useAuth()

  const request = <T>(path: string, options: Record<string, unknown> = {}) =>
    $fetch<T>(`${config.public.apiBase}${path}`, {
      ...options,
      headers: {
        ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
        ...((options.headers as Record<string, string> | undefined) || {})
      }
    })

  const cleanQuery = (value: Record<string, unknown>) => ({
    query: Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined && item !== '')
    )
  })

  return {
    options: () => request<AdminReportOptions>('/admin/reports/options'),
    report: (query: AdminReportQuery) =>
      request<AdminReportResult>('/admin/reports', cleanQuery(query)),
    exportReport: (query: AdminReportQuery & { format: 'csv' | 'xlsx' | 'pdf' }) =>
      request<ExportPayload>('/admin/reports/export', cleanQuery(query))
  }
}
