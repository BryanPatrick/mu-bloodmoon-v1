USE bloodmoon_gamebridge_test;
GO
SET NOCOUNT ON;

PRINT '=== As bloodmoon_writer_local: EXEC bm_GrantVip should succeed (EXECUTE granted) ===';
DECLARE @rc VARCHAR(32), @prev TINYINT, @new TINYINT;
EXEC dbo.bm_GrantVip @LegacyLogin='writertest', @TargetLevel=2, @ResultCode=@rc OUTPUT, @PreviousLevel=@prev OUTPUT, @NewLevel=@new OUTPUT;
IF @rc = 'SUCCEEDED' AND @new = 2 PRINT 'PASS: bloodmoon_writer_local can execute bm_GrantVip and it works correctly (ownership chaining confirmed)';
ELSE PRINT 'FAIL: got ' + ISNULL(@rc,'NULL');

PRINT '=== As bloodmoon_writer_local: direct SELECT on MEMB_INFO must be DENIED ===';
BEGIN TRY
    SELECT TOP 1 * FROM MEMB_INFO;
    PRINT 'FAIL: direct SELECT on MEMB_INFO succeeded -- should have been denied!';
END TRY
BEGIN CATCH
    PRINT 'PASS: direct SELECT on MEMB_INFO denied as expected -- ' + ERROR_MESSAGE();
END CATCH

PRINT '=== As bloodmoon_writer_local: direct DELETE on Character must be DENIED ===';
BEGIN TRY
    DELETE FROM Character WHERE Name = 'nonexistent';
    PRINT 'FAIL: direct DELETE on Character succeeded -- should have been denied!';
END TRY
BEGIN CATCH
    PRINT 'PASS: direct DELETE on Character denied as expected -- ' + ERROR_MESSAGE();
END CATCH

PRINT '=== As bloodmoon_writer_local: bm_AnonymizeGameAccount works despite caller having zero ALTER permission ===';
DECLARE @ej NVARCHAR(MAX);
EXEC dbo.bm_AnonymizeGameAccount @LegacyLogin='writertest', @ResultCode=@rc OUTPUT, @EntitiesAffectedJson=@ej OUTPUT;
IF @rc = 'SUCCEEDED' PRINT 'PASS: bloodmoon_writer_local can execute bm_AnonymizeGameAccount (WITH EXECUTE AS OWNER correctly lets the NOCHECK/CHECK CONSTRAINT toggle run despite caller having zero ALTER permission)';
ELSE PRINT 'FAIL: got ' + ISNULL(@rc,'NULL');

PRINT '=== Done ===';
