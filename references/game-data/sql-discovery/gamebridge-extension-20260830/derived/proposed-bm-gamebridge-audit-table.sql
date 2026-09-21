-- QUOTED_IDENTIFIER ON is required by SQL Server for the filtered index
-- below (IX_bm_GameBridgeAudit_PurgeBatchId, WHERE PurgeBatchId IS NOT
-- NULL) -- sqlcmd's own default session setting is OFF, which fails with
-- Msg 1934 ("Failed to CREATE INDEX ... QUOTED_IDENTIFIER") when this
-- script is run via `sqlcmd -i` without this explicit SET (found for real,
-- 2026-08-31, installing this table into both local databases).
SET QUOTED_IDENTIFIER ON;
GO
-- Phase L Decision Closure, Decision 3 (APPROVED, 2026-08-31): SQL-side
-- minimal audit table for the four bm_* GameBridge procedures.
-- Complements, never replaces, Portal AuditEvent + Worker/D1 + Agent
-- logs -- this is a GameServer-side-verifiable record, independent of
-- that chain, useful specifically if the chain is ever suspected of
-- losing or misreporting a response.
--
-- APPEND-ONLY in normal operation: every bm_* call inserts exactly two
-- rows -- one 'COMMAND_RECEIVED' row BEFORE the main transaction begins
-- (so it survives a rollback), and one completion row (MUTATION_COMMITTED
-- or MUTATION_FAILED) after. This means a command that was received but
-- never completed (crash, timeout) is directly observable: a
-- COMMAND_RECEIVED row with no matching completion row.
--
-- Deliberately excludes: password/hash/TOTP secret/session token/
-- warehouse or item blob contents/plaintext email/plaintext IP/full
-- payload. Only counts, codes, identifiers, and timestamps.
--
-- Ownership chaining (same model every other table write in these
-- procedures already relies on): dbo owns both the bm_* procedures and
-- this table, so bloodmoon_writer/bloodmoon_writer_local's EXECUTE-only
-- grant on the four procedures is sufficient -- NO direct INSERT grant
-- on this table is ever given to the writer login.

CREATE TABLE dbo.bm_GameBridgeAudit (
    AuditId              INT IDENTITY(1,1) NOT NULL,
    CommandId            UNIQUEIDENTIFIER  NOT NULL,
    CorrelationId        UNIQUEIDENTIFIER  NOT NULL,
    CommandType          VARCHAR(32)       NOT NULL,
    AccountRef           VARCHAR(10)       NOT NULL,
    OperationStatus      VARCHAR(24)       NOT NULL,  -- COMMAND_RECEIVED | MUTATION_COMMITTED | MUTATION_FAILED | POST_VERIFICATION_FAILED
    StartedAt            DATETIME2         NOT NULL,
    CompletedAt          DATETIME2         NULL,
    ResultCode           VARCHAR(32)       NULL,
    RowsAffectedSummary  NVARCHAR(500)     NULL,       -- the same count-only JSON the procedures already return to callers, never row content
    ProcedureVersion     VARCHAR(20)       NOT NULL,
    DeletionMode         VARCHAR(20)       NULL,        -- 'ANONYMIZE' | 'PURGE', set only for those two operations
    PurgeBatchId         VARCHAR(80)       NULL,         -- betaCycleId, set only for PURGE_GAME_ACCOUNT
    VerificationStatus   VARCHAR(24)       NULL,          -- reserved: none of the four procedures has an internal post-verification phase distinct from its own COMMIT today; column exists for a future capability, not populated yet -- documented honestly, not fabricated
    RecordedAt           DATETIME2         NOT NULL CONSTRAINT DF_bm_GameBridgeAudit_RecordedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_bm_GameBridgeAudit PRIMARY KEY (AuditId)
);
GO

CREATE INDEX IX_bm_GameBridgeAudit_CommandId ON dbo.bm_GameBridgeAudit (CommandId);
GO
CREATE INDEX IX_bm_GameBridgeAudit_AccountRef ON dbo.bm_GameBridgeAudit (AccountRef);
GO
CREATE INDEX IX_bm_GameBridgeAudit_PurgeBatchId ON dbo.bm_GameBridgeAudit (PurgeBatchId) WHERE PurgeBatchId IS NOT NULL;
GO
