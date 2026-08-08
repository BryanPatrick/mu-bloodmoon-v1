ALTER TABLE `CommunityPost`
  ADD COLUMN `type` ENUM('TEXT','IMAGE','GALLERY','GIF','ARTICLE','ITEM','ACHIEVEMENT','EVENT','MARKETPLACE','GUILD','LFG','POLL','AUTOMATED_GAME_EVENT') NOT NULL DEFAULT 'TEXT',
  ADD COLUMN `visibility` ENUM('PUBLIC','FOLLOWERS','PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN `tags` JSON NULL,
  ADD COLUMN `mentions` JSON NULL,
  ADD COLUMN `edited` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `editedAt` DATETIME(3) NULL,
  ADD COLUMN `sponsored` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `official` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `sourceType` VARCHAR(80) NULL,
  ADD COLUMN `sourceId` VARCHAR(191) NULL;

CREATE INDEX `CommunityPost_type_visibility_status_createdAt_idx`
  ON `CommunityPost`(`type`, `visibility`, `status`, `createdAt`);
CREATE INDEX `CommunityPost_sourceType_sourceId_idx`
  ON `CommunityPost`(`sourceType`, `sourceId`);

ALTER TABLE `CommunityPostRevision`
  ADD COLUMN `type` ENUM('TEXT','IMAGE','GALLERY','GIF','ARTICLE','ITEM','ACHIEVEMENT','EVENT','MARKETPLACE','GUILD','LFG','POLL','AUTOMATED_GAME_EVENT') NOT NULL DEFAULT 'TEXT',
  ADD COLUMN `visibility` ENUM('PUBLIC','FOLLOWERS','PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN `tags` JSON NULL,
  ADD COLUMN `mentions` JSON NULL;

CREATE TABLE `CommunityMedia` (
  `id` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `postId` VARCHAR(191) NULL,
  `kind` ENUM('IMAGE','GIF') NOT NULL,
  `status` ENUM('TEMPORARY','READY','ATTACHED','REMOVED','REJECTED') NOT NULL DEFAULT 'TEMPORARY',
  `url` VARCHAR(512) NOT NULL,
  `storagePath` VARCHAR(512) NOT NULL,
  `originalName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL,
  `extension` VARCHAR(12) NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `width` INTEGER NOT NULL,
  `height` INTEGER NOT NULL,
  `sha256` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `removedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `CommunityMedia_ownerId_status_createdAt_idx`(`ownerId`, `status`, `createdAt`),
  INDEX `CommunityMedia_postId_idx`(`postId`),
  INDEX `CommunityMedia_sha256_idx`(`sha256`),
  CONSTRAINT `CommunityMedia_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
