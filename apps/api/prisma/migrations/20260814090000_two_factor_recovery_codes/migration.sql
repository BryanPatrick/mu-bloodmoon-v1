CREATE TABLE `TwoFactorRecoveryCode` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `codeHash` VARCHAR(191) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `TwoFactorRecoveryCode_accountId_usedAt_idx` (`accountId`, `usedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TwoFactorRecoveryCode_accountId_fkey`
    FOREIGN KEY (`accountId`) REFERENCES `Account` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
