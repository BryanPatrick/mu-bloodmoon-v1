CREATE TABLE `RoadmapItem` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `description` LONGTEXT NOT NULL,
  `objective` TEXT NULL,
  `problem` TEXT NULL,
  `playerBenefit` TEXT NULL,
  `scopeIncluded` JSON NULL,
  `scopeExcluded` JSON NULL,
  `category` VARCHAR(100) NOT NULL,
  `horizon` ENUM('NOW','NEXT','FUTURE','ANALYSIS','COMPLETED','CANCELLED') NOT NULL,
  `status` ENUM('PROPOSED','ANALYSIS','PLANNED','DESIGN','DEVELOPMENT','TESTING','CLOSED_BETA','PUBLIC_BETA','READY','RELEASED','PAUSED','POSTPONED','CANCELLED') NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `progress` INTEGER NOT NULL DEFAULT 0,
  `estimatedPeriod` VARCHAR(100) NULL,
  `completedAt` DATETIME(3) NULL,
  `image` VARCHAR(512) NULL,
  `icon` VARCHAR(100) NULL,
  `tags` JSON NULL,
  `dependencies` JSON NULL,
  `visibility` ENUM('PUBLIC','UNLISTED','ADMIN_ONLY') NOT NULL DEFAULT 'PUBLIC',
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `ownerId` VARCHAR(191) NULL,
  `internalDeadline` DATETIME(3) NULL,
  `lastWorkAt` DATETIME(3) NULL,
  `workSituation` ENUM('ON_TRACK','AT_RISK','DELAYED','BLOCKED','DONE') NOT NULL DEFAULT 'ON_TRACK',
  `workflowStatus` ENUM('DRAFT','IN_REVIEW','APPROVED','SCHEDULED','PUBLISHED','UNPUBLISHED','ARCHIVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `createdBy` VARCHAR(191) NOT NULL,
  `updatedBy` VARCHAR(191) NOT NULL,
  `reviewedBy` VARCHAR(191) NULL,
  `approvedBy` VARCHAR(191) NULL,
  `publishedBy` VARCHAR(191) NULL,
  `internalNotes` TEXT NULL,
  `publicNotes` TEXT NULL,
  `revisionReason` TEXT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `reviewedAt` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `publishedAt` DATETIME(3) NULL,
  `scheduledPublishAt` DATETIME(3) NULL,
  `archivedAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `deletedBy` VARCHAR(191) NULL,
  `deletionReason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `RoadmapItem_slug_key`(`slug`),
  INDEX `RoadmapItem_workflowStatus_visibility_publishedAt_idx`(`workflowStatus`, `visibility`, `publishedAt`),
  INDEX `RoadmapItem_horizon_status_sortOrder_idx`(`horizon`, `status`, `sortOrder`),
  INDEX `RoadmapItem_category_priority_idx`(`category`, `priority`),
  INDEX `RoadmapItem_ownerId_internalDeadline_idx`(`ownerId`, `internalDeadline`),
  INDEX `RoadmapItem_deletedAt_idx`(`deletedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RoadmapUpdate` (
  `id` VARCHAR(191) NOT NULL,
  `roadmapItemId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `updateType` ENUM('GENERAL','PROGRESS','STATUS','SCOPE','DELIVERY','DELAY','CANCELLATION') NOT NULL DEFAULT 'GENERAL',
  `oldStatus` ENUM('PROPOSED','ANALYSIS','PLANNED','DESIGN','DEVELOPMENT','TESTING','CLOSED_BETA','PUBLIC_BETA','READY','RELEASED','PAUSED','POSTPONED','CANCELLED') NULL,
  `newStatus` ENUM('PROPOSED','ANALYSIS','PLANNED','DESIGN','DEVELOPMENT','TESTING','CLOSED_BETA','PUBLIC_BETA','READY','RELEASED','PAUSED','POSTPONED','CANCELLED') NULL,
  `oldProgress` INTEGER NULL,
  `newProgress` INTEGER NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `visibility` ENUM('PUBLIC','UNLISTED','ADMIN_ONLY') NOT NULL DEFAULT 'PUBLIC',
  `evidence` JSON NULL,
  `durationMinutes` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `RoadmapUpdate_roadmapItemId_createdAt_idx`(`roadmapItemId`, `createdAt`),
  INDEX `RoadmapUpdate_visibility_createdAt_idx`(`visibility`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RoadmapTask` (
  `id` VARCHAR(191) NOT NULL,
  `roadmapItemId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('PENDING','IN_PROGRESS','BLOCKED','DONE','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `assigneeId` VARCHAR(191) NULL,
  `dueAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `updatedBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `RoadmapTask_roadmapItemId_status_idx`(`roadmapItemId`, `status`),
  INDEX `RoadmapTask_assigneeId_status_idx`(`assigneeId`, `status`),
  INDEX `RoadmapTask_dueAt_status_idx`(`dueAt`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RoadmapRelation` (
  `id` VARCHAR(191) NOT NULL,
  `roadmapItemId` VARCHAR(191) NOT NULL,
  `type` ENUM('NEWS','PATCH_NOTE') NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RoadmapRelation_roadmapItemId_type_entityId_key`(`roadmapItemId`, `type`, `entityId`),
  INDEX `RoadmapRelation_type_entityId_idx`(`type`, `entityId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RoadmapUpdate` ADD CONSTRAINT `RoadmapUpdate_roadmapItemId_fkey`
  FOREIGN KEY (`roadmapItemId`) REFERENCES `RoadmapItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoadmapTask` ADD CONSTRAINT `RoadmapTask_roadmapItemId_fkey`
  FOREIGN KEY (`roadmapItemId`) REFERENCES `RoadmapItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoadmapRelation` ADD CONSTRAINT `RoadmapRelation_roadmapItemId_fkey`
  FOREIGN KEY (`roadmapItemId`) REFERENCES `RoadmapItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT IGNORE INTO `AccountPermission` (`id`, `accountId`, `key`, `granted`, `createdAt`, `updatedAt`)
SELECT UUID(), `id`, permissions.`key`, true, NOW(3), NOW(3)
FROM `Account`
CROSS JOIN (
  SELECT 'admin.roadmap.view' AS `key`
  UNION ALL SELECT 'admin.roadmap.create'
  UNION ALL SELECT 'admin.roadmap.edit'
  UNION ALL SELECT 'admin.roadmap.review'
  UNION ALL SELECT 'admin.roadmap.approve'
  UNION ALL SELECT 'admin.roadmap.publish'
  UNION ALL SELECT 'admin.roadmap.delete'
) permissions
WHERE `role` = 'ADMIN';
