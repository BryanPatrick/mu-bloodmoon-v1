-- GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
-- Part 3B, decision E. VipSyncState is the Portal's own memory of "what did
-- we last successfully tell the GameServer" -- deliberately separate from
-- VipEntitlement (commercial truth).

-- CreateTable
CREATE TABLE `VipSyncState` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `lastSyncedLevel` INTEGER NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastSyncCommandId` VARCHAR(191) NULL,
    `pendingDesiredLevel` INTEGER NULL,
    `lastSyncStatus` VARCHAR(32) NULL,
    `lastSyncReason` VARCHAR(32) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipSyncState_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VipSyncState` ADD CONSTRAINT `VipSyncState_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
