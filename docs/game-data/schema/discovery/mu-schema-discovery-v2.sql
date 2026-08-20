-- Blood Moon Game Data Platform -- Phase 2A discovery, v2 (narrowed).
--
-- v1 (mu-schema-discovery.sql) pattern-matched an unknown schema with
-- broad LIKE hypotheses. The legacy web intelligence sweep
-- (docs/game-data/legacy-web-intelligence/) found real, executing code
-- naming specific tables -- this version queries metadata for exactly
-- those tables instead. Still LEGACY_CODE_CONFIRMED evidence, not
-- SCHEMA_CONFIRMED -- the vendor may have changed schema since either
-- backup was taken. Only this script's real output promotes anything to
-- CONFIRMED.
--
-- SAFETY: identical guarantee to v1 -- every statement is a SELECT against
-- system catalog views (sys.*) or INFORMATION_SCHEMA. No application/
-- player data is read. No INSERT/UPDATE/DELETE/MERGE/EXEC/DDL anywhere.
-- Run with the most restricted read-only login available.
--
-- Table list, sourced from docs/game-data/legacy-web-intelligence/query-catalog.md:
--   Account:      MEMB_INFO, MEMB_STAT, DmN_Ban_List
--   Character:    Character, AccountCharacter, MasterSkillTree
--   Rankings:      RankingBloodCastle, RankingDevilSquare, RankingChaosCastle,
--                  RankingCastleSiege, RankingDuel, C_PlayerKiller_Info
--   Guild:         Guild, GuildMember, MuCastle_DATA, MuCastle_REG_SIEGE
--   Inventory:     Warehouse, DmN_Web_Storage, DmN_Market, DmN_Warehouse_Delete_Log
--   Currencies:    CashShopData, DmN_Shop_Credits, T_InGameShop_Point,
--                  T_MasterLevelSystem, DmN_Account_Logs
-- Some of these (T_InGameShop_Point, T_MasterLevelSystem) are alternate-engine
-- presets NOT confirmed active for this install -- included so their
-- presence/absence itself is informative (if they don't exist, that's
-- useful negative evidence the DEFAULT preset really is the live one).

DECLARE @Targets TABLE (name NVARCHAR(128));
INSERT INTO @Targets (name) VALUES
    ('MEMB_INFO'), ('MEMB_STAT'), ('DmN_Ban_List'),
    ('Character'), ('AccountCharacter'), ('MasterSkillTree'),
    ('RankingBloodCastle'), ('RankingDevilSquare'), ('RankingChaosCastle'),
    ('RankingCastleSiege'), ('RankingDuel'), ('C_PlayerKiller_Info'),
    ('Guild'), ('GuildMember'), ('MuCastle_DATA'), ('MuCastle_REG_SIEGE'),
    ('Warehouse'), ('DmN_Web_Storage'), ('DmN_Market'), ('DmN_Warehouse_Delete_Log'),
    ('CashShopData'), ('DmN_Shop_Credits'), ('T_InGameShop_Point'),
    ('T_MasterLevelSystem'), ('DmN_Account_Logs');

-- ===========================================================================
-- SECTION 1 -- Which target tables actually exist here (negative evidence
-- matters too -- e.g. if T_InGameShop_Point doesn't exist, that confirms
-- the DEFAULT credits preset, not an IGCN-family engine, is live).
-- ===========================================================================
SELECT
    tgt.name AS target_table,
    CASE WHEN t.object_id IS NULL THEN 'NOT FOUND' ELSE 'FOUND' END AS status,
    s.name AS schema_name
FROM @Targets tgt
LEFT JOIN sys.tables t ON t.name = tgt.name
LEFT JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY status, tgt.name;


-- ===========================================================================
-- SECTION 2 -- Full column detail for every target table that exists
-- ===========================================================================
SELECT
    c.TABLE_SCHEMA,
    c.TABLE_NAME,
    c.ORDINAL_POSITION,
    c.COLUMN_NAME,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    c.NUMERIC_PRECISION,
    c.NUMERIC_SCALE,
    c.IS_NULLABLE,
    c.COLLATION_NAME,
    c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME IN (SELECT name FROM @Targets)
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;


-- ===========================================================================
-- SECTION 3 -- Primary key / unique constraints
-- ===========================================================================
SELECT
    tc.TABLE_SCHEMA,
    tc.TABLE_NAME,
    tc.CONSTRAINT_TYPE,
    tc.CONSTRAINT_NAME,
    kcu.COLUMN_NAME,
    kcu.ORDINAL_POSITION
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
   AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
  AND tc.TABLE_NAME IN (SELECT name FROM @Targets)
ORDER BY tc.TABLE_SCHEMA, tc.TABLE_NAME, tc.CONSTRAINT_TYPE, kcu.ORDINAL_POSITION;


-- ===========================================================================
-- SECTION 4 -- Foreign key relationships -- the real answer to how these
-- tables actually relate, superseding the legacy code's app-level joins
-- (Character.AccountId = MEMB_INFO.memb___id etc. were app-level string
-- comparisons, not necessarily enforced FKs -- this section shows whether
-- the database itself enforces any of them).
-- ===========================================================================
SELECT
    fk.name                AS foreign_key_name,
    tp.name                AS parent_table,
    cp.name                AS parent_column,
    tr.name                AS referenced_table,
    cr.name                AS referenced_column
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables tp ON tp.object_id = fkc.parent_object_id
JOIN sys.columns cp ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
JOIN sys.tables tr ON tr.object_id = fkc.referenced_object_id
JOIN sys.columns cr ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
WHERE tp.name IN (SELECT name FROM @Targets) OR tr.name IN (SELECT name FROM @Targets)
ORDER BY parent_table, parent_column;


-- ===========================================================================
-- SECTION 5 -- Indexes on target tables
-- ===========================================================================
SELECT
    t.name          AS table_name,
    i.name          AS index_name,
    i.is_unique,
    i.is_primary_key,
    c.name          AS column_name,
    ic.key_ordinal
FROM sys.indexes i
JOIN sys.tables t ON t.object_id = i.object_id
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE t.name IN (SELECT name FROM @Targets)
ORDER BY t.name, i.name, ic.key_ordinal;


-- ===========================================================================
-- SECTION 6 -- Approximate row counts (metadata estimate, never scans data)
-- ===========================================================================
SELECT
    t.name  AS table_name,
    SUM(p.rows) AS approximate_row_count
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE t.name IN (SELECT name FROM @Targets)
GROUP BY t.name
ORDER BY t.name;


-- ===========================================================================
-- SECTION 7 -- Stored procedures named in the legacy code (existence check
-- only -- confirms/denies whether they're actually installed on THIS
-- server; never executed).
-- ===========================================================================
SELECT
    p.name AS procedure_name,
    p.create_date,
    p.modify_date
FROM sys.procedures p
WHERE p.name IN (
    'DmN_Check_Acc_MD5', 'WZ_GetItemSerial', 'WZ_GetItemSerial2',
    'WZ_PeriodItemInsert', 'IGC_PeriodItemInsertEx',
    'WZ_CONNECT_MEMB', 'WZ_DISCONNECT_MEMB'
)
ORDER BY p.name;
