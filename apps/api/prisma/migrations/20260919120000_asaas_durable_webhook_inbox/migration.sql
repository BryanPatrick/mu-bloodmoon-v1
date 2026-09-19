-- Phase 7E: extend the existing event audit into a leased, retryable inbox.
-- No existing event, unique identity, or historical audit row is removed.
ALTER TABLE `PaymentWebhookEvent`
    ADD COLUMN `processingOwner` VARCHAR(191) NULL,
    ADD COLUMN `processingStartedAt` DATETIME(3) NULL,
    ADD COLUMN `leaseExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `nextAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `lastErrorCode` VARCHAR(80) NULL,
    ADD COLUMN `lastErrorAt` DATETIME(3) NULL;

CREATE INDEX `PaymentWebhookEvent_inbox_claim_idx`
    ON `PaymentWebhookEvent`(`provider`, `status`, `nextAttemptAt`, `leaseExpiresAt`);
