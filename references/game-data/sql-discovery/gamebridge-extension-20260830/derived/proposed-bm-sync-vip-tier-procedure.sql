-- REVIEWED, NOT INSTALLED ON PRODUCTION. Written per
-- docs/gamebridge/gamebridge-agent-extension-plan.md Part 3B / Part 6.
-- Validated locally against both bloodmoon_gamebridge_test and
-- bloodmoon_gameserver_lab -- see
-- proposed-bm-grant-vip-procedure.sql's header for the shared status
-- note.
--
-- SYNC_VIP_TIER is the real GameServer source-of-truth mechanism (plan
-- Part 3B, decision E). Unlike bm_GrantVip's MAX()-only-upward rule, this
-- procedure does an UNCONDITIONAL SET to whatever desiredLevel the Portal's
-- reconciler computed -- including 0 (Free/expired), which is how VIP
-- expiry actually gets enforced on the GameServer side. The Portal is
-- trusted to have already computed the correct desired state before this
-- is ever called; this procedure does not re-derive it.
--
-- Lock resource: same SHARED 'BloodMoon:GAME_ACCOUNT_MUTATION:<legacyLogin>'
-- namespace as bm_GrantVip/bm_AnonymizeGameAccount/bm_PurgeGameAccount
-- (plan Part 9) -- whichever of GRANT_VIP or SYNC_VIP_TIER commits second
-- for the same account still produces a correct end state, because both
-- read the then-current AccountLevel inside the lock.
--
-- ================================================================
-- PHASE L FIX, 2026-08-31 -- CRITICAL, real bug found and reproduced in
-- the lab (docs/vip/wz-setaccountlevel-coexistence.md): this procedure
-- only ever wrote MEMB_INFO.AccountLevel, never AccountExpireDate.
-- AccountExpireDate defaults to 1900-01-01 and is otherwise ONLY read by
-- the native dbo.WZ_GetAccountLevel procedure -- which, on every
-- native-side "what's this account's level" check (almost certainly
-- fired on every login), does:
--   IF (AccountLevel <> 0 AND GETDATE() > AccountExpireDate)
--       SET AccountLevel = 0  -- and WRITES IT BACK immediately
-- Reproduced live in the lab: a fresh bm_SyncVipTier/bm_GrantVip grant
-- (AccountExpireDate still at its 1900-01-01 default) was SILENTLY
-- REVERTED TO AL0 by a single WZ_GetAccountLevel call -- i.e. the
-- player's very next login would have erased their VIP grant. No
-- number of reconciliation ticks fixes this, because the reconciler
-- itself never wrote AccountExpireDate either. This is fixed below by
-- adding @DesiredExpiresAt and always writing it (when @DesiredLevel>0)
-- in the SAME statement as AccountLevel, so the two columns can never
-- observably diverge.
--
-- PHASE L DECISION CLOSURE, Decision 2 (VIP SOURCE OF TRUTH = PORTAL,
-- formally adopted): this procedure's @PreviousLevel OUTPUT is what lets
-- the Portal's reconciler (vip-sync.service.ts) detect native drift --
-- if @PreviousLevel doesn't match what the Portal itself last recorded
-- as synced, something else (native or otherwise) wrote AccountLevel
-- since. The Portal, not this procedure, owns drift detection/repair
-- logging (VIP_NATIVE_DRIFT_DETECTED/REPAIRED) -- this procedure's job
-- stays narrow: report the true previous state honestly, then set the
-- Portal's desired state unconditionally.
-- ================================================================
--
-- ================================================================
-- PHASE L DECISION CLOSURE, 2026-08-31, Decision 3 (APPROVED) -- SQL-side
-- audit, same design as bm_GrantVip -- see
-- proposed-bm-gamebridge-audit-table.sql.
--
-- QUOTED_IDENTIFIER ON is required here for the same reason documented in
-- bm_GrantVip's own header -- captured at CREATE PROCEDURE time, needed
-- for this procedure's own INSERT into bm_GameBridgeAudit's filtered index.
-- ================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE dbo.bm_SyncVipTier
    @LegacyLogin      VARCHAR(10),
    @DesiredLevel     TINYINT,
    @DesiredExpiresAt DATETIME    = NULL,
    @CommandId        UNIQUEIDENTIFIER,
    @CorrelationId    UNIQUEIDENTIFIER,
    @ResultCode       VARCHAR(32) OUTPUT,
    @PreviousLevel    TINYINT     OUTPUT,
    @NewLevel         TINYINT     OUTPUT,
    @Changed          BIT         OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @PreviousLevel = NULL;
    SET @NewLevel = NULL;
    SET @Changed = 0;

    -- Unlike bm_GrantVip, 0 is a valid and expected desired level here
    -- (plan Part 3B: "unlike GRANT_VIP, 0 is valid and expected -- this is
    -- precisely how expiry gets enforced"). When @DesiredLevel = 0,
    -- @DesiredExpiresAt is irrelevant (WZ_GetAccountLevel's own guard is
    -- `AccountLevel <> 0`, so an expiry date is never consulted at
    -- level 0) and may be NULL. When @DesiredLevel > 0, @DesiredExpiresAt
    -- is now REQUIRED -- a caller that forgets to compute it gets
    -- INVALID_INPUT immediately rather than silently reproducing the bug
    -- this fix closes.
    -- AccountExpireDate is SMALLDATETIME (real valid range 1900-01-01
    -- through 2079-06-06) -- same explicit range check as bm_GrantVip,
    -- see that file's matching comment.
    IF @LegacyLogin IS NULL OR LEN(@LegacyLogin) < 4
       OR @LegacyLogin COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
       OR @DesiredLevel IS NULL OR @DesiredLevel NOT IN (0, 1, 2, 3)
       OR (@DesiredLevel > 0 AND (@DesiredExpiresAt IS NULL OR @DesiredExpiresAt > '2079-06-06'))
       OR @CommandId IS NULL OR @CorrelationId IS NULL
    BEGIN
        SET @ResultCode = 'INVALID_INPUT';
        IF @CommandId IS NOT NULL AND @CorrelationId IS NOT NULL AND @LegacyLogin IS NOT NULL
        BEGIN
            DECLARE @InvNow DATETIME2 = SYSUTCDATETIME();
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', ISNULL(@LegacyLogin, ''), 'COMMAND_RECEIVED', @InvNow, 'PHASE_L_1');
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', ISNULL(@LegacyLogin, ''), 'MUTATION_FAILED', @InvNow, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
        END
        RETURN;
    END

    DECLARE @AuditStartedAt DATETIME2 = SYSUTCDATETIME();
    INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion)
        VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', @LegacyLogin, 'COMMAND_RECEIVED', @AuditStartedAt, 'PHASE_L_1');

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
                VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
            RETURN;
        END

        SELECT @PreviousLevel = AccountLevel FROM MEMB_INFO WHERE memb___id = @LegacyLogin;

        IF @PreviousLevel IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'ACCOUNT_NOT_FOUND';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
                VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
            RETURN;
        END

        -- Unconditional set (not MAX) -- this IS the mechanism allowed to
        -- lower a tier. A zero-row update (already at the desired level)
        -- still reports SUCCEEDED with Changed=0 (plan Part 3B "safe to
        -- call at any time, for any reason" / Part 12 test 1). @Changed
        -- reflects AccountLevel only, unchanged semantics from before this
        -- fix -- AccountExpireDate is refreshed unconditionally below
        -- whenever @DesiredLevel > 0, independent of @Changed, because a
        -- renewed entitlement at the SAME level still needs its expiry
        -- pushed out (and, per the bug this fix closes, needs it written
        -- at all).
        IF @PreviousLevel <> @DesiredLevel
        BEGIN
            UPDATE MEMB_INFO SET AccountLevel = @DesiredLevel WHERE memb___id = @LegacyLogin;
            SET @Changed = 1;
        END

        IF @DesiredLevel > 0
        BEGIN
            UPDATE MEMB_INFO SET AccountExpireDate = @DesiredExpiresAt WHERE memb___id = @LegacyLogin;
        END

        SET @NewLevel = @DesiredLevel;

        -- Audit row inserted BEFORE COMMIT -- see bm_GrantVip's matching
        -- comment for the full rationale (Phase L Decision Closure
        -- hardening, 2026-08-31): makes the mutation and its own
        -- completion audit record atomic, closing a real false-FAILURE
        -- race where a post-commit audit-insert failure would otherwise
        -- report MU_TRANSACTION_FAILED for an already-committed mutation.
        SET @ResultCode = 'SUCCEEDED';
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, RowsAffectedSummary, ProcedureVersion)
            VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode,
                '{"previousLevel":' + CAST(@PreviousLevel AS VARCHAR(3)) + ',"newLevel":' + CAST(@NewLevel AS VARCHAR(3)) + ',"changed":' + CAST(@Changed AS VARCHAR(1)) + '}', 'PHASE_L_1');
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @ResultCode = 'MU_TRANSACTION_FAILED';
        SET @PreviousLevel = NULL;
        SET @NewLevel = NULL;
        SET @Changed = 0;
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion)
            VALUES (@CommandId, @CorrelationId, 'SYNC_VIP_TIER', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1');
    END CATCH
END
GO
