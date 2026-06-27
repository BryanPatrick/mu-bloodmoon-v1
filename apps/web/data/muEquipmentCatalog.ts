import equipmentIndex from './muEquipmentIndex.generated.json'
import type { GuideEquipmentItem, GuideEquipmentSummary } from './guiamuonlineItems'

type DetailModule = { default: GuideEquipmentItem[] }

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const detailLoaders = import.meta.glob<DetailModule>('./mu-equipment-details/*.json')
const categoryCache = new Map<string, Promise<GuideEquipmentItem[]>>()

export const muEquipmentIndex = equipmentIndex as GuideEquipmentSummary[]

export const muEquipmentCategories = Array.from(
  new Set(muEquipmentIndex.map((item) => item.category))
)

export const getMuEquipmentPage = ({
  page = 1,
  pageSize = 40,
  category = 'Default',
  search = ''
}: {
  page?: number
  pageSize?: number
  category?: string
  search?: string
}) => {
  const normalizedSearch = normalizeLabel(search)
  const filtered = muEquipmentIndex.filter((item) => {
    const matchesCategory = category === 'Default' || item.category === category || item.categorySlug === category
    const matchesSearch = !normalizedSearch || normalizeLabel(`${item.name} ${item.title} ${item.category} ${item.usableBy.join(' ')}`).includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    totalItems: filtered.length,
    totalPages,
    page: currentPage,
    pageSize
  }
}

export const loadMuEquipmentCategory = async (categorySlug: string) => {
  if (!categoryCache.has(categorySlug)) {
    const loader = detailLoaders[`./mu-equipment-details/${categorySlug}.json`]

    if (!loader) {
      categoryCache.set(categorySlug, Promise.resolve([]))
    } else {
      categoryCache.set(categorySlug, loader().then((module) => module.default as GuideEquipmentItem[]))
    }
  }

  return categoryCache.get(categorySlug) || Promise.resolve([])
}

export const findMuEquipmentItem = async (category: string, name: string) => {
  const summary = muEquipmentIndex.find((item) =>
    normalizeLabel(item.category) === normalizeLabel(category) &&
    normalizeLabel(item.name) === normalizeLabel(name)
  )

  if (!summary) {
    return null
  }

  const categoryItems = await loadMuEquipmentCategory(summary.categorySlug)

  return categoryItems.find((item) => item.key === summary.key) || null
}
