-- Phase K (2026-08-30) Part 15: survey system architecture foundation.
-- No UI is built against this yet -- reserves the schema shape only, per
-- Bryan's explicit "do not build an unnecessarily huge frontend now."

-- CreateTable
CREATE TABLE `Survey` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(2000) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `participationMode` ENUM('ANONYMOUS', 'IDENTIFIED') NOT NULL DEFAULT 'ANONYMOUS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `type` ENUM('SINGLE_CHOICE', 'MULTI_CHOICE', 'RATING', 'FREE_TEXT') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,

    INDEX `SurveyQuestion_surveyId_idx`(`surveyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyOption` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `order` INTEGER NOT NULL,

    INDEX `SurveyOption_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `triggerType` ENUM('ACCOUNT_AGE', 'FIRST_RESET', 'POST_EVENT', 'POST_SUPPORT', 'POST_PURCHASE', 'OPEN_BETA', 'MANUAL_CAMPAIGN', 'PERIODIC') NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SurveyCampaign_surveyId_idx`(`surveyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyAudience` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `ruleType` VARCHAR(100) NOT NULL,
    `ruleValue` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SurveyAudience_campaignId_idx`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyResponse` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `anonymizedAt` DATETIME(3) NULL,

    INDEX `SurveyResponse_surveyId_idx`(`surveyId`),
    INDEX `SurveyResponse_campaignId_idx`(`campaignId`),
    INDEX `SurveyResponse_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SurveyAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `responseId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NULL,
    `freeText` VARCHAR(2000) NULL,

    INDEX `SurveyAnswer_responseId_idx`(`responseId`),
    INDEX `SurveyAnswer_questionId_idx`(`questionId`),
    INDEX `SurveyAnswer_optionId_idx`(`optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SurveyQuestion` ADD CONSTRAINT `SurveyQuestion_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyOption` ADD CONSTRAINT `SurveyOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `SurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyCampaign` ADD CONSTRAINT `SurveyCampaign_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAudience` ADD CONSTRAINT `SurveyAudience_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyResponse` ADD CONSTRAINT `SurveyResponse_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyResponse` ADD CONSTRAINT `SurveyResponse_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `SurveyCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SurveyResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `SurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SurveyAnswer` ADD CONSTRAINT `SurveyAnswer_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `SurveyOption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
