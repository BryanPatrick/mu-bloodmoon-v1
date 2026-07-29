-- Central administrative task management
CREATE TABLE `AdminTask` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `complexity` ENUM('SIMPLE', 'STANDARD', 'COMPLEX', 'INVESTIGATION', 'CRITICAL') NOT NULL DEFAULT 'STANDARD',
    `status` ENUM('BACKLOG', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
    `assignedTo` VARCHAR(191) NULL,
    `assignedBy` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `dueAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `estimatedMinutes` INTEGER NULL,
    `actualMinutes` INTEGER NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `errorId` VARCHAR(191) NULL,
    `reportId` VARCHAR(191) NULL,
    `internalNotes` LONGTEXT NULL,
    `result` LONGTEXT NULL,
    `approvalRequired` BOOLEAN NOT NULL DEFAULT false,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewReason` TEXT NULL,
    `reopenedCount` INTEGER NOT NULL DEFAULT 0,
    `rejectedCount` INTEGER NOT NULL DEFAULT 0,
    `sourceTaskType` VARCHAR(100) NULL,
    `sourceTaskId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminTask_sourceTaskType_sourceTaskId_key`(`sourceTaskType`, `sourceTaskId`),
    INDEX `AdminTask_assignedTo_status_dueAt_idx`(`assignedTo`, `status`, `dueAt`),
    INDEX `AdminTask_module_status_priority_idx`(`module`, `status`, `priority`),
    INDEX `AdminTask_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AdminTask_errorId_idx`(`errorId`),
    INDEX `AdminTask_reportId_idx`(`reportId`),
    INDEX `AdminTask_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminTaskComment` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `attachments` JSON NULL,
    `editedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdminTaskComment_taskId_createdAt_idx`(`taskId`, `createdAt`),
    INDEX `AdminTaskComment_authorId_createdAt_idx`(`authorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminTaskEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'FILE', 'INTERNAL_LINK', 'DESCRIPTION', 'LOG', 'ENTITY_CHANGE', 'BEFORE_AFTER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `url` VARCHAR(1024) NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminTaskEvidence_taskId_createdAt_idx`(`taskId`, `createdAt`),
    INDEX `AdminTaskEvidence_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `AdminTaskEvidence_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminTaskLink` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminTaskLink_taskId_entityType_entityId_key`(`taskId`, `entityType`, `entityId`),
    INDEX `AdminTaskLink_module_entityType_entityId_idx`(`module`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminTaskHistory` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `fromStatus` ENUM('BACKLOG', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'REOPENED') NULL,
    `toStatus` ENUM('BACKLOG', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'REOPENED') NULL,
    `description` TEXT NOT NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `correlationId` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminTaskHistory_taskId_createdAt_idx`(`taskId`, `createdAt`),
    INDEX `AdminTaskHistory_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AdminTaskHistory_correlationId_idx`(`correlationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AdminTask` ADD CONSTRAINT `AdminTask_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AdminTaskComment` ADD CONSTRAINT `AdminTaskComment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AdminTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdminTaskComment` ADD CONSTRAINT `AdminTaskComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AdminTaskEvidence` ADD CONSTRAINT `AdminTaskEvidence_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AdminTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdminTaskEvidence` ADD CONSTRAINT `AdminTaskEvidence_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AdminTaskLink` ADD CONSTRAINT `AdminTaskLink_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AdminTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AdminTaskHistory` ADD CONSTRAINT `AdminTaskHistory_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `AdminTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing module tasks in the shared task center.
INSERT INTO `AdminTask` (`id`, `title`, `description`, `module`, `type`, `priority`, `complexity`, `status`, `assignedTo`, `assignedBy`, `createdBy`, `dueAt`, `completedAt`, `entityType`, `entityId`, `sourceTaskType`, `sourceTaskId`, `createdAt`, `updatedAt`)
SELECT UUID(), rt.`title`, COALESCE(rt.`description`, ''), 'roadmap', 'ROADMAP_TASK', 'NORMAL', 'STANDARD',
  CASE rt.`status` WHEN 'PENDING' THEN 'OPEN' WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS' WHEN 'BLOCKED' THEN 'WAITING' WHEN 'DONE' THEN 'COMPLETED' ELSE 'CANCELED' END,
  assignee.`id`, NULL, creator.`id`, rt.`dueAt`, rt.`completedAt`, 'RoadmapItem', rt.`roadmapItemId`, 'RoadmapTask', rt.`id`, rt.`createdAt`, rt.`updatedAt`
FROM `RoadmapTask` rt
INNER JOIN `Account` creator ON creator.`id` = rt.`createdBy`
LEFT JOIN `Account` assignee ON assignee.`id` = rt.`assigneeId`;

INSERT INTO `AdminTask` (`id`, `title`, `description`, `module`, `type`, `priority`, `complexity`, `status`, `assignedTo`, `assignedBy`, `createdBy`, `dueAt`, `completedAt`, `entityType`, `entityId`, `reportId`, `sourceTaskType`, `sourceTaskId`, `createdAt`, `updatedAt`)
SELECT UUID(), mt.`title`, COALESCE(mt.`description`, ''), 'marketplace', mt.`type`,
  CASE UPPER(mt.`priority`) WHEN 'LOW' THEN 'LOW' WHEN 'HIGH' THEN 'HIGH' WHEN 'URGENT' THEN 'URGENT' WHEN 'CRITICAL' THEN 'CRITICAL' ELSE 'NORMAL' END,
  CASE WHEN UPPER(mt.`priority`) = 'CRITICAL' THEN 'CRITICAL' ELSE 'STANDARD' END,
  CASE mt.`status` WHEN 'PENDING' THEN 'OPEN' WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS' WHEN 'BLOCKED' THEN 'WAITING' WHEN 'DONE' THEN 'COMPLETED' ELSE 'CANCELED' END,
  assignee.`id`, NULL, creator.`id`, mt.`dueAt`, mt.`completedAt`,
  CASE WHEN mt.`listingId` IS NOT NULL THEN 'PlayerMarketListing' WHEN mt.`orderId` IS NOT NULL THEN 'PlayerMarketOrder' ELSE 'MarketplaceReport' END,
  COALESCE(mt.`listingId`, mt.`orderId`, mt.`reportId`), mt.`reportId`, 'MarketplaceTask', mt.`id`, mt.`createdAt`, mt.`updatedAt`
FROM `MarketplaceTask` mt
INNER JOIN `Account` creator ON creator.`id` = mt.`createdBy`
LEFT JOIN `Account` assignee ON assignee.`id` = mt.`assigneeId`;

INSERT INTO `AdminTask` (`id`, `title`, `description`, `module`, `type`, `priority`, `complexity`, `status`, `assignedTo`, `assignedBy`, `createdBy`, `dueAt`, `completedAt`, `entityType`, `entityId`, `sourceTaskType`, `sourceTaskId`, `createdAt`, `updatedAt`)
SELECT UUID(), ct.`title`, COALESCE(ct.`description`, ''), 'community', ct.`entityType`,
  CASE ct.`priority` WHEN 'LOW' THEN 'LOW' WHEN 'HIGH' THEN 'HIGH' WHEN 'URGENT' THEN 'URGENT' ELSE 'NORMAL' END,
  CASE WHEN ct.`priority` = 'URGENT' THEN 'COMPLEX' ELSE 'STANDARD' END,
  CASE ct.`status` WHEN 'PENDING' THEN 'OPEN' WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS' WHEN 'BLOCKED' THEN 'WAITING' WHEN 'DONE' THEN 'COMPLETED' ELSE 'CANCELED' END,
  assignee.`id`, NULL, creator.`id`, ct.`dueAt`, ct.`completedAt`, ct.`entityType`, ct.`entityId`, 'CommunityTask', ct.`id`, ct.`createdAt`, ct.`updatedAt`
FROM `CommunityTask` ct
INNER JOIN `Account` creator ON creator.`id` = ct.`createdBy`
LEFT JOIN `Account` assignee ON assignee.`id` = ct.`assigneeId`;
