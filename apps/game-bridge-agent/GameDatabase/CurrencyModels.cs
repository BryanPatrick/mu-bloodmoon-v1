namespace BloodMoon.GameBridgeAgent.GameDatabase;

// REAL_SQL_METADATA, confirmed 2026-08-20. CashShopBalances is null when
// CashShopData has no row for this account. WCoinC/WCoinP/GoblinPoint are
// non-nullable in the live schema once the row exists. Character.Money
// (carried Zen) and warehouse.Money (vault Zen) are read directly as plain
// ints/nullable ints elsewhere -- distinct columns on distinct tables, per
// docs/game-data/legacy-web-intelligence/currencies.md.
public sealed record CashShopBalances(int WCoinC, int WCoinP, int GoblinPoint);
