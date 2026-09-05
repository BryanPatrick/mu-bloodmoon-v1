import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { AlertDispatchService } from './alert-dispatch.service'
import { buildSafeAlertPayload } from './alert-payload'
import { alertCooldownMs, alertMinSeverity, alertSweepBatchSize, alertSweepIntervalMs, isAlertSweepEnabled, severityRank } from './alerting.env'

// Part 12/13/14 -- the actual outbound-alerting MVP. Deliberately a
// poller over the pre-existing SystemAlert table, not a hook inside
// ObservabilityService.ensureCriticalAlert(): SystemAlert rows are
// created from THREE independent places (ObservabilityService in the
// live API process, the standalone process-game-bridge-jobs.mjs cron
// script, and this phase's own /internal/ops-events ingest endpoint), and
// a poller reading the shared table catches all three uniformly, while an
// in-process hook could only ever reach one of them. Mirrors the existing
// OnModuleInit/setInterval/env-flag convention already used by
// GameProvisioningReconciliationService -- no new background-job
// infrastructure (no BullMQ/Redis) is introduced.
export interface AlertSweepResult {
  scanned: number
  notified: number
  skippedCooldown: number
  skippedBelowThreshold: number
  resolvedClosed: number
  errors: number
}

@Injectable()
export class AlertSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertSweepService.name)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: AlertDispatchService
  ) {}

  onModuleInit() {
    if (!isAlertSweepEnabled()) return
    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => this.logger.error(`Alert sweep tick failed: ${safeMessage(error)}`))
    }, alertSweepIntervalMs())
    this.timer.unref?.()
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async runOnce(): Promise<AlertSweepResult> {
    const result: AlertSweepResult = {
      scanned: 0,
      notified: 0,
      skippedCooldown: 0,
      skippedBelowThreshold: 0,
      resolvedClosed: 0,
      errors: 0
    }

    result.resolvedClosed = await this.closeResolvedAlerts()

    const minRank = severityRank(alertMinSeverity())
    const candidates = await this.prisma.systemAlert.findMany({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      orderBy: { createdAt: 'asc' },
      take: alertSweepBatchSize()
    })
    result.scanned = candidates.length

    for (const alert of candidates) {
      try {
        if (severityRank(alert.severity) < minRank) {
          result.skippedBelowThreshold += 1
          continue
        }

        const now = new Date()
        const state = await this.prisma.alertDispatchState.upsert({
          where: { systemAlertId: alert.id },
          create: { systemAlertId: alert.id, firstSeenAt: now, lastSeenAt: now },
          update: { lastSeenAt: now }
        })

        const cooldownElapsed = !state.lastNotifiedAt || now.getTime() - state.lastNotifiedAt.getTime() >= alertCooldownMs()
        if (!cooldownElapsed) {
          result.skippedCooldown += 1
          continue
        }

        const payload = buildSafeAlertPayload(alert, state)
        const channelResults = await this.dispatch.dispatch(payload)
        if (channelResults.length === 0) {
          // No channel configured -- nothing to send, nothing to record as
          // "notified." State (firstSeenAt/lastSeenAt) still tracked above.
          continue
        }

        const anySucceeded = channelResults.some((entry) => entry.ok)
        const firstError = channelResults.find((entry) => !entry.ok)?.error
        await this.prisma.alertDispatchState.update({
          where: { id: state.id },
          data: {
            lastNotifiedAt: anySucceeded ? now : state.lastNotifiedAt,
            notificationCount: anySucceeded ? { increment: 1 } : undefined,
            lastNotifyError: firstError ?? null
          }
        })
        if (anySucceeded) result.notified += 1
        else result.errors += 1
      } catch (error) {
        result.errors += 1
        this.logger.error(`Failed to process alert ${alert.id}: ${safeMessage(error)}`)
      }
    }

    return result
  }

  // Part 14's "resolved state where practical" -- once staff Acknowledge
  // then Resolve/Ignore an alert via the existing /admin/alerts flow, stop
  // tracking it here too so it's excluded from future dedupe queries by
  // construction (it's already excluded from the OPEN/ACKNOWLEDGED query
  // above; this just closes out the bookkeeping row for a clean record).
  private async closeResolvedAlerts(): Promise<number> {
    const result = await this.prisma.alertDispatchState.updateMany({
      where: {
        resolvedAt: null,
        systemAlert: { status: { in: ['RESOLVED', 'IGNORED'] } }
      },
      data: { resolvedAt: new Date() }
    })
    return result.count
  }
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
