import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ProgressionDomain, ProgressionPolicyStatus, ProgressionRiskLevel } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { permissionKeys } from '../auth/permissions'
import { PROGRESSION_SEED_ENTRIES } from './progression-config-seed-data'

// PHASE U (2026-09-03) -- the Progression control plane (XP/Drop/Reset/
// Master Reset), built on the exact same desired-state/effective-state/
// drift/audit shape ADR-0024 already established for the X-Shop/CashShop
// control plane. This service is deliberately Portal-local: it has NO
// GameServer write capability and NO live RemoteOps/SSH access -- see
// docs/decisions/0025-progression-control-plane.md and
// docs/security/game-write-boundary.md for the same boundary this
// service does not attempt to widen.

const actor = (user: AuthenticatedUser) => ({ actorId: user.id, actorUsername: user.username, actorRole: user.role })
const hasPermission = (user: AuthenticatedUser, permission: string) => user.permissions.includes('*') || user.permissions.includes(permission)
const requirePermission = (user: AuthenticatedUser, permission: string) => {
  if (!hasPermission(user, permission)) throw new ForbiddenException('Voce nao possui permissao para esta operacao de progressao.')
}

// Part 25's mandatory-reason rule for high-risk changes.
const HIGH_RISK_LEVELS: ProgressionRiskLevel[] = ['HIGH', 'CRITICAL']

export type ProgressionConfigQuery = {
  domain?: ProgressionDomain
  driftStatus?: string
  riskLevel?: ProgressionRiskLevel
  policyStatus?: ProgressionPolicyStatus
  search?: string
}

export type ProgressionConfigUpdatePayload = {
  desiredValue?: Prisma.InputJsonValue | null
  desiredReason?: string
  internalNotes?: string
}

type SnapshotRow = {
  domain: ProgressionDomain
  key: string
  sourceFile: string
  sourceKey: string
  flat?: number
  perTier?: { AL0: number; AL1: number; AL2: number; AL3: number }
  fingerprint: string
}

type Snapshot = {
  generatedAt: string
  sourceFiles: Array<{ file: string; sha256: string; bytes: number; note?: string }>
  rows: SnapshotRow[]
}

function valuesConflict(desired: Prisma.JsonValue, effective: Prisma.JsonValue): boolean {
  if (typeof desired === 'number' && typeof effective === 'number') return desired !== effective
  if (typeof desired === 'number' && effective && typeof effective === 'object' && !Array.isArray(effective)) {
    return Object.values(effective as Record<string, unknown>).some((v) => v !== desired)
  }
  if (desired && typeof desired === 'object' && effective && typeof effective === 'object' && !Array.isArray(desired) && !Array.isArray(effective)) {
    const d = desired as Record<string, unknown>
    const e = effective as Record<string, unknown>
    return Object.keys(d).some((k) => d[k] !== e[k])
  }
  return JSON.stringify(desired) !== JSON.stringify(effective)
}

@Injectable()
export class ProgressionConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async seedAll(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionEdit)
    let created = 0
    let updated = 0
    for (const entry of PROGRESSION_SEED_ENTRIES) {
      const existing = await this.prisma.progressionConfigItem.findUnique({ where: { domain_key: { domain: entry.domain, key: entry.key } } })
      if (existing) {
        // Identity/technical fields only -- never overwrite a real
        // desired-state opinion an admin may have already set, same
        // discipline Phase T's own seedXshop/seedCashshop follow.
        await this.prisma.progressionConfigItem.update({
          where: { id: existing.id },
          data: {
            friendlyLabel: entry.friendlyLabel,
            description: entry.description,
            unit: entry.unit,
            technicalSource: entry.technicalSource,
            riskLevel: entry.riskLevel,
            // PHASE V -- policyStatus is real product/business
            // classification (this phase's own VIP policy drift matrix),
            // not an individual admin's desired-state opinion, so unlike
            // desiredValue it IS reconciled on every reseed.
            policyStatus: entry.policyStatus,
            updatedBy: user.id,
            version: { increment: 1 }
          }
        })
        updated += 1
        continue
      }
      await this.prisma.progressionConfigItem.create({
        data: {
          domain: entry.domain,
          key: entry.key,
          friendlyLabel: entry.friendlyLabel,
          description: entry.description,
          unit: entry.unit,
          technicalSource: entry.technicalSource,
          riskLevel: entry.riskLevel,
          effectiveValue: entry.effectiveValue,
          desiredValue: entry.desiredValue ?? undefined,
          desiredReason: entry.desiredReason,
          policyStatus: entry.policyStatus,
          createdBy: user.id,
          updatedBy: user.id
        }
      })
      created += 1
    }
    await this.audit.record({
      ...actor(user),
      action: 'admin.progression.seeded',
      targetType: 'ProgressionConfigItem',
      afterData: { created, updated },
      workDescription: `Catalogo de progressao semeado: ${created} novos, ${updated} atualizados.`
    })
    return { created, updated, total: PROGRESSION_SEED_ENTRIES.length }
  }

  async list(user: AuthenticatedUser, query: ProgressionConfigQuery) {
    requirePermission(user, permissionKeys.adminProgressionView)
    const where: Prisma.ProgressionConfigItemWhereInput = {
      ...(query.domain ? { domain: query.domain } : {}),
      ...(query.driftStatus ? { driftStatus: query.driftStatus as never } : {}),
      ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}),
      ...(query.policyStatus ? { policyStatus: query.policyStatus } : {}),
      ...(query.search?.trim()
        ? { OR: [{ friendlyLabel: { contains: query.search.trim() } }, { key: { contains: query.search.trim() } }] }
        : {})
    }
    const items = await this.prisma.progressionConfigItem.findMany({ where, orderBy: [{ domain: 'asc' }, { key: 'asc' }] })
    return { items, total: items.length }
  }

  async summary(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionView)
    const rows = await this.prisma.progressionConfigItem.groupBy({ by: ['domain', 'driftStatus'], _count: { _all: true } })
    return rows.map((r) => ({ domain: r.domain, driftStatus: r.driftStatus, count: r._count._all }))
  }

  async update(id: string, payload: ProgressionConfigUpdatePayload, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionEdit)
    const existing = await this.prisma.progressionConfigItem.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Configuracao de progressao nao encontrada.')

    const reason = payload.desiredReason?.trim()
    if (HIGH_RISK_LEVELS.includes(existing.riskLevel) && !reason) {
      throw new BadRequestException('Uma justificativa e obrigatoria para alterar uma configuracao de risco HIGH ou CRITICAL.')
    }

    const before = { desiredValue: existing.desiredValue, internalNotes: existing.internalNotes }
    const data: Prisma.ProgressionConfigItemUpdateInput = { updatedBy: user.id, version: { increment: 1 } }
    if (payload.desiredValue !== undefined) data.desiredValue = payload.desiredValue === null ? Prisma.JsonNull : payload.desiredValue
    if (payload.desiredReason !== undefined) data.desiredReason = reason || null
    if (payload.internalNotes !== undefined) data.internalNotes = payload.internalNotes

    const updated = await this.prisma.progressionConfigItem.update({ where: { id }, data })

    await this.audit.record({
      ...actor(user),
      action: 'admin.progression.updated',
      targetType: 'ProgressionConfigItem',
      targetId: id,
      beforeData: before,
      afterData: { desiredValue: updated.desiredValue, internalNotes: updated.internalNotes },
      reason: reason || undefined,
      workDescription: `"${updated.friendlyLabel}" atualizado.`
    })
    return updated
  }

  async history(id: string, user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionView)
    return this.prisma.auditEvent.findMany({
      where: { targetType: 'ProgressionConfigItem', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  }

  // Part 24 -- DESIGN_ONLY. Three independent reasons this can never
  // fire, same shape as legacy-catalog-config.service.ts#sync: (1) a
  // dedicated .sync permission, separate from .edit; (2) an env-var kill
  // switch, unset in every environment this project ships; (3) even
  // past both, no command dispatch exists behind this guard at all --
  // RELOAD_REQUIRED/RESTART_REQUIRED remain UNKNOWN for every field
  // (docs/progression/progression-config-field-matrix.md), so no real
  // command could be correctly implemented yet regardless of RBAC/flags.
  async sync(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionSync)
    if (process.env.PROGRESSION_RUNTIME_SYNC_ENABLED !== 'true') {
      throw new ForbiddenException('Sincronizacao de progressao com o GameServer esta desabilitada (PROGRESSION_RUNTIME_SYNC_ENABLED != true).')
    }
    throw new BadRequestException('NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE -- RELOAD_REQUIRED/RESTART_REQUIRED permanecem UNKNOWN para todo campo de progressao (OQ-031-equivalente para este dominio); nenhum comando de sincronizacao real existe ainda.')
  }

  private async readSnapshot(): Promise<Snapshot> {
    const candidates = [
      path.resolve(process.cwd(), 'docs/progression/progression-effective-state-snapshot.json'),
      path.resolve(process.cwd(), '../../docs/progression/progression-effective-state-snapshot.json'),
      path.resolve(__dirname, '../../../../../docs/progression/progression-effective-state-snapshot.json')
    ]
    let lastError: unknown
    for (const candidate of candidates) {
      try {
        return JSON.parse(await readFile(candidate, 'utf8')) as Snapshot
      } catch (error) {
        lastError = error
      }
    }
    throw new NotFoundException(`Snapshot de estado efetivo de progressao nao encontrado: ${lastError instanceof Error ? lastError.message : 'caminhos verificados sem sucesso'}`)
  }

  async refreshEffectiveState(user: AuthenticatedUser) {
    requirePermission(user, permissionKeys.adminProgressionEdit)
    const snapshot = await this.readSnapshot()
    let updated = 0
    let driftCount = 0
    let inSyncCount = 0
    let unmatched = 0

    for (const row of snapshot.rows) {
      const existing = await this.prisma.progressionConfigItem.findUnique({ where: { domain_key: { domain: row.domain, key: row.key } } })
      if (!existing) {
        unmatched += 1
        continue
      }
      const effectiveValue = (row.perTier ?? row.flat) as Prisma.InputJsonValue
      const driftStatus = existing.desiredValue === null || existing.desiredValue === undefined
        ? 'IN_SYNC'
        : valuesConflict(existing.desiredValue as Prisma.JsonValue, effectiveValue as Prisma.JsonValue)
          ? 'DRIFT_DETECTED'
          : 'IN_SYNC'
      if (driftStatus === 'DRIFT_DETECTED') driftCount += 1
      else inSyncCount += 1

      await this.prisma.progressionConfigItem.update({
        where: { id: existing.id },
        data: {
          effectiveValue,
          sourceLastReadAt: new Date(snapshot.generatedAt),
          sourceFingerprint: row.fingerprint,
          driftStatus,
          updatedBy: user.id
          // Deliberately NOT updated: desiredValue, desiredReason,
          // internalNotes -- every desired-state opinion an admin may
          // have set is preserved untouched.
        }
      })
      updated += 1
    }

    await this.audit.record({
      ...actor(user),
      action: 'admin.progression.effective-state-refreshed',
      targetType: 'ProgressionConfigItem',
      afterData: { updated, driftCount, inSyncCount, unmatched, snapshotGeneratedAt: snapshot.generatedAt },
      workDescription: `Estado efetivo de progressao atualizado a partir do snapshot: ${updated} linhas, ${driftCount} com drift.`
    })

    return { updated, driftCount, inSyncCount, unmatched, snapshotGeneratedAt: snapshot.generatedAt, sourceFiles: snapshot.sourceFiles }
  }
}
