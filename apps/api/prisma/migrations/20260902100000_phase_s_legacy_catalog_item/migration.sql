-- CreateTable
CREATE TABLE `LegacyCatalogItem` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('XSHOP', 'CASHSHOP') NOT NULL,
    `legacyKey` VARCHAR(191) NOT NULL,
    `itemName` VARCHAR(191) NOT NULL,
    `technicalIdentifiers` JSON NOT NULL,
    `bryanDecision` ENUM('NOT_FOR_COMMERCIAL_SALE', 'BALANCE_TEST_REQUIRED', 'DEAD_UNRESOLVABLE_CATALOG_ROW', 'RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST', 'GREEN_CANDIDATE_NOT_APPROVED') NOT NULL,
    `commercialStatus` ENUM('REVIEW_REQUIRED', 'BLOCKED', 'APPROVED', 'PUBLISHED', 'DISABLED', 'RETIRED') NOT NULL DEFAULT 'REVIEW_REQUIRED',
    `visible` BOOLEAN NOT NULL DEFAULT false,
    `purchasable` BOOLEAN NOT NULL DEFAULT false,
    `priceDesired` INTEGER NULL,
    `currencyDesired` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NULL,
    `durationDesiredDays` INTEGER NULL,
    `availableFrom` DATETIME(3) NULL,
    `availableUntil` DATETIME(3) NULL,
    `openBetaAllowed` BOOLEAN NOT NULL DEFAULT false,
    `fullReleaseAllowed` BOOLEAN NOT NULL DEFAULT false,
    `purchaseLimitDesired` INTEGER NULL,
    `internalNotes` TEXT NULL,
    `blockReason` TEXT NULL,
    `linkedShopProductId` VARCHAR(191) NULL,
    `driftStatus` ENUM('NOT_CHECKED', 'IN_SYNC', 'DRIFT_DETECTED', 'CHECK_FAILED') NOT NULL DEFAULT 'NOT_CHECKED',
    `effectiveStateSnapshot` JSON NULL,
    `effectiveStateCheckedAt` DATETIME(3) NULL,
    `effectiveStateCheckedBy` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LegacyCatalogItem_channel_commercialStatus_idx`(`channel`, `commercialStatus`),
    INDEX `LegacyCatalogItem_bryanDecision_idx`(`bryanDecision`),
    INDEX `LegacyCatalogItem_linkedShopProductId_idx`(`linkedShopProductId`),
    UNIQUE INDEX `LegacyCatalogItem_channel_legacyKey_key`(`channel`, `legacyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LegacyCatalogItem` ADD CONSTRAINT `LegacyCatalogItem_linkedShopProductId_fkey` FOREIGN KEY (`linkedShopProductId`) REFERENCES `ShopProduct`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
