-- CreateTable
CREATE TABLE `GameAccountIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `membGuid` INTEGER NULL,
    `legacyLogin` VARCHAR(10) NULL,
    `provisioningStatus` ENUM('PENDING', 'PROVISIONING', 'ACTIVE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `provisioningRequestId` VARCHAR(191) NOT NULL,
    `provisionedAt` DATETIME(3) NULL,
    `lastErrorCode` VARCHAR(191) NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GameAccountIdentity_accountId_key`(`accountId`),
    UNIQUE INDEX `GameAccountIdentity_membGuid_key`(`membGuid`),
    UNIQUE INDEX `GameAccountIdentity_legacyLogin_key`(`legacyLogin`),
    UNIQUE INDEX `GameAccountIdentity_provisioningRequestId_key`(`provisioningRequestId`),
    INDEX `GameAccountIdentity_provisioningStatus_idx`(`provisioningStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GameAccountIdentity` ADD CONSTRAINT `GameAccountIdentity_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
