-- Phase 14: VIP GameBridge delivery worker (no schema change of its own --
-- reuses the existing GameBridgeJob shape) + account deletion architecture
-- (AccountDeletionRecord, PurgeBatchRecord, Account.deletedAt, and two new
-- allowlisted GameBridgeOperation values).
--
-- Deliberately EXCLUDES two pre-existing, unrelated drift items surfaced by
-- `prisma migrate diff` against the live local dev DB (confirmed unrelated
-- to this phase's changes, same exclusion already documented in
-- 20260830120000_open_beta_p0_foundation/migration.sql):
--   1. DROP INDEX `ShopProduct_status_idx` -- superseded by two compound
--      indexes already declared in schema.prisma; not touched here.
--   2. communitycommentrevision.content / communitypostrevision.type,
--      visibility column-default drift -- predates this phase entirely.

-- AlterTable
ALTER TABLE `account` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `gamebridgejob` MODIFY `operation` ENUM('LOCK_ITEM', 'RELEASE_ITEM', 'TRANSFER_ITEM', 'DELIVER_ITEM', 'CREDIT_CURRENCY', 'SYNC_INVENTORY', 'GRANT_VIP', 'ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT') NOT NULL;

-- CreateTable
CREATE TABLE `AccountDeletionRecord` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `deletionMode` VARCHAR(40) NOT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `originalUsernameHash` VARCHAR(191) NOT NULL,
    `originalEmailHash` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AccountDeletionRecord_accountId_key`(`accountId`),
    INDEX `AccountDeletionRecord_originalEmailHash_idx`(`originalEmailHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurgeBatchRecord` (
    `id` VARCHAR(191) NOT NULL,
    `betaCycleId` VARCHAR(80) NOT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `accountCount` INTEGER NOT NULL,
    `accountIdsPurged` JSON NOT NULL,

    INDEX `PurgeBatchRecord_betaCycleId_idx`(`betaCycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
