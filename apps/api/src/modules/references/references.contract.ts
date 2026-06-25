export type ReferenceKind =
  | 'character-appearance'
  | 'equipment-original'
  | 'equipment-optimized'
  | 'map'
  | 'monster'
  | 'tooltip'
  | 'source'

export type ReferenceAssetDto = {
  id: string
  title: string
  kind: ReferenceKind
  category: string
  character?: string
  sourceUrl?: string
  storageKey: string
  publicUrl: string
  notes?: string
  createdAt: string
}
