CREATE TYPE "ShopProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');
CREATE TYPE "PurchaseIntentStatus" AS ENUM ('PREPARED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RechargeIntentStatus" AS ENUM ('PREPARED', 'PAID', 'CANCELLED');

CREATE TABLE "ShopProduct" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "short" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0,
  "currency" "CurrencyCode" NOT NULL,
  "status" "ShopProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "stock" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargePackage" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "amount" INTEGER NOT NULL,
  "bonus" INTEGER NOT NULL DEFAULT 0,
  "price" TEXT NOT NULL,
  "highlight" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RechargePackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseIntent" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "status" "PurchaseIntentStatus" NOT NULL DEFAULT 'PREPARED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchaseIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RechargeIntent" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "currency" "CurrencyCode" NOT NULL,
  "amount" INTEGER NOT NULL,
  "bonus" INTEGER NOT NULL DEFAULT 0,
  "price" TEXT NOT NULL,
  "status" "RechargeIntentStatus" NOT NULL DEFAULT 'PREPARED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RechargeIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopProduct_key_key" ON "ShopProduct"("key");
CREATE INDEX "ShopProduct_category_idx" ON "ShopProduct"("category");
CREATE INDEX "ShopProduct_currency_idx" ON "ShopProduct"("currency");
CREATE INDEX "ShopProduct_status_idx" ON "ShopProduct"("status");

CREATE UNIQUE INDEX "RechargePackage_key_key" ON "RechargePackage"("key");
CREATE INDEX "RechargePackage_currency_idx" ON "RechargePackage"("currency");
CREATE INDEX "RechargePackage_active_idx" ON "RechargePackage"("active");

CREATE INDEX "PurchaseIntent_accountId_idx" ON "PurchaseIntent"("accountId");
CREATE INDEX "PurchaseIntent_productId_idx" ON "PurchaseIntent"("productId");
CREATE INDEX "PurchaseIntent_status_idx" ON "PurchaseIntent"("status");

CREATE INDEX "RechargeIntent_accountId_idx" ON "RechargeIntent"("accountId");
CREATE INDEX "RechargeIntent_packageId_idx" ON "RechargeIntent"("packageId");
CREATE INDEX "RechargeIntent_status_idx" ON "RechargeIntent"("status");

ALTER TABLE "PurchaseIntent" ADD CONSTRAINT "PurchaseIntent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseIntent" ADD CONSTRAINT "PurchaseIntent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RechargeIntent" ADD CONSTRAINT "RechargeIntent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RechargeIntent" ADD CONSTRAINT "RechargeIntent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "RechargePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
