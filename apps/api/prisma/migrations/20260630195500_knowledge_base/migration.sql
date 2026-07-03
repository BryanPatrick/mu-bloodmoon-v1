-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'MODERATOR', 'GAME_MASTER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT');

-- CreateEnum
CREATE TYPE "KnowledgeEntryKind" AS ENUM ('CHARACTER', 'EQUIPMENT', 'ITEM', 'MAP', 'MONSTER', 'DROP', 'SKILL', 'EVENT', 'QUEST', 'NPC', 'GUIDE', 'LORE', 'SYSTEM', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "KnowledgeScope" AS ENUM ('SEASON_6', 'FUTURE_SEASON', 'ALL_SEASONS', 'OFF_TOPIC', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ReferenceAssetKind" AS ENUM ('IMAGE', 'HTML', 'TEXT', 'JSON', 'OTHER');

-- CreateEnum
CREATE TYPE "EditorialStatus" AS ENUM ('RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EquipmentGroup" AS ENUM ('SET', 'SET_PIECE', 'WEAPON', 'SHIELD', 'WING', 'ACCESSORY', 'PET', 'JEWEL', 'CONSUMABLE', 'MISC');

-- CreateEnum
CREATE TYPE "EquipmentQuality" AS ENUM ('NORMAL', 'EXCELLENT', 'ANCIENT', 'SOCKET', 'MASTERY_ANCIENT', 'LUCKY');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "personalIdHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountCurrency" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" "CurrencyCode" NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccountCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorUsername" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "publisher" TEXT,
    "language" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceKey" TEXT,
    "sourceUrl" TEXT,
    "canonicalKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "KnowledgeEntryKind" NOT NULL DEFAULT 'UNKNOWN',
    "scope" "KnowledgeScope" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "status" "EditorialStatus" NOT NULL DEFAULT 'RAW',
    "seasonMin" INTEGER,
    "seasonMax" INTEGER,
    "summary" TEXT,
    "rawData" JSONB,
    "normalizedData" JSONB,
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceAsset" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "localPath" TEXT NOT NULL,
    "publicPath" TEXT,
    "kind" "ReferenceAssetKind" NOT NULL DEFAULT 'IMAGE',
    "mimeType" TEXT,
    "sha1" TEXT,
    "bytes" INTEGER,
    "status" "EditorialStatus" NOT NULL DEFAULT 'RAW',
    "duplicateOfId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntryAsset" (
    "entryId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reference',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KnowledgeEntryAsset_pkey" PRIMARY KEY ("entryId","assetId","role")
);

-- CreateTable
CREATE TABLE "EquipmentRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "group" "EquipmentGroup" NOT NULL DEFAULT 'MISC',
    "baseSetName" TEXT,
    "sourceUrl" TEXT,
    "minSeason" INTEGER NOT NULL DEFAULT 1,
    "status" "EditorialStatus" NOT NULL DEFAULT 'NORMALIZED',
    "rawData" JSONB,
    "remapData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentVariant" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quality" "EquipmentQuality" NOT NULL,
    "minSeason" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentPiece" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "imagePath" TEXT,
    "data" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EquipmentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentOption" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EquipmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCurrency_accountId_currency_key" ON "AccountCurrency"("accountId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSource_key_key" ON "ReferenceSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEntry_canonicalKey_key" ON "KnowledgeEntry"("canonicalKey");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_kind_idx" ON "KnowledgeEntry"("kind");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_scope_idx" ON "KnowledgeEntry"("scope");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_status_idx" ON "KnowledgeEntry"("status");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_sourceKey_idx" ON "KnowledgeEntry"("sourceKey");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_slug_idx" ON "KnowledgeEntry"("slug");

-- CreateIndex
CREATE INDEX "ReferenceAsset_sha1_idx" ON "ReferenceAsset"("sha1");

-- CreateIndex
CREATE INDEX "ReferenceAsset_kind_idx" ON "ReferenceAsset"("kind");

-- CreateIndex
CREATE INDEX "ReferenceAsset_status_idx" ON "ReferenceAsset"("status");

-- CreateIndex
CREATE INDEX "ReferenceAsset_sourceId_idx" ON "ReferenceAsset"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceAsset_localPath_key" ON "ReferenceAsset"("localPath");

-- CreateIndex
CREATE INDEX "KnowledgeEntryAsset_assetId_idx" ON "KnowledgeEntryAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentRecord_key_key" ON "EquipmentRecord"("key");

-- CreateIndex
CREATE INDEX "EquipmentRecord_categorySlug_idx" ON "EquipmentRecord"("categorySlug");

-- CreateIndex
CREATE INDEX "EquipmentRecord_group_idx" ON "EquipmentRecord"("group");

-- CreateIndex
CREATE INDEX "EquipmentRecord_minSeason_idx" ON "EquipmentRecord"("minSeason");

-- CreateIndex
CREATE INDEX "EquipmentRecord_status_idx" ON "EquipmentRecord"("status");

-- CreateIndex
CREATE INDEX "EquipmentVariant_quality_idx" ON "EquipmentVariant"("quality");

-- CreateIndex
CREATE INDEX "EquipmentVariant_minSeason_idx" ON "EquipmentVariant"("minSeason");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentVariant_equipmentId_quality_key" ON "EquipmentVariant"("equipmentId", "quality");

-- CreateIndex
CREATE INDEX "EquipmentPiece_equipmentId_idx" ON "EquipmentPiece"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentPiece_slot_idx" ON "EquipmentPiece"("slot");

-- CreateIndex
CREATE INDEX "EquipmentOption_equipmentId_idx" ON "EquipmentOption"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentOption_scope_idx" ON "EquipmentOption"("scope");

-- AddForeignKey
ALTER TABLE "AccountCurrency" ADD CONSTRAINT "AccountCurrency_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReferenceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntry" ADD CONSTRAINT "KnowledgeEntry_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "KnowledgeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceAsset" ADD CONSTRAINT "ReferenceAsset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ReferenceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceAsset" ADD CONSTRAINT "ReferenceAsset_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "ReferenceAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntryAsset" ADD CONSTRAINT "KnowledgeEntryAsset_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "KnowledgeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntryAsset" ADD CONSTRAINT "KnowledgeEntryAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ReferenceAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentVariant" ADD CONSTRAINT "EquipmentVariant_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPiece" ADD CONSTRAINT "EquipmentPiece_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentOption" ADD CONSTRAINT "EquipmentOption_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

