-- Phase K (2026-08-30) Part 12: records what happened when a contextual
-- retention offer was shown during the exit questionnaire (help offered,
-- help accepted, ticket created, deletion continued anyway). Observational
-- only -- nullable, never read back to gate anything.

-- AlterTable
ALTER TABLE `AccountDeletionFeedback` ADD COLUMN `retentionInteraction` JSON NULL;
