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

-- Phase 3D-A, extended by the GameBridge extension plan (Part 1/7/13,
-- db/migrations/0004_gamebridge_extension_commands.sql) for GRANT_VIP/
-- SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT. Durable transport
-- state only. Portal remains the business authority and the Agent ledger
-- remains the execution/idempotency authority.
CREATE TABLE IF NOT EXISTS game_command (
  command_id TEXT PRIMARY KEY,
  provisioning_request_id TEXT NOT NULL UNIQUE,
  command_type TEXT NOT NULL CHECK (command_type IN (
    'CREATE_GAME_ACCOUNT', 'GRANT_VIP', 'SYNC_VIP_TIER', 'ANONYMIZE_GAME_ACCOUNT', 'PURGE_GAME_ACCOUNT'
  )),
  environment TEXT NOT NULL,
  server_id TEXT NOT NULL,
  legacy_login TEXT NULL,
  credential_ciphertext TEXT NULL,
  credential_nonce TEXT NULL,
  credential_tag TEXT NULL,
  credential_key_version TEXT NULL,
  credential_algorithm TEXT NULL CHECK (credential_algorithm IS NULL OR credential_algorithm = 'AES-256-GCM'),
  payload_json TEXT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CREATED','QUEUED','AVAILABLE','CLAIMED','SUCCEEDED','FAILED_RETRYABLE','FAILED_FINAL','EXPIRED')),
  available_at TEXT NULL,
  expires_at TEXT NOT NULL,
  claimed_at TEXT NULL,
  claim_expires_at TEXT NULL,
  claimed_by TEXT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NULL,
  result_code TEXT NULL,
  result_memb_guid INTEGER NULL,
  result_detail_json TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_command_claim
  ON game_command(environment, server_id, status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_game_command_retention
  ON game_command(status, completed_at);
