SET NOCOUNT ON;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- READ-ONLY: bodies of the other modules that touch CashShopData (vendor mechanisms), for add-vs-set semantics.
SELECT o.name, m.definition
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE o.name IN ('WZ_CustomMonsterReward','WZ_SetExchangeReward','WZ_SetKD','WZ_CustomArenaRanking','WZ_CustomEventBattleRoyaleRanking','WZ_CustomEventDropNpcRanking','WZ_SetRewardCastleSiege')
ORDER BY o.name;
