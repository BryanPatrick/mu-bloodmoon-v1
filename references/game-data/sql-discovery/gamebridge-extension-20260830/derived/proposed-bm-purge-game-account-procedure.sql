-- REVIEWED AND VALIDATED against a real local SQL Server 2022 instance,
-- 2026-08-30 (see docs/environment/sql-server-test-environment.md and
-- docs/gamebridge/gamebridge-local-testing.md for the full test record).
-- NOT installed on production. This file was corrected the same day after
-- a real production read-only schema check (bm-sql) found the original
-- T_FriendList/T_WaitFriend assumptions were structurally wrong -- see
-- step 1's own comment below, and bm_AnonymizeGameAccount's header for the
-- full confirmed-schema list (identical facts apply here).
--
-- IRREVERSIBLE. Only ever to be called for accounts the Portal has already
-- run through assessPreBetaPurgeEligibility() and explicitly approved
-- (plan Part 5) -- this procedure trusts that decision; it does not and
-- cannot re-derive eligibility (RechargeIntent/PurchaseIntent/VipGrant are
-- Portal-only tables it has no access to). Its own job is narrower:
-- structural refusals (staff account, empty/wildcard id -- the latter is
-- structurally impossible since @LegacyLogin is never a pattern) and the
-- same guild-master / active-market-listing BLOCK rules as ANONYMIZE.
--
-- Exclusion order follows Part 5 exactly (most-dependent-first, since only
-- ONE real FK exists in the entire database -- FK_CustomQuest_Character,
-- ON DELETE CASCADE -- so every other table below needs an explicit
-- DELETE; nothing else cascades automatically).
--
-- VERIFY_BEFORE_USE (still open): the exact `Name`-style column on each of
-- the ~13 Ranking* tables is still asserted per the plan's own stated join
-- keys, not individually re-confirmed column-by-column against production
-- this round -- T_FriendMain/T_FriendList/T_WaitFriend and CustomMarketShop
-- WERE confirmed this round (2026-08-30) and are no longer open questions.
--
-- Idempotency: per Part 5's own explicit resolution, this procedure does
-- NOT attempt to distinguish "never existed" from "already purged" -- a
-- missing MEMB_INFO row is reported as ALREADY_PURGED uniformly (Part 5:
-- "treating 'row absent' as ambiguous but harmless either way for this
-- narrow operation").
--
-- ================================================================
-- PHASE K HARDENING, 2026-08-30 -- a full-138-table audit (docs/
-- gameserver/database/account-data-map.md, cross-checked against the
-- native engine's own WZ_DeleteCharacter/WZ_RenameCharacter real
-- table-dependency lists via sys.sql_expression_dependencies) found this
-- procedure was missing real character-keyed and account-keyed tables:
-- T_CGuid, HelperData, MasterSkillTree, OptionData, QuestKillCount,
-- QuestWorld, CustomRewardItem, EventLeoTheHelper, EventSantaClaus,
-- Gens_Reward (Gens_Rank was already handled), CustomDailyReward,
-- CustomItemVisualBackup, CustomItemVisualDefault, CustomReBuild
-- (character-keyed, step 5b below); ExtWarehouse (a REAL SEPARATE TABLE,
-- not just the AccountCharacter.ExtWarehouse flag column this procedure
-- already clears via the AccountCharacter delete -- the original comment
-- at step 7 was wrong about this), CustomJewelBank, LuckyCoin,
-- CashShopInventory, CustomGift, GremoryCase, MEMB_STAT, DmN_OnlineCheck
-- (account-keyed, step 6b below). Without these, a "purged" account left
-- real orphaned rows behind in every one of them -- the opposite of what
-- a purge is for. Fixed below; re-tested (lab-gamebridge-test.sql +
-- SqlServerLocalIntegrationTests, both green after the fix).
--
-- PHASE L DECISION CLOSURE, Decision 3: QUOTED_IDENTIFIER ON is required
-- here for the same reason documented in bm_GrantVip's own header --
-- captured at CREATE PROCEDURE time, needed for this procedure's own
-- INSERT into bm_GameBridgeAudit's filtered index.
-- ================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE dbo.bm_PurgeGameAccount
    @LegacyLogin              VARCHAR(10),
    @BetaCycleId                VARCHAR(80),
    @CommandId                  UNIQUEIDENTIFIER,
    @CorrelationId               UNIQUEIDENTIFIER,
    @ResultCode                 VARCHAR(32)   OUTPUT,
    @TablesAffectedJson         NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @TablesAffectedJson = NULL;

    IF @LegacyLogin IS NULL OR LEN(@LegacyLogin) < 4
       OR @LegacyLogin COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
       OR @BetaCycleId IS NULL OR LEN(@BetaCycleId) = 0
       OR @CommandId IS NULL OR @CorrelationId IS NULL
    BEGIN
        SET @ResultCode = 'INVALID_INPUT';
        IF @CommandId IS NOT NULL AND @CorrelationId IS NOT NULL AND @LegacyLogin IS NOT NULL
        BEGIN
            DECLARE @InvNow DATETIME2 = SYSUTCDATETIME();
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', ISNULL(@LegacyLogin, ''), 'COMMAND_RECEIVED', @InvNow, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', ISNULL(@LegacyLogin, ''), 'MUTATION_FAILED', @InvNow, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
        END
        RETURN;
    END

    DECLARE @AuditStartedAt DATETIME2 = SYSUTCDATETIME();
    INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion, DeletionMode, PurgeBatchId)
        VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'COMMAND_RECEIVED', @AuditStartedAt, 'PHASE_L_1', 'PURGE', @BetaCycleId);

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
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            RETURN;
        END

        DECLARE @Admin INT;
        SELECT @Admin = Admin FROM MEMB_INFO WHERE memb___id = @LegacyLogin;

        IF @Admin IS NULL
        BEGIN
            -- No row: either never existed or already purged. Part 5's own
            -- explicit resolution -- treat uniformly, not as an error.
            -- Audit row inserted BEFORE COMMIT -- see bm_GrantVip's matching
            -- comment for the full rationale (Phase L Decision Closure
            -- hardening, 2026-08-31).
            SET @ResultCode = 'ALREADY_PURGED';
            SET @TablesAffectedJson = '{"alreadyPurged":true}';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            COMMIT TRANSACTION;
            RETURN;
        END

        IF @Admin <> 0
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'STAFF_ACCOUNT_REJECTED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            RETURN;
        END

        IF EXISTS (
            SELECT 1 FROM Guild g
            JOIN Character c ON c.Name = g.G_Master
            WHERE c.AccountID = @LegacyLogin
        )
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'GUILD_MASTER_BLOCKED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            RETURN;
        END

        IF EXISTS (
            SELECT 1 FROM CustomMarketShop cms
            JOIN Character c ON c.Name = cms.SellerName
            WHERE c.AccountID = @LegacyLogin
        )
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'ACTIVE_MARKET_LISTING_BLOCKED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
                VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
            RETURN;
        END

        -- ---- Nothing further can block: capture the character set once,
        -- before step 10 removes it, and proceed through the 11-step order. ----

        DECLARE @Characters TABLE (Name VARCHAR(10) PRIMARY KEY);
        INSERT INTO @Characters (Name) SELECT Name FROM Character WHERE AccountID = @LegacyLogin;

        DECLARE @CharacterCount INT = (SELECT COUNT(*) FROM @Characters);
        DECLARE @FriendRowCount INT = 0;
        DECLARE @GuildMemberCount INT = 0;
        DECLARE @RankingRowCount INT = 0;
        DECLARE @MarketShopCount INT = 0;
        DECLARE @CashShopCount INT = 0;
        DECLARE @WarehouseCount INT = 0;
        DECLARE @CustomQuestCount INT = 0;
        DECLARE @AccountCharacterCount INT = 0;
        DECLARE @ExtendedCleanupRowCount INT = 0;

        -- 1. T_FriendList / T_WaitFriend (either side) -- CONFIRMED real
        -- shape, 2026-08-30 (sys.columns against real production): NEITHER
        -- table has a Name column at all -- the friend system's real key
        -- is the numeric T_FriendMain.GUID. Look up every affected
        -- character's friend-system GUID first (T_FriendMain is the only
        -- one of the three tables with both GUID and Name together); a
        -- character that never used the friend system simply contributes
        -- no rows here, which is correct, not an error.
        DECLARE @FriendGuids TABLE (GUID INT PRIMARY KEY);
        INSERT INTO @FriendGuids (GUID) SELECT GUID FROM T_FriendMain WHERE Name IN (SELECT Name FROM @Characters);

        DELETE FROM T_FriendList
        WHERE GUID IN (SELECT GUID FROM @FriendGuids) OR FriendGuid IN (SELECT GUID FROM @FriendGuids) OR FriendName IN (SELECT Name FROM @Characters);
        SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
        DELETE FROM T_WaitFriend
        WHERE GUID IN (SELECT GUID FROM @FriendGuids) OR FriendGuid IN (SELECT GUID FROM @FriendGuids) OR FriendName IN (SELECT Name FROM @Characters);
        SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;

        -- 2. T_FriendMain.
        DELETE FROM T_FriendMain WHERE Name IN (SELECT Name FROM @Characters);
        SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;

        -- 3. GuildMember (guild-master case already refused above).
        DELETE FROM GuildMember WHERE Name IN (SELECT Name FROM @Characters);
        SET @GuildMemberCount = @@ROWCOUNT;

        -- 4. CustomMarketShop (active-listing case already refused above).
        DELETE FROM CustomMarketShop WHERE SellerName IN (SELECT Name FROM @Characters);
        SET @MarketShopCount = @@ROWCOUNT;

        -- 5. Rankings -- genuinely deleted for PURGE (unlike ANONYMIZE,
        -- which preserves these via the upstream character rename).
        DELETE FROM RankingBloodCastle WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingCaptureTheFlag WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingCastleSiege WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingChaosCastle WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingCustom WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingDevilSquare WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingDuel WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingIllusionTemple WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        -- PHASE K CORRECTION: RankingKingGuild.Name is VARCHAR(8) -- it is
        -- keyed by GUILD name, not character name (confirmed via
        -- sys.columns; RankingKingPlayer/every other Ranking* table below
        -- is correctly VARCHAR(10), character-keyed). The DELETE that used
        -- to be here compared character names against a guild-name column
        -- and could never match a real row -- harmless (matched zero rows)
        -- but semantically wrong. Deliberately NOT deleting anything here:
        -- guild-level ranking data belongs to the guild collectively, not
        -- to any one member, and this procedure already BLOCKS on
        -- GUILD_MASTER_BLOCKED before reaching this point -- a non-master
        -- account has no guild-owned ranking row to clean up in the first
        -- place. See docs/gameserver/database/logical-relationships.md.
        DELETE FROM RankingKingPlayer WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingMataMata WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM RankingTvT WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;
        DELETE FROM Gens_Rank WHERE Name IN (SELECT Name FROM @Characters);
        SET @RankingRowCount = @RankingRowCount + @@ROWCOUNT;

        -- 5b. PHASE K HARDENING: the remaining character-keyed tables the
        -- native WZ_DeleteCharacter/WZ_RenameCharacter procedures prove are
        -- real (see the header comment above). A character that never used
        -- a given subsystem simply has zero rows here -- not an error.
        DELETE FROM T_CGuid WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM HelperData WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM MasterSkillTree WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM OptionData WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM QuestKillCount WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM QuestWorld WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomRewardItem WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM EventLeoTheHelper WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM EventSantaClaus WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM Gens_Reward WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomDailyReward WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomItemVisualBackup WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomItemVisualDefault WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomReBuild WHERE Name IN (SELECT Name FROM @Characters);
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;

        -- 6. CashShopData.
        DELETE FROM CashShopData WHERE AccountID = @LegacyLogin;
        SET @CashShopCount = @@ROWCOUNT;

        -- 7. warehouse. NOTE (corrected, Phase K): ExtWarehouse is NOT just
        -- a column on AccountCharacter -- it is ALSO a real, separate
        -- table (AccountID/Items/Money/Number), handled at step 6b below.
        DELETE FROM warehouse WHERE AccountID = @LegacyLogin;
        SET @WarehouseCount = @@ROWCOUNT;

        -- 6b. PHASE K HARDENING: remaining account-keyed storage/currency/
        -- telemetry tables found by the full-138-table audit.
        DELETE FROM ExtWarehouse WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomJewelBank WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM LuckyCoin WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CashShopInventory WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM CustomGift WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM GremoryCase WHERE AccountID = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM MEMB_STAT WHERE memb___id = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;
        DELETE FROM DmN_OnlineCheck WHERE memb___id = @LegacyLogin;
        SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;

        -- 8. CustomQuest -- listed for completeness/documentation even
        -- though FK_CustomQuest_Character's ON DELETE CASCADE will remove
        -- these automatically once step 10 deletes the Character row; an
        -- explicit delete here means this procedure never silently relies
        -- on that cascade being the only thing standing between it and an
        -- orphaned row, matching "não assuma cascades" even in the one
        -- case where a cascade happens to be real.
        DELETE FROM CustomQuest WHERE Name IN (SELECT Name FROM @Characters);
        SET @CustomQuestCount = @@ROWCOUNT;

        -- 9. AccountCharacter (exactly one row per account, Id = legacyLogin).
        DELETE FROM AccountCharacter WHERE Id = @LegacyLogin;
        SET @AccountCharacterCount = @@ROWCOUNT;

        -- 10. Character.
        DELETE FROM Character WHERE AccountID = @LegacyLogin;

        -- 11. MEMB_INFO -- last, the anchor identity row.
        DELETE FROM MEMB_INFO WHERE memb___id = @LegacyLogin;

        SET @TablesAffectedJson =
            '{"character":' + CAST(@CharacterCount AS VARCHAR(10)) +
            ',"accountCharacter":' + CAST(@AccountCharacterCount AS VARCHAR(10)) +
            ',"friendRows":' + CAST(@FriendRowCount AS VARCHAR(10)) +
            ',"guildMember":' + CAST(@GuildMemberCount AS VARCHAR(10)) +
            ',"customMarketShop":' + CAST(@MarketShopCount AS VARCHAR(10)) +
            ',"rankingRows":' + CAST(@RankingRowCount AS VARCHAR(10)) +
            ',"cashShopData":' + CAST(@CashShopCount AS VARCHAR(10)) +
            ',"warehouse":' + CAST(@WarehouseCount AS VARCHAR(10)) +
            ',"customQuest":' + CAST(@CustomQuestCount AS VARCHAR(10)) +
            ',"extendedCleanupRows":' + CAST(@ExtendedCleanupRowCount AS VARCHAR(10)) +
            ',"membInfo":1}';

        -- Audit row inserted BEFORE COMMIT -- see bm_GrantVip's matching
        -- comment for the full rationale (Phase L Decision Closure
        -- hardening, 2026-08-31).
        SET @ResultCode = 'SUCCEEDED';
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, RowsAffectedSummary, ProcedureVersion, DeletionMode, PurgeBatchId)
            VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, @TablesAffectedJson, 'PHASE_L_1', 'PURGE', @BetaCycleId);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @ResultCode = 'MU_TRANSACTION_FAILED';
        SET @TablesAffectedJson = NULL;
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode, PurgeBatchId)
            VALUES (@CommandId, @CorrelationId, 'PURGE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'PURGE', @BetaCycleId);
    END CATCH
END
GO
