import { BadRequestException, Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import { MailTransportService } from '../auth/mail-transport.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccountDeletionService } from './account-deletion.service'
import { EXIT_FEEDBACK_REASON_CODES, type ExitFeedbackPayload } from './account-deletion.contract'

// Phase 15. Self-service deletion for real players -- request -> strong
// (emailed token) confirmation -> grace period -> execution. Mirrors
// auth.service.ts's password-recovery token pattern exactly (32 random
// bytes, SHA-256 hash stored, single-use, previous pending tokens
// invalidated on a new request) rather than inventing a new confirmation
// mechanism. Execution always goes through the existing, tested
// AccountDeletionService.executeNormalDeletion() -- this file only owns
// the request/confirm/cancel/grace-period state machine around it, never
// duplicates the anonymization logic itself.
const DEFAULT_GRACE_PERIOD_DAYS = 14
const DEFAULT_CONFIRMATION_TTL_MINUTES = 60 * 24 // 24h to confirm the email link

@Injectable()
export class AccountDeletionRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailTransport: MailTransportService,
    private readonly deletion: AccountDeletionService
  ) {}

  async requestDeletion(
    user: AuthenticatedUser,
    context: { ip: string | null, device: string | null },
    feedback?: ExitFeedbackPayload
  ) {
    // Structured exit feedback (Bryan, 2026-08-30): shown before this
    // request is created, always optional, always best-effort -- a
    // malformed or failed write here must never prevent the deletion
    // request itself ("O questionário não pode impedir a exclusão").
    // Unknown reason codes are silently dropped rather than rejecting the
    // whole submission -- a forward-compatible client sending a code this
    // server doesn't know yet should not lose data it CAN store (otherText,
    // any recognized codes) over the one it can't.
    if (feedback && Array.isArray(feedback.reasons) && feedback.reasons.length > 0) {
      const reasons = feedback.reasons
        .filter((r) => r && EXIT_FEEDBACK_REASON_CODES.includes(r.code))
        .map((r) => ({ code: r.code, detail: typeof r.detail === 'string' ? r.detail.slice(0, 500) : undefined }))
        .slice(0, 20)
      const retentionInteraction = feedback.retentionInteraction
        ? {
            offered: Boolean(feedback.retentionInteraction.offered),
            offerCodes: Array.isArray(feedback.retentionInteraction.offerCodes)
              ? feedback.retentionInteraction.offerCodes.filter((c) => EXIT_FEEDBACK_REASON_CODES.includes(c))
              : [],
            helpAccepted: Boolean(feedback.retentionInteraction.helpAccepted),
            ticketCreated: Boolean(feedback.retentionInteraction.ticketCreated),
            continuedAnyway: Boolean(feedback.retentionInteraction.continuedAnyway)
          }
        : undefined

      if (reasons.length > 0 || feedback.otherText) {
        try {
          await this.prisma.accountDeletionFeedback.create({
            data: {
              accountId: user.id,
              reasons: reasons as object,
              otherText: feedback.otherText?.slice(0, 2000),
              retentionInteraction: retentionInteraction as object | undefined
            }
          })
        } catch {
          // Best-effort, deliberately swallowed -- see comment above.
        }
      }
    }

    const existing = await this.prisma.accountDeletionRequest.findUnique({ where: { accountId: user.id } })
    if (existing && (existing.status === 'REQUESTED' || existing.status === 'CONFIRMED')) {
      return { status: existing.status, alreadyPending: true as const }
    }

    const plainToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(plainToken).digest('hex')

    await this.prisma.accountDeletionRequest.upsert({
      where: { accountId: user.id },
      create: { accountId: user.id, tokenHash, requestIp: context.ip, requestAgent: context.device },
      update: {
        tokenHash,
        status: 'REQUESTED',
        requestedAt: new Date(),
        requestIp: context.ip,
        requestAgent: context.device,
        confirmedAt: null,
        scheduledExecutionAt: null,
        executedAt: null,
        cancelledAt: null
      }
    })

    const confirmUrl = `${this.webPublicUrl()}/conta/confirmar-exclusao?token=${plainToken}`
    try {
      await this.mailTransport.send({
        to: user.email,
        subject: 'Confirmacao de exclusao de conta - BloodMoon',
        text: `Recebemos uma solicitacao para excluir sua conta. Se foi voce, confirme em ate ${this.confirmationTtlMinutes()} minutos:\n\n${confirmUrl}\n\nSe nao foi voce, ignore este e-mail -- nada sera excluido sem essa confirmacao.`
      })
    } catch {
      // Same fail-open-to-the-caller pattern as auth.service.ts's password
      // recovery: the request record exists either way, but the token is
      // useless without the email, so nothing destructive can happen from
      // a failed send. Logged via audit for support follow-up.
      await this.audit.record({
        actorId: user.id,
        actorUsername: user.username,
        action: 'account.deletion.request.email_failed',
        targetType: 'Account',
        targetId: user.id,
        result: 'FAILURE',
        severity: 'error'
      })
    }

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'account.deletion.requested',
      targetType: 'Account',
      targetId: user.id,
      ipAddress: context.ip,
      userAgent: context.device
    })

    return { status: 'REQUESTED' as const, alreadyPending: false as const }
  }

  async confirmDeletion(token: string, context: { ip: string | null, device: string | null }) {
    const plainToken = token?.trim()
    if (!plainToken) throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Link invalido' })

    const tokenHash = createHash('sha256').update(plainToken).digest('hex')
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { tokenHash } })
    if (!request || request.status !== 'REQUESTED') {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Link invalido ou ja utilizado' })
    }
    if (Date.now() - request.requestedAt.getTime() > this.confirmationTtlMinutes() * 60_000) {
      throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: 'Link expirado' })
    }

    // Re-validate eligibility at confirm time, not just at request time --
    // an account that became blocked (e.g. a guild founder situation, or a
    // staff promotion) between request and confirmation must not silently
    // schedule a deletion it can no longer perform.
    const dryRun = await this.deletion.dryRunNormalDeletion(request.accountId)
    if (dryRun.verdict === 'BLOCKED') {
      throw new BadRequestException({ code: 'DELETION_BLOCKED', message: `Nao e possivel confirmar agora: ${dryRun.blockers.join(', ')}` })
    }

    const graceMs = this.gracePeriodDays() * 86_400_000
    const scheduledExecutionAt = new Date(Date.now() + graceMs)

    await this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), scheduledExecutionAt }
    })

    await this.audit.record({
      actorId: request.accountId,
      actorUsername: request.accountId,
      action: 'account.deletion.confirmed',
      targetType: 'Account',
      targetId: request.accountId,
      metadata: { scheduledExecutionAt: scheduledExecutionAt.toISOString() },
      ipAddress: context.ip,
      userAgent: context.device
    })

    return { status: 'CONFIRMED' as const, scheduledExecutionAt: scheduledExecutionAt.toISOString() }
  }

  async cancelDeletion(user: AuthenticatedUser) {
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { accountId: user.id } })
    if (!request || (request.status !== 'REQUESTED' && request.status !== 'CONFIRMED')) {
      return { status: 'NONE' as const }
    }

    await this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    })

    await this.audit.record({
      actorId: user.id,
      actorUsername: user.username,
      action: 'account.deletion.cancelled',
      targetType: 'Account',
      targetId: user.id
    })

    return { status: 'CANCELLED' as const }
  }

  async myDeletionStatus(user: AuthenticatedUser) {
    const request = await this.prisma.accountDeletionRequest.findUnique({ where: { accountId: user.id } })
    if (!request) return { status: 'NONE' as const }
    return {
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      scheduledExecutionAt: request.scheduledExecutionAt?.toISOString() ?? null
    }
  }

  // Called by an admin action or a future scheduled worker (not built as
  // an always-on setInterval this phase -- deletion execution is rare and
  // low-volume enough that an on-demand/admin-triggered sweep is
  // appropriate; the pattern can graduate to a real interval worker later
  // exactly like VipDeliveryService/GameProvisioningReconciliationService
  // if volume ever justifies it). Re-validates eligibility per account
  // (never trusts the confirm-time snapshot), executes via the existing
  // AccountDeletionService, one account's failure never blocks the batch.
  async processReadyDeletions(): Promise<{ processed: number, executed: number, blocked: number, errors: number }> {
    const ready = await this.prisma.accountDeletionRequest.findMany({
      where: { status: 'CONFIRMED', scheduledExecutionAt: { lte: new Date() } }
    })

    let executed = 0, blocked = 0, errors = 0
    for (const request of ready) {
      try {
        const dryRun = await this.deletion.dryRunNormalDeletion(request.accountId)
        if (dryRun.verdict === 'BLOCKED') {
          blocked++
          continue
        }
        await this.deletion.executeNormalDeletion(
          { id: null, username: 'system-deletion-worker' },
          request.accountId,
          'Self-service deletion request, grace period elapsed'
        )
        await this.prisma.accountDeletionRequest.update({
          where: { id: request.id },
          data: { status: 'EXECUTED', executedAt: new Date() }
        })
        executed++
      } catch {
        errors++
      }
    }

    return { processed: ready.length, executed, blocked, errors }
  }

  // Export of the account's own data, scoped to what's genuinely
  // exportable to the player -- never internal-only records (moderation
  // notes, GM occurrence notes, admin task history, the tombstone/
  // deletion-record itself, password hash, 2FA secrets, session tokens).
  async exportMyData(user: AuthenticatedUser) {
    const [account, characters, ledgerEntries, vipEntitlement, recharges, purchases] = await Promise.all([
      this.prisma.account.findUniqueOrThrow({
        where: { id: user.id },
        select: { username: true, name: true, email: true, createdAt: true, accountPhase: true }
      }),
      this.prisma.accountCharacter.findMany({
        where: { accountId: user.id },
        select: { name: true, className: true, level: true, reset: true, masterReset: true }
      }),
      this.prisma.walletLedgerEntry.findMany({
        where: { accountId: user.id },
        select: { type: true, currency: true, grossAmount: true, taxAmount: true, netAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500
      }),
      this.prisma.vipEntitlement.findUnique({
        where: { accountId: user.id },
        select: { tier: true, activatedAt: true, expiresAt: true, totalDaysGranted: true, status: true }
      }),
      this.prisma.rechargeIntent.findMany({
        where: { accountId: user.id },
        select: { amount: true, bonus: true, price: true, currency: true, status: true, createdAt: true }
      }),
      this.prisma.purchaseIntent.findMany({
        where: { accountId: user.id },
        select: { status: true, createdAt: true }
      })
    ])

    return {
      exportedAt: new Date().toISOString(),
      account,
      characters,
      walletLedgerEntries: ledgerEntries,
      vipEntitlement,
      recharges,
      purchases
    }
  }

  // Bryan's 2026-08-30 follow-up, Part 5: product analytics over exit
  // feedback must be answerable WITHOUT needing player identity -- this
  // reads only `reasons`/`submittedAt`, never `accountId` (present or
  // anonymized), so it works identically before and after a given row's
  // account link is cleared by executeNormalDeletion(). In-memory
  // aggregation (not a raw JSON_TABLE query) because this table's real
  // volume is small and this keeps the JSON-array shape (account-deletion.contract.ts's
  // ExitFeedbackReason[]) as the single source of truth for parsing it,
  // rather than duplicating that shape into SQL.
  async exitFeedbackSummary(windowDays = 30) {
    const rows = await this.prisma.accountDeletionFeedback.findMany({
      select: { reasons: true, submittedAt: true }
    })

    const windowMs = Math.max(1, windowDays) * 86_400_000
    const cutoff = Date.now() - windowMs
    const priorCutoff = cutoff - windowMs

    const currentCounts = new Map<string, number>()
    const priorCounts = new Map<string, number>()
    let totalSubmissions = 0

    for (const row of rows) {
      totalSubmissions++
      const reasons = Array.isArray(row.reasons) ? (row.reasons as Array<{ code?: unknown }>) : []
      const submittedAtMs = row.submittedAt.getTime()
      const bucket = submittedAtMs >= cutoff ? currentCounts : submittedAtMs >= priorCutoff ? priorCounts : null
      if (!bucket) continue
      for (const reason of reasons) {
        if (typeof reason?.code !== 'string') continue
        bucket.set(reason.code, (bucket.get(reason.code) ?? 0) + 1)
      }
    }

    const codes = new Set([...currentCounts.keys(), ...priorCounts.keys()])
    const byReason = [...codes].map((code) => ({
      code,
      currentWindowCount: currentCounts.get(code) ?? 0,
      priorWindowCount: priorCounts.get(code) ?? 0
    })).sort((a, b) => b.currentWindowCount - a.currentWindowCount)

    return { totalSubmissions, windowDays, byReason }
  }

  private gracePeriodDays() {
    const days = Number(process.env.ACCOUNT_DELETION_GRACE_PERIOD_DAYS || DEFAULT_GRACE_PERIOD_DAYS)
    return Math.max(1, Number.isFinite(days) ? days : DEFAULT_GRACE_PERIOD_DAYS)
  }

  private confirmationTtlMinutes() {
    const minutes = Number(process.env.ACCOUNT_DELETION_CONFIRMATION_TTL_MINUTES || DEFAULT_CONFIRMATION_TTL_MINUTES)
    return Math.max(1, Number.isFinite(minutes) ? minutes : DEFAULT_CONFIRMATION_TTL_MINUTES)
  }

  private webPublicUrl() {
    const configured = process.env.WEB_PUBLIC_URL?.trim()
    if (configured) return configured.replace(/\/$/, '')
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WEB_PUBLIC_URL is required in production')
    }
    return 'http://localhost:3000'
  }
}
