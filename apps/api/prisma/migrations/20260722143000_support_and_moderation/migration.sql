CREATE TABLE `SupportTicket` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `assigneeId` VARCHAR(191) NULL,
  `subject` VARCHAR(191) NOT NULL,
  `category` VARCHAR(80) NOT NULL DEFAULT 'support',
  `message` TEXT NOT NULL,
  `response` TEXT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `SupportTicket_accountId_idx` (`accountId`),
  INDEX `SupportTicket_assigneeId_idx` (`assigneeId`),
  INDEX `SupportTicket_status_idx` (`status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SupportTicket_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SupportTicket_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `Account` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountModeration` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `type` ENUM('NOTE', 'WARNING', 'BLOCK', 'UNBLOCK', 'BAN') NOT NULL,
  `reason` TEXT NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AccountModeration_accountId_idx` (`accountId`),
  INDEX `AccountModeration_actorId_idx` (`actorId`),
  INDEX `AccountModeration_type_idx` (`type`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AccountModeration_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AccountModeration_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `Account` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
