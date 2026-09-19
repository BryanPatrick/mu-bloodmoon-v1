SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: every module (procedure/function/view/trigger) whose text mentions CashShopData or the three balance columns,
-- plus declared dependencies. Names and lengths only here; bodies are fetched separately.
SELECT o.name, o.type_desc, LEN(m.definition) AS def_len,
       CASE WHEN m.definition LIKE '%CashShopData%' THEN 1 ELSE 0 END AS mentions_table,
       CASE WHEN m.definition LIKE '%WCoinC%' THEN 1 ELSE 0 END AS mentions_wcoinc,
       CASE WHEN m.definition LIKE '%WCoinP%' THEN 1 ELSE 0 END AS mentions_wcoinp,
       CASE WHEN m.definition LIKE '%GoblinPoint%' THEN 1 ELSE 0 END AS mentions_goblin
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE m.definition LIKE '%CashShopData%' OR m.definition LIKE '%WCoinC%' OR m.definition LIKE '%WCoinP%' OR m.definition LIKE '%GoblinPoint%'
ORDER BY o.type_desc, o.name;
SELECT 'DEPENDS_ON_CashShopData' AS kind, OBJECT_NAME(d.referencing_id) AS referencing_object, o.type_desc
FROM sys.sql_expression_dependencies d JOIN sys.objects o ON o.object_id = d.referencing_id
WHERE d.referenced_id = OBJECT_ID('dbo.CashShopData') ORDER BY 2;
SELECT 'OTHER_TABLES_WITH_COIN_COLUMNS' AS kind, OBJECT_NAME(c.object_id) AS table_name, c.name AS column_name, t.name AS type_name
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id JOIN sys.tables tb ON tb.object_id = c.object_id
WHERE c.name IN ('WCoinC','WCoinP','GoblinPoint','WCoin','Cash','Gold','PcPoint','PCPoint','CashPoint','GoblinPoints') ORDER BY 2,3;
