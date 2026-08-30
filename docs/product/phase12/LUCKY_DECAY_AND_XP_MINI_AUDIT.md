---
status: DRAFT
category: product/economy-audit
audience: internal (product + engineering)
lastVerified: 2026-08-29
evidenceMethod: re-examination of D:\MU\RemoteData\Phase11\LuckyItem.readable.txt, GameServerInfo - Common.readable.txt, GameServerInfo - Custom.readable.txt (all real, downloaded Phase 11/12)
---

# Lucky Item Decay Reality + XP Modifier Mini-Audit (Parts N/O)

## Part N — what LuckyItem.txt's "Decay" field actually is (and, honestly, isn't confirmed to be)

**Confirmed from the file itself**: every one of the 54 `LuckyItem.txt` rows has `Decay = 2400` and `Option0` through `Option6 = 10`. No other field exists on these rows — no name beyond the `//` comment (e.g. "Scale Helm"), no explicit unit label, no "on expiry" behavior column.

**What is NOT determinable from this file alone, stated honestly rather than guessed**:
- What decays — the item itself (durability countdown to destruction), a temporary bonus state on the item, or something else — `UNKNOWN`.
- What "2400" means as a unit — almost certainly seconds by comparison with every other duration-shaped field seen across this audit (`CashShopProduct.ItemDuration = 604800` seconds = 7 days uses the same unit convention), which would make `2400` = **40 minutes**. This is a reasonable inference from consistent unit convention elsewhere in the same engine family, not a value stated as "seconds" anywhere in this specific file.
- Whether equipped vs. offline time counts toward the 40-minute countdown — `UNKNOWN`, not stated in the file.
- What happens at expiry (item disappears / loses its options / reverts to a lower group / becomes unusable) — `UNKNOWN`. `Option0`–`Option6 = 10` on every row is most plausibly a flat probability weight (10%, uniform) for some 7-way outcome, but which outcome — upgrade, downgrade, destroy, no change — is not named in the file.

**What CAN be said with confidence, by direct comparison to real data already gathered**: whatever this mechanic is, it operates on a **40-minute timescale**, not a 7/15/30-**day** timescale. That is a **252x** difference from the CashShop's proven rental mechanism (`ItemDuration = 604800`). This gap is too large to be a coincidence of representation — these are two structurally different mechanics serving different purposes, not the same "rental" concept expressed two ways. **Confirmed: LuckyItem Decay is NOT the planned rental model, and should not be labeled "rental" in any product content.** This is the same conclusion Phase 11 reached, now with the precise magnitude of the mismatch quantified.

**To actually resolve the open questions** (what decays, what happens at expiry) would require either the GameServer engine source (not accessible under the allowed read-only roots) or a real in-game empirical test (equip/hold one of the 54 items and observe behavior over 40 minutes) — neither was done this phase; both are legitimate next steps if this mechanic becomes product-relevant.

## Part O — XP modifier mini-audit (narrow, as instructed — not a broad XP phase)

### What AL0–AL3 currently change (confirmed real fields, this pass + Phase 11)

| System | AL0 | AL1 | AL2 | AL3 |
|---|---|---|---|---|
| `AddExperienceRate` | 50 | 60 | 60 | 60 |
| `AddMasterExperienceRate` | 20 | 22 | 22 | 22 |
| `CommandResetLevel` | 400 | 400 | 400 | 400 |
| `CommandResetPoint` | 450 | 500 | 500 | 500 |
| `CommandResetLimit` | 20 | 20 | 20 | 50 |
| Chaos Machine (`ChaosItemMixRate` and every other rate checked) | 80 (identical every tier) | 80 | 80 | 80 |

**AL0-3 does change real values** — base XP rate, Master XP rate, Reset stat points, and Reset cap all vary by AL tier — **except Chaos Machine, which is flat across all four tiers with zero exception found**. This directly confirms Phase 11's finding was correct: no VIP-style Chaos Machine differentiation exists, while XP/Reset differentiation by AL tier is real and already active.

**`AddExperienceRate_AL0 = 50` does have corresponding AL1/AL2/AL3 values** — `60/60/60` — confirming the field is genuinely AL-tiered, not a single global constant. AL0 (the lowest tier, presumably the "default/free" bracket) has the **lowest** rate (50) while AL1-3 all share the same higher rate (60) — i.e., there's a real, confirmed **free-vs-paid-tier XP gap already active in config today** (50 vs 60, a 20% relative difference), even before any new VIP system is built. This is a genuinely important, previously-under-emphasized fact: **something already distinguishes AL0 from AL1-3 in a way that benefits AL1-3 with more XP** — whatever currently assigns an account's AL bracket (not confirmed this phase — see Part F's finding that no AL-to-VIP mapping was found) is already producing an XP advantage for whoever isn't AL0.

### Whether VIP already modifies XP/drop somewhere

**No direct evidence found this phase.** The real VIP-granting mechanisms found in Part F (`/buyvip` command, NPC shop, lottery, new-character reward, referral reward) all grant **VIP days** — none of them, in the fields read, sets or references an AL bracket, an XP rate, or a drop rate directly. Whether receiving VIP days *causes* an account's AL bracket to change (which would then indirectly grant the AL1-3 XP bonus already confirmed above) is **not confirmed by any file read this phase or Phase 11** — this is the single most important open technical question connecting "VIP" to "XP/drop," and it was not resolvable from static config alone. This would need either engine source or an in-game empirical test (grant VIP to a test account, check whether `AccountLevel` in `MEMB_INFO` changes).

**No broader XP stacking formula was inferred** — per the explicit instruction not to turn this into a broad XP phase, this mini-audit reports only what's directly in the config, not a model of how these rates combine mathematically.
