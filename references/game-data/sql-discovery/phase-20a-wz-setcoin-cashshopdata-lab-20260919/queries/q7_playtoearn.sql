SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: second coin-bearing table CustomPlayToEarn (schema only) and anything referencing it.
SELECT c.column_id, c.name AS column_name, t.name AS type_name, c.max_length, c.is_nullable, dc.definition AS default_definition
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE c.object_id = OBJECT_ID('dbo.CustomPlayToEarn') ORDER BY c.column_id;
SELECT i.name AS index_name, i.type_desc, i.is_primary_key, i.is_unique FROM sys.indexes i WHERE i.object_id = OBJECT_ID('dbo.CustomPlayToEarn') AND i.index_id > 0;
SELECT 'REFERENCING' AS kind, OBJECT_NAME(d.referencing_id) AS referencing_object, o.type_desc
FROM sys.sql_expression_dependencies d JOIN sys.objects o ON o.object_id = d.referencing_id WHERE d.referenced_id = OBJECT_ID('dbo.CustomPlayToEarn');
SELECT 'ROWCOUNT_APPROX' AS kind, SUM(row_count) AS row_count FROM sys.dm_db_partition_stats WHERE object_id = OBJECT_ID('dbo.CustomPlayToEarn') AND index_id IN (0,1);
