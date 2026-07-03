import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const enabled = process.env.MU_BRIDGE_ENABLED === 'true'
const limit = Number.parseInt(process.env.MU_BRIDGE_WORKER_CONCURRENCY || '1', 10)

const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

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
    await prisma.gameBridgeJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown worker error',
        processedAt: new Date()
      }
    })
  }
}

async function main() {
  const jobs = await prisma.gameBridgeJob.findMany({
    where: {
      status: 'PENDING',
      availableAt: { lte: new Date() }
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
