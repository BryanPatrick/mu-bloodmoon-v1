-- CreateTable
CREATE TABLE `Guild` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `tag` VARCHAR(10) NOT NULL,
    `description` TEXT NULL,
    `emblemUrl` VARCHAR(512) NULL,
    `bannerUrl` VARCHAR(512) NULL,
    `recruitment` ENUM('OPEN', 'APPROVAL_REQUIRED', 'INVITE_ONLY', 'CLOSED') NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    `guildLevel` INTEGER NOT NULL DEFAULT 1,
    `guildXp` INTEGER NOT NULL DEFAULT 0,
    `leaderMemberId` VARCHAR(191) NULL,
    `foundedByAccountId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'DISBANDED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `source` ENUM('PORTAL', 'GAME', 'IMPORTED') NOT NULL DEFAULT 'PORTAL',
    `gameGuildId` VARCHAR(100) NULL,
    `gameGuildName` VARCHAR(100) NULL,
    `gameGuildTag` VARCHAR(10) NULL,
    `syncStatus` ENUM('NOT_LINKED', 'PENDING', 'LINKED', 'ERROR') NOT NULL DEFAULT 'NOT_LINKED',
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Guild_slug_key`(`slug`),
    INDEX `Guild_status_idx`(`status`),
    INDEX `Guild_recruitment_idx`(`recruitment`),
    INDEX `Guild_source_syncStatus_idx`(`source`, `syncStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildMember` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `roleKey` VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    `memberXp` INTEGER NOT NULL DEFAULT 0,
    `contributionScore` INTEGER NOT NULL DEFAULT 0,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `invitedBy` VARCHAR(191) NULL,
    `removedAt` DATETIME(3) NULL,
    `removedBy` VARCHAR(191) NULL,
    `removedReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GuildMember_characterId_key`(`characterId`),
    INDEX `GuildMember_guildId_roleKey_idx`(`guildId`, `roleKey`),
    INDEX `GuildMember_accountId_idx`(`accountId`),
    INDEX `GuildMember_removedAt_idx`(`removedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildJoinRequest` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `decidedBy` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `decisionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildJoinRequest_accountId_idx`(`accountId`),
    INDEX `GuildJoinRequest_status_idx`(`status`),
    INDEX `GuildJoinRequest_guildId_characterId_status_idx`(`guildId`, `characterId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildFocusAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `tag` ENUM('PVP', 'PVE', 'CASTLE_SIEGE', 'BOSS', 'FARM', 'EVENTS', 'CASUAL', 'COMPETITIVE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GuildFocusAssignment_guildId_tag_key`(`guildId`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildLevelConfig` (
    `id` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `xpRequired` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `perks` JSON NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GuildLevelConfig_level_key`(`level`),
    INDEX `GuildLevelConfig_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildXpConversionRule` (
    `id` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(40) NOT NULL,
    `resourceKey` VARCHAR(60) NOT NULL,
    `amountRequired` BIGINT NOT NULL,
    `guildXpGranted` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `seasonId` VARCHAR(60) NULL,
    `perGuildLimit` INTEGER NULL,
    `perMemberLimit` INTEGER NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildXpConversionRule_active_idx`(`active`),
    INDEX `GuildXpConversionRule_resourceKey_idx`(`resourceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildRequest` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `createdByAccountId` VARCHAR(191) NOT NULL,
    `createdByCharacterId` VARCHAR(191) NULL,
    `type` ENUM('ITEM', 'JEWEL', 'ZEN', 'WCOIN', 'GOBLIN_POINT', 'HUNT_POINT', 'INVESTMENT', 'EQUIPMENT', 'LOOKING_FOR_ITEM', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NULL,
    `status` ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `disclaimer` TEXT NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildRequest_guildId_status_idx`(`guildId`, `status`),
    INDEX `GuildRequest_createdByAccountId_idx`(`createdByAccountId`),
    INDEX `GuildRequest_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildProject` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `goal` TEXT NULL,
    `ownerAccountId` VARCHAR(191) NOT NULL,
    `contributors` JSON NULL,
    `requiredResources` JSON NULL,
    `availableResources` JSON NULL,
    `relatedPlayers` JSON NULL,
    `status` ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNING',
    `deadline` DATETIME(3) NULL,
    `impact` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildProject_guildId_status_idx`(`guildId`, `status`),
    INDEX `GuildProject_ownerAccountId_idx`(`ownerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildMedia` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `uploadedByAccountId` VARCHAR(191) NOT NULL,
    `kind` ENUM('EMBLEM', 'BANNER') NOT NULL,
    `status` ENUM('READY', 'REMOVED') NOT NULL DEFAULT 'READY',
    `url` VARCHAR(512) NOT NULL,
    `storagePath` VARCHAR(512) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `extension` VARCHAR(10) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `sha256` VARCHAR(64) NOT NULL,
    `removedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildMedia_guildId_kind_idx`(`guildId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildTreasury` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GuildTreasury_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildTreasuryBalance` (
    `id` VARCHAR(191) NOT NULL,
    `guildTreasuryId` VARCHAR(191) NOT NULL,
    `resourceType` VARCHAR(40) NOT NULL,
    `resourceKey` VARCHAR(60) NOT NULL,
    `availableAmount` BIGINT NOT NULL DEFAULT 0,
    `reservedAmount` BIGINT NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GuildTreasuryBalance_guildTreasuryId_resourceKey_key`(`guildTreasuryId`, `resourceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildVault` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GuildVault_guildId_key`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildVaultItem` (
    `id` VARCHAR(191) NOT NULL,
    `guildVaultId` VARCHAR(191) NOT NULL,
    `itemRef` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildVaultItem_guildVaultId_idx`(`guildVaultId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildMovement` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `type` ENUM('DONATION', 'ALLOCATION', 'LOAN', 'REWARD', 'EVENT', 'SALE', 'PROJECT', 'OTHER') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `resourceKey` VARCHAR(60) NOT NULL,
    `amount` BIGINT NOT NULL,
    `requestedByAccountId` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `beforeBalance` JSON NULL,
    `afterBalance` JSON NULL,
    `correlationId` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuildMovement_guildId_status_idx`(`guildId`, `status`),
    INDEX `GuildMovement_resourceKey_idx`(`resourceKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildMovementApproval` (
    `id` VARCHAR(191) NOT NULL,
    `guildMovementId` VARCHAR(191) NOT NULL,
    `approverAccountId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `note` TEXT NULL,
    `decidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuildMovementApproval_guildMovementId_idx`(`guildMovementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guild` ADD CONSTRAINT `Guild_foundedByAccountId_fkey` FOREIGN KEY (`foundedByAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMember` ADD CONSTRAINT `GuildMember_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMember` ADD CONSTRAINT `GuildMember_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `AccountCharacter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMember` ADD CONSTRAINT `GuildMember_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildJoinRequest` ADD CONSTRAINT `GuildJoinRequest_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildFocusAssignment` ADD CONSTRAINT `GuildFocusAssignment_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildRequest` ADD CONSTRAINT `GuildRequest_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildProject` ADD CONSTRAINT `GuildProject_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMedia` ADD CONSTRAINT `GuildMedia_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildTreasury` ADD CONSTRAINT `GuildTreasury_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildTreasuryBalance` ADD CONSTRAINT `GuildTreasuryBalance_guildTreasuryId_fkey` FOREIGN KEY (`guildTreasuryId`) REFERENCES `GuildTreasury`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildVault` ADD CONSTRAINT `GuildVault_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildVaultItem` ADD CONSTRAINT `GuildVaultItem_guildVaultId_fkey` FOREIGN KEY (`guildVaultId`) REFERENCES `GuildVault`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMovementApproval` ADD CONSTRAINT `GuildMovementApproval_guildMovementId_fkey` FOREIGN KEY (`guildMovementId`) REFERENCES `GuildMovement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

