import armorItems from './guiamuonlineArmorItems.generated.json'

export type GuideEquipmentStat = {
  itemLevel: number | null
  defense: number | null
  requiredStrength: number | null
  requiredAgility: number | null
  excellentDefense: number | null
  excellentRequiredStrength: number | null
  excellentRequiredAgility: number | null
}

export type GuideEquipmentItem = {
  key: string
  name: string
  title: string
  category: string
  categorySlug: string
  slug: string
  usableBy: string[]
  listStats: Record<string, string>
  image: {
    publicPath: string | null
    sourceUrl: string | null
    localPath: string | null
  }
  sourceUrl: string | null
  levelStats: GuideEquipmentStat[]
}

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const guiamuonlineArmorItems = armorItems as GuideEquipmentItem[]

const guideItemIndex = new Map(
  guiamuonlineArmorItems.map((item) => [
    `${normalizeLabel(item.category)}:${normalizeLabel(item.name)}`,
    item
  ])
)

export const findGuideItem = (category: string, name: string) =>
  guideItemIndex.get(`${normalizeLabel(category)}:${normalizeLabel(name)}`) || null
