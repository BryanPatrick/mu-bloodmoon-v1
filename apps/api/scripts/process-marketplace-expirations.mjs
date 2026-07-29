import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const limit = Math.min(500, Math.max(1, Number.parseInt(process.env.MARKETPLACE_EXPIRATION_BATCH || '100', 10)))

async function expireListing(listing) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.playerMarketListing.updateMany({
      where: {
        id: listing.id,
        status: 'ACTIVE',
        expiresAt: { lte: new Date() }
      },
      data: {
        status: 'EXPIRED',
        moderationReason: 'Prazo do anuncio encerrado.'
      }
    })
    if (claimed.count !== 1) return

    await tx.marketplaceEscrow.update({
      where: { listingId: listing.id },
      data: {
        status: 'RETURN_PENDING',
        manualReviewReason: 'Anuncio expirado.'
      }
    })
    await tx.gameBridgeJob.upsert({
      where: { idempotencyKey: `market-expiration-return:${listing.id}` },
      create: {
        accountId: listing.sellerAccountId,
        listingId: listing.id,
        operation: 'RELEASE_ITEM',
        idempotencyKey: `market-expiration-return:${listing.id}`,
        payload: {
          listingId: listing.id,
          gameItemRef: listing.gameItemRef,
          reason: 'listing-expired'
        }
      },
      update: {}
    })
    await tx.operationalEvent.create({
      data: {
        module: 'marketplace',
        eventType: 'MARKETPLACE_LISTING_EXPIRED',
        entityType: 'PlayerMarketListing',
        entityId: listing.id,
        targetUserId: listing.sellerAccountId,
        description: `Anuncio ${listing.id} expirou e o item entrou na fila de devolucao.`,
        data: { gameItemRef: listing.gameItemRef }
      }
    })
  })
}

async function main() {
  const listings = await prisma.playerMarketListing.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: new Date() }
    },
    orderBy: { expiresAt: 'asc' },
    take: limit
  })
  for (const listing of listings) await expireListing(listing)
  console.log(`Expired marketplace listings processed: ${listings.length}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
