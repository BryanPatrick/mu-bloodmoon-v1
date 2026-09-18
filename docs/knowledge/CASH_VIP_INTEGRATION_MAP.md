---
status: ACTIVE
category: knowledge
audience: internal (product + engineering)
lastVerified: 2026-09-18
confidence: MIXED — see per-flow confidence notes
---

# Cash/VIP/currency integration map

Phase 18C (2026-09-18): processes the 3 P1 vendor videos flagged in
`KNOWLEDGE_GAPS.md` GAP-P18-01, distinguishes the two legacy purchase paths
found so far, and lays out (without choosing) options for bridging the
current Portal's WC wallet into the game. Extends `LEGACY_SUPPLIER_INDEX.md`
(Flow A there) — does not restate it.

## Part 1 — the 3 priority videos, processed

### `gqtSk1pdti4` — "Custom Buy Vip - ADDED 8.3" (2024-12-17)

- **Channel**: ProjectGamers Developers (`@projectgamersoficial`)
- **Version/context**: presenter demos on Season 6.17, states the feature
  "works for all versions"
- **What it adds**: an in-game **menu button** (client-side UI) for buying
  one of 3 VIP tiers directly in-game — no website visit needed
- **Config location**: GameServer → `Data`/`Command` → search "Buy Vip"
  (the config file backing this command/menu)
- **Fields shown**: per-VIP-tier price in 3 currencies (spoken
  interchangeably as "WCoinC/WCoinP/GoblinPoint" or "Cash/Gold/PCPoint" —
  same underlying triple, vendor uses both naming conventions), a
  "verify already VIP" toggle (recommended always ON — blocks buying a
  second VIP while one is active), min/max purchasable days, a currency
  selector (Zen was shown as technically possible but not recommended)
- **Pricing model demonstrated**: price is **per-day**, multiplied by days
  requested (VIP1 unit price 1 Cash → 15 days = 15 Cash, 30 days = 30 Cash;
  VIP2 unit price 2 → 30/60 Cash; VIP3 unit price 3 → 45/90 Cash)
- **Game-side behavior (live demo)**: player opens menu → sees price →
  confirms → balance visibly debited → VIP badge + exact expiration
  timestamp appears immediately in-game, no delay, no relog needed
- **Reload/restart**: GameServer Startup GUI → double-click → "Reloads" →
  **"Reload Comand"** — no restart mentioned or required. `LIVE_RELOAD_CONFIRMED`
  for this specific config file.
- **Warnings**: presenter explicitly warns not to manually edit SQL data
  while the server is online unless you know what you're doing (used only
  for his own test/demo to reset VIP status)
- **Unknowns**: exact underlying SQL/table the GameServer executes when the
  in-game purchase completes — not shown, not derivable (engine is
  closed-source, no source files exist anywhere per the VPS source hunt)

### `Jia1TrtgZfY` — "Command Buy Vip Check User - UPDATED 8.2" (2024-11-04)

- **Channel/version**: same channel; this is chronologically **earlier**
  than 8.3 above (8.2 < 8.3) — a bugfix/hardening pass on the *same*
  underlying command system, via chat command, before the in-game GUI
  button existed
- **What it fixes**: a real, confirmed bug — a VIP Silver player buying 1
  day of VIP Gold previously ended up with 30 days of Gold (days summed
  additively across *different* VIP tiers, not just topped up within the
  same tier). Fix: block any purchase while already VIP of any tier, until
  it expires or an admin intervenes — same restriction later shown as a
  toggle in the 8.3 video
- **Confirms the same per-day×days pricing model** independently
- **States a planned future GUI window** — delivered in 8.3 (the video
  above), confirming these two videos describe one continuous feature
  timeline, not two separate systems
- **Command location**: `Data`/`Command` → "Buy Vip" (chat-command form)

### `XUeN6U74zME` — "Custom Buy Vip And Coin - UPDATED 7.7" (2023-10-19)

- **Channel/version**: same channel; **earliest** of the 3 (7.7, predates
  both above) — describes a **different, broader** mechanism:
  `CustomBuyVipAndCoin.txt` (`Data`/`Custom`), an NPC-based item-purchase
  system where buying a configured item grants **either** a currency amount
  **or** a VIP grant+tier — the general reward-on-purchase engine that the
  dedicated "Buy Vip" command (videos 1/2) is a specialized front-end for
- **This specific video's focus**: extending the *same* mechanism to
  deliver an in-game **skill/magic** (a BK-usable "Fire Slash" reusing an
  MG-only spell) instead of currency or VIP — proving the item-purchase
  engine is generic across reward types, not VIP/coin-only
- **Config chain shown**: `Data/Custom/CustomBuyVipAndCoin.txt` (or
  equivalent) → `Data/Command/DefaultClassType` (class-number mapping) →
  a server `skill.txt` (per-class skill eligibility — admin-only edit) →
  `Item.txt`/`ItemValue` (pricing; item index computed as
  `512 × category + index`)
- **Delivery behavior demonstrated**: an item configured `ItemLevel 1`
  auto-delivers/auto-applies the skill immediately on purchase and deletes
  the consumed item; `ItemLevel 0` on the same item does nothing (a
  deliberately "dead" variant, shown for comparison)
- **Server-side validation (important, confirmed)**: even if a player edits
  their **local** `item.txt`/`skill.txt` client files to try to unlock a
  restricted skill for the wrong class, they cannot actually use it — the
  real permission check runs server-side against the admin's own
  `skill.txt`, never against the client's copy. Concrete anti-cheat
  evidence, not assumed.
- **Reload**: "Reload Custom" then **"Reload Shop"** — again no restart
  mentioned. `LIVE_RELOAD_CONFIRMED` for this config family too.

## Part 2 — comparing the two legacy paths (never merged, kept distinct)

| Question | Flow A — legacy web (DmN CMS) | Flow B — legacy in-game (Buy Vip/Coin) |
|---|---|---|
| Same currency table? | `CashShopData(AccountID,WCoinC,WCoinP,GoblinPoint)` — CONFIRMED (code + SQL introspection) | Almost certainly the same table (same currency names used: WCoinC/WCoinP/GoblinPoint), but **not independently confirmed** — the GameServer engine is closed-source, no way to read its actual SQL. Treat as `INFERRED`, not `CONFIRMED`. |
| Same fields? | WCoinC/WCoinP/GoblinPoint, confirmed | Same names spoken in the videos, unconfirmed at the SQL level |
| Different credit path? | **YES, fundamentally.** Flow A is how real money *enters* the account (a payment gateway confirms payment → PHP updates the currency table). | Flow B never touches real money or a payment gateway — it **spends currency the player already has**, in-game, on VIP/items/skills. It is downstream of Flow A (or of drops/rewards/other credit sources), not an alternative to it. |
| GameServer-native command? | No — pure web/PHP | Yes — `/buyvip`-style chat command (videos 1/2) or NPC item purchase (video 3), both client-triggered, server-executed |
| CustomPix involved? | No | No — CustomPix (native in-game Pix) is a **third**, separate, still-never-configured path (see `LEGACY_SUPPLIER_INDEX.md`); none of these 3 videos mention it |
| VIP table changes? | `DmN_Vip_Users` (web CMS's own VIP table) — confirmed **0 rows, never used** | A **different**, GameServer-side VIP record (shown live in video 1's demo — badge + expiration appear instantly). Very likely `MEMB_INFO` or an equivalent live game-account table, not `DmN_Vip_Users`. Not independently confirmed at the SQL level this phase. |
| Cash balance changes? | Confirmed via code trace (Flow A) | Confirmed via live demo (video 1: balance visibly debited on purchase) |
| Reload/restart required? | N/A (web app, no GameServer reload concept) | `LIVE_RELOAD_CONFIRMED` for both config families touched (`Reload Comand` for the Buy Vip command; `Reload Custom` + `Reload Shop` for CustomBuyVipAndCoin) — no restart needed for either, per direct vendor demonstration |
| Server-side validation? | Confirmed (real PHP-side checks, gateway signature/IPN validation) | Confirmed (video 3's client-tamper-proof skill-eligibility check) |

**Not merged into one flow** — per instruction, and correctly so: these are
genuinely two different mechanisms serving two different moments (getting
Cash in vs. spending Cash in-game), built by the same vendor, using the
same currency names, but with no evidence they're the same code path.

## Part 3 — three-flow integration map

| | LEGACY WEB CASH FLOW (Flow A) | LEGACY IN-GAME BUY VIP/COIN (Flow B) | CURRENT BLOOD MOON |
|---|---|---|---|
| **ENTRY** | `controller.donate.php` checkout pages (paypal/paycall/paymentwall/paygol) | In-game menu button or `/buyvip` chat command; or NPC item purchase (CustomBuyVipAndCoin) | `apps/api` Asaas integration → `RechargeIntent` |
| **VALIDATION** | Gateway IPN/webhook signature validation (`validate_paypal_payment()` etc.) | Client-side price display + server-side "already VIP?" check; server-side skill/class eligibility (video 3) | Asaas webhook signature validation (existing pattern, not re-audited this phase) |
| **DATABASE** | SQL Server (game DB) | SQL Server (game DB), inferred | MySQL (Portal's own DB, Prisma) |
| **TABLE/FIELD** | `CashShopData.WCoinC/WCoinP/GoblinPoint` — CONFIRMED | Same table inferred, not confirmed; VIP grant likely `MEMB_INFO`-family, not confirmed | `AccountCurrency`/`WalletLedgerEntry` (Portal's own wallet — `WCOIN` `CurrencyCode`) |
| **GAME VISIBILITY** | GameServer reads `CashShopData` live at CashShop/X-Shop interaction time — no separate sync | Instant, same-session (it IS the GameServer, by construction) | **NOT IMPLEMENTED** — Portal wallet is isolated from the game DB, see Part 4 |
| **DELIVERY** | Currency only (no item/VIP in the traced DMN flow) | Currency, VIP, or item/skill (CustomBuyVipAndCoin is generic) | Currency only (WC), no game-side delivery yet |
| **CURRENT STATUS** | Built, confirmed, **never used commercially** (0 real transactions) | Built, vendor-demonstrated, **Blood Moon's own usage status not independently verified this phase** (the config files exist per the VPS inventory but whether Blood Moon has real players actively using `/buyvip` was not checked) | **Active for Portal-side WC only**; game-side bridge is the acknowledged, tracked gap |

## Part 4 — current WC → game gap (explicit, not resolved)

```
Asaas (real payment)
  -> RechargeIntent (apps/api, Prisma/MySQL)
  -> Portal WC wallet (AccountCurrency, WalletLedgerService — real,
     audited, idempotent, already in production use)
  -> [GAP -- NOT IMPLEMENTED / NOT ENABLED]
  -> game-visible WC (CashShopData.WCoinC or equivalent)
```

`docs/handoff/mercadopago-recharge-payments.md` (current system, already
documented, not re-derived here) states explicitly that the recharge flow
credits only the Portal's own wallet and "never touches `MU_DATABASE_URL`
nor creates a `GameBridgeJob`" — this isolation is a **deliberate, existing**
decision, not an oversight this phase discovered. This document does not
decide that the fix is "just UPDATE CashShopData" — that is explicitly an
architecture/security decision for a later phase (Part 5 below lists
candidates only).

## Part 5 — game currency delivery options (candidates only, none chosen)

### OPTION A — Direct controlled SQL/game-DB credit from apps/api

- **Evidence**: `CashShopData` is a real, confirmed, live-read table; the
  legacy PHP flow proves the mechanism works in principle (config-driven
  `UPDATE ... SET col = col + :credits`).
- **Advantages**: simplest, most direct; the GameServer already natively
  reads this exact table, so no engine-side change is needed at all.
- **Risks**: requires apps/api to hold a live GameServer/SQL Server
  credential — this directly reopens the boundary `ADR-0023` deliberately
  closed ("apps/api holds no live GameServer credential as a runtime
  dependency"). No audit trail integrated with the Portal's own
  `WalletLedgerService`. Idempotency would need to be built fresh.
- **Idempotency**: not built-in, would need a new mechanism (the legacy PHP
  code's own idempotency was never proven — it was never tested under real
  concurrent load).
- **Rollback**: a compensating `UPDATE`, no existing pattern for it.
- **Game-online behavior**: unknown whether a live player sees the balance
  update instantly or needs to relog/reopen a menu — not tested (no
  non-production GameServer instance exists in this project).
- **Security boundary**: HIGH risk — directly against a standing
  architecture decision.

### OPTION B — GameBridge command/event

- **Evidence**: `GameBridgeJob` infrastructure already exists and is used
  for marketplace `LOCK_ITEM`/`RELEASE_ITEM`; the worker is a deliberate
  always-fail scaffold today (`MU_BRIDGE_ENABLED=false`), no real DB
  connection built yet.
- **Advantages**: consistent with the project's own existing architecture
  direction (`ADR-0002`: GameBridge least privilege + SQL-side append-only
  audit); reuses existing job/retry/audit patterns; keeps any real SQL
  Server credential out of apps/api itself, isolated to a narrower worker
  process.
- **Risks**: the GameBridge worker doesn't exist for real yet — this is new
  scope, same unfinished status as the Marketplace's own GameBridge
  dependency (tracked separately, Phase 17). Adds latency (queue, not
  instant).
- **Idempotency**: `GameBridgeJob`'s existing pattern already covers this.
- **Rollback**: would need a new `REFUND_CURRENCY` job type designed.
- **Game-online behavior**: same open question as Option A, unconfirmed.
- **Security boundary**: best alignment with existing, already-approved
  architecture decisions.

### OPTION C — Native GameServer-supported mechanism (CustomPixSwitch or extending Buy Vip/Coin)

- **Evidence**: `CustomPixSwitch` is a real, vendor-supported, present
  (but never configured) feature; the Buy Vip/Coin system (this document's
  Part 1-2) is also vendor-native but is a *spend*, not a *credit-in*,
  mechanism as currently understood.
- **Advantages**: uses the vendor engine's own intended design, no custom
  bridge code conceptually needed.
- **Risks**: `CustomPixSwitch`'s config still points at an external URL
  (`https://seudominio.com.br/pix.php`) — meaning it is **not actually
  self-contained**; it still expects a custom web endpoint to call into it,
  so it does not obviously reduce Option A/B's own boundary risk, it just
  uses the vendor's expected shape. The endpoint's internal logic is
  closed-source and undocumented. Tying the current Asaas-based provider
  choice to this vendor-specific mechanism is unproven and may not fit at
  all.
- **Idempotency/rollback**: unknown, vendor implementation undocumented
  beyond the config switch.
- **Security boundary**: unknown, likely needs the same care as A/B.

### OPTION D — Adapt the proven legacy DMN mechanism into an isolated service

- **Evidence**: the exact `add_credits()`/`increase_credits()` pattern in
  `LEGACY_SUPPLIER_INDEX.md` is **proven to work at the code level**
  (config-driven, per-currency-type table/column mapping) — even though
  never exercised with real traffic.
- **Advantages**: a proven, understood pattern; already supports per-type
  table/column mapping via config, which could be adapted cleanly; can be
  isolated into a small, narrow-purpose service (better boundary hygiene
  than Option A's "inside apps/api" approach).
- **Risks**: still requires a live GameServer DB credential to exist
  *somewhere* — the same fundamental question `ADR-0023` raised, just
  relocated. The original PHP code has no modern audit/idempotency
  guarantees (Portal-grade rework needed, not a straight port).
- **Idempotency/rollback**: would need re-engineering; the original was
  never tested under real concurrent/failure conditions.
- **Security boundary**: MEDIUM — better isolation than Option A, same
  fundamental question as A/D both ultimately need answered by Bryan.

**No option is selected here.** This is evidence for a future
architecture/security decision, not a recommendation ranking.

## Part 6 — item/currency delivery reference map (Phase 18C Part 22)

```
Portal wallet (AccountCurrency/WalletLedgerEntry)
  - real, audited, idempotent -- production system today
  - currency only, WC -- isolated from the game DB (Part 4's gap)

CashShopData (game DB)
  - real, live-read by GameServer CashShop/X-Shop menus
  - WCoinC/WCoinP/GoblinPoint -- confirmed via Flow A's code trace + SQL introspection
  - written by legacy Flow A (dormant) and (inferred) by legacy Flow B

Marketplace escrow (PlayerMarketListing/PlayerMarketOrder + GameBridgeJob)
  - real, current, P2P item trading -- separate from currency purchase entirely
  - gated behind Phase 17's Marketplace Plan B work (not this phase's scope)

GameBridge (apps/api/scripts/process-game-bridge-jobs.mjs)
  - deliberate always-fail scaffold, MU_BRIDGE_ENABLED=false
  - the ONLY currently-planned live bridge into the game DB, unfinished

XShop/CashShop config (CustomXShop.txt/CashShopProduct.txt)
  - what's FOR SALE in-game, priced in WCoinC/WCoinP/GoblinPoint
  - desired-state layer exists in Portal (ADR-0024), no live sync built

Direct DB mechanisms
  - Flow A's UPDATE CashShopData -- proven pattern, dormant, never live
  - controller.shop.php's UPDATE Warehouse SET Items = 0x... -- item
    delivery via raw binary warehouse write, confirmed present, not traced
    end-to-end this phase (GAP-P18-09, still open)

Native GameServer behavior
  - Buy Vip/Buy Vip And Coin (this document, Part 1) -- in-game
    spend-side mechanism, LIVE_RELOAD_CONFIRMED for its own config family
  - CustomPixSwitch -- present, never configured, separate from all of the above
```

This map exists so a future agent asking "where would a new item/currency
delivery mechanism plug in?" can see every existing piece at once, rather
than rediscovering them one file at a time.
