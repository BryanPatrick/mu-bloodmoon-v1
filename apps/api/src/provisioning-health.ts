import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { PrismaService } from './database/prisma.service'

// Security hardening Part U -- a reusable, safe, read-only Portal-side
// provisioning health check. Same standalone application-context pattern
// as reconcile.ts/migrate-two-factor-keys.ts: runs inside the app's own
// environment (cPanel's "Run JS script", a cron job, or locally against
// bloodmoon_local_claude), so it never needs a separate credential.
//
// Reports counts and ages only -- no account id, email, username, or any
// PII, and never a secret/credential/ciphertext value. Prints one JSON
// object to stdout so it composes with other tooling (e.g.
// bm-provisioning-health.ps1, which adds the Cloudflare/MU-SQL side that
// only exists as local, already-authenticated tooling).
const logger = new Logger('ProvisioningHealth')

const PENDING_TOO_LONG_MS = 10 * 60_000 // 10 minutes with zero dispatch attempt
const PROVISIONING_TOO_LONG_MS = 15 * 60_000 // 15 minutes still in-flight
const MAX_AUTOMATIC_ATTEMPTS = 8 // must match game-provisioning-reconciliation.service.ts

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  try {
    const prisma = app.get(PrismaService)
    const now = Date.now()

    const [byStatus, pendingRows, provisioningRows, failedRows, attemptTotals, latestHeartbeatAttempt] =
      await Promise.all([
        prisma.gameAccountIdentity.groupBy({ by: ['provisioningStatus'], _count: true }),
        prisma.gameAccountIdentity.findMany({
          where: { provisioningStatus: 'PENDING' },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }),
        prisma.gameAccountIdentity.findMany({
          where: { provisioningStatus: 'PROVISIONING' },
          select: { lastAttemptAt: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }),
        prisma.gameAccountIdentity.findMany({
          where: { provisioningStatus: 'FAILED' },
          select: { accountId: true, provisioningRequestId: true, lastErrorCode: true, lastAttemptAt: true }
        }),
        prisma.gameProvisioningAttempt.groupBy({ by: ['outcome'], _count: true }),
        prisma.gameProvisioningAttempt.findFirst({ orderBy: { attemptedAt: 'desc' }, select: { attemptedAt: true } })
      ])

    const statusCounts: Record<string, number> = {}
    for (const row of byStatus) statusCounts[row.provisioningStatus] = row._count

    const oldestPendingAgeMs = pendingRows[0] ? now - pendingRows[0].createdAt.getTime() : null
    const oldestProvisioningAgeMs = provisioningRows[0]
      ? now - (provisioningRows[0].lastAttemptAt ?? provisioningRows[0].createdAt).getTime()
      : null

    // Part T -- stuck-account detection. Every entry here is a count, not
    // an identity list; operators pivot to /admin/game-provisioning (which
    // has real RBAC) for the actual account-level view.
    const stuck = {
      PENDING_TOO_LONG: oldestPendingAgeMs !== null && oldestPendingAgeMs > PENDING_TOO_LONG_MS,
      PROVISIONING_TOO_LONG: oldestProvisioningAgeMs !== null && oldestProvisioningAgeMs > PROVISIONING_TOO_LONG_MS,
      FAILED_RETRYABLE_EXHAUSTED: 0
    }

    let exhaustedFailedCount = 0
    for (const row of failedRows) {
      const attempts = await prisma.gameProvisioningAttempt.count({
        where: { provisioningRequestId: row.provisioningRequestId }
      })
      if (attempts >= MAX_AUTOMATIC_ATTEMPTS) exhaustedFailedCount++
    }
    stuck.FAILED_RETRYABLE_EXHAUSTED = exhaustedFailedCount

    const attemptOutcomeCounts: Record<string, number> = {}
    for (const row of attemptTotals) attemptOutcomeCounts[row.outcome] = row._count

    const reconciliationRunnerLastSeenAgeMs = latestHeartbeatAttempt
      ? now - latestHeartbeatAttempt.attemptedAt.getTime()
      : null

    const report = {
      generatedAt: new Date(now).toISOString(),
      featureFlag: {
        // Presence only -- never the value, and this isn't a secret anyway
        // (it's "true"/unset), but keeping the same discipline throughout.
        provisioningOnRegisterConfigured: process.env.GAME_ACCOUNT_PROVISIONING_ON_REGISTER === 'true',
        reconciliationWorkerEnabled: process.env.GAME_PROVISIONING_RECONCILIATION_ENABLED === 'true'
      },
      provisioningStatusCounts: {
        PENDING: statusCounts.PENDING ?? 0,
        PROVISIONING: statusCounts.PROVISIONING ?? 0,
        ACTIVE: statusCounts.ACTIVE ?? 0,
        FAILED: statusCounts.FAILED ?? 0
      },
      oldestPendingAgeSeconds: oldestPendingAgeMs !== null ? Math.round(oldestPendingAgeMs / 1000) : null,
      oldestProvisioningAgeSeconds:
        oldestProvisioningAgeMs !== null ? Math.round(oldestProvisioningAgeMs / 1000) : null,
      stuck,
      attemptOutcomeCounts,
      reconciliationRunner: {
        lastAttemptAgeSeconds:
          reconciliationRunnerLastSeenAgeMs !== null ? Math.round(reconciliationRunnerLastSeenAgeMs / 1000) : null,
        // A runner that hasn't recorded any attempt in 5 minutes while
        // PENDING/FAILED work exists is itself a health signal.
        appearsStale:
          reconciliationRunnerLastSeenAgeMs !== null &&
          reconciliationRunnerLastSeenAgeMs > 5 * 60_000 &&
          (statusCounts.PENDING ?? 0) + (statusCounts.FAILED ?? 0) > 0
      }
    }

    // Single-line JSON on stdout -- easy to pipe/parse; human-readable
    // summary on stderr via the logger so both use cases work without
    // needing a flag.
    process.stdout.write(JSON.stringify(report) + '\n')
    logger.log(
      `PENDING=${report.provisioningStatusCounts.PENDING} PROVISIONING=${report.provisioningStatusCounts.PROVISIONING} ` +
        `ACTIVE=${report.provisioningStatusCounts.ACTIVE} FAILED=${report.provisioningStatusCounts.FAILED} ` +
        `oldestPendingAge=${report.oldestPendingAgeSeconds ?? 'n/a'}s stuck=${JSON.stringify(stuck)}`
    )
  } finally {
    await app.close()
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  logger.error(`Provisioning health check failed: ${message.slice(0, 191)}`)
  process.exitCode = 1
})
