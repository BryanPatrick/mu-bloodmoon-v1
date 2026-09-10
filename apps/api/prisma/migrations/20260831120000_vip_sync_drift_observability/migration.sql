-- PHASE L DECISION CLOSURE, Decision 2 (2026-08-31): VIP native drift
-- observability. Tracks repeated dbo.bm_SyncVipTier @PreviousLevel
-- divergence from VipSyncState.lastSyncedLevel for the same account, so a
-- one-off native write (corrected once) is distinguishable from a
-- recurring pattern worth investigating. See
-- apps/api/src/modules/vip-sync/vip-sync.service.ts and
-- docs/vip/wz-setaccountlevel-coexistence.md.
ALTER TABLE `VipSyncState`
  ADD COLUMN `driftCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastDriftAt` DATETIME(3) NULL;
