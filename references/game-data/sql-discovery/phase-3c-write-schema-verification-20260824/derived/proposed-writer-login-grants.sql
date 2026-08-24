-- Reviewed Phase 3C source. Installed on the real MU SQL Server through
-- the separately authorized RemoteOps administrative bootstrap path.
-- bm-sql remained read-only and rejects this DDL by design.
--
-- Run proposed-create-game-account-procedure.sql FIRST (the procedure
-- must exist before GRANT EXECUTE on it can succeed), then this script.
--
-- Checklist cross-reference (every item from your review request):
--
--  [x] Dedicated login/user, not shared with any existing principal
--      -> new login `bloodmoon_writer`, distinct from `bloodmoon_observer`
--  [x] NOT sysadmin        -> never added to any server role
--  [x] NOT db_owner        -> never added to any database role
--  [x] No broad INSERT/UPDATE/DELETE if avoidable
--      -> none granted at all, on any table, ever (see note below on why
--         this is true even without the DENY lines)
--  [x] GRANT EXECUTE only on the one CREATE_GAME_ACCOUNT procedure
--      -> the only GRANT in this entire script
--  [x] No permissions for Character/Warehouse/CashShopData/inventory/
--      unrelated tables -> never mentioned anywhere in this script;
--      the login has zero ability to reach them
--  [x] No generic EXECUTE permission -> a fresh user has none by
--      default; only the one named procedure is granted
--  [x] No secrets committed/printed -> password is a placeholder for
--      bootstrap substitutes a cryptographically random value locally,
--      stores it with DPAPI, and never prints or commits it

-- WHY THE LOGIN CAN'T TOUCH OTHER TABLES EVEN WITHOUT THE DENY LINES:
-- SQL Server denies by default. A freshly created login/user has ZERO
-- permissions on anything until explicitly granted -- so the single
-- `GRANT EXECUTE ON dbo.DmN_CreateGameAccount` below is, on its own,
-- already sufficient for least-privilege. The DENY statements further
-- down are pure defense-in-depth: they protect against a *future*
-- mistake (e.g. someone later running `sp_addrolemember 'db_datareader',
-- 'bloodmoon_writer'` by accident) by making the restriction an explicit,
-- permanent policy rather than an absence that could be silently
-- widened later. This mirrors bloodmoon_observer's own existing pattern
-- (explicit denies alongside its read-only grant).
--
-- WHY THE PROCEDURE CAN STILL WRITE TO MEMB_INFO/AccountCharacter
-- DESPITE THE LOGIN HAVING NO TABLE PERMISSIONS: SQL Server's ownership
-- chaining. A stored procedure's *internal* access to objects it
-- references (MEMB_INFO, AccountCharacter, and the system procedure
-- sp_getapplock it calls) is checked against the procedure's OWNER
-- (whoever creates it, typically dbo), not against the caller
-- (bloodmoon_writer). The caller only ever needs EXECUTE permission on
-- the procedure itself -- never any permission on the tables it touches.
-- This is the standard, well-documented SQL Server pattern for exactly
-- this "let a low-privilege caller do one specific, safe thing" use
-- case, not a workaround.
--
-- NO DYNAMIC SQL anywhere in the referenced procedure -- every statement
-- in proposed-create-game-account-procedure.sql is static T-SQL, so
-- there is no way for caller-supplied input to influence which table or
-- column is touched.

USE master;
GO
CREATE LOGIN bloodmoon_writer
    WITH PASSWORD = '<STRONG_PASSWORD_HERE>',
    CHECK_POLICY = ON,
    CHECK_EXPIRATION = OFF;
GO

USE MuOnline;
GO
CREATE USER bloodmoon_writer FOR LOGIN bloodmoon_writer;
GO

-- The only permission this login ever receives.
GRANT EXECUTE ON dbo.DmN_CreateGameAccount TO bloodmoon_writer;
GO

-- Defense in depth for direct table access. Deliberately do NOT DENY
-- EXECUTE at schema/database scope: SQL Server DENY precedence would
-- also block the object-level GRANT. A fresh user already cannot execute
-- any other procedure, so this object's GRANT remains the only surface.
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO bloodmoon_writer;
GO

-- ============================================================
-- VERIFICATION -- run these after the script above. Safe, read-only,
-- never reveals the password.
-- ============================================================

-- 1. Lists every explicit grant/deny recorded for this login (should
--    show exactly: one GRANT EXECUTE on DmN_CreateGameAccount and DENY
--    on SCHEMA::dbo for SELECT/INSERT/UPDATE/DELETE.
SELECT dp.permission_name, dp.state_desc, o.name AS ObjectOrSchemaName
FROM sys.database_permissions dp
LEFT JOIN sys.objects o ON o.object_id = dp.major_id
JOIN sys.database_principals pr ON pr.principal_id = dp.grantee_principal_id
WHERE pr.name = 'bloodmoon_writer';

-- 2. The DEFINITIVE check -- actual EFFECTIVE permission (accounts for
--    precedence automatically, doesn't require you to reason about it
--    by hand). Run as an admin; EXECUTE AS impersonates bloodmoon_writer
--    for the duration of this batch only.
EXECUTE AS USER = 'bloodmoon_writer';
SELECT
    HAS_PERMS_BY_NAME('dbo.DmN_CreateGameAccount', 'OBJECT', 'EXECUTE') AS CanExecuteProcedure,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'SELECT') AS CanSelectMembInfo,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'INSERT') AS CanInsertMembInfo,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'UPDATE') AS CanUpdateMembInfo,
    HAS_PERMS_BY_NAME('dbo.MEMB_INFO', 'OBJECT', 'DELETE') AS CanDeleteMembInfo,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'SELECT') AS CanSelectAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'INSERT') AS CanInsertAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'UPDATE') AS CanUpdateAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.AccountCharacter', 'OBJECT', 'DELETE') AS CanDeleteAccountCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'SELECT') AS CanSelectCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'INSERT') AS CanInsertCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'UPDATE') AS CanUpdateCharacter,
    HAS_PERMS_BY_NAME('dbo.Character', 'OBJECT', 'DELETE') AS CanDeleteCharacter,
    HAS_PERMS_BY_NAME('dbo.warehouse', 'OBJECT', 'SELECT') AS CanSelectWarehouse,
    HAS_PERMS_BY_NAME('dbo.warehouse', 'OBJECT', 'INSERT') AS CanInsertWarehouse,
    HAS_PERMS_BY_NAME('dbo.warehouse', 'OBJECT', 'UPDATE') AS CanUpdateWarehouse,
    HAS_PERMS_BY_NAME('dbo.warehouse', 'OBJECT', 'DELETE') AS CanDeleteWarehouse,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'SELECT') AS CanSelectCashShopData,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'INSERT') AS CanInsertCashShopData,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'UPDATE') AS CanUpdateCashShopData,
    HAS_PERMS_BY_NAME('dbo.CashShopData', 'OBJECT', 'DELETE') AS CanDeleteCashShopData;
REVERT;
-- Expected result: CanExecuteProcedure = 1, every other column = 0.
-- If anything else is 1, STOP and do not hand the credential over yet.
