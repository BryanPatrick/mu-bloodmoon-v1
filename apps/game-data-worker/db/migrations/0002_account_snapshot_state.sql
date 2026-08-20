-- Blood Moon Game Data Worker -- Phase 2D addition.
-- Persists the "account.snapshot" event type (Phase 2B/2C's real,
-- account-scoped GameBridge read model -- AccountSnapshotChangeFactory),
-- the only event type the real SqlServerGameDatabaseReader can currently
-- produce (Phase 1's character.reset-state/ranking.state readers remain
-- BLOCKED_BY_SCHEMA_DISCOVERY, untouched). Same atomic sequence-guarded
-- UPSERT shape as 0001_init.sql's character_reset_state/ranking_state --
-- not a new pattern, the same one applied to a third event type.
--
-- payload_json is the exact AccountSnapshotChangeFactory.PayloadJson
-- string -- already sanitized at the source (no memb___id, no personal
-- data, no Inventory/Warehouse.Items/Quest/MagicList blobs -- see
-- docs/game-data/read-models/account-snapshot.md). Bounded: one row per
-- account, current-state only, never event history.
CREATE TABLE IF NOT EXISTS account_snapshot_state (
  account_id INTEGER PRIMARY KEY,
  payload_json TEXT NOT NULL,
  source TEXT NOT NULL,
  server_id TEXT NOT NULL,
  source_sequence INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
