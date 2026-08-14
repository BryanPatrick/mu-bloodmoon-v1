CREATE TABLE `GmOccurrence` (
  `id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `targetType` VARCHAR(100) NULL,
  `targetId` VARCHAR(191) NULL,
  `status` ENUM('OPEN', 'IN_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
  `createdById` VARCHAR(191) NOT NULL,
  `assignedToId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `resolvedAt` DATETIME(3) NULL,
  INDEX `GmOccurrence_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `GmOccurrence_targetType_targetId_idx` (`targetType`, `targetId`),
  INDEX `GmOccurrence_assignedToId_idx` (`assignedToId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmOccurrence_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `Account` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `GmOccurrence_assignedToId_fkey`
    FOREIGN KEY (`assignedToId`) REFERENCES `Account` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GmOccurrenceNote` (
  `id` VARCHAR(191) NOT NULL,
  `occurrenceId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `note` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `GmOccurrenceNote_occurrenceId_createdAt_idx` (`occurrenceId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `GmOccurrenceNote_occurrenceId_fkey`
    FOREIGN KEY (`occurrenceId`) REFERENCES `GmOccurrence` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GmOccurrenceNote_authorId_fkey`
    FOREIGN KEY (`authorId`) REFERENCES `Account` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
