# Phase manifest: blood-coin-public-name-completion

```
PHASE_ID: blood-coin-public-name-completion
TITLE: Complete the Goblin Point -> Blood Coin public rename
OBJECTIVE: Bryan's Fase AD (2026-09-05) decision renamed the Goblin
  Point currency's PUBLIC brand to "Blood Coin", keeping the technical
  enum GOBLIN_POINT for compatibility. The earlier rename commit
  (2811522d, on open-beta/p0-foundation only) was partial. This phase
  finds and completes every remaining real gap, based on the correct
  canonical branch (payment-risk-release), never on p0-foundation.
SCOPE: every PUBLIC_UI_NAME/PUBLIC_API_LABEL/ADMIN_UI_LABEL occurrence
  of the old display string "Goblin Point" (or a bare "GOBLIN_POINT"
  used AS display text, not as a technical key) on
  open-beta/payment-risk-release's own files.
NON_SCOPE: the technical enum GOBLIN_POINT itself (Prisma CurrencyCode,
  every TypeScript union type, every DB/API key, every test fixture) --
  never renamed, per explicit instruction. Payment Risk/Chargebacks
  (already protected on this same base branch, untouched). VIP/
  GameBridge (Track B2, separate). The pre-existing raw-enum-as-label
  rough edge on WCOIN/HUNT_POINT in marketplace.vue's currency <select>
  and in MarketplaceItemCard/Details.vue's GP/HP abbreviations -- not
  part of the Blood Coin mandate, left as environmental context (see
  KNOWN_DEBT). packages/shared/src/index.ts's own separate, differently-
  cased CurrencyCode type ('WCoin'|'Goblin Point'|'Hunt Point') -- a
  pre-existing type/runtime mismatch unrelated to this rename (the real
  runtime response it types, GET /accounts's currencies record, is
  actually keyed by the snake_case Prisma enum, not this type's own
  space-separated strings -- a separate, pre-existing contract-accuracy
  bug, out of scope here). apps/web/data/implementationRoadmap.ts's 3
  occurrences -- an internal planning/roadmap data file with no live
  route consumer found (only self-referenced from its own README);
  not semantically necessary to touch.
BASE_COMMIT: open-beta/payment-risk-release @ ef43b8b3
DEPENDENCIES: none
FILES (all MODIFIED, 8 files, 11 changes):
  - apps/web/data/management.ts (type + 6 mock-data values; ported the
    explanatory comment already present in openbeta's own further-along
    working tree)
  - apps/web/composables/useCommerceApi.ts (currencyFromApi/currencyToApi
    bidirectional map, both directions)
  - apps/web/composables/useAuth.ts (apiCurrencyLabels map)
  - apps/web/pages/painel/admin/contas.vue (ManagedAccount currencies
    object literal's display key; the technical read
    account.currencies.GOBLIN_POINT is unchanged)
  - apps/web/components/marketplace/MarketplaceFilters.vue (<option> text)
  - apps/web/components/marketplace/OfficialStoreFilters.vue (<option> text)
  - apps/web/pages/painel/marketplace.vue (<option> text -- this
    dropdown shows raw enum text for WCOIN/HUNT_POINT too, pre-existing,
    not fixed here, see NON_SCOPE)
  - apps/web/components/marketplace/MarketplaceItemCard.vue and
    MarketplaceItemDetails.vue (currencyLabel map: GOBLIN_POINT was 'GP'
    (abbreviated), now 'Blood Coin' (full name), matching the WCoin
    entry's own already-full-name treatment in the same map rather than
    inventing a new "BC" abbreviation)
  - apps/api/src/modules/launcher-studio/slot-registry.ts (CMS admin
    field description prose for the store.currencyIcon slot)
TEST_RESULTS:
  - apps/api typecheck (`npx tsc --noEmit -p tsconfig.json`): CLEAN, 0 errors.
  - apps/web typecheck: NOT_RUNNABLE_IN_THIS_ENVIRONMENT -- `nuxi typecheck`
    has no local `vue-tsc` dependency in this project and npx's freshly-
    fetched vue-tsc@3.3.11 fails under this machine's Node 26 with
    `ERR_PACKAGE_PATH_NOT_EXPORTED` (a TypeScript package-exports/Node
    version incompatibility, pre-existing, unrelated to this change).
    Substituted with a full manual trace of every coupled usage of
    `CurrencyCode` (management.ts's own type -> useCommerceApi.ts's
    currencyFromApi/currencyToApi, contas.vue's currencies object
    literal, useManagement.ts's type-only usage) -- all consistent, no
    literal-type mismatch anywhere.
  - Live marketplace/admin rendering: NOT_VERIFIED -- the dev server was
    started and confirmed to be serving this exact worktree ("Login |
    Blood Moon" title, correct app), but every route touched by this
    phase requires an authenticated session (test-persona activation +
    a running apps/api instance), which this verification pass did not
    set up given the scope already covered by the typecheck/manual
    trace above. A real gap: this phase is IMPLEMENTED, not yet
    visually TESTED. See KNOWN_DEBT.
  - No dedicated unit/e2e test exists for any of the 4 currency-label
    maps touched (confirmed: zero matches for the literal string
    "Goblin Point" anywhere in apps/api/test/) -- pre-existing, not
    introduced by this phase.
KNOWN_DEBT:
  - LIVE_RENDERING_NOT_VERIFIED: no authenticated browser check confirmed
    "Blood Coin" actually renders correctly on /painel/marketplace, the
    admin contas page, or the store pages -- the next session with a
    running apps/api + test persona should do this before considering
    this phase fully TESTED.
  - VUE_TSC_ENVIRONMENT_GAP: `nuxi typecheck` cannot run on this machine
    at all (see TEST_RESULTS) -- unrelated to this phase, but blocks any
    future web-side typecheck here until vue-tsc is pinned as a real
    project devDependency or the Node version is changed.
  - NO_LABEL_MAP_UNIT_TEST: none of the 4 currency-label maps touched
    here (useCommerceApi, useAuth, MarketplaceItemCard/Details) has a
    dedicated test pinning its output -- a silent future regression on
    any of them would not be caught automatically.
  - RAW_ENUM_DISPLAY_PRE_EXISTING: marketplace.vue's own currency
    <select> shows raw WCOIN/HUNT_POINT enum text (not "WCoin"/"Hunt
    Point"), unrelated to and predating this phase -- fixing it would be
    a broader currency-display polish task, not a Blood Coin rename.
  - SHARED_TYPE_MISMATCH_PRE_EXISTING: packages/shared/src/index.ts's
    own CurrencyCode type doesn't match the real runtime shape of GET
    /accounts's currencies record (which is keyed by the Prisma enum,
    snake_case) -- a separate, pre-existing contract-accuracy bug,
    flagged but not fixed here.
LAST_UPDATED: 2026-09-08
```

## B1 -- full classification (payment-risk-release's own real state)

A 2026-09-08 audit found 43 real source occurrences of "Goblin Point"/
"GOBLIN_POINT" on `open-beta/payment-risk-release` (excluding generated
`dist/*.d.ts` build output). Classified:

| Classification | Count | Action |
|---|---|---|
| PUBLIC_UI_NAME / PUBLIC_API_LABEL / ADMIN_UI_LABEL (the real gap) | 11 | Fixed, this phase |
| TECHNICAL_ENUM (TS union types, enum keys, validation arrays) | ~22 | Left unchanged, correct as-is |
| TECHNICAL_DATABASE_CODE (seed data, guild resource keys, default balances) | ~6 | Left unchanged, correct as-is |
| LEGACY_HISTORICAL_TEXT / code comment documenting the rename decision itself | 2 | Left unchanged (management.ts's own explanatory comment) |
| INTERNAL_PLANNING_DOC (no live route consumer) | 3 | Left unchanged, not semantically necessary |

**Important correction to an earlier, cruder count**: several other files
audited on `open-beta/p0-foundation`'s or the openbeta working tree's own
state (`docs/manuals/*`, `docs/store/store-channel-boundaries.md`,
`docs/game-vps-sqlserver-transition.md`) mention "Goblin Point" too --
but reading them in full revealed these describe the **GameServer's own,
separate, internal currency** (`CashShopData.GoblinPoint`, a raw SQL
column), explicitly documented in those same manuals as NOT confirmed to
be the same currency as the Portal's public one
(`docs/store/store-channel-boundaries.md`: *"Assuming '1 GameServer
GoblinPoint = 1 Portal Goblin Point' would be an invented equivalence,
not a confirmed fact"*). None of these belong to this phase's scope --
UNRELATED, not LEGACY_HISTORICAL_TEXT as an earlier pass classified them.

## B2 -- public/technical contract, confirmed

```
PUBLIC_NAME = Blood Coin
TECHNICAL_CODE = GOBLIN_POINT (Prisma CurrencyCode enum, unchanged everywhere)
```
Audited and confirmed correctly split (or already-correct, or
intentionally out of scope per NON_SCOPE above) across: packages/shared
(pre-existing, unrelated bug, flagged), management.ts, marketplace,
auth/user payload (useAuth.ts), wallet (wallet-ledger.service.ts,
technical-only, untouched), store (slot-registry.ts CMS description),
admin (contas.vue), player UI (marketplace pages/components), launcher
(StorePage.xaml.cs, technical icon-lookup only, untouched), docs (none
needed -- see the UNRELATED correction above).
