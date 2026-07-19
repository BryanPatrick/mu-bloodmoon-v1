-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `personalIdHash` VARCHAR(191) NULL,
    `role` ENUM('PLAYER', 'MODERATOR', 'GAME_MASTER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'PLAYER',
    `status` ENUM('ACTIVE', 'PENDING', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Account_username_key`(`username`),
    UNIQUE INDEX `Account_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountCurrency` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `AccountCurrency_accountId_currency_key`(`accountId`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountCharacter` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `className` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `reset` INTEGER NOT NULL DEFAULT 0,
    `masterReset` INTEGER NOT NULL DEFAULT 0,
    `map` VARCHAR(191) NOT NULL DEFAULT 'Lorencia',
    `guild` VARCHAR(191) NOT NULL DEFAULT '-',
    `pkStatus` VARCHAR(191) NOT NULL DEFAULT 'Commoner',
    `status` ENUM('ONLINE', 'OFFLINE', 'BLOCKED') NOT NULL DEFAULT 'OFFLINE',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AccountCharacter_key_key`(`key`),
    UNIQUE INDEX `AccountCharacter_name_key`(`name`),
    INDEX `AccountCharacter_accountId_idx`(`accountId`),
    INDEX `AccountCharacter_className_idx`(`className`),
    INDEX `AccountCharacter_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorUsername` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'info',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT 'general',
    `label` TEXT NOT NULL,
    `description` TEXT NULL,
    `value` JSON NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SiteSetting_key_key`(`key`),
    INDEX `SiteSetting_category_idx`(`category`),
    INDEX `SiteSetting_isPublic_idx`(`isPublic`),
    INDEX `SiteSetting_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferenceSource` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `baseUrl` VARCHAR(512) NOT NULL,
    `publisher` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReferenceSource_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeEntry` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `sourceKey` VARCHAR(191) NULL,
    `sourceUrl` TEXT NULL,
    `canonicalKey` VARCHAR(512) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `kind` ENUM('NEWS', 'PAGE', 'BANNER', 'DOWNLOAD', 'NAVIGATION', 'CHARACTER', 'EQUIPMENT', 'ITEM', 'MAP', 'MONSTER', 'DROP', 'SKILL', 'EVENT', 'QUEST', 'NPC', 'GUIDE', 'LORE', 'SYSTEM', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `scope` ENUM('SEASON_6', 'FUTURE_SEASON', 'ALL_SEASONS', 'OFF_TOPIC', 'NEEDS_REVIEW') NOT NULL DEFAULT 'NEEDS_REVIEW',
    `status` ENUM('RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'RAW',
    `seasonMin` INTEGER NULL,
    `seasonMax` INTEGER NULL,
    `summary` TEXT NULL,
    `rawData` JSON NULL,
    `normalizedData` JSON NULL,
    `duplicateOfId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KnowledgeEntry_canonicalKey_key`(`canonicalKey`),
    INDEX `KnowledgeEntry_kind_idx`(`kind`),
    INDEX `KnowledgeEntry_scope_idx`(`scope`),
    INDEX `KnowledgeEntry_status_idx`(`status`),
    INDEX `KnowledgeEntry_sourceKey_idx`(`sourceKey`),
    INDEX `KnowledgeEntry_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferenceAsset` (
    `id` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `sourceUrl` TEXT NULL,
    `localPath` VARCHAR(512) NOT NULL,
    `publicPath` VARCHAR(512) NULL,
    `kind` ENUM('IMAGE', 'HTML', 'TEXT', 'JSON', 'OTHER') NOT NULL DEFAULT 'IMAGE',
    `mimeType` VARCHAR(191) NULL,
    `sha1` VARCHAR(191) NULL,
    `bytes` INTEGER NULL,
    `status` ENUM('RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'RAW',
    `duplicateOfId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReferenceAsset_sha1_idx`(`sha1`),
    INDEX `ReferenceAsset_kind_idx`(`kind`),
    INDEX `ReferenceAsset_status_idx`(`status`),
    INDEX `ReferenceAsset_sourceId_idx`(`sourceId`),
    UNIQUE INDEX `ReferenceAsset_localPath_key`(`localPath`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KnowledgeEntryAsset` (
    `entryId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'reference',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `KnowledgeEntryAsset_assetId_idx`(`assetId`),
    PRIMARY KEY (`entryId`, `assetId`, `role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `name` TEXT NOT NULL,
    `title` TEXT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `categorySlug` VARCHAR(191) NOT NULL,
    `group` ENUM('SET', 'SET_PIECE', 'WEAPON', 'SHIELD', 'WING', 'ACCESSORY', 'PET', 'JEWEL', 'CONSUMABLE', 'MISC') NOT NULL DEFAULT 'MISC',
    `baseSetName` VARCHAR(191) NULL,
    `sourceUrl` TEXT NULL,
    `minSeason` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'REMASTER_PENDING', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'NORMALIZED',
    `rawData` JSON NULL,
    `remapData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EquipmentRecord_key_key`(`key`),
    INDEX `EquipmentRecord_categorySlug_idx`(`categorySlug`),
    INDEX `EquipmentRecord_group_idx`(`group`),
    INDEX `EquipmentRecord_minSeason_idx`(`minSeason`),
    INDEX `EquipmentRecord_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameCharacter` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `minSeason` INTEGER NOT NULL DEFAULT 1,
    `isSeasonSixBase` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GameCharacter_key_key`(`key`),
    INDEX `GameCharacter_sortOrder_idx`(`sortOrder`),
    INDEX `GameCharacter_minSeason_idx`(`minSeason`),
    INDEX `GameCharacter_isSeasonSixBase_idx`(`isSeasonSixBase`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameClass` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tier` INTEGER NOT NULL DEFAULT 1,
    `minSeason` INTEGER NOT NULL DEFAULT 1,
    `isSeasonSixBase` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GameClass_key_key`(`key`),
    INDEX `GameClass_characterId_idx`(`characterId`),
    INDEX `GameClass_tier_idx`(`tier`),
    INDEX `GameClass_minSeason_idx`(`minSeason`),
    INDEX `GameClass_isSeasonSixBase_idx`(`isSeasonSixBase`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentClassLink` (
    `equipmentId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `role` ENUM('BASE', 'PLAYABLE', 'TARGET') NOT NULL DEFAULT 'PLAYABLE',
    `source` VARCHAR(191) NOT NULL DEFAULT 'remap',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EquipmentClassLink_classId_idx`(`classId`),
    INDEX `EquipmentClassLink_characterId_idx`(`characterId`),
    INDEX `EquipmentClassLink_role_idx`(`role`),
    PRIMARY KEY (`equipmentId`, `classId`, `role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentSeason` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `season` INTEGER NOT NULL,
    `visibility` ENUM('SEASON_6', 'FUTURE_SEASON', 'ALL_SEASONS', 'OFF_TOPIC', 'NEEDS_REVIEW') NOT NULL DEFAULT 'NEEDS_REVIEW',
    `source` VARCHAR(191) NOT NULL DEFAULT 'remap',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentSeason_season_idx`(`season`),
    INDEX `EquipmentSeason_visibility_idx`(`visibility`),
    UNIQUE INDEX `EquipmentSeason_equipmentId_season_key`(`equipmentId`, `season`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentVariant` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `quality` ENUM('NORMAL', 'EXCELLENT', 'ANCIENT', 'SOCKET', 'MASTERY_ANCIENT', 'LUCKY') NOT NULL,
    `minSeason` INTEGER NOT NULL DEFAULT 1,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EquipmentVariant_quality_idx`(`quality`),
    INDEX `EquipmentVariant_minSeason_idx`(`minSeason`),
    UNIQUE INDEX `EquipmentVariant_equipmentId_quality_key`(`equipmentId`, `quality`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentPiece` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `slot` VARCHAR(191) NOT NULL,
    `imagePath` VARCHAR(191) NULL,
    `data` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `EquipmentPiece_equipmentId_idx`(`equipmentId`),
    INDEX `EquipmentPiece_slot_idx`(`slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentOption` (
    `id` VARCHAR(191) NOT NULL,
    `equipmentId` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `label` TEXT NOT NULL,
    `data` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `EquipmentOption_equipmentId_idx`(`equipmentId`),
    INDEX `EquipmentOption_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShopProduct` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `short` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `status` ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `stock` INTEGER NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShopProduct_key_key`(`key`),
    INDEX `ShopProduct_category_idx`(`category`),
    INDEX `ShopProduct_currency_idx`(`currency`),
    INDEX `ShopProduct_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RechargePackage` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `bonus` INTEGER NOT NULL DEFAULT 0,
    `price` VARCHAR(191) NOT NULL,
    `highlight` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RechargePackage_key_key`(`key`),
    INDEX `RechargePackage_currency_idx`(`currency`),
    INDEX `RechargePackage_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseIntent` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `status` ENUM('PREPARED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PREPARED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseIntent_accountId_idx`(`accountId`),
    INDEX `PurchaseIntent_productId_idx`(`productId`),
    INDEX `PurchaseIntent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RechargeIntent` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `bonus` INTEGER NOT NULL DEFAULT 0,
    `price` VARCHAR(191) NOT NULL,
    `status` ENUM('PREPARED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PREPARED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RechargeIntent_accountId_idx`(`accountId`),
    INDEX `RechargeIntent_packageId_idx`(`packageId`),
    INDEX `RechargeIntent_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerMarketListing` (
    `id` VARCHAR(191) NOT NULL,
    `sellerAccountId` VARCHAR(191) NOT NULL,
    `sellerCharacterId` VARCHAR(191) NULL,
    `gameItemRef` VARCHAR(255) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `itemCategory` VARCHAR(191) NOT NULL,
    `itemData` JSON NOT NULL,
    `price` INTEGER NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `status` ENUM('PENDING_LOCK', 'ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'PENDING_LOCK',
    `lockJobId` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `soldAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerMarketListing_sellerAccountId_idx`(`sellerAccountId`),
    INDEX `PlayerMarketListing_sellerCharacterId_idx`(`sellerCharacterId`),
    INDEX `PlayerMarketListing_currency_idx`(`currency`),
    INDEX `PlayerMarketListing_status_idx`(`status`),
    INDEX `PlayerMarketListing_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `PlayerMarketListing_gameItemRef_key`(`gameItemRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerMarketOrder` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `buyerAccountId` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `status` ENUM('PREPARED', 'PAID', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED') NOT NULL DEFAULT 'PREPARED',
    `paidAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerMarketOrder_listingId_idx`(`listingId`),
    INDEX `PlayerMarketOrder_buyerAccountId_idx`(`buyerAccountId`),
    INDEX `PlayerMarketOrder_currency_idx`(`currency`),
    INDEX `PlayerMarketOrder_status_idx`(`status`),
    INDEX `PlayerMarketOrder_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameBridgeJob` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `listingId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `operation` ENUM('LOCK_ITEM', 'RELEASE_ITEM', 'TRANSFER_ITEM', 'DELIVER_ITEM', 'CREDIT_CURRENCY', 'SYNC_INVENTORY') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `payload` JSON NOT NULL,
    `result` JSON NULL,
    `error` TEXT NULL,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GameBridgeJob_idempotencyKey_key`(`idempotencyKey`),
    INDEX `GameBridgeJob_accountId_idx`(`accountId`),
    INDEX `GameBridgeJob_listingId_idx`(`listingId`),
    INDEX `GameBridgeJob_orderId_idx`(`orderId`),
    INDEX `GameBridgeJob_operation_idx`(`operation`),
    INDEX `GameBridgeJob_status_idx`(`status`),
    INDEX `GameBridgeJob_availableAt_idx`(`availableAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccountCurrency` ADD CONSTRAINT `AccountCurrency_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccountCharacter` ADD CONSTRAINT `AccountCharacter_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEntry` ADD CONSTRAINT `KnowledgeEntry_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `ReferenceSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEntry` ADD CONSTRAINT `KnowledgeEntry_duplicateOfId_fkey` FOREIGN KEY (`duplicateOfId`) REFERENCES `KnowledgeEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceAsset` ADD CONSTRAINT `ReferenceAsset_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `ReferenceSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferenceAsset` ADD CONSTRAINT `ReferenceAsset_duplicateOfId_fkey` FOREIGN KEY (`duplicateOfId`) REFERENCES `ReferenceAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEntryAsset` ADD CONSTRAINT `KnowledgeEntryAsset_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `KnowledgeEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KnowledgeEntryAsset` ADD CONSTRAINT `KnowledgeEntryAsset_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `ReferenceAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameClass` ADD CONSTRAINT `GameClass_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `GameCharacter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentClassLink` ADD CONSTRAINT `EquipmentClassLink_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentClassLink` ADD CONSTRAINT `EquipmentClassLink_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `GameClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentClassLink` ADD CONSTRAINT `EquipmentClassLink_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `GameCharacter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentSeason` ADD CONSTRAINT `EquipmentSeason_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentVariant` ADD CONSTRAINT `EquipmentVariant_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentPiece` ADD CONSTRAINT `EquipmentPiece_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentOption` ADD CONSTRAINT `EquipmentOption_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `EquipmentRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseIntent` ADD CONSTRAINT `PurchaseIntent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseIntent` ADD CONSTRAINT `PurchaseIntent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `ShopProduct`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RechargeIntent` ADD CONSTRAINT `RechargeIntent_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RechargeIntent` ADD CONSTRAINT `RechargeIntent_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `RechargePackage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMarketListing` ADD CONSTRAINT `PlayerMarketListing_sellerAccountId_fkey` FOREIGN KEY (`sellerAccountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMarketListing` ADD CONSTRAINT `PlayerMarketListing_sellerCharacterId_fkey` FOREIGN KEY (`sellerCharacterId`) REFERENCES `AccountCharacter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMarketOrder` ADD CONSTRAINT `PlayerMarketOrder_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PlayerMarketListing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMarketOrder` ADD CONSTRAINT `PlayerMarketOrder_buyerAccountId_fkey` FOREIGN KEY (`buyerAccountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameBridgeJob` ADD CONSTRAINT `GameBridgeJob_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameBridgeJob` ADD CONSTRAINT `GameBridgeJob_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `PlayerMarketListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameBridgeJob` ADD CONSTRAINT `GameBridgeJob_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `PlayerMarketOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
