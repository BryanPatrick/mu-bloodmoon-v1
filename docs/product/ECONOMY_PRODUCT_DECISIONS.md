---
status: AUTHORITATIVE
category: product/economy
audience: internal (product, engineering, legal review)
decidedBy: Bryan
lastRecorded: 2026-08-29
---

# Economy & Monetization Product Decisions

**These are authoritative product decisions, not recommendations.** Where this document uses a recommending tone anywhere, that is a defect — flag it for correction rather than treating it as equal to a decision below. Anything marked `UNDECIDED` is explicitly still open and must not be treated as resolved by any downstream document, code, or player-facing content.

This document records the decisions as given. It does not implement them in production, GameServer, or apps/api. See `docs/product/economy-audit/` for the real-server evidence gathered against these decisions and `docs/product/MONETIZATION_DECISION_MATRIX.md` for how each system maps to them.

---

## Open Beta

- **Dates**: 01/09/2026 through 15/09/2026.
- Beta accounts are **temporary** and must be explicitly identified as such to the player.
- Account creation UI **must state** that Beta accounts/progress will be deleted after Beta.
- Rewards earned during Beta **survive separately** from the disposable Beta account itself.
- Eligibility for post-Beta reward claim is associated with the **same normalized email** used during Beta.
- After official launch, a new account created with that same email **may receive** eligible Beta rewards.
- Reward claim must be **one-time and auditable**.
- **Do NOT assume account deletion has already happened.** That must be verified separately (against the real system) before any content claims it as done. See `docs/product/economy-audit/beta-account-lifecycle-findings.md`.

## RMT (Real Money Trade)

- RMT **is allowed**.
- RMT is strictly **player-to-player**.
- Blood Moon does **not** act as: financial intermediary, escrow, payment custodian, guarantor of external payments, or arbitrator of every private negotiation.
- Players are responsible for external/private negotiations.
- Blood Moon **may investigate** operations that leave reliable internal server traces.
- There will be **no official external RMT marketplace/classified marketplace** at this time. Do not build one.

## In-Game Trade / Traceability

- Distinguish carefully between a **traceable internal transaction** and a **private/non-guaranteed trade**.
- Examples of potentially traceable internal value: WC, HP, GP, Zen, Jewels, and other server-supported currencies/assets with transactional logs.
- A normal manual Trade Window exchange, where items move without a reliable transactional guarantee, must **not** automatically be described as guaranteed by Blood Moon.
- **Server investigation capability does not equal transaction guarantee.** These are different claims and must never be conflated in player-facing copy.

## WCoin Value

- **1 WC = R$ 1,00.**
- Keep this value cognitively simple. Do not create hidden exchange ratios.

## Gameplay Currencies

- WC is **not** intended to be routinely farmed through normal gameplay.
- Gameplay rewards use primarily **GP** and **HP**.
- Specific events/rewards may still grant WC where explicitly decided (see WC Reward Sources below).

## WC P2P Tax

- **Every player-to-player economic transaction using WC is subject to a 10% economic sink.** This applies on every eligible transaction, every time — including when previously-taxed WC is spent again in a further taxable transaction (the tax is recurring, not one-time per unit of currency).
- Example: A pays B 100 WC gross → 10 WC tax (leaves circulation permanently) → B receives 90 WC net. If B later spends those 90 WC in another taxable transaction, the 10% applies again to that new transaction.

## Direct WC Transfer Minimum

- Direct manual **player → player WC transfer**: minimum **20 WC**.
- No daily transfer limit is currently defined.
- **This 20 WC minimum must NOT block normal purchases** — see Player Shop below.

## Player Shop / Internal Purchases

- If a player sells an item in an internal player shop/store for any amount (1 WC, 2 WC, 5 WC, 10 WC, etc.), the purchase **must be allowed**.
- The 20 WC minimum applies **only** to direct WC transfer, **not** to item purchases through supported internal commerce.
- Do not artificially raise the shop minimum to 20 WC.

## WC Tax Precision

- WC is represented to players as **whole units**, but 10% of a small transaction may be fractional (e.g. 1 WC × 10% = 0.1 WC).
- Do **not** simply round every fee upward (overtaxes small sales) or downward (allows systematic tax avoidance).
- Design an **internal fractional fee accumulator**: fee obligations accumulate as fixed-point subunits (e.g. 1 WC = 10,000 subunits) until a whole WC's worth of fee obligation is reached, at which point one whole WC is collected and the remainder stays stored.
- **No floating point** for any of this.
- The player-facing WC balance may remain integer-based; internal accounting may use fixed-point subunits.
- The exact algorithm must guarantee: mathematically accurate 10% over time, no floating-point drift, no exploitable rounding, deterministic results, auditable history, safe concurrent transactions.
- Default expectation: the fee obligation belongs to the **account receiving taxable WC** — but this must be verified against real architectural implications, not assumed. See `docs/product/wc-fee-model/` for the design and `UNDECIDED` notes on accumulator scope (per-account vs. per-seller vs. per-wallet).

## VIP Structure

- Confirmed tiers: **BRONZE, SILVER, GOLD**.
- Confirmed duration options: **7 days, 15 days, 30 days**. Longer duration should have a cheaper effective cost per day.
- Candidate monthly base prices under discussion: Bronze R$20, Silver R$30, Gold R$40. **`UNDECIDED` — not finalized, research/analysis still required.**

## VIP Potential Benefits

- Potential benefits: XP bonus, general drop bonus, Chaos Machine bonus, reduced Reset level requirement, convenience benefits.
- **No direct PvP power advantage.**
- Bryan considers approximately 20%-30% differentiation by VIP tier potentially acceptable, but **only after** considering all existing XP modifiers. **`UNDECIDED`** until that audit is complete — do not finalize percentages yet.

## Chaos Machine

- VIP may provide a bonus. **Value not decided before auditing current real rates.**

## Reset

- Reset requirement **will be fixed** (a fixed, defined value). The exact requirement is **`UNDECIDED`** pending audit of current level requirement, Zen/currency cost, reward, and Master Reset interaction.
- Do not alter server configuration.

## Achievements

- Achievements may eventually grant small percentage bonuses.
- **Do not include achievements in current economic balancing.** Recorded as `FUTURE_BALANCE_INPUT`.

## Cash Shop Philosophy

- Blood Moon will **not** sell standard player equipment directly: no Excellent gear, Ancient gear, Socket gear, normal Wings, endgame equipment, or direct PvP gear for sale.

## Lucky Sets

- Lucky Sets are the **important exception** to the Cash Shop philosophy above: they may be **rented** for a number of days through Cash Shop.
- Whether 7/15/30-day rental is technically supported must be **verified**, not assumed. See `docs/product/economy-audit/lucky-sets-inventory.md`.
- Do not configure sales yet.

## Cosmetics

- Cosmetic monetization is **allowed**.
- Every stat-bearing item must be correctly distinguished from purely cosmetic items — never mislabel a stat-bearing item as purely cosmetic.

## F2P Philosophy

- **Authoritative design principle: all players should be able to reach the same end destination.** Paying may accelerate progression. Paying must **not** create an endgame/power destination inaccessible to Free-to-Play players.

## GP / HP / WC Economy

- GP + HP = gameplay currencies. WC = premium currency. Full source/sink audit required — see `docs/product/economy-audit/`.

## WC Reward Sources

- **Normal Reset**: NO WC.
- **Bug Hunters**: YES (see reward table below).
- **Streamers**: possibly WC, still under review. **`UNDECIDED`**.
- **Events**: **`TO VERIFY`**.
- **Ranking**: **`TO VERIFY`**.
- **Castle Siege**: **`TO VERIFY`**.
- **Clan migration**: **`TO VERIFY`**.

## Bug Hunters Policy

- Player must provide: description, steps/context, screenshot, video if possible, evidence, reproduction information.
- Report is submitted through the official website ticket system.
- Reward eligibility: issue must actually be a bug; report stays pending until verified by the team; duplicate reports do not receive the first-report reward; the winner is the **first sufficiently valid/reproducible report**, not merely the first vague message mentioning a problem.
- **Confirmed reward table**:
  - LOW = 5 WC
  - MEDIUM = 15 WC
  - HIGH = 30 WC
  - CRITICAL = 40 WC
- Reward is credited **after Beta**, according to the Beta reward migration policy (see Open Beta section above).

## Bug Transparency

- Public bug visibility should let players see: that a bug was reported, who had the first valid report, timestamp/order, current status, severity, eventual reward status.
- **Do not** publicly disclose active exploit reproduction steps.
- Suggested public statuses: `RECEIVED`, `UNDER_REVIEW`, `CONFIRMED`, `DUPLICATE`, `NOT_REPRODUCED`, `FIXED`.
- Sensitive reproduction details remain private while exploitable.

## Clan Migration

- A clan recruitment/migration program will exist.
- Preferred model: rewards unlock **after** measurable activity/progression goals — not simply for registering names/accounts.
- Potential validation inputs: unique active members, minimum progress, minimum activity days, guild continued activity.
- Exact thresholds/rewards **`UNDECIDED`** — require market research later.

## Staff / Creators

- Initial recruitment: **Game Masters** (events/community operation) and **Streamers/Content Creators** (promotion/acquisition/content).
- Creator rewards should be based on measurable criteria: minimum streaming hours, number of distinct days, average viewers, engagement, qualified referrals, retention, behavior/content quality.
- If minimum targets are not achieved, reward may not be granted.
- Exact program **`UNDECIDED`**.

## Account / Character Sales

- **Character sale = allowed.**
- **Account sale = allowed.**
- Implementation/legal policy is **not** finalized blindly — risks (account recovery, email ownership, 2FA, payment history, chargeback responsibility, Beta reward linkage, identity/reputation transfer, fraud, support burden) require analysis and recommended operational safeguards before shipping. See `docs/product/economy-audit/account-character-sale-risk-notes.md`.
- Sales are not prohibited merely because they carry risk.

## Player Reputation

- There will be no official RMT marketplace, but internal trust signals may still be useful (account age, transaction history, successful internal purchases/sales, verified internal WC operations, sanction history, chargeback/fraud flags, community reputation where applicable).
- Do not expose sensitive security signals publicly.
- Do not create a false "server guarantees this player" badge.

---

## Explicitly `UNDECIDED` items in this document (do not treat as resolved anywhere)

1. VIP monthly pricing (Bronze/Silver/Gold exact values)
2. VIP benefit percentages (20-30% candidate range, pending XP-stack audit)
3. Chaos Machine VIP bonus value
4. Reset's exact fixed requirement value
5. Streamer WC reward eligibility
6. Events/Ranking/Castle Siege/Clan migration WC reward eligibility
7. Clan migration reward thresholds
8. Creator program exact structure
9. Whether Beta account deletion has actually happened (needs separate verification)
10. WC fee accumulator scope (per-account vs. per-seller vs. per-wallet) — pending architectural verification
