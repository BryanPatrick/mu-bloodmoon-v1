-- AlterTable
ALTER TABLE `Account` ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFactorPending` TEXT NULL,
    ADD COLUMN `twoFactorSecret` TEXT NULL;

-- CreateTable
CREATE TABLE `AccountSession` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(80) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokeReason` VARCHAR(191) NULL,

    INDEX `AccountSession_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `AccountSession_accountId_revokedAt_idx`(`accountId`, `revokedAt`),
    INDEX `AccountSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccountSession` ADD CONSTRAINT `AccountSession_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
