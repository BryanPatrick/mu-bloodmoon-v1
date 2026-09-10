-- AlterTable
ALTER TABLE `LegacyCatalogItem` DROP COLUMN `effectiveStateCheckedAt`,
    DROP COLUMN `effectiveStateSnapshot`,
    ADD COLUMN `desiredEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `effectiveCurrency` VARCHAR(191) NULL,
    ADD COLUMN `effectiveDurationSeconds` INTEGER NULL,
    ADD COLUMN `effectiveEnabled` BOOLEAN NULL,
    ADD COLUMN `effectiveOptions` JSON NULL,
    ADD COLUMN `effectivePrice` INTEGER NULL,
    ADD COLUMN `sourceFingerprint` VARCHAR(191) NULL,
    ADD COLUMN `sourceLastReadAt` DATETIME(3) NULL,
    MODIFY `driftStatus` ENUM('NOT_CHECKED', 'IN_SYNC', 'DRIFT_DETECTED', 'CHECK_FAILED', 'NOT_MANAGED') NOT NULL DEFAULT 'NOT_CHECKED';

-- CreateIndex
CREATE INDEX `LegacyCatalogItem_driftStatus_idx` ON `LegacyCatalogItem`(`driftStatus`);
