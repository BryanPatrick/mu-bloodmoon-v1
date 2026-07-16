export type WebSourceFileRow = {
  name: string
  bytes?: number
  files?: number
  dirs?: number
}

export type WebSourceDirSummary = {
  path: string
  files: number
  dirs: number
  bytes: number
}

export type WebSourceReusePlanItem = {
  area: string
  source: string
  use: string
}

export type WebSourceCatalog = {
  generatedAt: string
  sourcePublicHtml: string
  warning: string
  cms: {
    name: string
    package: string | null
    version: string | null
    php: string | null
  }
  totals: {
    files: number
    dirs: number
    bytes: number
  }
  dirSummary: WebSourceDirSummary[]
  controllers: WebSourceFileRow[]
  models: WebSourceFileRow[]
  plugins: WebSourceFileRow[]
  serverData: WebSourceFileRow[]
  itemImageGroups: WebSourceFileRow[]
  configFiles: WebSourceFileRow[]
  reusePlan: WebSourceReusePlanItem[]
}

export type WebSourceMigrationGroup = {
  key: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  sourceAreas: string[]
  targetModules: string[]
  items: WebSourceMigrationItem[]
}

export type WebSourceMigrationItem = {
  label: string
  source: string
  target: string
  status: 'cataloged' | 'ready-to-map' | 'needs-review' | 'future'
}

export type WebSourceNormalizedEntity = {
  name: string
  source: string
  target: string
  priority: 'high' | 'medium' | 'low'
  status: 'cataloged' | 'ready-to-map' | 'needs-review' | 'future'
}

export type WebSourceNormalizedDomain = {
  key: string
  title: string
  description: string
  entities: WebSourceNormalizedEntity[]
}

export type WebSourceNormalizedCatalog = {
  generatedAt: string
  domains: WebSourceNormalizedDomain[]
}
