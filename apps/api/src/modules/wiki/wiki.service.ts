import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { PaginatedResult, WikiEntryQuery, WikiEquipmentQuery, WikiEquipmentSetQuery } from './wiki.types'

const defaultPageSize = 48
const maxPageSize = 120

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function pagination(query: { page?: string; pageSize?: string }) {
  const page = toPositiveInt(query.page, 1)
  const pageSize = Math.min(toPositiveInt(query.pageSize, defaultPageSize), maxPageSize)
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize
  }
}

function jsonContainsText(value: string) {
  return {
    path: ['$'],
    string_contains: value
  }
}

function normalizedNameFilters(value: string | undefined) {
  if (!value?.trim()) return []

  const normalized = value.trim()
  return normalized === 'Fairy Elf' ? [normalized, 'Elf'] : [normalized]
}

function jsonObject(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function qualityKey(quality: string) {
  const map: Record<string, string> = {
    NORMAL: 'normal',
    EXCELLENT: 'excellent',
    ANCIENT: 'ancient',
    SOCKET: 'socket',
    MASTERY_ANCIENT: 'masteryAncient',
    LUCKY: 'lucky'
  }

  return map[quality] || quality.toLowerCase()
}

function qualityLabel(quality: string) {
  const map: Record<string, string> = {
    NORMAL: 'Normal',
    EXCELLENT: 'Excellent',
    ANCIENT: 'Ancient',
    SOCKET: 'Socket',
    MASTERY_ANCIENT: 'Mastery Ancient',
    LUCKY: 'Lucky'
  }

  return map[quality] || quality
}

function seasonWhere(season: number | undefined): Prisma.EquipmentRecordWhereInput {
  const scopedSeason = Number.isFinite(season) ? Math.min(season as number, 6) : 6

  return {
    minSeason: { lte: 6 },
    seasons: {
      some: {
        season: scopedSeason,
        visibility: 'SEASON_6' as const
      }
    }
  }
}

function classWhere(query: WikiEquipmentQuery): Prisma.EquipmentRecordWhereInput {
  const characterFilters = normalizedNameFilters(query.character)
  const classFilters = normalizedNameFilters(query.className)
  const relationFilters: Prisma.EquipmentClassLinkWhereInput[] = []

  if (characterFilters.length) {
    relationFilters.push({
      role: { in: ['BASE', 'TARGET', 'PLAYABLE'] },
      character: { name: { in: characterFilters } }
    })
  }

  if (classFilters.length) {
    relationFilters.push({
      role: 'TARGET',
      class: { name: { in: classFilters } }
    })
  }

  if (!relationFilters.length) return {}

  return {
    AND: relationFilters.map((filter) => ({ classLinks: { some: filter } }))
  }
}

const characterReleaseOrder = [
  'Dark Knight',
  'Dark Wizard',
  'Fairy Elf',
  'Magic Gladiator',
  'Dark Lord',
  'Summoner',
  'Rage Fighter'
]

const characterChibiImages: Record<string, string> = {
  'Dark Knight': '/images/characters/chibi/dark-knight.png',
  'Dark Wizard': '/images/characters/chibi/dark-wizard.png',
  'Fairy Elf': '/images/characters/chibi/fairy-elf.png',
  'Magic Gladiator': '/images/characters/chibi/magic-gladiator.png',
  'Dark Lord': '/images/characters/chibi/dark-lord.png',
  Summoner: '/images/characters/chibi/summoner.png',
  'Rage Fighter': '/images/characters/chibi/rage-fighter.png'
}

function primaryCharacter(record: { remapData: Prisma.JsonValue | null; classLinks?: Array<{ role: string; character: { name: string }; class: { name: string } }> }) {
  const baseLink = record.classLinks
    ?.filter((link) => link.role === 'BASE')
    .sort((left, right) => {
      const leftIndex = characterReleaseOrder.indexOf(left.character.name)
      const rightIndex = characterReleaseOrder.indexOf(right.character.name)
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
    })[0]
  if (baseLink) return baseLink.character.name

  const data = jsonObject(record.remapData)
  const baseClasses = stringArray(data.baseClasses)
  const playableClasses = stringArray(data.playableClasses)
  const candidates = baseClasses.length ? baseClasses : playableClasses

  return candidates[0] || 'Sem classe definida'
}

function setTier(name: string, minSeason: number) {
  const knownOrder = [
    'Leather',
    'Bronze',
    'Scale',
    'Brass',
    'Plate',
    'Dragon',
    'Pad',
    'Bone',
    'Sphinx',
    'Legendary',
    'Vine',
    'Silk',
    'Wind',
    'Spirit',
    'Guardian',
    'Atlans',
    'Storm Crow',
    'Adamantine',
    'Dark Steel',
    'Dark Phoenix',
    'Grand Soul',
    'Holy Spirit',
    'Thunder Hawk',
    'Glorious',
    'Black Dragon'
  ]
  const index = knownOrder.findIndex((token) => name.toLowerCase().includes(token.toLowerCase()))

  return index === -1 ? Math.max(1, minSeason) : index + 1
}

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      sources,
      entries,
      assets,
      equipment,
      variants,
      pieces,
      scopes,
      kinds,
      groups,
      qualities,
      characters,
      classes,
      seasonRows
    ] = await Promise.all([
      this.prisma.referenceSource.count(),
      this.prisma.knowledgeEntry.count(),
      this.prisma.referenceAsset.count(),
      this.prisma.equipmentRecord.count(),
      this.prisma.equipmentVariant.count(),
      this.prisma.equipmentPiece.count(),
      this.prisma.knowledgeEntry.groupBy({ by: ['scope'], _count: { _all: true } }),
      this.prisma.knowledgeEntry.groupBy({ by: ['kind'], _count: { _all: true } }),
      this.prisma.equipmentRecord.groupBy({ by: ['group'], _count: { _all: true } }),
      this.prisma.equipmentVariant.groupBy({ by: ['quality'], _count: { _all: true } }),
      this.prisma.gameCharacter.count(),
      this.prisma.gameClass.count(),
      this.prisma.equipmentSeason.groupBy({ by: ['season', 'visibility'], _count: { _all: true } })
    ])

    return {
      totals: {
        sources,
        entries,
        assets,
        equipment,
        variants,
        pieces,
        characters,
        classes
      },
      entriesByScope: scopes.map((item) => ({ scope: item.scope, total: item._count._all })),
      entriesByKind: kinds.map((item) => ({ kind: item.kind, total: item._count._all })),
      equipmentByGroup: groups.map((item) => ({ group: item.group, total: item._count._all })),
      equipmentByQuality: qualities.map((item) => ({ quality: item.quality, total: item._count._all })),
      equipmentBySeason: seasonRows.map((item) => ({ season: item.season, visibility: item.visibility, total: item._count._all }))
    }
  }

  async entries(query: WikiEntryQuery): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, skip } = pagination(query)
    const requestedSeason = query.season ? Number.parseInt(query.season, 10) : 6
    const season = Number.isFinite(requestedSeason) ? Math.min(requestedSeason, 6) : 6
    const where: Prisma.KnowledgeEntryWhereInput = {
      scope: query.scope || 'SEASON_6',
      ...(query.kind ? { kind: query.kind } : {}),
      AND: [
        {
          OR: [
            { seasonMin: null, seasonMax: null },
            { seasonMin: { lte: season }, seasonMax: null },
            { seasonMin: null, seasonMax: { gte: season } },
            { seasonMin: { lte: season }, seasonMax: { gte: season } }
          ]
        },
        ...(query.search
          ? [{
              OR: [
                { title: { contains: query.search } },
                { slug: { contains: query.search } },
                { summary: { contains: query.search } }
              ]
            }]
          : [])
      ],
    }

    const [total, data] = await Promise.all([
      this.prisma.knowledgeEntry.count({ where }),
      this.prisma.knowledgeEntry.findMany({
        where,
        orderBy: [{ kind: 'asc' }, { title: 'asc' }],
        skip,
        take: pageSize,
        include: {
          source: true,
          assets: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' },
            take: 12
          }
        }
      })
    ])

    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async characters() {
    return this.prisma.gameCharacter.findMany({
      where: { minSeason: { lte: 6 } },
      orderBy: [{ sortOrder: 'asc' }, { minSeason: 'asc' }, { name: 'asc' }],
      include: {
        classes: {
          orderBy: [{ tier: 'asc' }, { name: 'asc' }]
        }
      }
    })
  }

  async equipment(query: WikiEquipmentQuery): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, skip } = pagination(query)
    const season = query.season ? Number.parseInt(query.season, 10) : undefined
    const where: Prisma.EquipmentRecordWhereInput = {
      ...(query.group ? { group: query.group } : {}),
      ...(query.category ? { categorySlug: query.category } : {}),
      ...seasonWhere(season),
      ...classWhere(query),
      ...(query.quality ? { variants: { some: { quality: query.quality } } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { title: { contains: query.search } },
              { baseSetName: { contains: query.search } }
            ]
          }
        : {}),
    }
    const orderBy: Prisma.EquipmentRecordOrderByWithRelationInput[] = [
      { minSeason: 'asc' },
      { category: 'asc' },
      { name: 'asc' }
    ]
    const include = {
      variants: { orderBy: { quality: 'asc' as const } },
      pieces: { orderBy: [{ sortOrder: 'asc' as const }, { slot: 'asc' as const }] },
      options: { orderBy: { sortOrder: 'asc' as const } },
      classLinks: {
        include: { class: true, character: true },
        orderBy: [{ role: 'asc' as const }, { class: { tier: 'asc' as const } }]
      },
      seasons: { orderBy: { season: 'asc' as const } }
    }

    const [total, data] = await Promise.all([
      this.prisma.equipmentRecord.count({ where }),
      this.prisma.equipmentRecord.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include
      })
    ])

    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  private async setRows(query: WikiEquipmentSetQuery) {
    const season = query.season ? Number.parseInt(query.season, 10) : undefined
    const where: Prisma.EquipmentRecordWhereInput = {
      group: 'SET',
      ...(query.category ? { categorySlug: query.category } : {}),
      ...seasonWhere(season),
      ...classWhere(query),
      ...(query.quality ? { variants: { some: { quality: query.quality } } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { title: { contains: query.search } },
              { baseSetName: { contains: query.search } }
            ]
          }
        : {})
    }
    const rows = await this.prisma.equipmentRecord.findMany({
      where,
      orderBy: [{ minSeason: 'asc' }, { category: 'asc' }, { name: 'asc' }],
      include: {
        variants: { orderBy: { quality: 'asc' } },
        pieces: { orderBy: [{ sortOrder: 'asc' }, { slot: 'asc' }] },
        options: { orderBy: { sortOrder: 'asc' } },
        classLinks: {
          include: { class: true, character: true },
          orderBy: [{ role: 'asc' }, { class: { tier: 'asc' } }]
        },
        seasons: { orderBy: { season: 'asc' } }
      }
    })

    return rows
  }

  private setDto(record: Awaited<ReturnType<WikiService['setRows']>>[number]) {
    const remapData = jsonObject(record.remapData)
    const rawData = jsonObject(record.rawData)
    const warnings = stringArray(remapData.warnings)
    const baseClassesFromLinks = Array.from(new Set(record.classLinks.filter((link) => link.role === 'BASE').map((link) => link.character.name)))
    const playableClassesFromLinks = Array.from(new Set(record.classLinks.filter((link) => link.role === 'PLAYABLE').map((link) => link.class.name)))
    const targetClassesFromLinks = Array.from(new Set(record.classLinks.filter((link) => link.role === 'TARGET').map((link) => link.class.name)))
    const targetTiersFromLinks = Array.from(new Set(record.classLinks.filter((link) => link.role === 'TARGET').map((link) => link.class.tier)))
    const baseClasses = baseClassesFromLinks.length ? baseClassesFromLinks : stringArray(remapData.baseClasses)
    const playableClasses = playableClassesFromLinks.length ? playableClassesFromLinks : stringArray(remapData.playableClasses)
    const targetClasses = targetClassesFromLinks.length ? targetClassesFromLinks : stringArray(remapData.targetClasses)
    const targetClassTier = targetTiersFromLinks.length ? Math.min(...targetTiersFromLinks) : 1
    const qualities = record.variants.map((variant) => variant.quality)
    const setTypes = qualities.map(qualityLabel)
    const availableQualities = qualities.map(qualityKey)
    const tier = setTier(record.baseSetName || record.name, record.minSeason)
    const pieceNames = record.pieces.map((piece) => piece.name || piece.slot)
    const fullSetImage = typeof remapData.fullSetImage === 'string' ? remapData.fullSetImage : undefined
    const needsSetOptions = qualities.some((quality) => ['ANCIENT', 'LUCKY', 'MASTERY_ANCIENT'].includes(quality))
    const missingReferences = {
      image: !fullSetImage && !record.pieces.some((piece) => piece.imagePath),
      setOptions: needsSetOptions && (warnings.includes('missing-ancient-set-options') || !record.options.length),
      classMap: warnings.includes('missing-character-class-map') || (!baseClasses.length && !playableClasses.length),
      pieceImages: record.pieces.filter((piece) => !piece.imagePath).map((piece) => piece.name || piece.slot)
    }
    const characterChibis = baseClasses
      .filter((name) => characterChibiImages[name])
      .map((name) => ({ name, image: characterChibiImages[name] }))

    return {
      key: record.key,
      name: record.name,
      guideName: record.baseSetName || record.name,
      category: record.category,
      categorySlug: record.categorySlug,
      setTypes,
      availableQualities,
      characterName: primaryCharacter(record),
      evolutions: playableClasses.length ? playableClasses : baseClasses,
      baseClasses,
      characterChibis,
      targetClasses,
      requiredClassTier: targetClassTier,
      targetClassTier,
      minSeason: record.minSeason,
      tier,
      tierLabel: String(tier).padStart(2, '0'),
      fullSetImage,
      status: missingReferences.image ? 'Coletar imagem' : 'Imagem local',
      compatibility: record.minSeason <= 6 ? 'v6-prioridade' : 'high-version-futuro',
      pieces: pieceNames.length ? pieceNames : stringArray((rawData.listStats as Record<string, unknown> | undefined) ? Object.values(rawData.listStats as Record<string, unknown>) : []),
      pieceCards: record.pieces.map((piece) => ({
        key: piece.id,
        label: piece.slot,
        title: piece.name,
        image: piece.imagePath || undefined
      })),
      dbSetOptions: record.options.map((option) => option.label),
      missingReferences,
      searchText: [
        record.name,
        record.title,
        record.baseSetName,
        record.category,
        ...setTypes,
        ...baseClasses,
        ...playableClasses,
        ...targetClasses,
        ...pieceNames,
        ...record.options.map((option) => option.label),
        ...warnings
      ].filter(Boolean).join(' ').toLowerCase()
    }
  }

  async equipmentSets(query: WikiEquipmentSetQuery): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, skip } = pagination(query)
    const rows = await this.setRows(query)
    const data = rows.slice(skip, skip + pageSize).map((record) => this.setDto(record))
    const total = rows.length

    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async missingEquipmentReferences(query: WikiEquipmentSetQuery) {
    const rows = await this.setRows({ ...query, page: undefined, pageSize: undefined })
    const mapped = rows.map((record) => this.setDto(record) as {
      key: string
      name: string
      category: string
      missingReferences: {
        image: boolean
        setOptions: boolean
        classMap: boolean
        pieceImages: string[]
      }
    })
    const missing = mapped.filter((item) =>
      item.missingReferences.image ||
      item.missingReferences.setOptions ||
      item.missingReferences.classMap ||
      item.missingReferences.pieceImages.length
    )

    return {
      total: missing.length,
      totals: {
        image: missing.filter((item) => item.missingReferences.image).length,
        setOptions: missing.filter((item) => item.missingReferences.setOptions).length,
        classMap: missing.filter((item) => item.missingReferences.classMap).length,
        pieceImages: missing.reduce((total, item) => total + item.missingReferences.pieceImages.length, 0)
      },
      data: missing
    }
  }

  async equipmentDetail(key: string) {
    const equipment = await this.prisma.equipmentRecord.findUnique({
      where: { key },
      include: {
        variants: { orderBy: { quality: 'asc' } },
        pieces: { orderBy: [{ sortOrder: 'asc' }, { slot: 'asc' }] },
        options: { orderBy: { sortOrder: 'asc' } },
        classLinks: {
          include: { class: true, character: true },
          orderBy: [{ role: 'asc' }, { class: { tier: 'asc' } }]
        },
        seasons: { orderBy: { season: 'asc' } }
      }
    })

    if (!equipment) {
      throw new NotFoundException(`Equipment not found: ${key}`)
    }

    return equipment
  }
}
