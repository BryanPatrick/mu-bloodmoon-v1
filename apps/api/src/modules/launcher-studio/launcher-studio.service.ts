import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuditService } from '../audit/audit.service'
import type { LauncherAssetStorageProvider } from './launcher-asset-storage'
import { LAUNCHER_ASSET_STORAGE_PROVIDER } from './launcher-studio.constants'
import {
  LAUNCHER_PAGES,
  SLOT_BY_ID,
  SLOT_REGISTRY,
  isKnownPage,
  slotsForPage,
  type SlotDefinition
} from './slot-registry'
import { SlotValidationError, validateSlotValue, type AssetLookup } from './slot-validator'
import type {
  AdminLauncherAssetQuery,
  AdminLauncherAssetUploadPayload,
  AdminLauncherPublishPayload,
  AdminLauncherRollbackPayload,
  AdminLauncherSlotUpdatePayload,
  AdminLauncherTermsCreatePayload,
  LauncherContentResponse,
  ResolvedSlot
} from './launcher-studio.types'

const BOOTSTRAP_SCHEMA_VERSION = 1
const defaultPageSize = 30
const maxPageSize = 100

function actor(user?: AuthenticatedUser) {
  return { actorId: user?.id, actorUsername: user?.username }
}

function pagination(query: { page?: string; pageSize?: string }) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1)
  const pageSize = Math.min(maxPageSize, Math.max(1, Number.parseInt(query.pageSize || String(defaultPageSize), 10) || defaultPageSize))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

function isEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

@Injectable()
export class LauncherStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(LAUNCHER_ASSET_STORAGE_PROVIDER) private readonly storage: LauncherAssetStorageProvider
  ) {}

  private async assetLookup(): Promise<AssetLookup> {
    // Cheap for the current real scale of this library (an operator-curated
    // asset set, not user-generated content) -- a full table scan of ids is
    // fine; revisit with a targeted findMany(ids) if the library grows into
    // the thousands.
    const assets = await this.prisma.launcherAsset.findMany({ select: { id: true, category: true } })
    const map = new Map(assets.map((asset) => [asset.id, asset]))
    return (assetId: string) => map.get(assetId)
  }

  // ---- Registry (read-only, code-defined) ----------------------------

  pages() {
    return LAUNCHER_PAGES.map((page) => ({ page, slotCount: slotsForPage(page).length }))
  }

  registry(page?: string) {
    if (!page) return SLOT_REGISTRY
    if (!isKnownPage(page)) throw new BadRequestException(`Unknown page "${page}"`)
    return slotsForPage(page)
  }

  // ---- Slot content (draft/publish) -----------------------------------

  private async slotRow(slotId: string) {
    return this.prisma.launcherSlotContent.findUnique({ where: { slotId } })
  }

  private resolveSlot(slot: SlotDefinition, row: Awaited<ReturnType<LauncherStudioService['slotRow']>>): ResolvedSlot {
    if (!row) {
      return { id: slot.id, page: slot.page, value: slot.defaultValue, tokens: {}, status: 'UNSET' }
    }
    const value = row.status === 'PUBLISHED' ? row.publishedValue ?? row.draftValue : row.draftValue
    const parsed = (value ?? {}) as { value?: unknown; tokens?: Record<string, string> }
    return {
      id: slot.id,
      page: slot.page,
      value: parsed.value ?? slot.defaultValue,
      tokens: parsed.tokens ?? {},
      status: row.status
    }
  }

  async draftState(page?: string) {
    const slots = page ? this.registry(page) as SlotDefinition[] : SLOT_REGISTRY
    const rows = await this.prisma.launcherSlotContent.findMany({
      where: { slotId: { in: slots.map((slot) => slot.id) } }
    })
    const rowsBySlot = new Map(rows.map((row) => [row.slotId, row]))
    return slots.map((slot) => {
      const row = rowsBySlot.get(slot.id) ?? null
      return {
        definition: slot,
        draft: this.resolveDraftOnly(slot, row),
        published: this.resolvePublishedOnly(slot, row),
        hasPendingChanges: this.hasPendingChanges(row)
      }
    })
  }

  private hasPendingChanges(row: Awaited<ReturnType<LauncherStudioService['slotRow']>>) {
    if (!row) return false
    return !isEqual(row.draftValue, row.publishedValue)
  }

  private resolveDraftOnly(slot: SlotDefinition, row: Awaited<ReturnType<LauncherStudioService['slotRow']>>) {
    const parsed = (row?.draftValue ?? {}) as { value?: unknown; tokens?: Record<string, string> }
    return { value: row ? parsed.value ?? slot.defaultValue : slot.defaultValue, tokens: parsed.tokens ?? {} }
  }

  private resolvePublishedOnly(slot: SlotDefinition, row: Awaited<ReturnType<LauncherStudioService['slotRow']>>) {
    if (!row?.publishedValue) return null
    const parsed = row.publishedValue as { value?: unknown; tokens?: Record<string, string> }
    return { value: parsed.value ?? slot.defaultValue, tokens: parsed.tokens ?? {} }
  }

  async updateSlotDraft(slotId: string, payload: AdminLauncherSlotUpdatePayload, user: AuthenticatedUser) {
    const slot = SLOT_BY_ID.get(slotId)
    if (!slot) throw new NotFoundException(`Unknown slot "${slotId}"`)

    const assets = await this.assetLookup()
    let validated: { value: unknown; tokens?: Record<string, string> }
    try {
      validated = validateSlotValue(slot, payload, assets)
    } catch (error) {
      if (error instanceof SlotValidationError) throw new BadRequestException(error.message)
      throw error
    }

    const existing = await this.slotRow(slotId)
    const draftValue = validated
    const status = existing && isEqual(draftValue, existing.publishedValue) ? 'PUBLISHED' : 'DRAFT'

    const row = await this.prisma.launcherSlotContent.upsert({
      where: { slotId },
      create: {
        slotId,
        pageKey: slot.page,
        status,
        draftValue: draftValue as object,
        updatedBy: user.id
      },
      update: {
        draftValue: draftValue as object,
        status,
        updatedBy: user.id
      }
    })

    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.slot.updated',
      targetType: 'LauncherSlotContent',
      targetId: row.id,
      metadata: { slotId, page: slot.page, status: row.status }
    })

    return this.resolveSlot(slot, row)
  }

  // ---- Publish / rollback ----------------------------------------------

  async publish(payload: AdminLauncherPublishPayload, user: AuthenticatedUser) {
    const pending = await this.prisma.launcherSlotContent.findMany({ where: { status: 'DRAFT' } })
    if (pending.length === 0) {
      throw new BadRequestException('No draft changes to publish')
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const publish = await tx.launcherContentPublish.create({
        data: { kind: 'PUBLISH', note: payload.note, publishedBy: user.id }
      })
      for (const row of pending) {
        await tx.launcherSlotContent.update({
          where: { id: row.id },
          data: {
            status: 'PUBLISHED',
            publishedValue: row.draftValue as object,
            publishedInVersion: publish.version,
            publishedBy: user.id,
            publishedAt: publish.publishedAt
          }
        })
        await tx.launcherSlotContentRevision.create({
          data: { slotId: row.slotId, version: publish.version, value: row.draftValue as object }
        })
      }
      return publish
    })

    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.content.published',
      targetType: 'LauncherContentPublish',
      targetId: result.id,
      metadata: { version: result.version, slotCount: pending.length, slotIds: pending.map((row) => row.slotId) }
    })

    return result
  }

  async rollback(payload: AdminLauncherRollbackPayload, user: AuthenticatedUser) {
    const target = await this.prisma.launcherContentPublish.findUnique({ where: { version: payload.version } })
    if (!target) throw new NotFoundException(`Publish version ${payload.version} not found`)

    const revisions = await this.prisma.launcherSlotContentRevision.findMany({
      where: { version: { lte: payload.version } },
      orderBy: { version: 'desc' }
    })
    const latestPerSlot = new Map<string, (typeof revisions)[number]>()
    for (const revision of revisions) {
      if (!latestPerSlot.has(revision.slotId)) latestPerSlot.set(revision.slotId, revision)
    }
    if (latestPerSlot.size === 0) {
      throw new BadRequestException('No slot revisions exist at or before that version')
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const publish = await tx.launcherContentPublish.create({
        data: {
          kind: 'ROLLBACK',
          note: payload.note ?? `Rollback to version ${payload.version}`,
          publishedBy: user.id
        }
      })
      for (const revision of latestPerSlot.values()) {
        await tx.launcherSlotContent.updateMany({
          where: { slotId: revision.slotId },
          data: {
            draftValue: revision.value as object,
            publishedValue: revision.value as object,
            status: 'PUBLISHED',
            publishedInVersion: publish.version,
            publishedBy: user.id,
            publishedAt: publish.publishedAt
          }
        })
        await tx.launcherSlotContentRevision.create({
          data: { slotId: revision.slotId, version: publish.version, value: revision.value as object }
        })
      }
      return publish
    })

    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.content.rolledBack',
      targetType: 'LauncherContentPublish',
      targetId: result.id,
      metadata: { restoredToVersion: payload.version, slotIds: [...latestPerSlot.keys()] }
    })

    return result
  }

  async publishHistory() {
    return this.prisma.launcherContentPublish.findMany({ orderBy: { version: 'desc' }, take: 50 })
  }

  // ---- Assets ------------------------------------------------------------

  async uploadAsset(payload: AdminLauncherAssetUploadPayload, user: AuthenticatedUser) {
    const match = payload.dataUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
    if (!match) throw new BadRequestException('Send a PNG, JPEG, or WebP image.')

    const buffer = Buffer.from(match[2], 'base64')
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('The image must be at most 5 MB.')
    }
    const mimeType = match[1]

    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const existing = await this.prisma.launcherAsset.findFirst({ where: { sha256, category: payload.category } })
    if (existing) return existing

    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
    const saved = await this.storage.save(buffer, extension)

    const name = payload.name?.trim().slice(0, 120) || `Asset ${new Date().toISOString().slice(0, 10)}`
    const asset = await this.prisma.launcherAsset.create({
      data: {
        name,
        category: payload.category,
        mimeType,
        sizeBytes: saved.sizeBytes,
        sha256: saved.sha256,
        storageProvider: this.storage.kind,
        storageKey: saved.storageKey,
        publicUrl: saved.publicUrl,
        createdBy: user.id
      }
    })

    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.asset.uploaded',
      targetType: 'LauncherAsset',
      targetId: asset.id,
      metadata: { name, category: payload.category, mimeType, sizeBytes: saved.sizeBytes }
    })

    return asset
  }

  async listAssets(query: AdminLauncherAssetQuery) {
    const { page, pageSize, skip } = pagination(query)
    const where = {
      status: { not: 'ARCHIVED' as const },
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? { name: { contains: query.search } } : {})
    }
    const [items, total] = await Promise.all([
      this.prisma.launcherAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.launcherAsset.count({ where })
    ])
    return { items, total, page, pageSize }
  }

  async archiveAsset(id: string, user: AuthenticatedUser) {
    const asset = await this.prisma.launcherAsset.update({ where: { id }, data: { status: 'ARCHIVED' } })
    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.asset.archived',
      targetType: 'LauncherAsset',
      targetId: asset.id
    })
    return asset
  }

  // ---- Store purchase terms (Part V/W) ------------------------------------

  async listTerms() {
    return this.prisma.storePurchaseTerms.findMany({ orderBy: { version: 'desc' } })
  }

  // Public read path (Part AL) -- the Store checkout needs to display the
  // current terms and know which version to send back. Returns null (not
  // 404) when no terms have been configured yet, matching the same
  // backward-compatible "nothing configured" state createPurchaseIntent
  // already treats as a no-op (commerce.service.ts).
  async activeTerms() {
    return this.prisma.storePurchaseTerms.findFirst({ where: { active: true }, orderBy: { version: 'desc' } })
  }

  async createTerms(payload: AdminLauncherTermsCreatePayload, user: AuthenticatedUser) {
    if (!payload.title?.trim() || !payload.content?.trim()) {
      throw new BadRequestException('Title and content are required.')
    }
    const terms = await this.prisma.$transaction(async (tx) => {
      await tx.storePurchaseTerms.updateMany({ where: { active: true }, data: { active: false } })
      return tx.storePurchaseTerms.create({
        data: {
          title: payload.title.trim(),
          content: payload.content,
          effectiveAt: payload.effectiveAt ? new Date(payload.effectiveAt) : new Date(),
          active: true,
          createdBy: user.id
        }
      })
    })

    await this.audit.record({
      ...actor(user),
      action: 'admin.launcher-studio.terms.created',
      targetType: 'StorePurchaseTerms',
      targetId: terms.id,
      metadata: { version: terms.version, title: terms.title }
    })

    return terms
  }

  // ---- Public/launcher-consumable read (Part AJ/AL) -----------------------

  async resolvedContent(page?: string): Promise<LauncherContentResponse> {
    const slots = page ? (this.registry(page) as SlotDefinition[]) : SLOT_REGISTRY
    const rows = await this.prisma.launcherSlotContent.findMany({
      where: { slotId: { in: slots.map((slot) => slot.id) }, status: 'PUBLISHED' }
    })
    const rowsBySlot = new Map(rows.map((row) => [row.slotId, row]))
    const resolved = slots.map((slot) => this.resolveSlot(slot, rowsBySlot.get(slot.id) ?? null))

    const latestVersion = await this.prisma.launcherContentPublish.findFirst({ orderBy: { version: 'desc' } })
    return {
      schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
      contentVersion: latestVersion?.version ?? 0,
      generatedAt: new Date().toISOString(),
      slots: resolved,
      assets: await this.buildAssetManifest(resolved)
    }
  }

  // Part E -- every IMAGE/asset-REFERENCE slot value (including each
  // iconAssetId inside an ORDERED_LIST item) is a LauncherAsset id, never a
  // URL. This resolves the ids actually present in the response to real,
  // hash-verifiable entries, the same shape bootstrap's own asset
  // manifest already uses -- an id with no matching LauncherAsset row
  // (deleted/never existed) is simply omitted, never a fabricated entry.
  private async buildAssetManifest(resolved: ResolvedSlot[]) {
    const ids = new Set<string>()
    const collect = (value: unknown) => {
      if (typeof value === 'string' && value) ids.add(value)
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'iconAssetId' in item) collect((item as { iconAssetId?: unknown }).iconAssetId)
        }
      }
    }
    for (const slot of resolved) collect(slot.value)
    if (ids.size === 0) return []

    const assets = await this.prisma.launcherAsset.findMany({ where: { id: { in: [...ids] } } })
    return assets
      .filter((asset) => asset.publicUrl)
      .map((asset) => ({
        id: asset.id,
        url: asset.publicUrl as string,
        contentType: asset.mimeType,
        hash: asset.sha256,
        size: asset.sizeBytes
      }))
  }
}
