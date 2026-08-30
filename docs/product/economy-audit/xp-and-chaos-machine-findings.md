# XP / Master XP / Chaos Machine — Real Config Findings

**Phase**: 11 (Economy & Monetization Foundation)
**Evidence source**: Live remote server config downloaded via `bm-remote.cmd` on 2026-08-29.
**Discipline**: every value below is quoted from a real downloaded file. Anything not present in a real file is marked `NOT_FOUND_IN_CONFIG` or `UNKNOWN`. No generic MU-server knowledge was used as a substitute.

---

## 1. Source files

| File | Remote path | Size | Local copy |
|---|---|---|---|
| Common.dat | `C:\MuServer\GameServer\DATA\GameServerInfo - Common.dat` | 15043 bytes | `D:\MU\RemoteData\Phase11\GameServerInfo - Common.dat` |
| ChaosMix.dat | `C:\MuServer\GameServer\DATA\GameServerInfo - ChaosMix.dat` | 14812 bytes | `D:\MU\RemoteData\Phase11\GameServerInfo - ChaosMix.dat` |
| ExperienceTable.txt | `C:\MuServer\Data\Util\ExperienceTable.txt` | 133 bytes | `D:\MU\RemoteData\Phase11\ExperienceTable.txt` |

Evidence quality: **read directly, full file, for all three** (line counts of the converted `.readable.txt` files were verified against the file — 515, 438, and 2 lines respectively, matching the raw byte lengths reported by the remote inventory).

---

## 2. The "50x" XP-rate claim — VERDICT: **NOT CONFIRMED AS STATED; PARTIALLY REAL BUT MISREPRESENTED**

`GameServerInfo - Common.dat`, section `; Experience Settings` (lines 205–232), contains the real, active XP configuration:

```
ExperienceMultiplierConstA = 10
ExperienceMultiplierConstB = 1000
PetExperienceMultiplierConstA = 100
PetExperienceRateDivisor = 10
AddExperienceRate_AL0 = 50
AddExperienceRate_AL1 = 60
AddExperienceRate_AL2 = 60
AddExperienceRate_AL3 = 60
AddMasterExperienceRate_AL0 = 20
AddMasterExperienceRate_AL1 = 22
AddMasterExperienceRate_AL2 = 22
AddMasterExperienceRate_AL3 = 22
MinMasterExperienceMonsterLevel_AL0 = 136
MinMasterExperienceMonsterLevel_AL1 = 136
MinMasterExperienceMonsterLevel_AL2 = 136
MinMasterExperienceMonsterLevel_AL3 = 136
AddEventExperienceRate_AL0 = 300
AddQuestExperienceRate_AL0 = 100
ExperienceRandomAditional = 0
```

(`_AL0`–`_AL3` = 4 parallel columns per "AccountLevel" tier, presumably a VIP/account-tier bracket 0–3; all four columns exist for every field.)

**What this actually means, strictly from the field names/values present:**
- `AddExperienceRate_AL0 = 50` is a bonus **rate**, most plausibly a **+50% additive bonus on top of the base engine XP formula**, not a flat "50x" multiplier. There is no field in this file, or in `ExperienceTable.txt`, that reads literally as a "50x" (i.e., ×50) global multiplier.
- The number `50` genuinely exists in real config (`AddExperienceRate_AL0`), which is almost certainly the origin of the "50x" folklore figure — but the field semantics (percentage-style add-on rate) do not support reading it as "characters gain XP 50 times faster than vanilla." **This claim should be treated as folklore/misremembered, not confirmed fact.**
- The exact interpretation of `AddExperienceRate` as "+50%" vs. some other engine-internal formula (e.g., a per-mille value, or a multiplier against `ExperienceMultiplierConstA/B`) is **UNKNOWN** — the .dat file gives the raw config value but not the engine source code that consumes it. No source code was available under the allowed remote roots (`C:\MuServer\Data`, `C:\MuServer\Tutoriais`, `C:\MuServer\GameServer\DATA`, `C:\MuServer\GameServerCS\DATA`) to verify the formula.
- Master EXP: `AddMasterExperienceRate_AL0 = 20` (i.e., 20, not tied to "50x" at all) — confirms Master XP rate is configured **separately** and at a **lower** value than base AL0 rate (20 vs 50).
- `MinMasterExperienceMonsterLevel_AL0 = 136` — Master EXP is only granted from monsters at level 136+ (all four AL tiers identical).

**Conclusion**: The commonly-repeated "50x" figure is **NOT a verified fact**. Real config shows `AddExperienceRate_AL0 = 50` as a bonus-rate field (likely a percentage-style add-on), not a flat 50-times multiplier. Until the engine's internal XP formula is inspected (source not available under the read-only inventory roots), the true effective multiplier from these values is `UNKNOWN`.

---

## 3. Per-level / per-reset XP curve — VERDICT: **NOT CONFIGURED (empty table)**

`C:\MuServer\Data\Util\ExperienceTable.txt` — full content (133 bytes, all 2 lines):

```
//MinLevel   MaxLevel   MinMasterLevel   MaxMasterLevel   MinReset   MaxReset   MinMasterReset   MaxMasterReset   ExperienceRate
end
```

The file is a **header-only template with zero data rows** — it defines the column schema for a per-level/per-reset dynamic XP-rate override table, but **no rows are populated**. This confirms the task's hypothesis that this file (133 bytes) is not a full per-level curve — it is in fact **completely empty/inactive**. Whatever base XP rate applies, it comes from `AddExperienceRate_AL0-3` / `AddMasterExperienceRate_AL0-3` in Common.dat (Section 2 above), not from a level-scaled curve in this file.

---

## 4. Chaos Machine (Chaos Mix) — real rates

`GameServerInfo - ChaosMix.dat`, full file (14812 bytes, 438 lines), all fields are `_AL0`–`_AL3` (4 account-level tiers), all read directly:

| Setting | AL0 | AL1 | AL2 | AL3 |
|---|---|---|---|---|
| `ChaosMixInfoSwitch` | 0 (feature switch, global, not per-AL) | | | |
| `ChaosMixMaxItemLevel` | 15 | 15 | 15 | 15 |
| `ChaosItemMixRate` (base Chaos Machine success %) | 80 | 80 | 80 | 80 |
| `DevilSquareMixRate1`–`4` | 80 | 80 | 80 | 80 |
| `DevilSquareMixRate5`–`7` | 70 | 70 | 70 | 70 |
| `PlusCommonItemLevelMixRate1`/`Exc`/`Set`/`380`/`Socket` (level 10) | 60 | 60 | 60 | 60 |
| same, level 11 (`...Rate2`) | 60 | 60 | 60 | 60 |
| same, level 12 (`...Rate3`) | 50 | 50 | 50 | 50 |
| same, level 13 (`...Rate4`) | 50 | 50 | 50 | 50 |
| same, level 14 (`...Rate5`) | 40 | 40 | 40 | 40 |
| same, level 15 (`...Rate6`) | 40 | 40 | 40 | 40 |
| `DinorantMixRate` | 70 | 70 | 70 | 70 |
| `FruitMixRate` | 90 | 90 | 90 | 90 |
| `Wing1MixRate` | 80 | 80 | 80 | 80 |
| `Wing2MixRate` | 60 | 60 | 60 | 60 |
| `Wing3MixRate` | 40 | 40 | 40 | 40 |
| `BloodCastleMixRate1`–`8` | 80 (all) | 80 | 80 | 80 |
| `PetMixRate` | 60 | 60 | 60 | 60 |
| `PieceOfHornMixRate` | 70 | 70 | 70 | 70 |
| `BrokenHornMixRate` | 50 | 50 | 50 | 50 |
| `HornOfFenrirMixRate` | 30 | 30 | 30 | 30 |
| `HornOfFenrirUpgradeMixRate` | -1 (disabled) | -1 | -1 | -1 |
| `ShieldPotionMixRate1` | 50 | 50 | 50 | 50 |
| `ShieldPotionMixRate2`/`3` | 30 | 30 | 30 | 30 |
| `JewelOfHarmonyItemPurityMixRate` | 100 | 100 | 100 | 100 |
| `JewelOfHarmonyItemSmeltMixRate1` | 50 | 50 | 50 | 50 |
| `JewelOfHarmonyItemSmeltMixRate2` | 100 | 100 | 100 | 100 |
| `JewelOfHarmonyItemRestoreMixRate` | 100 | 100 | 100 | 100 |
| `Item380MixRate1` | 50 | 50 | 50 | 50 |
| `Item380MixRate2` | 70 | 70 | 70 | 70 |
| `IllusionTempleMixRate1`–`6` | 70 (all) | 70 | 70 | 70 |
| `FeatherOfCondorMixRate` | -1 (disabled) | -1 | -1 | -1 |
| `SocketItemCreateSeedMixRate` | -1 (disabled) | -1 | -1 | -1 |
| `SocketItemCreateSeedSphereMixRate` | -1 (disabled) | -1 | -1 | -1 |
| `LuckyItemRefineMixRate1` | 60 | 60 | 60 | 60 |
| `LuckyItemRefineMixRate2` | 10 | 10 | 10 | 10 |

**Key finding — item-dependent differences**: rates genuinely vary by *item type/tier* (e.g., base item mix 80%, wing mix 80/60/40% for Wing1/2/3, socket-seed and Feather of Condor mixes disabled at -1), but **do NOT vary by AL (account-level) tier at all in this file** — every `_AL0`/`_AL1`/`_AL2`/`_AL3` column has the identical value for every setting. This means there is **no VIP-tier-based Chaos Machine success-rate bonus configured** in this file, despite the AL0–AL3 columns existing (they are present as schema but not differentiated by value).

**VIP hooks**: `NOT_FOUND_IN_CONFIG` — no field in ChaosMix.dat references VIP status differently from the flat AL0=AL1=AL2=AL3 pattern above. If VIP grants a Chaos Machine bonus, it is not expressed in this file.

**Existing premium modifiers**: `NOT_FOUND_IN_CONFIG` in ChaosMix.dat itself.

---

## 5. Open items / explicitly UNKNOWN

- The exact mathematical meaning of `AddExperienceRate_AL0 = 50` (percentage add-on vs. other formula) — `UNKNOWN`, engine source not accessible under the allowed remote roots.
- What differentiates AL0/AL1/AL2/AL3 tiers server-wide (VIP level? account type?) — not defined in any file read this pass; `UNKNOWN`.
- Whether GameServerCS (the second/parallel server under `C:\MuServer\GameServerCS\DATA`) uses different XP or Chaos Machine values — not downloaded/diffed this pass (inventory only; file sizes are nearly identical: Common.dat 15043 vs 15040 bytes, ChaosMix.dat identical 14812 bytes both — suggesting near-identical config, but not byte-verified).
