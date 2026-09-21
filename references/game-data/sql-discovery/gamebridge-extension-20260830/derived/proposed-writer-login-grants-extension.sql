-- REVIEWED, NOT INSTALLED. Written per docs/gamebridge/gamebridge-agent-extension-plan.md
-- Part 7 (AFTER state). Not run against any SQL Server this session.
--
-- Run the four new procedure files FIRST (each procedure must exist before
-- GRANT EXECUTE on it can succeed), then this script, against the EXISTING
-- `bloodmoon_writer` login (the same one references/.../phase-3c.../derived/
-- proposed-writer-login-grants.sql created for CREATE_GAME_ACCOUNT) --
-- this script does NOT create a new login, it only adds four new grants.
--
-- Order:
--   1. proposed-bm-grant-vip-procedure.sql
--   2. proposed-bm-sync-vip-tier-procedure.sql
--   3. proposed-bm-anonymize-game-account-procedure.sql
--   4. proposed-bm-purge-game-account-procedure.sql
--   5. THIS FILE

USE MuOnline;
GO

-- The only four new permissions this login ever receives. No table
-- permission, no role membership -- same discipline as the existing
-- DmN_CreateGameAccount grant.
GRANT EXECUTE ON dbo.bm_GrantVip TO bloodmoon_writer;
GO
GRANT EXECUTE ON dbo.bm_SyncVipTier TO bloodmoon_writer;
GO
GRANT EXECUTE ON dbo.bm_AnonymizeGameAccount TO bloodmoon_writer;
GO
GRANT EXECUTE ON dbo.bm_PurgeGameAccount TO bloodmoon_writer;
GO

-- The existing DENY (SELECT/INSERT/UPDATE/DELETE ON SCHEMA::dbo) already
-- covers these new procedures' tables too -- nothing to add here. Not
-- re-issued by this script since it already exists on the login from the
-- original install; re-running it is harmless but unnecessary.

-- ============================================================
-- VERIFICATION -- extends the existing script's own verification block
-- with four more CanExecute* checks (expected 1) and the full
-- CanSelect/Insert/Update/Delete matrix for every table touched by the
-- four new procedures (all expected 0) -- not a smaller check just
-- because there are more tables now (plan Part 7: "the whole point of the
-- original script was exhaustiveness, and that discipline should not
-- shrink for this extension").
-- ============================================================

EXECUTE AS USER = 'bloodmoon_writer';
SELECT
    HAS_PERMS_BY_NAME('dbo.DmN_CreateGameAccount', 'OBJECT', 'EXECUTE') AS CanExecuteCreateGameAccount,
    HAS_PERMS_BY_NAME('dbo.bm_GrantVip', 'OBJECT', 'EXECUTE') AS CanExecuteGrantVip,
    HAS_PERMS_BY_NAME('dbo.bm_SyncVipTier', 'OBJECT', 'EXECUTE') AS CanExecuteSyncVipTier,
    HAS_PERMS_BY_NAME('dbo.bm_AnonymizeGameAccount', 'OBJECT', 'EXECUTE') AS CanExecuteAnonymizeGameAccount,
    HAS_PERMS_BY_NAME('dbo.bm_PurgeGameAccount', 'OBJECT', 'EXECUTE') AS CanExecutePurgeGameAccount,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'SELECT') AS CanSelectMembInfo,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'UPDATE') AS CanUpdateMembInfo,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'SELECT') AS CanSelectCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'UPDATE') AS CanUpdateCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'DELETE') AS CanDeleteCharacter,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'UPDATE') AS CanUpdateAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'DELETE') AS CanDeleteAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.Guild', 'OBJECT', 'SELECT') AS CanSelectGuild,
    HAS_PERMS_BY_NAME('dbo.GuildMember', 'OBJECT', 'DELETE') AS CanDeleteGuildMember,
    HAS_PERMS_BY_NAME('dbo.CustomMarketShop', 'OBJECT', 'DELETE') AS CanDeleteCustomMarketShop,
    HAS_PERMS_BY_NAME('dbo.CustomQuest', 'OBJECT', 'DELETE') AS CanDeleteCustomQuest,
    HAS_PERMS_BY_NAME('dbo.CustomQuest', 'OBJECT', 'ALTER') AS CanAlterCustomQuest,
    HAS_PERMS_BY_NAME('dbo.warehouse', 'OBJECT', 'DELETE') AS CanDeleteWarehouse,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'UPDATE') AS CanUpdateCashShopData,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'DELETE') AS CanDeleteCashShopData,
    HAS_PERMS_BY_NAME('dbo.T_FriendMain', 'OBJECT', 'DELETE') AS CanDeleteFriendMain,
    HAS_PERMS_BY_NAME('dbo.T_FriendList', 'OBJECT', 'DELETE') AS CanDeleteFriendList,
    HAS_PERMS_BY_NAME('dbo.T_WaitFriend', 'OBJECT', 'DELETE') AS CanDeleteWaitFriend,
    HAS_PERMS_BY_NAME('dbo.RankingCustom', 'OBJECT', 'DELETE') AS CanDeleteRankingCustom;
REVERT;
-- Expected result: the five CanExecute* columns = 1, every other column =
-- 0 (including CanAlterCustomQuest -- bm_AnonymizeGameAccount's ALTER
-- TABLE...NOCHECK/CHECK CONSTRAINT statements run under WITH EXECUTE AS
-- OWNER, which is why bloodmoon_writer itself needs zero ALTER permission
-- to call it). If anything else is 1, STOP and do not hand the credential
-- over yet -- same rule as the original script.
