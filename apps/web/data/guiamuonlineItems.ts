import equipmentIndex from './muEquipmentIndex.generated.json'

export type GuideEquipmentStat = {
  itemLevel: number | null
  defense: number | null
  durability: number | null
  damageMin: number | null
  damageMax: number | null
  requiredStrength: number | null
  requiredAgility: number | null
  excellentDefense: number | null
  excellentRequiredStrength: number | null
  excellentRequiredAgility: number | null
}

export type GuideEquipmentImage = {
  publicPath: string | null
  sourceUrl: string | null
  localPath: string | null
  size?: number | null
  sha1?: string | null
}

export type GuideEquipmentPart = {
  name: string
  slug: string
  image: GuideEquipmentImage
  imageError: string | null
  levelStats: GuideEquipmentStat[]
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
  image: GuideEquipmentImage
  sourceUrl: string | null
  imageError: string | null
  detailError?: string | null
  levelStats: GuideEquipmentStat[]
  parts?: GuideEquipmentPart[]
  detailParts?: GuideEquipmentPart[]
}

type GuideEquipmentModule = { default: GuideEquipmentItem[] }

const armorCategories = new Set(['Armor', 'Pants', 'Helm', 'Boots', 'Gloves'])
const detailLoaders = import.meta.glob<GuideEquipmentModule>('./mu-equipment-details/*.json')
const categoryCache = new Map<string, Promise<GuideEquipmentItem[]>>()

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const guiamuonlineArmorItems = (equipmentIndex as GuideEquipmentItem[]).filter((item) =>
  armorCategories.has(item.category)
)

const loadGuideCategory = async (categorySlug: string) => {
  if (!categoryCache.has(categorySlug)) {
    const loader = detailLoaders[`./mu-equipment-details/${categorySlug}.json`]
    const items = loader
      ? loader().then((module) => module.default as GuideEquipmentItem[])
      : Promise.resolve([])

    categoryCache.set(categorySlug, items)
  }

  return categoryCache.get(categorySlug) || Promise.resolve([])
}

export const findGuideItem = async (category: string, name: string) => {
  const summary = guiamuonlineArmorItems.find((item) =>
    normalizeLabel(item.category) === normalizeLabel(category) &&
    normalizeLabel(item.name) === normalizeLabel(name)
  )

  if (!summary) {
    return null
  }

  const items = await loadGuideCategory(summary.categorySlug)

  return items.find((item) => item.key === summary.key) || null
}

export const loadGuideSetItems = async (name: string) => {
  const categories = ['Helm', 'Armor', 'Pants', 'Gloves', 'Boots']
  const items = await Promise.all(categories.map((category) => findGuideItem(category, name)))

  return items.filter(Boolean) as GuideEquipmentItem[]
}
