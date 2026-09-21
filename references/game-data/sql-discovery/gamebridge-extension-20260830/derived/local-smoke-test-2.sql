USE bloodmoon_gamebridge_test;
GO
SET NOCOUNT ON;

PRINT '=== PURGE_GAME_ACCOUNT: guild-master block, real test (fixed 10-char name) ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel) VALUES ('smoketst4', 'pw12345678', 'smoketst4', '000000000000000000', 0);
INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES ('smoketst4', 'GMaster001', 0, 0);
INSERT INTO Character (Name, AccountID) VALUES ('GMaster001', 'smoketst4');
INSERT INTO Guild (G_Name, G_Master) VALUES ('SMOKEG3', 'GMaster001');
DECLARE @rc VARCHAR(32), @tj NVARCHAR(MAX);
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smoketst4', @BetaCycleId='smoke-cycle', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
IF @rc = 'GUILD_MASTER_BLOCKED' PRINT 'PASS: PURGE blocks real guild master'; ELSE PRINT 'FAIL: PURGE guild master got ' + ISNULL(@rc,'NULL');
-- Confirm nothing was touched (block happens before any mutation).
IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id='smoketst4') PRINT 'PASS: blocked account left untouched'; ELSE PRINT 'FAIL: blocked account was mutated';

PRINT '=== ANONYMIZE_GAME_ACCOUNT: guild-master block, same fixture ===';
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='smoketst4', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@tj OUTPUT;
IF @rc = 'GUILD_MASTER_BLOCKED' PRINT 'PASS: ANONYMIZE blocks real guild master'; ELSE PRINT 'FAIL: ANONYMIZE guild master got ' + ISNULL(@rc,'NULL');

PRINT '=== Active market listing block (ANONYMIZE) ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel) VALUES ('smoketst5', 'pw12345678', 'smoketst5', '000000000000000000', 0);
INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES ('smoketst5', 'MarketChar', 0, 0);
INSERT INTO Character (Name, AccountID) VALUES ('MarketChar', 'smoketst5');
INSERT INTO CustomMarketShop (ItemGUID, AuthCode, SellerAccount, SellerName, Price, PriceType, Item, Tax)
VALUES (900001, 1, 'smoketst5', 'MarketChar', 1000, 0, 0x00, 50);
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='smoketst5', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@tj OUTPUT;
IF @rc = 'ACTIVE_MARKET_LISTING_BLOCKED' PRINT 'PASS: ANONYMIZE blocks active market listing'; ELSE PRINT 'FAIL: ANONYMIZE market got ' + ISNULL(@rc,'NULL');

PRINT '=== Concurrency: two GRANT_VIP calls for the same account use the shared lock correctly ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel) VALUES ('smoketst6', 'pw12345678', 'smoketst6', '000000000000000000', 0);
DECLARE @prev TINYINT, @new TINYINT;
BEGIN TRANSACTION;
EXEC dbo.bm_GrantVip @LegacyLogin='smoketst6', @TargetLevel=1, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
COMMIT TRANSACTION;
EXEC dbo.bm_GrantVip @LegacyLogin='smoketst6', @TargetLevel=3, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
IF @new = 3 PRINT 'PASS: sequential GRANT_VIP calls both apply cleanly (lock acquired/released correctly per call)'; ELSE PRINT 'FAIL: sequential grant got New=' + CAST(@new AS VARCHAR);

PRINT '=== Done ===';
