-- Phase Z: BetaParticipationRecord -- the ELIGIBILITY FACT layer, kept
-- deliberately separate from BetaRewardEntitlement's own REWARD
-- DEFINITION (unchanged by this migration). Staff (or a future reviewed
-- import) records explicit, justified eligibility facts here; a later,
-- separate generation step converts RECORDED rows into real
-- BetaRewardEntitlement rows. Nothing here is ever inferred from
-- accountPhase or createdAt alone.

-- CreateTable
CREATE TABLE `BetaParticipationRecord` (
    `id` VARCHAR(191) NOT NULL,
    `betaCycleId` VARCHAR(80) NOT NULL,
    `normalizedEmailHash` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `sourceType` ENUM('OPEN_BETA_PARTICIPATION', 'BUG_HUNTER_CONTRIBUTION', 'EVENT_PARTICIPATION', 'MANUAL_STAFF_GRANT', 'IMPORTED_REVIEWED_LIST') NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `justification` TEXT NOT NULL,
    `status` ENUM('RECORDED', 'REJECTED', 'CONVERTED') NOT NULL DEFAULT 'RECORDED',
    `recordedById` VARCHAR(191) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `convertedEntitlementId` VARCHAR(191) NULL,
    `convertedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BetaParticipationRecord_uniqueParticipationSource`(`normalizedEmailHash`, `betaCycleId`, `sourceType`, `sourceId`),
    INDEX `BetaParticipationRecord_status_idx`(`status`),
    INDEX `BetaParticipationRecord_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `BetaParticipationRecord_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `BetaParticipationRecord_recordedById_fkey`
      FOREIGN KEY (`recordedById`) REFERENCES `Account` (`id`)
      ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
