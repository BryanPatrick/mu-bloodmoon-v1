# Phase Y — Production Readiness Inventory & Gap Analysis

Date: 2026-09-04. Scope: entire Blood Moon project, all worktrees. Method:
direct git/migration inspection (this session) + six parallel read-only
code-audit agents, one per domain cluster, each cross-checking existing
docs against actual current code and flagging disagreements rather than
trusting either blindly. Nothing was deployed, pushed, migrated, or
mutated to produce this report.

**Read this together with, not instead of:** `docs/security/secret-incident-history.md`,
`docs/open-risks.md`, `docs/open-questions.md` (all in this worktree,
uncommitted), and `D:\MU\mu-bloodmoon-launcher-2d-release\docs\launcher\final-release-candidate-production-validation.md`
(dated today, confirms Launcher 1.1.2 / manifest 1.0.2 live).

---

## PART 1 — Worktree / Git Map

| Worktree | Branch | HEAD | Clean/Dirty | Known phases | Production relationship |
|---|---|---|---|---|---|
| `D:\MU\mu-bloodmoon-v1` | `main` | `3adfd053` | **Dirty** (5 modified + 1 new file: `apps/api/src/migrate-game-credential-keys.ts`, game-credential rotation tooling) | Baseline trunk, 36 migrations | Closest confirmed proxy for the deployed API/Portal baseline (Phase 2B/2C handoffs reference this lineage) |
| `D:\MU\mu-bloodmoon-launcher-phase1` | `launcher/desktop-phase-1` | `f43c7c99` | Dirty (docs only: `docs/README.md`, `open-risks.md`, `open-questions.md`, `index.json`, manuals — all stale, pre-Phase-2D) | Launcher Phase 1 shell | Confirmed exact commit published to production before Phase 2D (per Phase 2B/2C handoffs) |
| `D:\MU\mu-bloodmoon-v1-openbeta` | `open-beta/p0-foundation` | `e90c29df` | **Very dirty** — 206 status lines (76 modified + ~130 untracked) | P0 through Phase X/Y, spans nearly every domain in this report | NOT deployed as a whole; individual isolated pieces (Launcher only) have been extracted and shipped |
| `D:\MU\mu-bloodmoon-v1-phase11` | `product/economy-phase-11` | `4bd2bc8e` | Clean, committed | Phase 11/12 — pure product research, zero code, docs only | Not deployed (nothing to deploy — it's research); ~5 days stale relative to openbeta's later work, used here only as decision-history context |
| `D:\MU\mu-bloodmoon-v1-phase7` | `knowledge/beta-readiness-phase-7` | `da168903` | Clean, committed | Phase 7-10 — onboarding/FAQ/wiki-draft research, docs only | Not deployed; wiki-draft content it produced is explicitly unpublished (never imported into the real `KnowledgeEntry` table) |
| `D:\MU\mu-bloodmoon-launcher-2d-release` | `launcher/phase-2d-release` | `fe1d750a` | Clean, committed | Launcher Phase 2D + Phase 3 visual + scale isolation | **Deployed** — this exact commit is confirmed live as Launcher 1.1.2 / manifest 1.0.2 |

**Same-repo, same remote** (`github.com/BryanPatrick/mu-bloodmoon-v1.git`) across all six. None of the dirty worktrees have been pushed anywhere.

---

## PART 2 — Dirty `open-beta/p0-foundation` Worktree, Classified by Domain

Read-only classification of the 206 changed/untracked paths (no cleaning, no discarding, nothing committed as part of this phase). By file-count concentration:

| Domain | Approx. file count | Notes |
|---|---|---|
| **COMMERCE** (`apps/api/src/modules/commerce`) | 13 | Payments, chargeback, legacy catalog control plane — largest single cluster |
| **PORTAL ADMIN UI** (`apps/web/pages/painel`) | 10 | Admin panel pages across several domains |
| **ACCOUNTS** (`apps/api/src/modules/accounts`) | 7 | Deletion architecture, lifecycle bridge, pre-beta purge |
| **VIP** (`apps/api/src/modules/vip`) | 6 | Purchase, entitlement, sync |
| **PAYMENTS** (`apps/api/src/modules/payments`) | 4 | Mercado Pago provider adapter, reconciliation |
| **GAMEBRIDGE AGENT** (`apps/game-bridge-agent`) | 6+ | VIP/anonymize/purge command handlers, new writer interface |
| **GAME DATA WORKER** (`apps/game-data-worker`) | 4 | Cloudflare Worker command queue extension |
| **MARKETPLACE** | 2 | |
| **GAME ACCOUNT IDENTITY** | 2 | |
| **LAUNCHER** | ~25 | Superseded — already isolated and shipped via `launcher/phase-2d-release` |
| **DOCS** | ~60 | `docs/economy/`, `docs/gamebridge/`, `docs/knowledge/`, `docs/product/`, `docs/decisions/`, `docs/drop/`, `docs/legacy/`, `docs/gameserver/`, plus central index files (`README.md`, `open-risks.md`, `open-questions.md`, `index.json`, `glossary.md`) — all genuinely new/uncommitted in this worktree |
| **references/game-data/sql-discovery/** | 3 dirs | Read-only GameServer SQL research artifacts (phase-l, gameserver-lab, gamebridge-extension) |
| **AGENTS.md / CLAUDE.md** | 2 | The project's own agent-governance files are themselves untracked/new |

Note: `docs/economy` alone has ~14 untracked files (X-Shop/CashShop decision tables, Bryan decision CSVs, effective-state snapshot, verification script) — this is real, substantial decision-history documentation sitting uncommitted alongside the code.

---

## PART 3 / 6-19, 22-24 — Feature Readiness (full detail below by domain)

Per-domain classification and evidence are given in full under each numbered part below (Parts 6-19, 22-24). Rolled up:

**ALREADY_IN_PRODUCTION**: Portal/API baseline (main, 36 migrations), Community foundation, Guild foundation, Launcher through Phase 2D + Phase 3 visual + Scale/accessibility (1.1.2).

**READY_LOCAL_NOT_DEPLOYED**: Legacy catalog control plane (Store/XShop, Phase S/T), Payment risk/chargeback (Phase P), Account deletion feedback + retention interaction, Progression config visibility (Phase U/V, admin-tool-only).

**PARTIALLY_IN_PRODUCTION**: Payments/commerce core (recharge/refund/reconciliation code-complete and locally tested, but `REAL_MONEY_PAYMENTS_ENABLED` off and Mercado Pago never validated against sandbox), VIP (schema+purchase flow+GameBridge chain all built, all 9 commercial products `enabled:false`), GameBridge command extension (Worker+Agent code exists, never deployed/executed against real infra).

**LOCAL_EXPERIMENT_ONLY**: Progression calculator/simulator (deliberately refuses to guess the XP formula), WC fee-model accumulator (design reference, not wired into apps/api).

**BLOCKED**: GameServer command execution (stored procs reviewed, never run — no SQL Server test environment available), game-credential rotation (blocked on GameBridge Agent heartbeat), commercial catalog publication (zero approved rows by design), VIP commercial launch (Bronze-commercial question unresolved, all products disabled), reset/XP stat-point sync to GameServer (no sync capability exists at all).

---

## PART 4 — Migration Inventory

**36 migrations are on `main`** (confirmed baseline). **16 more exist only on `open-beta/p0-foundation`**: 5 committed there, **11 uncommitted**. None of these 16 have any confirmed-production evidence — treat all 16 as NOT_IN_PRODUCTION.

### Committed-on-openbeta-only (5)
`20260830120000_open_beta_p0_foundation`, `20260830121500_vip_product_config`,
`20260830130000_phase14_vip_delivery_account_deletion`,
`20260830140000_phase15_vip_benefit_fields_and_pricing_seed`,
`20260830150000_phase15_account_deletion_request` — foundational VIP schema
+ pricing seed (all products `enabled:false`) + the first account-deletion
request flow. Real code, real e2e coverage per the domain audits below.

### Uncommitted (11) — classified

| Migration | Domain | Destructive risk | Backfill | Safe deploy order | Recommendation |
|---|---|---|---|---|---|
| `20260830160000_gamebridge_vip_sync_state` | GameBridge/VIP | Low (new table) | No | After the 5 committed VIP migrations | HOLD — pairs with VIP commercial launch decision + GameBridge heartbeat |
| `20260830170000_account_deletion_feedback` | Privacy | Low (new table, no FK to Account by design) | No | Standalone | READY — isolate into a Privacy batch |
| `20260830180000_account_deletion_feedback_retention_interaction` | Privacy | Low | No | After the above | READY — same batch |
| `20260830190000_survey_foundation` | Community/Feedback | Low (new tables, zero service code exists yet) | No | Standalone | LOW PRIORITY — harmless to deploy but currently unused (no module/UI built against it) |
| `20260830191000_player_preferences_foundation` | Player Portal | Low | No | Standalone | HOLD — frontend (`/painel/configuracoes`) currently persists to `localStorage` only, not confirmed wired to this table |
| `20260831120000_vip_sync_drift_observability` | GameBridge/VIP | Low | No | With `gamebridge_vip_sync_state` | HOLD — same reasoning |
| `20260831130000_phase_p_payment_risk_and_chargeback_case` | Payments | Low (new tables) | No | Standalone | READY — real, tested, already wired to `/painel/admin/financeiro`; deploying doesn't turn on real-money payments (separate flag) |
| `20260902100000_phase_s_legacy_catalog_item` | Store/XShop | Low | No | Before phase_t | READY — control plane only, commercial catalog stays empty by design |
| `20260902110000_phase_t_legacy_catalog_effective_state` | Store/XShop | Low (drops 2 placeholder columns, adds real ones — same migration, not a later ALTER) | No | After phase_s | READY — same batch |
| `20260903120000_phase_u_progression_config_item` | Progression | Low | No | Before phase_v | READY — admin visibility tool only, cannot write to GameServer |
| `20260904090000_phase_v_progression_policy_status` | Progression | Low | No | After phase_u | READY — same batch |

No migration in this list drops or destructively alters existing player data. None require a backfill job. **Do not execute any of these** — this phase is read-only.

---

## PART 5 — Production Deployment Map (chronological, known)

1. **Portal/API baseline** — `main` lineage, 36 migrations, includes MySQL baseline, auth, community foundation + 5 follow-ons, store foundation, marketplace admin, guilds foundation + invites, GM role/occurrences/events, 2FA, Mercado Pago recharge schema, game-account-identity/credential, launcher CMS studio.
2. **Launcher Phase 2B** — production recovery, confirmed published (per `docs/handoff/launcher-phase-2b-production-recovery.md`).
3. **Launcher Phase 2C** — security/auth QA, `PARTIAL` per its own handoff.
4. **Launcher Phase 2D** — commit `14277757`, authentication + CAPTCHA + play gating. Confirmed deployed 2026-09-03 (Launcher 1.1.1, manifest 1.0.1).
5. **Launcher Final Release Candidate** — commit `fe1d750a` (Phase 3 visual fidelity + scale/accessibility isolation). Confirmed deployed 2026-09-04 (Launcher **1.1.2**, manifest **1.0.2**), 40/40 smoke pre and post, zero new 5xx.
6. **Payments** — schema exists in production (Mercado Pago recharge migration is on `main`), but `REAL_MONEY_PAYMENTS_ENABLED` is off and no sandbox/live Mercado Pago credential has ever been exercised. **No real money has moved.**
7. **Store/XShop/CashShop** — nothing published; zero commercial catalog rows exist anywhere, production or local.
8. **GameBridge** — Worker/Queue/Agent code exists (mostly uncommitted), but per two independent, dated (2026-09-03/04) production-validation docs: *"nenhuma mudança de GameServer, GameBridge... foi publicada."* Stored procedures reviewed, never executed.
9. **Open Beta specific work** (survey, player preferences, account-deletion feedback, progression config, legacy catalog, payment risk) — all local-only, not deployed.

**Explicit non-assumption**: code existing in a worktree is never treated as "in production" anywhere in this report unless a dated validation doc or a `main`-branch migration confirms it.

---

## PART 6 — Payments / Commerce Audit

| Item | Classification | Evidence |
|---|---|---|
| RechargePackage | TESTED | `schema.prisma:1943-1959`; admin CRUD enforces 1:1 WCOIN↔BRL peg; `recharge-package-admin-guard.e2e-spec.ts` |
| RechargeIntent | TESTED (mocked provider) / EXTERNAL_VALIDATION_PENDING (real provider) | Full state machine, migration `20260811191200_mercadopago_recharge_payments` (on `main`); `recharge-payments.e2e-spec.ts` |
| PurchaseIntent | TESTED | Virtual-currency shop purchases, feeds `StoreDelivery` |
| Mercado Pago integration | EXTERNAL_VALIDATION_PENDING | Real `fetch()` calls to `api.mercadopago.com`, not a stub, but `REAL_MONEY_PAYMENTS_ENABLED` defaults false and `MERCADO_PAGO_*` env vars are blank; code itself labels refund/poll paths `SANDBOX_VALIDATION_REQUIRED` |
| WCoin recharge (end-to-end) | TESTED locally / EXTERNAL_VALIDATION_PENDING for provider | `apps/web/pages/recarga.vue` renders real Pix QR/ticket |
| WCoin provenance/ledger | TESTED | `wallet-ledger.service.ts` — single mutation point, integer-subunit accumulator, every credit linked to its RechargeIntent |
| Direct transfer | TESTED | `wallet-transfer.service.ts` (built Phase Q, 2026-08-31) |
| Transfer fee | TESTED | 10% tax, 20 WC minimum, closed per `docs/open-questions.md` OQ-002 (2026-08-31) |
| Refund — local | TESTED | State→REFUNDED + wallet clawback + audit trail; RBAC-tested |
| Refund — provider | EXTERNAL_VALIDATION_PENDING | Real MP refund call, gated `MERCADO_PAGO_REFUND_ENABLED` (off), contract-tested with mocked fetch only |
| Reconciliation | TESTED locally / EXTERNAL_VALIDATION_PENDING for provider poll | Local DB anomaly detector + provider poll, both gated off by default |
| Chargeback | TESTED | `ChargebackCase` (migration `20260831130000_phase_p_payment_risk_and_chargeback_case`), real trigger mapping from MP status; provider-trigger fidelity never observed live |
| Antifraud / payment-risk | TESTED, one gap | 6/11 risk-signal types wired; `PAYMENT_ACCOUNT_MISMATCH` detector is INCOMPLETE — Mercado Pago's Orders API never returns a payer identifier, tracked as open question OQ-023 |

**Bottom line**: code-complete and locally tested against mocked Mercado Pago responses. Every provider-facing path is `EXTERNAL_VALIDATION_PENDING` — no sandbox/live credential has ever been exercised, master flag is off. Ops gap: several feature flags (`MERCADO_PAGO_REFUND_ENABLED`, `MERCADO_PAGO_PROVIDER_POLL_ENABLED`, `PAYMENT_RECONCILIATION_ENABLED`) have no `.env.example` entries.

---

## PART 7 — VIP Product Decision Status

**TECHNICAL_TIERS**: `VipTier` enum = `BRONZE, SILVER, GOLD`, mapped to GameServer AL1/2/3. Per `docs/decisions/0010-vip-tier-product-naming-abstraction.md`, this naming is explicitly designed to be swappable from the game-server detail.

**COMMERCIAL_TIERS**: 9 tier×duration rows seeded with real prices, **every row `enabled:false`**. Public catalog returns empty for all three tiers today, Bronze included — nothing is purchasable until an admin explicitly flips a product on.

**CURRENT_PRICING** (WCOIN, 1 WC = R$1 peg):

| Tier | 7d | 15d | 30d |
|---|---|---|---|
| BRONZE | 6 WC | 11 WC | 20 WC |
| SILVER | 9 WC | 17 WC | 30 WC |
| GOLD | 12 WC | 23 WC | 40 WC |

**CURRENT_UI**: `/painel/vip` renders all three tiers unconditionally, WC-only pricing, no BRL anywhere in that file, Bronze not singled out or hidden.

**CURRENT_PURCHASE_FLOW**: WC debit only. No BRL/Mercado Pago call inside the VIP module — a player recharges WC first (via commerce), then spends WC on VIP. Matches phase11's own recommended "Option C."

**GAME_ENTITLEMENT**: real chain exists — purchase queues `GameBridgeJob(GRANT_VIP)`; a continuous `SYNC_VIP_TIER` reconciler also exists. Both handlers are in the GameBridge Agent's latest **committed** commit. Whether either is actually switched on in any deployed environment is `UNKNOWN` from files alone — `docs/vip/wz-setaccountlevel-coexistence.md` states plainly: *"GRANT_VIP has no real, wired production caller anywhere in the Portal today."*

**BRONZE_DEPENDENCY_AUDIT** (report only, no decision made):

| Dependency | File | Effect if Bronze removed commercially |
|---|---|---|
| Enum value | `schema.prisma:2619` | Needs migration + backfill of existing rows |
| Seeded prices | migration `20260830140000` | Rows can just stay `enabled:false`, or be deleted |
| Hardcoded tier list | `vip.service.ts:289` | Breaks/needs edit if tier dropped |
| UI tiers array | `vip.vue:84` | Bronze section stops rendering — trivial |
| AL-tier map | `vip-sync.service.ts:28` | AL1 becomes orphaned unless remapped |
| Test names | `vip-purchase-matrix.e2e-spec.ts` | Need rewrite |

Since every VIP product is currently disabled, removing Bronze commercially today touches mostly enum/UI/test surface, not live purchase data. **Not a product decision this report makes** — reported for Bryan's own call.

**Unresolved, explicitly reported, not decided here**: whether VIP purchase should be WC-only (current reality), direct-BRL, or both.

---

## PART 8 — Currency Naming Audit

Two separate currency domains exist and are **not reconciled**: GameServer's `CashShopData.WCoinC/WCoinP/GoblinPoint` (legacy `Coin0/1/2`) is a different ledger from Portal's `AccountCurrency.currency` enum (`WCOIN/GOBLIN_POINT/HUNT_POINT`). No exchange/integration path exists between them.

| Technical name | Current display name | Conflict | Decision required |
|---|---|---|---|
| `Coin0` / GameServer `WCoinC` | "WCoin" (Portal) — different ledger, same name | **Yes** — name collision between two proven-separate balances | Yes |
| `Coin1` / GameServer `WCoinP` | None — no Portal currency maps to it | **Yes** — real currency, zero Portal display | Yes |
| `Coin2` / GameServer `GoblinPoint` | "Goblin Point" (Portal `GOBLIN_POINT`) — same string, unconfirmed same currency | **Yes** | Yes |
| Portal `HUNT_POINT` | "Hunt Point" — consistent everywhere | No naming conflict, but no GameServer analog — Portal-native, invented independently | No naming decision, but flag it has nothing to reconcile against |
| "BloodCoin" | — | **Zero hits anywhere** in code or docs across all worktrees checked | If this rename is a real decision, it has not been started or recorded anywhere findable |
| bare "WP" | — | **Zero hits.** Established abbreviation is "WC" | Adopting "WP" later would visually collide with GameServer's `WCoinP` |
| Web vs Launcher display | Web translates to friendly labels; **Launcher binds the raw wire enum directly** (`["WCOIN","GOBLIN_POINT","HUNT_POINT"]` shown as-is) | **Yes — real cross-client conflict**, players would see "WCOIN" on desktop vs "WCoin" on web | Yes — needs a display-name map on the Launcher store page |

**Bottom line**: "BloodCoin," "HuntPoint"-as-GameServer-term, and "WP" are not present in current code at all. The real, verifiable naming problems today are (a) GameServer-vs-Portal name collisions with no reconciliation path, and (b) Launcher's untranslated raw-enum display.

---

## PART 9 — Store / XShop / CashShop

Real, evidenced, cross-checked against phase11's historical findings — **every one still holds**:

| Historical finding | Status |
|---|---|
| 153 legacy RED X-Shop items must not become commercial automatically | CONFIRMED_STILL_TRUE — hardcoded, override-proof block in two independent code paths, test-asserted in 3 suites |
| 12 accessories were review/balance-test | CONFIRMED_STILL_TRUE, refined: initial status loosened from BLOCKED to REVIEW_REQUIRED (not a reversal of the hold) |
| 3 dead Axes unresolved | CONFIRMED_STILL_TRUE — permanently blocked, still searchable |
| 9 rentals require empirical validation | CONFIRMED_STILL_TRUE (phase11's own doc self-contradicted at "8," corrected to 9 during Phase R) |
| 3 event tickets candidate only | CONFIRMED_STILL_TRUE — `NEEDS_EVENT_REVIEW` per ADR-0023 |
| Runtime sync guarded/off | CONFIRMED_STILL_TRUE, now with real enforced code (was doc-only before) — permission gate + env-flag gate (never set `true` anywhere) + a hard `NOT_IMPLEMENTED` even if both pass |

**Two parallel, not-yet-linked systems**: the older Official Store (`ShopProduct`) and the new Phase S/T `LegacyCatalogItem` control plane. Schema has a link column (`linkedShopProductId`) but **no code anywhere ever sets it**.

- **CONTROL_PLANE_READY**: YES — real, permission-gated, audited CRUD, working admin UI (`/painel/admin/catalogo-legado`), 25/25 e2e tests across 3 suites (per test-evidence-index, not independently re-run this pass).
- **COMMERCIAL_CATALOG_READY**: NO — zero rows are `PUBLISHED`. By design.
- **RUNTIME_SYNC_READY**: NO — `sync()` is a guard with no implementation behind it; apps/api holds no GameServer write credentials by architecture.

---

## PART 10 — Progression / Balance (classification only — the XP formula itself remains intentionally unsolved)

`ProgressionConfigItem` control plane (migrations `phase_u`/`phase_v`, both uncommitted) is real and wired, 6 e2e spec files, RBAC-gated.

| Piece | Classification | Why |
|---|---|---|
| Control plane (list/summary/update/history/seed) | ADMIN_TOOL_ONLY | `sync()` throws for three independent reasons (permission, env kill-switch off, `NOT_IMPLEMENTED` even if both pass) — cannot reach GameServer |
| Calculator (`progression-calculator.ts`) | EXPERIMENTAL | Deliberately refuses to compute a combined XP multiplier or derive XP-from-formula — hard-refusal stubs, never guesses |
| Simulator (`progression-simulator.ts`) | EXPERIMENTAL | Same discipline |
| Seed data (25 rows mapped to real `.dat` keys) | ADMIN_TOOL_ONLY | Backing data for the above |
| Reset/XP sync to GameServer | BLOCKED_GAMESERVER_KNOWLEDGE | `RELOAD_REQUIRED`/`RESTART_REQUIRED` are UNKNOWN for every field; no push path exists at all |

**"BASE SERVER XP = 50x"**: confirmed today (Phase X) as approved **product terminology**, separate from the still-unresolved technical stacking formula. Config values (`xp.rate` AL0:50/AL1-3:60, `xp.master_rate` AL0:20/AL1-3:22) match phase11's independent live-config pull exactly — no drift. The code's own refusal to fabricate a combined multiplier is intentional discipline, not a gap to close in this phase.

---

## PART 11 — Reset Product Decision — **correction to the task's own framing**

The premise in this task's own instructions ("500 had been agreed generally, only Free reduction remained undecided") **does not match what the code and docs actually show**, and per this report's own "report the conflict, don't silently choose a side" rule, the discrepancy is flagged rather than resolved either way:

- **Effective value** (current GameServer-matching value): `{Free: 450, Bronze/Silver/Gold: 500}` — asymmetric, VIP gets more.
- **Desired value** (Bryan's DECISAO 2, dated **today**, Phase X, in `progression-config-seed-data.ts`): **`{all four tiers: 450}`** — explicit rationale in the seed data: *"VIP must NOT produce permanent end-state power unavailable to F2P."* The same field states if the number is later raised, it must go to 500 **for all tiers**, never differentiated by VIP.
- `policyStatus`: `POLICY_DRIFT` — **nothing has been synced**. The live game still grants 450/500/500/500 today, unchanged.
- Same pattern for reset cap: effective `{20,20,20,50}` (Gold is 2.5x), desired = `20` uniformly (DECISAO 1, Phase V).
- Independently verified against a real GameServer config pull (phase11, 2026-08-29): exact numeric match — no disagreement on the *current live* numbers, only on what the task assumed was already "agreed."

**Reported, not decided here**: a real decision exists on record (450-for-all, cap-20-for-all, dated today, attributed to Bryan) but it is **Portal-side only** with zero GameServer sync capability. "Decided" and "live" are two different states right now.

---

## PART 12 — GameBridge

Architecture: `apps/api` → HMAC-signed HTTPS → Cloudflare Worker (`apps/game-data-worker`, D1-backed) → Cloudflare Queue → Agent (`apps/game-bridge-agent`, .NET 8) → SQL Server stored procedures.

| Component | Status |
|---|---|
| WORKER | Found, implemented, locally tested (Vitest against real local D1). Command types `CREATE_GAME_ACCOUNT/GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT` all present, D1-enforced. Never deployed to production. |
| QUEUE | Cloudflare Queue, carries only a command-ID GUID (payload in D1) — designed against queue-poisoning. |
| AGENT | `.NET`, uncommitted, four new command handlers per the extension plan; kill-switch literal names not directly found in this pass (flag as unverified wiring, not disproven). |
| HEARTBEAT | Real mechanism (`agent_heartbeats` D1 table, status derived HEALTHY/STALE/OFFLINE at read time). **Two independent, dated (today) production-validation docs explicitly list game-credential rotation as still gated on a confirmed-safe heartbeat that has not yet happened.** |
| GAME_CREDENTIAL_ROTATION_READINESS | Tooling exists (`apps/api/src/migrate-game-credential-keys.ts`, on `main`, uncommitted) — real `--dry-run` mode, safe memory hygiene (zeroes plaintext buffers), documented key-version format, wired into the cPanel deploy bundle. **Well-built but not test-covered as an orchestration unit, and explicitly BLOCKED regardless of code quality** — must wait for the heartbeat condition per the project's own pending-action list. |
| STORED PROCEDURES | Four proposed (`bm_GrantVip`, `bm_SyncVipTier`, `bm_AnonymizeGameAccount`, `bm_PurgeGameAccount`) + audit table, full T-SQL reviewed. **Never executed against any SQL Server**, local or production — no SQL Server test environment exists in this dev setup. |
| AUDIT | Designed and approved, not yet built. |
| KILL_SWITCH | Four independent flags by design, PURGE defaults false even after others are on — design confirmed in docs, exact flag names not directly re-verified in `.cs` source this pass. |
| PRODUCTION_STATUS | **Nothing shipped.** Corroborated by both dated production-validation docs: no GameBridge/GameServer/VIP/progression change has been published. |

**Explicit compliance note**: game credential rotation was not run, and this report does not recommend running it — it remains blocked on the heartbeat condition, exactly as instructed.

---

## PART 13 — Community

Schema (6 migrations, all on `main`) + module (`community.service.ts`, 851 lines) + `apps/web/pages/comunidade/*` — **byte-identical between openbeta and main**, meaning nothing here is new/uncommitted work; this is all baseline.

| Feature | Status |
|---|---|
| Feed | REAL_WORKING |
| Posts (TEXT/IMAGE/GALLERY/GIF/ARTICLE) | REAL_WORKING |
| Posts (ITEM/ACHIEVEMENT/EVENT/MARKETPLACE/GUILD/LFG/POLL/AUTOMATED_GAME_EVENT) | SCHEMA_ONLY — explicitly blocked in service code pending domain rules |
| Comments | REAL_WORKING (with revisions) |
| Reactions | REAL_WORKING |
| Profiles | REAL_WORKING |
| Moderation | REAL_WORKING — full report/action queues, audited |
| Polls | SCHEMA_ONLY — enum value exists, no options/votes table, no UI |
| Feedback (badge/achievement grants) | REAL_WORKING |
| **Bug Hunters** | **NOT_IMPLEMENTED** as a feature — only a wallet-ledger reward-reason label exists, no submission/tracking |
| Notifications | **NOT_IMPLEMENTED** — no `Notification` model; `/painel/notificacoes` is actually a static CMS announcements list, not a per-user event feed |
| Community admin panel | REAL_WORKING |
| Community-wide quests | PARTIAL — backend real, but browsing them from `/comunidade`'s own tabs shows a placeholder ("preparada na navegação... será construída") |

---

## PART 14 — Guilds

Schema (2 migrations, both on `main`) + module (`guilds.service.ts`, 1037 lines) — again **byte-identical between openbeta and main**, baseline work, nothing new uncommitted. The module's own README tiers everything honestly and matches the code exactly.

| Feature | Status |
|---|---|
| Guild profile, members, join requests, roles, invites | WORKING |
| Projects, resource requests | WORKING |
| Treasury / treasury balances | READ_ONLY / SCHEMA_PREPARED — real rows, zero write endpoint, always zero |
| Vault / vault items | READ_ONLY / SCHEMA_PREPARED — same pattern |
| Movements / approvals | SCHEMA_ONLY — deliberately excluded from the Prisma relation graph |
| Guild XP | PARTIAL — fields exist and render in UI, nothing increments them |
| Resource conversion | PARTIAL — admin CRUD exists, rules created inactive, never executed |
| Quests/Events/Guides/Statistics/Achievements (guild-scoped) | UI_ONLY — explicit "Tier C, preview" per README |
| Alliance | NOT_BUILT — explicitly "Proibido nesta rodada" |
| Guild feed | UI_ONLY |
| Game guild claim | NOT_BUILT — no `GuildClaimRequest` table exists |
| GameServer sync | DEFERRED / SCHEMA_PREPARED — columns exist, all null/default, no worker code references them |

`guilds.e2e-spec.ts`: 2075 lines, 81 test blocks, 288 assertions — substantive, real, and the guild-e2e test-isolation debt noted in project memory has already been fixed in the current code (wipe-before-first-test pattern, `NODE_ENV=test`-guarded).

---

## PART 15 — News / Journal / Editorial

**Real, working mechanism today**: `KnowledgeEntry` (single content table, `kind` enum incl. NEWS/EVENT) backs both Portal and Launcher news via a real editorial workflow (RAW→...→PUBLISHED). Admin UI (`/painel/admin/conteudo`) lets a GM/admin publish today, no new code needed. Launcher Studio is a separate, additive slot-content system for the fixed launcher home-page banners.

**Needs new functionality**: structured changelog/patch-notes (today it's a flat string array); "Jornal Blood Moon," weekly ranking digest, guild spotlight, interviews — **zero references anywhere in any worktree**, not designed, not drafted.

---

## PART 16 — Wiki

- CONTENT_MODEL: real (`KnowledgeEntry` + full equipment/character schema).
- CMS/ADMIN: real editor exists.
- PLAYER_UI: real, substantial (`apps/web/pages/wiki.vue`, ~3,400 lines).
- **Items/equipment: REAL_CONTENT**, substantial — 1,914 equipment records imported and verified from two third-party MU Online sources, but this is generic vendor data, not Blood-Moon-specific writing.
- **Everything else (guide/lore/quest/NPC/monster/drop text): MOSTLY_MISSING_CONTENT** — of 330 total imported entries, only 7 are scoped to the live season and visible to a player today.
- Phase 7's wiki-draft markdown files (Reset/Guilds/Rankings/FAQ etc.) are **not live content** — sitting in an isolated research branch, never imported, explicitly documented as requiring deliberate human-reviewed promotion before publication.

---

## PART 17 — Bug Hunters / Feedback / Surveys

- **Survey system**: SCHEMA_ONLY — full relational shape exists (uncommitted), migration's own header comment says "no UI is built against this yet," zero service/controller files found.
- **Bug Hunters program**: no dedicated module. The only hit anywhere in the codebase is a wallet-ledger reward-reason label (`BUG_HUNTER_REWARD`) — a GM can manually credit a reward, but there is no report-submission form, no tracking table, no policy engine.
- **GM Occurrence tracking**: real, wired, staff-only incident/moderation log — not a player-facing bug-report pipeline.
- **GM Events**: real, wired, staff-only scheduled-event runner — unrelated to bug reporting.
- **Bottom line**: admin-side incident triage works; player-facing bug reporting, feedback, and surveys do not exist beyond a reserved-but-empty schema and a reward label.

---

## PART 18 — Telemetry Readiness (classification only, nothing built)

`observability_foundation` (on `main`) is real **internal ops** observability (audit events, admin work log, system errors, alerts, retention policy) — not player-behavior analytics, but a reusable, already-proven `OperationalEvent` logging primitive exists and is already used by the marketplace module.

A real, tested, **read-only, SELECT-only** GameServer reader (`AccountSnapshotReader`) already exists and is validated against the live schema, but is **explicitly not wired into any continuous poll loop**. Portal's own `AccountCharacter` table is currently populated only by admin edits and hardcoded demo data — no automated sync exists.

| Metric | Classification |
|---|---|
| Login/logout | REQUIRES_READ_ONLY_COLLECTOR |
| Online duration | REQUIRES_READ_ONLY_COLLECTOR |
| Character/class/level/reset | REQUIRES_READ_ONLY_COLLECTOR (the hard part — safe SQL access — is already proven; only continuous polling is missing) |
| Map | REQUIRES_READ_ONLY_COLLECTOR |
| Event participation | REQUIRES_NEW_DATA_MODEL |
| Guild activity | AVAILABLE_NOW (membership snapshot) / REQUIRES_NEW_DATA_MODEL (history over time) |
| Market activity | **AVAILABLE_NOW** — already flowing into `OperationalEvent` today |
| Currency movements | AVAILABLE_NOW (Portal WC/GP/HP ledger) / REQUIRES_READ_ONLY_COLLECTOR (in-game Zen, current-balance only, no movement log) |
| Boss kills | REQUIRES_GAMESERVER_SUPPORT, possibly NOT_OBSERVABLE_SAFELY — no evidence any queryable boss-kill log exists |

---

## PART 19 — Privacy / Account Lifecycle

**Design intent (phase11, 2026-08-29) explicitly stated nothing existed yet.** Current state (openbeta, through work dated up to today) is **largely built and closely matches that design**:

- `Account.accountPhase` (`PRE_BETA/OPEN_BETA/OFFICIAL`) — exists exactly as designed.
- `BetaRewardEntitlement` — field-for-field match to the design draft. Real claim endpoint exists (idempotent, audited). **Gap**: nothing in the codebase actually creates entitlement rows yet — the claim mechanism is ready but has no upstream population process.
- **Deletion**: two real, tested, non-interchangeable modes — `NORMAL_ACCOUNT_DELETION` (anonymize in place, never a hard delete, preserves financial/audit/VIP history, blocks on active guild leadership or in-flight trades) and `PRE_BETA_PURGE` (real cascading delete, but hard-gated to `accountPhase='PRE_BETA'` + zero financial weight + explicit batch scope — never inferred from a date range).
- Self-service deletion request flow (14-day grace period, cancel-anytime) is real.
- Exit-feedback collection (uncommitted, today's work) has a real backend and a frontend page, **not verified against a live authenticated backend** this pass.
- **Pre-Beta accounts are structurally protected**, not just by intent — the purge-eligibility check hard-requires `PRE_BETA` phase with an explicit no-date-inference comment in the code itself.
- **Not built**: real GameServer-side execution of anonymize/purge (queued but flag-gated off; stored procedures reviewed, never run). Consent management and data-correction UI are explicitly marked "coming soon."
- **Unknown**: whether a legal/LGPD review of retention periods has actually happened — not verifiable from code.

---

## PART 20 — Open Beta Target

`TARGET_DATE = 2026-09-12`. Treated as a target, not an irreversible promise, per instruction.

---

## PART 21 — Open Beta Must-Have Matrix

| Item | Classification | Why |
|---|---|---|
| Registration, login, password recovery | MUST_HAVE — already ready | Real, working, in production |
| Launcher + updater + account provisioning + Play | MUST_HAVE — already ready | Confirmed live, 1.1.2 |
| Support/tickets | MUST_HAVE — already ready | Real ticket create/list/admin-response flow exists |
| News | MUST_HAVE — already ready | Real CMS, admin can publish today |
| Bug Hunters / structured feedback | SHOULD_HAVE | Nothing player-facing exists yet; Open Beta's whole point is gathering feedback, but a manual support-ticket path already covers the minimum |
| Rules / onboarding / FAQ | SHOULD_HAVE | Phase 7 research is strong but sits unpublished; needs a deliberate promotion pass, not new engineering |
| Events (Portal-side display) | SHOULD_HAVE | Real event display mechanism exists via KnowledgeEntry |
| Payments (real money) | CAN_WAIT for a pure-F2P soft-open, MUST_HAVE before any commercial claim | Code-complete but zero real-money validation; turning it on requires a real Mercado Pago sandbox pass first |
| VIP | CAN_WAIT | All products currently disabled; needs the Bronze-commercial decision + a real purchase QA pass before it can be a Beta feature at all |
| Store/XShop/CashShop (commercial) | CAN_WAIT | Zero approved catalog rows exist by design; this was never going to be ready for a near-term Beta window |
| Monitoring/alerting | SHOULD_HAVE | 5xx capture is solid; nothing pages anyone — acceptable for a small closed Beta, risky to scale past that without addressing it |
| Backup | MUST_HAVE — partially ready | Real script exists for cPanel/MySQL, but only 3-day local retention and no confirmed offsite copy; game-VPS side has no automation at all |
| Security (owner actions) | MUST_HAVE before wider exposure | cPanel/VPS password rotation still open; game-credential rotation blocked on heartbeat |
| Admin controls | MUST_HAVE — already ready | Extremely broad and real per the portal map below |
| Account cleanup after Beta / BetaRewardEntitlement | MUST_HAVE for Beta's own stated promise to players | Claim mechanism exists but nothing populates it yet — needs to be wired before the first Beta cycle actually ends |

**Not classified MUST_HAVE just because desirable**: Wiki narrative content, Guild treasury/vault, community polls, weekly digests, telemetry — all genuinely nice-to-have, none block a scoped Open Beta launch.

---

## PART 22 — Security Readiness

| Item | Status |
|---|---|
| Turnstile rotation | **PARTIAL, not closed** — first rotation done, but the rotation UI itself briefly exposed both old and new values into private tooling output; a second rotation is still required, was blocked by Cloudflare's rate limit at last check |
| Prior exposed secret (Phase 3D-B) | Substantially remediated; `TWO_FACTOR_ENCRYPTION_KEY` deliberately not blind-rotated (would break active 2FA) — active key now on `v3`, `v2` retained only as rollback material pending a real TOTP login validation |
| Launcher secret hygiene | PARTIAL — Phase 2B had a diagnostic exposure (remediated, no blind rotation); Phase 2C executed a real dependency-aware rotation (DB, JWT, SMTP, HMAC, 2FA key) with verified zero-5xx smoke afterward; game-credential `v2` was explicitly **not** rotated, blocked on the GameBridge heartbeat |
| **cPanel primary password rotation** | **OPEN** — owner action only |
| **VPS Administrator password rotation** | **OPEN** — owner action only |
| **Game-credential rotation** | **OPEN, blocked on heartbeat** — tooling exists and looks solid but must not run yet |
| Uncommitted-secret sweep (this session) | **Clean** — grepped all of openbeta's actual uncommitted diff for password/secret/private-key/JWT patterns; every match was a field name, a test fixture with fabricated credentials, or Cloudflare's own published test secret. No `.env`/`.pem`/`.key` file modified or untracked. Nothing found warrants rotation beyond the three already-open items above. |

---

## PART 23 — Monitoring / Operations

| Area | Status |
|---|---|
| Health-check endpoint | PARTIAL — only a bare `GET /` with no dependency checks; a separate standalone provisioning-health script exists but isn't wired into any alerting pipeline |
| API smoke tests | READY_FOR_BETA |
| 5xx visibility/logging | READY_FOR_BETA — real global exception filter, admin UI, but **nothing pushes an alert** (no email/Slack/webhook) — an operator must be logged in to notice |
| Backup (cPanel/MySQL) | READY_FOR_BETA but thin — real script, only 3-day local retention, offsite copy not confirmed configured |
| Backup (game VPS / SQL Server) | **MISSING** for the new stack — old-site-only script, manual invocation |
| Restore procedure | Documented, **never actually executed** against production |
| Migration rollback | **MISSING** — no migration ships a down-script; only recovery path is a full DB restore, itself untested |
| Deployment rollback | Documented runbook only, no automation |
| Payment reconciliation tooling | READY_FOR_BETA (new) |
| GameBridge heartbeat visibility | PARTIAL — real signal exists, but nothing pages if it goes stale |

**Single biggest operational gap**: nothing in this stack proactively alerts a human. Every signal requires someone to go look.

---

## PART 24 — Portal Completion Map

Full page-by-page detail lives in the audit transcript this report is built from; summary:

- **Player side**: overwhelmingly DONE — real data-fetching across news, wiki, guides, marketplace, guilds, community, VIP, transfers, support, privacy. Two known placeholders: `/gazeta` (self-disclosed demo content, not real telemetry) and `/painel/personagens` (thin link-out rather than a full self-service list).
- **GM side**: fully DONE (dashboard, events, logs, occurrences).
- **Admin side**: overwhelmingly DONE across accounts, finance, content, store, legacy catalog, marketplace, community, guilds, tasks, reports, roadmap, events, observability (errors/alerts/audit/history/exports/retention), moderation, tickets, launcher studio, progression. One explicit placeholder: `/painel/admin/sistema` (local-JSON test tool, not wired to the real database — should not be mistaken for real system administration).
- **Super Admin side**: one page, `pre-beta-purge`, real and explicitly self-identified as irreversible/Super-Admin-only.
- Legacy `/admin/*` routes are pure redirect shims to the real `/painel/admin/*` pages — no independent functionality, not needed.
- Two uncommitted migrations (`survey_foundation`, `vip_sync_drift_observability`) have **no clearly dedicated page found** in this pass — worth a direct follow-up, since this was a page-file scan, not full runtime testing.

**Rough completion estimate** (page-count based, not weighted by importance): Player ~90% DONE, Admin ~95% DONE, Super Admin 100% of its one page DONE. The real gap is not "pages missing" — it's "commercial/GameServer-facing systems intentionally not turned on yet."

---

## PART 25 — Safe Deployment Batches

**BATCH A — Privacy / Account Deletion Feedback**
Features: exit-feedback collection + retention-interaction tracking.
Migrations: `account_deletion_feedback`, `account_deletion_feedback_retention_interaction`.
Dependencies: existing `NORMAL_ACCOUNT_DELETION` flow (already in production).
Risk: Low — new table, no FK to Account by design (survives anonymization).
Rollback: drop the two new tables; no existing behavior depends on them.
Production QA: needs a real authenticated pass against `/painel/privacidade` (not yet done).
Codex required: No — Claude can isolate and QA this.
Ready now: **Yes**, pending isolation.

**BATCH B — Payment Risk / Chargeback**
Features: `ChargebackCase`, `PaymentRiskSignal/Case/CaseAction`, admin finance UI wiring.
Migration: `phase_p_payment_risk_and_chargeback_case`.
Dependencies: existing commerce/payments module (in production, flag-gated off).
Risk: Low — additive schema, doesn't turn on real-money payments.
Rollback: drop new tables; `/painel/admin/financeiro`'s new tabs would need to degrade gracefully or be feature-flagged.
Production QA: e2e-tested locally; needs a live smoke pass post-deploy.
Codex required: For the actual deploy, yes (per your own Codex-for-production-only policy).
Ready now: **Yes**, pending isolation.

**BATCH C — Store/XShop Control Plane**
Features: `LegacyCatalogItem` desired/effective state, admin catalog UI.
Migrations: `phase_s_legacy_catalog_item`, `phase_t_legacy_catalog_effective_state`.
Dependencies: none blocking.
Risk: Low — control plane only, zero commercial exposure (all rows blocked/review by hardcoded policy).
Rollback: drop new tables; admin page disappears, no player-facing change.
Production QA: 25/25 e2e per test-evidence-index, not independently re-run this session.
Codex required: for deploy only.
Ready now: **Yes**, pending isolation — this is the closest analog to how the Launcher itself was isolated.

**BATCH D — Progression Visibility (admin-only)**
Features: `ProgressionConfigItem` control plane + calculator/simulator tooling.
Migrations: `phase_u_progression_config_item`, `phase_v_progression_policy_status`.
Dependencies: none.
Risk: Low — cannot write to GameServer under any configuration.
Rollback: drop new tables.
Production QA: needs a live pass; low stakes since it's read/plan-only.
Codex required: for deploy only.
Ready now: **Yes**, pending isolation.

**BATCH E — Survey Foundation (schema only)**
Features: schema shape for a future survey system.
Migration: `survey_foundation`.
Dependencies: none — no service/UI exists yet, so nothing depends on this shipping.
Risk: Trivial.
Rollback: trivial.
Ready now: Low priority — safe but currently pointless to isolate on its own; better bundled with whatever batch eventually builds the survey feature.

**NOT YET A SAFE BATCH — GameBridge/VIP extension**
`gamebridge_vip_sync_state`, `vip_sync_drift_observability` plus the Agent/Worker command extension code are **entangled with the still-blocked GameBridge heartbeat and the unresolved VIP commercial decision**. Do not batch these until both clear.

**NOT YET A SAFE BATCH — Player preferences**
Frontend currently writes to `localStorage`, not confirmed wired to the backend table — deploying the migration alone would ship dead schema.

---

## PART 26 — Isolation Requirements

| Batch | Classification |
|---|---|
| A — Privacy feedback | NEEDS_ISOLATION (straightforward — small, self-contained) |
| B — Payment risk/chargeback | NEEDS_ISOLATION (moderate — touches the large commerce module, needs careful file-by-file review like the Launcher's own MainWindow.xaml reconciliation) |
| C — Store control plane | NEEDS_ISOLATION (moderate) |
| D — Progression visibility | NEEDS_ISOLATION (straightforward) |
| E — Survey schema | NEEDS_ISOLATION (trivial) |
| GameBridge/VIP extension | DEPENDENCY_ENTANGLED — blocked on heartbeat + product decision, do not isolate yet |
| Player preferences | DEPENDENCY_ENTANGLED — frontend/backend wiring gap must close first |
| Full commerce/payments real-money path | DO_NOT_DEPLOY as a whole yet — needs real Mercado Pago sandbox validation before the flag can safely flip |

**No batch here has a clean commit already sitting isolated the way the Launcher does.** Every one of these would need its own version of the isolation discipline this session applied three times to the Launcher: identify the real file set, diff against a clean base, remove unrelated drift, test, then commit.

---

## PART 27 — Do Not Deploy List

- **Real-money payment activation** (`REAL_MONEY_PAYMENTS_ENABLED=true`) — no sandbox validation has ever occurred.
- **Any VIP product `enabled:true`** — Bronze-commercial question unresolved, purchase flow never QA'd end-to-end against a real account.
- **Any Store/XShop/CashShop commercial catalog row** — by explicit, hardcoded, tested policy, none currently qualify.
- **GameBridge VIP/anonymize/purge command execution** — stored procedures never run against any SQL Server; heartbeat unconfirmed.
- **Game-credential key rotation** — tooling exists, explicitly blocked on heartbeat.
- **Progression/reset config sync to GameServer** — no sync capability exists at all; don't build urgency around this until it does.
- **Player-preferences migration alone** — would ship dead schema without its frontend wiring.
- **Runtime catalog sync for X-Shop/CashShop** — no implementation exists behind the flag; not a config flip away.

---

## PART 28 — Codex Usage Plan

Codex budget is limited — reserved for what genuinely needs production/provider access Claude doesn't have.

**Next 3 most valuable Codex tasks:**
1. **Mercado Pago sandbox validation** — exercise the real sandbox (checkout, webhook, refund, poll) against the already-built, already-tested-with-mocks payment code. This is the single highest-leverage unblock in the whole payments/VIP domain, since VIP's own purchase flow ultimately depends on WC recharge working for real.
2. **Second Turnstile secret rotation** — the one concretely time-boxed open security item (blocked earlier only by Cloudflare's rate limit, likely clear by now).
3. **A supervised GameBridge Agent heartbeat recovery + confirmation pass**, followed immediately by the already-built, dry-run-capable game-credential rotation script (`apps/api/src/migrate-game-credential-keys.ts`) — this single Codex session would close two of the three long-standing open owner-adjacent security actions in one motion, once cPanel/VPS password rotation (pure owner action, no agent involved) is separately done by Bryan himself.

**Claude stays responsible for**: isolating Batches A-D into clean commits (mirroring the Launcher isolation pattern), local test coverage, docs, and preparing each as a reviewable release candidate — exactly the discipline already proven three times this session.

---

## PART 29 — Claude Backlog

**P0**
- Isolate Batch A (Privacy/Account Deletion Feedback) into a clean commit — small, self-contained, no external dependency. *Expected output*: a new release branch off a confirmed clean base, tested, documented. *Deploy blocker*: none once isolated — ready for Codex to ship.
- Isolate Batch D (Progression Visibility) — same reasoning, read-only/admin-only, zero GameServer risk. *Deploy blocker*: none.
- Wire `/painel/configuracoes` to the `player_preferences_foundation` backend table instead of `localStorage` (or explicitly decide not to and drop the migration) — closes a real, currently-dangling gap. *Deploy blocker*: this decision itself.

**P1**
- Isolate Batch C (Store control plane) — moderate complexity, same pattern as the Launcher's own commerce-adjacent reconciliation work. *Deploy blocker*: none functionally, but confirm with Bryan that shipping an empty-but-real admin tool is desired before the commercial catalog itself is ready.
- Isolate Batch B (Payment risk/chargeback) — moderate complexity, larger module surface. *Deploy blocker*: coordinate timing with Batch A/D so financeiro admin UI changes ship together sensibly.
- Populate `BetaRewardEntitlement` rows from somewhere real — right now the claim endpoint has nothing to claim. *Dependency*: a decision on what triggers eligibility (needs Bryan's input, but the engineering itself doesn't need unresolved GameServer knowledge).
- Add a display-name translation layer to the Launcher's Store page so currency names match the Web (`WCOIN` → "WCoin" etc.) — small, isolated, no GameServer dependency.

**P2**
- Promote a first batch of Phase 7's wiki-draft content (the 5 pages already marked `READY_FOR_OPEN_BETA`) into real `KnowledgeEntry` rows via the existing admin CMS — no new engineering, just deliberate content publication.
- Add a `.env.example` entry for every payments/reconciliation feature flag currently undocumented for ops.
- Wire a basic outbound alert (even a single webhook) for `SystemAlert`-severity CRITICAL errors and GameBridge heartbeat staleness — closes the "nothing pages anyone" gap identified in Part 23, without needing a full monitoring platform.

**Deliberately not in this backlog**: anything requiring the unresolved XP/drop formula, anything requiring GameServer command execution, anything requiring a VIP-Bronze or reset-value product decision — those wait on either Bryan's decision or Codex's provider/production access.

---

## PART 30 — Recommended Next Primary Front

**PAYMENTS** (specifically: get Mercado Pago sandbox validation done, via Codex) — **not** a new engineering front for Claude, but the one dependency that unblocks the most other work.

**Why**: VIP's commercial launch, the Store's eventual commercial catalog, and even Open Beta's own credibility as a real product all sit downstream of "can a player actually pay Blood Moon money and have it work." The engineering on the Portal side is already done and locally tested — this is purely an external-validation gap, which is exactly the kind of task this session's own Part 28 reasoning says belongs to Codex, not Claude. Every other domain audited in this report (VIP, Store commercial catalog, even parts of Privacy's BetaRewardEntitlement economics) is either directly blocked by this or made meaningfully more valuable once it clears. In parallel, Claude's own most valuable use of time is isolating Batches A/D (privacy feedback, progression visibility) into clean, ready-to-ship commits — small, safe, and immediately available the moment Codex has bandwidth to deploy them, continuing the exact discipline that got the Launcher shipped three times cleanly this session.

---

## Final Human-Friendly Summary (Português)

| Área | Local | Produção | O que falta | Bloqueia Beta? | Próximo passo |
|---|---|---|---|---|---|
| **Launcher** | Completo (auth, visual, escala) | ✅ Sim — v1.1.2 no ar | Rótulo estático "v1.1.0" no trilho lateral (cosmético) | Não | Nenhum — já entregue |
| **Pagamentos (Mercado Pago)** | Código pronto e testado com mocks | ❌ Não — chave real nunca testada | Validação em sandbox real do Mercado Pago | **Sim**, para qualquer venda real | Codex: rodar sandbox real |
| **VIP** | Estrutura, preços e entrega técnica prontos | ❌ Não — todos os planos desativados | Decisão sobre Bronze comercial + decisão WC vs BRL direto + teste real de compra | Não para Beta gratuita; **sim** para monetização | Decisão do Bryan, depois QA real |
| **Loja / X-Shop / CashShop** | Painel de controle pronto e testado | ❌ Não — catálogo comercial vazio de propósito | Nenhum item aprovado para venda ainda (153 bloqueados por decisão sua, 12 em revisão, 9 aluguéis pendentes de teste) | Não | Revisão dos 12 itens + decisão sobre os 3 bilhetes de evento |
| **Progressão / Reset** | Painel de visibilidade pronto (não escreve no jogo) | ❌ Não | Nenhuma forma de aplicar a decisão no servidor real ainda | Não diretamente | Confirmar valor final do reset (450 para todos, já registrado hoje, ainda não aplicado no jogo) |
| **GameBridge** | Worker + Agente prontos, nunca executados de verdade | ❌ Não — heartbeat do Agente ainda não confirmado seguro | Confirmar Agente vivo, depois rodar procedimentos reais pela primeira vez | Não para Beta gratuita; **sim** para VIP/GameServer | Codex: recuperar heartbeat, depois rotacionar credencial de jogo |
| **Comunidade** | Funcionando (feed, posts, moderação) | ✅ Sim, base já em produção | Notificações reais, enquetes, "Bug Hunters" como programa próprio | Não | Nenhum urgente |
| **Guildas** | Estrutura completa, tesouraria e cofre só leitura | ✅ Sim, base já em produção | Movimentação real de tesouraria, aliança, vínculo com guilda do jogo | Não | Nenhum urgente |
| **Notícias / Wiki** | Mecanismo real funcionando | ✅ Sim, base já em produção | Conteúdo de wiki além dos itens (a maior parte ainda não publicada) | Não | Publicar aos poucos pelo painel já existente |
| **Feedback / Bug Hunters** | Só rascunho de banco de dados | ❌ Não | Formulário de envio de bug para jogadores não existe | **Sim, seria importante para Beta** | Construir o essencial (P1/P2 do backlog) |
| **Privacidade / exclusão de conta** | Quase pronto, bem desenhado | Parcial — mecanismo base já em produção | Popular as recompensas de Beta reivindicáveis; validar página de feedback de saída | **Sim**, para cumprir a promessa feita aos jogadores de Beta | Isolar e testar (já no backlog P0) |
| **Segurança** | Boa disciplina, três ações do dono ainda pendentes | — | Trocar senha do cPanel, trocar senha Administrator da VPS, rotacionar credencial de jogo após heartbeat | **Sim**, antes de exposição maior | Ação direta sua (senhas) + Codex (credencial) |
| **Monitoramento** | Captura de erros boa, mas nada avisa ninguém sozinho | Parcial | Um alerta simples (e-mail/webhook) para erros críticos | Não crítico para Beta pequena | P2 do backlog |

---

## FINAL REPORT

```
PHASE_Y = PASS

WORKTREES_AUDITED = [
  main (D:\MU\mu-bloodmoon-v1),
  open-beta/p0-foundation (D:\MU\mu-bloodmoon-v1-openbeta),
  product/economy-phase-11 (D:\MU\mu-bloodmoon-v1-phase11),
  knowledge/beta-readiness-phase-7 (D:\MU\mu-bloodmoon-v1-phase7),
  launcher/desktop-phase-1 (D:\MU\mu-bloodmoon-launcher-phase1),
  launcher/phase-2d-release (D:\MU\mu-bloodmoon-launcher-2d-release)
]
DIRTY_WORKTREE_CLASSIFIED = YES

ALREADY_IN_PRODUCTION = [Portal/API baseline, Community foundation, Guild foundation, Launcher through 1.1.2]
READY_LOCAL_NOT_DEPLOYED = [Legacy catalog control plane, Payment risk/chargeback, Account deletion feedback, Progression config visibility]
PARTIAL_PRODUCTION = [Payments/commerce core (real-money flag off), VIP (all products disabled), GameBridge command extension (never executed)]
LOCAL_EXPERIMENT_ONLY = [Progression calculator/simulator, WC fee-model accumulator]
BLOCKED = [GameServer command execution, game-credential rotation, commercial catalog publication, VIP commercial launch, reset/XP GameServer sync]

PENDING_MIGRATIONS = [gamebridge_vip_sync_state, account_deletion_feedback, account_deletion_feedback_retention_interaction, survey_foundation, player_preferences_foundation, vip_sync_drift_observability, phase_p_payment_risk_and_chargeback_case, phase_s_legacy_catalog_item, phase_t_legacy_catalog_effective_state, phase_u_progression_config_item, phase_v_progression_policy_status]

PAYMENTS_STATUS = code-complete, locally tested with mocks, every provider path EXTERNAL_VALIDATION_PENDING
VIP_STATUS = fully built, all commercial products disabled, Bronze/pricing-model decisions open
CURRENCY_NAMING_STATUS = two unreconciled currency domains (GameServer vs Portal); Launcher shows raw enum names; "BloodCoin"/"WP" not implemented anywhere
STORE_XSHOP_CASHSHOP_STATUS = control plane ready and tested; commercial catalog and runtime sync both NOT_READY by design
PROGRESSION_STATUS = admin visibility tool only; no GameServer write capability exists
GAMEBRIDGE_STATUS = Worker+Agent code built and locally tested; nothing executed against real infrastructure; blocked on heartbeat confirmation
COMMUNITY_STATUS = mostly REAL_WORKING; Bug Hunters and notifications NOT_IMPLEMENTED
GUILD_STATUS = core WORKING; treasury/vault READ_ONLY; several features UI_ONLY or NOT_BUILT
NEWS_JOURNAL_STATUS = real, publishable today via existing admin CMS
WIKI_STATUS = strong for equipment/items, MOSTLY_MISSING for narrative/guide content
BUG_HUNTERS_STATUS = NOT_IMPLEMENTED as a player-facing feature
TELEMETRY_READINESS = one proven read-only GameServer reader exists, unwired; most metrics REQUIRES_READ_ONLY_COLLECTOR
PRIVACY_ACCOUNT_LIFECYCLE = largely built, closely matches design; BetaRewardEntitlement has no population source yet
SECURITY_READINESS = good discipline; 3 owner actions still open (cPanel password, VPS password, game-credential rotation); uncommitted-diff secret sweep clean
MONITORING_READINESS = error capture and smoke tests solid; no proactive alerting anywhere

OPEN_BETA_TARGET = 2026-09-12

OPEN_BETA_MUST_HAVE_TOTAL = 13
OPEN_BETA_MUST_HAVE_READY = 7
OPEN_BETA_MUST_HAVE_MISSING = [Bug Hunters/structured feedback build-out, backup retention/offsite hardening, cPanel/VPS password rotation, BetaRewardEntitlement population, real payments validation gate before any commercial claim]

PLAYER_PORTAL_COMPLETION = ~90%
ADMIN_PORTAL_COMPLETION = ~95%
SUPER_ADMIN_COMPLETION = 100% (of its one page)

RECOMMENDED_DEPLOY_BATCHES = [
  BATCH A — Privacy/Account Deletion Feedback (ready now, needs isolation),
  BATCH B — Payment Risk/Chargeback (ready now, needs isolation),
  BATCH C — Store/XShop Control Plane (ready now, needs isolation),
  BATCH D — Progression Visibility (ready now, needs isolation),
  BATCH E — Survey schema (low priority, trivial)
]

DO_NOT_DEPLOY = [
  Real-money payment activation,
  Any VIP product enabled=true,
  Any Store/XShop/CashShop commercial catalog row,
  GameBridge VIP/anonymize/purge command execution,
  Game-credential key rotation,
  Progression/reset GameServer sync,
  Player-preferences migration in isolation,
  Runtime catalog sync for X-Shop/CashShop
]

NEXT_CODEX_TASKS = [
  Mercado Pago sandbox validation,
  Second Turnstile secret rotation,
  GameBridge Agent heartbeat recovery + game-credential rotation (in that order)
]

NEXT_CLAUDE_P0 = [
  Isolate Batch A (Privacy feedback),
  Isolate Batch D (Progression visibility),
  Resolve player-preferences frontend/backend wiring gap
]
NEXT_CLAUDE_P1 = [
  Isolate Batch C (Store control plane),
  Isolate Batch B (Payment risk/chargeback),
  Populate BetaRewardEntitlement source,
  Launcher currency display-name fix
]
NEXT_CLAUDE_P2 = [
  Promote 5 ready wiki-draft pages into real content,
  Document undocumented payment feature flags,
  Wire a basic outbound alert for CRITICAL errors/heartbeat staleness
]

RECOMMENDED_NEXT_PRIMARY_FRONT = PAYMENTS (Mercado Pago sandbox validation via Codex)
WHY_THIS_FRONT = It is the single dependency unblocking the most other downstream work (VIP commercial launch, Store commercial catalog credibility, Open Beta's own product credibility), the Portal-side engineering is already done and locally tested, and it is squarely the kind of external/provider-access task this project's own division of labor assigns to Codex rather than Claude.

PRODUCTION_CHANGED = NO
DEPLOY = NO
PUSH = NO

READY_TO_PLAN_NEXT_PRODUCTION_BATCH = YES
```

STOP.
