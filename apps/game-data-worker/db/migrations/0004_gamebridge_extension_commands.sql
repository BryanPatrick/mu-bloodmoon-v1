-- GameBridge extension plan (docs/gamebridge/gamebridge-agent-extension-plan.md)
-- Part 1/7/13: generalizes `game_command` from CREATE_GAME_ACCOUNT-only to
-- the four new operations (GRANT_VIP, SYNC_VIP_TIER, ANONYMIZE_GAME_ACCOUNT,
-- PURGE_GAME_ACCOUNT). SQLite/D1 can't ALTER a CHECK constraint or relax a
-- NOT NULL in place, so this rebuilds the table (standard SQLite migration
-- pattern) and copies any existing rows across unchanged.
--
-- New nullable columns:
--   legacy_login          -- was NOT NULL; still required by every command
--                             type in practice, enforced in application code
--                             (commands.ts) instead of the DB, since D1/SQLite
--                             CHECK constraints can't easily express
--                             "required unless X" per command_type.
--   credential_*          -- now nullable; only CREATE_GAME_ACCOUNT carries a
--                             credential envelope (plan Part 2: no other
--                             operation ever carries a secret in its payload).
--   payload_json           -- NEW. The generic small-JSON payload for the four
--                             new operations (targetLevel/desiredLevel/
--                             betaCycleId). CREATE_GAME_ACCOUNT never uses this.
--   result_detail_json     -- NEW. Generic result detail for the four new
--                             operations (previousLevel/newLevel/changed, or
--                             entities/tables affected) -- result_memb_guid
--                             stays CREATE_GAME_ACCOUNT-specific, unchanged.

PRAGMA foreign_keys=OFF;

CREATE TABLE game_command_new (
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

INSERT INTO game_command_new (
  command_id, provisioning_request_id, command_type, environment, server_id, legacy_login,
  credential_ciphertext, credential_nonce, credential_tag, credential_key_version, credential_algorithm,
  payload_json, request_hash, status, available_at, expires_at, claimed_at, claim_expires_at, claimed_by,
  attempt_count, completed_at, result_code, result_memb_guid, result_detail_json, created_at, updated_at
)
SELECT
  command_id, provisioning_request_id, command_type, environment, server_id, legacy_login,
  credential_ciphertext, credential_nonce, credential_tag, credential_key_version, credential_algorithm,
  NULL, request_hash, status, available_at, expires_at, claimed_at, claim_expires_at, claimed_by,
  attempt_count, completed_at, result_code, result_memb_guid, NULL, created_at, updated_at
FROM game_command;

DROP TABLE game_command;
ALTER TABLE game_command_new RENAME TO game_command;

CREATE INDEX IF NOT EXISTS idx_game_command_claim
  ON game_command(environment, server_id, status, available_at, created_at);
CREATE INDEX IF NOT EXISTS idx_game_command_retention
  ON game_command(status, completed_at);

PRAGMA foreign_keys=ON;
