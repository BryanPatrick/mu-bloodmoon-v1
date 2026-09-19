# Blood Moon Control Plane — domain audit

Date: 2026-09-07. Companion to `docs/architecture/control-plane.md`
(Section 11's domain list). Produced by four independent, parallel,
evidence-based codebase investigations — every classification below
cites real file:line evidence found in the repos, never assumed from
how MU Online servers "typically" work. Where evidence was ambiguous or
absent, that is stated explicitly (`UNKNOWN`) rather than guessed.

**This document classifies, it does not implement.** No model, no
permission, no migration, no admin UI was added to produce it.

## Correction added 2026-09-08

The Progressão/Reset findings below (attributed to `mu-bloodmoon-v1-openbeta`)
were read directly off that worktree's filesystem. A same-day branch
governance audit (`docs/architecture/branch-governance-audit-2026-09-08.md`)
found this worktree carries 143 **untracked** files, including the exact
`ProgressionConfigItem` migrations (`phase_u_progression_config_item`,
`phase_v_progression_policy_status`) this section describes — meaning
this is real code that exists on disk, but **is not committed anywhere**,
at real risk of loss. Treat "exists in openbeta" below as "exists as
uncommitted work in that worktree," not as durable branch history, until
it's actually committed.

## Repos involved, and a cross-repo drift warning

Four repos/worktrees were searched, because this project's real code is
currently split across them and they are **not fully merged into each
other**:

- `D:\MU\mu-bloodmoon-privacy-feedback-release` — the primary/most
  current repo, used as the default unless noted otherwise.
- `D:\MU\mu-bloodmoon-v1-openbeta` — has real, more advanced work the
  primary repo does not: the `WCOIN_TO_BRL_RATE` 1:1 peg guard, the
  entire `ProgressionConfigItem` (Progressão/Reset policy) domain, and
  `MERCADO_PAGO_REFUND_ENABLED`. None of this exists yet in
  `mu-bloodmoon-privacy-feedback-release`.
- `D:\MU\mu-bloodmoon-ops-hardening` (branch `open-beta/ops-hardening`,
  commit `51b4c6f0`, unmerged — see
  [Phase AA pre-deploy review](../operations/phase-aa-pre-deploy-review.md))
  — the entire alerting module and backup-hardening scripts exist only
  here.
- `D:\MU\mu-bloodmoon-launcher-2d-release` / `-phase1` — confirmed to be
  earlier snapshots of the same monorepo as the primary repo, not a
  separate implementation.

**Read the "Repo" column of every table below before assuming something
is live in production** — several domains classified `SHOULD_BECOME_CONTROL_PLANE`
below already have a more mature implementation sitting one repo over
that was simply never merged forward.

## Cross-cutting findings (read before the per-domain detail)

1. **Exactly one GameServer write path is fully wired end-to-end
   project-wide: `CREATE_GAME_ACCOUNT`** (HMAC-signed, one narrow
   command, least-privilege SQL login). Every other GameServer-bound
   "apply" found in this audit — `GRANT_VIP`/`SYNC_VIP_TIER`,
   marketplace's `LOCK_ITEM`/`TRANSFER_ITEM`/`RELEASE_ITEM`,
   progression's `sync()`, the GM automated-event executor — is either a
   deliberate stub that always fails/throws, or an approved plan not yet
   built. `control-plane.md` Section 6's `desired state -> validation ->
   safe apply -> effective state -> audit` model is real in exactly one
   place today. This is the single highest-value fact for prioritizing
   future control-plane work.
2. **No unified feature-flag registry exists anywhere.** At least 13
   flags are fragmented across 5+ dedicated `*.env.ts` files
   (`characters.env.ts`, `game-data.env.ts`,
   `marketplace-bridge-dev.env.ts`, `test-personas.env.ts`,
   `alerting.env.ts`) plus 8+ inline `process.env.X` checks scattered
   directly in service files, several duplicated across multiple call
   sites rather than sharing one accessor. Confirmed zero
   `ControlPlaneSetting`-shaped model exists in either repo's
   `schema.prisma`.
3. **Secret handling is already good practice everywhere checked** —
   this is a real strength worth preserving, not a gap: no domain in
   this audit exposes a credential value via any API response or UI,
   including to Super Admin (Mercado Pago tokens, GameBridge HMAC
   secrets, the diagnostic `/admin/game-data/status` endpoint). New
   control-plane UIs must hold this line, not relax it.
4. **"Effective state" read-back is almost entirely absent.** Most
   domains have none at all. Progression's is a manually-refreshed
   static JSON snapshot file, not a live query. GameBridge's Agent
   heartbeat (`BRIDGE_HEALTHY/STALE/OFFLINE`) is the one real, live
   exception — and it is explicitly scoped to Agent connectivity, never
   conflated with actual game-server state.
5. **Two domains on the requested list are not really distinct
   domains**: "Loja do Launcher" is a thin client over the exact same
   `ShopProduct`/`PurchaseIntent` data and admin surface as "Loja do
   Portal" (only an in-memory cart is Launcher-specific); "Economia" has
   no implementation distinct from VIP/Moedas/Taxas — treating it as a
   separate boundary would fabricate one the codebase doesn't draw.
6. **A real, incident-independent UI/data gap**: `MarketplaceEconomyConfig`'s
   actual tax fields (`wcoinTaxPercent`, `goblinPointTaxPercent`,
   `huntPointTaxPercent`) have a working `PATCH` endpoint, but
   `MarketplaceAdminManager.vue`'s form still only renders inputs for
   two dead/deprecated fields (`saleFeePercent`, `vipDiscountPercent`) —
   the real tax rate can be read via API today but not edited from the
   visible Portal screen.

## Master classification table

| Domain | Classification | Repo |
|---|---|---|
| Loja do Portal | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Loja do Game (CashShop/X-Shop) | `GAMESERVER_ONLY` | GameServer files only |
| Loja do Launcher | `ALREADY_CONTROLLED_BY_PORTAL` (same domain as Loja do Portal) | privacy-feedback-release |
| Catálogo mestre | `SHOULD_BECOME_CONTROL_PLANE` | privacy-feedback-release |
| Moedas (ledger) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Moedas (BRL↔WC rate) | `SHOULD_BECOME_CONTROL_PLANE` | ungoverned in privacy-feedback-release; peg guard exists only in openbeta |
| Taxas (config row) | `ALREADY_CONTROLLED_BY_PORTAL` (edit UI gap — see finding 6) | privacy-feedback-release |
| Taxas (transfer minimum) | `ENV_ONLY` | privacy-feedback-release |
| Marketplace (moderation/economy) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Marketplace (item custody/GameBridge) | `SHOULD_BECOME_CONTROL_PLANE` (worker throws "not connected" today) | privacy-feedback-release |
| Transferências (mechanism) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Transferências (minimum amount) | `ENV_ONLY` | privacy-feedback-release |
| VIP | `SHOULD_BECOME_CONTROL_PLANE` (no admin UI, no real GameBridge delivery) | privacy-feedback-release |
| Economia | `UNKNOWN` — no distinct domain found | — |
| Progressão | `SHOULD_BECOME_CONTROL_PLANE` (real desired-state UI, sync() unconditionally throws) | **openbeta only** |
| Reset (count) | `GAMESERVER_ONLY` | GameServer SQL Server |
| Reset (policy) | `SHOULD_BECOME_CONTROL_PLANE` | **openbeta only** |
| GameBridge | `SHOULD_BECOME_CONTROL_PLANE` (real foundation, unprovisioned production infra, no Portal UI) | privacy-feedback-release |
| Eventos (editorial) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Eventos (GM operational — Portal record) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Eventos (GM operational — game execution) | `SHOULD_BECOME_CONTROL_PLANE` (executor is a deliberate always-fail stub) | privacy-feedback-release |
| Drops | `GAMESERVER_ONLY` | GameServer `Common.dat` |
| Launcher CMS | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Roadmap | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Pagamentos | `ENV_ONLY` | privacy-feedback-release |
| Providers (flags) | `ENV_ONLY` → candidate `SHOULD_BECOME_CONTROL_PLANE` | privacy-feedback-release |
| Providers (credentials) | `SHOULD_REMAIN_SECRET_INFRASTRUCTURE` | privacy-feedback-release |
| Bug Hunters / moderação | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release (+ beta-feedback-rewards, identical) |
| Guild | `ALREADY_CONTROLLED_BY_PORTAL` (parallel system, no GameServer sync) | privacy-feedback-release |
| Community | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Operações (Admin Tasks/Reports) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Operações (provisioning/log-retention) | `SHOULD_BECOME_CONTROL_PLANE` | privacy-feedback-release |
| Alertas | `ENV_ONLY` | **ops-hardening only, unmerged** |
| Backups (mechanism) | `SHOULD_REMAIN_SECRET_INFRASTRUCTURE` | **ops-hardening only, unmerged** |
| Backups (status visibility) | `SHOULD_BECOME_CONTROL_PLANE` (gap — no status view exists at all) | — |
| Manutenção (display flag) | `ALREADY_CONTROLLED_BY_PORTAL` | privacy-feedback-release |
| Manutenção (real kill switch) | `SHOULD_BECOME_CONTROL_PLANE` (does not exist at all) | — |
| Feature flags (general) | `SHOULD_BECOME_CONTROL_PLANE` | privacy-feedback-release |

## Detail: Store & Commerce

### Loja do Portal
`ShopProduct`/`ShopProductVariant`/`StoreCategory`/`PurchaseIntent`/`StoreDelivery`/`RechargePackage`/`RechargeIntent`
(Prisma). Full admin CRUD + workflow in `commerce.service.ts`/
`store-admin.service.ts`, real UI at `StoreAdminManager.vue`
(`/painel/admin/loja`). Recharge-package pricing has a backend CRUD API
(`useCommerceApi.ts:343-345`) with **no page wired to it** — pricing is
whatever `commerce.service.ts:118-127`'s hardcoded seed array set on
first run. Delivery into the game is manual/simulated only
(`store-admin.service.ts:1221`: *"Simulacao nao alterou o servidor de
jogo."*). **`ALREADY_CONTROLLED_BY_PORTAL`.**

### Loja do Game (CashShop / X-Shop)
Confirmed via an explicit zero-reference grep in
`docs/product/phase13/XSHOP_IMPLEMENTATION_NOTE.md:10-12`: the 168-item
X-Shop catalog lives entirely in `CustomXShop.txt` on the GameServer.
`CashShopData(WCoinC, WCoinP, GoblinPoint)` is a separate GameServer SQL
table the Portal's `AccountCurrency`/`WalletLedgerService` never reads
or writes. **`GAMESERVER_ONLY`.**

### Loja do Launcher
Not a separate domain: `docs/launcher/store-cart-terms.md:1-31` confirms
it reuses `ShopProduct`/`StoreCategory`/`PurchaseIntent` and the same
`POST /shop/purchases` endpoint as Loja do Portal, adding only an
in-memory (never persisted) cart and a server-enforced `StorePurchaseTerms`
checkbox. **`ALREADY_CONTROLLED_BY_PORTAL`** (same as #1).

### Catálogo mestre
`docs/catalogs/commerce-item-catalog.md` is generated by
`scripts/generate-commerce-item-catalog.mjs` from a static GameServer
export snapshot, run manually with no schedule. One-way import into
`ShopProduct` via an admin "Importar catálogo" button
(`StoreAdminManager.vue:30` → `store-admin.service.ts:834-949`). No live
source of truth, no resync, no cross-surface unification.
**`SHOULD_BECOME_CONTROL_PLANE`.**

### Moedas
Ledger: `enum CurrencyCode {WCOIN, GOBLIN_POINT, HUNT_POINT}` (hardcoded
— adding a currency needs a migration) + `AccountCurrency` table, sole
writer `WalletLedgerService`. Confirmed disconnected from GameServer's
own `CashShopData` ledger by design (`docs/economy/legacy-dmn-cms-and-currency-investigation.md:36-40`).
Admin view is read-only (`contas.vue:129,484,523-526`).
**`ALREADY_CONTROLLED_BY_PORTAL`** for the ledger. The BRL↔WC exchange
rate itself has **no guard at all in this repo** — `WCOIN_TO_BRL_RATE`/
`assertWcoinPackageInvariant()` exist only in `mu-bloodmoon-v1-openbeta`
and were never ported (`docs/payments/payment-risk-and-chargeback-operations.md:91-93`
documents this exclusion explicitly). **`SHOULD_BECOME_CONTROL_PLANE`**
for the rate.

### Taxas
`MarketplaceEconomyConfig` (singleton row, `schema.prisma:2141-2177`):
`wcoinTaxPercent`/`goblinPointTaxPercent`/`huntPointTaxPercent`, real
`PATCH /admin/marketplace/economy` (`SUPER_ADMIN` only). Read by both
Marketplace and Transferências fee logic. **Gap**: the admin UI form
(`MarketplaceAdminManager.vue:207-224`) never renders inputs for these
three real fields — only for two dead/deprecated ones
(`saleFeePercent`, `vipDiscountPercent`); `marketplace-admin.service.ts:853-858`
documents this itself. **`ALREADY_CONTROLLED_BY_PORTAL`** as data,
editing gap noted. `DIRECT_TRANSFER_MIN_WC`
(`wallet-transfer.service.ts:27`) is a bare `.env` var with a hardcoded
fallback of 20, no DB row, no admin route at all. **`ENV_ONLY`.**

### Marketplace
`PlayerMarketListing`/`PlayerMarketOrder`/`MarketplaceEscrow`/`GameBridgeJob`.
Real moderation/economy admin console (`MarketplaceAdminManager.vue`).
**Item custody has no working GameServer connection**:
`process-game-bridge-jobs.mjs:135` literally throws `'MU bridge worker
is not connected to the game database yet.'` for every real
`LOCK_ITEM`/`TRANSFER_ITEM`/`RELEASE_ITEM` job — confirmed the *only*
fully-wired GameBridge operation project-wide is `CREATE_GAME_ACCOUNT`.
**`ALREADY_CONTROLLED_BY_PORTAL`** for moderation/economy;
**`SHOULD_BECOME_CONTROL_PLANE`** for item custody.

### Transferências
`WalletTransferService.transfer()`, reuses the same
`MarketplaceEconomyConfig.wcoinTaxPercent` row. Entirely Portal-internal
(WC only exists Portal-side) — no GameServer involvement by design.
Player UI only (`transferencias.vue`); no admin edit/reversal surface,
only a moderation hold (`TRANSFER_RESTRICTION`). **`ALREADY_CONTROLLED_BY_PORTAL`**
for the mechanism; **`ENV_ONLY`** for `DIRECT_TRANSFER_MIN_WC` (same env
var as Taxas).

## Detail: VIP, Economy, Payments

### VIP
Real, well-engineered Portal-side model: `VipProductConfig`/
`VipBenefitConfig`/`VipEntitlement`/`VipGrant`, transactional purchase
flow. `upsertBenefitConfig()` hard-clamps XP/drop/chaos-machine bonuses
to zero regardless of admin input — deliberate product decision. **No
admin UI exists at all** (confirmed: no `.vue` page or composable calls
`admin/vip/*` anywhere in `apps/web`) — the real admin endpoints are
backend-only today. Delivery: `UnconfiguredVipGameBridgeGateway` always
returns `delivered:false` — *"there is no real GameServer bridge
connection anywhere in this codebase yet."* Drift-detection endpoint
exists and is honest about this. **`SHOULD_BECOME_CONTROL_PLANE`.**

### Economia
No standalone concept found — no model, service, controller, or admin
page named for it distinct from VIP/Moedas/Taxas/`MarketplaceEconomyConfig`.
**`UNKNOWN — no clear implementation found`**, and treating it as
separate would fabricate a boundary that doesn't exist in the code.

### Progressão
Real implementation exists **only in `mu-bloodmoon-v1-openbeta`**
(migrations `phase_u_progression_config_item`/`phase_v_progression_policy_status`
are absent from the primary repo entirely). `ProgressionConfigItem`
carries `desiredValue`/`effectiveValue`/`driftStatus`/`policyStatus`
per business key (`reset.cap`, `xp.rate`, etc.), across `EXPERIENCE`/
`DROP`/`RESET`/`MASTER_RESET` domains. Real admin UI (`progressao.vue`,
380 lines: filtering, drift/policy visibility, a documented, real
production drop-rate misconfiguration surfaced as read-only evidence).
**"Effective state" is a manually-refreshed static JSON snapshot**
(`progression-effective-state-snapshot.json`), not a live read — the UI
says so to the admin directly (*"PORTAL ONLY — NÃO SINCRONIZADO"*).
`sync()` is gated behind an unset env var AND still unconditionally
throws `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE` even when reached.
**`SHOULD_BECOME_CONTROL_PLANE`** — the control-plane shape (desired/
effective/drift/policy) is real and thoughtfully designed, but it is
one-directional and not merged into the production repo.

### Reset
The displayed reset count in the **primary repo** is demo/fixture data
(`characters.service.ts:90-93`, explicitly gated off in production by
`isDemoCharacterSeedingSafe()`), not live GameServer data. A real,
hand-validated read-only SQL reader for `Character.ResetCount`/
`MasterResetCount` exists in the GameBridge Agent
(`docs/game-data/read-models/account-snapshot.md:59-62`) but is **not
wired into any poll loop** — nothing connects its output to the Portal
DB. **`GAMESERVER_ONLY`** for the actual count. Reset *policy* (cap,
cost, points) lives in openbeta's `ProgressionConfigItem` under domain
`RESET`/`MASTER_RESET` — same `SHOULD_BECOME_CONTROL_PLANE` classification
as Progressão, with a concrete documented drift example (policy says
reset cap 20 for all tiers; GameServer's real Gold-tier value remains
50, explicitly never synced).

### Pagamentos
`REAL_MONEY_PAYMENTS_ENABLED` is a bare `process.env` check on both API
(`commerce.service.ts:818-825`) and web
(`nuxt.config.ts:8`/`NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED`) — no DB
row. No admin UI surfaces or toggles it; an admin cannot tell from the
Portal whether real-money payments are on or off. **`ENV_ONLY`.**

### Providers
Mercado Pago credentials (`MERCADO_PAGO_ACCESS_TOKEN`/`_PUBLIC_KEY`/
`_WEBHOOK_SECRET`) are `.env`-only, no `PaymentProviderConfig` model
exists in either repo. **No test-connection/health-check capability
exists anywhere** (confirmed by search). Credentials are never returned
by any endpoint or referenced by any `.vue` file — not even the public
key, which would ordinarily be safe to expose for client-side checkout.
`MERCADO_PAGO_PROVIDER_POLL_ENABLED`/`_REFUND_ENABLED` (the latter only
in openbeta) are the same bare-flag pattern. **Flags: `ENV_ONLY`**
(candidate `SHOULD_BECOME_CONTROL_PLANE` for a configured/on-off status
view only). **Credentials: `SHOULD_REMAIN_SECRET_INFRASTRUCTURE`** —
already correctly never exposed; keep it that way, don't build a UI
that could regress it.

## Detail: GameBridge, Events, Launcher, Roadmap

### GameBridge
Real, tested Phase 1 foundation (Agent → Cloudflare Worker/D1 → `apps/api`
`GameDataClient`) — `AGENT_FOUNDATION`/`CLOUDFLARE_PLATFORM_FOUNDATION`/
`APPS_API_INTEGRATION_FOUNDATION`/`LOCAL_END_TO_END_PROOF` all `PASS`,
but `REAL_MU_SQL_CONNECTION`/`REAL_CLOUDFLARE_CONNECTION`/
`END_TO_END_REAL_INFRA = NOT_TESTED` — no Cloudflare account provisioned
(placeholder D1 `database_id`), the one real SQL Server connection proof
was a throwaway probe, not a deployed service. **[Annotation 2026-09-19, Phase 20A: stale on infrastructure — the real D1 `database_id` is in `wrangler.toml`, Phase 2D passed end to end on 2026-08-20 and the Agent has run in production since 2026-08-24 (`CREATE_GAME_ACCOUNT` only). The statement that the extension commands are not wired through the Worker remains true of every committed branch; the extension exists only as preserved, undeployed code (`gamebridge/preserve-command-extension`).]** `GAME_WRITES_PERFORMED = 0`
always. The `GRANT_VIP`/`SYNC_VIP_TIER`/anonymize/purge command
extension has real Agent-side C# code but is **not wired through the
Worker or Portal** (Worker's D1 schema still `CHECK (command_type =
'CREATE_GAME_ACCOUNT')`). No `.vue` page consumes the one diagnostic
endpoint that exists (`GET /admin/game-data/status`) — backend-only.
Heartbeat concept (`BRIDGE_HEALTHY/STALE/OFFLINE`) is real and
correctly scoped (never conflated with game-server-live status).
**`SHOULD_BECOME_CONTROL_PLANE`** — foundation genuinely built, real
infra/UI/full command wiring is not. Its credential material
(`AGENT_SECRETS_JSON`, SQL logins, DPAPI files) is
**`SHOULD_REMAIN_SECRET_INFRASTRUCTURE`**, already correctly never
exposed by the existing diagnostic endpoint.

### Eventos
Two genuinely separate systems share this name. **Editorial** (`KnowledgeEntry`
`kind=EVENT`, real admin UI at `conteudo.vue?area=eventos`, feeds the
Launcher news/events list): **`ALREADY_CONTROLLED_BY_PORTAL`**. **GM
operational** (`GmEventDefinition`/`Schedule`/`Run`/`Result`, real admin
UI at `eventos.vue`): the Portal-side record-keeping (definitions,
schedules, manual-run logging) is **`ALREADY_CONTROLLED_BY_PORTAL`**,
but the `AUTOMATED` executor (`GameBridgeEventExecutor`) is a deliberate
stub whose code comment says *"this must never return success:true"* —
actual in-game execution is **`SHOULD_BECOME_CONTROL_PLANE` (not built
at all)**.

### Drops
Confirmed `GAMESERVER_ONLY` with no ambiguity: `ItemDropRate_AL0-3` in
GameServer's own `Common.dat`. Zero Prisma model, zero API surface, zero
admin UI anywhere across all repos checked — confirmed by grep, not
assumed.

### Launcher CMS
Real, fully-built draft/publish/rollback system: `LauncherSlotContent`/
`LauncherContentPublish`/`LauncherSlotContentRevision`/`LauncherAsset`,
real admin UI (`launcher-studio.vue`), serves the WPF/2D Launcher client
via a published-only REST read (`GET /launcher/content`). Real
versioning/rollback audit trail already built. **`ALREADY_CONTROLLED_BY_PORTAL`.**

### Roadmap
Real, fully DB-backed feature — not a planning document. `RoadmapItem`/
`Update`/`Task`/`Relation`, a genuine editorial workflow
(`RoadmapWorkflowStatus`: draft→review→approval→scheduling→publish→archive)
distinct from the public-facing `RoadmapStatus`, real admin UI
(`painel/admin/roadmap.vue`) and public page. Entirely Portal-native, no
external system involved. **`ALREADY_CONTROLLED_BY_PORTAL`.**

## Detail: Community, Ops, Alerting

### Bug Hunters / moderação
`BugReport`/`BugReportEvent` models, full player + admin controllers,
real triage-board admin UI (`bug-hunters.vue`). Reward linkage
(`BetaParticipationRecord`) stays entirely Portal-internal. No
GameServer/GameBridge dependency anywhere. **`ALREADY_CONTROLLED_BY_PORTAL`.**

### Guild
15 real tables (`Guild`, `GuildMember`, `GuildTreasury`, `GuildVault`,
etc.), real admin UI (14 tabs, several explicitly "Em breve"). **Caveat
worth carrying forward**: this is a parallel system with **no sync to
the real in-game guild at all** — `AccountCharacter.guild` (the actual
in-game guild name shown elsewhere) is a separate, legacy free-text
field; `docs/product/guild/README.md:30` states explicitly *"Não há
sincronização com a guild real do jogo nesta fase."* `GuildTreasury`/
`GuildVault` are read-only (no deposit/withdrawal endpoint);
`GuildXpConversionRule` rows exist but nothing executes them.
**`ALREADY_CONTROLLED_BY_PORTAL`** for what it is: the Portal's own
parallel guild system, not a mirror of the real one.

### Community
Extensive, E2E-tested (111/111) feature set — posts, comments,
reactions, achievements, quests, badges, moderation — with a real admin
UI (`CommunityAdminManager.vue`). Entirely Portal-native, no external
system involved. Explicitly excludes Guilds/Events in its own scope
note. **`ALREADY_CONTROLLED_BY_PORTAL`.**

### Operações
Splits honestly into two different pictures. **Admin Tasks/Reports**
(`AdminTask`/`AdminTaskComment`/`AdminTaskEvidence`, real UI at
`/painel/admin/tarefas` and `/relatorios`, CSV/XLSX export with
formula-injection neutralization) is a real control plane already.
**Provisioning reconciliation / log retention** is gated entirely by
env vars (`GAME_PROVISIONING_RECONCILIATION_ENABLED`, etc.) with no UI
to view or change the flags themselves — only a narrow, read-only
downstream-effect view (`GET /admin/game-provisioning`). Log retention
itself is a pure CI-time script, zero Portal UI or DB row.
**`SHOULD_BECOME_CONTROL_PLANE`** overall — exactly the kind of
inconsistency the control-plane pattern exists to converge away from.

### Alertas
Exists **only in `mu-bloodmoon-ops-hardening`**, not merged into the
primary repo. Real, well-designed, fail-closed flags
(`ALERT_SWEEP_ENABLED`/`ALERT_EMAIL_ENABLED`/`ALERT_WEBHOOK_ENABLED`/
`ALERT_MIN_SEVERITY`) — but purely `process.env`-driven, confirmed
called only from inside the alerting services themselves, never from
any controller. **Zero effective-state read-back, not even read-only.**
`alertas.vue` exists but manages a different thing entirely — `SystemAlert`
rows (the alerts themselves), not these config flags. **`ENV_ONLY`.**

### Backups
Exists **only in `mu-bloodmoon-ops-hardening`**. Pure shell/cron
(`cpanel-production-backup.sh` and three sibling scripts), zero Prisma
model, zero Portal UI. The only Portal connection at all: the main
backup script optionally `POST`s failures to `/internal/ops-events` —
confirmed the other three scripts have **zero** Portal connectivity of
any kind. A "Backup" section in `sistema.vue` is a **false positive** —
it's an unrelated local dev-database export tool, not production backup
status. **`SHOULD_REMAIN_SECRET_INFRASTRUCTURE`** for the mechanism
itself (correctly kept off any generic edit surface); flagged
separately as a real **`SHOULD_BECOME_CONTROL_PLANE`** gap for
status-only visibility (last successful run, retention state — never
the credentials/paths), which does not exist today even in read-only
form.

### Manutenção
A real, DB-backed (`SiteSetting`) display flag (`launcher-maintenance`)
exists, editable generically via the same raw key/value `SettingsManager.vue`
used for any setting — not a purpose-built maintenance UI.
**Confirmed no global site/API maintenance gate exists anywhere** (no
503, no login block, no route gate) — the flag only changes a badge/text
shown on the homepage and Launcher bootstrap payload. **`ALREADY_CONTROLLED_BY_PORTAL`**
for the cosmetic label that exists; **`SHOULD_BECOME_CONTROL_PLANE`**
for what "maintenance mode" usually means (an actual kill switch), which
must not be conflated with the cosmetic flag in future work.

### Feature flags (general)
No unified registry exists (see cross-cutting finding #2 — full
inventory of the 5 `.env.ts` files and 8+ inline checks is there, not
repeated here). `control-plane.md` Section 9.1's proposed
`ControlPlaneSetting` model is the intended fix, not yet built anywhere.
**`SHOULD_BECOME_CONTROL_PLANE`.**

## What this audit does not do

No code, schema, or permission changed to produce this document. Every
classification is a snapshot as of 2026-09-07, grounded in real
file:line evidence gathered by four independent investigations — it
will drift out of date as domains change, and should be re-verified
(not assumed current) before being cited as a reason to build or skip
specific future control-plane work.
