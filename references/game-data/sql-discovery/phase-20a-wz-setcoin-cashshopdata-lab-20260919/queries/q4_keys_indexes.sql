SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: keys, indexes, constraints, triggers, FKs, approximate size for dbo.CashShopData.
SELECT i.index_id, i.name AS index_name, i.type_desc, i.is_primary_key, i.is_unique, i.is_unique_constraint, i.is_disabled, i.fill_factor,
       STUFF((SELECT ', ' + c.name + CASE WHEN ic2.is_descending_key = 1 THEN ' DESC' ELSE '' END
              FROM sys.index_columns ic2 JOIN sys.columns c ON c.object_id = ic2.object_id AND c.column_id = ic2.column_id
              WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND ic2.is_included_column = 0
              ORDER BY ic2.key_ordinal FOR XML PATH('')), 1, 2, '') AS key_columns
FROM sys.indexes i WHERE i.object_id = OBJECT_ID('dbo.CashShopData') ORDER BY i.index_id;
SELECT 'CHECK' AS kind, name, definition FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.CashShopData');
SELECT 'FK_OUT' AS kind, name, OBJECT_NAME(referenced_object_id) AS referenced_table FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('dbo.CashShopData');
SELECT 'FK_IN' AS kind, name, OBJECT_NAME(parent_object_id) AS referencing_table FROM sys.foreign_keys WHERE referenced_object_id = OBJECT_ID('dbo.CashShopData');
SELECT 'TRIGGER' AS kind, name, is_disabled, is_instead_of_trigger FROM sys.triggers WHERE parent_id = OBJECT_ID('dbo.CashShopData');
SELECT 'ROWCOUNT_APPROX' AS kind, SUM(row_count) AS row_count FROM sys.dm_db_partition_stats WHERE object_id = OBJECT_ID('dbo.CashShopData') AND index_id IN (0,1);
SELECT 'TABLE' AS kind, name, create_date, modify_date FROM sys.tables WHERE object_id = OBJECT_ID('dbo.CashShopData');
