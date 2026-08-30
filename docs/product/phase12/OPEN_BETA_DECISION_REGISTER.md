---
status: DRAFT
category: product/economy
audience: internal (product + engineering)
lastVerified: 2026-08-29
---

# Open Beta Decision Register (Part P)

Status values: `CONFIRMED` (real evidence backs the claim as stated), `TECHNICALLY_BLOCKED` (the decision is made, but no working mechanism exists to deliver it yet), `IMPLEMENTATION_PENDING` (mechanism partially exists or is designed but not built), `UNDECIDED` (no product decision yet).

## Corrections to prior-phase framing (explicit, per Part P instruction)

| Old framing | Corrected status | Why |
|---|---|---|
| "50x XP confirmed" | **Never actually asserted as confirmed in Phase 11 output** — Phase 11 already labeled it "folklore, NOT_CONFIRMED_AS_STATED." This phase adds precision: `AddExperienceRate_AL0 = 50` is real, but its exact mathematical meaning (bonus % vs. multiplier) remains `UNKNOWN` — engine source inaccessible. |
| "Rentable Lucky Sets already exist" | **Never actually asserted in Phase 11 output either** — Phase 11 correctly found no rental Lucky Set config. This phase adds: the *rental mechanism itself* is proven live (CashShopProduct.ItemDuration, 8 wing/pet items) — just never applied to Lucky Set item codes. |
| "182 X-Shop items" | **CORRECTED to 168** — a fresh full parse this phase counted exactly 168 rows (14 categories × 12 rows). Phase 11's 182 figure was a miscount; use 168 everywhere going forward. |

*(Neither of the two literal phrases the phase spec warned against was actually present in Phase 11's written output — but the corrections above are recorded regardless, since the underlying nuance genuinely needed sharpening either way.)*

## Register

| Item | Status | Evidence/Reason |
|---|---|---|
| Open Beta dates (01/09–15/09/2026) | `CONFIRMED` | Authoritative product decision |
| Beta accounts are temporary, deleted after Beta | `TECHNICALLY_BLOCKED` | Policy decided; zero implementation exists (no `accountPhase` field, no deletion job, no GameBridge delete operation) |
| Beta reward entitlement survives, one-time claim | `TECHNICALLY_BLOCKED` | Policy decided; `BetaRewardEntitlement` is a design only, not built |
| WC = R$1 | `CONFIRMED` | Authoritative decision, no technical dependency |
| WC P2P 10% tax | `IMPLEMENTATION_PENDING` | Fee model designed + tested (24/24) this phase/prior; not wired into live code; existing 5% mechanism must be migrated, not stacked (see `EXISTING_5_PERCENT_TAX_AND_MIGRATION.md`) |
| Direct WC transfer 20 WC minimum | `TECHNICALLY_BLOCKED` | The feature itself (`PLAYER_DIRECT_WC_TRANSFER`) doesn't exist in the codebase yet — there's nothing to apply a minimum to |
| Shop purchases below 20 WC allowed, including 1 WC | `CONFIRMED` (as a real, already-consistent state) | `MarketplaceEconomyConfig.minimumPrice` already defaults to 1 — no conflict found |
| Existing 5% marketplace fee | `CONFIRMED` (as a real, current fact) | Live in `marketplace.service.ts`, `saleFeePercent=5`, floor-rounded, applies to WCOIN/GOBLIN_POINT/HUNT_POINT alike |
| VIP tiers Bronze/Silver/Gold | `UNDECIDED` (pricing/benefits) + `IMPLEMENTATION_PENDING` (mechanism) | Real `Vip1/Vip2/Vip3` structure exists in `Command.dat` (disabled); no apps/api VIP field exists at all |
| VIP 7/15/30-day durations | `IMPLEMENTATION_PENDING` | Engine's real `/buyvip` range is currently 15–30 days; 7-day would need the range widened (config change, not new capability) |
| No direct PvP power from VIP | `CONFIRMED` (as a constraint honored so far) | No VIP-tied combat stat found anywhere this phase; only XP/Chaos-Machine/Reset-adjacent bonuses are even hypothesized |
| VIP purchase path | `TECHNICALLY_BLOCKED` | All 5 real candidate mechanisms found (NPC shop, `/buyvip` command, lottery, new-character reward, referral reward) are disabled; zero apps/api-side VIP concept exists |
| No standard/endgame equipment sales (Cash Shop Philosophy) | `TECHNICALLY_BLOCKED` — **actively violated by live config** | `CustomXShop.txt` sells 168 +13 Excellent weapons/armor/wings for WCoin today; `CashShopProduct.txt` (12 items) is fully compliant |
| Lucky Set rental via Cash Shop | `IMPLEMENTATION_PENDING` | No Lucky-Set-specific config exists; the rental mechanism (`ItemDuration`) is proven for other items |
| Cosmetics allowed | `CONFIRMED` as policy, `UNDECIDED` in practice | No purely-cosmetic item was found anywhere in the real catalog this phase — nothing to point to as an example yet |
| F2P reaches the same end destination as paying players | `CONFIRMED` as policy | Directly contradicted in spirit by the live X-Shop finding above — not a technical contradiction of the policy text, but a real tension worth Bryan's attention |
| Bug Hunters reward table (5/15/30/40 WC) | `CONFIRMED` | Authoritative decision, no technical dependency found blocking it |
| Bug transparency public status system | `IMPLEMENTATION_PENDING` | Designed (Phase 11, `BUG_TRANSPARENCY_DESIGN.md`), not built |
| Clan migration reward-after-activity | `UNDECIDED` (thresholds) | Policy direction decided; no evidence this feature exists in real config at all |
| Streamer WC reward | `UNDECIDED` | Explicitly still under review per the decision itself |
| Account/character sale allowed | `CONFIRMED` as policy, `TECHNICALLY_BLOCKED` in practice | No transfer-flow mechanism exists; real risks documented in `economy-audit/account-character-sale-risk-notes.md` |
| WC ledger / transaction history | `TECHNICALLY_BLOCKED` | Confirmed to not exist anywhere in the schema; `AccountCurrency.balance` is a bare running total |
| Antifraud responses (`WC_TRANSFER_FREEZE`, etc.) | `TECHNICALLY_BLOCKED` for most; `IMPLEMENTATION_PENDING` for `ACCOUNT_REVIEW`/`MANUAL_REVIEW` | `AccountModeration` (NOTE/WARNING/BLOCK/UNBLOCK/BAN, with `expiresAt` for temporary restrictions) is real and already covers temporary/permanent account sanctions — a genuinely useful, previously-under-reported existing capability found this phase |
