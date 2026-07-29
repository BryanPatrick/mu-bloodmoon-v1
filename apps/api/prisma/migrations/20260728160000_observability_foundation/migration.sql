-- Expand the existing audit trail without breaking historical records.
ALTER TABLE `AuditEvent`
  ADD COLUMN `module` VARCHAR(100) NOT NULL DEFAULT 'system',
  ADD COLUMN `actorRole` VARCHAR(40) NULL,
  ADD COLUMN `targetUserId` VARCHAR(191) NULL,
  ADD COLUMN `beforeData` JSON NULL,
  ADD COLUMN `afterData` JSON NULL,
  ADD COLUMN `reason` TEXT NULL,
  ADD COLUMN `result` ENUM('SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED') NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN `ipAddress` VARCHAR(80) NULL,
  ADD COLUMN `userAgent` VARCHAR(512) NULL,
  ADD COLUMN `sessionId` VARCHAR(191) NULL,
  ADD COLUMN `correlationId` VARCHAR(80) NULL;

ALTER TABLE `AuditEvent`
  MODIFY COLUMN `action` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `targetType` VARCHAR(191) NOT NULL,
  MODIFY COLUMN `targetId` VARCHAR(191) NULL,
  MODIFY COLUMN `actorUsername` VARCHAR(191) NULL,
  MODIFY COLUMN `severity` VARCHAR(40) NOT NULL DEFAULT 'info';

CREATE INDEX `AuditEvent_module_createdAt_idx` ON `AuditEvent`(`module`, `createdAt`);
CREATE INDEX `AuditEvent_action_createdAt_idx` ON `AuditEvent`(`action`, `createdAt`);
CREATE INDEX `AuditEvent_targetType_targetId_idx` ON `AuditEvent`(`targetType`, `targetId`);
CREATE INDEX `AuditEvent_actorId_createdAt_idx` ON `AuditEvent`(`actorId`, `createdAt`);
CREATE INDEX `AuditEvent_targetUserId_createdAt_idx` ON `AuditEvent`(`targetUserId`, `createdAt`);
CREATE INDEX `AuditEvent_correlationId_idx` ON `AuditEvent`(`correlationId`);
CREATE INDEX `AuditEvent_result_createdAt_idx` ON `AuditEvent`(`result`, `createdAt`);

CREATE TABLE `AdminWorkLog` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NULL,
  `module` VARCHAR(100) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `taskId` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `startedAt` DATETIME(3) NOT NULL,
  `completedAt` DATETIME(3) NULL,
  `durationMinutes` INTEGER NULL,
  `evidence` JSON NULL,
  `result` ENUM('SUCCESS', 'PARTIAL', 'FAILURE', 'CANCELLED') NOT NULL DEFAULT 'SUCCESS',
  `correlationId` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `AdminWorkLog_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `AdminWorkLog_module_createdAt_idx`(`module`, `createdAt`),
  INDEX `AdminWorkLog_taskId_idx`(`taskId`),
  INDEX `AdminWorkLog_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `AdminWorkLog_correlationId_idx`(`correlationId`),
  INDEX `AdminWorkLog_result_createdAt_idx`(`result`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemError` (
  `id` VARCHAR(191) NOT NULL,
  `fingerprint` VARCHAR(191) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'ERROR',
  `errorCode` VARCHAR(191) NULL,
  `publicMessage` TEXT NOT NULL,
  `internalMessage` TEXT NOT NULL,
  `stackTrace` LONGTEXT NULL,
  `correlationId` VARCHAR(80) NULL,
  `userId` VARCHAR(191) NULL,
  `accountId` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `requestPath` VARCHAR(512) NULL,
  `requestMethod` VARCHAR(20) NULL,
  `environment` VARCHAR(40) NOT NULL DEFAULT 'production',
  `occurrenceCount` INTEGER NOT NULL DEFAULT 1,
  `firstOccurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastOccurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` ENUM('NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'WAITING', 'RESOLVED', 'IGNORED', 'REOPENED') NOT NULL DEFAULT 'NEW',
  `assignedTo` VARCHAR(191) NULL,
  `resolution` TEXT NULL,
  `resolvedBy` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `taskId` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `SystemError_fingerprint_key`(`fingerprint`),
  INDEX `SystemError_module_lastOccurredAt_idx`(`module`, `lastOccurredAt`),
  INDEX `SystemError_severity_status_idx`(`severity`, `status`),
  INDEX `SystemError_assignedTo_status_idx`(`assignedTo`, `status`),
  INDEX `SystemError_correlationId_idx`(`correlationId`),
  INDEX `SystemError_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `SystemError_taskId_idx`(`taskId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemErrorOccurrence` (
  `id` VARCHAR(191) NOT NULL,
  `systemErrorId` VARCHAR(191) NOT NULL,
  `correlationId` VARCHAR(80) NULL,
  `userId` VARCHAR(191) NULL,
  `requestPath` VARCHAR(512) NULL,
  `requestMethod` VARCHAR(20) NULL,
  `ipAddress` VARCHAR(80) NULL,
  `userAgent` VARCHAR(512) NULL,
  `metadata` JSON NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `SystemErrorOccurrence_systemErrorId_occurredAt_idx`(`systemErrorId`, `occurredAt`),
  INDEX `SystemErrorOccurrence_correlationId_idx`(`correlationId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SystemErrorOccurrence_systemErrorId_fkey`
    FOREIGN KEY (`systemErrorId`) REFERENCES `SystemError`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemErrorTimeline` (
  `id` VARCHAR(191) NOT NULL,
  `systemErrorId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorUsername` VARCHAR(191) NULL,
  `type` VARCHAR(80) NOT NULL,
  `fromStatus` VARCHAR(40) NULL,
  `toStatus` VARCHAR(40) NULL,
  `description` TEXT NOT NULL,
  `evidence` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `SystemErrorTimeline_systemErrorId_createdAt_idx`(`systemErrorId`, `createdAt`),
  INDEX `SystemErrorTimeline_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SystemErrorTimeline_systemErrorId_fkey`
    FOREIGN KEY (`systemErrorId`) REFERENCES `SystemError`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OperationalEvent` (
  `id` VARCHAR(191) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'INFO',
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `actorUserId` VARCHAR(191) NULL,
  `targetUserId` VARCHAR(191) NULL,
  `correlationId` VARCHAR(80) NULL,
  `description` TEXT NOT NULL,
  `data` JSON NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `OperationalEvent_module_occurredAt_idx`(`module`, `occurredAt`),
  INDEX `OperationalEvent_eventType_occurredAt_idx`(`eventType`, `occurredAt`),
  INDEX `OperationalEvent_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `OperationalEvent_correlationId_idx`(`correlationId`),
  INDEX `OperationalEvent_severity_occurredAt_idx`(`severity`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemAlert` (
  `id` VARCHAR(191) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `alertType` VARCHAR(191) NOT NULL,
  `severity` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `sourceType` VARCHAR(100) NULL,
  `sourceId` VARCHAR(191) NULL,
  `correlationId` VARCHAR(80) NULL,
  `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED') NOT NULL DEFAULT 'OPEN',
  `assignedTo` VARCHAR(191) NULL,
  `acknowledgedBy` VARCHAR(191) NULL,
  `acknowledgedAt` DATETIME(3) NULL,
  `resolvedBy` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `SystemAlert_status_severity_createdAt_idx`(`status`, `severity`, `createdAt`),
  INDEX `SystemAlert_module_createdAt_idx`(`module`, `createdAt`),
  INDEX `SystemAlert_assignedTo_status_idx`(`assignedTo`, `status`),
  INDEX `SystemAlert_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
  INDEX `SystemAlert_correlationId_idx`(`correlationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminLogExport` (
  `id` VARCHAR(191) NOT NULL,
  `requestedBy` VARCHAR(191) NOT NULL,
  `requestedByName` VARCHAR(191) NULL,
  `source` VARCHAR(80) NOT NULL,
  `format` VARCHAR(20) NOT NULL DEFAULT 'csv',
  `filters` JSON NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `recordCount` INTEGER NOT NULL DEFAULT 0,
  `fileName` VARCHAR(255) NULL,
  `checksum` VARCHAR(128) NULL,
  `errorMessage` TEXT NULL,
  `correlationId` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,

  INDEX `AdminLogExport_requestedBy_createdAt_idx`(`requestedBy`, `createdAt`),
  INDEX `AdminLogExport_source_status_idx`(`source`, `status`),
  INDEX `AdminLogExport_correlationId_idx`(`correlationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ObservabilityRetentionPolicy` (
  `id` VARCHAR(191) NOT NULL,
  `dataType` VARCHAR(80) NOT NULL,
  `retentionDays` INTEGER NOT NULL,
  `immutableForAdmin` BOOLEAN NOT NULL DEFAULT false,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ObservabilityRetentionPolicy_dataType_key`(`dataType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ObservabilityRetentionPolicy`
  (`id`, `dataType`, `retentionDays`, `immutableForAdmin`, `enabled`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'AUDIT', 3650, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'FINANCIAL', 3650, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'COMMERCIAL', 1825, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'WORK_LOG', 730, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'SYSTEM_ERROR', 365, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  (UUID(), 'OPERATIONAL_EVENT', 730, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Preserve current administrators during the deny-by-default permission rollout.
-- New ADMIN accounts receive no administrative access until a SUPER_ADMIN assigns it.
INSERT IGNORE INTO `AccountPermission`
  (`id`, `accountId`, `key`, `granted`, `createdAt`, `updatedAt`)
SELECT UUID(), account.`id`, permission.`key`, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Account` account
CROSS JOIN (
  SELECT 'admin.dashboard.view' AS `key`
  UNION ALL SELECT 'admin.accounts.view'
  UNION ALL SELECT 'admin.accounts.status.manage'
  UNION ALL SELECT 'admin.roles.manage'
  UNION ALL SELECT 'admin.content.manage'
  UNION ALL SELECT 'admin.audit.view'
  UNION ALL SELECT 'admin.audit.history.view'
  UNION ALL SELECT 'admin.audit.full.view'
  UNION ALL SELECT 'admin.work-logs.view'
  UNION ALL SELECT 'admin.work-logs.manage'
  UNION ALL SELECT 'admin.operational-logs.view'
  UNION ALL SELECT 'admin.errors.view'
  UNION ALL SELECT 'admin.errors.manage'
  UNION ALL SELECT 'admin.alerts.view'
  UNION ALL SELECT 'admin.alerts.manage'
  UNION ALL SELECT 'admin.logs.export'
  UNION ALL SELECT 'admin.retention.manage'
  UNION ALL SELECT 'admin.shop.manage'
  UNION ALL SELECT 'admin.orders.operate'
  UNION ALL SELECT 'admin.marketplace.manage'
  UNION ALL SELECT 'admin.game-bridge.manage'
  UNION ALL SELECT 'admin.finance.view'
  UNION ALL SELECT 'admin.finance.reports.view'
  UNION ALL SELECT 'admin.server-settings.manage'
  UNION ALL SELECT 'admin.game-data.view'
  UNION ALL SELECT 'admin.roadmap.view'
  UNION ALL SELECT 'admin.references.manage'
  UNION ALL SELECT 'admin.finance.manage'
  UNION ALL SELECT 'admin.recharge.manage'
  UNION ALL SELECT 'admin.system.manage'
) permission
WHERE account.`role` = 'ADMIN';
