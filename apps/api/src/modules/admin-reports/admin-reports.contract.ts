export const adminReportCategories = [
  'team',
  'roadmap',
  'store',
  'marketplace',
  'community',
  'audit',
  'errors',
  'security'
] as const

export type AdminReportCategory = typeof adminReportCategories[number]

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

export type AdminReportExportQuery = AdminReportQuery & {
  format?: 'csv' | 'xlsx' | 'pdf'
}

export type ReportMetric = {
  key: string
  label: string
  value: number | string
  sensitive?: boolean
}

export type ReportGroup = {
  key: string
  label: string
  rows: Array<Record<string, unknown>>
}

export type AdminReportResult = {
  category: AdminReportCategory
  title: string
  generatedAt: string
  period: { from: string; to: string }
  financialVisible: boolean
  summary: ReportMetric[]
  groups: ReportGroup[]
  notes?: string[]
}
