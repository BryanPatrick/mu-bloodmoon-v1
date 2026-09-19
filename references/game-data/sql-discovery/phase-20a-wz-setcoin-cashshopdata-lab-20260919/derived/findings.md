# Derived findings — Phase 20A lab evidence

All statements are read directly from `../raw/`. Labels: **FACT** (visible in the
preserved text), **INFERENCE** (reasoned, not shown).

## `CashShopData` — DDL (FACT, `raw/03`, `raw/04`)

| | |
|---|---|
| Columns | `AccountID varchar(10) NOT NULL` (collation `Latin1_General_CI_AS` — case-insensitive), `WCoinC int NOT NULL DEFAULT 0`, `WCoinP int NOT NULL DEFAULT 0`, `GoblinPoint int NOT NULL DEFAULT 0` |
| Primary key | `PK_TempCashShop` — CLUSTERED on `AccountID` (the only index) |
| Defaults | `DF_CashShopData_WCoinC/WCoinP/GoblinPoint` = `((0))` |
| Constraints | **none**: no CHECK (negative balances are representable), no foreign key in or out (no link to `MEMB_INFO`; orphan rows possible), no trigger |
| Rows in the restored copy | 4 (approximate, from partition stats) |

## `dbo.WZ_SetCoin` (FACT, `raw/01`)

Signature `(@Account varchar(10), @Name varchar(10), @Value1 int, @Value2 int, @Value3 int)`.
`@Name` is **never used**. Comments: "Tipo 1: Update Cash | WCoinC", "Tipo 2: Update Gold | WCoinP",
"Tipo 3: Update PcPoints | GoblinPoint". For each of the three values, only if `> 0`:

```
IF EXISTS (SELECT AccountID FROM CashShopData WHERE AccountID = @Account)
    UPDATE CashShopData SET <col> = <col> + @ValueN WHERE AccountID = @Account     -- ADDITIVE
ELSE
    INSERT INTO CashShopData (AccountID, <col>) VALUES (@Account, @ValueN)         -- other columns take default 0
```

| Question | Answer |
|---|---|
| Add or set? | **Add** (`col = col + value`), despite the name. |
| Can it subtract? | **No.** Zero and negative values are ignored (`IF @ValueN > 0`). |
| Missing row? | **Inserts** a row with only that column set; the other two default to 0. |
| Transaction? | **None.** `SET XACT_ABORT ON` but no `BEGIN TRAN`: each statement autocommits; the three blocks are not atomic together. |
| Locking? | **None** (no `UPDLOCK`/`HOLDLOCK`/applock). `IF EXISTS … ELSE INSERT` is racy: two concurrent first credits for one account can both take the INSERT branch and the second fails on the primary key (error, no silent duplicate row). |
| Idempotency? | **None.** Calling it twice adds twice. No key, no ledger, no audit/log write, no return code. |
| Validation? | None on the account (no `MEMB_INFO` check) or amount range; an `int` overflow raises an arithmetic error. |

## The other vendor mechanisms (FACT, `raw/05`, `raw/06`)

Eleven modules reference `CashShopData`. **Every one that changes a balance is additive**
(`col = col + value`) — eight of them: `WZ_SetCoin`, `WZ_SetExchangeReward`, `WZ_SetKD`,
`WZ_CustomMonsterReward`, `WZ_SetRewardCastleSiege` (`raw/06`) and the three ranking-reward
procedures `WZ_SetRankingDay`, `WZ_SetRankingMon`, `WZ_SetRankingWek` (`raw/10`: top-3 accounts
of the period get `WCoinC/WCoinP/GoblinPoint + value`, `UPDATE` only, then `Character.ResetDay/Mon/Wek`
is zeroed; the Season-4 `PcPointData` variants are commented out). The other three
(`WZ_CustomArenaRanking`, `…BattleRoyaleRanking`, `…DropNpcRanking`) only run
`UPDATE CashShopData SET GoblinPoint = GoblinPoint` — a no-op placeholder. **There is no set-absolute
procedure and no debit procedure**: subtraction (a purchase in the CashShop) is not done by any stored
procedure in this database.

Missing-row behaviour differs by mechanism: `WZ_SetCoin` inserts; `WZ_SetExchangeReward`,
`WZ_SetKD`, `WZ_CustomMonsterReward`, `WZ_SetRewardCastleSiege` and the three ranking-reward
procedures only `UPDATE` — for an account with no row they **silently credit nothing**.

`WZ_SetRewardCastleSiege` selects the account through `MEMB_STAT.ConnectStat = 1` — the
vendor itself credits **online** players by SQL update (FACT: the procedure text).

## Two vocabularies, one triple — first-hand, independent (FACT)

`WZ_SetCoin`: "Cash | WCoinC", "Gold | WCoinP", "PcPoints | GoblinPoint".
`WZ_SetExchangeReward` (all three) and `WZ_SetKD` (Cash and Gold only): the same labels, plus commented **Season 4**
alternatives — `UPDATE MEMB_INFO SET Cash = Cash + …`, `UPDATE MEMB_INFO SET Gold = Gold + …` and, in
`WZ_SetExchangeReward`, `UPDATE PcPointData SET PcPoint = PcPoint + …`. The ranking procedures carry the same three labels
("Update Cash | WCoinC", "Update Gold | WCoinP", "Update PcPoint | Goblin Point") with `PcPointData` variants commented out. `WZ_SetRewardCastleSiege`: "Season 4"
`PcPointData set Cash, Gold, PcPoint` versus "Season 0,1,2,6,8" `CashShopData set WCoinC, WCoinP,
GoblinPoint`. So Cash/Gold/PcPoint is the Season-4 naming of the balances that Season 6/8
store as WCoinC/WCoinP/GoblinPoint — slot for slot.

## Other

* `CustomPlayToEarn(Account varchar(10), WCoinC, WCoinP, GoblinPoint)` — a second table with the
  same three balances, PK on `Account`, 0 rows, referenced by no module (`raw/07`). Role unknown (INFERENCE: play-to-earn accrual read by the engine directly).
* The lab copy has the same procedure hashes as the raw copy for all eight procedures (`raw/08` vs `raw/09`).

## What this does NOT settle

* How the GameServer **debits** (no procedure) and whether it caches a balance in memory —
  i.e. **when an external credit becomes visible, or whether it can be overwritten**. INFERENCE only:
  the vendor's own procedures credit players who are online through plain SQL updates, which makes a
  wholesale "flush the in-memory balance at logout" design less likely, but nothing here proves it.
* Who creates a `CashShopData` row in production (no trigger, no FK; `DmN_CreateGameAccount` does not).
