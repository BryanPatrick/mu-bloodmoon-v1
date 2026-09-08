-- Phase AA: outbound-alerting foundation. AlertDispatchState is 1:1
-- notification bookkeeping for the pre-existing SystemAlert table -- it
-- never changes SystemAlert's own OPEN/ACKNOWLEDGED/RESOLVED lifecycle,
-- only tracks when/whether an alert was actually pushed to an outbound
-- channel (email/webhook), so a single poller can dedupe/cooldown
-- notifications regardless of which process created the SystemAlert row.

-- CreateTable
CREATE TABLE `AlertDispatchState` (
    `id` VARCHAR(191) NOT NULL,
    `systemAlertId` VARCHAR(191) NOT NULL,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastNotifiedAt` DATETIME(3) NULL,
    `notificationCount` INTEGER NOT NULL DEFAULT 0,
    `lastNotifyError` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AlertDispatchState_systemAlertId_key`(`systemAlertId`),
    INDEX `AlertDispatchState_resolvedAt_idx`(`resolvedAt`),
    INDEX `AlertDispatchState_lastNotifiedAt_idx`(`lastNotifiedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AlertDispatchState` ADD CONSTRAINT `AlertDispatchState_systemAlertId_fkey` FOREIGN KEY (`systemAlertId`) REFERENCES `SystemAlert`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
