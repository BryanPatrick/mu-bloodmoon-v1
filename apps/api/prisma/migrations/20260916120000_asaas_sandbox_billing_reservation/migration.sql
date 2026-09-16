-- Local-only Phase 2 schema. Do not apply to production in this phase.
CREATE TABLE `BillingProfile` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `legalNameCiphertext` TEXT NOT NULL,
    `cpfCnpjCiphertext` TEXT NOT NULL,
    `country` VARCHAR(2) NOT NULL DEFAULT 'BR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `BillingProfile_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProviderCustomer` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `environment` VARCHAR(20) NOT NULL,
    `externalReference` VARCHAR(191) NOT NULL,
    `providerCustomerId` VARCHAR(191) NULL,
    `createState` ENUM('NONE', 'RESERVED', 'RECONCILE_REQUIRED', 'CREATED') NOT NULL DEFAULT 'NONE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ProviderCustomer_accountId_provider_environment_key`(`accountId`, `provider`, `environment`),
    UNIQUE INDEX `ProviderCustomer_provider_environment_externalReference_key`(`provider`, `environment`, `externalReference`),
    UNIQUE INDEX `ProviderCustomer_provider_environment_providerCustomerId_key`(`provider`, `environment`, `providerCustomerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RechargeIntent`
    ADD COLUMN `providerEnvironment` VARCHAR(20) NOT NULL DEFAULT 'production',
    ADD COLUMN `providerCreateState` ENUM('NONE', 'RESERVED', 'RECONCILE_REQUIRED', 'CREATED') NOT NULL DEFAULT 'NONE';

DROP INDEX `RechargeIntent_externalOrderId_idx` ON `RechargeIntent`;
CREATE UNIQUE INDEX `RechargeIntent_provider_providerEnvironment_externalOrderId_key`
    ON `RechargeIntent`(`provider`, `providerEnvironment`, `externalOrderId`);

ALTER TABLE `BillingProfile` ADD CONSTRAINT `BillingProfile_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProviderCustomer` ADD CONSTRAINT `ProviderCustomer_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
