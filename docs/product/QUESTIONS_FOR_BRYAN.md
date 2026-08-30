---
status: DRAFT
category: product/economy
audience: Bryan (product decisions)
lastVerified: 2026-08-29
---

# Questions for Bryan — Next Decisions (Part AG)

Only unresolved issues that materially block Open Beta, economy, Cash Shop, VIP, payments, or rules. Nothing already answered in `ECONOMY_PRODUCT_DECISIONS.md` is repeated here.

## P0 — must decide before Beta

1. **`CustomXShop.txt` is live today, selling 182 items (Excellent-option weapons/armor, normal Wings, full gear categories, all +13) directly for WCoin.** This appears to directly contradict the new Cash Shop Philosophy decision ("will NOT sell standard player equipment directly... Do NOT design sales of: Excellent gear... normal Wings... endgame equipment"). Does X-Shop get disabled/reconfigured before Beta, is it an intentional exception, or was the philosophy decision meant to apply only to *future* additions, not this existing system? **This is the single highest-stakes real-vs-decision conflict found this phase.**
2. **The live marketplace fee is currently 5% with floor-down rounding, not the new 10% decision.** Fix before Beta, or accept the discrepancy for launch and fix after? (Real code found this phase: `marketplace.service.ts`, `MarketplaceEconomyConfig.saleFeePercent = 5`.)
3. **`CustomBuyVipAndCoin.txt` — the config file that would sell VIP — has zero active offers (every row commented out).** No VIP purchase path currently exists anywhere in the real config. Combined with question on VIP pricing below: is VIP purchase meant to go through this file (needs to be re-enabled and priced), or through a different mechanism entirely (e.g. apps/api's `RechargeIntent`/CashShop path)?
4. **Beta account deletion has no implementation at all** — no flag, no scheduled job, no reward-eligibility linkage exists in the real schema. Does this need to be built before Beta starts (01/09/2026), or can Beta launch with progress *not yet actually disposable*, with the deletion mechanism following before Beta *ends* (15/09/2026)?
5. **VIP pricing and % benefits** — the real XP-stack audit is now complete (Parts I/J/K): the "50x" figure was confirmed as folklore (real config is `AddExperienceRate_AL0=50`, a bonus-rate field, not a ×50 multiplier), and **no VIP-tier Chaos Machine bonus exists in real config today** (all AL0-AL3 columns are identical). Given this, what VIP XP/Chaos Machine benefit values are actually intended?
6. **What happens to player progress after Beta** (wipe / keep / partial migration) — already flagged as the single highest player-impact undecided item in `ECONOMY_PRODUCT_DECISIONS.md`.

## P1 — should decide soon

7. Do Events, Ranking, and Castle Siege grant WC? (Ranking is now confirmed genuinely unresolvable from file config alone — see `economy-audit/ranking-and-reward-wc-sources.md`; Castle Siege wasn't researched this phase at all.)
8. Should account/character sale ship without a formal transfer flow, or is building one (2FA reset, ownership audit trail) a prerequisite? (`economy-audit/account-character-sale-risk-notes.md`)
9. Is the WC fee accumulator scoped correctly as per-account/per-receiver, or does the architecture need a different scope once real implementation starts? (`wc-fee-model/DESIGN.md`)
10. Streamer WC reward — still under review per the decision; when does that review conclude?
11. Extend the proven 7-day CashShop rental mechanism (`ItemDuration`, already live for 8 wing/pet items) to the Lucky Set item codes — when, and at what price?

## P2 — can wait

12. Clan migration exact thresholds/rewards (explicitly deferred to market research).
13. Creator program exact structure (streaming hours/days/viewers/etc. thresholds).
14. Full GP/HP source-and-sink inventory (not completed this phase).
15. Whether any currently-active shop system (Daily Reward, Battle Pass, Shop Kits, Coins Online — all confirmed live this phase) needs review against the new Cash Shop Philosophy, the same way X-Shop did.
16. All 30 `ACCOUNT_RULES_DRAFT.md` topics need actual legal/privacy/payment-provider review — none has final copy yet.

