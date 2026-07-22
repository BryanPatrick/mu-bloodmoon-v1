UPDATE `Account`
SET `role` = 'ADMIN'
WHERE `role` IN ('MODERATOR', 'GAME_MASTER');

ALTER TABLE `Account`
  MODIFY `role` ENUM('PLAYER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'PLAYER';

CREATE TABLE `AccountPermission` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AccountPermission_accountId_key_key` (`accountId`, `key`),
  INDEX `AccountPermission_accountId_idx` (`accountId`),
  INDEX `AccountPermission_key_idx` (`key`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AccountPermission_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
