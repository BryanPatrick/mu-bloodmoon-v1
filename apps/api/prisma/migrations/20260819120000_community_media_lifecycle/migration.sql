-- AlterTable
ALTER TABLE `CommunityMedia`
    ADD COLUMN `declaredMimeType` VARCHAR(100) NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    ADD COLUMN `storageProvider` VARCHAR(20) NOT NULL DEFAULT 'local',
    MODIFY `url` VARCHAR(512) NULL,
    MODIFY `mimeType` VARCHAR(100) NULL,
    MODIFY `extension` VARCHAR(12) NULL,
    MODIFY `width` INTEGER NULL,
    MODIFY `height` INTEGER NULL;
