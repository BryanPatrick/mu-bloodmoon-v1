-- Phase 15: VipBenefitConfig gains two fields for the only benefit
-- categories Bryan approved as non-power "convenience" (warehouse pages,
-- command cost reduction) -- see docs/vip/vip-benefit-decisions.md.
-- Also seeds VipProductConfig with Bryan's real first commercial price
-- table (R$ = WCoin 1:1, per docs/product/ECONOMY_PRODUCT_DECISIONS.md).
-- Seeded with enabled=FALSE -- pricing exists and is admin-editable, but
-- public sales are not opened by this migration; that remains a separate
-- admin action once Bryan confirms go-live.
--
-- Deliberately EXCLUDES the same two pre-existing, unrelated drift items
-- already documented and excluded in the two prior Phase 13/14 migrations
-- (ShopProduct_status_idx; communitycommentrevision/communitypostrevision
-- column-default drift).

-- AlterTable
ALTER TABLE `VipBenefitConfig` ADD COLUMN `commandCostReductionPercent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `warehouseBonusPages` INTEGER NOT NULL DEFAULT 0;

-- Seed: Bryan's approved first commercial VIP price table (2026-08-30).
-- WCoin amounts equal the R$ values 1:1 (1 WC = R$1,00, established in
-- docs/product/ECONOMY_PRODUCT_DECISIONS.md). All rows start disabled --
-- opening sales is a separate, explicit admin action.
INSERT INTO `VipProductConfig` (`id`, `tier`, `durationDays`, `price`, `currency`, `enabled`, `updatedBy`, `createdAt`, `updatedAt`)
VALUES
  (UUID(), 'BRONZE', 7, 6, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'BRONZE', 15, 11, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'BRONZE', 30, 20, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'SILVER', 7, 9, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'SILVER', 15, 17, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'SILVER', 30, 30, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'GOLD', 7, 12, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'GOLD', 15, 23, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3)),
  (UUID(), 'GOLD', 30, 40, 'WCOIN', false, 'phase15-seed', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `price` = VALUES(`price`),
  `currency` = VALUES(`currency`),
  `updatedBy` = 'phase15-seed',
  `updatedAt` = NOW(3);
