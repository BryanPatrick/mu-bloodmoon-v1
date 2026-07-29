-- Blood Moon community social foundation
-- CreateTable
CREATE TABLE `CommunityProfile` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(512) NULL,
    `coverUrl` VARCHAR(512) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `socialSuspendedUntil` DATETIME(3) NULL,
    `postBlockedUntil` DATETIME(3) NULL,
    `commentBlockedUntil` DATETIME(3) NULL,
    `messagesLimitedUntil` DATETIME(3) NULL,
    `reachLimitedUntil` DATETIME(3) NULL,
    `warningCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityProfile_accountId_key`(`accountId`),
    INDEX `CommunityProfile_displayName_idx`(`displayName`),
    INDEX `CommunityProfile_socialSuspendedUntil_idx`(`socialSuspendedUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityPost` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `media` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'HIDDEN', 'REMOVED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `reachLimited` BOOLEAN NOT NULL DEFAULT false,
    `administrativeEdit` BOOLEAN NOT NULL DEFAULT false,
    `administrativeNote` TEXT NULL,
    `editedBy` VARCHAR(191) NULL,
    `hiddenBy` VARCHAR(191) NULL,
    `hiddenAt` DATETIME(3) NULL,
    `removedBy` VARCHAR(191) NULL,
    `removedAt` DATETIME(3) NULL,
    `deletionReason` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityPost_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `CommunityPost_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `CommunityPost_isPinned_isFeatured_createdAt_idx`(`isPinned`, `isFeatured`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityPostRevision` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `media` JSON NULL,
    `editedBy` VARCHAR(191) NOT NULL,
    `editorRole` VARCHAR(40) NOT NULL,
    `reason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityPostRevision_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityComment` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'HIDDEN', 'REMOVED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `hiddenBy` VARCHAR(191) NULL,
    `hiddenAt` DATETIME(3) NULL,
    `removedBy` VARCHAR(191) NULL,
    `removedAt` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityComment_postId_status_createdAt_idx`(`postId`, `status`, `createdAt`),
    INDEX `CommunityComment_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `CommunityComment_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityReaction` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `commentId` VARCHAR(191) NULL,
    `type` VARCHAR(40) NOT NULL DEFAULT 'LIKE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityReaction_postId_type_idx`(`postId`, `type`),
    INDEX `CommunityReaction_commentId_type_idx`(`commentId`, `type`),
    UNIQUE INDEX `CommunityReaction_accountId_postId_type_key`(`accountId`, `postId`, `type`),
    UNIQUE INDEX `CommunityReaction_accountId_commentId_type_key`(`accountId`, `commentId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityReport` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reportedUserId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `commentId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `evidence` JSON NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'RESOLVED', 'REJECTED', 'ESCALATED', 'REOPENED') NOT NULL DEFAULT 'NEW',
    `assigneeId` VARCHAR(191) NULL,
    `decision` TEXT NULL,
    `internalNotes` TEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityReport_status_priority_createdAt_idx`(`status`, `priority`, `createdAt`),
    INDEX `CommunityReport_assigneeId_status_idx`(`assigneeId`, `status`),
    INDEX `CommunityReport_reportedUserId_createdAt_idx`(`reportedUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityModerationAction` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `type` ENUM('WARNING', 'SOCIAL_SUSPENSION', 'POST_BLOCK', 'COMMENT_BLOCK', 'MESSAGE_LIMIT', 'AVATAR_REMOVAL', 'COVER_REMOVAL', 'REACH_LIMIT') NOT NULL,
    `reason` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `restoredAt` DATETIME(3) NULL,
    `restoredBy` VARCHAR(191) NULL,
    `evidence` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityModerationAction_profileId_type_createdAt_idx`(`profileId`, `type`, `createdAt`),
    INDEX `CommunityModerationAction_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityAchievement` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `rarity` ENUM('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL DEFAULT 'COMMON',
    `points` INTEGER NOT NULL DEFAULT 0,
    `condition` JSON NULL,
    `imageUrl` VARCHAR(512) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityAchievement_slug_key`(`slug`),
    INDEX `CommunityAchievement_isActive_category_idx`(`isActive`, `category`),
    INDEX `CommunityAchievement_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityAchievementGrant` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `grantedBy` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `progressData` JSON NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedBy` VARCHAR(191) NULL,
    `revokeReason` TEXT NULL,

    INDEX `CommunityAchievementGrant_accountId_grantedAt_idx`(`accountId`, `grantedAt`),
    UNIQUE INDEX `CommunityAchievementGrant_achievementId_accountId_key`(`achievementId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityQuest` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `objective` JSON NOT NULL,
    `reward` JSON NOT NULL,
    `audience` JSON NULL,
    `participantLimit` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `publishedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityQuest_slug_key`(`slug`),
    INDEX `CommunityQuest_status_startsAt_endsAt_idx`(`status`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityQuestParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `questId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `progressData` JSON NULL,
    `completedAt` DATETIME(3) NULL,
    `rewardedAt` DATETIME(3) NULL,
    `validatedBy` VARCHAR(191) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityQuestParticipant_questId_completedAt_idx`(`questId`, `completedAt`),
    UNIQUE INDEX `CommunityQuestParticipant_questId_accountId_key`(`questId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityBadge` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `imageUrl` VARCHAR(512) NULL,
    `visibility` VARCHAR(40) NOT NULL DEFAULT 'PUBLIC',
    `maxGrants` INTEGER NULL,
    `validDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityBadge_slug_key`(`slug`),
    INDEX `CommunityBadge_isActive_visibility_idx`(`isActive`, `visibility`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityBadgeGrant` (
    `id` VARCHAR(191) NOT NULL,
    `badgeId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `grantedBy` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `removedAt` DATETIME(3) NULL,
    `removedBy` VARCHAR(191) NULL,

    INDEX `CommunityBadgeGrant_accountId_expiresAt_idx`(`accountId`, `expiresAt`),
    UNIQUE INDEX `CommunityBadgeGrant_badgeId_accountId_key`(`badgeId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityPolicy` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `blockedWords` JSON NULL,
    `allowedDomains` JSON NULL,
    `blockedDomains` JSON NULL,
    `spamRules` JSON NULL,
    `maxPostsPerHour` INTEGER NOT NULL DEFAULT 10,
    `maxCommentsPerHour` INTEGER NOT NULL DEFAULT 40,
    `postCooldownSeconds` INTEGER NOT NULL DEFAULT 30,
    `commentCooldownSeconds` INTEGER NOT NULL DEFAULT 10,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityTask` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `assigneeId` VARCHAR(191) NULL,
    `dueAt` DATETIME(3) NULL,
    `evidence` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityTask_assigneeId_status_idx`(`assigneeId`, `status`),
    INDEX `CommunityTask_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `CommunityTask_dueAt_status_idx`(`dueAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommunityProfile` ADD CONSTRAINT `CommunityProfile_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityPostRevision` ADD CONSTRAINT `CommunityPostRevision_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityComment` ADD CONSTRAINT `CommunityComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityComment` ADD CONSTRAINT `CommunityComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityComment` ADD CONSTRAINT `CommunityComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CommunityComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReaction` ADD CONSTRAINT `CommunityReaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReaction` ADD CONSTRAINT `CommunityReaction_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReaction` ADD CONSTRAINT `CommunityReaction_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `CommunityComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityReport` ADD CONSTRAINT `CommunityReport_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `CommunityComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityModerationAction` ADD CONSTRAINT `CommunityModerationAction_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CommunityProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityAchievementGrant` ADD CONSTRAINT `CommunityAchievementGrant_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `CommunityAchievement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityAchievementGrant` ADD CONSTRAINT `CommunityAchievementGrant_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityQuestParticipant` ADD CONSTRAINT `CommunityQuestParticipant_questId_fkey` FOREIGN KEY (`questId`) REFERENCES `CommunityQuest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityQuestParticipant` ADD CONSTRAINT `CommunityQuestParticipant_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityBadgeGrant` ADD CONSTRAINT `CommunityBadgeGrant_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `CommunityBadge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityBadgeGrant` ADD CONSTRAINT `CommunityBadgeGrant_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
