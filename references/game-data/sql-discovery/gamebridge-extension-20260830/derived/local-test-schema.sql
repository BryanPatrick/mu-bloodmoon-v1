-- Disposable local SQL Server test schema for the GameBridge extension
-- (docs/gamebridge/gamebridge-agent-extension-plan.md Part 12/13, decision F).
-- Reproduces ONLY the subset of the real MuOnline schema the four new
-- procedures (dbo.bm_GrantVip/bm_SyncVipTier/bm_AnonymizeGameAccount/
-- bm_PurgeGameAccount) touch -- not a full replica. Column names/types are
-- taken verbatim from confirmed real evidence:
--   references/game-data/sql-discovery/phase-3c-write-schema-verification-20260824/raw/
--   docs/game-data/schema/v2-account-guild-currencies-warehouse.md
--
-- CRITICAL, do not "improve": only ONE real foreign key exists anywhere in
-- the real database (FK_CustomQuest_Character, CustomQuest.Name ->
-- Character.Name, ON DELETE CASCADE). Every other relationship below
-- (Character.AccountID, AccountCharacter.Id, GuildMember.Name,
-- CustomMarketShop.SellerName, CashShopData/warehouse.AccountID,
-- T_Friend*.Name, Ranking*.Name) is a LOGICAL join only, enforced by
-- application code (here, the stored procedures), never the database. No
-- FK is added for any of these, on purpose -- adding one would mask a real
-- bug the procedures need to handle explicitly.

USE master;
GO
IF DB_ID('bloodmoon_gamebridge_test') IS NOT NULL
BEGIN
    ALTER DATABASE bloodmoon_gamebridge_test SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE bloodmoon_gamebridge_test;
END
GO
CREATE DATABASE bloodmoon_gamebridge_test;
GO
USE bloodmoon_gamebridge_test;
GO

-- MEMB_INFO -- only the NOT NULL columns (confirmed, raw/01) plus the
-- columns the four procedures actually read/write. memb_guid is the real
-- PK/IDENTITY; memb___id has NO unique constraint in production (confirmed
-- gap, Phase 2A/3A/3C) -- reproduced faithfully, not "fixed" here.
CREATE TABLE MEMB_INFO (
    memb_guid          INT IDENTITY(1,1) NOT NULL,
    memb___id          VARCHAR(10)   NOT NULL,
    memb__pwd          VARCHAR(10)   NOT NULL,
    memb_name          VARCHAR(10)   NOT NULL,
    sno__numb          CHAR(18)      NOT NULL,
    bloc_code          CHAR(1)       NOT NULL DEFAULT '0',
    ctl1_code          CHAR(1)       NOT NULL DEFAULT '0',
    AccountLevel       INT           NOT NULL DEFAULT 0,
    AccountExpireDate  SMALLDATETIME NOT NULL DEFAULT '19000101',
    Lock               INT           NOT NULL DEFAULT 0,
    RewardVip          INT           NOT NULL DEFAULT 0,
    RewardCoin         INT           NOT NULL DEFAULT 0,
    RewardIndication   INT           NOT NULL DEFAULT 0,
    Admin              INT           NOT NULL DEFAULT 0,
    activated          INT           NOT NULL DEFAULT 0,
    mail_addr          VARCHAR(50)   NULL,
    last_login_ip      VARCHAR(50)   NULL,
    addr_info          VARCHAR(255)  NULL,
    addr_deta          VARCHAR(255)  NULL,
    post_code          CHAR(6)       NULL,
    tel__numb          VARCHAR(20)   NULL,
    fpas_ques          VARCHAR(50)   NULL,
    fpas_answ          VARCHAR(50)   NULL,
    mail_chek          CHAR(1)       NULL,
    CONSTRAINT PK_MEMB_INFO_1 PRIMARY KEY (memb_guid)
);
GO

-- AccountCharacter -- Id is the real PK (= memb___id), GameID1..10/GameIDC
-- are the real character-slot columns (confirmed, raw/03 +
-- v2-account-guild-currencies-warehouse.md). ExtClass/ExtWarehouse NOT
-- NULL, no default (confirmed).
CREATE TABLE AccountCharacter (
    Number       INT IDENTITY(1,1) NOT NULL,
    Id           VARCHAR(10) NOT NULL,
    GameID1      VARCHAR(10) NULL,
    GameID2      VARCHAR(10) NULL,
    GameID3      VARCHAR(10) NULL,
    GameID4      VARCHAR(10) NULL,
    GameID5      VARCHAR(10) NULL,
    GameID6      VARCHAR(10) NULL,
    GameID7      VARCHAR(10) NULL,
    GameID8      VARCHAR(10) NULL,
    GameID9      VARCHAR(10) NULL,
    GameID10     VARCHAR(10) NULL,
    GameIDC      VARCHAR(10) NULL,
    MoveCnt      TINYINT NULL,
    ExtClass     INT NOT NULL,
    ExtWarehouse INT NOT NULL,
    CONSTRAINT PK_AccountCharacter PRIMARY KEY (Id)
);
GO

-- Character -- Name is the REAL PK (confirmed). AccountID is a LOGICAL
-- join to MEMB_INFO.memb___id, never a physical FK (confirmed). Blob
-- columns (Inventory/MagicList/EffectList/Quest) intentionally omitted --
-- none of the four procedures read or write them.
CREATE TABLE Character (
    Name      VARCHAR(10) NOT NULL,
    AccountID VARCHAR(10) NOT NULL,
    CONSTRAINT PK_Character PRIMARY KEY (Name)
);
GO

-- Guild / GuildMember -- G_Name is Guild's real PK (varchar(8), confirmed).
-- GuildMember's PK is Name alone (one guild per character, confirmed).
CREATE TABLE Guild (
    G_Name VARCHAR(8) NOT NULL,
    G_Master VARCHAR(10) NOT NULL,
    CONSTRAINT PK_Guild PRIMARY KEY (G_Name)
);
GO
CREATE TABLE GuildMember (
    Name    VARCHAR(10) NOT NULL,
    G_Name  VARCHAR(8) NOT NULL,
    G_Level TINYINT NULL,
    CONSTRAINT PK_GuildMember PRIMARY KEY (Name)
);
GO

-- CustomMarketShop -- CONFIRMED real shape, 2026-08-30, via bm-sql
-- (sys.tables/sys.columns/sys.indexes against real production). PK is
-- ItemGUID (one row per listed item, confirmed via PK_CustomMarketShop).
-- There is NO status/active/sold/cancelled column anywhere on this table
-- -- confirmed by reading every real column, not inferred by absence in a
-- partial query. This means "a row exists for this seller" IS the only
-- available signal for "has something listed" -- the procedures'
-- conservative "block on ANY row" behavior is not a fallback pending
-- confirmation anymore, it is now the confirmed-correct behavior (a sold
-- or cancelled listing's row is presumably deleted elsewhere by the
-- GameServer engine itself; this schema gives no other way to represent
-- "not active").
CREATE TABLE CustomMarketShop (
    ItemGUID      INT NOT NULL,
    AuthCode      INT NOT NULL,
    SellerAccount VARCHAR(10) NOT NULL,
    SellerName    VARCHAR(10) NOT NULL,
    Price         INT NOT NULL,
    PriceType     TINYINT NOT NULL,
    Item          VARBINARY(16) NOT NULL,
    Tax           INT NOT NULL,
    CONSTRAINT PK_CustomMarketShop PRIMARY KEY (ItemGUID)
);
GO

-- CashShopData -- AccountID is the real PK (confirmed).
CREATE TABLE CashShopData (
    AccountID   VARCHAR(10) NOT NULL,
    WCoinC      INT NOT NULL DEFAULT 0,
    WCoinP      INT NOT NULL DEFAULT 0,
    GoblinPoint INT NOT NULL DEFAULT 0,
    CONSTRAINT PK_CashShopData PRIMARY KEY (AccountID)
);
GO

-- warehouse -- AccountID is the real PK (confirmed). Items/blob columns
-- kept minimal-but-present since bm_AnonymizeGameAccount/bm_PurgeGameAccount
-- both DELETE this row (Money/EndUseDate/DbVersion/pw not needed for that).
CREATE TABLE warehouse (
    AccountID VARCHAR(10) NOT NULL,
    Items     VARBINARY(3840) NULL,
    Money     INT NULL,
    CONSTRAINT PK_warehouse PRIMARY KEY (AccountID)
);
GO

-- CustomQuest -- the ONE real FK in the whole database. Preserved exactly:
-- ON DELETE CASCADE, no ON UPDATE action (default NO ACTION), which is
-- precisely the "UNKNOWN_BEHAVIOR_ON_RENAME" constraint
-- bm_AnonymizeGameAccount's NOCHECK/CHECK CHECK technique exists to work
-- around (plan Part 4 #3, procedure VERIFY_BEFORE_USE #2).
CREATE TABLE CustomQuest (
    Id   INT IDENTITY(1,1) NOT NULL,
    Name VARCHAR(10) NOT NULL,
    CONSTRAINT PK_CustomQuest PRIMARY KEY (Id),
    CONSTRAINT FK_CustomQuest_Character FOREIGN KEY (Name) REFERENCES Character(Name) ON DELETE CASCADE
);
GO

-- T_FriendMain / T_FriendList / T_WaitFriend -- CONFIRMED real shape,
-- 2026-08-30, via bm-sql (sys.tables/sys.columns/sys.indexes against real
-- production). This CORRECTS the previous version of this file, which
-- assumed a Name/FriendName-keyed shape for T_FriendList/T_WaitFriend --
-- the real tables have NO Name column at all; the friend system's own key
-- is a numeric GUID (T_FriendMain.GUID, the real PK), unrelated to
-- Character.id. T_FriendMain is the only one of the three with both GUID
-- and Name together, so it's the required bridge from a character name to
-- its friend-system GUID. See local-writer-smoke-test.sql/
-- proposed-bm-anonymize-game-account-procedure.sql /
-- proposed-bm-purge-game-account-procedure.sql for the corrected
-- lookup-then-delete logic this real shape requires.
CREATE TABLE T_FriendMain (
    GUID        INT NOT NULL,
    Name        VARCHAR(10) NOT NULL,
    FriendCount TINYINT NULL,
    MemoCount   INT NULL,
    MemoTotal   INT NULL,
    CONSTRAINT PK_T_FriendMain PRIMARY KEY (GUID)
);
GO
-- No PK/unique index in production on either T_FriendList or
-- T_WaitFriend (confirmed absent via sys.indexes) -- reproduced exactly,
-- not "improved" with a PK that doesn't exist there.
CREATE TABLE T_FriendList (
    GUID       INT NOT NULL,
    FriendGuid INT NULL,
    FriendName VARCHAR(10) NULL,
    Del        TINYINT NULL
);
GO
CREATE TABLE T_WaitFriend (
    GUID       INT NOT NULL,
    FriendGuid INT NOT NULL,
    FriendName VARCHAR(10) NOT NULL
);
GO

-- Ranking* + Gens_Rank -- minimal shape (Id, Name) sufficient for
-- bm_PurgeGameAccount's DELETE-by-character-name statements (plan Part 5 #5).
CREATE TABLE RankingBloodCastle    (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingCaptureTheFlag (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingCastleSiege    (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingChaosCastle    (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingCustom         (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingDevilSquare    (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingDuel           (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingIllusionTemple (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingKingGuild      (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingKingPlayer     (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingMataMata       (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE RankingTvT            (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE Gens_Rank             (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
GO

-- PHASE K HARDENING, 2026-08-30 -- the remaining real character-keyed and
-- account-keyed tables bm_AnonymizeGameAccount/bm_PurgeGameAccount now
-- also touch (docs/gameserver/database/account-data-map.md, found via a
-- full-138-table audit against bloodmoon_gameserver_lab, cross-checked
-- against the native WZ_DeleteCharacter/WZ_RenameCharacter procedures'
-- own real table dependencies). Minimal shape (just Name/AccountID plus
-- the columns needed for the procedures to compile and run) -- not a full
-- replica, same convention as the Ranking*/Gens_Rank tables above.
CREATE TABLE T_CGuid               (GUID INT NOT NULL, Name VARCHAR(10) NOT NULL, CONSTRAINT PK_T_CGuid PRIMARY KEY (GUID));
CREATE TABLE HelperData             (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE MasterSkillTree        (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE OptionData             (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE QuestKillCount         (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE QuestWorld             (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE CustomRewardItem       (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE EventLeoTheHelper      (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE EventSantaClaus        (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE Gens_Reward            (Name VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE CustomDailyReward      (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE CustomItemVisualBackup (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE CustomItemVisualDefault(Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
CREATE TABLE CustomReBuild          (Id INT IDENTITY(1,1) PRIMARY KEY, Name VARCHAR(10) NOT NULL);
GO

CREATE TABLE ExtWarehouse       (AccountID VARCHAR(10) NOT NULL PRIMARY KEY, Items VARBINARY(3840) NULL, Money INT NULL, Number INT NULL);
CREATE TABLE CustomJewelBank    (AccountID VARCHAR(10) NOT NULL PRIMARY KEY);
CREATE TABLE LuckyCoin          (AccountID VARCHAR(10) NOT NULL PRIMARY KEY, LuckyCoin INT NULL);
CREATE TABLE CashShopInventory  (Id INT IDENTITY(1,1) PRIMARY KEY, AccountID VARCHAR(10) NOT NULL);
CREATE TABLE CustomGift         (Id INT IDENTITY(1,1) PRIMARY KEY, AccountID VARCHAR(10) NOT NULL);
CREATE TABLE GremoryCase        (ItemGUID INT NOT NULL PRIMARY KEY, AccountID VARCHAR(10) NOT NULL, Name VARCHAR(10) NOT NULL);
CREATE TABLE MEMB_STAT          (memb___id VARCHAR(10) NOT NULL PRIMARY KEY, IP VARCHAR(15) NULL);
CREATE TABLE DmN_OnlineCheck    (Id INT IDENTITY(1,1) PRIMARY KEY, memb___id VARCHAR(10) NOT NULL);
GO
