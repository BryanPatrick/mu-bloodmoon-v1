-- Blood Moon Game Data Platform -- Phase 2A: real MU SQL Server schema
-- discovery, read-only.
--
-- SAFETY: every statement in this file is a SELECT against system catalog
-- views (sys.*) or INFORMATION_SCHEMA -- metadata only. Nothing here reads
-- or writes a single row of application/player data. No INSERT, UPDATE,
-- DELETE, MERGE, EXEC, DDL, index or schema change of any kind appears
-- anywhere below. Row counts (Section 6) come from sys.partitions'
-- pre-computed estimate, not SELECT COUNT(*), so even that never scans
-- data.
--
-- Run this with the most restricted read-only login available (ideally one
-- with SELECT granted only on INFORMATION_SCHEMA/sys catalog views, or a
-- generic db_datareader role -- catalog metadata is visible under either).
--
-- HOW TO USE:
-- 1. Run each section below against the real MU SQL Server, in order.
-- 2. Save each result grid (Section 1-6) as-is.
-- 3. Nothing here ever touches real player data, so the full output is
--    safe to share back for classification into CONFIRMED/OBSERVED/
--    INFERRED/UNKNOWN -- but skim it yourself first regardless, and redact
--    anything that surprises you before sharing.
-- 4. The LIKE patterns in Sections 2-6 are SEARCH HYPOTHESES only (typical
--    MU Online / legacy AdminCP naming), not claims about this server's
--    real schema -- see docs/game-data/schema/join-keys-unknown.md. If a
--    real table doesn't match any pattern, it simply won't appear in
--    Sections 2-6; re-run with adjusted patterns rather than assuming it
--    doesn't exist.

-- ===========================================================================
-- SECTION 1 -- Full table inventory (ground truth, no filtering by guesses)
-- ===========================================================================
SELECT
    s.name  AS schema_name,
    t.name  AS table_name,
    t.create_date,
    t.modify_date
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY s.name, t.name;


-- ===========================================================================
-- SECTION 2 -- Candidate tables: full column detail
-- Search hypotheses (INFERRED, not CONFIRMED): account/membership/character
-- naming patterns seen in classic MU Online schemas and this project's own
-- prior AdminCP audit (docs/game-vps-sqlserver-transition.md).
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
    c.COLLATION_NAME,          -- reveals case sensitivity: *_CS_* = case-sensitive, *_CI_* = case-insensitive
    c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_NAME LIKE '%account%'
   OR c.TABLE_NAME LIKE '%memb%'        -- classic MU account table is often named MEMB_INFO / MEMB_STAT
   OR c.TABLE_NAME LIKE '%char%'        -- Character, CharacterEx, etc.
   OR c.TABLE_NAME LIKE '%player%'
   OR c.TABLE_NAME LIKE '%user%'
   OR c.TABLE_NAME LIKE 'Ranking%'
   OR c.TABLE_NAME LIKE 'MasterSkillTree%'
   OR c.TABLE_NAME LIKE 'CashShopData%'
   OR c.TABLE_NAME LIKE 'Guild%'
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;


-- ===========================================================================
-- SECTION 3 -- Primary key / unique constraints on those candidate tables
-- Answers "uniqueness" directly from metadata, no data access needed.
-- ===========================================================================
SELECT
    tc.TABLE_SCHEMA,
    tc.TABLE_NAME,
    tc.CONSTRAINT_TYPE,        -- PRIMARY KEY / UNIQUE
    tc.CONSTRAINT_NAME,
    kcu.COLUMN_NAME,
    kcu.ORDINAL_POSITION
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
   AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
  AND (
        tc.TABLE_NAME LIKE '%account%'
     OR tc.TABLE_NAME LIKE '%memb%'
     OR tc.TABLE_NAME LIKE '%char%'
     OR tc.TABLE_NAME LIKE '%player%'
     OR tc.TABLE_NAME LIKE '%user%'
     OR tc.TABLE_NAME LIKE 'Ranking%'
     OR tc.TABLE_NAME LIKE 'MasterSkillTree%'
     OR tc.TABLE_NAME LIKE 'CashShopData%'
     OR tc.TABLE_NAME LIKE 'Guild%'
  )
ORDER BY tc.TABLE_SCHEMA, tc.TABLE_NAME, tc.CONSTRAINT_TYPE, kcu.ORDINAL_POSITION;


-- ===========================================================================
-- SECTION 4 -- Foreign key relationships involving those candidate tables
-- This is the real answer to "how does Account relate to Character(s)".
-- ===========================================================================
SELECT
    fk.name                                     AS foreign_key_name,
    tp.name                                      AS parent_table,
    cp.name                                       AS parent_column,
    tr.name                                        AS referenced_table,
    cr.name                                         AS referenced_column
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables tp ON tp.object_id = fkc.parent_object_id
JOIN sys.columns cp ON cp.object_id = fkc.parent_object_id AND cp.column_id = fkc.parent_column_id
JOIN sys.tables tr ON tr.object_id = fkc.referenced_object_id
JOIN sys.columns cr ON cr.object_id = fkc.referenced_object_id AND cr.column_id = fkc.referenced_column_id
WHERE tp.name LIKE '%account%' OR tp.name LIKE '%memb%' OR tp.name LIKE '%char%'
   OR tr.name LIKE '%account%' OR tr.name LIKE '%memb%' OR tr.name LIKE '%char%'
ORDER BY parent_table, parent_column;


-- ===========================================================================
-- SECTION 5 -- Indexes on those candidate tables
-- An indexed column (beyond the PK) is a soft signal that it's queried
-- often -- worth knowing when picking a real join/identity key.
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
WHERE t.name LIKE '%account%' OR t.name LIKE '%memb%' OR t.name LIKE '%char%'
   OR t.name LIKE '%player%' OR t.name LIKE '%user%'
   OR t.name LIKE 'Ranking%' OR t.name LIKE 'MasterSkillTree%'
   OR t.name LIKE 'CashShopData%' OR t.name LIKE 'Guild%'
ORDER BY t.name, i.name, ic.key_ordinal;


-- ===========================================================================
-- SECTION 6 -- Approximate row counts (metadata estimate, never scans data)
-- Just for scale/orientation -- not exact, not a data read.
-- ===========================================================================
SELECT
    t.name  AS table_name,
    SUM(p.rows) AS approximate_row_count
FROM sys.tables t
JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE t.name LIKE '%account%' OR t.name LIKE '%memb%' OR t.name LIKE '%char%'
   OR t.name LIKE '%player%' OR t.name LIKE '%user%'
   OR t.name LIKE 'Ranking%' OR t.name LIKE 'MasterSkillTree%'
   OR t.name LIKE 'CashShopData%' OR t.name LIKE 'Guild%'
GROUP BY t.name
ORDER BY t.name;
