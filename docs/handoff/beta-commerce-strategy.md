# Beta commerce strategy — Loja, Marketplace, Escrow, GameBridge

Etapa 19.7. Technical audit only. **This document does not decide whether any
feature ships enabled or disabled for the first beta** — it gives the
operator the facts needed to choose between:

- **Plan A** — homologate the feature for real before the beta opens, or
- **Plan B** — open the beta with the feature explicitly, honestly disabled,
  in a way that is safe (no broken buttons, no silent money loss, no dead
  writes) and reversible.

Nothing in this etapa homologated payments, delivery, marketplace, escrow or
GameBridge, and nothing here disabled anything in production. One small,
isolated frontend routing bug (identical to one already fixed in Roadmap) was
fixed in Loja as part of confirming the current state — see
[Routing bug](#routing-bug-confirmedfixed).

## Summary table

| Feature                       | Current state   | Read-safe today       | Write-safe today                                               | Safe disable                |
| ----------------------------- | --------------- | --------------------- | -------------------------------------------------------------- | --------------------------- |
| Loja (catalog + purchase)     | PARTIAL         | YES                   | **NO** (no idempotency, manual delivery, no refund automation) | WITH_CHANGES (small)        |
| Marketplace (listing + order) | UNSAFE_FOR_BETA | YES (browsing only)   | **NO** (any player can strand real currency)                   | WITH_CHANGES (small–medium) |
| Escrow                        | UNSAFE_FOR_BETA | n/a (internal ledger) | **NO** (real DB ledger, but nothing ever completes it)         | tied to Marketplace         |
| GameBridge (commerce ops)     | UNSAFE_FOR_BETA | n/a                   | **NO** (worker always no-ops or always throws)                 | tied to Marketplace         |

---

## Loja

### Current state

READY at the presentation/catalog layer, PARTIAL/UNSAFE at the transaction
layer.

- Public routes `/loja` (catalog) and `/loja/:slug` (detail + purchase) call
  the real API (`apps/api/src/modules/commerce`) — no mock data anywhere in
  this flow.
- Backend module is `commerce`, not `store`. Four GET endpoints
  (`shop/products`, `shop/categories`, `shop/products/:slug`,
  `recharge/packages`) are public, unauthenticated by design.
- **Purchase = pure internal-currency debit.** `POST shop/purchases`
  (`commerce.service.ts:435-586`) runs a Serializable transaction that
  decrements stock and does `accountCurrency.updateMany({ balance: {
decrement: totalPrice } })` guarded by `balance >= totalPrice`. There is
  **no payment gateway anywhere in the codebase** — zero Stripe/PagSeguro/
  Mercado Pago/Pix dependency, zero webhook. `PurchaseIntent` is born `PAID`
  immediately.
- **Recharge (`POST recharge/intents`) is the same story**: it only creates a
  `RechargeIntent` row (`PREPARED`); it becomes real balance only once an
  admin (or the legacy `admin/finance/recharges` endpoint) manually flips it
  to `PAID`. Because of this, wallet balances in the portal today are
  effectively **admin-controlled, not tied to a live real-money payment
  path** — new accounts start at `0` in every currency and there is no
  automatic top-up.
- **Delivery is 100% manual.** An admin must call `orderAction: 'deliver'`
  then `deliveryAction: 'process'/'complete'` (`store-admin.service.ts`) to
  fulfill a `StoreDelivery`. No worker, no cron, no GameBridge job is ever
  created by the commerce module (`GameBridgeJob` is exclusively a
  Marketplace concept — confirmed by grep, zero references from `commerce`).
- **No client-side idempotency** on `createPurchaseIntent` — a double-click
  or two open tabs can create two separate `PurchaseIntent`s, each debiting
  balance independently in its own transaction. The transaction itself is
  correct (no overdraft, no lost updates); the risk is a legitimate-looking
  double charge from a UI race, not data corruption.
- Refund exists and is atomic (credits wallet, restores stock, marks
  deliveries refunded) but is **admin-triggered only** — nothing
  auto-refunds a delivery stuck in `WAITING`/`FAILED`.
- An in-process `setInterval` in `StoreAdminService` (`onModuleInit`, runs
  every 60s inside the API process, no external scheduler) auto-publishes
  `SCHEDULED` products whose publish time has passed. Harmless on its own —
  it only ever promotes products an admin already approved and scheduled.
- One dev-only endpoint, `POST admin/store/tests`, is **already safely
  gated**: `if (NODE_ENV === 'production' && ALLOW_STORE_DELIVERY_TESTS !==
'true') throw ForbiddenException(...)` (`store-admin.service.ts:1190`).
  This one does not need further action for beta.
- `apps/web/pages/painel/admin/financeiro.vue` is a **second, older,
  parallel** write path (`admin/finance/purchases|recharges` status PATCH)
  that can also credit/debit currency, separate from the newer Store Admin
  Manager order/delivery workflow. Worth operator awareness, not a beta
  blocker by itself.

### Routing bug (confirmed/fixed)

`apps/web/pages/loja.vue` (flat file) coexisted with
`apps/web/pages/loja/[slug].vue` (nested dynamic route) — the exact same
pattern already found and fixed in Roadmap during Etapa 19.4: Nuxt requires
`<NuxtPage/>` in the flat parent for the nested route to render, which it
didn't have, so **`/loja/:slug` never rendered at all** — every request,
valid slug or not, silently fell back to the listing page with HTTP 200. This
made the entire purchase flow unreachable regardless of payment/delivery
status.

Fixed the same way as Roadmap: moved the listing into
`apps/web/pages/loja/index.vue` (`git mv`, zero content changes). Covered by
a regression test in `apps/web/test/route-error-handling.test.mjs`. This was
small, isolated, and necessary just to evaluate whether Loja functions at
all — it does not touch payment, delivery, or checkout logic.

One secondary, **not fixed**, finding from the same file: `[slug].vue`
fetches the product inside `onMounted()` (client-only), so an invalid slug
never becomes a real SSR 404 — it silently serves an empty detail shell with
HTTP 200. Fixing this would mean restructuring the page's data-fetching
pattern (matching `roadmap/[slug].vue`'s SSR-time fetch), which is a larger,
purchase-flow-adjacent change explicitly out of scope for this etapa.
Documented for whoever picks up either Loja homologation or a future error-
handling pass.

The equivalent bug in `painel/admin/marketplace.vue` +
`painel/admin/marketplace/escrow.vue` was reproduced but **not fixed** — see
[Marketplace routing bug](#marketplace-admin-routing-bug-confirmed-not-fixed).

### Risk if enabled as-is for beta

- **Financial risk is low**, because nothing currently connects a purchase to
  real money — wallets are effectively admin-provisioned. The realistic risk
  is operational/UX: a double-click can create two `PurchaseIntent`s: and any
  delivery not processed promptly by an admin looks broken to the player,
  with no automatic refund.
- If the operator's beta plan includes wiring Pix/a gateway to `RechargeIntent`
  before or during the beta (per `docs/payment-and-escrow-flow.md`, which
  already specs this), the double-charge risk becomes a **real-money** risk
  the moment that gateway goes live, even if Loja itself isn't touched again.

### Risk if disabled

Low, and cheaper to reverse than Marketplace. Confirmed **zero hard backend
dependency**: no other module imports `CommerceService`/`StoreAdminService`.
Two admin surfaces do read-only aggregation over commerce tables
(`admin-reports.service.ts`, `admin-dashboard.service.ts`) — they'd just show
empty/zero figures, not break. Frontend widgets (`Player.vue` dashboard,
`painel/conta.vue` recent purchases) already wrap their commerce calls in
try/catch or `Promise.allSettled` and degrade to empty state.

### Dependencies

- Shares the real `AccountCurrency` wallet table with Marketplace and with
  the header/dashboard balance display — disabling Loja doesn't corrupt that
  table, it just stops new commerce-driven mutations against it.
- No character, community, launcher, or auth code depends on commerce data.

### Safe disable possible: **WITH_CHANGES (small)**

- Backend: add a guard/check on `POST shop/purchases` and `POST
recharge/intents` (the only two player-facing WRITE endpoints that move
  currency) returning `503` with a public `feature_disabled`-style code
  (register it in `SafeExceptionFilter.PUBLIC_ERROR_CODES`, same allowlist
  pattern used for the password-recovery token codes in Etapa 19.3).
- Frontend: catalog (`/loja`, `/loja/:slug`) can safely stay **READ_SAFE** —
  browsing a real catalog with a clearly disabled "Comprar" button
  ("Disponível em breve") does not create a false expectation, since nothing
  about browsing implies a completed purchase. Recharge page would show the
  same disabled state.
- Admin tooling can stay fully live even if public purchase is disabled —
  it's how the operator would manage the catalog in preparation for
  Plan A later, and nothing there is player-reachable.

---

## Marketplace / Escrow / GameBridge

Treated together because they are one pipeline: a listing/order always
produces a `GameBridgeJob`, and that job is the only thing standing between
"real DB ledger" and "real item movement."

### Current state: UNSAFE_FOR_BETA

- **Any authenticated player** — no role/permission check beyond
  `JwtAuthGuard` — can call `POST marketplace/listings` and `POST
marketplace/orders` (`marketplace.controller.ts:35,47`) right now.
- `createOrder` **immediately debits the buyer's real currency balance**
  (`debitCurrency`, `marketplace.service.ts:411`) before any delivery
  confirmation, reserves the listing atomically (real concurrency protection,
  confirmed via a conditional `updateMany` — a genuine positive), creates a
  `PlayerMarketOrder` in `DELIVERING`, and queues a `GameBridgeJob` with
  operation `TRANSFER_ITEM`.
- **The GameBridge worker cannot ever complete that job.**
  `apps/api/scripts/process-game-bridge-jobs.mjs`:
  - `MU_BRIDGE_ENABLED=false` by default in every env template
    (`.env.example`, `deploy/.env.production.example`,
    `deploy/.env.game-vps.example`). When disabled, the worker does not touch
    the job row at all — it logs a dry-run line and returns. **Jobs sit
    `PENDING` forever.**
  - If `MU_BRIDGE_ENABLED=true` without further work, the real integration is
    a comment block followed by a hardcoded
    `throw new Error('MU bridge worker is not connected to the game database
yet.')` (line 135). Every job type always fails; `RELEASE_ITEM` failures
    fire a `CRITICAL` `SystemAlert`.
  - Either way: **an order started today can never reach `COMPLETED` on its
    own.** The buyer's currency is already gone; the seller is never
    credited (`updateOrderStatus` only credits on `COMPLETED`).
- The **only way out** of a stuck listing/order is four admin-only
  "development" endpoints that bypass the state machine and fake a bridge
  confirmation — `activateListing`, `updateListingStatus`,
  `updateOrderStatus`, `updateBridgeJob`
  (`marketplace.controller.ts:79-117`, `marketplace.service.ts:495-731`).
  `activateListing` literally stamps `devApprovedBy: user.username` into the
  job result (`marketplace.service.ts:509`). These are exactly the endpoints
  the project's own architecture docs already say must be removed before
  production (`docs/marketplace-game-bridge.md:101-103`,
  `docs/payment-and-escrow-flow.md:56`), and they are still live.
- The worker itself **is** wired to run continuously in production
  (`deploy/docker-compose.production.yml:68-80`, a `game-bridge-worker`
  service polling every ~10s, `restart: unless-stopped`) — it just runs in
  permanent no-op mode by default. `worker:marketplace-expirations` (expires
  overdue listings) has **no scheduler wired anywhere** — it depends on an
  operator running it manually or configuring one.
- Escrow itself (`MarketplaceEscrow`, `PlayerMarketListing`,
  `PlayerMarketOrder`) is a real, transactional, well-built ledger inside the
  portal's own MySQL — the failure is entirely on the game-integration side,
  not the bookkeeping side.

### Marketplace-admin routing bug (confirmed, not fixed)

Same flat-file/nested-directory pattern as Loja/Roadmap:
`painel/admin/marketplace.vue` (flat) + `painel/admin/marketplace/escrow.vue`
(nested) — the nested escrow page can never render. **Not fixed**, because it
is confirmed dead code: no `NuxtLink` or router call anywhere in the app
targets that nested path. The admin UI reaches the escrow tab through
`?secao=escrow` on the flat page instead, which works today. Fixing an
orphaned, unreferenced page would not change anything about this etapa's
safety evaluation, and Marketplace has much larger structural blockers
regardless — documented here and via a Hub knowledge item for whoever
eventually cleans up admin marketplace routing.

### Risk if enabled as-is for beta

**Severe.** A normal player can, today, pay real (internal) currency for a
listing or an order that **cannot ever complete automatically**, leaving
them stuck in `ESCROW_PENDING`/`DELIVERING` indefinitely with money already
gone. The only recovery path is an admin manually invoking endpoints the
project's own documentation already flags as unsafe for production. This is
a near-guaranteed support/trust incident in the first days of any beta that
gets real traffic to `/marketplace`.

### Risk if disabled

Low. Confirmed **architecturally isolated on the backend** — `grep` for
`MarketplaceService`/`MarketplaceModule` imports outside its own folder
returns nothing; no other backend module depends on it. One soft frontend
dependency: the player dashboard's "Meus anúncios" tile
(`Player.vue:65,71-76`), already wrapped in `Promise.allSettled` so it
degrades to empty rather than breaking the dashboard. Shares the
`AccountCurrency` ledger with Loja (same wallet table, not a functional
coupling). `CommunityPostType.MARKETPLACE` and the generic `AdminTask`
`module: 'marketplace'` tag are cosmetic/display couplings only.

### Dependencies

None hard. One soft dashboard tile. Shared wallet table with Loja (read-only
concern, not a functional blocker either way).

### Safe disable possible: **YES**

This is the cleanest disable of the three features, precisely because it's
already architecturally self-contained and because disabling it removes more
risk than it costs:

- Backend: gate the WRITE endpoints in `marketplace.controller.ts` (listings
  create/delete, orders create) the same way as Loja — `503`/
  `feature_disabled`. The four admin dev-override endpoints should arguably
  be removed/hardened **regardless** of the enable/disable decision, since
  their existence is a standing risk even under an admin-only guard.
- Frontend: browsing (`GET marketplace/listings`) can optionally stay
  **READ_SAFE** — the catalog itself is honest about what's for sale — but
  "Comprar"/"Criar anúncio" become disabled with "Disponível em breve", and
  the player dashboard's "Meus anúncios" tile hides itself rather than
  showing a zero.
- Worker: no change strictly required (already a safe no-op by default);
  operator may choose to stop the `game-bridge-worker` Docker service for
  cleanliness — low risk either way since MU_BRIDGE_ENABLED stays false.

---

## Existing feature-flag mechanism

**None exists today, for any module.** Confirmed independently for both
Loja and Marketplace:

- No `FeatureFlagService`, no `@FeatureFlag()` decorator, no `flags.ts`
  config, no `maintenance mode` flag anywhere in `apps/api` or `apps/web`.
- The only env-var toggles that exist are narrow and unrelated to
  page/route visibility: `ALLOW_STORE_DELIVERY_TESTS` (gates one dev test
  endpoint) and `MU_BRIDGE_ENABLED` (gates the GameBridge worker's real vs.
  dry-run behavior).
- **A reusable generic mechanism already exists and is already wired
  end-to-end, just never connected to commerce**: the `SiteSetting` Prisma
  model (`key`, `category`, `label`, `value: Json`, `isPublic`, `status`) is
  managed via full admin CRUD (`admin-content.service.ts`, audit-logged) and
  already exposed publicly through `GET /content/settings`
  (`content.service.ts:46-51`, filters `isPublic: true, status: 'PUBLISHED'`)
  — which the frontend already consumes via
  `useContentApi().settings()` (`apps/web/composables/useContentApi.ts:15`).

**Recommendation for whoever implements Plan B**: reuse `SiteSetting` rather
than inventing a new mechanism. Create keys such as
`commerce.loja.enabled` / `commerce.marketplace.enabled` (public, boolean
value), read them in the relevant frontend pages via the existing
`useContentApi().settings()` call, and add a small NestJS guard/interceptor
that reads the same `SiteSetting` row server-side before allowing the WRITE
endpoints listed above. The frontend plumbing (fetch + admin CRUD UI) already
exists; only the backend guard and the specific keys are new work.

---

## Navigation / UI entry points

Everything that would need a "Disponível em breve" treatment or hiding if
either feature is disabled:

**Loja**

- `SiteHeader.vue:104` (main nav "Loja" → `/loja`)
- `SiteHeader.vue:129` (account dropdown → `/painel/loja`)
- `SiteFooter.vue:33` ("Loja oficial" → `/loja`)
- `about.vue:62` (footer-style nav list)
- `ManagementShell.vue:166-177` (admin sidebar, 7 sub-links)
- `ManagementShell.vue:236` (admin reports sidebar)
- `ManagementShell.vue:261` (player sidebar → `/painel/loja`)
- `painel/loja.vue` (redirect stub → `/loja`)
- `admin/store.vue` (redirect stub → `/painel/admin/loja`)
- `dashboard/Player.vue`, `painel/conta.vue` (recent-purchases widgets)

**Marketplace**

- `SiteHeader.vue:105` (main nav → `/marketplace`)
- `SiteFooter.vue:33` (→ `/marketplace`)
- `about.vue:63` (nav + body copy)
- `dashboard/Admin.vue:47` ("Revisar marketplace" → `/painel/admin/marketplace`)
- `dashboard/Player.vue:65,71-76` ("Meus anúncios" tile)
- `ManagementShell.vue:181-189` (admin sidebar, 6 query-param tabs on the
  flat page)
- `ManagementShell.vue:214` (operational events filtered by module)
- `ManagementShell.vue:237` (admin reports)
- `ManagementShell.vue:262,266` (player sidebar)
- `middleware/auth.global.ts:9` (route guard entry for
  `/painel/admin/marketplace`)

---

## Endpoint classification (write surface that a disable must cover)

**Loja — must gate (player-reachable, moves currency):**
`POST shop/purchases`, `POST recharge/intents`.
Everything else under `admin/store/*` and `admin/shop/*` is ADMIN_WRITE,
already permission-gated, safe to leave live for operator use regardless of
the public-facing decision.

**Marketplace — must gate (player-reachable, moves currency/creates escrow):**
`POST marketplace/listings`, `DELETE marketplace/listings/:id`,
`POST marketplace/orders`.
`POST marketplace/reports` is WRITE but has no currency/game impact — lower
priority.
`admin/marketplace/listings/:id/status` (PATCH), `.../activate` (POST),
`admin/marketplace/orders/:id/status` (PATCH) and
`admin/game-bridge/jobs/:id` (PATCH) are the four dev-override endpoints —
recommend removing/hardening independent of the enable/disable decision.
Everything else under `admin/marketplace/*` (the dedicated admin controller)
is ADMIN_WRITE/ADMIN_READ, already role+permission gated.

**Workers:** `worker:game-bridge` already safely no-ops
(`MU_BRIDGE_ENABLED=false` default); `worker:marketplace-expirations` has no
scheduler wired at all today — not a beta blocker either way since nothing
currently runs it.

---

## Plan A vs Plan B

### Loja

|               | Plan A — homologate                                                                                                                                                                                                                                                        | Plan B — disable purchase for beta                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What's needed | Choose/implement a real payment path for `RechargeIntent` (Pix per `docs/payment-and-escrow-flow.md`) with signature validation and idempotent webhook handling; add idempotency key to `createPurchaseIntent`; decide on (or explicitly document) the manual-delivery SLA | Add a `SiteSetting`-backed guard on `POST shop/purchases` + `POST recharge/intents` (503/`feature_disabled`); disable the "Comprar"/recharge CTAs with "Disponível em breve"; catalog stays browsable |
| Effort        | **LARGE** (external integration + webhook infra + testing)                                                                                                                                                                                                                 | **SMALL**                                                                                                                                                                                             |

### Marketplace / Escrow / GameBridge

|               | Plan A — homologate                                                                                                                                                                                                                                                                                                                | Plan B — disable for beta                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What's needed | Real SQL Server connection to the MU game DB; implement `LOCK_ITEM`/`RELEASE_ITEM`/`TRANSFER_ITEM`/`DELIVER_ITEM`/`CREDIT_CURRENCY` against real inventory; remove the four dev-override endpoints; idempotency/retry testing; define the in-game escrow area (the project's own 8-step plan in `docs/marketplace-game-bridge.md`) | Add the same `SiteSetting`-backed guard on the 3 write endpoints listed above; disable "Comprar"/"Criar anúncio" CTAs; hide or defang the 4 dev-override endpoints; catalog browsing can optionally stay read-only |
| Effort        | **LARGE** (cross-system integration, needs game-server-side work too)                                                                                                                                                                                                                                                              | **SMALL–MEDIUM** (more endpoints to gate than Loja, but the module's isolation makes it low-risk)                                                                                                                  |

---

## Technical recommendation (not a product decision)

- **Marketplace/Escrow/GameBridge**: on pure risk-vs-effort grounds, Plan B
  is the technically obvious choice for a _first_ beta — every order gets
  permanently stuck with currency already gone, the only recovery path is
  through endpoints the team's own docs already condemn, and the module is
  cheap and safe to disable because nothing else depends on it. Whatever the
  operator decides, the four dev-override endpoints deserve attention before
  any real traffic — either removed (if disabling) or replaced by a real
  worker (if homologating).
- **Loja**: a materially different risk profile from Marketplace — nothing
  currently ties a purchase to real money, and delivery, while manual, has a
  working completion path an admin can execute today. This makes Loja
  plausible to leave enabled for a small, supervised first beta **if** the
  operator commits to timely manual order processing, is aware of the
  double-submit risk, and understands that this stops being true the moment
  a real payment gateway is wired to `RechargeIntent`. If that operational
  commitment isn't realistic, Plan B for Loja is a small, cheap change.
- Either way, the technical work for Plan B is small enough that it does not
  meaningfully compete with Plan A — choosing Plan B for the first beta does
  not throw away any progress toward Plan A later.

---

## Out of scope / explicitly not done in this etapa

- No payment gateway, delivery automation, or GameBridge worker was
  implemented or homologated.
- No production mutation, currency movement, item movement, or escrow
  operation was performed during this audit.
- No feature was actually disabled — this document is the input to that
  decision, not the decision.
- The `painel/admin/marketplace/escrow.vue` routing bug was documented, not
  fixed (confirmed dead code, not worth the churn given Marketplace's larger
  blockers).
- The `[slug].vue` client-only-fetch / non-real-404 issue in Loja was
  documented, not fixed (would require restructuring the page's
  data-fetching pattern, out of scope for a "small, isolated" fix).
