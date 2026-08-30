-- Phase 15: self-service account deletion request/confirm/cancel flow
-- (AccountDeletionRequest). Same excluded pre-existing drift as every
-- prior Phase 13-15 migration (ShopProduct_status_idx;
-- communitycommentrevision/communitypostrevision column defaults).

-- CreateTable
CREATE TABLE `AccountDeletionRequest` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'CONFIRMED', 'CANCELLED', 'EXECUTED') NOT NULL DEFAULT 'REQUESTED',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestIp` VARCHAR(80) NULL,
    `requestAgent` VARCHAR(255) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `scheduledExecutionAt` DATETIME(3) NULL,
    `executedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,

    UNIQUE INDEX `AccountDeletionRequest_accountId_key`(`accountId`),
    UNIQUE INDEX `AccountDeletionRequest_tokenHash_key`(`tokenHash`),
    INDEX `AccountDeletionRequest_status_scheduledExecutionAt_idx`(`status`, `scheduledExecutionAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
