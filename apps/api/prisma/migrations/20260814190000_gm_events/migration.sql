CREATE TABLE `GmEventDefinition` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(100) NOT NULL,
  `executionMode` ENUM('AUTOMATED', 'MANUAL_GM', 'HYBRID') NOT NULL DEFAULT 'MANUAL_GM',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GmEventDefinition_key_key` (`key`),
  INDEX `GmEventDefinition_status_idx` (`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmEventDefinition_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `Account` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GmEventSchedule` (
  `id` VARCHAR(191) NOT NULL,
  `definitionId` VARCHAR(191) NOT NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `endsAt` DATETIME(3) NULL,
  `recurrenceNote` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `GmEventSchedule_definitionId_startsAt_idx` (`definitionId`, `startsAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmEventSchedule_definitionId_fkey`
    FOREIGN KEY (`definitionId`) REFERENCES `GmEventDefinition` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GmEventRun` (
  `id` VARCHAR(191) NOT NULL,
  `definitionId` VARCHAR(191) NOT NULL,
  `scheduleId` VARCHAR(191) NULL,
  `status` ENUM('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'PROBLEM_REPORTED') NOT NULL DEFAULT 'SCHEDULED',
  `origin` VARCHAR(40) NOT NULL DEFAULT 'PORTAL_ONLY',
  `startedById` VARCHAR(191) NULL,
  `startedAt` DATETIME(3) NULL,
  `endedById` VARCHAR(191) NULL,
  `endedAt` DATETIME(3) NULL,
  `cancelledById` VARCHAR(191) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `cancelReason` TEXT NULL,
  `problemNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `GmEventRun_definitionId_status_idx` (`definitionId`, `status`),
  INDEX `GmEventRun_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `GmEventRun_scheduleId_idx` (`scheduleId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmEventRun_definitionId_fkey`
    FOREIGN KEY (`definitionId`) REFERENCES `GmEventDefinition` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `GmEventRun_scheduleId_fkey`
    FOREIGN KEY (`scheduleId`) REFERENCES `GmEventSchedule` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `GmEventRun_startedById_fkey`
    FOREIGN KEY (`startedById`) REFERENCES `Account` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `GmEventRun_endedById_fkey`
    FOREIGN KEY (`endedById`) REFERENCES `Account` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `GmEventRun_cancelledById_fkey`
    FOREIGN KEY (`cancelledById`) REFERENCES `Account` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GmEventResult` (
  `id` VARCHAR(191) NOT NULL,
  `runId` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `participantCount` INTEGER NULL,
  `status` ENUM('PENDING_VALIDATION', 'VALIDATED', 'INVALIDATED') NOT NULL DEFAULT 'PENDING_VALIDATION',
  `validatedById` VARCHAR(191) NULL,
  `validatedAt` DATETIME(3) NULL,
  `invalidateReason` TEXT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `GmEventResult_runId_key` (`runId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmEventResult_runId_fkey`
    FOREIGN KEY (`runId`) REFERENCES `GmEventRun` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GmEventResult_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `Account` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `GmEventResult_validatedById_fkey`
    FOREIGN KEY (`validatedById`) REFERENCES `Account` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
