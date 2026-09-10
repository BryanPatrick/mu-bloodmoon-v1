-- Phase Z: Bug Hunters MVP -- BugReport (player-submitted, staff-triaged
-- reproducible defect reports) + BugReportEvent (append-only status/
-- reply/internal-note history, never an in-place overwrite).

-- CreateTable
CREATE TABLE `BugReport` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `category` ENUM('LAUNCHER', 'LOGIN_ACCOUNT', 'GAMEPLAY', 'MAP_MONSTER', 'ITEM', 'EVENT', 'QUEST', 'VIP', 'STORE_PAYMENT', 'MARKETPLACE', 'GUILD', 'COMMUNITY', 'PORTAL', 'PERFORMANCE', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `stepsToReproduce` TEXT NOT NULL,
    `expectedBehavior` TEXT NOT NULL,
    `actualBehavior` TEXT NOT NULL,
    `playerSeverity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `staffSeverity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NULL,
    `status` ENUM('OPEN', 'TRIAGE', 'NEEDS_INFO', 'CONFIRMED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'DUPLICATE', 'NOT_A_BUG') NOT NULL DEFAULT 'OPEN',
    `characterName` VARCHAR(80) NULL,
    `contextNote` TEXT NULL,
    `attachmentRef` VARCHAR(500) NULL,
    `consentAcknowledgedAt` DATETIME(3) NOT NULL,
    `assignedToAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,

    INDEX `BugReport_accountId_idx`(`accountId`),
    INDEX `BugReport_status_idx`(`status`),
    INDEX `BugReport_category_idx`(`category`),
    INDEX `BugReport_assignedToAccountId_idx`(`assignedToAccountId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `BugReport_accountId_fkey`
      FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `BugReport_assignedToAccountId_fkey`
      FOREIGN KEY (`assignedToAccountId`) REFERENCES `Account` (`id`)
      ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BugReportEvent` (
    `id` VARCHAR(191) NOT NULL,
    `bugReportId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREATED', 'STATUS_CHANGED', 'STAFF_SEVERITY_SET', 'ASSIGNED', 'STAFF_REPLY', 'INTERNAL_NOTE', 'PLAYER_INFO_ADDED', 'REWARD_ELIGIBILITY_RECORDED') NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `message` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BugReportEvent_bugReportId_createdAt_idx`(`bugReportId`, `createdAt`),
    INDEX `BugReportEvent_bugReportId_isInternal_idx`(`bugReportId`, `isInternal`),
    PRIMARY KEY (`id`),
    CONSTRAINT `BugReportEvent_bugReportId_fkey`
      FOREIGN KEY (`bugReportId`) REFERENCES `BugReport` (`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `BugReportEvent_actorId_fkey`
      FOREIGN KEY (`actorId`) REFERENCES `Account` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
