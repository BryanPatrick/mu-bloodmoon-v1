-- CreateTable
CREATE TABLE `GameProvisioningAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `provisioningRequestId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `outcome` VARCHAR(40) NOT NULL,
    `errorCode` VARCHAR(191) NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GameProvisioningAttempt_accountId_idx`(`accountId`),
    INDEX `GameProvisioningAttempt_provisioningRequestId_idx`(`provisioningRequestId`),
    INDEX `GameProvisioningAttempt_attemptedAt_idx`(`attemptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
