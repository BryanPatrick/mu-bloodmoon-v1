---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
sourceCommit: 1c272db
---

# Site navigation map — "where do I see X / how do I get to Y"

Created in `BLOODMOON-AI-07`. Only **real routes and real menu labels**
from the deployed code (`1c272db`); labels are quoted exactly as the
portal renders them (Portuguese). Evidence:
[`evidence/portal-code-audit-1c272db.md`](evidence/portal-code-audit-1c272db.md)
sections B and C. Domain: `https://mubloodmoon.com.br`.

## The three menus

1. **Top header** (every page): Home · Notícias · Gazeta · Wiki · Ranking ·
   Downloads · Roadmap · Marketplace · Comunidade · Sobre. Logged out:
   "Entrar", "Criar conta". Logged in: a dropdown "Ola, {nome}" with
   Personagens, Minha conta, Loja, one row per currency balance (links to
   `/recarga`) and Sair.
2. **Panel sidebar** (any `/painel/*` page, player view): Dashboard ·
   Minha conta · Meus personagens · Loja · Marketplace · Comunidade ·
   Meu perfil social · Guildas · Minhas compras · **Transferir WC** ·
   **VIP** · Meus anúncios · Notificações · Suporte · Privacidade e meus
   dados · Bug Hunters · Configurações. VIP and Transferir WC exist
   **only** here, not in the top header.
3. **Footer**: includes "Doações" (→ `/recarga`), "Recuperar senha",
   "Loja oficial", "Mercado de jogadores", "Central de ajuda" (→
   `/about#contato`), "Regras do servidor" (→ `/wiki`).

## Player questions → real path

| Question | Answer (path) | Login | Visibility | Notes |
|---|---|---|---|---|
| Where do I create an account? | Header "Criar conta" → `/registrar` | no | `PUBLIC_PLAYER` | |
| Where do I log in? | Header "Entrar" → `/login` (e-mail or username) | no | `PUBLIC_PLAYER` | |
| I forgot my password | `/login` or footer "Recuperar senha" → `/recuperar-conta`; then the e-mailed link opens `/redefinir-senha` | no | `PUBLIC_PLAYER` | |
| Where do I turn on 2FA / change my password / see my sessions? | Sidebar "Minha conta" → `/painel/conta` | yes | `AUTHENTICATED_PLAYER` | |
| Where do I see my balances? | Header dropdown (logged in) or panel sidebar balance rows | yes | `AUTHENTICATED_PLAYER` | |
| Where do I buy WCoin / Blood Coin / Hunt Point? | Click a balance row, or footer "Doações" → `/recarga` | checkout yes | `PUBLIC_PLAYER` | May show "Recargas indisponiveis" when real-money payments are off |
| Where do I buy VIP? | Panel sidebar "VIP" → `/painel/vip` | yes | `AUTHENTICATED_PLAYER` | Not in the top header |
| How do I send WC to a friend? | Panel sidebar "Transferir WC" → `/painel/transferencias` (needs the friend's **account username**) | yes | `AUTHENTICATED_PLAYER` | |
| Where is the official store? | Header dropdown "Loja", sidebar "Loja", or footer "Loja oficial" → `/marketplace?mercado=oficial` | buy yes | `PUBLIC_PLAYER` | `/loja` and `/painel/loja` redirect there |
| Where is the player market? | Header "Marketplace" → `/marketplace`; my listings: sidebar "Meus anúncios" / "Marketplace" → `/painel/marketplace` | actions yes | `PUBLIC_PLAYER` | |
| Where do I see what I bought? | Sidebar "Minhas compras" → `/painel/compras` | yes | `AUTHENTICATED_PLAYER` | VIP purchases are not listed there (gap) |
| Where are my characters? | Header dropdown "Personagens" or sidebar "Meus personagens" → `/painel/personagens` | yes | `AUTHENTICATED_PLAYER` | Data is portal-side, not synced from the game (gap) |
| Where do I find guilds / create one? | Header has no Guildas item; use sidebar "Guildas" or go to `/guilds`; guild page `/guild/<slug>` | create yes | `PUBLIC_PLAYER` | |
| Where is the community / my social profile? | Header "Comunidade" → `/comunidade`; profile `/comunidade/<usuario>` | posting yes | `PUBLIC_PLAYER` | The sidebar "Meu perfil social" link does not open the profile section (gap) |
| How do I contact support? | Sidebar "Suporte" → `/painel/suporte` → "Abrir ticket" | yes | `AUTHENTICATED_PLAYER` | Staff replies are not shown on that page (gap) |
| How do I report a bug? | Sidebar "Bug Hunters" → `/painel/bug-hunters` | yes | `AUTHENTICATED_PLAYER` | |
| How do I download my data or delete my account? | Sidebar "Privacidade e meus dados" → `/painel/privacidade` | yes | `AUTHENTICATED_PLAYER` | Deletion confirmation link is broken (gap) |
| Where do I download the game / launcher? | Header "Downloads" → `/downloads` | no | `PUBLIC_PLAYER` | External MediaFire links |
| Where are news? | Header "Notícias" → `/noticias`; the journal: header "Gazeta" → `/gazeta` | no | `PUBLIC_PLAYER` | |
| Where is the Wiki / guides? | Header "Wiki" → `/wiki`; guides `/guias` (linked from inside the Wiki only) | no | `PUBLIC_PLAYER` | Most guide topics are "Conteúdo não publicado" |
| Where are rankings? | Header "Ranking" → `/rankings` | no | `PUBLIC_PLAYER` | Always empty at `1c272db` |
| Where is the roadmap? | Header "Roadmap" → `/roadmap` | no | `PUBLIC_PLAYER` | |
| Where are the rules / terms / privacy policy? | Footer "Regras do servidor" → `/wiki`; "Termos de uso" and "Política de privacidade" → `/about` | no | `PUBLIC_PLAYER` | No dedicated terms or privacy page exists (gap) |
| Discord? | Header Discord button has no target; footer "Discord" → `/comunidade` | no | `PUBLIC_PLAYER` | Gap |

## Staff navigation (internal only, `INTERNAL_SYSTEM`)

Admin/GM routes and their permissions are in
[`PORTAL_FEATURE_INVENTORY.md`](PORTAL_FEATURE_INVENTORY.md) "Staff
features". Pages reachable only by URL (no menu entry):
`/painel/admin/progressao`, `/calculadora-progressao`, `/moderacao`,
`/tickets`, `/personagens`, `/conteudo`, `/marketplace/escrow`,
`/dev/test-personas`. Never include staff routes in a player answer.
