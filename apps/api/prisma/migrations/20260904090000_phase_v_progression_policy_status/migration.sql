-- AlterTable
ALTER TABLE `progressionconfigitem` ADD COLUMN `policyStatus` ENUM('NOT_EVALUATED', 'APPROVED', 'EFFECTIVE_BUT_UNAPPROVED', 'POLICY_DRIFT', 'DISABLED', 'UNKNOWN') NOT NULL DEFAULT 'NOT_EVALUATED';

-- CreateIndex
CREATE INDEX `ProgressionConfigItem_policyStatus_idx` ON `ProgressionConfigItem`(`policyStatus`);
