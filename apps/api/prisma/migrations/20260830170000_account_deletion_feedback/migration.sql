-- Bryan's 2026-08-30 follow-up: structured exit feedback for the
-- self-service account deletion flow (docs/accounts/account-deletion-architecture.md).
-- accountId is nullable and unindexed as a FK on purpose -- this row must
-- survive account anonymization (see model comment in schema.prisma).

-- CreateTable
CREATE TABLE `AccountDeletionFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `reasons` JSON NOT NULL,
    `otherText` VARCHAR(2000) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `anonymizedAt` DATETIME(3) NULL,

    INDEX `AccountDeletionFeedback_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
