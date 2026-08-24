-- Phase 3D-A: durable command transport inbox. This stores ciphertext only;
-- no Portal password, MU plaintext credential, key, or SQL diagnostics.
CREATE TABLE IF NOT EXISTS game_command (
  command_id TEXT PRIMARY KEY,
  provisioning_request_id TEXT NOT NULL UNIQUE,
  command_type TEXT NOT NULL CHECK (command_type = 'CREATE_GAME_ACCOUNT'),
  environment TEXT NOT NULL,
  server_id TEXT NOT NULL,
  legacy_login TEXT NOT NULL,
  credential_ciphertext TEXT NOT NULL,
  credential_nonce TEXT NOT NULL,
  credential_tag TEXT NOT NULL,
  credential_key_version TEXT NOT NULL,
  credential_algorithm TEXT NOT NULL CHECK (credential_algorithm = 'AES-256-GCM'),
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_command_claim
  ON game_command(environment, server_id, status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_game_command_retention
  ON game_command(status, completed_at);
