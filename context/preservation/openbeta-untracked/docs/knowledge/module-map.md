---
status: ESTABLISHED
category: knowledge
audience: internal (engineering + product)
lastVerified: 2026-08-31
confidence: CONFIRMED (real code inspection, file:line citations — see the research that produced this: a Phase M background research pass, 2026-08-31)
---

# Blood Moon — module map

23 named functional areas, each mapped to its real code location(s),
dependencies, public interface, permissions, feature flags, and current
implementation status. Built from direct code inspection
(`apps/api/src/modules/`, `apps/web/data/security.ts`,
`apps/launcher/`), not from memory or assumption — every STATUS below is
either `IMPLEMENTED`, `PARTIAL`, `DOCS_ONLY`, or `NOT_IMPLEMENTED`,
matched against what's actually in the repo today.

**Method note**: `apps/api/src/app.module.ts`'s `apiModules` string-array
constant (listing names like `shop`, `recharge`, `tickets`, `references`,
`game-integration`) has zero other references anywhere in the repo — it
is dead/decorative, not a real routing table. The folders it names each
contain only a `*.contract.ts` type file, wired into nothing. Real
implementations for those concerns live inside the other, actually-wired
modules documented below.

A real discrepancy found during this research: four backend permission
keys actively enforced as route guards (`admin.vip.manage`,
`admin.beta-lifecycle.manage`, `admin.game-provisioning.{view,manage}`,
`admin.vip-sync.{view,manage}`) do not appear anywhere in
`apps/web/data/security.ts`, the Portal's own client-side permission
catalog. The backend (`RolesGuard`/`PermissionsGuard`) is authoritative
and this creates no access-control hole, but the Portal's own catalog is
out of sync for these four areas — worth fixing when next touching
`security.ts`.

---

### CORE

**PURPOSE**: Composition root and cross-cutting infrastructure — request
context, error handling, database access, observability.
**STATUS**: IMPLEMENTED (as infra; not extracted as a discrete package)
**DEPENDENCIES**: N/A — the substrate everything else imports
**PUBLIC INTERFACES**: None (no HTTP surface beyond `AppController`)
**DATA OWNERSHIP**: N/A
**CONFIGURATION**: `ConfigModule.forRoot({isGlobal:true})`
**PERMISSIONS**: None
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None directly
**OPTIONAL/REQUIRED**: REQUIRED
**COMMERCIALIZATION POTENTIAL**: Always bundled — not separable
**CODE**: `apps/api/src/app.module.ts`, `apps/api/src/common/`, `apps/api/src/database/`, `apps/api/src/modules/observability/`

### ACCOUNTS

**PURPOSE**: Account identity, admin account management, deletion (both modes — see ADR-0006)
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuditModule, AuthModule, GameAccountIdentityModule
**PUBLIC INTERFACES**: `/admin/accounts/*`, `/account/*`, `/account/deletion/*`, `/admin/accounts/deletion/*`
**DATA OWNERSHIP**: `Account`, `AccountDeletionRecord`, `PurgeBatchRecord` (Portal DB)
**CONFIGURATION**: None blocking
**PERMISSIONS**: `admin.accounts.view`, `admin.accounts.status.manage`, `admin.accounts.purge.manage`, `admin.roles.manage`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: GameBridge (via GameAccountIdentityModule)
**OPTIONAL/REQUIRED**: REQUIRED
**COMMERCIALIZATION POTENTIAL**: High — bundled with Core in ADR-0017's package direction
**CODE**: `apps/api/src/modules/accounts/`
**RELATED ADRs**: 0004, 0005, 0006, 0007

### AUTH

**PURPOSE**: Login/registration, JWT session management, 2FA, RBAC guards, abuse/captcha protection
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuditModule, GameAccountIdentityModule, JwtModule. Exports guards consumed by nearly every other module.
**PUBLIC INTERFACES**: `/auth/*` (login, register, password-recovery, refresh, 2FA setup/verify/disable, step-up)
**DATA OWNERSHIP**: Session/credential state on `Account`
**CONFIGURATION**: `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (required in production, must differ)
**PERMISSIONS**: Gates everything else rather than being permission-gated; mandatory 2FA enforced for any non-PLAYER role
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: Captcha provider
**OPTIONAL/REQUIRED**: REQUIRED
**COMMERCIALIZATION POTENTIAL**: Always bundled with Core — not separable
**CODE**: `apps/api/src/modules/auth/`

### SECURITY

**PURPOSE**: RBAC catalog, security reporting, error/alert observability
**STATUS**: PARTIAL — scattered controls, not a unified module (matches `docs/README.md`'s own rating)
**DEPENDENCIES**: Auth module guards
**PUBLIC INTERFACES**: `/admin/reports` (security filter), `/admin/errors`, `/admin/alerts`
**DATA OWNERSHIP**: `apps/web/data/security.ts` (the permission catalog itself)
**CONFIGURATION**: None
**PERMISSIONS**: `admin.reports.security.view`, `admin.errors.{view,manage}`, `admin.alerts.{view,manage}`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: REQUIRED
**COMMERCIALIZATION POTENTIAL**: Bundled with Core/Auth
**CODE**: `apps/web/data/security.ts`, `apps/api/src/modules/auth/{roles,permissions,step-up,auth-abuse}.guard.ts`, `admin-observability/`, `admin-reports/`

### ADMIN

**PURPOSE**: Admin dashboard, audit log, content moderation, task queue, reporting
**STATUS**: IMPLEMENTED (as a family of modules, not one "Admin" module)
**DEPENDENCIES**: AuthModule (all); AuditModule (most)
**PUBLIC INTERFACES**: `admin/audit/*`, `admin/content/*`, `admin/dashboard/*`, `admin/observability/*`, `admin/reports/*`, `admin/tasks/*`
**DATA OWNERSHIP**: `AuditEvent`, admin task/report state
**CONFIGURATION**: None
**PERMISSIONS**: `admin.dashboard.view`, `admin.audit.*`, `admin.work-logs.*`, `admin.tasks.*`, `admin.reports.*`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: REQUIRED for operating the platform
**COMMERCIALIZATION POTENTIAL**: Bundled with Core
**CODE**: `apps/api/src/modules/{admin-audit,admin-content,admin-dashboard,admin-observability,admin-reports,admin-tasks}/`

### CMS

**PURPOSE**: Generic Portal content (public) + Launcher-specific content authoring
**STATUS**: PARTIAL — two real, distinct implementations, no unified architecture doc
**DEPENDENCIES**: `content` → DatabaseModule only (public, no auth); `admin-content`/`launcher-studio` → DatabaseModule, AuditModule, AuthModule
**PUBLIC INTERFACES**: `/content/entries*` (public), `/admin/content/*`, `/admin/launcher-studio/*`
**DATA OWNERSHIP**: Content entries, launcher CMS slots/assets
**CONFIGURATION**: Asset storage provider (local disk today, R2-ready DI seam — see ADR-0014)
**PERMISSIONS**: `admin.content.manage`, `admin.launcher.content.{read,edit,publish}`, `admin.launcher.assets.manage`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: Future Cloudflare R2 (not yet wired)
**OPTIONAL/REQUIRED**: OPTIONAL (Portal content) / REQUIRED (Launcher CMS, if Launcher ships)
**COMMERCIALIZATION POTENTIAL**: High — a standalone "CMS" package is explicitly named in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/{content,admin-content,launcher-studio}/`
**RELATED ADRs**: 0014, 0017

### LAUNCHER

**PURPOSE**: Desktop client bootstrap/account/rankings API, plus the WPF desktop app itself
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuthModule, GameAccountIdentityModule
**PUBLIC INTERFACES**: `/launcher/{bootstrap,account,me,me/characters,events,rankings}`
**DATA OWNERSHIP**: Reads `AccountCharacter` (Portal MySQL, not live SQL Server) for rankings
**CONFIGURATION**: `LAUNCHER_ASSET_STORAGE_PROVIDER` DI token (client-side)
**PERMISSIONS**: None on read-only endpoints (JWT only where noted); authoring lives in CMS's `admin.launcher.*`
**FEATURE FLAGS**: None for activation
**EXTERNAL INTEGRATIONS**: GameServer (indirectly, via Portal DB mirror)
**OPTIONAL/REQUIRED**: OPTIONAL (a server can run without a Launcher, in principle)
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/launcher/`, `apps/launcher/`, `apps/launcher-updater/`
**RELATED ADRs**: 0014, 0017

### GAMEBRIDGE

**PURPOSE**: The only write path to the real GameServer SQL Server database — VIP grants, account provisioning/anonymize/purge
**STATUS**: IMPLEMENTED (for the 5 real operations: CREATE_GAME_ACCOUNT, GRANT_VIP, SYNC_VIP_TIER, ANONYMIZE_GAME_ACCOUNT, PURGE_GAME_ACCOUNT)
**DEPENDENCIES**: Exports `GameCommandTransportClient`, explicitly designed for reuse by future command types without modification
**PUBLIC INTERFACES**: Not player-facing REST — an outbound HMAC-signed command channel to the .NET Agent; admin wrapper `/admin/vip-sync/*`
**DATA OWNERSHIP**: `bm_GameBridgeAudit` (GameServer SQL Server side, see ADR-0002); command ledger (Portal side)
**CONFIGURATION**: Worker URL, HMAC secrets (env)
**PERMISSIONS**: `admin.game-bridge.manage`, `admin.vip-sync.{view,manage}` (**not in `apps/web/data/security.ts`** — see the discrepancy note above)
**FEATURE FLAGS**: None directly on this module
**EXTERNAL INTEGRATIONS**: Cloudflare Worker/D1, .NET Agent, SQL Server (via the Agent only — never directly)
**OPTIONAL/REQUIRED**: REQUIRED for any VIP/account-lifecycle feature that must reach the real GameServer
**COMMERCIALIZATION POTENTIAL**: High but MU-Online-specific — named standalone in ADR-0017's future bundle list; would need genericizing for non-MU use
**CODE**: `apps/api/src/modules/game-account-identity/`, `apps/game-bridge-agent/` (.NET), `apps/api/src/modules/vip-sync/`, `apps/api/src/modules/game-provisioning-reconciliation/`
**RELATED ADRs**: 0001, 0002, 0017

### GAMESERVER

**PURPOSE**: Read-only game-content export/status bridge to the real SQL Server GameServer database
**STATUS**: PARTIAL
**DEPENDENCIES**: `game-data.module.ts` → AuthModule, exports `GameDataClient`
**PUBLIC INTERFACES**: `/admin/game-data/status`, `/muserver-export/*`, `/admin/game-provisioning*`
**DATA OWNERSHIP**: Static export files (items/skills/monsters/maps/cash-shop) — not a live DB query
**CONFIGURATION**: `GAME_DATA_WORKER_URL`, `GAME_DATA_API_READ_SECRET` — degrades safely to `UNKNOWN` status if unset, never throws
**PERMISSIONS**: `admin.game-data.view`, `admin.game-provisioning.{view,manage}` (**not in `apps/web/data/security.ts`**)
**FEATURE FLAGS**: `isGameDataPlatformConfigured()` gate
**EXTERNAL INTEGRATIONS**: Cloudflare Worker/D1, GameBridge Agent (indirectly)
**OPTIONAL/REQUIRED**: OPTIONAL (degrades gracefully when unconfigured)
**COMMERCIALIZATION POTENTIAL**: MU-Online-specific, low reuse outside this exact game
**CODE**: `apps/api/src/modules/muserver-export/`, `apps/api/src/modules/game-data/`, `apps/api/src/modules/game-provisioning-reconciliation/`, `apps/game-bridge-agent/`, `apps/game-data-worker/`

### PAYMENTS

**PURPOSE**: Real-money recharge purchase flow, Mercado Pago webhook handling
**STATUS**: PARTIAL (stronger since Phase L)
**DEPENDENCIES**: AuditModule, ObservabilityModule
**PUBLIC INTERFACES**: `/payments/webhooks/mercadopago`, `/recharge/intents*`, `/admin/finance/*`, `/admin/recharge/packages`
**DATA OWNERSHIP**: `RechargeIntent`, `PurchaseIntent`, `Payment` (never deleted regardless of account deletion mode — see ADR-0006/0007)
**CONFIGURATION**: `REAL_MONEY_PAYMENTS_ENABLED`, `MERCADO_PAGO_*` (throws in production if enabled without token+webhook secret)
**PERMISSIONS**: `admin.recharge.manage`, `admin.finance.{view,manage,reports.view}`, `recharge.access` (player)
**FEATURE FLAGS**: `REAL_MONEY_PAYMENTS_ENABLED`
**EXTERNAL INTEGRATIONS**: Mercado Pago (real-money source of truth — see `docs/payments/payment-surfaces-comparison.md`)
**OPTIONAL/REQUIRED**: OPTIONAL (a server can run with real-money payments disabled)
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list, though Mercado Pago is Brazil-specific and would need a provider-abstraction for other markets
**CODE**: `apps/api/src/modules/payments/`, `apps/api/src/modules/commerce/`
**RELATED ADRs**: 0003, 0017

### ECONOMY

**PURPOSE**: Marketplace economy configuration (tax rates), cross-currency ledger coordination
**STATUS**: PARTIAL — "WCoinC/WCoinP (native) vs. Portal WCOIN integration undecided," documented as such
**DEPENDENCIES**: WalletModule (exports WalletLedgerService, consumed by commerce/vip/marketplace)
**PUBLIC INTERFACES**: `/admin/marketplace/economy` (PATCH restricted to SUPER_ADMIN)
**DATA OWNERSHIP**: `MarketplaceEconomyConfig`
**CONFIGURATION**: None blocking
**PERMISSIONS**: `admin.marketplace.economy.manage`, `admin.marketplace.view`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: REQUIRED if Market is enabled
**COMMERCIALIZATION POTENTIAL**: Bundled with Market
**CODE**: `apps/api/src/modules/wallet/`, `apps/api/src/modules/marketplace/marketplace-admin.controller.ts`
**RELATED ADRs**: 0008, 0009, 0011

### WCOIN

**PURPOSE**: The Portal-purchasable currency's ledger/tax engine
**STATUS**: IMPLEMENTED (as an internal service, not a player/admin-facing module of its own)
**DEPENDENCIES**: PrismaService only; consumed by commerce/marketplace/store-admin (replaced three previously-duplicated debit/credit implementations)
**PUBLIC INTERFACES**: None — internal ledger API only (`creditCurrency`/`debitCurrency`/`settleTaxedCredit`)
**DATA OWNERSHIP**: `WalletLedgerEntry`, `AccountCurrency.feeAccumulatorSubunits`
**CONFIGURATION**: `SUBUNITS_PER_UNIT = 10_000` (fixed-point precision)
**PERMISSIONS**: N/A — internal service
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: REQUIRED
**COMMERCIALIZATION POTENTIAL**: Bundled with Economy/Market — not independently useful without a currency-consuming feature
**CODE**: `apps/api/src/modules/wallet/wallet-ledger.service.ts`
**RELATED ADRs**: 0008, 0009, 0011

### VIP

**PURPOSE**: VIP tier catalog, purchase, delivery, and GameBridge sync
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuthModule, AuditModule, WalletModule; `vip-sync` → AuthModule, GameAccountIdentityModule
**PUBLIC INTERFACES**: `/vip/catalog`, `/account/vip*`, `/admin/vip/*`, `/admin/vip-sync*`
**DATA OWNERSHIP**: `VipEntitlement`, `VipTier`, `VipSyncState`
**CONFIGURATION**: None blocking
**PERMISSIONS**: `admin.vip.manage`, `admin.vip-sync.{view,manage}`, `admin.game-bridge.manage` (delivery) — **none of the VIP-specific keys are in `apps/web/data/security.ts`**
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: GameBridge
**OPTIONAL/REQUIRED**: OPTIONAL (a server can run without VIP monetization)
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/vip/`, `apps/api/src/modules/vip-sync/`
**RELATED ADRs**: 0001, 0002, 0010, 0017

### MARKET

**PURPOSE**: Player-to-player marketplace (listings, orders, escrow, moderation)
**STATUS**: IMPLEMENTED (no dedicated architecture doc yet)
**DEPENDENCIES**: AuthModule, AuditModule, WalletModule
**PUBLIC INTERFACES**: `/marketplace/*` (player), `/admin/marketplace/*` (admin), plus a dev-only bridge controller
**DATA OWNERSHIP**: Marketplace listings/orders/escrow state
**CONFIGURATION**: `MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED` (gates whether the dev controller is even registered — safe by construction, not just permission-checked)
**PERMISSIONS**: `admin.marketplace.{manage,view,listings.moderate,escrow.operate,transactions.operate,reports.moderate,users.suspend,economy.manage,tasks.manage,reports.view}`, `marketplace.access` (player)
**FEATURE FLAGS**: `MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED`
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/marketplace/`
**RELATED ADRs**: 0009, 0011, 0017

### GUILDS

**PURPOSE**: Guild membership, invites, treasury, vault, projects
**STATUS**: IMPLEMENTED (no dedicated architecture doc)
**DEPENDENCIES**: AuthModule, AuditModule
**PUBLIC INTERFACES**: 30+ player routes (members/invites/join-requests/projects/treasury/vault/emblem/banner), `/admin/guilds/*`
**DATA OWNERSHIP**: Guild membership/treasury state (Portal side; native `Guild`/`GuildMember` on GameServer side, read-only per `docs/legacy/provider-web/module-inventory.md`)
**CONFIGURATION**: Media storage config only
**PERMISSIONS**: `admin.guilds.{view,moderate,levels.manage,xp-rules.manage,reports.view}`, `guilds.access` (player)
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None currently to the GameServer's native Guild tables (read-only awareness only)
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: Moderate — coupled to MU-specific guild concepts
**CODE**: `apps/api/src/modules/guilds/`

### RANKINGS

**PURPOSE**: Character/leaderboard rankings display
**STATUS**: PARTIAL — feature exists inside other modules, no dedicated module or architecture doc
**DEPENDENCIES**: Reads `AccountCharacter` via Prisma/MySQL (not live SQL Server)
**PUBLIC INTERFACES**: `/launcher/rankings?type=`, `/integrations/discord/rankings`
**DATA OWNERSHIP**: Reads Portal-mirrored character data
**CONFIGURATION**: None
**PERMISSIONS**: None (public endpoints)
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: Discord (read API)
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: Low standalone value — typically bundled with Launcher/Community
**CODE**: `apps/api/src/modules/launcher/launcher.service.ts`, `apps/api/src/modules/integrations-discord/`

### COMMUNITY

**PURPOSE**: Social feed, profiles, posts/comments/reactions, quests, achievements, badges
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuthModule, AuditModule, MediaModule
**PUBLIC INTERFACES**: `/community/*` (player), `/admin/community/*` (moderation/achievements/quests/badges/analytics)
**DATA OWNERSHIP**: `CommunityPost` and related social-graph tables
**CONFIGURATION**: Media upload throttling (inherited, 10 req/min)
**PERMISSIONS**: `admin.community.{view,posts.moderate,comments.moderate,reports.moderate,users.moderate,achievements.manage,quests.manage,badges.manage,policy.manage,tasks.manage,analytics.view}`, `community.access` (player)
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/community/`
**RELATED ADRs**: 0017

### WIKI

**PURPOSE**: In-game reference data display (items, equipment, characters)
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: None — the only module with zero `imports` in its `@Module()` declaration
**PUBLIC INTERFACES**: `/wiki/*` — fully public, no guards anywhere in the controller
**DATA OWNERSHIP**: Reads GameServer-exported reference data (via `muserver-export`)
**CONFIGURATION**: None
**PERMISSIONS**: None
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list; genuinely decoupled already (zero dependencies), the cleanest module boundary in the whole system
**CODE**: `apps/api/src/modules/wiki/`
**RELATED ADRs**: 0017

### SUPPORT

**PURPOSE**: Player ticket system, admin moderation queue
**STATUS**: IMPLEMENTED
**DEPENDENCIES**: AuthModule, AuditModule
**PUBLIC INTERFACES**: `/account/tickets`, `/admin/tickets*`, `/admin/moderation`
**DATA OWNERSHIP**: Support ticket state
**CONFIGURATION**: None
**PERMISSIONS**: Player side is JWT-only, no dedicated permission; **admin side reuses `admin.accounts.status.manage`** — there is no dedicated `admin.support.*`/`admin.tickets.*` permission, a real finding worth reconsidering if support ever needs to be delegated independent of account-status management
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/support/`
**RELATED ADRs**: 0017

### SURVEYS

**PURPOSE**: Periodic/exit surveys (future feature)
**STATUS**: DOCS_ONLY / NOT_IMPLEMENTED — schema exists, zero application code references it
**DEPENDENCIES**: N/A
**PUBLIC INTERFACES**: N/A
**DATA OWNERSHIP**: `Survey`/`SurveyQuestion`/`SurveyOption`/`SurveyCampaign`/`SurveyAudience`/`SurveyResponse`/`SurveyAnswer` (Prisma schema only)
**CONFIGURATION**: N/A
**PERMISSIONS**: None
**FEATURE FLAGS**: N/A
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL (not built)
**COMMERCIALIZATION POTENTIAL**: High once built — named standalone in ADR-0017's future bundle list
**CODE**: Schema only, `apps/api/prisma/schema.prisma`
**RELATED DOCS**: `docs/product/survey-foundation.md`

### PRIVACY

**PURPOSE**: Account deletion request flow, data export, (future) player preference management
**STATUS**: PARTIAL — deletion flow implemented; `PlayerPreference` schema exists but zero application code consumes it
**DEPENDENCIES**: AuditModule, AuthModule, GameAccountIdentityModule (via accounts module)
**PUBLIC INTERFACES**: `/account/deletion/{status,request,confirm,cancel,export}`, admin deletion endpoints
**DATA OWNERSHIP**: `AccountDeletionRecord`, `PlayerPreferenceDefinition`/`PlayerPreference` (schema only, unwired)
**CONFIGURATION**: None
**PERMISSIONS**: `admin.accounts.status.manage` (normal), `admin.accounts.purge.manage` (SUPER_ADMIN only, deliberately not delegable by default)
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: REQUIRED (deletion flow, for legal compliance)
**COMMERCIALIZATION POTENTIAL**: High — named standalone in ADR-0017's future bundle list
**CODE**: `apps/api/src/modules/accounts/account-deletion*`, `apps/web/composables/usePrivacyApi.ts`
**RELATED ADRs**: 0006, 0007, 0017

### ANALYTICS

**PURPOSE**: Reporting/analytics across other modules
**STATUS**: NOT_IMPLEMENTED as a standalone module — real analytics endpoints exist but scattered across Marketplace/Community/admin-reports; the project's own docs already list this as a future architectural boundary, not yet extracted
**DEPENDENCIES**: Rides on each host module's own dependencies
**PUBLIC INTERFACES**: `/admin/marketplace/analytics`, `/admin/community/analytics`, `/admin/reports*`
**DATA OWNERSHIP**: None of its own — reads from host modules
**CONFIGURATION**: None
**PERMISSIONS**: `admin.marketplace.reports.view`, `admin.community.analytics.view`, `admin.reports.{view,export}`
**FEATURE FLAGS**: None
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: OPTIONAL
**COMMERCIALIZATION POTENTIAL**: High once extracted as a real module — named standalone in ADR-0017's future bundle list
**CODE**: Scattered — see PUBLIC INTERFACES
**RELATED ADRs**: 0017

### BETA

**PURPOSE**: Open Beta window/registration notice, reward-entitlement claiming, cleanup dry-run
**STATUS**: IMPLEMENTED (for the end-of-cycle flow)
**DEPENDENCIES**: AuditModule, AuthModule
**PUBLIC INTERFACES**: `/beta/registration-notice`, `/account/beta/claim-rewards`, `/admin/beta/cleanup-dry-run`; PRE_BETA_PURGE itself lives in Accounts, not here
**DATA OWNERSHIP**: `BetaRewardEntitlement`; Beta window dates
**CONFIGURATION**: `DEFAULT_OPEN_BETA_START_AT`/`DEFAULT_OPEN_BETA_END_AT`, overridable via env, read server-side only at registration time
**PERMISSIONS**: `admin.beta-lifecycle.manage` (**not in `apps/web/data/security.ts`**), `admin.accounts.purge.manage` (for PRE_BETA_PURGE)
**FEATURE FLAGS**: Beta window start/end are effectively a time-based flag
**EXTERNAL INTEGRATIONS**: None
**OPTIONAL/REQUIRED**: Time-boxed (only relevant during/around the Beta window; the entitlement-claiming mechanism persists beyond it)
**COMMERCIALIZATION POTENTIAL**: Low standalone — this is a launch-lifecycle concept specific to this deployment, not a generally reusable module
**CODE**: `apps/api/src/modules/beta-lifecycle/`
**RELATED ADRs**: 0004, 0005

---

## See also

- [`docs/decisions/0017-modular-component-product-direction.md`](../decisions/0017-modular-component-product-direction.md)
  — the architectural direction this map exists to support.
- [`docs/knowledge/commercial-modularity.md`](commercial-modularity.md) —
  the future package-bundle direction, one level up from this per-module
  detail.
- [`docs/README.md`](../README.md) — the central index; this map is one
  entry in it, not a replacement for it.
