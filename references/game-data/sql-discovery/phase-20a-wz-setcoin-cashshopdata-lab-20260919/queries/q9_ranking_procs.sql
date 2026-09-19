SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: bodies of the three ranking-reward procedures that mention CashShopData / the balance columns.
SELECT o.name, m.definition
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE o.name IN ('WZ_SetRankingDay','WZ_SetRankingMon','WZ_SetRankingWek')
ORDER BY o.name;
