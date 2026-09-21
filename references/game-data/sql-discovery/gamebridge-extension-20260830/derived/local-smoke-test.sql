USE bloodmoon_gamebridge_test;
GO
SET NOCOUNT ON;

PRINT '=== Seeding fixtures ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel)
VALUES ('smoketest1', 'pw12345678', 'smoketest1', '000000000000000000', 0);
INSERT INTO AccountCharacter (Id, GameID1, GameID2, ExtClass, ExtWarehouse)
VALUES ('smoketest1', 'SmokeChar1', 'SmokeChar2', 0, 0);
INSERT INTO Character (Name, AccountID) VALUES ('SmokeChar1', 'smoketest1');
INSERT INTO Character (Name, AccountID) VALUES ('SmokeChar2', 'smoketest1');
INSERT INTO CustomQuest (Name) VALUES ('SmokeChar1');
INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint) VALUES ('smoketest1', 100, 50, 10);
INSERT INTO warehouse (AccountID, Money) VALUES ('smoketest1', 5000);
INSERT INTO GuildMember (Name, G_Name) VALUES ('SmokeChar2', 'SMOKEG');
INSERT INTO T_FriendMain (GUID, Name) VALUES (900001, 'SmokeChar1');

PRINT '=== GRANT_VIP: AL0 -> AL2 ===';
DECLARE @rc VARCHAR(32), @prev TINYINT, @new TINYINT;
EXEC dbo.bm_GrantVip @LegacyLogin='smoketest1', @TargetLevel=2, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
PRINT 'ResultCode=' + @rc + ' Previous=' + CAST(@prev AS VARCHAR) + ' New=' + CAST(@new AS VARCHAR);
IF @rc = 'SUCCEEDED' AND @prev = 0 AND @new = 2 PRINT 'PASS: GRANT_VIP AL0->AL2'; ELSE PRINT 'FAIL: GRANT_VIP AL0->AL2';

PRINT '=== GRANT_VIP: MAX rule, AL2 -> grant AL1 stays AL2 ===';
EXEC dbo.bm_GrantVip @LegacyLogin='smoketest1', @TargetLevel=1, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
IF @rc = 'SUCCEEDED' AND @prev = 2 AND @new = 2 PRINT 'PASS: GRANT_VIP MAX rule (never downgrades)'; ELSE PRINT 'FAIL: GRANT_VIP MAX rule -- got New=' + CAST(@new AS VARCHAR);

PRINT '=== GRANT_VIP: invalid target (0) ===';
EXEC dbo.bm_GrantVip @LegacyLogin='smoketest1', @TargetLevel=0, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
IF @rc = 'INVALID_INPUT' PRINT 'PASS: GRANT_VIP rejects TargetLevel=0'; ELSE PRINT 'FAIL: GRANT_VIP TargetLevel=0 got ' + @rc;

PRINT '=== GRANT_VIP: nonexistent account ===';
EXEC dbo.bm_GrantVip @LegacyLogin='nosuchacct', @TargetLevel=1, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
IF @rc = 'ACCOUNT_NOT_FOUND' PRINT 'PASS: GRANT_VIP ACCOUNT_NOT_FOUND'; ELSE PRINT 'FAIL: GRANT_VIP nonexistent got ' + @rc;

PRINT '=== SYNC_VIP_TIER: downgrade AL2 -> AL0 ===';
DECLARE @changed BIT;
EXEC dbo.bm_SyncVipTier @LegacyLogin='smoketest1', @DesiredLevel=0, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT, @Changed=@changed OUTPUT;
IF @rc = 'SUCCEEDED' AND @prev = 2 AND @new = 0 AND @changed = 1 PRINT 'PASS: SYNC_VIP_TIER downgrade to 0'; ELSE PRINT 'FAIL: SYNC_VIP_TIER downgrade -- got New=' + CAST(@new AS VARCHAR) + ' Changed=' + CAST(@changed AS VARCHAR);

PRINT '=== SYNC_VIP_TIER: no-op when already synced ===';
EXEC dbo.bm_SyncVipTier @LegacyLogin='smoketest1', @DesiredLevel=0, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT, @Changed=@changed OUTPUT;
IF @rc = 'SUCCEEDED' AND @changed = 0 PRINT 'PASS: SYNC_VIP_TIER no-op'; ELSE PRINT 'FAIL: SYNC_VIP_TIER no-op -- Changed=' + CAST(@changed AS VARCHAR);

PRINT '=== SYNC_VIP_TIER: invalid desired level (4) ===';
EXEC dbo.bm_SyncVipTier @LegacyLogin='smoketest1', @DesiredLevel=4, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT, @Changed=@changed OUTPUT;
IF @rc = 'INVALID_INPUT' PRINT 'PASS: SYNC_VIP_TIER rejects DesiredLevel=4'; ELSE PRINT 'FAIL: SYNC_VIP_TIER DesiredLevel=4 got ' + @rc;

PRINT '=== PURGE_GAME_ACCOUNT: guild-master block (set up a second account) ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel) VALUES ('smoketest2', 'pw12345678', 'smoketest2', '000000000000000000', 0);
INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES ('smoketest2', 'SmokeMastr', 0, 0);
INSERT INTO Character (Name, AccountID) VALUES ('SmokeMastr', 'smoketest2');
INSERT INTO Guild (G_Name, G_Master) VALUES ('SMOKEG', 'SmokeMastr');
DECLARE @tj NVARCHAR(MAX);
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smoketest2', @BetaCycleId='smoke-cycle', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
IF @rc = 'GUILD_MASTER_BLOCKED' PRINT 'PASS: PURGE blocks guild master'; ELSE PRINT 'FAIL: PURGE guild master got ' + @rc;

PRINT '=== ANONYMIZE_GAME_ACCOUNT: full pass on smoketest1 (has chars/guild/friend/quest/warehouse/cashshop) ===';
DECLARE @ej NVARCHAR(MAX);
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='smoketest1', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@ej OUTPUT;
PRINT 'ResultCode=' + ISNULL(@rc,'NULL') + ' Entities=' + ISNULL(@ej,'NULL');
IF @rc = 'SUCCEEDED' PRINT 'PASS: ANONYMIZE full pass'; ELSE PRINT 'FAIL: ANONYMIZE full pass got ' + ISNULL(@rc,'NULL');

PRINT '=== Verify: MEMB_INFO AccountLevel reset to 0, credential invalidated ===';
DECLARE @lvl INT, @pwd VARCHAR(10);
SELECT @lvl = AccountLevel, @pwd = memb__pwd FROM MEMB_INFO WHERE memb___id = 'smoketest1';
IF @lvl = 0 AND @pwd LIKE 'ANON%' PRINT 'PASS: ANONYMIZE reset AccountLevel and invalidated credential'; ELSE PRINT 'FAIL: AccountLevel=' + CAST(@lvl AS VARCHAR) + ' pwd=' + @pwd;

PRINT '=== Verify: Character rows renamed (tombstoned), not deleted ===';
IF (SELECT COUNT(*) FROM Character WHERE AccountID = 'smoketest1') = 2
   AND NOT EXISTS (SELECT 1 FROM Character WHERE Name IN ('SmokeChar1','SmokeChar2'))
  PRINT 'PASS: Characters tombstoned (renamed, still 2 rows, original names gone)';
ELSE PRINT 'FAIL: Character tombstone check';

PRINT '=== Verify: CustomQuest renamed in lockstep (FK still valid) ===';
IF EXISTS (SELECT 1 FROM CustomQuest cq JOIN Character c ON c.Name = cq.Name WHERE c.AccountID = 'smoketest1')
  PRINT 'PASS: CustomQuest renamed in lockstep, FK still satisfied';
ELSE PRINT 'FAIL: CustomQuest lockstep rename';

PRINT '=== Verify: warehouse deleted, CashShop zeroed, GuildMember/friend detached ===';
IF NOT EXISTS (SELECT 1 FROM warehouse WHERE AccountID = 'smoketest1') PRINT 'PASS: warehouse deleted'; ELSE PRINT 'FAIL: warehouse still exists';
IF (SELECT WCoinC + WCoinP + GoblinPoint FROM CashShopData WHERE AccountID = 'smoketest1') = 0 PRINT 'PASS: CashShop zeroed'; ELSE PRINT 'FAIL: CashShop not zeroed';
IF NOT EXISTS (SELECT 1 FROM GuildMember WHERE Name = 'SmokeChar2') PRINT 'PASS: GuildMember detached'; ELSE PRINT 'FAIL: GuildMember still exists';
IF NOT EXISTS (SELECT 1 FROM T_FriendMain WHERE Name = 'SmokeChar1') PRINT 'PASS: T_FriendMain detached'; ELSE PRINT 'FAIL: T_FriendMain still exists';

PRINT '=== ANONYMIZE idempotency: second call on same account ===';
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='smoketest1', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@ej OUTPUT;
IF @rc = 'ALREADY_ANONYMIZED' PRINT 'PASS: ANONYMIZE idempotent replay'; ELSE PRINT 'FAIL: ANONYMIZE replay got ' + ISNULL(@rc,'NULL');

PRINT '=== ANONYMIZE staff rejection ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel, Admin) VALUES ('smokestaff', 'pw12345678', 'smokestaff', '000000000000000000', 0, 1);
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='smokestaff', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@ej OUTPUT;
IF @rc = 'STAFF_ACCOUNT_REJECTED' PRINT 'PASS: ANONYMIZE rejects staff'; ELSE PRINT 'FAIL: ANONYMIZE staff got ' + ISNULL(@rc,'NULL');

PRINT '=== PURGE_GAME_ACCOUNT: clean account with dependencies ===';
INSERT INTO MEMB_INFO (memb___id, memb__pwd, memb_name, sno__numb, AccountLevel) VALUES ('smoketest3', 'pw12345678', 'smoketest3', '000000000000000000', 0);
INSERT INTO AccountCharacter (Id, GameID1, ExtClass, ExtWarehouse) VALUES ('smoketest3', 'SmokePurge', 0, 0);
INSERT INTO Character (Name, AccountID) VALUES ('SmokePurge', 'smoketest3');
INSERT INTO CustomQuest (Name) VALUES ('SmokePurge');
INSERT INTO GuildMember (Name, G_Name) VALUES ('SmokePurge', 'SMOKEG2');
INSERT INTO CashShopData (AccountID) VALUES ('smoketest3');
INSERT INTO warehouse (AccountID) VALUES ('smoketest3');
INSERT INTO RankingCustom (Name) VALUES ('SmokePurge');
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smoketest3', @BetaCycleId='smoke-cycle', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
PRINT 'ResultCode=' + ISNULL(@rc,'NULL') + ' Tables=' + ISNULL(@tj,'NULL');
IF @rc = 'SUCCEEDED' PRINT 'PASS: PURGE with dependencies'; ELSE PRINT 'FAIL: PURGE with dependencies got ' + ISNULL(@rc,'NULL');

PRINT '=== Verify: PURGE actually removed everything (11-step order), CustomQuest auto-cascaded ===';
IF NOT EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id='smoketest3')
   AND NOT EXISTS (SELECT 1 FROM AccountCharacter WHERE Id='smoketest3')
   AND NOT EXISTS (SELECT 1 FROM Character WHERE Name='SmokePurge')
   AND NOT EXISTS (SELECT 1 FROM CustomQuest WHERE Name='SmokePurge')
   AND NOT EXISTS (SELECT 1 FROM GuildMember WHERE Name='SmokePurge')
   AND NOT EXISTS (SELECT 1 FROM CashShopData WHERE AccountID='smoketest3')
   AND NOT EXISTS (SELECT 1 FROM warehouse WHERE AccountID='smoketest3')
   AND NOT EXISTS (SELECT 1 FROM RankingCustom WHERE Name='SmokePurge')
  PRINT 'PASS: PURGE removed all 8 checked entities';
ELSE PRINT 'FAIL: PURGE left something behind';

PRINT '=== PURGE idempotency: second call (ALREADY_PURGED) ===';
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smoketest3', @BetaCycleId='smoke-cycle', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
IF @rc = 'ALREADY_PURGED' PRINT 'PASS: PURGE idempotent replay'; ELSE PRINT 'FAIL: PURGE replay got ' + ISNULL(@rc,'NULL');

PRINT '=== PURGE: staff rejection ===';
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smokestaff', @BetaCycleId='smoke-cycle', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
IF @rc = 'STAFF_ACCOUNT_REJECTED' PRINT 'PASS: PURGE rejects staff'; ELSE PRINT 'FAIL: PURGE staff got ' + ISNULL(@rc,'NULL');

PRINT '=== PURGE: missing betaCycleId rejected ===';
EXEC dbo.bm_PurgeGameAccount @LegacyLogin='smoketest1', @BetaCycleId='', @ResultCode=@rc OUTPUT, @TablesAffectedJson=@tj OUTPUT;
IF @rc = 'INVALID_INPUT' PRINT 'PASS: PURGE rejects empty betaCycleId'; ELSE PRINT 'FAIL: PURGE empty betaCycleId got ' + ISNULL(@rc,'NULL');

PRINT '=== Done ===';
