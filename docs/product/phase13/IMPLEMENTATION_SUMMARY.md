---
status: FINAL
category: product/economy
audience: internal (engineering + product)
lastVerified: 2026-08-30
---

# Open Beta P0 Implementation — Summary (Part Q/S)

**Nothing was pushed or deployed.** Worktree `D:\MU\mu-bloodmoon-v1-openbeta`, branch `open-beta/p0-foundation`, based on `origin/main`. Local commit only, per explicit instruction.

## What was built

### 1. WalletLedgerService (`apps/api/src/modules/wallet/`)
The single place every `AccountCurrency` balance mutation in the app now goes through — replacing three separate, duplicated `debitCurrency`/`creditCurrency` pairs previously in `marketplace.service.ts`, `commerce.service.ts`, and a raw upsert in `store-admin.service.ts`, plus one in `marketplace-admin.service.ts` not previously identified. Every mutation writes exactly one `WalletLedgerEntry` row in the same transaction as the balance change.

- Fixed-point WC tax accumulator (1 WC = 10,000 subunits, no floating point anywhere) — the same design proven in the Phase 11/12 reference implementation (24/24 tests), now wired into real production code paths.
- Per-currency tax rate: `MarketplaceEconomyConfig.wcoinTaxPercent` (10, new), `goblinPointTaxPercent`/`huntPointTaxPercent` (5, unchanged from the old `saleFeePercent`'s value — explicitly never raised).
- `saleFeePercent` kept in the schema (admin API still exposes it) but no longer read by fee-calculation code — documented as deprecated in place, not silently repurposed.
- Found and fixed a real dead field along the way: `vipDiscountPercent` was already in the schema, settable via admin API, but never read by any fee code — documented, not activated.

### 2. Marketplace fee migration (`marketplace.service.ts`)
The authoritative fee settlement was moved from order-**creation** time to order-**completion** time — the accumulator touch and the real balance credit now happen atomically in the same transaction, closing a real correctness gap the old code had (fee was computed once at creation against a snapshot, then blindly applied later, allowing accumulator drift under concurrent orders for the same seller). Creation-time `fee`/`sellerAmount` are now an explicit estimate, overwritten with the authoritative settled values at completion.

### 3. VIP foundation (`apps/api/src/modules/vip/`)
- `VipProductConfig` (tier × duration pricing catalog, everything unpriced/disabled by default), `VipEntitlement` (current state, one row per account, extend-in-place), `VipGrant` (append-only history, idempotent), `VipBenefitConfig` (XP/drop/Chaos-Machine bonus config — every write is clamped to 0/disabled regardless of what's requested, by design, this phase).
- Purchase completes synchronously: debit → extend/create entitlement → grant row → queue `GameBridgeJob(GRANT_VIP)` (new operation type; no worker consumes it yet — apps/api is the source of truth for entitlement status in the meantime, per the audit's recommended Option C).
- Real finding acted on: AL0-3 (the account-tier bracket used throughout XP/Reset config) and the planned Bronze/Silver/Gold tiers are very likely separate concepts (`Vip1/Vip2/Vip3` is the real three-tier structure found in `GameServerInfo - Command.dat`) — this implementation's `VipTier` enum matches the *product's* three tiers, not AL0-3, consistent with that finding.

### 4. Beta lifecycle foundation (`apps/api/src/modules/beta-lifecycle/`)
- `Account.accountPhase` (PRE_BETA/OPEN_BETA/OFFICIAL), assigned explicitly at registration from one server-side config (`open-beta-window.config.ts`) — never inferred from `createdAt`, never duplicated across frontend files.
- `AccountTermsAcceptance` (versioned, auditable — not a bare boolean) for the Open Beta registration notice.
- `BetaRewardEntitlement` (durable, hashed-email-linked, survives account deletion by design — no hard FK to a live account).
- `cleanupDryRun`: read-only, refuses PRE_BETA/OFFICIAL accounts and GM/ADMIN/SUPER_ADMIN roles by construction (query scope, not a filter that could be bypassed), requires an explicit `betaCycleId`, reports `WOULD_DELETE`/`BLOCKED`/`UNKNOWN_DEPENDENCY` per account. **Deletes nothing.**
- Confirmed via the real `GameBridgeOperation` enum that no delete/wipe capability exists in the bridge today — real, unbuilt scope for a future phase, not a flag away.

### 5. X-Shop
No code change — see `XSHOP_IMPLEMENTATION_NOTE.md`. The 168-item catalog lives entirely in GameServer config with zero application-layer representation; there was nothing safe or in-scope for this phase to gate.

## Real bugs found and fixed along the way (not hypothetical)

1. **Existing test regression**: `recharge-payments.e2e-spec.ts`'s transient-failure-and-retry test monkey-patched the old `commerceService.creditCurrency` private method, which no longer exists after the ledger consolidation — fixed to patch `WalletLedgerService.credit` instead. Caught by actually running the existing suite, not assumed safe.
2. **Frontend payload gap**: the existing `MarketplaceAdminManager.vue` admin form doesn't know about the three new tax-rate fields yet and would send `undefined` for them — `updateEconomy` was made defensive (falls back to the current stored value rather than corrupting the config to `NaN` on every save) until the frontend UI is updated separately.
3. **Test fixture bug (own code)**: an early version of the VIP test suite used a hand-typed `adminUser` fixture not backed by a real `Account` row, which failed a foreign-key constraint on `AuditEvent.actorId` deep inside a transaction — looked like a hang under a 180s timeout before being properly bisected and fixed.

## Validation performed

| Check | Result |
|---|---|
| `apps/api` full typecheck + structure checks (`npm run check`) | PASS, 0 errors |
| New e2e tests (wc-economy-tax, wallet-ledger, vip-foundation, beta-lifecycle) | 43/43 PASS |
| Existing `recharge-payments.e2e-spec.ts` (after the regression fix) | 16/16 PASS |
| Existing `marketplace-bridge-dev-controls` + `unified-registration-preparation` | 17/17 PASS |
| Project's own curated critical suite (`portal-critical`/`password-recovery`/`error-handling`) | 30/30 PASS |
| `apps/web` production build | See FINAL_REPORT — captured after this document was written |
| Secret-logging scan (`security:scan-log-secrets`) | PASS, 0 risky call sites |
| Manual secret grep across all changed/new files | Clean |
| Migrations | 2 new, hand-curated to exclude unrelated pre-existing drift (see migration file headers), applied cleanly to local dev DB |

**Total: 106 tests run across new and touched existing suites, 0 failures.** (The broader, full e2e suite beyond this targeted set was not run in full this phase, given its size and the time budget — the tests run were chosen specifically because they exercise the exact services this phase modified.)
