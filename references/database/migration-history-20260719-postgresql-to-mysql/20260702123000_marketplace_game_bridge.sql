CREATE TYPE "MarketplaceListingStatus" AS ENUM ('PENDING_LOCK', 'ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED', 'FAILED');
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('PREPARED', 'PAID', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED');
CREATE TYPE "GameBridgeOperation" AS ENUM ('LOCK_ITEM', 'RELEASE_ITEM', 'TRANSFER_ITEM', 'DELIVER_ITEM', 'CREDIT_CURRENCY', 'SYNC_INVENTORY');
CREATE TYPE "GameBridgeStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "PlayerMarketListing" (
  "id" TEXT NOT NULL,
  "sellerAccountId" TEXT NOT NULL,
  "sellerCharacterId" TEXT,
  "gameItemRef" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "itemCategory" TEXT NOT NULL,
  "itemData" JSONB NOT NULL,
  "price" INTEGER NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'PENDING_LOCK',
  "lockJobId" TEXT,
  "lockedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "soldAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerMarketListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerMarketOrder" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerAccountId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PREPARED',
  "paidAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerMarketOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameBridgeJob" (
  "id" TEXT NOT NULL,
  "accountId" TEXT,
  "listingId" TEXT,
  "orderId" TEXT,
  "operation" "GameBridgeOperation" NOT NULL,
  "status" "GameBridgeStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameBridgeJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerMarketListing_gameItemRef_key" ON "PlayerMarketListing"("gameItemRef");
CREATE INDEX "PlayerMarketListing_sellerAccountId_idx" ON "PlayerMarketListing"("sellerAccountId");
CREATE INDEX "PlayerMarketListing_sellerCharacterId_idx" ON "PlayerMarketListing"("sellerCharacterId");
CREATE INDEX "PlayerMarketListing_currency_idx" ON "PlayerMarketListing"("currency");
CREATE INDEX "PlayerMarketListing_status_idx" ON "PlayerMarketListing"("status");
CREATE INDEX "PlayerMarketListing_createdAt_idx" ON "PlayerMarketListing"("createdAt");

CREATE INDEX "PlayerMarketOrder_listingId_idx" ON "PlayerMarketOrder"("listingId");
CREATE INDEX "PlayerMarketOrder_buyerAccountId_idx" ON "PlayerMarketOrder"("buyerAccountId");
CREATE INDEX "PlayerMarketOrder_currency_idx" ON "PlayerMarketOrder"("currency");
CREATE INDEX "PlayerMarketOrder_status_idx" ON "PlayerMarketOrder"("status");
CREATE INDEX "PlayerMarketOrder_createdAt_idx" ON "PlayerMarketOrder"("createdAt");

CREATE UNIQUE INDEX "GameBridgeJob_idempotencyKey_key" ON "GameBridgeJob"("idempotencyKey");
CREATE INDEX "GameBridgeJob_accountId_idx" ON "GameBridgeJob"("accountId");
CREATE INDEX "GameBridgeJob_listingId_idx" ON "GameBridgeJob"("listingId");
CREATE INDEX "GameBridgeJob_orderId_idx" ON "GameBridgeJob"("orderId");
CREATE INDEX "GameBridgeJob_operation_idx" ON "GameBridgeJob"("operation");
CREATE INDEX "GameBridgeJob_status_idx" ON "GameBridgeJob"("status");
CREATE INDEX "GameBridgeJob_availableAt_idx" ON "GameBridgeJob"("availableAt");

ALTER TABLE "PlayerMarketListing" ADD CONSTRAINT "PlayerMarketListing_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerMarketListing" ADD CONSTRAINT "PlayerMarketListing_sellerCharacterId_fkey" FOREIGN KEY ("sellerCharacterId") REFERENCES "AccountCharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerMarketOrder" ADD CONSTRAINT "PlayerMarketOrder_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "PlayerMarketListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerMarketOrder" ADD CONSTRAINT "PlayerMarketOrder_buyerAccountId_fkey" FOREIGN KEY ("buyerAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameBridgeJob" ADD CONSTRAINT "GameBridgeJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameBridgeJob" ADD CONSTRAINT "GameBridgeJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "PlayerMarketListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameBridgeJob" ADD CONSTRAINT "GameBridgeJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PlayerMarketOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
