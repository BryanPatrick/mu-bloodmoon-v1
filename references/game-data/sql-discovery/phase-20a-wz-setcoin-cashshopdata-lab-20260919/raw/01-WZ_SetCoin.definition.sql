CREATE Procedure [dbo].[WZ_SetCoin] 
@Account varchar(10),
@Name varchar(10),
@Value1 int,
@Value2 int,
@Value3 int
AS
BEGIN

SET NOCOUNT ON
SET XACT_ABORT ON

	-- Tipo 1: Update Cash | WCoinC
	IF @Value1 > 0
	IF EXISTS (SELECT AccountID FROM CashShopData WHERE AccountID = @Account)
	BEGIN
		UPDATE CashShopData SET WCoinC = WCoinC + @Value1 WHERE AccountID = @Account
	END
	ELSE
	BEGIN
		INSERT INTO CashShopData (AccountID, WCoinC) VALUES (@Account,@Value1)
	END

	-- Tipo 2: Update Gold | WCoinP
	IF @Value2 > 0
	IF EXISTS (SELECT AccountID FROM CashShopData WHERE AccountID = @Account)
	BEGIN
		UPDATE CashShopData SET WCoinP = WCoinP + @Value2 WHERE AccountID = @Account
	END
	ELSE
	BEGIN
		INSERT INTO CashShopData (AccountID, WCoinP) VALUES (@Account,@Value2)
	END

	-- Tipo 3: Update PcPoints | GoblinPoint
	IF @Value3 > 0
	IF EXISTS (SELECT AccountID FROM CashShopData WHERE AccountID = @Account)
	BEGIN
		UPDATE CashShopData SET GoblinPoint = GoblinPoint + @Value3 WHERE AccountID = @Account
	END
	ELSE
	BEGIN
		INSERT INTO CashShopData (AccountID, GoblinPoint) VALUES (@Account,@Value3)
	END
		
SET NOCOUNT OFF
SET XACT_ABORT OFF

END
