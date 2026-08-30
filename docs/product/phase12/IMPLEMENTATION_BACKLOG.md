---
status: DRAFT
category: product/economy
audience: Codex / engineering
lastVerified: 2026-08-29
---

# Implementation Backlog (Part Q)

Nothing below was implemented this phase (`Do not implement`). Each item cites the real file/system it touches.

## P0 — before Open Beta (01/09/2026)

### 1. Resolve the X-Shop / Cash Shop Philosophy conflict
- **WHY**: `CustomXShop.txt` sells 168 +13 Excellent weapons/armor/wings live today, directly contradicting the decided policy. This is the single highest-stakes finding across Phases 11-12.
- **FILES/SYSTEMS**: `C:\MuServer\Data\Custom\CustomXShop.txt` (GameServer config, requires operational access outside this repo).
- **DEPENDENCIES**: A product decision first — disable, replace, or explicitly grandfather (see `QUESTIONS_FOR_BRYAN.md` P0 #1). No code change until that's answered.
- **RISK**: High — real player-facing content, real revenue path; changing it without warning affects any player who has already purchased from it.
- **TESTS REQUIRED**: A pre/post inventory diff proving no unintended item removal beyond what was decided; if replaced, a full re-audit against the `KEEP`/`REMOVE`/`COSMETIC_CANDIDATE` taxonomy in `XSHOP_AUDIT.md`.

### 2. Migrate the 5% marketplace fee to the decided model, without double-charging
- **WHY**: Live `saleFeePercent=5`, floor-rounded, applies to WCOIN/GOBLIN_POINT/HUNT_POINT uniformly — needs to become the fixed-point 10% model for WC specifically, per the safe migration design.
- **FILES/SYSTEMS**: `apps/api/src/modules/marketplace/marketplace.service.ts` (fee calculation), `apps/api/prisma/schema.prisma` (`MarketplaceEconomyConfig`, needs a currency-conditional rate or an explicit GP/HP decision).
- **DEPENDENCIES**: Resolve whether GP/HP marketplace fees also become 10% or stay at their current rate (unresolved — `QUESTIONS_FOR_BRYAN.md`). Depends on the WC ledger (#5 below) existing first if the accumulator is to be durable across restarts.
- **RISK**: High — a bug here either overtaxes players (15% instead of 10%) or undertaxes silently (the exact failure mode the new policy was designed to close).
- **TESTS REQUIRED**: Reuse `docs/product/wc-fee-model/wc-fee-accumulator.test.mjs`'s 24 cases against the real implementation; add an integration test asserting the *old* `Math.floor(... 5% ...)` code path is unreachable post-migration; add a GP/HP regression test proving their rate is unaffected unless explicitly decided otherwise.

### 3. Build a real VIP purchase path (Option C recommended)
- **WHY**: All 5 real VIP-granting mechanisms found are disabled; zero apps/api-side VIP concept exists at all.
- **FILES/SYSTEMS**: New `Account.vip*` fields or a new `VipGrant` model (apps/api), a new `GameBridgeOperation` value (currently `LOCK_ITEM/RELEASE_ITEM/TRANSFER_ITEM/DELIVER_ITEM/CREDIT_CURRENCY/SYNC_INVENTORY` — none grants VIP), a sync job to push the grant to `MEMB_INFO.RewardVip`/`AccountLevel` (exact target field(s) not confirmed — needs an engine-behavior test) or the real `/buyvip` command's underlying mechanism.
- **DEPENDENCIES**: VIP pricing/benefit decision (`QUESTIONS_FOR_BRYAN.md`); confirms whether AL0-3 and Vip1-3 are actually linked (open question from `VIP_TECHNICAL_CAPABILITIES.md`) — needs an empirical test before the sync job can be written correctly.
- **RISK**: Medium-high — real-money purchase path, needs the same rigor as the existing `RechargeIntent` flow.
- **TESTS REQUIRED**: End-to-end purchase → grant → GameServer-visible VIP state; refund/revocation test; expiry test.

### 4. Build the Beta account phase field + freeze/snapshot/delete sequence groundwork
- **WHY**: No `accountPhase` field, no deletion mechanism, no reward-entitlement record exists — Beta ends 15/09/2026 and nothing is ready.
- **FILES/SYSTEMS**: `apps/api/prisma/schema.prisma` (new `AccountPhase` enum + field, new `BetaRewardEntitlement` model per `BETA_ACCOUNT_LIFECYCLE_DESIGN.md`), a new `GameBridgeOperation` for character/progress deletion (does not exist today).
- **DEPENDENCIES**: None technical — this can start immediately; the actual deletion *execution* should not run until Beta actually ends and eligibility snapshots are verified complete.
- **RISK**: High — irreversible deletion step; must never run before the snapshot/preserve steps (2-4 in the lifecycle design) are confirmed complete.
- **TESTS REQUIRED**: A dry-run mode that reports what *would* be deleted without deleting; a test proving `BetaRewardEntitlement` rows survive `Account` deletion (`onDelete` behavior); a test proving the one-time-claim constraint can't be bypassed by a retry.

## P1 — before official launch

### 5. Build the WC ledger
- **WHY**: No transaction history exists anywhere; chargeback investigation is only half-traceable today.
- **FILES/SYSTEMS**: New `WcLedgerEntry` model (`docs/product/wc-fee-model/DESIGN.md` has the exact proposed shape) + a `feeAccumulatorSubunits` field.
- **DEPENDENCIES**: None blocking — can be built independently, though it's a prerequisite for #2's fee migration being fully auditable long-term.
- **RISK**: Medium — additive change, doesn't touch existing balance logic directly if built as a parallel write-through log first.
- **TESTS REQUIRED**: Every existing marketplace/recharge code path writes a ledger entry; a reconciliation test proving `SUM(ledger entries for an account)` matches `AccountCurrency.balance`.

### 6. Resolve Ranking/Events/Castle Siege WC-grant status
- **WHY**: Genuinely unresolvable from file config alone (`CustomRankingReward.txt`'s `Value1-9` fields have no currency label).
- **FILES/SYSTEMS**: Either SQL schema inspection (a `bm-sql schema`-style pass against tables not yet checked) or an in-game empirical claim test.
- **DEPENDENCIES**: None.
- **RISK**: Low.
- **TESTS REQUIRED**: N/A — this is investigation, not implementation.

### 7. Account/character sale transfer flow
- **WHY**: Currently would happen entirely off-platform with no audit trail.
- **FILES/SYSTEMS**: New transfer-request model + 2FA-reset step + ownership audit trail (`economy-audit/account-character-sale-risk-notes.md`).
- **DEPENDENCIES**: Product decision on whether to build this before allowing sales in practice, or allow sales without it initially.
- **RISK**: Medium — touches account ownership/security directly.
- **TESTS REQUIRED**: Transfer completes only with both-party confirmation; 2FA is force-reset; old owner loses access atomically with new owner gaining it (no window where both or neither has access).

## P2 — after launch

### 8. Extend the CashShop rental mechanism to Lucky Set item codes
- **WHY**: Mechanism proven, just not applied.
- **FILES/SYSTEMS**: New `CashShopProduct.txt` rows for the 54 `LuckyItem.txt` codes with `ItemDuration` set appropriately — but note Part N found Lucky Item's own "Decay" field is unrelated and should not be confused with the rental duration being added.
- **DEPENDENCIES**: Pricing decision.
- **RISK**: Low — additive, uses a proven pattern.
- **TESTS REQUIRED**: Rental expiry behavior matches the existing 8 proven items.

### 9. GP/HP full source-and-sink audit
- **WHY**: Not completed in either phase — real gap.
- **FILES/SYSTEMS**: Broader config sweep beyond this phase's WC/VIP/X-Shop focus.
- **DEPENDENCIES**: None.
- **RISK**: Low — research only.
- **TESTS REQUIRED**: N/A.

### 10. Legal/privacy/payment-provider review of all 30 `ACCOUNT_RULES_DRAFT.md` topics
- **WHY**: None has final reviewed copy.
- **FILES/SYSTEMS**: N/A — legal process, not code.
- **DEPENDENCIES**: External reviewers.
- **RISK**: Low technically, high if skipped before real-money features ship.
- **TESTS REQUIRED**: N/A.
