---
status: ACTIVE — seven commercial decisions final, control-plane foundation implemented and tested locally
category: decisions
audience: internal (product + engineering)
lastVerified: 2026-09-02
confidence: CONFIRMED (real code, 16 new tests across 2 suites, no production change)
---

# ADR-0023: Store Catalog Decision Closure — Bryan's 7 commercial decisions + Official Store as sole source of truth

**DATE**: 2026-09-02 (Phase S)
**STATUS**: ACTIVE. The 7 commercial decisions are final unless explicitly
reopened. The technical enforcement (legacy-catalog-policy.ts,
LegacyCatalogItem) is implemented, tested locally, and not deployed.

## CONTEXT

Phase R (ADR pending — see `docs/economy/xshop-commercial-review.md` and
`docs/economy/cashshop-commercial-review.md`) audited the full X-Shop
(168 items) and CashShop (12 items) catalogs and produced a
GREEN/YELLOW/RED/UNKNOWN preliminary classification. Phase S is Bryan's
own review of that audit, converting the preliminary classification into
seven final, authoritative commercial decisions, and establishing that
the Portal's own Official Store (`ShopProduct`) — not either legacy
GameServer catalog — is Blood Moon's commercial source of truth.

## THE SEVEN DECISIONS (final, verbatim intent preserved)

| # | Scope | Final classification | Basis |
|---|---|---|---|
| 1 | 153 X-Shop items (69 Weapons + 72 Armor/Sets + 12 Wings) | `LEGACY_CATALOG_NOT_FOR_COMMERCIAL_SALE` | Every resolved item ships `+13` with all 6 excellent options — conflicts with current monetization policy. Preserved, not deleted/weakened; may still serve technical testing, GM/admin use, controlled events, or historical reference — none of which is commercial approval. |
| 2 | 12 X-Shop Pets/Rings/Pendants | `BALANCE_TEST_REQUIRED` | Real in-game power magnitude not empirically validated. `ReqLevel=0` must NOT be read as "low power" — explicitly rejected as an inference. `NOT_FOR_SALE` until tested. |
| 3 | 3 unresolved X-Shop Axes (ItemType=1, Index=9/10/11) | `DEAD_UNRESOLVABLE_CATALOG_ROW` | Fresh `Item.txt` evidence (re-downloaded twice now — Phase R and re-confirmed this phase) proves no matching definition exists. Not sold, not invented. Reopenable only by future binary/engine-source evidence. |
| 4 | 9 CashShop 7-day rentals | `RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST` | The expiration mechanism itself (`CashShopPeriodicItem(ItemSerial, Time)`) is confirmed; full lifecycle safety (inventory/warehouse/trade/personal store/logout-login/character-switch/restart/expiration-while-equipped) is not. Not GREEN-for-sale until that runbook (see `docs/economy/cashshop-rental-empirical-test-runbook.md`) actually runs. |
| 5 | `CoinIndex=508` | `UNKNOWN_NON_BLOCKING` | No further reverse-engineering this phase (Bryan's explicit instruction). Evidence/history preserved (OQ-027). Reopen only if a real CashShop integration ever depends on it. |
| 6 | The dormant 74-table legacy DmN CMS schema | `LEGACY_DORMANT_PRESERVE_ISOLATED` | No delete/reuse/reactivate/migrate/modify. A future dedicated decommission audit may determine safe removal — explicitly NOT this phase's scope. |
| 7 | 3 CashShop event tickets (Blood Castle/Devil Square/Kalima) | `GREEN_CANDIDATE_NOT_APPROVED` | `GREEN_CANDIDATE != APPROVED_FOR_SALE`. Before commercial approval: target event, whether it's active, gameplay acquisition method, drop/access availability, economic impact, consumption behavior, purchase limits, candidate price must all be determined (see the per-ticket analysis below). |

**Historical preservation, per Bryan's explicit instruction**: Phase R's
own preliminary GREEN/YELLOW/RED/UNKNOWN classification and its full
per-item decision tables (`docs/economy/xshop-bryan-decision-table.md`,
`docs/economy/cashshop-bryan-decision-table.md`) are **not edited or
overwritten** by this ADR — they remain exactly as Phase R produced
them, `BRYAN_DECISION = PENDING` on every row, as the historical record
of what was recommended. This ADR and the new
`LegacyCatalogItem` rows are the *decision*, layered on top, not a
replacement of the *recommendation*.

## Event ticket analysis (Part 8/9) — real evidence, not invented

| Field | Blood Castle Ticket | Devil Square Ticket | Kalima Ticket |
|---|---|---|---|
| Technical ID | ItemIndex=6703, BaseIndex=1 | ItemIndex=6702, BaseIndex=2 | ItemIndex=6704, BaseIndex=3 |
| TARGET_EVENT | Blood Castle | Devil Square | Kalima |
| EVENT_ENABLED | `UNKNOWN` — not observed this session (no in-game access; no event-schedule config file was part of this session's read-only RemoteOps scope) | `UNKNOWN` | `UNKNOWN` |
| EVENT_SCHEDULE | `UNKNOWN` — standard MU private-server convention runs these on a fixed timer, but this server's actual configured schedule was not read this phase | `UNKNOWN` | `UNKNOWN` |
| GAMEPLAY_ACQUISITION | `UNKNOWN` — standard MU convention is an NPC-sold or monster-dropped ticket; this server's actual acquisition path was not traced this phase | `UNKNOWN` | `UNKNOWN` |
| NPC/DROP source | `UNKNOWN` — not traced | `UNKNOWN` | `UNKNOWN` |
| CONSUMPTION_MECHANISM | Consumable, `Quantity=10` per purchase (a stack of 10, not 1) | Same | Same |
| CURRENT_CASHSHOP_PRICE | 5 (CoinIndex=508) | 5 | 5 |
| CURRENT_CURRENCY | CashShop points (CoinIndex=508, `UNKNOWN_NON_BLOCKING` display name — Decision 5) | Same | Same |
| PLAYER_POWER_IMPACT | None directly (a ticket, not equipment) — indirect impact depends entirely on what the target event yields, which is `UNKNOWN` this phase | Same caveat | Same caveat |
| SCARCITY_IMPACT | `UNKNOWN` — depends on whether the event is normally ticket-gated at all in this server's current config, not traced | `UNKNOWN` | `UNKNOWN` |
| ABUSE_RISK | `UNKNOWN` — cannot be assessed without knowing the target event's own reward economy | `UNKNOWN` | `UNKNOWN` |

**Commercial recommendation (Part 9 — explicitly NOT `APPROVED_FOR_SALE`)**:
all three tickets are classified **`NEEDS_EVENT_REVIEW`** — not
`SAFE_TO_CONSIDER` and not `NOT_SUITABLE`. The technical/economic facts
needed to make either of those calls (is the event even currently
active, what does it actually reward, could a ticket sale meaningfully
shift its reward economy) were not available to this session and were
not invented. This is a real, honest gap, not a stalling tactic —
closing it requires either GameServer source access this session
doesn't have, or a direct answer from Bryan/a GM about the event's
current operational status.

## PART 2 — Official Store IS the source of truth (confirmed, not built new)

A real architecture audit this phase found `ShopProduct` (the Portal's
existing Official Store product model, live since Phase O) **already
has essentially every field Part 3 asked for** — no new competing
catalog was created:

| Part 3 requirement | Existing `ShopProduct` field |
|---|---|
| Product ID | `id` |
| Display name | `name` |
| Product type | `category` (free text; see Part 4 below) |
| Description | `description`/`summary` |
| Price/currency | `price`/`currency` |
| Delivery type/target | `deliveryTarget` (`StoreDeliveryTarget` enum: ACCOUNT/CHARACTER/INVENTORY/VAULT/MAIL/...) |
| Enabled/published state + commercial approval state | `status` (`ShopProductStatus`: DRAFT/IN_REVIEW/APPROVED/SCHEDULED/ACTIVE/INACTIVE/ARCHIVED/BLOCKED) + `reviewedBy`/`approvedBy`/`publishedBy`/`reviewedAt`/`approvedAt` |
| Availability dates | `saleStartsAt`/`saleEndsAt`/`scheduledPublishAt`/`publishedAt`/`archivedAt` |
| Purchase limits | `accountLimit`/`periodLimit`/`periodDays` |
| Audit metadata | `createdBy`/`updatedBy`/`version` + real `AuditService` records on every transition |

`StoreAdminService#transitionProduct` (real, existing code, re-read in
full this phase) already enforces a fine-grained workflow stronger than
Part 16/17 asked for: `approve` requires `admin.store.review`
specifically (not a blanket store permission), `publish`/`schedule`/
`deactivate` require `admin.store.publish`, self-approval is blocked
("the creator of the product cannot approve their own work" unless
`SUPER_ADMIN`), and — critically — `publish` unconditionally rejects any
product where `ambiguous === true` or `status === 'BLOCKED'`, a flag
that survives a workflow transition (a blocked product walked through
`submit-review → approve` stays `ambiguous: true` and is still rejected
at `publish`). **No schema or permission changes were needed for Part 3
or Part 16** — this is a "reconcile and use," not a "build," conclusion.

## PART 4 — Product type taxonomy: documented convention, not a forced enum

`category` remains a free-text field (per "do not overengineer if
equivalent fields already exist"). Phase R's taxonomy (`COSMETIC`/
`CONVENIENCE`/`CONSUMABLE`/`RENTAL`/`VIP`/`WCOIN_RECHARGE`/
`ACCOUNT_SERVICE`, `docs/store/store-product-taxonomy.md`) is the
recommended **convention** for values written into that field going
forward — not a new database enum. `WEAPON`/`ARMOR`/`WING` are
explicitly NOT business-level product types (per instruction) — they
remain legacy X-Shop *technical* categories, tracked only on
`LegacyCatalogItem.technicalIdentifiers`, never on `ShopProduct.category`.

## PART 6/7 — A real, previously-untested gap found and closed

**The existing `StoreAdminService#importCatalog` bulk-import path had
ZERO e2e test coverage anywhere in this codebase before this phase** —
confirmed by a real search. It reads `docs/catalogs/commerce-item-catalog.json`
(a general, 738-item base-item reference catalog built from `Item.txt`,
**not** the X-Shop's own `CustomXShop.txt` — a materially different
dataset that never carries X-Shop's `+13`/all-excellent configuration
at all) and creates `ShopProduct` rows structurally capped at `DRAFT`/
`BLOCKED` status with `price: 0` — **never** auto-`APPROVED`/`ACTIVE`,
already a real safety property before this phase touched anything.

The real gap: `catalogItemBlocked()`'s pre-existing heuristic (a loose
free-text check on an older `officialStore` commentary column) had no
knowledge of Phase R's rigorous classification and would not have
blocked, say, an imported "Kris" product just because the *legacy
X-Shop's own* `+13`/excellent "Kris" is Decision-1 RED — the imported
row and the X-Shop's configured row are different things entirely.

**Fixed this phase**: `apps/api/src/modules/commerce/legacy-catalog-policy.ts`
encodes the real 153 RED + 12 balance-test X-Shop keys (cross-verified
against `commerce-item-catalog.json`'s own `key` format —
`"{ItemType}-{ItemIndex}"`, confirmed identical this phase via several
spot checks, e.g. `"0-0"` resolves to "Kris" in both sources) and is now
wired into `catalogItemBlocked()`. A real, new e2e suite
(`store-legacy-catalog-import.e2e-spec.ts`) proves: a live import against
the real production catalog JSON blocks exactly the 153+12 decided
X-Shop rows (never `DRAFT`), the 3 dead rows cannot appear at all (no
source data exists for them, confirmed), and — the strongest proof —
walking a blocked RED product through the full `submit-review → approve`
workflow still gets rejected at `publish` because `ambiguous` persists.

## PART C-N — the X-Shop/CashShop admin control plane (new, mid-phase requirement)

Bryan's own mid-phase addition: begin a Portal admin control plane for
X-Shop/CashShop, built as a **desired-state layer only** — no
GameServer write capability, no live sync.

### Real fields investigated (Part A)

`CustomXShop.txt` columns (re-confirmed from the fresh Phase R
re-download, not re-guessed): `Category`, `ItemType`, `ItemIndex`,
`ItemLevel`, `ItemDurability`, `ItemOption1-3`, `ItemNewOption`,
`ItemSetOption`, `ItemHarmony`, `ItemOptionEx`, `ItemSocket1-5`,
`ItemDuration`, `Coin0-2`, `Quantity`. `CashShopProduct.txt` columns:
`BaseIndex`, `MainIndex`, `CoinValue`, `ItemIndex`, `ItemLevel`,
option/set/harmony/socket columns, `ItemQuantity`, `ItemDuration`,
`Comment`. `CashShopPackage.txt` adds `CoinIndex`, `BonusGP`, and the
`ProductBaseIndex*`/`ProductMainIndex*` bundle-reference columns.

| Field | X-Shop supported | CashShop supported | Current source | Runtime reload required | Server restart required | Safe to administer | Notes |
|---|---|---|---|---|---|---|---|
| Enabled/disabled | Not as a per-row boolean field (see Part B below) | Not as a per-row boolean field | Row presence in the config file | `UNKNOWN` | `UNKNOWN` | Not yet — no confirmed reload path | |
| Price | `Coin0`/`Coin1`/`Coin2` (WCoinC/WCoinP/GoblinPoint, CONFIRMED — see `docs/economy/xshop-commercial-review.md`) | `CoinValue` (single value, `CoinIndex=508` selects the currency — `UNKNOWN_NON_BLOCKING`, Decision 5) | Config file | `UNKNOWN` | `UNKNOWN` | Design-ready, not implemented | |
| Currency | Same as price (3 columns) | `CoinIndex` (uniform, Decision 5) | Config file | `UNKNOWN` | `UNKNOWN` | Design-ready, not implemented | |
| Quantity | `Quantity` | `ItemQuantity` | Config file | `UNKNOWN` | `UNKNOWN` | Design-ready, not implemented | |
| Duration | `ItemDuration` (days; 0=permanent, 60=Swords-only rental) | `ItemDuration` (seconds; 0=permanent, 604800=7-day rental) | Config file | `UNKNOWN` | `UNKNOWN` | Design-ready, not implemented | Different units between the two files — a real footgun for any future sync code |
| Item options (excellent/set/harmony/socket) | `ItemNewOption`/`ItemSetOption`/`ItemHarmony`/`ItemSocket1-5` | `ItemNewOption`/`ItemSetOption`/`ItemHarmonyOption`/`ItemSocketOption1-5` | Config file | `UNKNOWN` | `UNKNOWN` | **Not administrable** — this IS the RED/GREEN power distinction itself; a Portal control plane must never let an admin toggle a Decision-1 item's excellent bitmask as a workaround | |
| Category | `Category` (0-13, weapon/armor/wing/accessory type) | Implicit via `BaseIndex` grouping in `CashShopPackage.txt` | Config file | N/A (structural, not a runtime toggle) | N/A | N/A | |
| Buy type / sell type | Not observed as a distinct field in either file — purchase mechanics are presumably native client/server behavior, not data-driven | Same | N/A | `UNKNOWN` | `UNKNOWN` | N/A | |

### Enable/disable mechanism (Part B) — real finding

**Neither file has an explicit "Enabled" boolean column.** The only
observed disable mechanism in this shop-file family is **commenting out
a row with a leading `//`** — directly demonstrated in
`CustomBuyVipAndCoin.txt` (its own two example rows are both
commented out, immediately followed by an `end` marker). `CustomXShop.txt`
additionally carries one unexplained leading bare value (`0`, on the
line between the title comment and the column-header comment) not
present in `CashShopProduct.txt` — its exact semantics (global toggle,
reserved field, version marker) could not be confirmed from file
structure alone and is reported as `UNKNOWN_LIKELY_GLOBAL_TOGGLE_OR_RESERVED`,
not asserted as fact. **Conclusion: row presence/absence (via comment
prefix), not a field, is the real mechanism** — exactly the case Part B
told this phase to expect and document rather than assume otherwise.

### Portal desired-state model (Part C) — implemented

`LegacyCatalogItem` (new Prisma model, migration
`20260902100000_phase_s_legacy_catalog_item`, applied to the local
Claude-only dev database only — never production): one row per real
X-Shop/CashShop catalog row (180 total), carrying `commercialStatus`
(`REVIEW_REQUIRED`/`BLOCKED`/`APPROVED`/`PUBLISHED`/`DISABLED`/`RETIRED`),
`visible`/`purchasable` (kept genuinely distinct per Part I's own
instruction — both default `false`), `priceDesired`/`currencyDesired`/
`durationDesiredDays`, `availableFrom`/`availableUntil`,
`openBetaAllowed`/`fullReleaseAllowed`, `purchaseLimitDesired`,
`internalNotes`/`blockReason`, an optional `linkedShopProductId` (Part 5's
"Official Product → approved delivery definition" mapping, set only
once a real Store product exists to deliver a legacy item — never by any
automatic process), and a `driftStatus`/`effectiveStateSnapshot` pair
reserved for a future comparison feature (see Part E below — not wired
to anything live yet).

Seeded via `LegacyCatalogConfigService#seedAll` (idempotent, upserts on
`@@unique([channel, legacyKey])`) from a generated snapshot
(`legacy-catalog-seed-data.xshop.ts`/`.cashshop.ts`) of the real Phase R
data — 168 X-Shop + 12 CashShop = 180 rows, matching every one of Part
7's five buckets exactly (153/12/3/9/3).

### The one real, hardcoded guardrail (Part J)

Decision 1 (`NOT_FOR_COMMERCIAL_SALE`) and Decision 3
(`DEAD_UNRESOLVABLE_CATALOG_ROW`) items can **never** be set
`purchasable: true` or `commercialStatus: APPROVED/PUBLISHED` through
`LegacyCatalogConfigService#update` — a hard, unconditional
`ForbiddenException`, not a permission an admin can hold to bypass it.
Per Part J's own explicit instruction, **no override mechanism was
built** ("do not create override unless existing RBAC architecture
makes it clearly appropriate" — this phase judged that it does not,
yet). Proven by a real test
(`store-legacy-catalog-config.e2e-spec.ts`, `NO_RED_AUTO_APPROVAL`)
attempting all three unlock paths and confirming each is rejected.

### RBAC (Part N) — three separate keys, none auto-granted to ADM

`admin.store.legacy-catalog.view` / `.edit` / `.sync` — three distinct
permission keys, following this codebase's existing dotted convention
(`admin.store.review`/`admin.store.publish`, the same real precedent
already used for the Official Store's own approve/publish split). None
are added to the baseline `ADMIN` role array (confirmed: `ADMIN`'s
baseline permission list is intentionally short and does not include
even the pre-existing `adminStoreReview`/`adminStorePublish` — every
store permission in this codebase is a per-account grant, never
automatic for the `ADMIN` role. `SUPER_ADMIN` receives all three via its
existing `'*'` wildcard, unchanged). `.sync` is deliberately its own key
— reserved for a real future GameServer sync action (Part F), not
reachable via `.edit` alone, so the eventual sync endpoint has an RBAC
boundary ready rather than reusing `.edit` out of convenience later.

### Sync architecture (Part E/F) — DESIGN_READY, not implemented

```
Super Admin -> Portal desired state (LegacyCatalogItem)
            -> [NOT BUILT] explicit GameBridge command
            -> [NOT BUILT] narrowly scoped GameServer/config mutation
            -> [NOT BUILT] post-validation
            -> [BUILT] audit (AuditService, same pattern as every other admin action)
            -> [NOT BUILT] effective state update
```

Command shapes are conceptually clear (`SET_XSHOP_ITEM_ENABLED`,
`SET_XSHOP_ITEM_PRICE`, `SET_CASHSHOP_ITEM_ENABLED`, etc.) but are
**`NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE`**, not `DESIGN_READY`
enough to build, for two concrete reasons: (1) neither file's real
reload/apply mechanism is confirmed — Part G's own reload-requirement
survey above is `UNKNOWN` for every field, and (2) `apps/api` (the
deployed Portal backend) has never held live GameServer/RemoteOps SSH
credentials as a runtime dependency — that access exists only on this
operator's own local machine (`D:\MU\Tools\RemoteOps`), a deliberate,
existing security boundary (`docs/security/game-write-boundary.md`'s
"GameBridge is the only write path" — RemoteOps was never intended as
an application-runtime credential). Wiring live GameServer file/SQL
mutation into the deployed API is a significant, security-sensitive
architecture decision this phase does not make unilaterally — it is
named here as the real next step, not silently built around.

**`driftStatus`/`effectiveStateSnapshot` exist on the schema now**
(Part D) specifically so a future phase can implement an **on-demand,
operator-triggered** comparison (an admin or agent manually re-runs the
same read-only RemoteOps queries this session already proved out, then
records the result) without a further schema migration — but no code
this phase actually performs that comparison. `driftStatus` defaults to
`NOT_CHECKED` on every row and stays there.

## PART 11/14 — confirmed already correct, real evidence (not assumed)

Two more Phase S questions were answered by directly reading the real,
existing code rather than assuming:

- **Part 11 (WCoin economy, P2P tax non-inheritance)**: `CommerceService#createPurchaseIntent`'s
  wallet debit is explicitly typed `STORE_PURCHASE` with its own inline
  comment — "Buying FROM the platform, not another player -- STORE_PURCHASE,
  never P2P-taxed." Official Store purchases already use the unified
  Portal WCoin ledger and already do NOT inherit the Marketplace/direct-
  transfer P2P sink tax. No change was needed; this was already correct.
- **Part 14 (Player Store UX shows only approved products)**: `CommerceService#listProducts(query,
  publicOnly=true)` (the query the player-facing `/loja` page actually
  uses) filters strictly to `status: 'ACTIVE', deletedAt: null`, plus
  the sale-window (`saleStartsAt`/`saleEndsAt`) check. `DRAFT`/`BLOCKED`/
  `IN_REVIEW`/`APPROVED`-but-not-yet-`ACTIVE` products are structurally
  excluded — confirmed by reading the real query, not assumed. There is
  no code path anywhere connecting raw X-Shop inventory to this listing.

## PART 13 — item delivery safety validation (named, not built)

Before any future item-backed Official Store product becomes
publishable, the delivery architecture should be able to validate: exact
item identity, options, quantity, duration (if rental), target account/
character, delivery destination, and duplicate-delivery protection.
**Not built this phase** (no item product is being published) — the
existing `GameBridgeJob` pipeline already provides duplicate-delivery
protection and idempotency (correlation-ID-keyed, Phase O/P work,
reused unchanged by VIP delivery today) as a real, working precedent;
a genuinely NEW validation surface (item identity/options schema
checking specifically) would only need to be designed once a real
X-Shop/CashShop-sourced item product is actually proposed for
publication — premature to build against a hypothetical product today.

## ALTERNATIVES CONSIDERED

- **Building a second, competing product catalog for the legacy items**:
  rejected — `ShopProduct` already covers Part 3's field list; a
  parallel catalog would violate Part 2's own explicit instruction and
  create two sources of truth for the same concept.
- **Adding `productType` as a new Prisma enum on `ShopProduct`**:
  rejected for now — `category` (free text) already exists and Part 4
  explicitly warns against overengineering; documented as a convention
  instead. Revisit if free-text drift becomes a real operational problem.
- **Wiring `apps/api` to RemoteOps/SSH for a live drift-check or real
  sync this phase**: rejected — would grant the deployed API server a
  new, high-privilege production credential as a runtime dependency,
  a materially bigger decision than "begin designing... where safely
  possible" authorizes unilaterally. Documented as the real blocker
  (Part F) instead of quietly building around it.
- **An override permission for Decision 1/3 items**: rejected per
  Part J's own explicit instruction not to build one unless clearly
  appropriate — judged not yet appropriate.

## CONSEQUENCES

- Bryan's seven Phase R decisions are now durable, enforced, and tested
  — not just documented recommendations.
- A real, previously-untested gap in `importCatalog()`'s safety net is
  closed and proven.
- The Official Store (`ShopProduct`) is confirmed, not just declared, to
  already be a complete source of truth — no new competing model needed
  for its own field requirements.
- A real local foundation for the X-Shop/CashShop admin control plane
  exists (180-row desired-state tracking, RBAC, audit, a real admin UI),
  but the actual GameServer sync remains entirely undone — this is
  explicitly a beginning, not a completion, matching the mid-phase
  instruction's own "begin designing/building where safely possible."
- Three CashShop event tickets and three commercial "green" candidates
  remain genuinely unapproved pending real event-status evidence this
  session could not obtain.

## RELATED SYSTEMS

`apps/api/src/modules/commerce/legacy-catalog-policy.ts` (new),
`apps/api/src/modules/commerce/legacy-catalog-config.service.ts` (new),
`apps/api/src/modules/commerce/legacy-catalog-seed-data.xshop.ts`/
`.cashshop.ts` (new), `apps/api/src/modules/commerce/store-admin.service.ts`
(`catalogItemBlocked`/`legacyPolicyNote` extended),
`apps/api/prisma/schema.prisma` (`LegacyCatalogItem` + 4 new enums),
`apps/api/prisma/migrations/20260902100000_phase_s_legacy_catalog_item/`,
`apps/api/test/store-legacy-catalog-import.e2e-spec.ts` (new),
`apps/api/test/store-legacy-catalog-config.e2e-spec.ts` (new),
`apps/web/pages/painel/admin/catalogo-legado.vue` (new),
`apps/web/composables/useLegacyCatalogApi.ts` (new),
`docs/economy/xshop-commercial-review.md`,
`docs/economy/cashshop-commercial-review.md`,
`docs/economy/xshop-bryan-decision-table.md`,
`docs/economy/cashshop-bryan-decision-table.md`,
`docs/economy/cashshop-rental-empirical-test-runbook.md` (new),
`docs/economy/accessory-balance-test-plan.md` (new),
`docs/store/store-product-taxonomy.md`,
`docs/security/game-write-boundary.md`.
