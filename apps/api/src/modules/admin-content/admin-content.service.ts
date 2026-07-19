import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { EditorialStatus, EquipmentClassLinkRole, EquipmentGroup, EquipmentQuality, KnowledgeEntryKind, KnowledgeScope, Prisma, ReferenceAssetKind } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type {
  AdminAssetQuery,
  AdminContentQuery,
  AdminEquipmentQuery,
  AdminSettingQuery,
  AdminCreateKnowledgeEntryPayload,
  AdminCreateEquipmentPayload,
  AdminCreateReferenceAssetPayload,
  AdminCreateSiteSettingPayload,
  AdminUpdateEquipmentPayload,
  AdminUpdateKnowledgeEntryPayload,
  AdminUpdateReferenceAssetPayload,
  AdminUpdateSiteSettingPayload
} from './admin-content.types'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'

const defaultPageSize = 30
const maxPageSize = 100

const allowedKinds: KnowledgeEntryKind[] = [
  'NEWS',
  'PAGE',
  'BANNER',
  'DOWNLOAD',
  'NAVIGATION',
  'CHARACTER',
  'EQUIPMENT',
  'ITEM',
  'MAP',
  'MONSTER',
  'DROP',
  'SKILL',
  'EVENT',
  'QUEST',
  'NPC',
  'GUIDE',
  'LORE',
  'SYSTEM',
  'UNKNOWN'
]

const allowedScopes: KnowledgeScope[] = ['SEASON_6', 'FUTURE_SEASON', 'ALL_SEASONS', 'OFF_TOPIC', 'NEEDS_REVIEW']
const allowedStatuses: EditorialStatus[] = ['RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED']
const allowedAssetKinds: ReferenceAssetKind[] = ['IMAGE', 'HTML', 'TEXT', 'JSON', 'OTHER']
const allowedEquipmentGroups: EquipmentGroup[] = ['SET', 'SET_PIECE', 'WEAPON', 'SHIELD', 'WING', 'ACCESSORY', 'PET', 'JEWEL', 'CONSUMABLE', 'MISC']
const allowedEquipmentQualities: EquipmentQuality[] = ['NORMAL', 'EXCELLENT', 'ANCIENT', 'SOCKET', 'MASTERY_ANCIENT', 'LUCKY']
const allowedClassLinkRoles: EquipmentClassLinkRole[] = ['BASE', 'PLAYABLE', 'TARGET']

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

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function enumOrFallback<T extends string>(value: T | undefined, allowed: readonly T[], fallback: T) {
  return value && allowed.includes(value) ? value : fallback
}

function jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  return value === null ? undefined : value as Prisma.InputJsonValue
}

function auditActor(user?: AuthenticatedUser) {
  return {
    actorId: user?.id,
    actorUsername: user?.username
  }
}

const equipmentRelations = {
  variants: { orderBy: { quality: 'asc' as const } },
  pieces: { orderBy: [{ sortOrder: 'asc' as const }, { slot: 'asc' as const }] },
  options: { orderBy: { sortOrder: 'asc' as const } },
  classLinks: {
    include: { class: true, character: true },
    orderBy: [{ role: 'asc' as const }, { class: { tier: 'asc' as const } }]
  },
  seasons: { orderBy: { season: 'asc' as const } }
}

@Injectable()
export class AdminContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async summary() {
    const [
      entries,
      assets,
      equipment,
      pendingEntries,
      missingImages,
      missingSetOptions,
      scopes,
      kinds,
      statuses,
      settings
    ] = await Promise.all([
      this.prisma.knowledgeEntry.count(),
      this.prisma.referenceAsset.count(),
      this.prisma.equipmentRecord.count(),
      this.prisma.knowledgeEntry.count({ where: { status: { in: ['RAW', 'NORMALIZED', 'REMASTER_PENDING'] } } }),
      this.prisma.equipmentRecord.count({ where: { remapData: { path: '$.warnings', array_contains: 'missing-image' } } }),
      this.prisma.equipmentRecord.count({ where: { remapData: { path: '$.warnings', array_contains: 'missing-ancient-set-options' } } }),
      this.prisma.knowledgeEntry.groupBy({ by: ['scope'], _count: { _all: true } }),
      this.prisma.knowledgeEntry.groupBy({ by: ['kind'], _count: { _all: true } }),
      this.prisma.knowledgeEntry.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.siteSetting.count({ where: { status: { not: 'ARCHIVED' } } })
    ])

    return {
      totals: {
        entries,
        assets,
        equipment,
        pendingEntries,
        missingImages,
        missingSetOptions,
        settings
      },
      entriesByScope: scopes.map((item) => ({ scope: item.scope, total: item._count._all })),
      entriesByKind: kinds.map((item) => ({ kind: item.kind, total: item._count._all })),
      entriesByStatus: statuses.map((item) => ({ status: item.status, total: item._count._all }))
    }
  }

  async settings(query: AdminSettingQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.SiteSettingWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? {
        OR: [
          { key: { contains: query.search } },
          { label: { contains: query.search } },
          { description: { contains: query.search } }
        ]
      } : {})
    }
    const [total, data] = await Promise.all([
      this.prisma.siteSetting.count({ where }),
      this.prisma.siteSetting.findMany({ where, orderBy: [{ category: 'asc' }, { key: 'asc' }], skip, take: pageSize })
    ])
    return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  }

  async createSetting(payload: AdminCreateSiteSettingPayload, user?: AuthenticatedUser) {
    if (!payload.key?.trim() || !payload.label?.trim() || payload.value === undefined) {
      throw new BadRequestException('key, label and value are required')
    }
    const setting = await this.prisma.siteSetting.create({
      data: {
        key: slugify(payload.key),
        category: slugify(payload.category || 'general'),
        label: payload.label.trim(),
        description: payload.description?.trim() || null,
        value: payload.value as Prisma.InputJsonValue,
        isPublic: payload.isPublic ?? false,
        status: enumOrFallback(payload.status, allowedStatuses, 'PUBLISHED')
      }
    })
    await this.audit.record({ ...auditActor(user), action: 'admin.setting.created', targetType: 'SiteSetting', targetId: setting.id, metadata: { key: setting.key, category: setting.category, isPublic: setting.isPublic } })
    return setting
  }

  async updateSetting(id: string, payload: AdminUpdateSiteSettingPayload, user?: AuthenticatedUser) {
    const current = await this.prisma.siteSetting.findUnique({ where: { id } })
    if (!current) throw new NotFoundException(`Site setting not found: ${id}`)
    const setting = await this.prisma.siteSetting.update({
      where: { id },
      data: {
        ...(payload.key?.trim() ? { key: slugify(payload.key) } : {}),
        ...(payload.category?.trim() ? { category: slugify(payload.category) } : {}),
        ...(payload.label?.trim() ? { label: payload.label.trim() } : {}),
        ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
        ...(payload.value !== undefined ? { value: payload.value as Prisma.InputJsonValue } : {}),
        ...(payload.isPublic !== undefined ? { isPublic: payload.isPublic } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, current.status) } : {})
      }
    })
    await this.audit.record({ ...auditActor(user), action: 'admin.setting.updated', targetType: 'SiteSetting', targetId: setting.id, metadata: { key: setting.key, category: setting.category, isPublic: setting.isPublic, previousStatus: current.status, status: setting.status } })
    return setting
  }

  async archiveSetting(id: string, user?: AuthenticatedUser) {
    const current = await this.prisma.siteSetting.findUnique({ where: { id } })
    if (!current) throw new NotFoundException(`Site setting not found: ${id}`)
    const setting = await this.prisma.siteSetting.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await this.audit.record({ ...auditActor(user), action: 'admin.setting.archived', targetType: 'SiteSetting', targetId: setting.id, severity: 'warning', metadata: { key: setting.key, previousStatus: current.status } })
    return setting
  }

  async entries(query: AdminContentQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.KnowledgeEntryWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { slug: { contains: query.search } },
              { summary: { contains: query.search } },
              { sourceUrl: { contains: query.search } }
            ]
          }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.knowledgeEntry.count({ where }),
      this.prisma.knowledgeEntry.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
        skip,
        take: pageSize,
        include: {
          source: true,
          assets: {
            include: { asset: true },
            take: 6,
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    ])

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async createEntry(payload: AdminCreateKnowledgeEntryPayload, user?: AuthenticatedUser) {
    if (!payload.title?.trim()) {
      throw new BadRequestException('title is required')
    }

    const slug = payload.slug?.trim() ? slugify(payload.slug) : slugify(payload.title)
    const canonicalKey = payload.canonicalKey?.trim() || `admin:${slug}:${Date.now()}`

    const entry = await this.prisma.knowledgeEntry.create({
      data: {
        canonicalKey,
        slug,
        title: payload.title.trim(),
        kind: enumOrFallback(payload.kind, allowedKinds, 'UNKNOWN'),
        scope: enumOrFallback(payload.scope, allowedScopes, 'NEEDS_REVIEW'),
        status: enumOrFallback(payload.status, allowedStatuses, 'RAW'),
        sourceKey: payload.sourceKey?.trim() || null,
        sourceUrl: payload.sourceUrl?.trim() || null,
        summary: payload.summary?.trim() || null,
        seasonMin: payload.seasonMin ?? null,
        seasonMax: payload.seasonMax ?? null,
        rawData: jsonValue(payload.rawData),
        normalizedData: jsonValue(payload.normalizedData)
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.entry.created',
      targetType: 'KnowledgeEntry',
      targetId: entry.id,
      metadata: { title: entry.title, kind: entry.kind, scope: entry.scope, status: entry.status }
    })

    return entry
  }

  async updateEntry(id: string, payload: AdminUpdateKnowledgeEntryPayload, user?: AuthenticatedUser) {
    const entry = await this.prisma.knowledgeEntry.findUnique({ where: { id } })
    if (!entry) {
      throw new NotFoundException(`Knowledge entry not found: ${id}`)
    }

    const updated = await this.prisma.knowledgeEntry.update({
      where: { id },
      data: {
        ...(payload.canonicalKey?.trim() ? { canonicalKey: payload.canonicalKey.trim() } : {}),
        ...(payload.slug?.trim() ? { slug: slugify(payload.slug) } : {}),
        ...(payload.title?.trim() ? { title: payload.title.trim() } : {}),
        ...(payload.kind ? { kind: enumOrFallback(payload.kind, allowedKinds, entry.kind) } : {}),
        ...(payload.scope ? { scope: enumOrFallback(payload.scope, allowedScopes, entry.scope) } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, entry.status) } : {}),
        ...(payload.sourceKey !== undefined ? { sourceKey: payload.sourceKey?.trim() || null } : {}),
        ...(payload.sourceUrl !== undefined ? { sourceUrl: payload.sourceUrl?.trim() || null } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary?.trim() || null } : {}),
        ...(payload.seasonMin !== undefined ? { seasonMin: payload.seasonMin } : {}),
        ...(payload.seasonMax !== undefined ? { seasonMax: payload.seasonMax } : {}),
        ...(payload.rawData !== undefined ? { rawData: jsonValue(payload.rawData) } : {}),
        ...(payload.normalizedData !== undefined ? { normalizedData: jsonValue(payload.normalizedData) } : {})
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.entry.updated',
      targetType: 'KnowledgeEntry',
      targetId: updated.id,
      metadata: { title: updated.title, kind: updated.kind, scope: updated.scope, status: updated.status }
    })

    return updated
  }

  async archiveEntry(id: string, user?: AuthenticatedUser) {
    const entry = await this.prisma.knowledgeEntry.findUnique({ where: { id } })
    if (!entry) {
      throw new NotFoundException(`Knowledge entry not found: ${id}`)
    }

    const archived = await this.prisma.knowledgeEntry.update({
      where: { id },
      data: {
        status: 'ARCHIVED'
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.entry.archived',
      targetType: 'KnowledgeEntry',
      targetId: archived.id,
      metadata: { title: archived.title, kind: archived.kind }
    })

    return archived
  }

  async assets(query: AdminAssetQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.ReferenceAssetWhereInput = {
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { localPath: { contains: query.search } },
              { publicPath: { contains: query.search } },
              { sourceUrl: { contains: query.search } },
              { mimeType: { contains: query.search } },
              { sha1: { contains: query.search } }
            ]
          }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.referenceAsset.count({ where }),
      this.prisma.referenceAsset.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { localPath: 'asc' }],
        skip,
        take: pageSize,
        include: {
          source: true,
          entries: {
            include: { entry: true },
            take: 4,
            orderBy: { sortOrder: 'asc' }
          }
        }
      })
    ])

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async createAsset(payload: AdminCreateReferenceAssetPayload, user?: AuthenticatedUser) {
    if (!payload.localPath?.trim()) {
      throw new BadRequestException('localPath is required')
    }

    const asset = await this.prisma.referenceAsset.create({
      data: {
        sourceId: payload.sourceId?.trim() || null,
        sourceUrl: payload.sourceUrl?.trim() || null,
        localPath: payload.localPath.trim(),
        publicPath: payload.publicPath?.trim() || null,
        kind: enumOrFallback(payload.kind, allowedAssetKinds, 'IMAGE'),
        mimeType: payload.mimeType?.trim() || null,
        sha1: payload.sha1?.trim() || null,
        bytes: payload.bytes ?? null,
        status: enumOrFallback(payload.status, allowedStatuses, 'RAW'),
        duplicateOfId: payload.duplicateOfId?.trim() || null,
        metadata: jsonValue(payload.metadata)
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.asset.created',
      targetType: 'ReferenceAsset',
      targetId: asset.id,
      metadata: { localPath: asset.localPath, kind: asset.kind, status: asset.status }
    })

    return asset
  }

  async updateAsset(id: string, payload: AdminUpdateReferenceAssetPayload, user?: AuthenticatedUser) {
    const asset = await this.prisma.referenceAsset.findUnique({ where: { id } })
    if (!asset) {
      throw new NotFoundException(`Reference asset not found: ${id}`)
    }

    const updated = await this.prisma.referenceAsset.update({
      where: { id },
      data: {
        ...(payload.sourceId !== undefined ? { sourceId: payload.sourceId?.trim() || null } : {}),
        ...(payload.sourceUrl !== undefined ? { sourceUrl: payload.sourceUrl?.trim() || null } : {}),
        ...(payload.localPath?.trim() ? { localPath: payload.localPath.trim() } : {}),
        ...(payload.publicPath !== undefined ? { publicPath: payload.publicPath?.trim() || null } : {}),
        ...(payload.kind ? { kind: enumOrFallback(payload.kind, allowedAssetKinds, asset.kind) } : {}),
        ...(payload.mimeType !== undefined ? { mimeType: payload.mimeType?.trim() || null } : {}),
        ...(payload.sha1 !== undefined ? { sha1: payload.sha1?.trim() || null } : {}),
        ...(payload.bytes !== undefined ? { bytes: payload.bytes } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, asset.status) } : {}),
        ...(payload.duplicateOfId !== undefined ? { duplicateOfId: payload.duplicateOfId?.trim() || null } : {}),
        ...(payload.metadata !== undefined ? { metadata: jsonValue(payload.metadata) } : {})
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.asset.updated',
      targetType: 'ReferenceAsset',
      targetId: updated.id,
      metadata: { localPath: updated.localPath, kind: updated.kind, status: updated.status }
    })

    return updated
  }

  async archiveAsset(id: string, user?: AuthenticatedUser) {
    const asset = await this.prisma.referenceAsset.findUnique({ where: { id } })
    if (!asset) {
      throw new NotFoundException(`Reference asset not found: ${id}`)
    }

    const archived = await this.prisma.referenceAsset.update({
      where: { id },
      data: {
        status: 'ARCHIVED'
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.asset.archived',
      targetType: 'ReferenceAsset',
      targetId: archived.id,
      metadata: { localPath: archived.localPath, kind: archived.kind }
    })

    return archived
  }

  async equipment(query: AdminEquipmentQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.EquipmentRecordWhereInput = {
      ...(query.group ? { group: query.group } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { categorySlug: slugify(query.category) } : {}),
      ...(query.search
        ? {
            OR: [
              { key: { contains: query.search } },
              { name: { contains: query.search } },
              { title: { contains: query.search } },
              { category: { contains: query.search } },
              { baseSetName: { contains: query.search } },
              { sourceUrl: { contains: query.search } }
            ]
          }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.equipmentRecord.count({ where }),
      this.prisma.equipmentRecord.findMany({
        where,
        orderBy: [{ minSeason: 'asc' }, { group: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        include: equipmentRelations
      })
    ])

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }

  async equipmentMetadata() {
    const characters = await this.prisma.gameCharacter.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { classes: { orderBy: [{ tier: 'asc' }, { name: 'asc' }] } }
    })
    return {
      groups: allowedEquipmentGroups,
      qualities: allowedEquipmentQualities,
      scopes: allowedScopes,
      statuses: allowedStatuses,
      characters
    }
  }

  async equipmentDetail(id: string) {
    const record = await this.prisma.equipmentRecord.findUnique({ where: { id }, include: equipmentRelations })
    if (!record) throw new NotFoundException(`Equipment record not found: ${id}`)
    return record
  }

  async createEquipment(payload: AdminCreateEquipmentPayload, user?: AuthenticatedUser) {
    if (!payload.name?.trim()) {
      throw new BadRequestException('name is required')
    }

    const name = payload.name.trim()
    const category = payload.category?.trim() || 'Custom'
    const key = payload.key?.trim() ? slugify(payload.key) : `custom-${slugify(name)}-${Date.now()}`

    const equipment = await this.prisma.equipmentRecord.create({
      data: {
        key,
        name,
        title: payload.title?.trim() || name,
        category,
        categorySlug: payload.categorySlug?.trim() ? slugify(payload.categorySlug) : slugify(category),
        group: enumOrFallback(payload.group, allowedEquipmentGroups, 'MISC'),
        baseSetName: payload.baseSetName?.trim() || null,
        sourceUrl: payload.sourceUrl?.trim() || null,
        minSeason: payload.minSeason ?? 6,
        status: enumOrFallback(payload.status, allowedStatuses, 'RAW'),
        rawData: jsonValue(payload.rawData),
        remapData: jsonValue(payload.remapData),
        variants: payload.variants?.length ? { create: payload.variants.map((item) => ({ quality: enumOrFallback(item.quality, allowedEquipmentQualities, 'NORMAL'), minSeason: item.minSeason ?? payload.minSeason ?? 6, data: jsonValue(item.data) })) } : undefined,
        pieces: payload.pieces?.length ? { create: payload.pieces.map((item, index) => ({ name: item.name.trim(), slot: item.slot.trim(), imagePath: item.imagePath?.trim() || null, data: jsonValue(item.data), sortOrder: item.sortOrder ?? index })) } : undefined,
        options: payload.options?.length ? { create: payload.options.map((item, index) => ({ scope: item.scope.trim(), label: item.label.trim(), data: jsonValue(item.data), sortOrder: item.sortOrder ?? index })) } : undefined,
        classLinks: payload.classLinks?.length ? { create: payload.classLinks.map((item) => ({ classId: item.classId, characterId: item.characterId, role: enumOrFallback(item.role, allowedClassLinkRoles, 'PLAYABLE'), source: item.source?.trim() || 'admin' })) } : undefined,
        seasons: payload.seasons?.length ? { create: payload.seasons.map((item) => ({ season: item.season, visibility: enumOrFallback(item.visibility, allowedScopes, item.season <= 6 ? 'SEASON_6' : 'FUTURE_SEASON'), source: item.source?.trim() || 'admin' })) } : undefined
      },
      include: equipmentRelations
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.equipment.created',
      targetType: 'EquipmentRecord',
      targetId: equipment.id,
      metadata: { key: equipment.key, name: equipment.name, group: equipment.group, status: equipment.status }
    })

    return equipment
  }

  async updateEquipment(id: string, payload: AdminUpdateEquipmentPayload, user?: AuthenticatedUser) {
    const record = await this.prisma.equipmentRecord.findUnique({ where: { id } })
    if (!record) {
      throw new NotFoundException(`Equipment record not found: ${id}`)
    }

    const updated = await this.prisma.$transaction(async (tx) => tx.equipmentRecord.update({
      where: { id },
      data: {
        ...(payload.key?.trim() ? { key: slugify(payload.key) } : {}),
        ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
        ...(payload.title !== undefined ? { title: payload.title?.trim() || record.title } : {}),
        ...(payload.category !== undefined ? { category: payload.category?.trim() || record.category } : {}),
        ...(payload.categorySlug !== undefined ? { categorySlug: payload.categorySlug?.trim() ? slugify(payload.categorySlug) : record.categorySlug } : {}),
        ...(payload.group ? { group: enumOrFallback(payload.group, allowedEquipmentGroups, record.group) } : {}),
        ...(payload.baseSetName !== undefined ? { baseSetName: payload.baseSetName?.trim() || null } : {}),
        ...(payload.sourceUrl !== undefined ? { sourceUrl: payload.sourceUrl?.trim() || null } : {}),
        ...(payload.minSeason !== undefined ? { minSeason: payload.minSeason } : {}),
        ...(payload.status ? { status: enumOrFallback(payload.status, allowedStatuses, record.status) } : {}),
        ...(payload.rawData !== undefined ? { rawData: jsonValue(payload.rawData) } : {}),
        ...(payload.remapData !== undefined ? { remapData: jsonValue(payload.remapData) } : {}),
        ...(payload.variants !== undefined ? { variants: { deleteMany: {}, create: payload.variants.map((item) => ({ quality: enumOrFallback(item.quality, allowedEquipmentQualities, 'NORMAL'), minSeason: item.minSeason ?? payload.minSeason ?? record.minSeason, data: jsonValue(item.data) })) } } : {}),
        ...(payload.pieces !== undefined ? { pieces: { deleteMany: {}, create: payload.pieces.map((item, index) => ({ name: item.name.trim(), slot: item.slot.trim(), imagePath: item.imagePath?.trim() || null, data: jsonValue(item.data), sortOrder: item.sortOrder ?? index })) } } : {}),
        ...(payload.options !== undefined ? { options: { deleteMany: {}, create: payload.options.map((item, index) => ({ scope: item.scope.trim(), label: item.label.trim(), data: jsonValue(item.data), sortOrder: item.sortOrder ?? index })) } } : {}),
        ...(payload.classLinks !== undefined ? { classLinks: { deleteMany: {}, create: payload.classLinks.map((item) => ({ classId: item.classId, characterId: item.characterId, role: enumOrFallback(item.role, allowedClassLinkRoles, 'PLAYABLE'), source: item.source?.trim() || 'admin' })) } } : {}),
        ...(payload.seasons !== undefined ? { seasons: { deleteMany: {}, create: payload.seasons.map((item) => ({ season: item.season, visibility: enumOrFallback(item.visibility, allowedScopes, item.season <= 6 ? 'SEASON_6' : 'FUTURE_SEASON'), source: item.source?.trim() || 'admin' })) } } : {})
      },
      include: equipmentRelations
    }))

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.equipment.updated',
      targetType: 'EquipmentRecord',
      targetId: updated.id,
      metadata: { key: updated.key, name: updated.name, group: updated.group, status: updated.status }
    })

    return updated
  }

  async archiveEquipment(id: string, user?: AuthenticatedUser) {
    const record = await this.prisma.equipmentRecord.findUnique({ where: { id } })
    if (!record) {
      throw new NotFoundException(`Equipment record not found: ${id}`)
    }

    const archived = await this.prisma.equipmentRecord.update({
      where: { id },
      data: {
        status: 'ARCHIVED'
      }
    })

    await this.audit.record({
      ...auditActor(user),
      action: 'admin.content.equipment.archived',
      targetType: 'EquipmentRecord',
      targetId: archived.id,
      metadata: { key: archived.key, name: archived.name, group: archived.group }
    })

    return archived
  }

  async equipmentGaps(query: AdminContentQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where: Prisma.EquipmentRecordWhereInput = {
      OR: [
        { remapData: { path: '$.warnings', array_contains: 'missing-image' } },
        { remapData: { path: '$.warnings', array_contains: 'missing-ancient-set-options' } }
      ],
      ...(query.search
        ? {
            AND: [{
              OR: [
                { name: { contains: query.search } },
                { title: { contains: query.search } },
                { category: { contains: query.search } },
                { baseSetName: { contains: query.search } }
              ]
            }]
          }
        : {})
    }

    const [total, data] = await Promise.all([
      this.prisma.equipmentRecord.count({ where }),
      this.prisma.equipmentRecord.findMany({
        where,
        orderBy: [{ minSeason: 'asc' }, { category: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
        include: {
          variants: { orderBy: { quality: 'asc' } },
          pieces: { orderBy: [{ sortOrder: 'asc' }, { slot: 'asc' }] },
          options: { orderBy: { sortOrder: 'asc' } },
          classLinks: {
            include: { class: true, character: true },
            orderBy: [{ role: 'asc' }, { class: { tier: 'asc' } }]
          }
        }
      })
    ])

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }
}
