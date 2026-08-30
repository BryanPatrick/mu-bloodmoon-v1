# Ranking Rewards — Does Ranking Grant WC? (Open Question Resolution)

**Phase**: 11 (Economy & Monetization Foundation)
**Evidence source**: Live remote server config downloaded via `bm-remote.cmd` on 2026-08-29.
**Explicit open question from the phase spec**: *Does CustomRanking/CustomRankingReward grant WC (WCoin) anywhere in the real config?*

---

## Answer: **UNCLEAR — no explicit WC/WCoin field exists in either file; the actual reward values are not resolvable from what these two files contain.**

This is not a "no" — it is a genuine "the config does not say," and it should be reported that way rather than assumed in either direction.

---

## 1. `CustomRanking.txt` (1300 bytes, read in full)

`C:\MuServer\Data\Custom\CustomRanking.txt` — this file defines **only the ranking board's UI labels**, not rewards. Columns: `RankIndex, RankName, RankColumn1, RankColumn2, RankColumn3`. 18 ranking categories are defined (Top MR/RR/LVL, Top RDay/RWek/RMon, Top Kills, Top Deads, Top Blood Castle, Top Chaos Castle, Top Devil Square, Top Illusion Temple, Top CS Kills/Deads, Top CS CrownTime, Top Guild, Top Veloz, Top Russian, Top Absorption, Top RunAndCatch, Top HideAndSeek, Top Quiz, Top BBB). None of these rows contain a currency field of any kind — `RankColumn1/2/3` are just display-column headers like `"Personagem"`, `"InformaÃ§Ãµes"`, `"Last time"`, `"Score"`, `"Kills"`, `"Deads"`. **`CustomRanking.txt` cannot grant WC because it has no reward mechanism at all — it is purely a leaderboard display definition.**

## 2. `CustomRankingReward.txt` (802 bytes, read in full)

`C:\MuServer\Data\Custom\CustomRankingReward.txt` — this is the file that should carry the actual reward, and it does define a reward schedule, but **contains no currency field**:

**Section `0` — reset schedule** (when rewards are evaluated):
```
//Index   Year   Month   Day   DoW   Hour   Minute   Second
0         *      *       *     *     23     59       59
1         *      *       *     1     23     59       59
2         *      *       1     *     23     59       59
```
(Daily at 23:59:59, weekly on day-of-week 1 at 23:59:59, monthly on the 1st at 23:59:59 — pure scheduling, no reward content.)

**Section `1` — the actual reward table**:
```
//Index   Name                                 ResetDaySwitch   ResetWekSwitch   ResetMonSwitch   AlarmTime   EventTime   Value1  Value2  Value3  Value4  Value5  Value6  Value7  Value8  Value9
0         "Awards for Daily Rankings"          1                0                0                5           1           1       2       3       4       5       6       7       8       9
1         "Awards for Weekly Rankings"         0                1                0                5           1           1       2       3       4       5       6       7       8       9
2         "Awards for Monthly Rankings"        0                0                1                5           1           1       2       3       4       5       6       7       8       9
```

**Critical finding**: the reward payload columns are named generically `Value1` through `Value9`, and every single value across all three reward rows is simply the sequential set `1, 2, 3, 4, 5, 6, 7, 8, 9`. There is:
- No column named `WCoin`, `WCoinC`, `WCoinP`, `Cash`, `Gold`, `Zen`, `GoblinPoint`, or any other currency this audit has seen elsewhere in the config (compare to `CustomItemRewardReset.txt`'s explicit `Cash_AL0/Gold_AL0/PcPoint_AL0` columns, or `CustomDailyReward.txt`'s explicit `Cash`/`Zen` columns — this file uses neither pattern).
- No item-code columns (`ItemType`/`ItemIndex`) either.
- `Value1..Value9` being the literal sequence 1–9 strongly suggests these are **rank-position placeholders or pointers into a separate reward-definition table** (e.g., "value awarded for rank #1" through "rank #9"), rather than literal reward amounts — but that interpretation is **not confirmed** by anything in this file. It is equally possible these are indexes into an item/reward lookup table stored in the SQL database or compiled into the GameServer binary, which is outside the allowed read-only file roots.

## 3. Conclusion

- **`CustomRanking.txt` does NOT grant WC** — confirmed, it has no reward mechanism whatsoever.
- **`CustomRankingReward.txt` does NOT show an explicit WC/WCoin field** — confirmed by direct inspection of every column header and every value in the file.
- Whether Ranking rewards ultimately resolve to WC (or Zen, or items) through some other mechanism not captured in these two files — e.g., `Value1..9` being indices into a reward table stored in the database, or hardcoded in the GameServer binary — is **`UNKNOWN`**. This audit did not have access to the SQL schema or server source code under the allowed remote roots (`C:\MuServer\Data`, `C:\MuServer\Tutoriais`, `C:\MuServer\GameServer\DATA`, `C:\MuServer\GameServerCS\DATA`).

**Recommendation for the product/economy team**: treat "does Ranking grant WC" as **not yet answerable from file-based config alone**. If this needs a definitive answer, the next step would be either (a) inspecting the SQL database for a ranking-reward lookup table, or (b) an in-game empirical test (claim a ranking reward and observe what currency/item is granted) — both of which are outside this audit's read-only file-inventory scope.

---

## Evidence quality

Both `CustomRanking.txt` and `CustomRankingReward.txt` were downloaded fresh this pass and **read in full** — byte lengths (1300 and 802 respectively) match the remote directory listing exactly, and every line of both files is quoted or accounted for above (no sampling — these are small files and the complete content is reproduced in this report).
