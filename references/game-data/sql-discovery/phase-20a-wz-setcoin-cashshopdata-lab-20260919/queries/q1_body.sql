SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY metadata inspection of the preserved, unmodified restore of the 2026-07-16 production backup.
SELECT 'db='+DB_NAME()+' server='+@@SERVERNAME AS context;
SELECT o.name, o.type_desc, o.create_date, o.modify_date, LEN(m.definition) AS def_len,
       m.uses_ansi_nulls, m.uses_quoted_identifier, m.is_schema_bound, m.execute_as_principal_id,
       CASE WHEN m.definition IS NULL THEN 'ENCRYPTED_OR_NULL' ELSE 'PLAINTEXT' END AS def_state
FROM sys.objects o LEFT JOIN sys.sql_modules m ON m.object_id = o.object_id
WHERE o.name IN ('WZ_SetCoin','WZ_GetCoin','WZ_AddCoin','WZ_SubCoin') OR o.name LIKE '%Coin%';
