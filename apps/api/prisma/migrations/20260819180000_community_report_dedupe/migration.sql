-- AlterTable
ALTER TABLE `CommunityReport`
    ADD COLUMN `targetKey` VARCHAR(200) NULL,
    ADD COLUMN `openDedupeKey` INTEGER NULL;

-- Backfill targetKey for existing rows from their existing postId/commentId
-- (exactly one of the two is ever set).
UPDATE `CommunityReport` SET `targetKey` = CONCAT('post:', `postId`) WHERE `postId` IS NOT NULL;
UPDATE `CommunityReport` SET `targetKey` = CONCAT('comment:', `commentId`) WHERE `commentId` IS NOT NULL;

-- Backfill openDedupeKey for currently-open reports; closed ones keep NULL.
UPDATE `CommunityReport` SET `openDedupeKey` = 1
    WHERE `status` IN ('NEW', 'ASSIGNED', 'INVESTIGATING', 'WAITING_FOR_USER', 'ESCALATED', 'REOPENED');

-- Every row now has a targetKey -- make it required.
ALTER TABLE `CommunityReport` MODIFY `targetKey` VARCHAR(200) NOT NULL;

-- CreateIndex
-- At most one row per (reporterId, targetKey) can have the same
-- openDedupeKey value. Since only "1" is ever used for open reports, this
-- means at most one OPEN report per reporter+target -- enforced atomically
-- by MySQL itself, not by an application-level findFirst-then-create race.
-- Closed reports (openDedupeKey NULL) never collide with anything, per
-- MySQL's unique-index NULL semantics, so history and legitimate
-- re-reports after resolution stay unlimited.
CREATE UNIQUE INDEX `CommunityReport_reporterId_targetKey_openDedupeKey_key` ON `CommunityReport`(`reporterId`, `targetKey`, `openDedupeKey`);
