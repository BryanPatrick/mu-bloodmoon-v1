-- Phase 3D-A: encrypted MU credential envelope. Never plaintext and never key material.
CREATE TABLE `GameAccountCredential` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `commandId` VARCHAR(191) NOT NULL,
    `legacyLogin` VARCHAR(10) NOT NULL,
    `ciphertext` TEXT NOT NULL,
    `nonce` VARCHAR(64) NOT NULL,
    `tag` VARCHAR(64) NOT NULL,
    `keyVersion` VARCHAR(20) NOT NULL,
    `algorithm` VARCHAR(40) NOT NULL,
    `envelopeCreatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `GameAccountCredential_accountId_key`(`accountId`),
    UNIQUE INDEX `GameAccountCredential_commandId_key`(`commandId`),
    INDEX `GameAccountCredential_keyVersion_idx`(`keyVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GameAccountCredential` ADD CONSTRAINT `GameAccountCredential_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
