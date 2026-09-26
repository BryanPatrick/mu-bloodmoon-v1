---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
sourceCommit: 1c272db
---

# Portal use cases — pattern and first representative set

Created in `BLOODMOON-AI-07`. Every step below is taken from the deployed
code at `1c272db` (citations in
[`evidence/portal-code-audit-1c272db.md`](evidence/portal-code-audit-1c272db.md)
and the `path:line` notes here, relative to `apps/`). Runtime facts that
code cannot prove are marked `UNKNOWN (runtime)`. Only five use cases on
purpose: the pattern matters more than volume at this stage.

## Use-case contract

```
USE_CASE_ID      UC-<AREA>-NNN, stable, never reused
name             short, player vocabulary
actor            who starts it (PLAYER, GM, ADMIN, SYSTEM)
visibility       PUBLIC_PLAYER | AUTHENTICATED_PLAYER | INTERNAL_SYSTEM | ...
preconditions    what must already be true
trigger          what the actor does to start it
normal_flow      numbered steps, real screens and real labels
alternate_flow   real branches (A1, A2, ...)
errors           real messages as rendered, with the condition that shows them
permissions      login / role / permission / feature flag
related_routes   real web routes
related_API      real endpoints (internal only, never in a player answer)
player_explanation  2-4 sentences a player could read (player-safe projection)
known_gaps       gaps found, with their KNOWLEDGE_GAPS id
sources          code at 1c272db, docs, decisions
status           CODE_VERIFIED | CODE_VERIFIED_RUNTIME_UNKNOWN | PARTIAL | UNKNOWN
last_verified    date
```

A use case describes what the system does. It is never a promise about
production configuration: when a step depends on an env flag or database
rows, the use case says so.

---

## UC-ACCOUNT-001 — Log in to the portal

- **actor**: PLAYER (also GM/ADMIN) · **visibility**: `PUBLIC_PLAYER`
- **preconditions**: an existing account.
- **trigger**: header "Entrar" → `/login`, or any `/painel` link while
  logged out (redirects to `/login?redirect=…`).
- **normal_flow**:
  1. Player types "E-mail ou usuário" and password (the API accepts
     either the username or the e-mail).
  2. Player completes the Turnstile security check.
  3. Portal shows "Login realizado com sucesso." and returns to the page
     in `?redirect` or `/`.
  4. Session lasts 24 h for players (8 h for staff) by default and
     refreshes itself.
- **alternate_flow**:
  - A1 — 2FA enabled: the page asks "Digite o codigo de 6 digitos do seu
    autenticador."; the player enters the code.
  - A2 — lost authenticator: "Perdeu o acesso? Usar codigo de
    recuperacao" → enter a recovery code (`XXXX-XXXX`).
  - A3 — forgot password: go to UC-ACCOUNT-002.
- **errors**: "Usuario ou senha invalidos." (401) · "Muitas tentativas.
  Aguarde alguns minutos e tente novamente." (429) · "A verificacao de
  seguranca expirou ou nao foi validada." (400) · "Conclua a verificacao
  de seguranca." (no Turnstile token) · "A verificacao de seguranca nao
  carregou. Atualize a pagina e tente novamente." (widget failed) · "Nao
  foi possivel acessar a API. Tente novamente em instantes." (other).
- **permissions**: none to start; staff areas additionally require 2FA.
- **related_routes**: `/login`, `/painel`, `/painel/conta`.
- **related_API** (internal): `POST /auth/login`, `/auth/refresh`.
- **player_explanation**: "Click Entrar and sign in with your username or
  e-mail and your password, then complete the security check. If you
  turned on two-step verification, you'll also be asked for the 6-digit
  code from your authenticator app, or you can use one of your recovery
  codes."
- **known_gaps**: none blocking.
- **sources**: `web/pages/login.vue:25-42,111,129-130`,
  `web/composables/useAuth.ts:350-386`,
  `web/components/auth/TurnstileWidget.vue:5`,
  `api/src/modules/auth/auth.service.ts:900-901` (session hours; env
  `SESSION_TTL_HOURS` can override).
- **status**: `CODE_VERIFIED` · **last_verified**: 2026-09-26

## UC-ACCOUNT-002 — Recover a forgotten password

- **actor**: PLAYER · **visibility**: `PUBLIC_PLAYER`
- **preconditions**: the account has an e-mail the player can read.
- **trigger**: footer "Recuperar senha" or `/recuperar-conta`.
- **normal_flow**:
  1. Player enters the e-mail and completes Turnstile; clicks "Enviar
     link de recuperacao".
  2. Portal always answers "Se este e-mail estiver cadastrado, enviaremos
     um link de redefinicao de senha." (it never reveals whether the
     e-mail exists).
  3. Player opens the e-mailed link → `/redefinir-senha?token=…`.
  4. Player enters "Nova senha" twice (8-72 characters).
  5. "Senha redefinida com sucesso." then automatic redirect to `/login`.
- **alternate_flow**: A1 — link opened without a token: "Este link de
  redefinicao e invalido." + "Solicitar novo link".
- **errors**: "Este link de redefinicao expirou." · "Este link ja foi
  utilizado." · "Este link de redefinicao e invalido." · "A nova senha
  deve ter entre 8 e 72 caracteres." · "As senhas nao coincidem." ·
  "Muitas tentativas…".
- **permissions**: none.
- **related_routes**: `/recuperar-conta`, `/redefinir-senha`, `/login`.
- **related_API** (internal): `POST /auth/password-recovery/request`,
  `POST /auth/password-recovery/reset`.
- **player_explanation**: "Use Recuperar senha, type your account e-mail
  and we'll send a reset link if that e-mail is registered. Open the link,
  choose a new password (8 to 72 characters) and sign in again. Links
  expire and can only be used once."
- **known_gaps**: real delivery of the e-mail to an external mailbox has
  never been proven in production (`docs/handoff/auth-recovery-provider-blocker.md`,
  Cloudflare risk CF-R24(E)) → `GAP-AI07-07`.
- **sources**: `web/composables/useAuth.ts:401-472`,
  `web/pages/redefinir-senha.vue:117-123`,
  `api/src/modules/auth/auth.service.ts:906` (link validity: 30 min by
  default, env `AUTH_PASSWORD_RESET_TTL_MINUTES`).
- **status**: `CODE_VERIFIED_RUNTIME_UNKNOWN` (mail delivery) ·
  **last_verified**: 2026-09-26

## UC-VIP-001 — Buy VIP with wallet balance

- **actor**: PLAYER · **visibility**: `AUTHENTICATED_PLAYER`
- **preconditions**: logged in; enough balance in the product's currency;
  an enabled VIP product exists (admin-configured, `UNKNOWN (runtime)`).
- **trigger**: panel sidebar "VIP" → `/painel/vip` → "Comprar" on a plan.
- **normal_flow**:
  1. Page lists the offered plans — only **Prata (Silver)** and **Ouro
     (Gold)**; Bronze is not offered (`DEC-VIP-001`) — and the benefits
     the API exposes: extra warehouse pages and a command-cost reduction.
  2. Player clicks "Comprar"; price is shown in "WC".
  3. Portal debits the wallet, extends the VIP (same tier adds days),
     records the grant and queues delivery to the game.
  4. Page shows "VIP {tier} ativado com sucesso."
  5. In the background, a delivery worker (when enabled) sends the VIP
     level to the game account and retries on failure.
- **alternate_flow**: A1 — same tier already active: the new days are
  added to the current VIP.
- **errors**: "Voce ja possui VIP {tier} ativo. Aguarde expirar para
  comprar um nivel diferente…" (different tier while active) · "Saldo
  insuficiente para concluir a operacao." · "Este plano de VIP nao esta
  disponivel para compra." · "Nao foi possivel concluir a compra de VIP."
- **permissions**: login (PLAYER). Not gated by the real-money flag (it is
  paid from balance, not BRL).
- **related_routes**: `/painel/vip`, `/recarga` (to top up), `/painel/compras`.
- **related_API** (internal): `GET /vip/catalog`, `GET /vip/benefits`,
  `GET /account/vip`, `POST /account/vip/purchase`; delivery via the
  `GRANT_VIP` GameBridge job.
- **player_explanation**: "Open VIP in your panel, pick Prata or Ouro and
  click Comprar; the price is taken from your WC balance. If you already
  have the same VIP, the new days are added on top. You can't switch to a
  different VIP level until your current one expires. The VIP is then
  applied to your game account automatically."
- **known_gaps**: the success message appears as soon as the portal
  records the VIP, not when the game applies it, and whether the delivery
  worker is enabled in production is unknown → `GAP-AI07-11`; VIP
  purchases are not listed on `/painel/compras` although the page points
  there → `GAP-AI07-12`; Bronze is hidden in the web but not blocked by
  the API → `GAP-AI07-13`; the "WC" label assumes the product currency is
  WCoin.
- **sources**: `web/pages/painel/vip.vue:84-89,160,163`,
  `api/src/modules/vip/vip.service.ts:121-241` (134, 162-163),
  `api/src/modules/vip/vip-delivery.service.ts:59,84`,
  `api/src/modules/wallet/wallet-ledger.service.ts:108`; `DEC-VIP-001`.
- **status**: `CODE_VERIFIED_RUNTIME_UNKNOWN` · **last_verified**: 2026-09-26

## UC-WALLET-001 — Top up WCoin, Blood Coin or Hunt Point (recarga)

- **actor**: PLAYER · **visibility**: `PUBLIC_PLAYER` (page) /
  `AUTHENTICATED_PLAYER` (checkout)
- **preconditions**: real-money payments enabled in web and API
  (`UNKNOWN (runtime)`); logged in for checkout.
- **trigger**: a balance row in the header/sidebar, footer "Doações", or
  `/recarga`.
- **normal_flow**:
  1. Player picks a currency (WCoin, Blood Coin, Hunt Point) and a pack.
  2. Clicks "Pagar com Pix"; the page shows a QR code and a Pix
     copia-e-cola code.
  3. Player pays in their bank app; the page checks the status every few
     seconds.
  4. On approval: "Pagamento aprovado! Seu saldo ja foi atualizado." — the
     portal wallet is credited.
- **alternate_flow**: A1 — payments off: button "Recargas indisponiveis"
  and the notice that paid recharges are unavailable in this evaluation
  version.
- **errors**: "O pagamento nao foi aprovado." · "Este pagamento foi
  cancelado." · "Este pagamento esta em analise manual." · "Nao foi
  possivel confirmar o pagamento."
- **permissions**: login for checkout; feature flags
  `realMoneyPaymentsEnabled` / `REAL_MONEY_PAYMENTS_ENABLED`.
- **related_routes**: `/recarga`, `/painel/conta` (recharges list).
- **related_API** (internal): `GET /recharge/packages`,
  `POST /recharge/intents`, `POST /recharge/intents/:id/checkout`,
  `GET /recharge/intents/:id`; Mercado Pago webhook.
- **player_explanation**: "Open Recarga, choose the currency and pack and
  pay with Pix. When the payment is approved your portal balance is
  updated. Portal balances are used on the site (store, VIP, marketplace,
  transfers); they are not automatically turned into in-game Cash."
- **known_gaps**: the deployed code has **Mercado Pago Pix only** and no
  Asaas code, while `DEC-PAYMENTS-001` names Asaas as the primary direction
  and Mercado Pago as dormant → `GAP-AI07-08`; whether any real-money payment has run in production is
  unknown (`GAP-AI06B-05`, on draft PR #3).
- **sources**: `web/pages/recarga.vue:67-68,117,128-145,155-165,212-224`,
  `web/composables/useCommerceApi.ts:204-207`,
  `web/nuxt.config.ts:8`,
  `api/src/modules/commerce/commerce.service.ts:166-167,868`,
  `api/src/modules/payments/` (Mercado Pago files only);
  `docs/knowledge/CURRENCY_TERMINOLOGY.md`.
- **status**: `CODE_VERIFIED_RUNTIME_UNKNOWN` · **last_verified**: 2026-09-26

## UC-LAUNCHER-001 — Download the launcher and the game client

- **actor**: PLAYER · **visibility**: `PUBLIC_PLAYER`
- **preconditions**: Windows 10/11 (as stated on the page).
- **trigger**: header "Downloads" → `/downloads`.
- **normal_flow**:
  1. Page offers the official Launcher (v1.1.0, "Windows 10/11 ·
     atualização automática · login integrado") and "Blood Moon Full
     Client" (v1.1.0, "Cliente completo · launcher incluso").
  2. Buttons open external MediaFire download pages in a new tab.
  3. Player installs and opens the launcher; later updates come through
     the launcher itself (from `update.mubloodmoon.com.br`).
- **alternate_flow**: A1 — "Patch de Atualização" and "Extras do Jogador"
  show "Em breve" (no download).
- **errors**: none rendered by the portal (external host).
- **permissions**: none.
- **related_routes**: `/downloads`.
- **related_API**: none from the web page; launcher uses `launcher/*`.
- **player_explanation**: "Go to Downloads. New players can take the Full
  Client (it already includes the launcher); if you already have the game
  files, download only the Launcher. After that, the launcher updates
  itself and you sign in inside it."
- **known_gaps**: links are hard-coded external MediaFire URLs with no
  checksum or version check; whether they still resolve is unknown →
  `GAP-AI07-14`.
- **sources**: `web/pages/downloads.vue:24,44-60`;
  `docs/cloudflare-migration/CURRENT_STATE.md` (`update.` host).
- **status**: `CODE_VERIFIED` (links' availability `UNKNOWN`) ·
  **last_verified**: 2026-09-26

## Next candidates (not written yet)

Transfer WC (`/painel/transferencias`), buy from the official store,
create a marketplace listing, open a support ticket, delete my account
(blocked by `GAP-AI07-04`), join a guild. Each should follow the
contract above when written.
