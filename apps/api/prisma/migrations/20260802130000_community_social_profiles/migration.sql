ALTER TABLE `CommunityProfile`
  ADD COLUMN `mainCharacterName` VARCHAR(100) NULL,
  ADD COLUMN `mainCharacterClass` VARCHAR(100) NULL,
  ADD COLUMN `guildName` VARCHAR(100) NULL,
  ADD COLUMN `featuredAchievementIds` JSON NULL,
  ADD COLUMN `profileVisibility` VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN `charactersVisibility` VARCHAR(20) NOT NULL DEFAULT 'MAIN_ONLY',
  ADD COLUMN `equipmentVisibility` VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN `statisticsVisibility` VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN `guildVisibility` VARCHAR(20) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN `activityVisibility` VARCHAR(20) NOT NULL DEFAULT 'VISIBLE';

ALTER TABLE `CommunityModerationAction`
  MODIFY COLUMN `type` ENUM('WARNING','SOCIAL_SUSPENSION','POST_BLOCK','COMMENT_BLOCK','MESSAGE_LIMIT','AVATAR_REMOVAL','COVER_REMOVAL','BIO_REMOVAL','USERNAME_CHANGE','REACH_LIMIT') NOT NULL;

ALTER TABLE `CommunityPolicy`
  ADD COLUMN `usernameCooldownDays` INTEGER NOT NULL DEFAULT 30;

CREATE TABLE `CommunityFollow` (
  `id` VARCHAR(191) NOT NULL,
  `followerId` VARCHAR(191) NOT NULL,
  `followingId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CommunityFollow_followerId_followingId_key`(`followerId`, `followingId`),
  INDEX `CommunityFollow_followingId_createdAt_idx`(`followingId`, `createdAt`),
  INDEX `CommunityFollow_followerId_createdAt_idx`(`followerId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityUsernameHistory` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `oldUsername` VARCHAR(191) NOT NULL,
  `newUsername` VARCHAR(191) NOT NULL,
  `changedBy` VARCHAR(191) NOT NULL,
  `reason` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CommunityUsernameHistory_accountId_createdAt_idx`(`accountId`, `createdAt`),
  INDEX `CommunityUsernameHistory_newUsername_idx`(`newUsername`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
