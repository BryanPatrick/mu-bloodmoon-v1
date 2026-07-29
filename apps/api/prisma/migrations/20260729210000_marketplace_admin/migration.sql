ALTER TABLE `PlayerMarketListing`
  MODIFY `status` ENUM(
    'PENDING_LOCK','CANCELLED',
    'DRAFT','ESCROW_PENDING','ACTIVE','RESERVED','SOLD','CANCELED',
    'EXPIRED','SUSPENDED','RETURN_PENDING','RETURNED','MANUAL_REVIEW','FAILED'
  ) NOT NULL DEFAULT 'PENDING_LOCK',
  ADD COLUMN `adminNotes` TEXT NULL,
  ADD COLUMN `moderationReason` TEXT NULL,
  ADD COLUMN `suspendedBy` VARCHAR(191) NULL,
  ADD COLUMN `suspendedAt` DATETIME(3) NULL,
  ADD COLUMN `returnedAt` DATETIME(3) NULL;

UPDATE `PlayerMarketListing`
SET `status` = 'ESCROW_PENDING'
WHERE `status` = 'PENDING_LOCK';

UPDATE `PlayerMarketListing`
SET `status` = 'CANCELED'
WHERE `status` = 'CANCELLED';

ALTER TABLE `PlayerMarketListing`
  MODIFY `status` ENUM(
    'DRAFT','ESCROW_PENDING','ACTIVE','RESERVED','SOLD','CANCELED',
    'EXPIRED','SUSPENDED','RETURN_PENDING','RETURNED','MANUAL_REVIEW','FAILED'
  ) NOT NULL DEFAULT 'ESCROW_PENDING';

ALTER TABLE `PlayerMarketOrder`
  ADD COLUMN `fee` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `sellerAmount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `correlationId` VARCHAR(80) NULL;

UPDATE `PlayerMarketOrder`
SET `correlationId` = CONCAT('legacy-market-order-', `id`),
    `sellerAmount` = `price`
WHERE `correlationId` IS NULL;

ALTER TABLE `PlayerMarketOrder`
  MODIFY `correlationId` VARCHAR(80) NOT NULL,
  ADD UNIQUE INDEX `PlayerMarketOrder_correlationId_key`(`correlationId`);

CREATE TABLE `MarketplaceEscrow` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  `gameItemRef` VARCHAR(255) NOT NULL,
  `itemSerial` VARCHAR(191) NULL,
  `originalOwnerId` VARCHAR(191) NOT NULL,
  `buyerAccountId` VARCHAR(191) NULL,
  `status` ENUM(
    'ENTRY_PENDING','HELD','TRANSFER_PENDING','RETURN_PENDING',
    'RELEASED_TO_BUYER','RETURNED_TO_SELLER','FROZEN','MANUAL_REVIEW','FAILED'
  ) NOT NULL DEFAULT 'ENTRY_PENDING',
  `location` VARCHAR(100) NOT NULL DEFAULT 'GAME_INVENTORY',
  `internalHash` VARCHAR(191) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `enteredAt` DATETIME(3) NULL,
  `exitedAt` DATETIME(3) NULL,
  `frozenAt` DATETIME(3) NULL,
  `frozenBy` VARCHAR(191) NULL,
  `manualReviewReason` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MarketplaceEscrow_listingId_key`(`listingId`),
  UNIQUE INDEX `MarketplaceEscrow_internalHash_key`(`internalHash`),
  INDEX `MarketplaceEscrow_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `MarketplaceEscrow_originalOwnerId_status_idx`(`originalOwnerId`, `status`),
  INDEX `MarketplaceEscrow_buyerAccountId_status_idx`(`buyerAccountId`, `status`),
  INDEX `MarketplaceEscrow_itemSerial_idx`(`itemSerial`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketplaceReport` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NULL,
  `orderId` VARCHAR(191) NULL,
  `reporterId` VARCHAR(191) NOT NULL,
  `reportedUserId` VARCHAR(191) NULL,
  `reason` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `evidence` JSON NULL,
  `status` ENUM(
    'NEW','ASSIGNED','INVESTIGATING','WAITING_FOR_USER',
    'RESOLVED','REJECTED','ESCALATED'
  ) NOT NULL DEFAULT 'NEW',
  `assignedTo` VARCHAR(191) NULL,
  `resolution` TEXT NULL,
  `decisionReason` TEXT NULL,
  `resolvedBy` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MarketplaceReport_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `MarketplaceReport_assignedTo_status_idx`(`assignedTo`, `status`),
  INDEX `MarketplaceReport_listingId_idx`(`listingId`),
  INDEX `MarketplaceReport_orderId_idx`(`orderId`),
  INDEX `MarketplaceReport_reportedUserId_status_idx`(`reportedUserId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketplaceTask` (
  `id` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NULL,
  `orderId` VARCHAR(191) NULL,
  `reportId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `type` VARCHAR(100) NOT NULL,
  `status` ENUM('PENDING','IN_PROGRESS','BLOCKED','DONE','CANCELED') NOT NULL DEFAULT 'PENDING',
  `priority` VARCHAR(40) NOT NULL DEFAULT 'MEDIUM',
  `assigneeId` VARCHAR(191) NULL,
  `dueAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `updatedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MarketplaceTask_status_assigneeId_idx`(`status`, `assigneeId`),
  INDEX `MarketplaceTask_type_status_idx`(`type`, `status`),
  INDEX `MarketplaceTask_listingId_idx`(`listingId`),
  INDEX `MarketplaceTask_orderId_idx`(`orderId`),
  INDEX `MarketplaceTask_reportId_idx`(`reportId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MarketplaceEconomyConfig` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'default',
  `publicationFee` INTEGER NOT NULL DEFAULT 0,
  `saleFeePercent` INTEGER NOT NULL DEFAULT 5,
  `listingDurationHours` INTEGER NOT NULL DEFAULT 168,
  `maxListings` INTEGER NOT NULL DEFAULT 10,
  `vipDiscountPercent` INTEGER NOT NULL DEFAULT 0,
  `acceptedCurrencies` JSON NOT NULL,
  `minimumPrice` INTEGER NOT NULL DEFAULT 1,
  `maximumPrice` INTEGER NOT NULL DEFAULT 1000000,
  `cooldownMinutes` INTEGER NOT NULL DEFAULT 0,
  `allowedCategories` JSON NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `MarketplaceEconomyConfig`
  (`id`, `acceptedCurrencies`, `createdAt`, `updatedAt`)
VALUES
  ('default', JSON_ARRAY('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `MarketplaceEscrow`
  (`id`, `listingId`, `gameItemRef`, `originalOwnerId`, `status`, `location`, `internalHash`, `enteredAt`, `createdAt`, `updatedAt`)
SELECT
  UUID(), `id`, `gameItemRef`, `sellerAccountId`,
  CASE WHEN `lockedAt` IS NOT NULL THEN 'HELD' ELSE 'ENTRY_PENDING' END,
  CASE WHEN `lockedAt` IS NOT NULL THEN 'ESCROW_VAULT' ELSE 'GAME_INVENTORY' END,
  SHA2(CONCAT(`id`, ':', `gameItemRef`, ':', `sellerAccountId`), 256),
  `lockedAt`, `createdAt`, `updatedAt`
FROM `PlayerMarketListing`;

ALTER TABLE `MarketplaceEscrow`
  ADD CONSTRAINT `MarketplaceEscrow_listingId_fkey`
    FOREIGN KEY (`listingId`) REFERENCES `PlayerMarketListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketplaceReport`
  ADD CONSTRAINT `MarketplaceReport_listingId_fkey`
    FOREIGN KEY (`listingId`) REFERENCES `PlayerMarketListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MarketplaceReport_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `PlayerMarketOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MarketplaceReport_reporterId_fkey`
    FOREIGN KEY (`reporterId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MarketplaceTask`
  ADD CONSTRAINT `MarketplaceTask_listingId_fkey`
    FOREIGN KEY (`listingId`) REFERENCES `PlayerMarketListing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MarketplaceTask_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `PlayerMarketOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `MarketplaceTask_reportId_fkey`
    FOREIGN KEY (`reportId`) REFERENCES `MarketplaceReport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
