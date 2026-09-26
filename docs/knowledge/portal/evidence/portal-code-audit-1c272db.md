---
status: ACTIVE
category: knowledge
audience: internal (engineering + Blood Moon AI) — INTERNAL_SYSTEM, never player-facing
lastVerified: 2026-09-26
sourceCommit: 1c272db (last evidenced production deploy, 2026-09-14)
---

# Portal code audit at `1c272db` (evidence)

> Evidence record for `BLOODMOON-AI-07`. A read-only code audit of commit `1c272db`, paths relative to `apps/`. Read the cited code with `git show 1c272db:apps/<path>`. Critical claims (deletion link, rankings, Pix-only Mercado Pago, no marketplace flag, Bronze hidden in the web) were re-checked by hand. Runtime facts (env values, DB rows) are UNKNOWN here by design. Contains internal security observations (section F) — `SECURITY_PRIVATE` for any player-facing use.


- **Source:** a detached worktree at `1c272db`, the commit recorded as deployed to production on 2026-09-14.
- **Scope:** `apps/web` (Nuxt) and `apps/api` (NestJS). All paths below are relative to `apps/`.
- **Method:** everything here comes from reading the source only. Nothing was run, and no network calls were made.
- **UNKNOWN** marks runtime facts that code cannot answer. Examples: production environment values, and which rows exist in the production database.

---

## (A) Auth and role model

### A.1 Roles

- **Roles:**
  - Backend enum: `PLAYER < GM < ADMIN < SUPER_ADMIN` (`api/src/modules/auth/permissions.ts:3`).
  - Frontend equivalents: `player | gm | admin | super-admin` (`web/data/security.ts:122`).
  - Mapping: `web/features/auth/role-from-api.ts:17-19`. An unknown role falls back to `player`.
- **Role → permission sets:** each side defines the same sets.
  - Backend: `api/src/modules/auth/permissions.ts:219-253`.
  - Frontend mirror: `web/data/security.ts:131-166`.
  - **PLAYER:**
    - `account.manage`, `characters.manage`
    - `shop.access`, `marketplace.access`, `community.access`, `recharge.access`, `guilds.access`, `bug-hunters.access`
  - **GM:** PLAYER plus:
    - `gm.dashboard.view`, `gm.characters.view`, `gm.guilds.view`
    - `gm.operational-logs.view`, `gm.occurrences.view`, `gm.occurrences.manage`, `gm.events.view`
  - **ADMIN:** PLAYER plus `guides.future.view`, `admin.dashboard.view`, `gm.events.view`.
    - ADMIN does **not** get any other `admin.*` permission by default.
    - A SUPER_ADMIN must delegate the other `admin.*` permissions per account (`permissions.ts:205`, `permissionsForAccount` at `:260-274`).
  - **SUPER_ADMIN:** `['*']`.
  - GM extras (`gm.events.execute/cancel/results.validate`) are delegable only (`permissions.ts:213-217`).
- **Permission catalogue:**
  - Web: 118 keys in `web/data/security.ts:1-119`.
  - API: `api/src/modules/auth/permissions.ts:21-198`.
  - **API-only keys missing from the web list:**
    - `admin.vip.manage`, `admin.vip-sync.view/manage`
    - `admin.progression.view/edit/sync`
    - `admin.game-provisioning.view/manage`
    - `admin.beta-lifecycle.manage`
- **How the client checks a permission:** `hasPermission` (`web/composables/useAuth.ts:510-514`).
  - It first uses the explicit `permissions[]` list returned by `/auth/login` or `/auth/refresh`.
  - Only when that list is empty does it fall back to the static role table.
- **Backend guards:**
  - `JwtAuthGuard` authenticates the request.
  - `RolesGuard` (`api/src/modules/auth/roles.guard.ts:27-41`) does two things:
    - It rejects the wrong role.
    - It rejects any non-PLAYER without 2FA, with `TWO_FACTOR_SETUP_REQUIRED` and the message "Ative a autenticacao em duas etapas para acessar esta area".
  - `PermissionsGuard` (`api/src/modules/auth/permissions.guard.ts:24`) requires **all** listed permissions, or `*`.
- **Session storage (client):**
  - localStorage key `blood-moon-auth` holds the tokens.
  - Cookie `blood-moon-auth-state` holds the user object including role and permissions (`useAuth.ts:124-129,176-198`). It is set via `useCookie` and is not httpOnly.
  - Session length is 24h for players and 8h for GM/admin (`useAuth.ts:81-87`).
  - The token refreshes after 10 min (`useAuth.ts:269-274,303-305`).

### A.2 Route middleware: `web/middleware/auth.global.ts`

The middleware runs on every route, and the rules are applied in this order:

1. **Login required:** any path starting with `/painel` while logged out redirects to `/login?redirect=<fullPath>` (`:44-46`). **No other prefix requires login.** Public pages such as `/recarga`, `/marketplace`, `/guilds` and `/comunidade` are not login-gated by middleware.
2. **2FA required:** on `/painel/admin*` or `/painel/gm*`, a user whose role is not player and who has `twoFactorEnabled` false is redirected to `/painel/conta` (`:51-58`). This is UX only, because the backend enforces the same rule in RolesGuard.
3. **Admin area:** `/painel/admin*` without `admin.dashboard.view` redirects to `/painel/conta` (`:60-62`).
4. **GM area:** `/painel/gm*` without `gm.dashboard.view` redirects to `/painel/conta` (`:64-66`).
5. **Per-prefix permission** (first `startsWith` match, `:68-71`). A missing permission redirects to `/acesso-negado?retorno=/painel`. The prefixes come from:
   - The admin map at `:4-31`.
   - The GM map at `:33-38`.
   - The full map is reproduced in table C.

- **Admin pages with no entry in the prefix map** need only `admin.dashboard.view` on the client side. They are:
  - `/painel/admin/catalogo-legado`
  - `/painel/admin/progressao`
  - `/painel/admin/calculadora-progressao`
- **ADMIN is locked out of `/painel/gm`:** the ADMIN role lacks `gm.dashboard.view`, so rule 4 redirects ADMIN (without a delegated override) to `/painel/conta`.
  - This contradicts `web/pages/painel/gm/index.vue:15-18`, which says ADMIN may view the GM panel.

---

## (B) Navigation menus (as rendered)

### B.1 Public header: `web/components/layout/SiteHeader.vue`

The layout (`web/layouts/default.vue:3,7`) renders `SiteHeader` and `SiteFooter`.

**Main nav** (`:179-190`). It is always visible and has no role or login conditions. The desktop menu appears at the `xl` breakpoint; below that the same list shows in a mobile drawer (`:191`).

| Label | Target |
|---|---|
| Home | `/` |
| Notícias | `/noticias` |
| Gazeta | `/gazeta` |
| Wiki | `/wiki` |
| Ranking | `/rankings` |
| Downloads | `/downloads` |
| Roadmap | `/roadmap` |
| Marketplace | `/marketplace` |
| Comunidade | `/comunidade` |
| Sobre | `/about` |

**Other header items:**

- **Discord button:** `href="#"`, a dead link (`:17`).
- **Logged out:** "Entrar" (`/login`) and "Criar conta" (`/registrar`) (`:57-58`).
- **Logged in:** an "Ola, {name}" dropdown (`:18-53`, `accountLinks` `:214-221`) containing:
  - "Painel administrativo" (`/painel`). Shown only if the user has `admin.dashboard.view`.
  - "Personagens" (`/painel/personagens`)
  - "Minha conta" (`/painel/conta`)
  - "Loja" (`/painel/loja`), which redirects to `/marketplace?mercado=oficial`
  - One row per currency balance (label and value), each linking to `/recarga` (`:36-45`)
  - "Sair"
- The mobile drawer adds a locale selector (`:96-106`).

### B.2 Footer: `web/components/layout/SiteFooter.vue:44-79`

| Label | Target |
|---|---|
| Início | `/` |
| Informações | `/about` |
| Downloads | `/downloads` |
| Rankings | `/rankings` |
| Notícias | `/noticias` |
| Gazeta | `/gazeta` |
| Roadmap | `/roadmap` |
| Discord | `/comunidade` (not Discord) |
| Comunidade | `/comunidade` |
| Mercado de jogadores | `/marketplace` |
| Loja oficial | `/marketplace?mercado=oficial` |
| Central de ajuda | `/about#contato` |
| Regras do servidor | `/wiki` |
| Política de privacidade | `/about` (no privacy page exists) |
| Termos de uso | `/about` (no terms page exists) |
| Reportar jogador | `/comunidade` |
| Criar conta | `/registrar` |
| Painel do usuário | `/painel` |
| Recuperar senha | `/recuperar-conta` |
| **Doações** | `/recarga` |
| Entrar | `/login` |

### B.3 Panel sidebar: `web/components/layout/ManagementShell.vue`

The sidebar is used by every `/painel/*` page. Items are filtered by role and permission (`:333-347`).

**PLAYER** (`playerItems`, `:298-316`), in order:

| Label | Target | Note |
|---|---|---|
| Dashboard | `/painel` | player only |
| Minha conta | `/painel/conta` | |
| Meus personagens | `/painel/personagens` | |
| Loja | `/painel/loja` | |
| Marketplace | `/painel/marketplace` | |
| Comunidade | `/comunidade` | |
| Meu perfil social | `/comunidade?painel=perfil` | The query key `painel` is ignored; the page reads `section` (`pages/comunidade/index.vue:122`). |
| Guildas | `/guilds` | |
| Minhas compras | `/painel/compras` | |
| **Transferir WC** | `/painel/transferencias` | |
| **VIP** | `/painel/vip` | |
| Meus anúncios | `/painel/marketplace?visao=meus-anuncios` | |
| Notificações | `/painel/notificacoes` | |
| Suporte | `/painel/suporte` | |
| Privacidade e meus dados | `/painel/privacidade` | |
| Bug Hunters | `/painel/bug-hunters` | |
| Configurações | `/painel/configuracoes` | |

VIP and Transferir WC appear **only** in this player sidebar, never in the public header.

**GM** (`gmItems`, `:318-331`):

| Label | Target | Condition |
|---|---|---|
| Painel GM | `/painel/gm` | `gm.dashboard.view` and role gm |
| Eventos | `/painel/gm/eventos` | |
| Ocorrências | `/painel/gm/ocorrencias` | |
| Logs operacionais | `/painel/gm/logs` | |
| Minha conta | `/painel/conta` | |
| Meus personagens | `/painel/personagens` | |
| Comunidade | `/comunidade` | |
| Guildas | `/guilds` | |
| Notificações | `/painel/notificacoes` | |
| Suporte | `/painel/suporte` | |
| Bug Hunters | `/painel/bug-hunters` | |
| Configurações | `/painel/configuracoes` | |

**ADMIN and SUPER_ADMIN** (`administrativeItems`, `:142-296`). Each child is gated by the permission noted. Parents with no visible children are hidden.

- **Dashboard:** `/painel`
- **Gestão:**
  - Tarefas
  - Notificações
  - Minha atividade
- **Roadmap:**
  - Iniciativas
  - Atualizações
  - Categorias
  - Revisões
- **Loja:**
  - Produtos, Categorias, Variantes
  - Pedidos, Entregas, Estornos
  - Importação do catálogo
  - "Catálogo legado (X-Shop/CashShop)" (`:177`)
- **Marketplace:**
  - Anúncios, Transações, Escrow
  - Denúncias, Usuários suspensos
  - Configurações econômicas
- **Comunidade:** 8 tabs
- **Guildas:** 14 tabs
- **Eventos:** `/painel/admin/eventos`
- **Bug Hunters**
- **Launcher Studio**
- **Monitoramento:** Central de erros, Falhas de entrega, Falhas de marketplace, Alertas
- **Auditoria:** 4 items
- **Relatórios:** 6 categories
- **Configurações:** super-admin only (`:286`)
  - Permissões, Administradores, Moedas
  - Integrações, Configurações gerais
  - Recompensas de Beta

**Not linked from any menu:**

- `/painel/admin/progressao`
- `/painel/admin/calculadora-progressao`
- `/painel/admin/moderacao`
- `/painel/admin/tickets`
- `/painel/admin/personagens`
- `/painel/admin/conteudo`
- `/painel/admin/marketplace/escrow`
- `/guias/*` (reachable only from `wiki.vue:869`)
- `/dev/test-personas`

**Currency rows:** the sidebar also shows the account's currency rows, each linking to `/recarga` (`:75-85`).

---

## (C) Page inventory (79 `.vue` files)

**Column key:**

- **Auth:**
  - "public" means the middleware does not require login.
  - "login" means the `/painel` prefix applies.
  - "admin+X" means `admin.dashboard.view` plus the prefix permission X, with 2FA mandatory for non-players.
- **API:** endpoints resolved through the page's composables, method GET unless stated.
- **Flags:** none of the pages use a `marketplaceEnabled` flag; no such flag exists in web or API. The only client flag is `realMoneyPaymentsEnabled` (`web/nuxt.config.ts:8`).

### C.1 Public pages

| # | Route | Auth | Title/heading (rendered) | Purpose | Main actions | API calls | Flags / notes |
|---|---|---|---|---|---|---|---|
| 1 | `/` (index.vue) | public | h1 "Uma nova era sob a Lua de Sangue." (`:12`) | Landing page: server config, differentiators, latest news | "Jogar agora" → `/registrar`; "Conhecer o servidor"; Discord or `/comunidade` | `/content/entries?kind=NEWS&pageSize=3`, `/content/settings`, `/launcher/bootstrap` (`:130-132`) | Hardcoded `fallbackNews` ("Notas de patch 0.5", "Prévia do evento de lançamento") always fills the secondary news slots (`:134-139`). Status is shown only if `statusSource==='MANUAL'` (`:154-168`). |
| 2 | `/about` | public | "Sobre o Blood Moon" (`:3`) | Institutional page: portal areas and official channels | Links; social links taken from settings | `/content/settings` (`:56`) | "Versão: Season 6" is hardcoded (`:77`) |
| 3 | `/acesso-negado` | public | "Acesso negado" (`:6`) | Target for permission denials | "Voltar ao painel" (sanitized `retorno`) | none | |
| 4 | `/admin/community` | public → redirect | none | Redirects to `/painel/admin/comunidade` | | | redirect `:3` |
| 5 | `/admin/reports` | public → 301 | none | Redirects to `/painel/admin/relatorios` | | | |
| 6 | `/admin/roadmap` | public → 302 | none | Redirects to `/painel/admin/roadmap` | | | |
| 7 | `/admin/store` | public → redirect | none | Redirects to `/painel/admin/loja` | | | |
| 8 | `/admin/tasks` | public → 301 | none | Redirects to `/painel/admin/tarefas` | | | |
| 9 | `/comunidade` (index) | public (feed); actions need a token | h1 "O ponto de encontro dos jogadores" (`:10`) | Social feed (Para você / Seguindo / Recentes), saved posts | Post, edit, delete, react, save, repost, comment, report, load more | `/community/feed[/authenticated]`, `POST /community/posts`, `/community/posts/:id[/authenticated]`, `PATCH`/`DELETE` posts and comments, `POST /community/reactions`, save, repost, `/community/profiles/:u[/authenticated]` (`useCommunityApi.ts:31-57`) | Sections `explorar/guilds/eventos/quests/conquistas` render `CommunityPlaceholderView` (`:64,120`). Search and notifications buttons are disabled with "ainda não disponível" (`CommunitySubheader.vue:38-39`). |
| 10 | `/comunidade/[username]` | public | Profile header component | Public social profile | Edit own profile, follow/block (component) | `/community/profiles/:u`, `PATCH /community/me` (`:53,78`) | |
| 11 | `/comunidade/perfil/[username]` | public → redirect | none | Redirects to `/comunidade/:username` | | | |
| 12 | `/dev/test-personas` | public (backend-gated) | "Test Personas" (`:48`) | Dev fixture persona switcher | Activate persona, reset fixtures | `/test-personas/available`, `POST /test-personas/activate`, `POST /test-personas/reset` | The API returns 404 unless `NODE_ENV` is development or test and the DB is allow-listed (`api/.../test-personas.env.ts:15-19`) |
| 13 | `/downloads` | public | "Downloads" (`:3`) | Client and launcher downloads | Download buttons (external `target=_blank`) | none | Hardcoded MediaFire URLs (`:50,57`). Patch and "Extras" show "Em breve" (`:59-60`). |
| 14 | `/gazeta` | public | Masthead; SEO "Gazeta de Lorencia \| Blood Moon" (`:96`) | Editorial "newspaper" of the world | Category filter | `/content/entries?kind=NEWS` and `?kind=EVENT` via `useChronicles` (`useChronicles.ts:80-83`) | Falls back to DEMO stories when the CMS is empty (`:109-111`); see D.a |
| 15 | `/guias` | public (not in nav) | "Guias" (`:3`) | Guide category grid | Links to `/guias/:cat/:topic` | none (static locale data) | See D.b |
| 16 | `/guias/[category]/[topic]` | public | Character name h1 or topic title | Character guides, sets gallery, or "Conteúdo não publicado" | Filters (sets) | none (static data) | Future classes are locked unless the user is admin (`:367-370`) |
| 17 | `/guild/[slug]` | public (view); manage needs login plus membership | GuildProfileHeader | Guild profile with tabs | Edit, disband (leader), join, leave, invite, kick, change role, requests, projects | `/guilds/:slug` plus the `/guilds/:slug/*` family (`useGuildsApi.ts:24-67`) | Tabs Tesouraria/Cofre/Feed/Eventos/Guias/Conquistas/Estatísticas/Alianças are marked `preview: true` (`GuildProfileTabs.vue:317-324`) |
| 18 | `/guilds` | public | "Guildas" (`:5`) | Guild directory | "Criar guilda" (only if logged in, `:11`), filters, paging | `/guilds?…` (`:160`), `POST /guilds` | |
| 19 | `/login` | public | "Login" (`t('login')`) | Sign in | Submit; 2FA/recovery toggle | `POST /auth/login` (`useAuth.ts:324`) | Turnstile; see D.g |
| 20 | `/loja` (index) | public → 301 | none | Redirects to `/marketplace?mercado=oficial` | | | |
| 21 | `/loja/[slug]` | public (buy needs login) | Product name h1 (`:12`) | Official store product detail | Pick variant, pick destination character, "Comprar" | `/shop/products/:slug`, `/characters`, `POST /shop/purchases` (`useStoreApi.ts:142-144`) | Price is shown with the raw currency code (`:25`), for example "WCOIN" |
| 22 | `/marketplace` | public (buy/report need login) | h1 "Mercado Blood Moon" (`:12`) | Player marketplace plus the "Loja WCoin" official catalog tab | Switch tab, search, filter, sort, buy (`createOrder`), report | `/marketplace/listings`, `POST /marketplace/orders`, `POST /marketplace/reports`, `/shop/products`, `/shop/categories` (`:393,421-428,476,498`) | No enable/disable flag; see D.l |
| 23 | `/noticias` | public | "Noticias" (`:3`) | List of published CMS news | none | `/content/entries?kind=NEWS&pageSize=60` (`:24`) | Empty-state text "Nenhuma noticia publicada no momento." |
| 24 | `/rankings` | public | "Rankings" (`:3`) | Ranking tabs | Tab buttons | **none** | Rows always come from an empty static array (`useLocale.ts:23,409`), so the page always shows "O ranking ainda não possui dados sincronizados pelo servidor." (`:13`) |
| 25 | `/recarga` | public (checkout needs a user) | "Recarga de moedas" (`:7`) | Buy currency packs for BRL via Pix | Choose currency and pack, "Pagar com Pix", copy Pix code | `/recharge/packages`, `POST /recharge/intents`, `POST /recharge/intents/:id/checkout`, poll `/recharge/intents/:id` every 4s (`:159,188-189,214`) | Gated by `realMoneyPaymentsEnabled` (`:117,67`); see D.d |
| 26 | `/recuperar-conta` | public | "Recuperar conta" (`:5`) | Request a password reset email | "Enviar link de recuperacao" | `POST /auth/password-recovery/request` | Turnstile; see D.g |
| 27 | `/redefinir-senha` | public | "Redefinir senha" (`:5`) | Set a new password from the emailed token | "Redefinir senha" | `POST /auth/password-recovery/reset` | See D.g |
| 28 | `/registrar` | public | "Registrar" (`t('register')`) | Create an account | "Criar conta" | `POST /auth/register` (`:164`) | Turnstile |
| 29 | `/roadmap` | public | Title from API (`:8`) | Public roadmap | Links to detail | `/roadmap` (`:92`) | |
| 30 | `/roadmap/[slug]` | public | Item title (`:11`) | Roadmap item and its updates | none | `/roadmap/:slug` (`:33`) | 404 if missing |
| 31 | `/wiki` | public | "Wiki Blood Moon" (`:8`) | Knowledge base (9 sections) | Search, section/topic navigation, sets/equipment browsers | `/wiki/characters`, `/wiki/entries`, `/wiki/equipment/sets`, `/wiki/equipment/missing-references` (`:2054,2076,2102,3099-3113`) plus static data files | See D.b |

### C.2 Player panel (`/painel/*`, login required)

| # | Route | Auth | Title/heading | Purpose | Main actions | API calls | Flags / notes |
|---|---|---|---|---|---|---|---|
| 32 | `/painel` (index) | login | Role dashboard: "Olá, {name}" / "Painel Game Master" / "Dashboard administrativo" / super-admin strategic | Role-specific dashboard (`:3-6`) | Varies by dashboard | Player dashboard uses characters, commerce, guilds and marketplace APIs; admin uses `/admin/dashboard/*`; GM uses `/gm/dashboard` | |
| 33 | `/painel/bug-hunters` | login | "Relatar um problema" (`:6`) | Player bug reports | Submit report, open report, add info when status is `NEEDS_INFO` | `/account/bug-reports` (GET/POST), `/account/bug-reports/:id`, `POST …/:id/info` | API requires `bug-hunters.access` (`bug-hunters.controller.ts:15`) |
| 34 | `/painel/compras` | login | "Minhas compras" | Shop purchase list | none | `/account/purchases` | Does **not** list VIP purchases, although vip.vue points there (see F) |
| 35 | `/painel/configuracoes` | login | "Configuracoes" (`:4`) | Language and notification preferences | "Salvar preferencias" | none; localStorage `blood-moon-preferences` only (`:17-18`) | Cosmetic only |
| 36 | `/painel/conta` | login | "Gerenciar conta" (`:6`) | Profile, password, 2FA, sessions, prepared purchases and recharges | Change password; 2FA setup, verify, disable; regenerate recovery codes; revoke sessions (with step-up) | `/account/profile`, `POST /auth/change-password`, `/auth/2fa/*`, `/auth/step-up`, `/account/sessions`, `/account/sessions/revoke`, `PATCH /account/sessions/:id/revoke`, `/account/purchases`, `/account/recharges` | Placeholder fallbacks are shown when data is missing (see F) |
| 37 | `/painel/loja` | login → redirect | none | Redirects to `/marketplace?mercado=oficial` (`:4`) | | | |
| 38 | `/painel/marketplace` | login | "Meus anuncios" (`:7`) | Create and cancel listings; see own orders | "Anunciar item" (name, category, price, currency), cancel | `/account/marketplace/listings`, `/account/marketplace/orders`, `POST /marketplace/listings`, `DELETE /marketplace/listings/:id` (`:153-176`) | Currency options: WCOIN / "Blood Coin" / HUNT_POINT (`:42-44`) |
| 39 | `/painel/notificacoes` | login | "Notificações" | Lists the latest CMS NEWS and EVENT entries | none | `/content/entries?kind=NEWS`, `?kind=EVENT` | Not personal notifications |
| 40 | `/painel/personagens` | login | "Gerenciar personagens" (`:6`) | Character cards | Search/filter, "Detalhes", "Resetar" | `/characters`, `POST /characters/:id/actions` | See D.h |
| 41 | `/painel/privacidade` | login | "Privacidade e meus dados" (`:6`) | Data export and self-service deletion | View data, download JSON, start deletion, cancel deletion, open ticket | `/account/deletion/status`, `/account/deletion/export`, `POST /account/deletion/request`, `POST /account/deletion/cancel`, `POST /account/tickets` | See D.k |
| 42 | `/painel/suporte` | login | "Suporte" (`:2`) | Support tickets | "Abrir ticket" (subject, message) | `/account/tickets`, `POST /account/tickets` | See D.j |
| 43 | `/painel/transferencias` | login | "Transferir WC" (`:6`) | Direct WC transfer to another account | "Revisar e confirmar" | `/wallet/transfers/fee-info`, `/wallet/transfers/history`, `POST /wallet/transfers` | See D.e |
| 44 | `/painel/vip` | login | "VIP" (`:6`) | Buy VIP with WC | "Comprar" per plan | `/vip/catalog`, `/vip/benefits`, `/account/vip`, `POST /account/vip/purchase` | See D.c |

### C.3 GM panel (`/painel/gm*`, login plus `gm.dashboard.view` plus 2FA)

| # | Route | Auth | Title/heading | Purpose | Main actions | API calls | Flags / notes |
|---|---|---|---|---|---|---|---|
| 45 | `/painel/gm` | gm.dashboard.view | "Painel Game Master" | GM dashboard (rendered for gm/admin/super-admin roles, `:18`) | none | `/gm/dashboard` | ADMIN is redirected by middleware (see A.2) |
| 46 | `/painel/gm/eventos` | + gm.events.view | "Eventos" (`:5`) | Event agenda and runs | Start/end, cancel, report problem, submit/validate result (permission-gated `:110-112`) | `/gm/events/agenda`, `/gm/events/runs*` | |
| 47 | `/painel/gm/logs` | + gm.operational-logs.view | "Logs operacionais" | GM logs | Filter | `/gm/logs` | |
| 48 | `/painel/gm/ocorrencias` | + gm.occurrences.view | "Ocorrências" | Occurrence list | Create/filter | `/gm/occurrences` | |
| 49 | `/painel/gm/ocorrencias/[id]` | + gm.occurrences.view | SEO "Ocorrência GM" | Occurrence detail | Add notes, update | `/gm/occurrences/:id`, `…/notes` | |

### C.4 Admin panel (`/painel/admin*`, login plus `admin.dashboard.view` plus 2FA plus prefix permission)

| # | Route | Prefix permission (`auth.global.ts` line) | Title/heading | Purpose | API calls | Notes |
|---|---|---|---|---|---|---|
| 50 | `/painel/admin/alertas` | admin.alerts.view (`:23`) | SEO "Alertas criticos" | Critical alerts | `/admin/alerts*` | manage needs `admin.alerts.manage` |
| 51 | `/painel/admin/auditoria` | admin.audit.view (`:17`) | SEO "Ações administrativas" | Admin action audit | `/admin/observability/audit` | |
| 52 | `/painel/admin/beta-rewards` | admin.beta-rewards.view (`:30`) | "Recompensas de Beta" | Beta participation and reward generation | `/admin/beta-rewards/*` | |
| 53 | `/painel/admin/bug-hunters` | admin.bug-hunters.view (`:29`) | "Triagem de relatos" | Bug triage | `/admin/bug-reports*` | |
| 54 | `/painel/admin/calculadora-progressao` | **none** (dashboard only) | "Calculadora de XP (fundação estrutural)" | XP calculator | `/admin/progression/calculator/*` | Not in menu or prefix map |
| 55 | `/painel/admin/catalogo-legado` | **none** (dashboard only) | "Catálogo legado (X-Shop / CashShop)" | Legacy in-game shop catalog config | `/admin/store/legacy-catalog*` | The menu gates it by `admin.store.legacy-catalog.view`; the middleware does not |
| 56 | `/painel/admin/comunidade` | admin.community.view (`:10`) | CommunityAdminManager | Community moderation | `/admin/community/*` | |
| 57 | `/painel/admin/contas` | admin.accounts.view (`:5`) | "Contas" | Accounts, roles, permissions, 2FA reset | `/admin/accounts*` | |
| 58 | `/painel/admin/conteudo` | admin.content.manage (`:7`) | Area title (Páginas/Banners/…/Notícias/Eventos) (`:24`) | CMS editor (`?area=`) | `/admin/content/*` | This is where NEWS/EVENT entries for Notícias and Gazeta are authored |
| 59 | `/painel/admin/erros` | admin.errors.view (`:22`) | SEO "Central de erros" | Error center | `/admin/errors*` | |
| 60 | `/painel/admin/eventos` | gm.events.view (`:27`) | "Eventos" (`:7`) | Event definitions and schedules | `/gm/events/definitions*` | ADMIN role has this by default |
| 61 | `/painel/admin/eventos-operacionais` | admin.operational-logs.view (`:20`) | "Eventos comerciais" | Commerce/ops event log | `/admin/observability/events` | |
| 62 | `/painel/admin/exportacoes` | admin.logs.export (`:21`) | SEO "Exportações de logs" | Log exports | `/admin/observability/exports` | |
| 63 | `/painel/admin/financeiro` | admin.finance.reports.view (`:6`) | "Financeiro" | Purchases, recharges, risk and chargeback, reconciliation | `/admin/finance/*` | |
| 64 | `/painel/admin/guildas` | admin.guilds.view (`:26`) | "Guildas Admin" | Guild admin | `/admin/guilds*` | |
| 65 | `/painel/admin/historico` | admin.audit.history.view (`:18`) | SEO "Histórico de alterações" | Entity change history | `/admin/observability/history/:type` | |
| 66 | `/painel/admin/launcher-studio` | admin.launcher.content.read (`:28`) | "Editor visual do Launcher" | Launcher CMS | `/admin/launcher-studio/*` | |
| 67 | `/painel/admin/logs-trabalho` | admin.work-logs.view (`:19`) | "Logs de trabalho" | Admin work logs | `/admin/observability/work-logs` | |
| 68 | `/painel/admin/loja` | admin.store.view (`:8`) | "Loja Admin" | Official store admin | `/admin/store/*`, `/admin/shop/*` | |
| 69 | `/painel/admin/marketplace` | admin.marketplace.view (`:9`) | MarketplaceAdminManager | Marketplace admin | `/admin/marketplace/*` | |
| 70 | `/painel/admin/marketplace/escrow` | admin.marketplace.view (prefix `:9`) | Same manager, escrow tab | Escrow operations | `/admin/marketplace/escrow*` | |
| 71 | `/painel/admin/moderacao` | admin.accounts.status.manage (`:13`) | "Moderacao" | Warn/block/ban accounts | `/admin/moderation` (GET/POST), `/admin/accounts` | Not in menu |
| 72 | `/painel/admin/personagens` | admin.accounts.view (`:15`) | "Personagens" | Stub linking to `/painel/admin/contas` | none | |
| 73 | `/painel/admin/progressao` | **none** (dashboard only) | "Progressão (XP / Drop / Reset / Master Reset)" | Progression config | `/admin/progression*` | Not in menu or prefix map |
| 74 | `/painel/admin/relatorios` | admin.reports.view (`:12`) | "Central de relatórios" | Reports | `/admin/reports*` | |
| 75 | `/painel/admin/retencao` | admin.retention.manage (`:24`) | SEO "Politica de retencao" | Log retention policy | `/admin/observability/retention*` | |
| 76 | `/painel/admin/roadmap` | admin.roadmap.view (`:16`) | "Roadmap Admin" | Roadmap CMS | `/admin/roadmap*` | |
| 77 | `/painel/admin/sistema` | admin.server-settings.manage (`:25`) | "Sistema" (`:6`) | Export/import/reset of a **localStorage** "management" base | none (useManagement, local) | Not server-backed (`:76-110`) |
| 78 | `/painel/admin/tarefas` | admin.tasks.view (`:11`) | "Central de tarefas" | Admin task board | `/admin/tasks*` | |
| + | `/painel/admin/tickets` | admin.accounts.status.manage (`:14`) | "Tickets" | Answer and resolve tickets | `/admin/tickets`, `PATCH /admin/tickets/:id` | Not in menu |

**File count:** at `1c272db`, `find apps/web/pages -name '*.vue'` returns **79** files, not the 78 the brief assumed.
- 31 are outside `/painel`.
- 13 are player panel pages.
- 5 are GM pages.
- 30 are admin pages; the `+` row covers `/painel/admin/tickets`.

---

## (D) Investigations

### a. `gazeta/index.vue` and `noticias.vue`: news and journal

Both features are real, and both are fed by the **same CMS**: `GET /content/entries`. The public filter is `status: 'PUBLISHED'` (`api/src/modules/content/content.service.ts:19`, controller `content.controller.ts:5-19`). Admins author the entries in `/painel/admin/conteudo?area=noticias|eventos`.

- **`/noticias`:**
  - Shows `kind=NEWS` entries, up to 60 (`noticias.vue:24`).
  - If there are none, it shows "Nenhuma noticia publicada no momento." (`:12`).
  - No fake content.
- **`/gazeta` ("Gazeta de Lorencia"):**
  - Loads NEWS (36) and EVENT (24) entries and normalizes them into "stories" with a category (`useChronicles.ts:79-90`).
  - **If the CMS returns zero entries, it renders demo stories** from static data (`data/chronicles.demo.ts`): 4 stories such as "Selupan cai novamente" and 3 periods ("Ontem/Esta semana/Este mês no Blood Moon").
  - In demo mode it shows the notice "Esta edição apresenta o formato da Gazeta. As histórias abaixo são demonstrações editoriais e não foram geradas por telemetria do jogo." (`gazeta/index.vue:11-14,109-111`).
  - These parts are **always static placeholders** regardless of the CMS:
    - The "O tempo no Blood Moon" periods (`chronicleDemoPeriods`, `:46-50`).
    - "Crônicas da temporada" (`seasonMoments`, `:131-139`).
    - "Ouvir a Gazeta" and "Retrospectiva da temporada", which are future-feature cards (`:54-59,80-85`).
- **Whether real CMS news exists in production:** UNKNOWN (it depends on DB rows).
- **Home page:** it pads with hardcoded `fallbackNews` (`index.vue:134-139`).
- **Unused fictional news:** `useLocale.ts:144` (and `data/site.ts:57-76`) contain fictional news ("Ajustes fictícios…"). Neither `noticias` nor `gazeta` renders them; they are exposed via the store `news` (`stores/site.ts:9`), which is not used by any page.

### b. `wiki.vue` and `guias/*`: where the content comes from

**Wiki (`/wiki`, 3,366 lines):**

- **Section and topic tree:** static, from the locale dictionary. There are 8 pt-BR categories (`composables/useLocale.ts:164-173`) plus a hardcoded "Tutoriais" section (`wiki.vue:1724-1728`), for 9 sections.
  - Personagens: 7 classes, Dark Knight to Rage Fighter
  - Equipamentos: 7 topics
  - Fórmulas: 3
  - Builds: 4
  - Chaos Machine: 5
  - Mapas e PvM: 5
  - Eventos: 6
  - Quests e NPCs: 4
  - Tutoriais: 8
  - Total: 49 topics.
- **Topic body:** from the API, `useWikiApi` → `/wiki/entries?kind=…&search=…`, `/wiki/characters`, `/wiki/equipment/sets`, `/wiki/equipment/missing-references` (`wiki.vue:2054,2076,2102,3099-3113`; mapping `:1860-1920`).
  - The backend reads the DB tables `knowledgeEntry`, `gameCharacter`, `equipmentRecord` and similar (`api/src/modules/wiki/wiki.service.ts:205-217,268-269,289,336-367`).
  - The entries are "coletados" reference data; the page copy itself says content is collected.
- **Static data bundled into the page** (`wiki.vue:1356-1372`):
  - `data/guiamuonlineItems.ts`
  - `data/muEquipmentCatalog.ts`
  - `data/muFullSetImages.generated.json`
  - `references/game-data/muonlinefanz-ancient-items-data.json`
  - `data/equipmentOptionRules.ts`
  - `data/guiamuReferences.ts`
- **Season:** fixed to 6 (`:1296-1300`). The season selector is visible only to admins.
- **No status filter:** `/wiki/entries` applies no `status` filter (`wiki.service.ts:243-265`), so entries of any review status are served. Whether the production DB is populated is UNKNOWN.

**Guias (`/guias`, `/guias/:category/:topic`):**

- The category grid uses the same 8 locale categories, for 38 links (`guias/index.vue:5-26`). It makes no API call.
- **Topic page** (`[topic].vue`) makes no API call either:
  - **2 character guides** with hardcoded rich content: `fairy-elf` (alias `elfa`) and `dark-lord` (`:812-854`).
  - The **sets gallery** at `/guias/equipamentos/sets` is built from static `data/devReferenceAssets.ts` (`:436-486`).
  - Future classes (`grow-lancer`, `rune-mage`, `slayer`, `gun-crusher`, `white-wizard`, `mage`) are locked for non-admins with "Guia bloqueado temporariamente" (`:367-370`, template `:3-18`).
  - **Every other topic** renders "Conteúdo não publicado — A administração ainda não publicou informações verificadas para este tópico." (`:317-328`).
- `/guias` is not in any nav. It is linked only from `wiki.vue:869`.

### c. `painel/vip.vue` and `apps/api/src/modules/vip`

- **Tiers:** Prisma enum `VipTier { BRONZE SILVER GOLD }` (`api/prisma/schema.prisma:2656-2660`).
  - GameServer mapping: `TIER_TO_LEVEL = { BRONZE:1, SILVER:2, GOLD:3 }` (AccountLevel; `vip/game-bridge-vip.gateway.ts:32`, `vip-sync/vip-sync.service.ts:28`).
- **Bronze:**
  - Technically supported by the API: it is in the enum, in benefit configs (`vip.service.ts:289`) and in bridge mappings.
  - **The web page hides it:** `const tiers: VipTier[] = ['SILVER','GOLD']`. The page comment says "BRONZE not offered to players" (`vip.vue:84-89`).
  - The API would still sell BRONZE if an enabled `VipProductConfig` row existed. The server has no Bronze block.
  - Labels: Bronze / Prata / Ouro (`vip.vue:137`).
  - Separately, a seeded shop product `vip-bronze` "Pacote VIP Bronze" (350 WCOIN, status `DRAFT`) exists in `commerce.service.ts:106-117`. It is unrelated to the VIP module.
- **Catalog:**
  - `GET /vip/catalog` returns enabled `VipProductConfig` rows with `price > 0` (`vip.service.ts:30`).
  - There are no hardcoded durations; the catalog is admin-configured via `POST /admin/vip/products`, which requires `admin.vip.manage` (`vip.controller.ts:49-75`).
  - **No web admin UI calls `/admin/vip/*`.**
  - Production catalog contents: UNKNOWN.
- **Benefits:**
  - `GET /vip/benefits` exposes only `warehouseBonusPages` ("+N paginas de warehouse") and `commandCostReductionPercent` ("-N% no custo de comandos") (`vip.service.ts:49-57`).
  - XP, drop, chaos and reset bonuses are force-clamped to 0 (`:313-347`).
- **Purchase flow** (`POST /account/vip/purchase`, `vip.service.ts:121-241`):
  1. Account-restriction check (`:124`).
  2. The enabled product must exist.
  3. Changing to a different tier while active is blocked with `VIP_TIER_CHANGE_BLOCKED` (`:160-165`).
  4. `walletLedger.debit` in the product's currency (`:167`).
  5. Entitlement extended in place (same tier adds days).
  6. `VipGrant` row created.
  7. `GameBridgeJob{operation:'GRANT_VIP'}` enqueued (`:219-226`).
  8. Audit record written.
- **Currency:** the page always displays "WC" (`vip.vue:54,154`). The actual debit currency is the product's `currency` field, `CurrencyCode` WCOIN/GOBLIN_POINT/HUNT_POINT, so displaying "WC" assumes WCOIN. The history defaults to `'WCOIN'` (`vip.service.ts:97`).
- **No real money, no flag:** VIP is bought with wallet balance, not BRL, and it is not gated by `realMoneyPaymentsEnabled` or any flag.
- **Delivery to the game** (`vip/vip-delivery.service.ts`):
  - A background worker runs only if `VIP_DELIVERY_WORKER_ENABLED==='true'` (`:59`).
  - It claims PENDING `GRANT_VIP` jobs with backoff (0 s, 30 s, 2 min, 10 min, 30 min) and a maximum of 8 attempts (`:13-14`).
  - The gateway (`game-bridge-vip.gateway.ts:42-126`) proceeds only when `GAME_DATA_WORKER_URL` and `GAME_COMMAND_PORTAL_SECRET` are set; otherwise it returns `GAME_BRIDGE_NOT_CONFIGURED`. It then:
    1. Requires a provisioned `GameAccountIdentity`.
    2. Submits a `GRANT_VIP` command (`targetLevel`, `vipExpiresAt`) via `GameCommandTransportClient`.
    3. Polls the command until it reaches `SUCCEEDED`.
  - A separate reconciliation (`vip-sync.service.ts:72`) runs only if `VIP_SYNC_RECONCILIATION_ENABLED==='true'`.
  - Admin endpoints: `/admin/vip/delivery[/drift|/:jobId/retry]` (`admin.game-bridge.manage`) and `/admin/vip-sync`.
  - Production values of these environment flags: UNKNOWN.
- **Stale comment:** `vip.service.ts:215` still says "no worker consumes GRANT_VIP jobs yet", which is outdated given the delivery service.
- **UX success message:** the page says "VIP {tier} ativado com sucesso." (`vip.vue:160`) as soon as the portal entitlement is written, whatever the in-game delivery state.

### d. `recarga.vue`, `painel/loja.vue` and `loja/*`: currency, payments, gating

- **`/recarga`: buys currency packs for BRL.**
  - Currencies come from the API packages: WCOIN shown as "WCoin", GOBLIN_POINT shown as **"Blood Coin"**, HUNT_POINT shown as "Hunt Point" (`useCommerceApi.ts:204-207`).
  - Default seeded packs are created if the table is empty (`commerce.service.ts:153-170`):
    - WCOIN: R$10/20/50/100, pegged 1:1 (`WCOIN_TO_BRL_RATE = 1`, `:78`; the peg is enforced at `:94-104`); the R$50 pack has a +5 bonus.
    - Blood Coin: 340 for R$19,90 and 850 (+50) for R$39,90.
    - Hunt Point: 1000 for R$14,90 and 8750 (+1250) for R$99,90.
  - Production rows: UNKNOWN.
- **Provider:** Mercado Pago **Pix only**.
  - `payment_method: { id: 'pix' }` (`api/src/modules/payments/mercadopago.provider.ts:43`).
  - Webhook `POST /payments/webhooks/mercadopago` (`commerce/recharge-webhook.controller.ts:12-16`).
  - The UI shows a QR code, Pix copia-e-cola and a ticket URL, and polls the status (`recarga.vue:72-97,210-225`).
- **Gating:** yes, on both sides.
  - Web: `paymentsEnabled = config.public.realMoneyPaymentsEnabled === true` (`recarga.vue:117`; env `NUXT_PUBLIC_REAL_MONEY_PAYMENTS_ENABLED`, `nuxt.config.ts:8`).
    - When false, the button reads "Recargas indisponiveis" and is disabled.
    - The text reads "…recargas pagas estao indisponiveis nesta versao de avaliacao." (`:9-11,67-68`).
  - API: `assertRealMoneyPaymentsEnabled()` in `createRechargeIntent` (`commerce.service.ts:710`) and `createRechargeCheckout` (`:762`). It throws 503 `PAYMENTS_DISABLED` unless `REAL_MONEY_PAYMENTS_ENABLED==='true'` (`:867-873`); Mercado Pago config reads the same variable (`mercadopago.config.ts:19`).
  - Production values: UNKNOWN.
- **Login:** `/recarga` itself is public. The checkout requires a user (`:180-183`), and the API requires a JWT.
- **Stale fallback:** if the API fails, the summary still shows the stale local pack `data/management.ts:221` ("500 WCoin R$19,90", off-peg). The initial `selectedPack = rechargePacks[0]` is at `recarga.vue:122,166-167`.
- **`/painel/loja` and `/loja`:** both only redirect to `/marketplace?mercado=oficial` (`painel/loja.vue:4`, `loja/index.vue:2`).
- **Official store:**
  - It is the "Loja WCoin" tab in `/marketplace`, with product detail at `/loja/[slug]`.
  - Purchases (`POST /shop/purchases`) are paid from the **wallet balance** via `walletLedger.debit` (`commerce.service.ts:530-705`, debit `:650`).
  - They are **not** gated by `realMoneyPaymentsEnabled`.

### e. `painel/transferencias.vue` and `wallet-transfer`

- **What it does:** a player sends **WCOIN only** to another account, identified by **account username (login), not character name** (warning at `transferencias.vue:23-27`).
- **API:** `POST /wallet/transfers` (JWT), `GET /wallet/transfers/history`, `GET /wallet/transfers/fee-info` (`wallet-transfer.controller.ts:8-25`).
- **Rules** (`wallet-transfer.service.ts:50-127`):
  - Transfer-restriction and account-restriction checks.
  - Minimum `WALLET_DIRECT_TRANSFER_MIN_WC`, default **20 WC** (`:27`).
  - The recipient must exist and be `ACTIVE`, and cannot be the sender.
  - The balance must be sufficient.
  - Debit on the sender; taxed credit to the recipient via `settleTaxedCredit`.
  - The fee is `marketplaceEconomyConfig.wcoinTaxPercent`, the same tax as the marketplace (`:141-143`).
  - Risk signals are recorded (IMMEDIATE_WCOIN_TRANSFER, many-recipients and others).
- **UI:**
  - Balance cards and a fee/net preview.
  - A `window.confirm` warns "Esta acao nao pode ser desfeita." (`:182-185`).
  - A history table (Enviado/Recebido, Bruto/Taxa/Liquido).
- **No feature flag.**

### f. `downloads.vue`: launcher download

- **Static page, no API.**
- **Two external MediaFire links**, opened in a new tab:
  - "Launcher Oficial": `https://www.mediafire.com/file/sym1k306koijhsq/BloodMoonLauncher-v1.1.0.zip/file` (`downloads.vue:50`), with meta "Windows 10/11 · atualização automática · login integrado".
  - "Blood Moon Full Client": `https://www.mediafire.com/file/vqnt0wc39ejdl2j/BloodMoon-Cliente-Completo-v1.1.0.zip/file` (`:57`).
- **"Em breve"** (no URL): "Patch de Atualização" and "Extras do Jogador" (`:59-60`).
- **Requirements** are hardcoded (`:32-33`).
- No checksum, no version check, and no API-driven version or URL.

### g. Login, registration and recovery

**`/login`:**

- **Inputs:**
  - One field with the placeholder "E-mail ou usuário" (`login.vue:10`; `useLocale.ts:127`) and a password.
  - The API matches `OR: [{username: login}, {email: login}]` (`api/src/modules/auth/auth.service.ts:103-105`).
- **Turnstile:** required. The action is `login` (`:46`). Without a token the page shows "Conclua a verificacao de seguranca." (`:109-113`).
  - The widget shows "A verificacao de seguranca nao carregou. Atualize a pagina e tente novamente." when the site key is missing or the script fails (`components/auth/TurnstileWidget.vue:3-5,50-58`).
- **2FA:**
  - If the API returns `TWO_FACTOR_REQUIRED`, the page shows "Digite o codigo de 6 digitos do seu autenticador." and reveals "Codigo de autenticacao (6 digitos)".
  - A toggle switches to "Codigo de recuperacao (XXXX-XXXX)" ("Perdeu o acesso? Usar codigo de recuperacao") (`login.vue:20-44`; `useAuth.ts:370-376`).
- **Error messages** (`useAuth.ts:377-386`):

  | Status | Message |
  |---|---|
  | 401 | "Usuario ou senha invalidos." |
  | 429 | "Muitas tentativas. Aguarde alguns minutos e tente novamente." |
  | 400 | "A verificacao de seguranca expirou ou nao foi validada." |
  | other | "Nao foi possivel acessar a API. Tente novamente em instantes." |

- **Success:** "Login realizado com sucesso." (or "Login administrativo realizado pela API."), then a redirect to `?redirect` or `/`.

**`/registrar`:**

- **Fields:** Nome, Usuario, Senha, Repetir senha, **Personal ID**, E-mail, Repetir o e-mail (all required) and "Referencia / Indicacao" (optional). There is a terms checkbox and Turnstile (`registrar.vue:100-127`).
- **Messages:**
  - "Preencha todos os campos obrigatorios e aceite os termos de uso."
  - "As senhas informadas nao conferem."
  - "Os e-mails informados nao conferem."
  - 409 "Nao foi possivel criar a conta com os dados informados."
  - 429 "Muitas tentativas…"
  - 400 "A verificacao de seguranca expirou ou os dados sao invalidos."
  - Success: "Conta criada com sucesso. Voce ja pode fazer login." (`:140-204`)

**Recovery:**

1. **`/recuperar-conta`:**
   - Email input plus Turnstile (action `recovery`).
   - Calls `POST /auth/password-recovery/request`.
   - Always-neutral success: "Se este e-mail estiver cadastrado, enviaremos um link de redefinicao de senha." (`useAuth.ts:401-434`).
2. **Email link:** `${WEB_PUBLIC_URL}/redefinir-senha?token=…` (`auth.service.ts:501`).
3. **`/redefinir-senha`:**
   - Requires `?token`; if it is absent, the page shows "Este link de redefinicao e invalido." and "Solicitar novo link".
   - Inputs: "Nova senha" and "Confirme a nova senha".
   - Client validation: 8-72 characters ("A nova senha deve ter entre 8 e 72 caracteres.") and match ("As senhas nao coincidem.").
   - API codes (`useAuth.ts:458-472`):

     | Code | Message |
     |---|---|
     | TOKEN_EXPIRED | "Este link de redefinicao expirou." |
     | TOKEN_USED | "Este link ja foi utilizado." |
     | TOKEN_INVALID | "Este link de redefinicao e invalido." |
     | PASSWORD_INVALID | the 8-72 message |

   - A 429 shows "Muitas tentativas…".
   - On success: "Senha redefinida com sucesso.", then an automatic redirect to `/login` after 2.5 s (`redefinir-senha.vue:321-349`).
   - The reset page has no Turnstile.

### h. `painel/personagens.vue`

- **Data source:** `GET /characters` reads the **portal DB table `accountCharacter`**, not the game DB (`api/src/modules/characters/characters.service.ts:133-163`).
  - The only writers are a demo seed that is disabled outside safe environments (`:90-125`, `characters.env.ts:14`) and test personas.
  - **No code syncs real MU characters.** In production the list is likely empty (UNKNOWN without DB access).
  - GM, ADMIN and SUPER_ADMIN see **all** accounts' characters (`:63-64,137`).
- **Shown per card:**
  - Class, name, "Lv"
  - Reset, Master, Mapa, Status (Online/Offline)
  - Guild, PK
  - Admins also see "Conta: {owner}" (`personagens.vue:32-70`)
- **Filters:** search, class, status.
- **Actions:**
  - "Detalhes" and "Resetar" call `POST /characters/:id/actions` with `details` or `reset-request`.
  - The server **only writes an audit record** and returns "Solicitacao de reset para X registrada." or "Detalhes de X registrados." (`characters.service.ts:165-195`).
  - Nothing is sent to the game.
  - If the call fails, the client shows "…registrada em modo teste." (`personagens.vue:170`).

### i. Guilds and community

**Guilds (`/guilds`, `/guild/[slug]`):**

- **Directory:** a public directory with filters (`guilds/index.vue:160`). "Criar guilda" appears when logged in (`:11`).
- **Profile tabs** (`components/guild/GuildProfileTabs.vue`):
  - Visão Geral, Membros, Guild Level, Guild XP, Solicitações, Projetos.
  - Marked "Preview": Tesouraria, Cofre, Feed, Eventos, Guias, Conquistas, Estatísticas, Alianças (`:311-324`).
  - The Guild XP tab says "Esta conversão ainda não foi implementada nesta etapa." (`:185`).
- **Member actions:**
  - Join with a character plus a message.
  - Leave.
  - Approve or reject join requests.
  - Invite, cancel invite.
  - Change role, kick, transfer leadership.
  - Create requests (types Item/Jewel/Zen/WCoin/Equipamento/…) and projects.
  - Edit the profile, including banner and emblem uploads.
  - Disband (leader, 2FA/password confirm).
- **Portal-only:** membership uses portal `accountCharacter` rows (`guilds.service.ts:219,308,647`). The guilds module contains no GameBridge or game-DB reference.

**Community (`/comunidade`):**

- **What works:**
  - Feed (Para você / Seguindo / Recentes).
  - Posts with media upload (`POST /community/media`).
  - Comments and replies, reactions, save, repost, report.
  - Follow and block.
  - Profile edit.
  - Quests endpoints exist in the composable (`useCommunityApi.ts:56-57`).
- **Placeholders:** the sections explorar, guilds, eventos, quests and conquistas render `CommunityPlaceholderView` (`comunidade/index.vue:64,120,214-217`).

### j. `painel/suporte.vue` and tickets

- **Player side:**
  - The form has only "Assunto" and "Descreva sua solicitacao". The category is hardcoded to `SUPPORT`.
  - It calls `POST /account/tickets`. The API requires a subject of at least 4 characters and a message of at least 10 ("Informe um assunto e uma mensagem validos.") (`support.service.ts:18-21`).
  - The list shows subject, status (`OPEN|IN_PROGRESS|RESOLVED|CLOSED`, `schema.prisma:432-437`) and the original message.
  - **The player page never renders the staff `response` field**, even though the type includes it (`useSupportApi.ts:7`; `painel/suporte.vue:2`).
- **Staff side:**
  - `/painel/admin/tickets` lists tickets and offers "Responder e resolver". This sets `RESOLVED` with the response and a fixed reason (`painel/admin/tickets.vue:2`).
  - The API is `@Roles('ADMIN','SUPER_ADMIN')` plus `admin.accounts.status.manage` (`support.controller.ts:21-28`).
  - GMs cannot answer tickets.
  - The page is not linked in the admin menu.
- **Other entry point:** the privacy deletion flow can also open a ticket (`painel/privacidade.vue:348`).

### k. `painel/privacidade.vue`: privacy and account deletion

- **"Meus dados":**
  - "Visualizar agora" previews the data.
  - "Baixar meus dados" downloads JSON.
  - Both use `GET /account/deletion/export`.
  - "Corrigir informações" is a disabled placeholder card (`:31-34`).
- **Deletion flow:**
  1. "Iniciar exclusão da minha conta" opens an optional exit questionnaire. It includes a retention offer and can open a support ticket.
  2. An explicit confirmations step with 4 required checkboxes: characters, warehouse, irreversible, continue. The disclaimer text contains a visible `[LEGAL_REVIEW_REQUIRED]` tag (`:183`).
  3. `POST /account/deletion/request` sends an email with a confirmation link that has a 24 h TTL (`account-deletion-request.service.ts:20`).
  4. Once confirmed, a **14-day grace period** begins (`:19,159-160`), shown as "Em período de carência" with "Cancelar exclusão" (`POST /account/deletion/cancel`).
  5. Status `EXECUTED` shows "Conta excluída".
- **Broken confirmation link:** the emailed link points to **`${WEB_PUBLIC_URL}/conta/confirmar-exclusao?token=…`** (`account-deletion-request.service.ts:101`). **No such page exists in `apps/web/pages`,** so the link would 404 and the `POST /account/deletion/confirm` endpoint has no web caller (see F).

### l. `marketplace.vue` and `painel/marketplace.vue`: enabled or disabled?

- **No enable/disable flag exists.** A grep of web and API for `marketplaceEnabled` or `MARKETPLACE_ENABLED` finds nothing.
- **Always rendered:** `/marketplace` is always rendered, in the header nav and in the footer.
- **Player listing:**
  - `POST /marketplace/listings` charges a publication fee from the wallet.
  - It creates the listing in `ESCROW_PENDING` and enqueues a `LOCK_ITEM` GameBridge job (`marketplace.service.ts:164-290`).
- **Buying:** debits the buyer and creates a `TRANSFER_ITEM` job (`:419-520`).
- **Env flags that do exist:**
  - `MU_BRIDGE_ENABLED` changes manual activation behavior (`:562-569`).
  - `MARKETPLACE_BRIDGE_DEV_CONTROLS_ENABLED` gates dev bridge controls (`marketplace-bridge-dev.env.ts:26`).
  - Neither hides the marketplace.
- **Accepted currencies:** from `marketplaceEconomyConfig.acceptedCurrencies`, default all three (`:174-183`).
- **`/painel/marketplace`:** the player's listings and orders page, with an "Anunciar item" form. The item name and category are typed in as free text, and it sends `itemData: { pendingGameSync: true }` (`painel/marketplace.vue:163`).

### m. Currency terms shown to players (web UI)

| String | Where (player-visible) |
|---|---|
| "WCoin" | Balance label from API `WCOIN` (`composables/useAuth.ts:110`, shown in header dropdown `SiteHeader.vue:43` and panel sidebar `ManagementShell.vue:83`); `useCommerceApi.ts:205` (recarga currency buttons and summary); "Loja WCoin" tab (`pages/marketplace.vue:33`, `components/marketplace/CommercialMarketSwitch.vue:43`); filter options (`MarketplaceFilters.vue:27`, `OfficialStoreFilters.vue:27`); listing cards (`MarketplaceItemCard.vue:40`, `MarketplaceItemDetails.vue:77`); guild request type (`GuildProfileTabs.vue:195`); "Envie WCoin diretamente…" (`painel/transferencias.vue:8`) |
| "Blood Coin" | Label for API `GOBLIN_POINT` (`useAuth.ts:111`, `useCommerceApi.ts:206`); `MarketplaceFilters.vue:28`, `OfficialStoreFilters.vue:28`, `MarketplaceItemCard.vue:40`, `MarketplaceItemDetails.vue:77`, `painel/marketplace.vue:43`; local fallback packs `data/management.ts:225-226` |
| "Hunt Point" / "HP" | `useAuth.ts:112`, `useCommerceApi.ts:207`, filters `:29`; "HP" on listing cards (`MarketplaceItemCard.vue:40`, `MarketplaceItemDetails.vue:77`) |
| "WC" | `painel/transferencias.vue` (heading "Transferir WC" `:6`, 14 occurrences); `painel/vip.vue:54,154` ("{price} WC"); sidebar item "Transferir WC" (`ManagementShell.vue:308`) |
| Raw codes "WCOIN" / "HUNT_POINT" | `painel/marketplace.vue:42,44` (select options) and listing/order lines `:76,81,111,116`; `loja/[slug].vue:25` and `OfficialStoreProductCard.vue:35,55-57` print `variant.currency`/`product.currency` straight from `/shop/*`, which `useStoreApi` does not map. Expect raw strings such as "350 WCOIN" or "120 GOBLIN_POINT". |
| "CashShop" | Admin only: `ManagementShell.vue:177`, `painel/admin/catalogo-legado.vue` |
| "Cash" alone | Not found in player UI |
| "Doações" | Footer link to `/recarga` (`SiteFooter.vue:78`) |

---

## (E) API modules (`apps/api/src/modules`)

| Module | Purpose (from code) | Controller route prefixes |
|---|---|---|
| accounts | Admin account management, self-service deletion, lifecycle bridge | `admin/accounts`, `account/deletion`, `admin/accounts/deletion` |
| admin-audit | Admin audit events | `admin/audit` |
| admin-content | CMS entries, assets, equipment, settings; media serving | `admin/content`, `media` |
| admin-dashboard | Operational and strategic dashboards | `admin/dashboard` |
| admin-observability | Errors, audit, events, exports, history, retention, work logs | `admin/errors`, `admin/observability` |
| admin-reports | Report generation and export | `admin/reports` |
| admin-tasks | Admin task board | `admin/tasks` |
| alerting | Alert sweeps and internal ops events | `internal/ops-events` |
| audit | Audit service (no controller) | none |
| auth | Login, register, recovery, refresh, 2FA, step-up, logout | `auth` |
| beta-lifecycle | Beta notice, reward claim, cleanup dry-run | `beta/registration-notice`, `account/beta/claim-rewards`, `admin/beta/*` |
| beta-rewards | Beta participation and reward generation | `admin/beta-rewards` |
| bug-hunters | Player bug reports and triage | `account/bug-reports`, `admin/bug-reports` |
| characters | Portal-DB characters (`accountCharacter`) | `characters` |
| commerce | Shop, recharge, finance, risk/chargeback, Mercado Pago webhook, legacy catalog | `shop/*`, `recharge/*`, `account/purchases`, `account/recharges`, `admin/shop`, `admin/store`, `admin/recharge`, `admin/finance`, `payments/webhooks` |
| community | Social feed, posts, profiles, quests; admin moderation | `community`, `admin/community` |
| content | Public CMS entries and settings | `content` |
| game-account-identity | Game account provisioning and command transport client (no controller) | none |
| game-data | Game data status | `admin/game-data` |
| game-integration | Contract only | none |
| game-provisioning-reconciliation | Provisioning retry worker | `admin/game-provisioning` |
| gm | GM dashboard, logs, occurrences, events | `gm`, `gm/events` |
| guilds | Portal guilds; admin | `guilds`, `admin/guilds` |
| integrations-discord | Discord feed endpoints | `integrations/discord` |
| launcher | Launcher bootstrap, account, characters, rankings, events | `launcher` |
| launcher-studio | Launcher CMS, assets, publish | `admin/launcher-studio`, `launcher` (content, store/terms), `media/launcher-assets` |
| marketplace | Player listings and orders with escrow via GameBridge; admin; dev bridge | `marketplace/*`, `account/marketplace`, `admin/marketplace`, `admin/game-bridge` |
| media | Community media upload | `community/media` |
| muserver-export | MuServer data export (cash-shop products, items, …) | `muserver-export` |
| observability | Observability service (no controller) | none |
| payments | Mercado Pago provider, webhook signature and events (no controller) | none |
| progression | XP/drop/reset config, calculator, sync | `admin/progression` |
| recharge, references, shop, tickets | Contract files only | none |
| roadmap | Public and admin roadmap | `roadmap`, `admin/roadmap` |
| support | Tickets and moderation | `account/tickets`, `admin` (tickets, moderation) |
| test-personas | Dev fixtures (environment-gated) | `test-personas` |
| vip | VIP catalog, purchase, admin config, delivery queue | `vip/*`, `account/vip*`, `admin/vip/*`, `admin/vip/delivery` |
| vip-sync | VIP ↔ GameServer reconciliation | `admin/vip-sync` |
| wallet | Wallet ledger service (no controller) | none |
| wallet-transfer | Direct WC transfer | `wallet` |
| web-source | Legacy web source inventory | `source-web/current` |
| wiki | Wiki reads (knowledge entries, characters, equipment) | `wiki` |

---

## (F) Surprising or contradictory findings

1. **The account deletion email link targets a page that does not exist.**
   - The link is `/conta/confirmar-exclusao?token=` (`api/src/modules/accounts/account-deletion-request.service.ts:101`), but `apps/web/pages` has no `conta/` directory.
   - `usePrivacyApi.ts:87-91` claims "That page calls the endpoint directly". No such page is in this commit.
   - As written, self-service deletion cannot be confirmed from the web.
2. **Rankings are permanently empty.** `rankingRows` is a hardcoded `[]` (`useLocale.ts:23,409`), and the page calls no API. The `launcher/rankings` endpoint exists but the web does not use it.
3. **Characters are not game data.** `/painel/personagens`, the guild join flow and `/loja/[slug]` destination selection all use the portal `accountCharacter` table, and no sync exists. "Resetar" only writes an audit row.
4. **The home page always shows fake news cards.** `fallbackNews` pads the secondary slots ("Notas de patch 0.5", dated 18 May 2026; `index.vue:134-139`).
5. **The header Discord button is `href="#"`** (`SiteHeader.vue:17`). The footer "Discord" goes to `/comunidade`.
6. **The footer's "Política de privacidade" and "Termos de uso" both go to `/about`.** No privacy or terms page exists, yet registration requires accepting "termos de uso".
7. **ADMIN cannot open `/painel/gm`.** `gm/index.vue:15-18` says it can, but the middleware (`auth.global.ts:64-66`) and the ADMIN role set (`permissions.ts:244-251`) exclude `gm.dashboard.view`.
8. **Three admin pages bypass the per-prefix permission check.**
   - The pages are `/painel/admin/progressao`, `/painel/admin/calculadora-progressao` and `/painel/admin/catalogo-legado`.
   - They are missing from `adminRoutePermissions` (`auth.global.ts:4-31`), so any holder of `admin.dashboard.view` can open them.
   - Backend guards still apply.
   - The web permission list also lacks `admin.progression.*`.
9. **VIP issues:**
   - The page hides BRONZE, but the API has no BRONZE block.
   - No web admin UI exists for `/admin/vip/products`, so the catalog must be set via API.
   - Prices always show "WC" even though the product currency is configurable.
   - "Ver historico de compras VIP em Meus Pedidos" links to `/painel/compras`, which never calls `/account/vip/history`.
   - `vip.service.ts:215` says no worker consumes `GRANT_VIP`, but `vip-delivery.service.ts` does (when enabled).
10. **Currency naming is inconsistent.**
    - The backend `GOBLIN_POINT` is labelled "Blood Coin" in the UI, yet raw "WCOIN", "HUNT_POINT" and "GOBLIN_POINT" leak on `/loja/[slug]`, on official product cards and in `/painel/marketplace`.
    - Hunt Point shows as "HP" on listing cards.
    - The footer calls recharge "Doações" while the page says "Recarga de moedas".
11. **`/recarga` shows stale, off-peg fallback data if the API fails.**
    - It displays the stale local pack (500 WCoin for R$19,90) from `data/management.ts:221`, which contradicts the 1:1 WCOIN peg enforced by the API (`commerce.service.ts:78,94-104`).
    - The same file's comment at `:154-160` explains the 25x drift incident.
12. **Support replies are invisible to players.** The player ticket page never displays `response`, so a resolved ticket shows only its status.
13. **`/painel/admin/sistema` is not server-backed.** It is a localStorage "management base" export/import/reset (`sistema.vue:76-110`), not server settings, despite requiring `admin.server-settings.manage`.
14. **`/painel/configuracoes` preferences are saved to localStorage only** and have no effect server-side.
15. **The Wiki API returns KnowledgeEntry rows of any `status`,** with no published filter (`wiki.service.ts:243-265`), and `scope` is client-controllable.
16. **Placeholder values appear in `/painel/conta` when the profile fails to load:** "admin", "conta@bloodmoon.local", "***-**-0000" (`painel/conta.vue:10-26`).
17. **The sidebar "Meu perfil social" link is broken.** It uses `?painel=perfil`, which the community page ignores.
18. **No `marketplaceEnabled` flag exists anywhere.** The marketplace is always live in the UI. Its game-side escrow depends on GameBridge jobs, and the production GameBridge state is UNKNOWN.
19. **The auth state cookie is readable by page scripts.** `blood-moon-auth-state` (role and permissions) is set via `useCookie` without httpOnly and is trusted for server-side route rendering (`useAuth.ts:124-129,247-253`). Menu and route gating is therefore client-forgeable UI; only API guards are authoritative.
20. **The privacy disclaimer ships a visible `[LEGAL_REVIEW_REQUIRED]` marker** to players (`painel/privacidade.vue:183`).
