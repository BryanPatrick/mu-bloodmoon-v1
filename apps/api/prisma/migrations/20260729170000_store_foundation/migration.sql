-- Expand the existing official store without publishing imported products.
ALTER TABLE `ShopProduct`
  MODIFY `status` ENUM('DRAFT','IN_REVIEW','APPROVED','SCHEDULED','ACTIVE','INACTIVE','ARCHIVED','BLOCKED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `categoryId` VARCHAR(191) NULL,
  ADD COLUMN `summary` TEXT NULL,
  MODIFY `description` LONGTEXT NOT NULL,
  ADD COLUMN `images` JSON NULL,
  ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `deliveryTarget` ENUM('ACCOUNT','CHARACTER','INVENTORY','VAULT','MAIL') NOT NULL DEFAULT 'ACCOUNT',
  ADD COLUMN `accountLimit` INTEGER NULL,
  ADD COLUMN `periodLimit` INTEGER NULL,
  ADD COLUMN `periodDays` INTEGER NULL,
  ADD COLUMN `saleStartsAt` DATETIME(3) NULL,
  ADD COLUMN `saleEndsAt` DATETIME(3) NULL,
  ADD COLUMN `scheduledPublishAt` DATETIME(3) NULL,
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `archivedAt` DATETIME(3) NULL,
  ADD COLUMN `deletedAt` DATETIME(3) NULL,
  ADD COLUMN `deletedBy` VARCHAR(191) NULL,
  ADD COLUMN `deletionReason` TEXT NULL,
  ADD COLUMN `technicalCode` VARCHAR(191) NULL,
  ADD COLUMN `sourceOrigin` VARCHAR(191) NULL,
  ADD COLUMN `ambiguous` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `internalNotes` TEXT NULL,
  ADD COLUMN `revisionReason` TEXT NULL,
  ADD COLUMN `createdBy` VARCHAR(191) NULL,
  ADD COLUMN `updatedBy` VARCHAR(191) NULL,
  ADD COLUMN `reviewedBy` VARCHAR(191) NULL,
  ADD COLUMN `approvedBy` VARCHAR(191) NULL,
  ADD COLUMN `publishedBy` VARCHAR(191) NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

UPDATE `ShopProduct`
SET `slug` = `key`,
    `publishedAt` = CASE WHEN `status` = 'ACTIVE' THEN `updatedAt` ELSE NULL END
WHERE `slug` IS NULL;

ALTER TABLE `ShopProduct`
  MODIFY `slug` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `ShopProduct_slug_key`(`slug`),
  ADD INDEX `ShopProduct_categoryId_idx`(`categoryId`),
  ADD INDEX `ShopProduct_status_publishedAt_idx`(`status`, `publishedAt`),
  ADD INDEX `ShopProduct_featured_status_idx`(`featured`, `status`),
  ADD INDEX `ShopProduct_status_sortOrder_idx`(`status`, `sortOrder`),
  ADD INDEX `ShopProduct_deletedAt_idx`(`deletedAt`);

CREATE TABLE `StoreCategory` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `image` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `archivedAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `deletedBy` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `StoreCategory_slug_key`(`slug`),
  INDEX `StoreCategory_active_sortOrder_idx`(`active`, `sortOrder`),
  INDEX `StoreCategory_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShopProductVariant` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NOT NULL,
  `durationSeconds` INTEGER NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `itemLevel` INTEGER NULL,
  `options` JSON NULL,
  `price` INTEGER NOT NULL,
  `currency` ENUM('WCOIN','GOBLIN_POINT','HUNT_POINT') NOT NULL,
  `stock` INTEGER NULL,
  `available` BOOLEAN NOT NULL DEFAULT true,
  `accountLimit` INTEGER NULL,
  `periodLimit` INTEGER NULL,
  `periodDays` INTEGER NULL,
  `deliveryTarget` ENUM('ACCOUNT','CHARACTER','INVENTORY','VAULT','MAIL') NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `technicalData` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ShopProductVariant_sku_key`(`sku`),
  INDEX `ShopProductVariant_productId_available_sortOrder_idx`(`productId`, `available`, `sortOrder`),
  INDEX `ShopProductVariant_currency_idx`(`currency`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PurchaseIntent`
  MODIFY `status` ENUM('PREPARED','PENDING_PAYMENT','PAID','DELIVERING','COMPLETED','MANUAL_REVIEW','REFUND_PENDING','REFUNDED','FAILED','CANCELLED') NOT NULL DEFAULT 'PREPARED',
  ADD COLUMN `variantId` VARCHAR(191) NULL,
  ADD COLUMN `destinationCharacterId` VARCHAR(191) NULL,
  ADD COLUMN `quantity` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `correlationId` VARCHAR(191) NULL,
  ADD COLUMN `internalNotes` TEXT NULL,
  ADD COLUMN `manualReviewReason` TEXT NULL,
  ADD COLUMN `refundReason` TEXT NULL,
  ADD COLUMN `refundedBy` VARCHAR(191) NULL,
  ADD COLUMN `refundedAt` DATETIME(3) NULL,
  ADD COLUMN `cancelledBy` VARCHAR(191) NULL,
  ADD COLUMN `cancelledAt` DATETIME(3) NULL,
  ADD COLUMN `completedAt` DATETIME(3) NULL;

UPDATE `PurchaseIntent`
SET `correlationId` = CONCAT('legacy-order-', `id`)
WHERE `correlationId` IS NULL;

ALTER TABLE `PurchaseIntent`
  MODIFY `correlationId` VARCHAR(191) NOT NULL,
  ADD UNIQUE INDEX `PurchaseIntent_correlationId_key`(`correlationId`),
  ADD INDEX `PurchaseIntent_variantId_idx`(`variantId`),
  ADD INDEX `PurchaseIntent_createdAt_idx`(`createdAt`);

CREATE TABLE `StoreDelivery` (
  `id` VARCHAR(191) NOT NULL,
  `purchaseId` VARCHAR(191) NOT NULL,
  `status` ENUM('WAITING','PROCESSING','COMPLETED','FAILED','REPROCESSING','MANUAL_REVIEW','REFUNDED') NOT NULL DEFAULT 'WAITING',
  `target` ENUM('ACCOUNT','CHARACTER','INVENTORY','VAULT','MAIL') NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `characterId` VARCHAR(191) NULL,
  `itemCode` VARCHAR(191) NULL,
  `itemName` VARCHAR(191) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `maxAttempts` INTEGER NOT NULL DEFAULT 3,
  `lastError` TEXT NULL,
  `correlationId` VARCHAR(191) NOT NULL,
  `assignedTo` VARCHAR(191) NULL,
  `reprocessedBy` VARCHAR(191) NULL,
  `processingAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `refundedAt` DATETIME(3) NULL,
  `evidence` JSON NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `StoreDelivery_correlationId_key`(`correlationId`),
  INDEX `StoreDelivery_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `StoreDelivery_purchaseId_idx`(`purchaseId`),
  INDEX `StoreDelivery_accountId_idx`(`accountId`),
  INDEX `StoreDelivery_assignedTo_status_idx`(`assignedTo`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StoreOrderNote` (
  `id` VARCHAR(191) NOT NULL,
  `purchaseId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `authorName` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `evidence` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `StoreOrderNote_purchaseId_createdAt_idx`(`purchaseId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StoreProductTest` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NULL,
  `testAccountId` VARCHAR(191) NOT NULL,
  `testCharacter` VARCHAR(191) NULL,
  `environment` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `result` JSON NULL,
  `rollbackData` JSON NULL,
  `correlationId` VARCHAR(191) NOT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  UNIQUE INDEX `StoreProductTest_correlationId_key`(`correlationId`),
  INDEX `StoreProductTest_productId_createdAt_idx`(`productId`, `createdAt`),
  INDEX `StoreProductTest_testAccountId_createdAt_idx`(`testAccountId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ShopProduct`
  ADD CONSTRAINT `ShopProduct_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `StoreCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ShopProductVariant`
  ADD CONSTRAINT `ShopProductVariant_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `ShopProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PurchaseIntent`
  ADD CONSTRAINT `PurchaseIntent_variantId_fkey`
  FOREIGN KEY (`variantId`) REFERENCES `ShopProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StoreDelivery`
  ADD CONSTRAINT `StoreDelivery_purchaseId_fkey`
  FOREIGN KEY (`purchaseId`) REFERENCES `PurchaseIntent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StoreOrderNote`
  ADD CONSTRAINT `StoreOrderNote_purchaseId_fkey`
  FOREIGN KEY (`purchaseId`) REFERENCES `PurchaseIntent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing administrators receive view access; granular mutations remain explicit.
INSERT INTO `AccountPermission` (`id`, `accountId`, `key`, `granted`, `createdAt`, `updatedAt`)
SELECT UUID(), a.`id`, p.`permissionKey`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Account` a
CROSS JOIN (
  SELECT 'admin.store.view' AS `permissionKey`
  UNION ALL SELECT 'admin.store.categories'
  UNION ALL SELECT 'admin.store.products'
  UNION ALL SELECT 'admin.store.review'
  UNION ALL SELECT 'admin.store.publish'
  UNION ALL SELECT 'admin.store.orders'
  UNION ALL SELECT 'admin.store.refund'
  UNION ALL SELECT 'admin.store.deliveries'
  UNION ALL SELECT 'admin.store.test'
) p
WHERE a.`role` = 'ADMIN'
ON DUPLICATE KEY UPDATE `granted` = VALUES(`granted`), `updatedAt` = CURRENT_TIMESTAMP(3);
