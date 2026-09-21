-- REVIEWED AND VALIDATED against a real local SQL Server 2022 instance,
-- 2026-08-30 (see docs/environment/sql-server-test-environment.md and
-- docs/gamebridge/gamebridge-local-testing.md for the full test record).
-- NOT installed on production. This file was corrected the same day after
-- a real production read-only schema check (bm-sql, sys.tables/sys.columns/
-- sys.indexes) found the original T_FriendList/T_WaitFriend assumptions
-- were structurally wrong -- see the T_FriendMain/T_FriendList/T_WaitFriend
-- section below for the corrected logic, and the "Confirmed real schema"
-- list for what changed.
--
-- THIS PROCEDURE NEEDED THE MOST SCRUTINY OF THE FOUR. Two design choices
-- went beyond what the plan document itself resolved (it explicitly left
-- them open -- "UNKNOWN_BEHAVIOR_ON_RENAME", "a real design choice for
-- review, not the only option") and were marked VERIFY_BEFORE_USE below --
-- both have since been exercised for real against the local SQL Server and
-- passed. A third real gap (T_FriendList/T_WaitFriend's real column shape)
-- was found and fixed via the production read-only schema check.
--
-- Confirmed real schema this procedure relies on:
--   MEMB_INFO        memb___id varchar(10) PK-ish (real PK is memb_guid int),
--                     memb__pwd varchar(10), AccountLevel int, Admin int
--   Character         Name varchar(10) is the REAL PK; AccountID varchar(10)
--                     is a logical application join, NOT a physical FK
--   AccountCharacter   Id varchar(10) = memb___id (real PK); GameID1..GameID10
--                     varchar(10) (character-slot name columns), GameIDC
--                     varchar(10) (currently-active character), ExtWarehouse int
--   Guild              G_Name varchar(8) PK, G_Master varchar(10)
--   GuildMember         Name varchar(10) PK (one guild per character, enforced
--                     by this being the whole PK), G_Name varchar(8)
--   CashShopData       AccountID varchar(10) PK, WCoinC/WCoinP/GoblinPoint int
--   warehouse          AccountID varchar(10) PK
--   CustomQuest         Name varchar(10) -- the ONE real FK in the whole
--                     database, FK_CustomQuest_Character -> Character.Name,
--                     ON DELETE CASCADE (does NOT cover UPDATE/rename)
--   CustomMarketShop   ItemGUID int PK, SellerAccount/SellerName varchar(10),
--                     Price int, PriceType tinyint, Item varbinary(16),
--                     Tax int -- CONFIRMED 2026-08-30: no status/active
--                     column exists at all; "row exists" is the only signal
--   T_FriendMain       GUID int PK (real key), Name varchar(10),
--                     FriendCount/MemoCount/MemoTotal -- CONFIRMED 2026-08-30
--   T_FriendList       GUID int, FriendGuid int NULL, FriendName varchar(10)
--                     NULL, Del tinyint NULL -- NO Name column, NO PK/unique
--                     index at all -- CONFIRMED 2026-08-30
--   T_WaitFriend       GUID int, FriendGuid int, FriendName varchar(10) --
--                     NO Name column, NO PK/unique index -- CONFIRMED 2026-08-30
--
-- VERIFY_BEFORE_USE #1 -- tombstone naming scheme (plan Part 4 "Idempotente"):
--   Character.Name is VARCHAR(10). A deterministic, collision-resistant,
--   per-character tombstone that fits 10 characters is generated as
--   'X' + 8-digit-zero-padded memb_guid + a 1-digit character-slot number
--   (derived from the REAL AccountCharacter.GameID1..GameID10 slot layout,
--   not an arbitrary ROW_NUMBER). This is unique per (account, slot) pair
--   for any memb_guid up to 99,999,999 -- more than sufficient given only
--   9 real accounts exist today, but flagged as a real design choice an
--   operator must confirm before trusting it at scale.
--
-- VERIFY_BEFORE_USE #2 -- CustomQuest rename-in-lockstep (plan Part 4 #3,
--   "UNKNOWN_BEHAVIOR_ON_RENAME"): FK_CustomQuest_Character only cascades
--   ON DELETE, not ON UPDATE. Renaming Character.Name while CustomQuest
--   rows still reference the old value would be BLOCKED by the FK (default
--   NO ACTION on update) in both directions -- the parent can't change a
--   value a child still references, and the child can't be pointed at a
--   value that doesn't exist in the parent yet. This procedure resolves it
--   with the standard SQL Server technique: temporarily NOCHECK the
--   constraint, perform both renames, then CHECK CHECK it again (which
--   re-validates -- if anything is left inconsistent, THIS statement fails
--   loudly rather than silently leaving trust metadata wrong). ALTER TABLE
--   requires ALTER permission, which plain ownership chaining does NOT
--   grant (ownership chaining only covers DML/EXECUTE) -- so, uniquely
--   among the four new procedures, this one is created WITH EXECUTE AS
--   OWNER so the whole body (including the ALTER TABLE statements) runs as
--   the procedure's owner (dbo) regardless of caller. bloodmoon_writer
--   still only ever needs EXECUTE on this one procedure -- WITH EXECUTE AS
--   OWNER does not grant the caller anything beyond that.
--
-- Never touched by this procedure (plan Part 4, explicitly out of scope):
--   file-based logs (#11), the legacy DMN CMS tables (#7, #16, #17, #18 --
--   unconfirmed/dormant, not this operation's job).
--
-- Rejects staff/system accounts (Admin<>0) as a GameServer-side
-- defense-in-depth mirror of the Portal's own role check (plan Part 4
-- "Required behaviors").
--
-- ================================================================
-- PHASE K HARDENING, 2026-08-30 -- full-138-table audit found two real
-- gaps against the FIRST version of this procedure (docs/gameserver/
-- database/account-data-map.md "Corrections" section has the full
-- writeup; summary here):
--
-- GAP 1 (privacy-relevant): the original version's final MEMB_INFO
-- UPDATE only reset AccountLevel and memb__pwd -- it never cleared
-- mail_addr/last_login_ip/addr_info/addr_deta/tel__numb/fpas_ques/
-- fpas_answ/post_code/mail_chek. An "anonymized" account's real email,
-- IP, address, phone, and security question would have survived
-- untouched. Fixed below -- these are now cleared in the same MEMB_INFO
-- UPDATE, matching the REMOVE/SANITIZE classification in
-- docs/gameserver/database/privacy-data-map.md.
--
-- GAP 2 (consistency-relevant): the original version's per-character
-- tombstone rename only touched Character/AccountCharacter/CustomQuest/
-- GuildMember/T_Friend*/CustomMarketShop. A real dependency query against
-- the native engine's OWN WZ_RenameCharacter procedure (which performs
-- the same kind of operation -- moving a character's real name to a new
-- value everywhere it's referenced) proved it ALSO touches: T_CGuid,
-- HelperData, MasterSkillTree, OptionData, QuestKillCount, QuestWorld,
-- CustomRewardItem, EventLeoTheHelper, EventSantaClaus, Gens_Rank,
-- Gens_Reward, CustomDailyReward, CustomItemVisualBackup,
-- CustomItemVisualDefault, CustomReBuild, and all 12 Ranking* tables.
-- Without renaming these too, the character's OLD real name would keep
-- existing in every one of them after "anonymization" -- a genuine
-- privacy leak (the tombstone would be cosmetic on Character alone,
-- while every progression/ranking table still held the real name).
-- Fixed below by extending the per-slot cursor loop to rename Name in
-- lockstep across the same set WZ_RenameCharacter itself uses -- this is
-- not a guess, it's the native engine's own real, tested behavior for
-- "this name is moving."
--
-- GAP 3 (retention-relevant): ExtWarehouse is a REAL SEPARATE TABLE
-- (AccountID/Items/Money/Number), not just the AccountCharacter.
-- ExtWarehouse INT column the original comment described (that column
-- is a real, different thing -- a tier/flag, not the storage itself).
-- The original procedure zeroed the AccountCharacter.ExtWarehouse column
-- but never touched the actual ExtWarehouse table, leaving its Items
-- varbinary blob and Money balance behind entirely. Fixed below with the
-- same "DELETE, not detach" reasoning already applied to `warehouse`.
-- Also extended to CustomJewelBank/LuckyCoin/CashShopInventory/
-- CustomGift/GremoryCase (AccountID-keyed, same reasoning) --
-- CashShopPeriodicItem has no AccountID column and no confirmed join key
-- to an account (docs/gameserver/database/economy-data-map.md) so it is
-- deliberately left untouched, not silently assumed safe.
-- ================================================================
--
-- ================================================================
-- PHASE L DECISION CLOSURE, 2026-08-31, Decision 3 (APPROVED) -- SQL-side
-- audit, same design as bm_GrantVip -- see
-- proposed-bm-gamebridge-audit-table.sql. DeletionMode='ANONYMIZE' is
-- always recorded (this procedure only ever does one kind of thing).
--
-- QUOTED_IDENTIFIER ON is required here for the same reason documented in
-- bm_GrantVip's own header -- captured at CREATE PROCEDURE time, needed
-- for this procedure's own INSERT into bm_GameBridgeAudit's filtered index.
-- ================================================================
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE dbo.bm_AnonymizeGameAccount
    @LegacyLogin              VARCHAR(10),
    @CommandId                UNIQUEIDENTIFIER,
    @CorrelationId             UNIQUEIDENTIFIER,
    @ResultCode                VARCHAR(32)   OUTPUT,
    @EntitiesAffectedJson      NVARCHAR(MAX) OUTPUT
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @EntitiesAffectedJson = NULL;

    IF @LegacyLogin IS NULL OR LEN(@LegacyLogin) < 4
       OR @LegacyLogin COLLATE Latin1_General_100_BIN2 LIKE '%[^A-Za-z0-9]%'
       OR @CommandId IS NULL OR @CorrelationId IS NULL
    BEGIN
        SET @ResultCode = 'INVALID_INPUT';
        IF @CommandId IS NOT NULL AND @CorrelationId IS NOT NULL AND @LegacyLogin IS NOT NULL
        BEGIN
            DECLARE @InvNow DATETIME2 = SYSUTCDATETIME();
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', ISNULL(@LegacyLogin, ''), 'COMMAND_RECEIVED', @InvNow, 'PHASE_L_1', 'ANONYMIZE');
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', ISNULL(@LegacyLogin, ''), 'MUTATION_FAILED', @InvNow, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
        END
        RETURN;
    END

    DECLARE @AuditStartedAt DATETIME2 = SYSUTCDATETIME();
    INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, ProcedureVersion, DeletionMode)
        VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'COMMAND_RECEIVED', @AuditStartedAt, 'PHASE_L_1', 'ANONYMIZE');

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
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            RETURN;
        END

        DECLARE @MembGuid INT;
        DECLARE @Admin INT;
        SELECT @MembGuid = memb_guid, @Admin = Admin FROM MEMB_INFO WHERE memb___id = @LegacyLogin;

        IF @MembGuid IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'ACCOUNT_NOT_FOUND';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            RETURN;
        END

        -- Defense in depth: the Portal must refuse first. This is the
        -- GameServer's own independent second gate in case a command ever
        -- reaches the Agent for an account the Portal misclassified.
        IF @Admin <> 0
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'STAFF_ACCOUNT_REJECTED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            RETURN;
        END

        -- Idempotency check: a tombstoned account's memb__pwd already
        -- carries the fixed, deterministic marker prefix below. This is
        -- checked BEFORE any mutation, independent of the tombstone-naming
        -- scheme used for characters (VERIFY_BEFORE_USE #1) -- so this
        -- check stays correct even for an account with zero characters.
        DECLARE @AlreadyAnonymized BIT = 0;
        IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id = @LegacyLogin AND memb__pwd LIKE 'ANON%')
            SET @AlreadyAnonymized = 1;

        IF @AlreadyAnonymized = 1
        BEGIN
            -- Audit row inserted BEFORE COMMIT -- see bm_GrantVip's matching
            -- comment for the full rationale (Phase L Decision Closure
            -- hardening, 2026-08-31).
            SET @ResultCode = 'ALREADY_ANONYMIZED';
            SET @EntitiesAffectedJson = '{"alreadyAnonymized":true}';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            COMMIT TRANSACTION;
            RETURN;
        END

        -- BLOCK conditions (plan Part 4 #5/#6) -- checked before any
        -- mutation happens, so a blocked call leaves nothing half-done.
        IF EXISTS (
            SELECT 1 FROM Guild g
            JOIN Character c ON c.Name = g.G_Master
            WHERE c.AccountID = @LegacyLogin
        )
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'GUILD_MASTER_BLOCKED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            RETURN;
        END

        -- CONFIRMED, 2026-08-30 (sys.columns against real production):
        -- CustomMarketShop has NO status/active/sold/cancelled column at
        -- all -- ItemGUID/AuthCode/SellerAccount/SellerName/Price/PriceType/
        -- Item/Tax is the complete real column list. "A row exists for this
        -- seller" is therefore not a conservative fallback anymore -- it is
        -- the only available signal this schema offers for "has something
        -- listed," and blocking on it is confirmed-correct, not stricter
        -- than necessary.
        IF EXISTS (
            SELECT 1 FROM CustomMarketShop cms
            JOIN Character c ON c.Name = cms.SellerName
            WHERE c.AccountID = @LegacyLogin
        )
        BEGIN
            ROLLBACK TRANSACTION;
            SET @ResultCode = 'ACTIVE_MARKET_LISTING_BLOCKED';
            INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
                VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
            RETURN;
        END

        -- ---- From here on, nothing further can block: proceed. ----

        DECLARE @CharacterCount INT = 0;
        DECLARE @FriendRowCount INT = 0;
        DECLARE @WarehouseDeleted BIT = 0;
        DECLARE @ExtendedCleanupRowCount INT = 0;

        -- VERIFY_BEFORE_USE #2: temporarily relax the one real FK so the
        -- parent (Character.Name) and child (CustomQuest.Name) can be
        -- renamed in lockstep within this transaction. Re-enabled WITH
        -- CHECK CHECK below, which re-validates the constraint -- if
        -- anything is left inconsistent this statement itself fails.
        ALTER TABLE CustomQuest NOCHECK CONSTRAINT FK_CustomQuest_Character;

        -- Real per-account character slots (AccountCharacter.GameID1..10),
        -- not an arbitrary ordering -- see VERIFY_BEFORE_USE #1.
        DECLARE @Slots TABLE (SlotNumber TINYINT PRIMARY KEY, OriginalName VARCHAR(10));
        INSERT INTO @Slots (SlotNumber, OriginalName)
        SELECT v.SlotNumber, v.OriginalName
        FROM AccountCharacter ac
        CROSS APPLY (VALUES
            (1, ac.GameID1), (2, ac.GameID2), (3, ac.GameID3), (4, ac.GameID4), (5, ac.GameID5),
            (6, ac.GameID6), (7, ac.GameID7), (8, ac.GameID8), (9, ac.GameID9), (10, ac.GameID10)
        ) AS v(SlotNumber, OriginalName)
        WHERE ac.Id = @LegacyLogin AND v.OriginalName IS NOT NULL
          AND EXISTS (SELECT 1 FROM Character c WHERE c.Name = v.OriginalName AND c.AccountID = @LegacyLogin);

        DECLARE @SlotNumber TINYINT, @OriginalName VARCHAR(10), @TombstoneName VARCHAR(10), @FriendGuid INT;
        DECLARE slot_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT SlotNumber, OriginalName FROM @Slots;
        OPEN slot_cursor;
        FETCH NEXT FROM slot_cursor INTO @SlotNumber, @OriginalName;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @TombstoneName = 'X' + RIGHT('00000000' + CAST(@MembGuid AS VARCHAR(8)), 8)
                + CAST(@SlotNumber % 10 AS VARCHAR(1));

            UPDATE CustomQuest SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE Character SET Name = @TombstoneName WHERE Name = @OriginalName AND AccountID = @LegacyLogin;

            UPDATE AccountCharacter
            SET
                GameID1  = CASE WHEN @SlotNumber = 1  THEN @TombstoneName ELSE GameID1  END,
                GameID2  = CASE WHEN @SlotNumber = 2  THEN @TombstoneName ELSE GameID2  END,
                GameID3  = CASE WHEN @SlotNumber = 3  THEN @TombstoneName ELSE GameID3  END,
                GameID4  = CASE WHEN @SlotNumber = 4  THEN @TombstoneName ELSE GameID4  END,
                GameID5  = CASE WHEN @SlotNumber = 5  THEN @TombstoneName ELSE GameID5  END,
                GameID6  = CASE WHEN @SlotNumber = 6  THEN @TombstoneName ELSE GameID6  END,
                GameID7  = CASE WHEN @SlotNumber = 7  THEN @TombstoneName ELSE GameID7  END,
                GameID8  = CASE WHEN @SlotNumber = 8  THEN @TombstoneName ELSE GameID8  END,
                GameID9  = CASE WHEN @SlotNumber = 9  THEN @TombstoneName ELSE GameID9  END,
                GameID10 = CASE WHEN @SlotNumber = 10 THEN @TombstoneName ELSE GameID10 END,
                GameIDC  = CASE WHEN GameIDC = @OriginalName THEN @TombstoneName ELSE GameIDC END
            WHERE Id = @LegacyLogin;

            -- PHASE K HARDENING: rename Name -> @TombstoneName in lockstep
            -- across every other table the native WZ_RenameCharacter
            -- procedure itself touches on a real character rename (see the
            -- header comment above, GAP 2). A character that never used a
            -- given subsystem simply has zero rows here -- not an error.
            UPDATE T_CGuid SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE HelperData SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE MasterSkillTree SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE OptionData SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE QuestKillCount SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE QuestWorld SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE CustomRewardItem SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE EventLeoTheHelper SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE EventSantaClaus SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE Gens_Rank SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE Gens_Reward SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE CustomDailyReward SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE CustomItemVisualBackup SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE CustomItemVisualDefault SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE CustomReBuild SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingBloodCastle SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingCaptureTheFlag SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingCastleSiege SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingChaosCastle SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingCustom SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingDevilSquare SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingDuel SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingIllusionTemple SET Name = @TombstoneName WHERE Name = @OriginalName;
            -- PHASE K CORRECTION: RankingKingGuild.Name is VARCHAR(8), a
            -- GUILD name, not a character name -- see the matching
            -- comment in bm_PurgeGameAccount. Deliberately not touched.
            UPDATE RankingKingPlayer SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingMataMata SET Name = @TombstoneName WHERE Name = @OriginalName;
            UPDATE RankingTvT SET Name = @TombstoneName WHERE Name = @OriginalName;
            SET @ExtendedCleanupRowCount = @ExtendedCleanupRowCount + @@ROWCOUNT;

            -- GuildMember/friend rows are keyed by the OLD character name --
            -- detach (delete) them here, before the name is gone from
            -- everyone's reach. (plan Part 4 #4/#10: DETACH.)
            DELETE FROM GuildMember WHERE Name = @OriginalName;
            -- CONFIRMED real shape, 2026-08-30 (sys.columns against real
            -- production -- see local-test-schema.sql's own header for the
            -- full account). T_FriendList/T_WaitFriend have NO Name column
            -- at all -- the friend system's real key is the numeric
            -- T_FriendMain.GUID, not the character name. T_FriendMain is
            -- the only one of the three with both GUID and Name together,
            -- so it's looked up FIRST to bridge name -> friend-system GUID
            -- (a character that never used the friend system has no
            -- T_FriendMain row at all, hence the NULL check -- not an error).
            SET @FriendGuid = NULL;
            SELECT @FriendGuid = GUID FROM T_FriendMain WHERE Name = @OriginalName;
            IF @FriendGuid IS NOT NULL
            BEGIN
                DELETE FROM T_FriendList WHERE GUID = @FriendGuid OR FriendGuid = @FriendGuid OR FriendName = @OriginalName;
                SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
                DELETE FROM T_WaitFriend WHERE GUID = @FriendGuid OR FriendGuid = @FriendGuid OR FriendName = @OriginalName;
                SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
                DELETE FROM T_FriendMain WHERE GUID = @FriendGuid;
                SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
            END
            ELSE
            BEGIN
                -- No T_FriendMain row for this character -- still worth a
                -- defensive sweep of the "referenced by name" side, in case
                -- another character's row points at this name without a
                -- live FriendGuid (a stale/inconsistent row, no FK enforces
                -- this pairing in production).
                DELETE FROM T_FriendList WHERE FriendName = @OriginalName;
                SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
                DELETE FROM T_WaitFriend WHERE FriendName = @OriginalName;
                SET @FriendRowCount = @FriendRowCount + @@ROWCOUNT;
            END

            -- Detach-if-none-active market rows for this character (the
            -- BLOCK check above already ensured none are active).
            DELETE FROM CustomMarketShop WHERE SellerName = @OriginalName;

            SET @CharacterCount = @CharacterCount + 1;
            FETCH NEXT FROM slot_cursor INTO @SlotNumber, @OriginalName;
        END
        CLOSE slot_cursor;
        DEALLOCATE slot_cursor;

        ALTER TABLE CustomQuest WITH CHECK CHECK CONSTRAINT FK_CustomQuest_Character;

        -- VIP reset (plan Part 4 #12) and credential invalidation. The new
        -- credential is intentionally NOT derived from anything the caller
        -- supplied (plan Part 4 "Required behaviors": "a fresh,
        -- non-derivable random value generated by the procedure itself").
        -- The fixed 'ANON' prefix is the idempotency marker checked above;
        -- the remaining 6 characters are NEWID()-derived and different on
        -- every call, but that's harmless -- the account is unusable
        -- either way once the prefix is set.
        -- PHASE K HARDENING (GAP 1): the real personal-data fields on
        -- MEMB_INFO -- see docs/gameserver/database/privacy-data-map.md --
        -- are now actually cleared here. The original version of this
        -- procedure only reset AccountLevel/memb__pwd.
        UPDATE MEMB_INFO
        SET
            AccountLevel = 0,
            memb__pwd = 'ANON' + LEFT(REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', ''), 6),
            mail_addr = @LegacyLogin + '@anonymized.invalid',
            last_login_ip = NULL,
            addr_info = NULL,
            addr_deta = NULL,
            post_code = NULL,
            tel__numb = NULL,
            fpas_ques = NULL,
            fpas_answ = NULL,
            mail_chek = '0'
        WHERE memb___id = @LegacyLogin;

        -- CashShop balances zeroed (plan Part 4 #14, mirrors the Portal's
        -- own AccountCurrency zeroing).
        UPDATE CashShopData SET WCoinC = 0, WCoinP = 0, GoblinPoint = 0 WHERE AccountID = @LegacyLogin;

        -- Warehouse: DELETE, not detach (decision B) -- opaque varbinary
        -- blobs must never become an indirect permanent-retention channel.
        DELETE FROM warehouse WHERE AccountID = @LegacyLogin;
        SET @WarehouseDeleted = CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END;
        UPDATE AccountCharacter SET ExtWarehouse = 0 WHERE Id = @LegacyLogin;

        -- PHASE K HARDENING (GAP 3): the REAL ExtWarehouse table (distinct
        -- from the AccountCharacter.ExtWarehouse flag column zeroed above)
        -- plus every other AccountID-keyed storage/currency table found by
        -- the full-138-table audit. Same "must not become an indirect
        -- permanent-retention channel" reasoning as `warehouse` above.
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

        -- Minimal, non-decoded metadata only (decision B's data-minimization
        -- principle) -- counts and booleans, never item contents.
        SET @EntitiesAffectedJson =
            '{"character":' + CAST(@CharacterCount AS VARCHAR(10)) +
            ',"friendRowsRemoved":' + CAST(@FriendRowCount AS VARCHAR(10)) +
            ',"warehouseDeleted":' + CASE WHEN @WarehouseDeleted = 1 THEN 'true' ELSE 'false' END +
            ',"extendedCleanupRows":' + CAST(@ExtendedCleanupRowCount AS VARCHAR(10)) +
            '}';

        -- Audit row inserted BEFORE COMMIT -- see bm_GrantVip's matching
        -- comment for the full rationale (Phase L Decision Closure
        -- hardening, 2026-08-31).
        SET @ResultCode = 'SUCCEEDED';
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, RowsAffectedSummary, ProcedureVersion, DeletionMode)
            VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_COMMITTED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, @EntitiesAffectedJson, 'PHASE_L_1', 'ANONYMIZE');
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'slot_cursor') >= -1
        BEGIN
            CLOSE slot_cursor;
            DEALLOCATE slot_cursor;
        END
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        SET @ResultCode = 'MU_TRANSACTION_FAILED';
        SET @EntitiesAffectedJson = NULL;
        INSERT INTO dbo.bm_GameBridgeAudit (CommandId, CorrelationId, CommandType, AccountRef, OperationStatus, StartedAt, CompletedAt, ResultCode, ProcedureVersion, DeletionMode)
            VALUES (@CommandId, @CorrelationId, 'ANONYMIZE_GAME_ACCOUNT', @LegacyLogin, 'MUTATION_FAILED', @AuditStartedAt, SYSUTCDATETIME(), @ResultCode, 'PHASE_L_1', 'ANONYMIZE');
    END CATCH
END
GO
