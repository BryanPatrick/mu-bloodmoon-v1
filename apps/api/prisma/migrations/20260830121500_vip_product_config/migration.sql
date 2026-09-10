-- VIP catalog: tier x duration pricing, all rows unpriced/disabled until
-- explicitly approved (see 20260830120000_open_beta_p0_foundation for the
-- rest of the Open Beta P0 VIP/wallet-ledger/Beta-lifecycle foundation).

-- CreateTable
CREATE TABLE `VipProductConfig` (
    `id` VARCHAR(191) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL DEFAULT 'WCOIN',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipProductConfig_tier_durationDays_key`(`tier`, `durationDays`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
