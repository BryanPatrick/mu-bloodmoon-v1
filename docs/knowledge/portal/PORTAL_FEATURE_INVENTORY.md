---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
sourceCommit: 1c272db
---

# Portal feature inventory (current, from deployed code)

Created in `BLOODMOON-AI-07`. Source: the read-only audit of the last
evidenced production deploy, commit `1c272db` (2026-09-14) —
[`evidence/portal-code-audit-1c272db.md`](evidence/portal-code-audit-1c272db.md),
which carries the `path:line` citations for every row. `main`'s own
`apps/` is older than production (see [`README.md`](README.md)).

Code can prove what the portal **can** do. It cannot prove production
environment flags or database contents, so any behaviour that depends on
them is marked `UNKNOWN (runtime)`.

## Status vocabularies

- **knowledge_status**: `CODE_VERIFIED` (read in deployed code) ·
  `CODE_VERIFIED_RUNTIME_UNKNOWN` (code read; whether it is live depends on
  env/DB) · `PLACEHOLDER` (page exists, content is static/demo/"em breve") ·
  `BROKEN` (code path cannot work as written) · `UNKNOWN`.
- **documentation_status**: `DOCUMENTED` (a current doc on `main`
  describes it) · `PARTIAL` · `THIS_INVENTORY_ONLY` (only this file and
  the evidence audit) · `MISSING`.

## Access model (summary)

- Roles: `PLAYER < GM < ADMIN < SUPER_ADMIN`. Only paths under `/painel`
  require login in the web middleware; admin and GM areas also require
  2FA for non-players and a per-page permission; denial goes to
  `/acesso-negado`. ADMIN gets only `admin.dashboard.view` +
  `gm.events.view` by default; every other `admin.*` permission is
  delegated per account by a SUPER_ADMIN. The API guards
  (`RolesGuard`, `PermissionsGuard`) are the authoritative boundary; web
  menu gating is UI only. Visibility of this whole section:
  `INTERNAL_SYSTEM` (the security details are `SECURITY_PRIVATE`).

## Player-facing features

| feature_id | Name | Route(s) | Audience | Login | Role | Purpose / primary actions | Related API / module | knowledge_status | documentation_status |
|---|---|---|---|---|---|---|---|---|---|
| PF-HOME | Home | `/` | public | no | — | Landing page, server info, latest news, "Jogar agora" → `/registrar` | `content`, `launcher` | CODE_VERIFIED (secondary news cards are always hardcoded demo items) | THIS_INVENTORY_ONLY |
| PF-AUTH-REGISTER | Create account | `/registrar` | public | no | — | Name, username, password, Personal ID, e-mail (twice), optional referral, terms, Turnstile | `POST /auth/register` (`auth`) | CODE_VERIFIED | PARTIAL (`docs/accounts/unified-registration.md`) |
| PF-AUTH-LOGIN | Log in | `/login` | public | no | — | E-mail **or** username + password, Turnstile, 6-digit 2FA or recovery code when required | `POST /auth/login` | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-AUTH-RECOVERY | Password recovery | `/recuperar-conta` → e-mail → `/redefinir-senha?token=` | public | no | — | Request link (neutral answer), set new password (8-72 chars) | `POST /auth/password-recovery/request`, `/reset` | CODE_VERIFIED; real e-mail delivery to an external mailbox **never proven in production** | PARTIAL (`docs/handoff/auth-recovery-provider-blocker.md`) |
| PF-ACCOUNT | Manage account | `/painel/conta` | player | yes | PLAYER | Profile, change password, 2FA setup/disable, recovery codes, sessions (revoke with step-up) | `account`, `auth/2fa`, `account/sessions` | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-DASHBOARD | Player dashboard | `/painel` | player | yes | PLAYER | Summary of characters, commerce, guilds, marketplace | several | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-CHARACTERS | My characters | `/painel/personagens` | player | yes | PLAYER | Character cards; "Detalhes", "Resetar" | `GET /characters`, `POST /characters/:id/actions` | CODE_VERIFIED — **reads a portal-only table no code syncs from the game**; "Resetar" only writes an audit record | THIS_INVENTORY_ONLY |
| PF-WALLET-BALANCE | Currency balances | header dropdown, panel sidebar | player | yes | PLAYER | Shows WCoin, Blood Coin, Hunt Point balances; each links to `/recarga` | `auth` user payload, `wallet` | CODE_VERIFIED | PARTIAL (`CURRENCY_TERMINOLOGY.md`) |
| PF-RECHARGE | Buy currency (recarga) | `/recarga` | public page; checkout needs login | checkout | PLAYER | Buy WCoin / Blood Coin / Hunt Point packs in BRL via **Mercado Pago Pix** | `recharge/*`, `commerce`, `payments` | CODE_VERIFIED_RUNTIME_UNKNOWN — gated by `realMoneyPaymentsEnabled` (web) and `REAL_MONEY_PAYMENTS_ENABLED` (API); production values unknown | PARTIAL (`docs/handoff/mercadopago-recharge-payments.md`) |
| PF-VIP | VIP | `/painel/vip` | player | yes | PLAYER | Shows Prata (Silver) and Ouro (Gold) plans and benefits; "Comprar" pays from wallet balance | `vip/catalog`, `vip/benefits`, `POST /account/vip/purchase` (`vip`, `vip-sync`) | CODE_VERIFIED_RUNTIME_UNKNOWN — catalog rows and delivery worker flags unknown | PARTIAL (`context/domains/vip.md`, `DEC-VIP-001`; `docs/vip/` not on `main`) |
| PF-TRANSFER | Transfer WC | `/painel/transferencias` | player | yes | PLAYER | Send WCoin to another **account username** (not character); min 20 WC default; marketplace tax; irreversible | `wallet/transfers*` (`wallet-transfer`) | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-STORE | Official store ("Loja WCoin") | `/marketplace?mercado=oficial`, `/loja/[slug]` (`/loja`, `/painel/loja` redirect) | public browse; buy needs login | buy | PLAYER | Browse products, choose variant + destination character, buy with wallet balance | `shop/*` (`commerce`) | CODE_VERIFIED_RUNTIME_UNKNOWN (product rows unknown); raw codes like "WCOIN" leak in price labels | PARTIAL (`docs/store.md`) |
| PF-PURCHASES | My purchases | `/painel/compras` | player | yes | PLAYER | List of shop purchases | `account/purchases` | CODE_VERIFIED — does **not** list VIP purchases although the VIP page points here | THIS_INVENTORY_ONLY |
| PF-MARKET | Player marketplace | `/marketplace`, `/painel/marketplace` | public browse; actions need login | actions | PLAYER | Browse/search/buy listings, report; create/cancel own listings | `marketplace/*` | CODE_VERIFIED_RUNTIME_UNKNOWN — **no enable/disable flag exists**, always shown; game-side escrow depends on GameBridge jobs whose production state is unknown | PARTIAL (`docs/marketplace.md`, `docs/payment-and-escrow-flow.md`) |
| PF-GUILDS | Guilds | `/guilds`, `/guild/[slug]` | public browse; manage needs login + membership | manage | PLAYER | Directory, create, join with a character, invites, roles, requests, projects | `guilds/*` | CODE_VERIFIED — portal-only (uses portal characters); several tabs are "Preview" | PARTIAL (`docs/handoff/guilds-mvp.md`, `docs/product/guild/`) |
| PF-COMMUNITY | Community | `/comunidade`, `/comunidade/[username]` | public read; posting needs login | post | PLAYER | Feed, posts with media, comments, reactions, follow/block, report | `community/*`, `community/media` | CODE_VERIFIED (sections explorar/guilds/eventos/quests/conquistas are placeholders) | PARTIAL (`docs/community.md`) |
| PF-SUPPORT | Support tickets | `/painel/suporte` | player | yes | PLAYER | Open ticket (subject ≥4, message ≥10 chars), see status | `account/tickets` (`support`) | CODE_VERIFIED — **staff reply is never shown to the player** | THIS_INVENTORY_ONLY |
| PF-PRIVACY | Privacy and my data | `/painel/privacidade` | player | yes | PLAYER | View/download data (JSON); start and cancel account deletion (14-day grace) | `account/deletion/*` | **BROKEN** step: the confirmation e-mail links to `/conta/confirmar-exclusao`, a page that does not exist | THIS_INVENTORY_ONLY |
| PF-BUGHUNT | Bug Hunters | `/painel/bug-hunters` | player | yes | PLAYER (`bug-hunters.access`) | Report a problem, add info when asked | `account/bug-reports` | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-NOTIF | Notifications | `/painel/notificacoes` | player | yes | PLAYER | Lists latest CMS news/events — **not personal notifications** | `content/entries` | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-SETTINGS | Settings | `/painel/configuracoes` | player | yes | PLAYER | Language/notification preferences saved in the browser only | none | CODE_VERIFIED (cosmetic) | THIS_INVENTORY_ONLY |
| PF-NEWS | News | `/noticias` | public | no | — | Published CMS news | `content/entries?kind=NEWS` | CODE_VERIFIED_RUNTIME_UNKNOWN (entries unknown) | THIS_INVENTORY_ONLY |
| PF-GAZETA | Gazeta de Lorencia (journal) | `/gazeta` | public | no | — | Editorial "newspaper" from CMS news + events | `content/entries` (NEWS, EVENT) | CODE_VERIFIED_RUNTIME_UNKNOWN; **falls back to labelled demo stories** when the CMS is empty; several blocks always static | PARTIAL (`docs/chronicles-architecture.md`) |
| PF-WIKI | Wiki | `/wiki` | public | no | — | 9 sections / 49 topics (static tree); topic bodies from the API DB | `wiki/*` | CODE_VERIFIED_RUNTIME_UNKNOWN (DB rows unknown; API serves entries of any review status) | PARTIAL (`docs/knowledge/wiki-preparation.md`, `docs/knowledge-base-pipeline.md`) |
| PF-GUIDES | Guides | `/guias`, `/guias/[category]/[topic]` | public (only linked from the Wiki) | no | — | 2 real class guides (Fairy Elf, Dark Lord) + sets gallery; every other topic "Conteúdo não publicado" | none (static) | PLACEHOLDER (mostly) | THIS_INVENTORY_ONLY |
| PF-RANKINGS | Rankings | `/rankings` | public | no | — | Always "ainda não possui dados sincronizados" — hardcoded empty array, no API call | none | PLACEHOLDER | THIS_INVENTORY_ONLY |
| PF-DOWNLOADS | Downloads | `/downloads` | public | no | — | Launcher v1.1.0 and full client v1.1.0 via external MediaFire links; patch/extras "Em breve" | none | CODE_VERIFIED (static links; whether they still resolve is UNKNOWN) | PARTIAL (`docs/launcher/`) |
| PF-ROADMAP | Public roadmap | `/roadmap`, `/roadmap/[slug]` | public | no | — | Roadmap items and updates | `roadmap` | CODE_VERIFIED_RUNTIME_UNKNOWN | PARTIAL (`docs/roadmap.md`) |
| PF-ABOUT | About | `/about` | public | no | — | Institutional page; footer "Privacidade"/"Termos" also land here — **no privacy or terms page exists** | `content/settings` | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-DENIED | Access denied | `/acesso-negado` | public | no | — | Target of permission denials | none | CODE_VERIFIED | THIS_INVENTORY_ONLY |
| PF-LAUNCHER | Launcher (desktop app) | outside the web portal | player | launcher login | PLAYER | Game launcher with integrated login and auto-update from `update.mubloodmoon.com.br` | `launcher`, `launcher-studio` | PARTIAL — the web only links the download | PARTIAL (`docs/launcher/`, `context/domains/launcher.md`) |

## Staff features (admin-only / GM-only — never in a player answer)

| feature_id | Name | Route(s) | Role / permission | Purpose | knowledge_status |
|---|---|---|---|---|---|
| AF-GM | GM panel | `/painel/gm`, `/eventos`, `/ocorrencias[/:id]`, `/logs` | GM + `gm.*` + 2FA | Events, occurrences, operational logs. ADMIN is redirected away by default although the page text says admins can view | CODE_VERIFIED |
| AF-ACCOUNTS | Accounts / moderation | `/painel/admin/contas`, `/moderacao`, `/personagens` | `admin.accounts.*` | Accounts, roles, 2FA reset, warn/block/ban | CODE_VERIFIED |
| AF-TICKETS | Ticket desk | `/painel/admin/tickets` (not in menu) | ADMIN/SUPER_ADMIN + `admin.accounts.status.manage` | Answer and resolve tickets; GMs cannot | CODE_VERIFIED |
| AF-CMS | Content CMS | `/painel/admin/conteudo?area=` | `admin.content.manage` | Pages, banners, news, events (feeds Notícias and Gazeta) | CODE_VERIFIED |
| AF-STORE | Store admin / legacy catalog | `/painel/admin/loja`, `/catalogo-legado` | `admin.store.*` | Products, orders, deliveries, refunds; X-Shop/CashShop legacy catalog | CODE_VERIFIED |
| AF-MARKET | Marketplace admin / escrow | `/painel/admin/marketplace[/escrow]` | `admin.marketplace.view` | Listings, transactions, escrow, reports, economy config | CODE_VERIFIED |
| AF-FINANCE | Finance | `/painel/admin/financeiro` | `admin.finance.reports.view` | Purchases, recharges, risk/chargeback, reconciliation | CODE_VERIFIED |
| AF-VIP | VIP catalog admin | API only (`/admin/vip/*`) | `admin.vip.manage` | Configure VIP products — **no web screen exists** | CODE_VERIFIED |
| AF-PROGRESSION | Progression / XP calculator | `/painel/admin/progressao`, `/calculadora-progressao` | dashboard only in web; API guarded | XP/drop/reset config | CODE_VERIFIED |
| AF-COMMUNITY / AF-GUILDS | Community and guild admin | `/painel/admin/comunidade`, `/guildas` | `admin.community.view`, `admin.guilds.view` | Moderation | CODE_VERIFIED |
| AF-OBS | Observability | `/painel/admin/erros`, `/alertas`, `/auditoria`, `/historico`, `/eventos-operacionais`, `/exportacoes`, `/logs-trabalho`, `/retencao` | `admin.*` per page | Errors, alerts, audit, history, retention | CODE_VERIFIED |
| AF-OPS | Tasks, reports, roadmap admin, launcher studio, bug triage, beta rewards, events | various `/painel/admin/*` | `admin.*` per page | Internal operations | CODE_VERIFIED |
| AF-SYSTEM | "Sistema" | `/painel/admin/sistema` | `admin.server-settings.manage` | Browser-local "management base" export/import — **not** server settings | CODE_VERIFIED |

## Audit totals

79 page files at `1c272db`: 31 outside `/painel` (including 6 pure
redirects), 13 player-panel, 5 GM, 30 admin. 40+ API modules (full list
in the evidence audit, section E).
