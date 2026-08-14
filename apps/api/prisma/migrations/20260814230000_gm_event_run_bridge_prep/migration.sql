-- GameBridge groundwork (Etapa 9): prepares GmEventRun to carry a
-- correlation/idempotency id and an external result/error pair for a
-- future real GameBridge connection. No behavior changes to existing rows;
-- correlationId is backfilled for safety in case any row already exists.
ALTER TABLE `GmEventRun`
  ADD COLUMN `correlationId` VARCHAR(191) NULL,
  ADD COLUMN `bridgeAttempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `externalResult` JSON NULL,
  ADD COLUMN `externalError` TEXT NULL;

UPDATE `GmEventRun` SET `correlationId` = UUID() WHERE `correlationId` IS NULL;

ALTER TABLE `GmEventRun`
  MODIFY COLUMN `correlationId` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `GmEventRun_correlationId_key` ON `GmEventRun` (`correlationId`);
