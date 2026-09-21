-- REVIEWED, NOT INSTALLED ON PRODUCTION. Written per
-- docs/gamebridge/gamebridge-agent-extension-plan.md Part 3 / Part 6.
-- Validated locally: bloodmoon_gamebridge_test (synthetic 46-table
-- schema) and bloodmoon_gameserver_lab (real 138-table, sanitized
-- production-derived schema) -- see docs/gameserver/database/lab-environment.md
-- and docs/environment/sql-server-test-environment.md.
--
-- Design rationale: same pattern as the existing, production-installed
-- dbo.DmN_CreateGameAccount (references/.../phase-3c-write-schema-verification-20260824/
-- derived/proposed-create-game-account-procedure.sql) -- static T-SQL only,
-- sp_getapplock for per-account serialization, TRY/CATCH + XACT_ABORT ON,
-- no raw SQL error text ever returned to the caller.
--
-- GRANT_VIP is a commercial-delivery record, never the GameServer source of
-- truth (plan Part 3 / decision E) -- it only ever raises AccountLevel via
-- MAX(current, target), never lowers it. SYNC_VIP_TIER (separate procedure)
-- is the only operation allowed to lower a tier.
--
-- Lock resource: the SHARED 'BloodMoon:GAME_ACCOUNT_MUTATION:<legacyLogin>'
-- namespace (plan Part 9, decision E) -- NOT a GRANT_VIP-only resource --
-- so this serializes against bm_SyncVipTier/bm_AnonymizeGameAccount/
-- bm_PurgeGameAccount for the same account, closing the "GRANT_VIP could
-- commit mid-ANONYMIZE" race the plan's original draft only flagged.
--
-- MEMB_INFO.AccountLevel confirmed real, int, NOT NULL
-- (references/.../phase-3c.../raw/01-membinfo-column-metadata.txt, column 22).
-- memb___id confirmed varchar(10) (same source, column 2).
--
-- ================================================================
-- PHASE L FIX, 2026-08-31 -- critical bug found and reproduced live in
-- the lab (docs/vip/wz-setaccountlevel-coexistence.md): this procedure
-- only ever wrote MEMB_INFO.AccountLevel, never AccountExpireDate --
-- which meant the native dbo.WZ_GetAccountLevel procedure (fired on
-- every login) silently reverted every GameBridge VIP grant to AL0 on
-- the player's very next login. @ExpiresAt is now required and always
-- extends AccountExpireDate (MAX-rule, matching this procedure's
-- existing never-downgrade philosophy for AccountLevel itself -- a
-- grant only ever pushes the expiry LATER, never earlier; shortening an
-- expiry is SYNC_VIP_TIER's job, same division of responsibility as
-- level).
-- ================================================================
--
-- ================================================================
-- PHASE L DECISION CLOSURE, 2026-08-31, Decision 3 (APPROVED) -- SQL-side
-- audit. @CommandId/@CorrelationId are now required, threaded down from
-- the Agent's real command identity (GameCommandProcessor already has
-- both). Every call writes to dbo.bm_GameBridgeAudit: one
-- 'COMMAND_RECEIVED' row BEFORE the transaction (survives a rollback),
-- one completion row after. See proposed-bm-gamebridge-audit-table.sql
-- for the full table design and the ownership-chaining reasoning for
-- why bloodmoon_writer needs no new grant for this.
--
-- QUOTED_IDENTIFIER ON is required here, not just at
-- dbo.bm_GameBridgeAudit's own CREATE TABLE -- SQL Server captures a
-- procedure's SET QUOTED_IDENTIFIER/ANSI_NULLS options AT CREATE TIME and
-- reuses them on every execution regardless of the calling session's own
-- settings, so a procedure created without this would fail its own INSERT
-- into the audit table's filtered index (Msg 1934) even though the caller
-- (the .NET Agent's SqlConnection, which defaults both ON) never sees the
-- problem directly (found for real installing this against both local
-- databases via `sqlcmd -i`, whose own default is OFF).
-- ================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE dbo.bm_GrantVip
    @LegacyLogin      VARCHAR(10),
    @TargetLevel      TINYINT,
    @ExpiresAt        DATETIME,
    @CommandId        UNIQUEIDENTIFIER,
    @CorrelationId    UNIQUEIDENTIFIER,
    @ResultCode       VARCHAR(32) OUTPUT,
    @PreviousLevel    TINYINT     OUTPUT,
    @NewLevel         TINYINT     OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @PreviousLevel = NULL;
    SET @NewLevel = NULL;

    -- GRANT_VIP never accepts 0 (that would be a downgrade to Free, which
    -- is SYNC_VIP_TIER's job, not this operation's) and never accepts a
    -- tier above Gold. Plan Part 2: targetLevel in {1,2,3} strictly.
    -- AccountExpireDate is SMALLDATETIME (confirmed via sys.columns), NOT
    -- DATETIME -- real valid range is 1900-01-01 through 2079-06-06.
    -- Rejected here explicitly (INVALID_INPUT) rather than letting SQL
    -- Server throw a raw conversion error on the UPDATE below, which a
    -- real test this round hit by accident (a 2099 test fixture).
    IF @LegacyLogin IS NULL OR LEN(@LegacyLogin) < 4
       OR @LegacyLogin COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
       OR @TargetLevel IS NULL OR @TargetLevel NOT IN (1, 2, 3)
       OR @ExpiresAt IS NULL OR @ExpiresAt > '2079-06-06'
       OR @CommandId IS NULL OR @CorrelationId IS NULL
    BEGIN
        SET @ResultCode = 'INVALID_INPUT';
        IF @CommandId IS NOT NULL AND @CorrelationId IS NOT NULL AND @LegacyLogin IS NOT NULL
        BEGIN
            DECLARE @InvNow DATETIME2 = SYSUTCDATETIME();
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', ISNULL(@LegacyLogin, ''), 'COMMAND_RECEIVED', @InvNow, 'PHASE_L_1');
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', ISNULL(@LegacyLogin, ''), 'MUTATION_FAILED', @InvNow, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
        END
        RETURN;
    END

    DECLARE @AuditStartedAt DATETIME2 = SYSUTCDATETIME();
    INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion)
        VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', @LegacyLogin, 'COMMAND_RECEIVED', @AuditStartedAt, 'PHASE_L_1');

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LockResult INT;
        DECLARE @LockResource NVARCHAR(255);
        SET @LockResource = N'BloodMoon:GAME_ACCOUNT_MUTATION:' + LOWER(@LegacyLogin);
        EXEC @LockResult = sp_getapplock
            @Resource = @LockResource,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;

        IF @LockResult < 0
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'MU_TRANSACTION_FAILED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
            RETURN;
        END

        -- GRANT_VIP never creates an account (plan Part 2's explicit
        -- validation rule) -- the account must already exist.
        SELECT @PreviousLevel = AccountLevel FROM MEMB_INFO WHERE memb___id = @LegacyLogin;

        IF @PreviousLevel IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'ACCOUNT_NOT_FOUND';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
            RETURN;
        END

        -- The single most important correctness property of this procedure
        -- (plan Part 3 "Never a downgrade, never a lost tier" / Part 12 test
        -- 3): a lower-tier grant (e.g. a Bronze gift landing on an existing
        -- Gold account) must never reduce AccountLevel.
        SET @NewLevel = CASE WHEN @TargetLevel > @PreviousLevel THEN @TargetLevel ELSE @PreviousLevel END;

        IF @NewLevel <> @PreviousLevel
        BEGIN
            UPDATE MEMB_INFO SET AccountLevel = @NewLevel WHERE memb___id = @LegacyLogin;
        END
        -- else: no-op update, still SUCCEEDED -- re-sending the same or a
        -- lower-tier GRANT_VIP is always safe, never an error (plan Part 3
        -- "Como evita concessão dupla", point 4).

        -- PHASE L FIX: extend-only, MAX-rule applied to expiry the same
        -- way it's applied to level -- never shortens an existing later
        -- expiry (e.g. a Bronze re-grant landing on an account with a
        -- longer-running Gold entitlement must not truncate it).
        UPDATE MEMB_INFO
        SET AccountExpireDate = CASE WHEN @ExpiresAt > AccountExpireDate THEN @ExpiresAt ELSE AccountExpireDate END
        WHERE memb___id = @LegacyLogin;

        -- Audit row inserted BEFORE COMMIT, not after (Phase L Decision
        -- Closure hardening, 2026-08-31): a real gap was found and closed
        -- here -- the original design committed the mutation first and
        -- wrote the completion audit row as a separate statement
        -- afterward, so if that INSERT itself failed (e.g. a transient
        -- constraint issue) the CATCH block below would report
        -- MU_TRANSACTION_FAILED to the caller even though the real
        -- MEMB_INFO mutation had already committed -- a false-FAILURE
        -- race, the mirror image of the false-success indication this
        -- audit design exists to prevent. Moving the INSERT inside the
        -- transaction, immediately before COMMIT, makes the mutation and
        -- its own completion record atomic: either both commit together,
        -- or (if the audit insert itself fails) the whole transaction,
        -- including the mutation, rolls back -- never a silent mismatch
        -- between what MEMB_INFO says happened and what the audit table
        -- says happened.
        SET @ResultCode = 'SUCCEEDED';
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, RowsAffectedSummary, ProcedureVersion)
            VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode,
                '{"previousLevel":' + CAST(@PreviousLevel AS VARCHAR(3)) + ',"newLevel":' + CAST(@NewLevel AS VARCHAR(3)) + '}', 'PHASE_L_1');
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @ResultCode = 'MU_TRANSACTION_FAILED';
        SET @PreviousLevel = NULL;
        SET @NewLevel = NULL;
        -- Deliberately no re-throw of the raw SQL error text to the caller
        -- (same discipline as dbo.DmN_CreateGameAccount) -- full diagnostics
        -- available separately via SQL Server's own error log.
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
            VALUES (@CommandId, @CorrelationId, 'GRANT_VIP', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
    END CATCH
END
GO
