-- Blood Moon Game Data Worker -- D1 schema (Game Data Platform Phase 1).
-- Current-state and small bounded metadata only -- never unlimited raw
-- telemetry. See docs/game-data/architecture.md.

-- Transport-level replay protection (distinct from event_dedupe below).
-- INSERT-first is the authority: a UNIQUE-constraint failure on (nonce,
-- scope) *is* the replay detection, never a prior SELECT.
CREATE TABLE IF NOT EXISTS request_nonce (
  nonce TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (nonce, scope)
);

-- Business-level event deduplication (distinct from request_nonce above).
-- No payload stored -- bounded retention keeps this table small forever.
-- Removing an old row here must never let a late retry regress
-- current-state: that protection comes from source_sequence on the
-- current-state tables below, independent of this table's retention.
CREATE TABLE IF NOT EXISTS event_dedupe (
  event_id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL
);

-- One row per character, UPSERTed. source_sequence is scoped to `source`
-- (not globally comparable) -- see docs/game-data/architecture.md.
CREATE TABLE IF NOT EXISTS character_reset_state (
  character_id TEXT PRIMARY KEY,
  character_name TEXT NOT NULL,
  reset_count INTEGER NOT NULL,
  master_reset_count INTEGER NOT NULL,
  master_level INTEGER NOT NULL,
  source TEXT NOT NULL,
  server_id TEXT NOT NULL,
  source_sequence INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ranking_state (
  leaderboard TEXT NOT NULL,
  character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  source TEXT NOT NULL,
  server_id TEXT NOT NULL,
  source_sequence INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (leaderboard, character_id)
);

-- Bridge (Agent connectivity) health only -- never GAME_SERVER_STATUS.
-- HEALTHY/STALE/OFFLINE is derived at read time from last_seen_at, not
-- stored, so there is nothing here to go stale on its own.
CREATE TABLE IF NOT EXISTS agent_heartbeats (
  agent_id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  buffer_state TEXT NOT NULL,
  buffer_depth INTEGER NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- Phase 2D addition (see db/migrations/0002_account_snapshot_state.sql).
-- Persists the "account.snapshot" event type -- Phase 2B/2C's real,
-- account-scoped GameBridge read model. payload_json is already sanitized
-- at the source (no memb___id, no personal data, no blobs).
CREATE TABLE IF NOT EXISTS account_snapshot_state (
  account_id INTEGER PRIMARY KEY,
  payload_json TEXT NOT NULL,
  source TEXT NOT NULL,
  server_id TEXT NOT NULL,
  source_sequence INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
