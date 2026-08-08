CREATE TABLE `CommunityCommentRevision` (
  `id` VARCHAR(191) NOT NULL,
  `commentId` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `editedBy` VARCHAR(191) NOT NULL,
  `editorRole` VARCHAR(40) NOT NULL,
  `reason` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `CommunityCommentRevision_commentId_createdAt_idx` (`commentId`, `createdAt`),
  CONSTRAINT `CommunityCommentRevision_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `CommunityComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommunityComment`
  ADD COLUMN `edited` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `editedAt` DATETIME(3) NULL;

CREATE TABLE `CommunityPostSave` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `postId` VARCHAR(191) NOT NULL,
  `collectionId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CommunityPostSave_accountId_postId_key` (`accountId`, `postId`),
  INDEX `CommunityPostSave_accountId_createdAt_idx` (`accountId`, `createdAt`),
  INDEX `CommunityPostSave_accountId_collectionId_createdAt_idx` (`accountId`, `collectionId`, `createdAt`),
  INDEX `CommunityPostSave_postId_idx` (`postId`),
  CONSTRAINT `CommunityPostSave_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityRepost` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `postId` VARCHAR(191) NOT NULL,
  `comment` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CommunityRepost_accountId_postId_key` (`accountId`, `postId`),
  INDEX `CommunityRepost_accountId_createdAt_idx` (`accountId`, `createdAt`),
  INDEX `CommunityRepost_postId_createdAt_idx` (`postId`, `createdAt`),
  CONSTRAINT `CommunityRepost_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunitySocialRelation` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `type` ENUM('BLOCK', 'MUTE') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CommunitySocialRelation_actorId_targetId_type_key` (`actorId`, `targetId`, `type`),
  INDEX `CommunitySocialRelation_actorId_type_createdAt_idx` (`actorId`, `type`, `createdAt`),
  INDEX `CommunitySocialRelation_targetId_type_createdAt_idx` (`targetId`, `type`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
