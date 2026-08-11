-- AlterTable
ALTER TABLE `RechargeIntent` ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `correlationId` VARCHAR(80) NULL,
    ADD COLUMN `externalOrderId` VARCHAR(191) NULL,
    ADD COLUMN `externalReference` VARCHAR(191) NULL,
    ADD COLUMN `externalStatus` VARCHAR(80) NULL,
    ADD COLUMN `externalStatusDetail` VARCHAR(191) NULL,
    ADD COLUMN `failureReason` VARCHAR(191) NULL,
    ADD COLUMN `lastWebhookAt` DATETIME(3) NULL,
    ADD COLUMN `manualReviewReason` TEXT NULL,
    ADD COLUMN `paymentIdempotencyKey` VARCHAR(191) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(60) NULL,
    ADD COLUMN `provider` VARCHAR(40) NOT NULL DEFAULT 'mercadopago',
    ADD COLUMN `refundReason` TEXT NULL,
    ADD COLUMN `refundedAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('PREPARED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW', 'REFUND_PENDING', 'REFUNDED') NOT NULL DEFAULT 'PREPARED';

-- CreateTable
CREATE TABLE `PaymentWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `topic` VARCHAR(80) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `externalOrderId` VARCHAR(191) NULL,
    `rechargeIntentId` VARCHAR(191) NULL,
    `signatureValid` BOOLEAN NOT NULL,
    `signatureHeader` TEXT NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
    `rawPayload` JSON NOT NULL,
    `processingError` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `PaymentWebhookEvent_externalOrderId_idx`(`externalOrderId`),
    INDEX `PaymentWebhookEvent_rechargeIntentId_idx`(`rechargeIntentId`),
    INDEX `PaymentWebhookEvent_status_receivedAt_idx`(`status`, `receivedAt`),
    UNIQUE INDEX `PaymentWebhookEvent_provider_topic_eventId_key`(`provider`, `topic`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `RechargeIntent_correlationId_key` ON `RechargeIntent`(`correlationId`);

-- CreateIndex
CREATE UNIQUE INDEX `RechargeIntent_externalReference_key` ON `RechargeIntent`(`externalReference`);

-- CreateIndex
CREATE UNIQUE INDEX `RechargeIntent_paymentIdempotencyKey_key` ON `RechargeIntent`(`paymentIdempotencyKey`);

-- CreateIndex
CREATE INDEX `RechargeIntent_externalOrderId_idx` ON `RechargeIntent`(`externalOrderId`);

-- AddForeignKey
ALTER TABLE `PaymentWebhookEvent` ADD CONSTRAINT `PaymentWebhookEvent_rechargeIntentId_fkey` FOREIGN KEY (`rechargeIntentId`) REFERENCES `RechargeIntent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
