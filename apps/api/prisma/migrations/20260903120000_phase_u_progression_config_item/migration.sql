-- CreateTable
CREATE TABLE `ProgressionConfigItem` (
    `id` VARCHAR(191) NOT NULL,
    `domain` ENUM('EXPERIENCE', 'DROP', 'RESET', 'MASTER_RESET') NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `friendlyLabel` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(191) NULL,
    `technicalSource` JSON NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `desiredValue` JSON NULL,
    `desiredReason` TEXT NULL,
    `effectiveValue` JSON NULL,
    `driftStatus` ENUM('NOT_CHECKED', 'IN_SYNC', 'DRIFT_DETECTED', 'CHECK_FAILED', 'NOT_MANAGED') NOT NULL DEFAULT 'NOT_CHECKED',
    `sourceLastReadAt` DATETIME(3) NULL,
    `sourceFingerprint` VARCHAR(191) NULL,
    `internalNotes` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProgressionConfigItem_driftStatus_idx`(`driftStatus`),
    INDEX `ProgressionConfigItem_riskLevel_idx`(`riskLevel`),
    UNIQUE INDEX `ProgressionConfigItem_domain_key_key`(`domain`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
