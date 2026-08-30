---
status: DRAFT
category: product/economy-audit
audience: internal (engineering + product)
lastVerified: 2026-08-29
evidenceMethod: direct grep/read of D:\MU\RemoteData\Phase11\GameServerInfo - Command.readable.txt, GameServerInfo - Custom.readable.txt, and apps/api/prisma/schema.prisma
---

# VIP — Actual Technical Capabilities, Purchase Path, and Implementation Options (Parts F/G/H)

## Part F — mapping the real implementation (not assumed)

### Correction to a Phase 11 assumption

Phase 11 referred to AL0-AL3 loosely as a "VIP/account-tier bracket," hedged with "presumably." **This phase found real evidence that AL0-AL3 and VIP are likely two separate concepts, not the same thing:**

- `GameServerInfo - Command.dat` has a dedicated `; Command Buy Vip Settings` section defining **`Vip1`, `Vip2`, `Vip3`** as three distinct purchasable tiers, each with its own 3-slot price (`CommandBuyVip1PriceValue1-3`, `CommandBuyVip2PriceValue1-3`, `CommandBuyVip3PriceValue1-3`) and a shared day-range (`CommandBuyVipMinDays = 15`, `CommandBuyVipMaxDays = 30`).
- AL0-AL3 is a **four-value** bracket used pervasively across XP rates, Reset caps, Chaos Machine (though flat there), GM account-level gating (`ServerGameMasterAccountLevel`), and dozens of other `_AL0-3` fields throughout the config.
- No field anywhere links an AL bracket to a Vip1/2/3 tier. A direct grep for any AL+Vip cross-reference found nothing beyond the `CommandBuyVipEnable_AL0-3`/`CommandBuyVipMoney_AL0-3` fields, which gate *who is allowed to use the `/buyvip` command* per AL bracket — not a mapping from AL to VIP tier itself.

**Working conclusion (not certain, but evidence-supported)**: `Vip1`/`Vip2`/`Vip3` is the real three-tier structure that most naturally corresponds to the planned Bronze/Silver/Gold — a genuine three-way split, unlike AL0-3's four brackets. AL0-3 is more likely a general account-permission/class bracket (used to control access to many unrelated systems) that is **not** itself the VIP tier. Do not treat `AL1 = Bronze` etc. as confirmed without further evidence (e.g. checking whether AL assignment logic itself references VIP status somewhere not found this pass).

### Confirmed real VIP-granting mechanisms (5 found, all disabled)

| Mechanism | Location | State |
|---|---|---|
| `/buyvip` in-game command | `GameServerInfo - Command.dat`, `CommandBuyVipSwitch` | **0 (disabled)** — `CommandBuyVipEnable_AL0-3` also all 0 |
| NPC shop item purchase (`CustomBuyVipAndCoin.txt`) | `Data\Custom\CustomBuyVipAndCoin.txt` | **Fully commented out** (confirmed Phase 11) |
| Online lottery prize | `GameServerInfo - Custom.dat`, `CustomOnlineLotteryVipSwitch` | **0 (disabled)** — real player-facing text exists: `"%s você ganhou %d dias de vip no sorteio!"` |
| New-character welcome reward | `GameServerInfo - Custom.dat`, `CustomVipRewardNewCharacterSwitch` | **0 (disabled)** |
| Referral/indication reward | `GameServerInfo - Command.dat`, `CommandIndicationRewardVipDays = 0` | **0 days configured** |

**Every VIP-granting path the engine supports is currently disabled or zeroed.** VIP is represented internally as a **day-count grant** (`VipDays`), not a static tier flag — consistent across every mechanism found (`CommandIndicationRewardVipDays`, `CommandBuyVipMinDays/MaxDays`, lottery "%d dias de vip"). This is a real, structural fact worth keeping: whatever VIP system ships, "days" is already the engine's native unit for it, matching the planned 7/15/30-day duration options conceptually (though the *current* `/buyvip` command's own min/max is 15-30, not 7-30 — a 7-day option would need that range widened, a config change).

### apps/api (website/portal layer) — zero VIP implementation

A full search of `apps/api/prisma/schema.prisma` for "vip" found exactly one hit: `MarketplaceEconomyConfig.vipDiscountPercent` — a dead field, never read by any fee-calculation code (see `EXISTING_5_PERCENT_TAX_AND_MIGRATION.md`). **There is no `Account.vipTier`, no VIP expiry field, no VIP-related model anywhere in the portal database.** VIP, if it exists at all today, would have to be tracked entirely at the GameServer/SQL layer — apps/api has no representation of it whatsoever.

### GameBridge reality check (affects the Option B/C comparison above)

`GameBridgeOperation` (the real enum apps/api uses to queue GameServer-bound work via `GameBridgeJob`) currently supports exactly: `LOCK_ITEM, RELEASE_ITEM, TRANSFER_ITEM, DELIVER_ITEM, CREDIT_CURRENCY, SYNC_INVENTORY`. **No VIP-granting operation exists.** Both Option B and Option C would require adding a new operation type (e.g. `GRANT_VIP`) to this enum and its handler — this is real, concrete engineering scope for either option, not a minor detail. Option A (the in-game `/buyvip` command) is the only option that needs zero GameBridge changes, since it bypasses the bridge entirely.

### Website / API / launcher / game-client visibility

- **Website**: no VIP display/purchase UI found in this pass (not exhaustively searched — flagged as `NOT_FULLY_VERIFIED`, not asserted absent).
- **API**: no VIP endpoint or field in the real schema (confirmed above).
- **Launcher**: not checked this phase.
- **Game client visibility**: not checked this phase (would require client-side asset inspection, out of scope).

## Part G — purchase path trace

**Website → Order → Payment → Delivery → VIP activation**: **does not exist**. No `ShopProduct`/`RechargeIntent` in the real schema references VIP, VipDays, or anything that would deliver a VIP grant to a GameServer account. The real payment chain (`RechargeIntent` → `PaymentWebhookEvent`) only credits `CurrencyCode` balances (WCOIN/GOBLIN_POINT/HUNT_POINT) — it has no concept of delivering a non-currency grant like "15 days of VIP."

**WC → VIP purchase → GameServer/account update**: the closest real candidate is the `/buyvip` in-game command (`CommandBuyVipSwitch`), which is GameServer-native and entirely disabled. If activated as-is, it would let a player spend in-game currency (via `CommandBuyVip1/2/3PriceValue1-3` — three price slots, likely the same Coin0/1/2-style multi-currency pattern seen elsewhere) directly through the GameServer, bypassing the website/apps-api entirely.

**Is `CustomBuyVipAndCoin.txt` the only mechanism?** **No — confirmed one of (at least) five candidate mechanisms**, all currently inactive. It is not special or more "real" than the others; all five are equally disabled config.

## Part H — implementation options (2-3, one recommended, none implemented)

### Option A — activate the existing `/buyvip` GameServer command

Turn on `CommandBuyVipSwitch`, enable per-AL access, set real prices in `CommandBuyVip1/2/3PriceValue1-3`, widen `CommandBuyVipMinDays` to include 7.

- **Security**: weakest of the three — an in-game command purchase, paid in in-game currency the player already holds, has no real-money payment step to secure, but also no server-side audit trail beyond whatever GameServer's own command logs capture (not inventoried this phase).
- **Auditability**: weak — no apps/api record at all; entirely dependent on GameServer-side logging.
- **UX**: fast (in-game, no website round-trip) but disconnected from any real-money purchase flow, so it can't be the path for players who want to *buy* VIP with real money — only for spending in-game currency they already have.
- **GameBridge impact**: none currently, since this bypasses apps/api entirely.
- **Refund handling**: none exists; would need to be built from scratch.
- **Expiry handling**: the engine already models VIP as days, so expiry is presumably handled by whatever consumes that day-count server-side — not confirmed this phase.
- **Implementation effort**: **lowest** — mostly config changes plus GM-level review of whether the mechanism is trustworthy enough to re-enable.

### Option B — real-money purchase via the existing `RechargeIntent`/CashShop-style flow, delivering a VIP grant

Extend the pattern already proven for WC recharges: a `ShopProduct`/new "VIP package" type, real MercadoPago payment, `StoreDelivery` target extended to deliver a VIP-days grant to the GameServer account (not just currency or an item).

- **Security**: strongest — reuses the already-real, webhook-verified MercadoPago payment chain (`RechargeIntent`/`PaymentWebhookEvent`, signature-verified).
- **Auditability**: strongest — `PurchaseIntent`/`StoreDelivery` already have `MANUAL_REVIEW`, refund, and correlation-id patterns built in; a VIP purchase would inherit all of that for free.
- **UX**: real-money purchase, consistent with how players already buy WC and CashShop items — no new mental model for the player.
- **GameBridge impact**: **highest** — `StoreDelivery` would need a new delivery mechanism capable of setting a VIP grant on the GameServer/SQL side, which doesn't exist today (current `StoreDeliveryTarget` values are `ACCOUNT/CHARACTER/INVENTORY/VAULT/MAIL` — none of which obviously models "grant N days of VIP"). This is real, non-trivial engineering.
- **Refund handling**: inherits the existing `RechargeIntentStatus`/`PurchaseIntentStatus` refund states — real precedent to build on.
- **Expiry handling**: would need a new mechanism (a scheduled job or GameServer-side expiry check) since apps/api has no VIP concept to expire in the first place.
- **Implementation effort**: **highest** — new delivery target, new GameBridge capability, new schema fields.

### Option C — website purchase (BRL or WC) + backend delivery to account, using WC as the intermediate step

Player buys VIP with BRL (via existing recharge flow, if not already holding WC) or spends existing WC balance; apps/api validates the WC debit (reusing `AccountCurrency`/`debitCurrency` patterns already proven in the marketplace service) and writes a durable VIP grant record in apps/api itself (not just GameServer), which a scheduled reconciliation job pushes to the GameServer.

- **Security**: strong — WC debit reuses the already-transactional, race-safe pattern from `marketplace.service.ts`.
- **Auditability**: strong — a real apps/api-side VIP record (new model) gives a durable, queryable history that Option A lacks and Option B only partially provides.
- **UX**: flexible — supports both "I already have WC" and "I want to pay directly" without forcing a specific path.
- **GameBridge impact**: medium — needs a one-way sync mechanism (apps/api VIP record → GameServer), less invasive than Option B's full delivery-target rework since it's push-based reconciliation rather than a new StoreDelivery type.
- **Refund handling**: apps/api owns the VIP record, so refund/revocation logic lives entirely in the portal — cleaner than Option A, comparable to Option B.
- **Expiry handling**: apps/api owns the expiry timestamp directly (new field on a new model) — the most natural fit of the three, since VIP becomes a first-class apps/api concept instead of being inferred from GameServer state.
- **Implementation effort**: **medium** — new model + new sync job, less than Option B's full delivery-system extension, more than Option A's config-only change.

### Recommendation — clearly marked as a recommendation, not a decision

**Option C.** It gives apps/api its own durable, auditable VIP record (something neither A nor B provides cleanly), reuses the already-proven WC debit pattern from the marketplace service, and keeps the GameServer sync surface smaller than Option B's full delivery-system rework. This is a recommendation only — Bryan decides.
