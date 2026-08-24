-- Reviewed Phase 3C source. Installed on the real MU SQL Server through
-- the separately authorized RemoteOps administrative bootstrap path.
-- bm-sql remained read-only and rejects this DDL by design.
-- An operator with real administrative SQL Server access must review
-- and run this manually.
--
-- Design rationale: a single stored procedure, not direct table INSERT
-- grants (Phase 3C Part J's own stated preference). The write login
-- gets EXECUTE on this procedure only -- never SELECT/INSERT/UPDATE/
-- DELETE on any table directly. sp_getapplock serializes concurrent
-- attempts at the same legacyLogin, closing the race condition that
-- exists because memb___id has no unique constraint (confirmed again
-- this phase, references/.../raw/03-accountcharacter-metadata-and-constraints.txt)
-- -- without adding a UNIQUE constraint to the live schema, which Part L
-- explicitly says never to do without separate approval.
--
-- Column values match references/.../derived/write-set-decision.md
-- exactly, including the deliberate ctl1_code='0' deviation from the
-- (possibly-privileged) value observed on existing accounts.

CREATE PROCEDURE dbo.DmN_CreateGameAccount
    @LegacyLogin      VARCHAR(10),
    @GameCredential    VARCHAR(10),
    @ResultCode        VARCHAR(32)  OUTPUT,
    @NewMembGuid       INT          OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @NewMembGuid = NULL;

    IF @LegacyLogin IS NULL OR LEN(@LegacyLogin) < 4
       OR @LegacyLogin COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
       OR @GameCredential IS NULL OR LEN(@GameCredential) < 8
       OR @GameCredential COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
    BEGIN
        SET @ResultCode = 'INVALID_INPUT';
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Serializes concurrent attempts at the SAME legacyLogin across
        -- the whole procedure's duration -- released automatically at
        -- COMMIT/ROLLBACK. Distinct from SQL Server's default locking,
        -- which would NOT prevent two concurrent callers both passing
        -- the existence check before either has inserted.
        DECLARE @LockResult INT;
        DECLARE @LockResource NVARCHAR(255);
        SET @LockResource = N'BloodMoon:CreateGameAccount:' + LOWER(@LegacyLogin);
        EXEC @LockResult = sp_getapplock
            @Resource = @LockResource,
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;

        IF @LockResult < 0
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'MU_TRANSACTION_FAILED';
            RETURN;
        END

        -- Crash/reply recovery: the technical game credential is a
        -- high-entropy proof tied to this request. If both rows already
        -- exist with the same credential, the prior committed success is
        -- returned instead of creating anything. A different credential
        -- remains a hard collision.
        IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id = @LegacyLogin AND memb__pwd = @GameCredential)
           AND EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = @LegacyLogin)
        BEGIN
            SELECT @NewMembGuid = memb_guid FROM MEMB_INFO
            WHERE memb___id = @LegacyLogin AND memb__pwd = @GameCredential;
            COMMIT TRANSACTION;
            SET @ResultCode = 'SUCCEEDED_REPLAY';
            RETURN;
        END

        IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id = @LegacyLogin)
           OR EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = @LegacyLogin)
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'LEGACY_LOGIN_COLLISION';
            RETURN;
        END

        INSERT INTO MEMB_INFO (
            memb___id, memb__pwd, memb_name, sno__numb,
            bloc_code, ctl1_code, AccountLevel, AccountExpireDate,
            Lock, RewardVip, RewardCoin, RewardIndication, Admin, activated
        ) VALUES (
            @LegacyLogin, @GameCredential, @LegacyLogin, '000000000000000000',
            '0', '0', 0, '19000101',
            0, 0, 0, 0, 0, 0
        );

        SET @NewMembGuid = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO AccountCharacter (Id, ExtClass, ExtWarehouse)
        VALUES (@LegacyLogin, 0, 0);

        COMMIT TRANSACTION;
        SET @ResultCode = 'SUCCEEDED';
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @ResultCode = 'MU_TRANSACTION_FAILED';
        SET @NewMembGuid = NULL;
        -- Deliberately no re-throw of the raw SQL error text to the
        -- caller (Part O) -- full diagnostics available separately via
        -- SQL Server's own error log for an operator to inspect, never
        -- surfaced in the structured result the Agent/Portal see.
    END CATCH
END
GO
