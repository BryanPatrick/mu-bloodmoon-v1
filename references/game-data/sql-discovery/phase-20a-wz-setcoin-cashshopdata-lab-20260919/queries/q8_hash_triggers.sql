SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: definition hashes (to compare raw_analysis vs lab) and the database's triggers.
SELECT DB_NAME() AS db, o.name, LEN(m.definition) AS len,
       CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONVERT(VARBINARY(MAX), m.definition)), 2) AS sha256_of_utf16_definition
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE o.name IN ('WZ_SetCoin','WZ_SetExchangeReward','WZ_SetKD','WZ_CustomMonsterReward','WZ_SetRewardCastleSiege','WZ_CustomArenaRanking','WZ_CustomEventBattleRoyaleRanking','WZ_CustomEventDropNpcRanking')
ORDER BY o.name;
SELECT DB_NAME() AS db, 'TRIGGER' AS kind, t.name AS trigger_name, OBJECT_NAME(t.parent_id) AS parent_table, t.is_disabled FROM sys.triggers t;
SELECT DB_NAME() AS db, 'CASHSHOPDATA_COLUMNS' AS kind, STUFF((SELECT ';' + c.name + ':' + ty.name + ':' + CAST(c.is_nullable AS VARCHAR(1)) FROM sys.columns c JOIN sys.types ty ON ty.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID('dbo.CashShopData') ORDER BY c.column_id FOR XML PATH('')), 1, 1, '') AS cols;
SELECT DB_NAME() AS db, 'PROC_COUNT' AS kind, COUNT(*) AS n FROM sys.procedures;
