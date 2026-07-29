import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()
const enabled = process.env.MU_BRIDGE_ENABLED === 'true'
const limit = Number.parseInt(process.env.MU_BRIDGE_WORKER_CONCURRENCY || '1', 10)

const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

const errorCodeByOperation = {
  LOCK_ITEM: 'MARKETPLACE_ESCROW_LOCK_FAILED',
  RELEASE_ITEM: 'MARKETPLACE_ITEM_RETURN_FAILED',
  TRANSFER_ITEM: 'MARKETPLACE_DELIVERY_FAILED',
  CREDIT_CURRENCY: 'MARKETPLACE_SELLER_CREDIT_FAILED'
}

async function recordFailure(job, message) {
  const errorCode = errorCodeByOperation[job.operation] || 'MARKETPLACE_INTEGRATION_FAILED'
  const severity = job.operation === 'RELEASE_ITEM' ? 'CRITICAL' : 'ERROR'
  const correlationId = job.order?.correlationId || null
  const fingerprint = createHash('sha256')
    .update(`marketplace|${errorCode}|${job.operation}`)
    .digest('hex')

  const error = await prisma.systemError.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      module: 'marketplace',
      severity,
      errorCode,
      publicMessage: 'Uma operacao do marketplace precisa de revisao manual.',
      internalMessage: message,
      correlationId,
      accountId: job.accountId,
      entityType: 'GameBridgeJob',
      entityId: job.id,
      environment: process.env.NODE_ENV || 'production',
      metadata: {
        operation: job.operation,
        listingId: job.listingId,
        orderId: job.orderId
      },
      occurrences: {
        create: {
          correlationId,
          userId: job.accountId,
          metadata: { operation: job.operation, jobId: job.id }
        }
      }
    },
    update: {
      severity,
      internalMessage: message,
      correlationId,
      accountId: job.accountId,
      entityId: job.id,
      occurrenceCount: { increment: 1 },
      lastOccurredAt: new Date(),
      status: 'REOPENED',
      occurrences: {
        create: {
          correlationId,
          userId: job.accountId,
          metadata: { operation: job.operation, jobId: job.id }
        }
      }
    }
  })

  await prisma.operationalEvent.create({
    data: {
      module: 'marketplace',
      eventType: errorCode,
      severity,
      entityType: 'GameBridgeJob',
      entityId: job.id,
      targetUserId: job.accountId,
      correlationId,
      description: `Falha no job ${job.operation}.`,
      data: { listingId: job.listingId, orderId: job.orderId }
    }
  })

  if (severity === 'CRITICAL') {
    const existingAlert = await prisma.systemAlert.findFirst({
      where: {
        sourceType: 'SystemError',
        sourceId: error.id,
        status: { in: ['OPEN', 'ACKNOWLEDGED'] }
      }
    })
    if (!existingAlert) {
      await prisma.systemAlert.create({
        data: {
          module: 'marketplace',
          alertType: 'ESCROW_RETURN_FAILURE',
          severity: 'CRITICAL',
          title: 'Falha critica na devolucao de item',
          message: 'Um item do marketplace nao retornou ao vendedor.',
          sourceType: 'SystemError',
          sourceId: error.id,
          correlationId,
          metadata: { jobId: job.id, listingId: job.listingId }
        }
      })
    }
  }
}

async function processJob(job) {
  if (terminalStatuses.has(job.status)) {
    return
  }

  if (!enabled) {
    console.log(`[dry-run] ${job.operation} ${job.id} ${job.idempotencyKey}`)
    return
  }

  await prisma.gameBridgeJob.update({
    where: { id: job.id },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 }
    }
  })

  try {
    // Production hook:
    // 1. connect to the MU game database/server;
    // 2. validate the item/account/character;
    // 3. apply LOCK_ITEM, RELEASE_ITEM, TRANSFER_ITEM, DELIVER_ITEM or CREDIT_CURRENCY;
    // 4. return a deterministic result using the idempotencyKey.
    throw new Error('MU bridge worker is not connected to the game database yet.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error'
    await prisma.gameBridgeJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: message,
        processedAt: new Date()
      }
    })
    await recordFailure(job, message)
  }
}

async function main() {
  const jobs = await prisma.gameBridgeJob.findMany({
    where: {
      status: 'PENDING',
      availableAt: { lte: new Date() }
    },
    include: {
      order: { select: { correlationId: true } }
    },
    orderBy: [{ createdAt: 'asc' }],
    take: Number.isFinite(limit) && limit > 0 ? limit : 1
  })

  if (!jobs.length) {
    console.log('No pending GameBridgeJob rows.')
    return
  }

  for (const job of jobs) {
    await processJob(job)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
