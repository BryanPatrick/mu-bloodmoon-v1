-- Recovery for a production incident where 20260825190000_launcher_cms_studio
-- was recorded in _prisma_migrations without its DDL being executed.
-- Every operation is additive and idempotent: fresh databases already have
-- these objects; the affected database receives only what is missing.

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='body')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `body` LONGTEXT NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='calendarEnabled')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `calendarEnabled` BOOLEAN NOT NULL DEFAULT false', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='entryInfo')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `entryInfo` TEXT NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='eventEndsAt')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `eventEndsAt` DATETIME(3) NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='eventStartsAt')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `eventStartsAt` DATETIME(3) NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='guideUrl')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `guideUrl` TEXT NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='launcherEnabled')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `launcherEnabled` BOOLEAN NOT NULL DEFAULT false', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='launcherSummary')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `launcherSummary` TEXT NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND COLUMN_NAME='recommendedLevel')=0, 'ALTER TABLE `KnowledgeEntry` ADD COLUMN `recommendedLevel` VARCHAR(60) NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PurchaseIntent' AND COLUMN_NAME='termsAcceptedAt')=0, 'ALTER TABLE `PurchaseIntent` ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PurchaseIntent' AND COLUMN_NAME='termsVersion')=0, 'ALTER TABLE `PurchaseIntent` ADD COLUMN `termsVersion` INTEGER NULL', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS `LauncherSlotContent` (
  `id` VARCHAR(191) NOT NULL, `slotId` VARCHAR(191) NOT NULL, `pageKey` VARCHAR(60) NOT NULL,
  `status` ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'DRAFT', `draftValue` JSON NOT NULL,
  `publishedValue` JSON NULL, `publishedInVersion` INTEGER NULL, `updatedBy` VARCHAR(191) NULL,
  `publishedBy` VARCHAR(191) NULL, `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `LauncherSlotContent_slotId_key`(`slotId`), INDEX `LauncherSlotContent_pageKey_idx`(`pageKey`),
  INDEX `LauncherSlotContent_status_idx`(`status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LauncherContentPublish` (
  `id` VARCHAR(191) NOT NULL, `version` INTEGER NOT NULL AUTO_INCREMENT,
  `kind` VARCHAR(20) NOT NULL DEFAULT 'PUBLISH', `note` TEXT NULL, `publishedBy` VARCHAR(191) NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `LauncherContentPublish_version_key`(`version`), INDEX `LauncherContentPublish_publishedAt_idx`(`publishedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LauncherSlotContentRevision` (
  `id` VARCHAR(191) NOT NULL, `slotId` VARCHAR(191) NOT NULL, `version` INTEGER NOT NULL,
  `value` JSON NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `LauncherSlotContentRevision_slotId_idx`(`slotId`), UNIQUE INDEX `LauncherSlotContentRevision_slotId_version_key`(`slotId`,`version`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LauncherAsset` (
  `id` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL,
  `category` ENUM('LAUNCHER','WEBSITE','GAME','CLASSES','ITEMS','EVENTS','NEWS','CAMPAIGNS','BRANDING','SYSTEM') NOT NULL,
  `mimeType` VARCHAR(80) NOT NULL, `width` INTEGER NULL, `height` INTEGER NULL, `sizeBytes` INTEGER NOT NULL,
  `sha256` VARCHAR(64) NOT NULL, `storageProvider` ENUM('LOCAL','R2') NOT NULL DEFAULT 'LOCAL',
  `storageKey` VARCHAR(512) NOT NULL, `publicUrl` VARCHAR(512) NULL,
  `status` ENUM('RAW','NORMALIZED','REVIEWED','APPROVED','REMASTER_PENDING','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
  `createdBy` VARCHAR(191) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  INDEX `LauncherAsset_category_idx`(`category`), INDEX `LauncherAsset_sha256_idx`(`sha256`), INDEX `LauncherAsset_status_idx`(`status`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `StorePurchaseTerms` (
  `id` VARCHAR(191) NOT NULL, `version` INTEGER NOT NULL AUTO_INCREMENT, `title` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL, `effectiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `active` BOOLEAN NOT NULL DEFAULT true, `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `StorePurchaseTerms_version_key`(`version`), INDEX `StorePurchaseTerms_active_idx`(`active`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='KnowledgeEntry' AND INDEX_NAME='KnowledgeEntry_launcherEnabled_idx')=0, 'CREATE INDEX `KnowledgeEntry_launcherEnabled_idx` ON `KnowledgeEntry`(`launcherEnabled`)', 'SELECT 1'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
