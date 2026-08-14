ALTER TABLE `GmOccurrence`
  ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM' AFTER `type`;

CREATE INDEX `GmOccurrence_priority_status_idx` ON `GmOccurrence` (`priority`, `status`);
