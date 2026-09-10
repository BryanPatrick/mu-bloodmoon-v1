-- Open Beta P0 foundation: accountPhase, WC per-currency tax config, wallet
-- ledger, Beta reward entitlement, VIP entitlement/grant/benefit config,
-- account terms acceptance, GRANT_VIP bridge operation, VIP_ENTITLEMENT
-- delivery target.
--
-- This migration was hand-curated from a `prisma migrate diff` run against
-- the local dev database, with two unrelated pre-existing drift items
-- deliberately excluded (neither caused by this phase's schema changes):
--   - a stray `ShopProduct_status_idx` index not declared anywhere in
--     schema.prisma (superseded by the compound status indexes already
--     declared on ShopProduct) -- dropping it is out of this phase's scope
--   - communitycommentrevision/communitypostrevision column-default drift,
--     entirely unrelated to Open Beta P0 work
-- Both are pre-existing and untouched by this migration.

-- AlterTable
ALTER TABLE `Account` ADD COLUMN `accountPhase` ENUM('PRE_BETA', 'OPEN_BETA', 'OFFICIAL') NOT NULL DEFAULT 'PRE_BETA';

-- AlterTable
ALTER TABLE `AccountCurrency` ADD COLUMN `feeAccumulatorSubunits` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `GameBridgeJob` MODIFY `operation` ENUM('LOCK_ITEM', 'RELEASE_ITEM', 'TRANSFER_ITEM', 'DELIVER_ITEM', 'CREDIT_CURRENCY', 'SYNC_INVENTORY', 'GRANT_VIP') NOT NULL;

-- AlterTable
ALTER TABLE `MarketplaceEconomyConfig` ADD COLUMN `goblinPointTaxPercent` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `huntPointTaxPercent` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `wcoinTaxPercent` INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE `ShopProduct` MODIFY `deliveryTarget` ENUM('ACCOUNT', 'CHARACTER', 'INVENTORY', 'VAULT', 'MAIL', 'VIP_ENTITLEMENT') NOT NULL DEFAULT 'ACCOUNT';

-- AlterTable
ALTER TABLE `ShopProductVariant` MODIFY `deliveryTarget` ENUM('ACCOUNT', 'CHARACTER', 'INVENTORY', 'VAULT', 'MAIL', 'VIP_ENTITLEMENT') NULL;

-- AlterTable
ALTER TABLE `StoreDelivery` MODIFY `target` ENUM('ACCOUNT', 'CHARACTER', 'INVENTORY', 'VAULT', 'MAIL', 'VIP_ENTITLEMENT') NOT NULL;

-- CreateTable
CREATE TABLE `AccountTermsAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `termsKey` VARCHAR(80) NOT NULL,
    `termsVersion` INTEGER NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(80) NULL,

    INDEX `AccountTermsAcceptance_accountId_termsKey_idx`(`accountId`, `termsKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `type` ENUM('WC_PURCHASE_CREDIT', 'PLAYER_MARKET_PURCHASE', 'PLAYER_DIRECT_TRANSFER', 'SERVER_REWARD', 'BUG_HUNTER_REWARD', 'ADMIN_ADJUSTMENT', 'PAYMENT_REVERSAL', 'REFUND', 'SYSTEM_CORRECTION', 'STORE_PURCHASE') NOT NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `counterpartyAccountId` VARCHAR(191) NULL,
    `grossAmount` INTEGER NOT NULL,
    `taxAmount` INTEGER NOT NULL DEFAULT 0,
    `netAmount` INTEGER NOT NULL,
    `feeObligationSubunits` INTEGER NOT NULL DEFAULT 0,
    `feeAccumulatorSubunitsBefore` INTEGER NULL,
    `feeAccumulatorSubunitsAfter` INTEGER NULL,
    `sourceType` VARCHAR(80) NULL,
    `sourceId` VARCHAR(191) NULL,
    `paymentProvenanceRef` VARCHAR(191) NULL,
    `status` ENUM('SETTLED', 'REVERSED') NOT NULL DEFAULT 'SETTLED',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WalletLedgerEntry_idempotencyKey_key`(`idempotencyKey`),
    INDEX `WalletLedgerEntry_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `WalletLedgerEntry_counterpartyAccountId_createdAt_idx`(`counterpartyAccountId`, `createdAt`),
    INDEX `WalletLedgerEntry_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `WalletLedgerEntry_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BetaRewardEntitlement` (
    `id` VARCHAR(191) NOT NULL,
    `betaCycleId` VARCHAR(80) NOT NULL,
    `normalizedEmailHash` VARCHAR(191) NOT NULL,
    `originalAccountId` VARCHAR(191) NULL,
    `rewardType` VARCHAR(80) NOT NULL,
    `rewardAmount` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `sourceType` VARCHAR(80) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ELIGIBLE', 'REJECTED', 'CLAIMED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `claimedAt` DATETIME(3) NULL,
    `claimedByAccountId` VARCHAR(191) NULL,

    INDEX `BetaRewardEntitlement_normalizedEmailHash_betaCycleId_idx`(`normalizedEmailHash`, `betaCycleId`),
    INDEX `BetaRewardEntitlement_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VipEntitlement` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') NULL,
    `activatedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `totalDaysGranted` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('INACTIVE', 'ACTIVE', 'EXPIRED') NOT NULL DEFAULT 'INACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipEntitlement_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VipGrant` (
    `id` VARCHAR(191) NOT NULL,
    `vipEntitlementId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `sourceType` VARCHAR(80) NOT NULL,
    `sourceId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `previousExpiresAt` DATETIME(3) NULL,
    `newExpiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VipGrant_idempotencyKey_key`(`idempotencyKey`),
    INDEX `VipGrant_accountId_grantedAt_idx`(`accountId`, `grantedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VipBenefitConfig` (
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL,
    `xpBonusPercent` INTEGER NOT NULL DEFAULT 0,
    `dropBonusPercent` INTEGER NOT NULL DEFAULT 0,
    `chaosMachineBonusPercent` INTEGER NOT NULL DEFAULT 0,
    `resetBenefitEnabled` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`tier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccountTermsAcceptance` ADD CONSTRAINT `AccountTermsAcceptance_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletLedgerEntry` ADD CONSTRAINT `WalletLedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletLedgerEntry` ADD CONSTRAINT `WalletLedgerEntry_counterpartyAccountId_fkey` FOREIGN KEY (`counterpartyAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipEntitlement` ADD CONSTRAINT `VipEntitlement_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VipGrant` ADD CONSTRAINT `VipGrant_vipEntitlementId_fkey` FOREIGN KEY (`vipEntitlementId`) REFERENCES `VipEntitlement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
