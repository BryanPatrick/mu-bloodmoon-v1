import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { BetaParticipationRecordStatus, BetaParticipationSourceType } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { hashNormalizedEmail, normalizeEmail } from '../beta-lifecycle/beta-lifecycle.service'

// Phase Z -- the source of BetaRewardEntitlement rows. Two deliberately
// separate steps, matching Part 2's "separate ELIGIBILITY FACT from
// REWARD DEFINITION" instruction:
//   1. recordParticipation -- staff records WHY an email is eligible
//      (BetaParticipationRecord, status=RECORDED). No reward attached yet.
//   2. previewGeneration / commitGeneration -- staff picks a batch of
//      RECORDED rows and attaches a real reward type/amount, producing
//      real BetaRewardEntitlement rows (status=ELIGIBLE, immediately
//      claimable). commitGeneration is idempotent: a record already
//      CONVERTED is skipped, never re-processed, on every call.
// Nothing here ever infers eligibility from accountPhase or a date range
// alone -- every record requires an explicit sourceType and a written
// justification.

const sourceTypes: BetaParticipationSourceType[] = [
  'OPEN_BETA_PARTICIPATION',
  'BUG_HUNTER_CONTRIBUTION',
  'EVENT_PARTICIPATION',
  'MANUAL_STAFF_GRANT',
  'IMPORTED_REVIEWED_LIST'
]

export type GenerationDisposition = 'WOULD_CREATE' | 'ALREADY_CONVERTED' | 'SKIPPED_NOT_RECORDED'

@Injectable()
export class BetaRewardsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /**
   * Step 1: the eligibility fact. Requires an explicit sourceType and a
   * real, written justification -- never inferred. `email` is normalized/
   * hashed the same way the claim endpoint compares against
   * (beta-lifecycle.service.ts's own helpers, imported, never
   * reimplemented). `accountId` is a best-effort convenience reference
   * only, not the durability anchor.
   */
  async recordParticipation(
    payload: { betaCycleId?: string, email?: string, accountId?: string, sourceType?: string, sourceId?: string, justification?: string },
    actor: AuthenticatedUser
  ) {
    const betaCycleId = payload.betaCycleId?.trim()
    const email = payload.email?.trim()
    const justification = payload.justification?.trim()
    if (!betaCycleId) throw new BadRequestException('Informe o ciclo de Beta (betaCycleId).')
    if (!email) throw new BadRequestException('Informe o e-mail normalizado da conta elegivel.')
    if (!payload.sourceType || !sourceTypes.includes(payload.sourceType as BetaParticipationSourceType)) {
      throw new BadRequestException('Selecione um tipo de origem valido.')
    }
    if (!justification || justification.length < 10) {
      throw new BadRequestException('Informe uma justificativa com pelo menos 10 caracteres -- este registro precisa ser auditavel.')
    }

    const normalizedEmailHash = hashNormalizedEmail(normalizeEmail(email))
    const record = await this.prisma.betaParticipationRecord.create({
      data: {
        betaCycleId,
        normalizedEmailHash,
        accountId: payload.accountId?.trim() || null,
        sourceType: payload.sourceType as BetaParticipationSourceType,
        sourceId: payload.sourceId?.trim() || null,
        justification,
        recordedById: actor.id
      }
    })

    await this.audit.record({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'beta-rewards.participation.recorded',
      targetType: 'BetaParticipationRecord',
      targetId: record.id,
      metadata: { betaCycleId, sourceType: record.sourceType, sourceId: record.sourceId, result: 'success' }
    })

    return record
  }

  async rejectParticipation(id: string, reason: string | undefined, actor: AuthenticatedUser) {
    const record = await this.prisma.betaParticipationRecord.findUnique({ where: { id } })
    if (!record) throw new NotFoundException('Registro de participacao nao encontrado.')
    if (record.status !== 'RECORDED') {
      throw new BadRequestException('Apenas registros com status RECORDED podem ser rejeitados.')
    }
    const trimmedReason = reason?.trim()
    if (!trimmedReason || trimmedReason.length < 5) {
      throw new BadRequestException('Informe uma justificativa com pelo menos 5 caracteres.')
    }

    const updated = await this.prisma.betaParticipationRecord.update({
      where: { id },
      data: { status: 'REJECTED' }
    })

    await this.audit.record({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'beta-rewards.participation.rejected',
      targetType: 'BetaParticipationRecord',
      targetId: id,
      reason: trimmedReason,
      metadata: { result: 'success' }
    })

    return updated
  }

  listParticipation(filters: { status?: string, sourceType?: string, betaCycleId?: string } = {}) {
    const status = filters.status as BetaParticipationRecordStatus | undefined
    const sourceType = filters.sourceType as BetaParticipationSourceType | undefined
    return this.prisma.betaParticipationRecord.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(sourceType ? { sourceType } : {}),
        ...(filters.betaCycleId ? { betaCycleId: filters.betaCycleId } : {})
      },
      include: { recordedBy: { select: { username: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 500
    })
  }

  /**
   * Shared by preview and commit -- computes what WOULD happen for each
   * requested record without ever writing, so the two paths can never
   * silently diverge in behavior.
   */
  private async computeDispositions(participationRecordIds: string[]) {
    if (!participationRecordIds.length) {
      throw new BadRequestException('Selecione ao menos um registro de participacao.')
    }
    const records = await this.prisma.betaParticipationRecord.findMany({
      where: { id: { in: participationRecordIds } }
    })
    const found = new Map(records.map((r) => [r.id, r]))

    return participationRecordIds.map((id) => {
      const record = found.get(id)
      if (!record) {
        return { participationRecordId: id, disposition: 'SKIPPED_NOT_RECORDED' as GenerationDisposition, record: null }
      }
      if (record.status === 'CONVERTED') {
        return { participationRecordId: id, disposition: 'ALREADY_CONVERTED' as GenerationDisposition, record }
      }
      if (record.status !== 'RECORDED') {
        return { participationRecordId: id, disposition: 'SKIPPED_NOT_RECORDED' as GenerationDisposition, record }
      }
      return { participationRecordId: id, disposition: 'WOULD_CREATE' as GenerationDisposition, record }
    })
  }

  /**
   * Dry-run -- never writes anything. Shows exactly what commitGeneration
   * would do for this exact selection + reward definition.
   */
  async previewGeneration(payload: { participationRecordIds?: string[], rewardType?: string, rewardAmount?: number }) {
    const rewardType = payload.rewardType?.trim()
    if (!rewardType) throw new BadRequestException('Informe o tipo de recompensa.')
    if (!Number.isFinite(payload.rewardAmount) || (payload.rewardAmount ?? 0) <= 0) {
      throw new BadRequestException('Informe uma quantidade de recompensa valida (maior que zero).')
    }
    const dispositions = await this.computeDispositions(payload.participationRecordIds || [])
    return {
      rewardType,
      rewardAmount: payload.rewardAmount,
      total: dispositions.length,
      wouldCreate: dispositions.filter((d) => d.disposition === 'WOULD_CREATE').length,
      alreadyConverted: dispositions.filter((d) => d.disposition === 'ALREADY_CONVERTED').length,
      skipped: dispositions.filter((d) => d.disposition === 'SKIPPED_NOT_RECORDED').length,
      rows: dispositions.map((d) => ({
        participationRecordId: d.participationRecordId,
        disposition: d.disposition,
        betaCycleId: d.record?.betaCycleId ?? null,
        sourceType: d.record?.sourceType ?? null
      }))
    }
  }

  /**
   * Commit -- idempotent. Re-derives dispositions fresh (never trusts a
   * client-supplied preview), and only ever acts on WOULD_CREATE rows.
   * Each conversion is one transaction: create the BetaRewardEntitlement
   * (status=ELIGIBLE, immediately claimable) + mark the source record
   * CONVERTED + link them both ways, or neither happens.
   */
  async commitGeneration(
    payload: { participationRecordIds?: string[], rewardType?: string, rewardAmount?: number, reason?: string },
    actor: AuthenticatedUser
  ) {
    const rewardType = payload.rewardType?.trim()
    const reason = payload.reason?.trim()
    if (!rewardType) throw new BadRequestException('Informe o tipo de recompensa.')
    if (!Number.isFinite(payload.rewardAmount) || (payload.rewardAmount ?? 0) <= 0) {
      throw new BadRequestException('Informe uma quantidade de recompensa valida (maior que zero).')
    }
    if (!reason || reason.length < 10) {
      throw new BadRequestException('Informe uma justificativa com pelo menos 10 caracteres para esta geracao.')
    }

    const dispositions = await this.computeDispositions(payload.participationRecordIds || [])
    const created: Array<{ participationRecordId: string, entitlementId: string }> = []

    for (const d of dispositions) {
      if (d.disposition !== 'WOULD_CREATE' || !d.record) continue
      const record = d.record
      await this.prisma.$transaction(async (tx) => {
        const entitlement = await tx.betaRewardEntitlement.create({
          data: {
            betaCycleId: record.betaCycleId,
            normalizedEmailHash: record.normalizedEmailHash,
            originalAccountId: record.accountId,
            rewardType: rewardType!,
            rewardAmount: payload.rewardAmount!,
            reason: reason!,
            sourceType: 'PARTICIPATION_RECORD',
            sourceId: record.id,
            status: 'ELIGIBLE'
          }
        })
        await tx.betaParticipationRecord.update({
          where: { id: record.id },
          data: { status: 'CONVERTED', convertedEntitlementId: entitlement.id, convertedAt: new Date() }
        })
        created.push({ participationRecordId: record.id, entitlementId: entitlement.id })
      })
    }

    if (created.length) {
      await this.audit.record({
        actorId: actor.id,
        actorUsername: actor.username,
        action: 'beta-rewards.entitlement.generated',
        targetType: 'BetaRewardEntitlement',
        targetId: actor.id,
        reason,
        severity: 'warning',
        metadata: { rewardType, rewardAmount: payload.rewardAmount, created, result: 'success' }
      })
    }

    return {
      requested: dispositions.length,
      created: created.length,
      alreadyConverted: dispositions.filter((d) => d.disposition === 'ALREADY_CONVERTED').length,
      skipped: dispositions.filter((d) => d.disposition === 'SKIPPED_NOT_RECORDED').length,
      rows: created
    }
  }
}
