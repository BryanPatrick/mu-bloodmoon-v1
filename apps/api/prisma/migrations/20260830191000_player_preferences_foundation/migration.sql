-- Phase K (2026-08-30): reusable player notification/visibility
-- preference architecture. No UI built against this yet. category is
-- fixed per definition key (ESSENTIAL definitions are never player-
-- togglable in this design) -- see the model comment in schema.prisma.

-- CreateTable
CREATE TABLE `PlayerPreferenceDefinition` (
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `description` VARCHAR(500) NULL,
    `category` ENUM('ESSENTIAL', 'OPTIONAL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerPreference` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `definitionKey` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerPreference_accountId_idx`(`accountId`),
    UNIQUE INDEX `PlayerPreference_accountId_definitionKey_key`(`accountId`, `definitionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlayerPreference` ADD CONSTRAINT `PlayerPreference_definitionKey_fkey` FOREIGN KEY (`definitionKey`) REFERENCES `PlayerPreferenceDefinition`(`key`) ON DELETE CASCADE ON UPDATE CASCADE;
