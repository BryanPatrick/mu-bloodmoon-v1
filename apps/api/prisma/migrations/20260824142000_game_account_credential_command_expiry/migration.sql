-- Persist one immutable transport expiry so Portal retries reproduce the same request hash.
ALTER TABLE `GameAccountCredential` ADD COLUMN `commandExpiresAt` DATETIME(3) NULL;
UPDATE `GameAccountCredential` SET `commandExpiresAt` = DATE_ADD(`envelopeCreatedAt`, INTERVAL 1 HOUR) WHERE `commandExpiresAt` IS NULL;
ALTER TABLE `GameAccountCredential` MODIFY `commandExpiresAt` DATETIME(3) NOT NULL;
