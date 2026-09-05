-- Phase P (2026-08-31): payment antifraud foundation (PaymentRiskSignal/
-- PaymentRiskCase/PaymentRiskCaseAction) and a formal chargeback case
-- model (ChargebackCase), replacing the previously-informal
-- MANUAL_REVIEW + "charged_back:" prefix convention.
--
-- Only the four new tables and their foreign keys are included here.
-- `prisma migrate diff` against the live local dev DB also reported
-- unrelated pre-existing drift (playerpreference/communitycommentrevision/
-- communitypostrevision/ShopProduct index changes) from earlier,
-- untracked local migrations -- deliberately NOT included in this
-- migration, which is scoped to Phase P's own schema additions only.

-- CreateTable
CREATE TABLE `PaymentRiskSignal` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `signalType` ENUM('NEW_ACCOUNT_HIGH_VALUE_PURCHASE', 'MULTIPLE_FAILED_PAYMENTS', 'REPEATED_CHARGEBACK', 'RAPID_PURCHASE_SEQUENCE', 'DELIVERY_ANOMALY', 'PROVIDER_REVIEW_STATE', 'IMMEDIATE_WCOIN_TRANSFER', 'NEAR_FULL_BALANCE_TRANSFER', 'MANY_RECIPIENTS_AFTER_PURCHASE', 'REPEATED_RECIPIENT_NETWORK', 'PAYMENT_ACCOUNT_MISMATCH') NOT NULL,
    `severity` ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `sourceType` VARCHAR(80) NULL,
    `sourceId` VARCHAR(191) NULL,
    `reason` TEXT NOT NULL,
    `evidence` JSON NULL,
    `riskCaseId` VARCHAR(191) NULL,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentRiskSignal_accountId_detectedAt_idx`(`accountId`, `detectedAt`),
    INDEX `PaymentRiskSignal_signalType_idx`(`signalType`),
    INDEX `PaymentRiskSignal_riskCaseId_idx`(`riskCaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRiskCase` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED_FRAUD', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `highestSeverity` ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `summary` TEXT NOT NULL,
    `reviewNotes` TEXT NULL,
    `resolution` TEXT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `resolvedByAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentRiskCase_accountId_idx`(`accountId`),
    INDEX `PaymentRiskCase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRiskCaseAction` (
    `id` VARCHAR(191) NOT NULL,
    `riskCaseId` VARCHAR(191) NOT NULL,
    `action` ENUM('MANUAL_REVIEW', 'PAYMENT_RESTRICTION', 'TRANSFER_RESTRICTION', 'ACCOUNT_RESTRICTION') NOT NULL,
    `reason` TEXT NOT NULL,
    `performedByAccountId` VARCHAR(191) NOT NULL,
    `performedByUsername` VARCHAR(191) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `liftedAt` DATETIME(3) NULL,
    `liftedByAccountId` VARCHAR(191) NULL,

    INDEX `PaymentRiskCaseAction_riskCaseId_idx`(`riskCaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChargebackCase` (
    `id` VARCHAR(191) NOT NULL,
    `rechargeIntentId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `provider` VARCHAR(40) NOT NULL,
    `externalOrderId` VARCHAR(191) NULL,
    `currency` ENUM('WCOIN', 'GOBLIN_POINT', 'HUNT_POINT') NOT NULL,
    `originalAmountCredited` INTEGER NOT NULL,
    `accountBalanceAtCaseOpen` INTEGER NULL,
    `dispersalTraceSnapshot` JSON NULL,
    `providerChargebackReason` TEXT NULL,
    `sourceWebhookEventId` VARCHAR(191) NULL,
    `chargebackDate` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED_FRAUD', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `reviewNotes` TEXT NULL,
    `resolution` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedByAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChargebackCase_rechargeIntentId_key`(`rechargeIntentId`),
    INDEX `ChargebackCase_accountId_idx`(`accountId`),
    INDEX `ChargebackCase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentRiskSignal` ADD CONSTRAINT `PaymentRiskSignal_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRiskSignal` ADD CONSTRAINT `PaymentRiskSignal_riskCaseId_fkey` FOREIGN KEY (`riskCaseId`) REFERENCES `PaymentRiskCase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRiskCase` ADD CONSTRAINT `PaymentRiskCase_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRiskCaseAction` ADD CONSTRAINT `PaymentRiskCaseAction_riskCaseId_fkey` FOREIGN KEY (`riskCaseId`) REFERENCES `PaymentRiskCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_rechargeIntentId_fkey` FOREIGN KEY (`rechargeIntentId`) REFERENCES `RechargeIntent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
