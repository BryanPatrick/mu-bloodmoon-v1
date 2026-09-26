---
status: ACTIVE
category: knowledge
audience: internal (product + engineering + Blood Moon AI)
lastVerified: 2026-09-26
sourceCommit: 1c272db
---

# Player FAQ knowledge — contract and validated seed entries

Created in `BLOODMOON-AI-07`. This is **knowledge for Blood Moon AI and for
people writing player help**, not a published FAQ page: nothing here is
shown to players automatically, and no chatbot uses it (`STAGE 2`,
internal only). Seeded only with questions whose answer is validated
against deployed code (`1c272db`) and current decisions.

## Entry contract

```
FAQ_ID              FAQ-<TOPIC>-NNN
question            as a player would ask it (pt-BR and/or en)
normalized_topic    one topic key (e.g. CURRENCY, VIP, ACCOUNT, DOWNLOADS)
answer_internal     full answer for staff/agents, may cite code and gaps
answer_player_safe  what a player may read: no routes of staff pages, no
                    env/flag names, no internals, no promises about UNKNOWNs
audience            PLAYER | STAFF
visibility          PUBLIC_PLAYER | AUTHENTICATED_PLAYER | INTERNAL_SYSTEM |
                    OPERATIONS_PRIVATE | SECURITY_PRIVATE | SECRET_NEVER_AI_OUTPUT
                    (of the internal answer; the player-safe answer is always
                    PUBLIC_PLAYER or AUTHENTICATED_PLAYER)
source              code path:line at 1c272db, decision ID, doc
verification_status CODE_VERIFIED | DECISION_VERIFIED |
                    CODE_VERIFIED_RUNTIME_UNKNOWN | UNKNOWN
last_verified       date
related_route       real portal route(s)
related_use_case    USE_CASES.md ID
known_limitations   what the answer cannot promise, with gap IDs
ux_signal           FAQ_NEED | WIKI_NEED | NAVIGATION_PROBLEM |
                    UX_WORDING_PROBLEM | BUSINESS_RULE_CONFUSION | none
wiki_status         WIKI_ARTICLE_CANDIDATE | WIKI_UPDATE_CANDIDATE |
                    NOT_WIKI_CONTENT
```

Rules:

- A player-safe answer never states something the internal answer marks
  `UNKNOWN`; it says what the player can do instead (for example, open a
  support ticket).
- A question the base cannot answer is not guessed: it becomes `UNKNOWN`
  and a gap ([`KNOWLEDGE_GAP_LIFECYCLE.md`](KNOWLEDGE_GAP_LIFECYCLE.md)).
- `wiki_status` is a classification only. Nothing is published
  automatically; a person decides.

---

## FAQ-CURRENCY-001 — Is Blood Coin the same as WC (WCoin)?

- **question**: "Blood Coin é a mesma coisa que WC?" / "Is Blood Coin the
  same as the WC on the portal?"
- **normalized_topic**: CURRENCY
- **answer_internal**: No. They are two different portal balances. WC is
  the technical currency `WCOIN` (UI label "WCoin", sold 1 WC = R$1 in
  packs of 10/20/50/100). Blood Coin is the public name, decided
  2026-09-05, of the technical currency `GOBLIN_POINT` (packs 340 for
  R$19,90 and 850+50 bonus for R$39,90). A third balance, Hunt Point
  (`HUNT_POINT`), also exists. Each balance is separate in the wallet;
  WC transfers between players are WCOIN only. Neither portal balance is
  mapped to an in-game currency: which game currency portal WC would
  correspond to is **UNRESOLVED** by decision (`GAP-P20-01`), automatic
  portal-to-game currency delivery is out of scope for the initial Beta
  (CLAIM-147), and whether Blood Coin equals the engine's GoblinPoint is
  unconfirmed.
- **answer_player_safe**: "Não. WCoin (WC) e Blood Coin são saldos
  diferentes na sua conta do portal, cada um com seus próprios pacotes na
  página Recarga. Eles não se convertem um no outro, e transferências
  entre jogadores são só de WC. Hoje esses saldos são usados no portal
  (loja, VIP, mercado); eles não viram Cash dentro do jogo
  automaticamente."
- **audience**: PLAYER · **visibility** (internal): `INTERNAL_SYSTEM`
- **source**: `docs/knowledge/CURRENCY_TERMINOLOGY.md` §0 items 2-3, Part 5;
  `context/BUSINESS_RULES.md:27`; `web/data/management.ts:3-7`;
  `web/composables/useCommerceApi.ts:204-207`;
  `api/src/modules/commerce/commerce.service.ts:166-167`.
- **verification_status**: `CODE_VERIFIED` + `DECISION_VERIFIED`
- **last_verified**: 2026-09-26 · **related_route**: `/recarga`,
  `/painel/transferencias` · **related_use_case**: UC-WALLET-001
- **known_limitations**: the pt-BR answer must not promise in-game use;
  some pages show raw currency codes (for example `WCOIN`) instead of the public names
  (`GAP-AI07-16`); the semantics of `GOBLIN_POINT`/`HUNT_POINT` still
  contradict across docs (`GAP-P20-07`).
- **ux_signal**: `UX_WORDING_PROBLEM` (raw codes), `BUSINESS_RULE_CONFUSION`
- **wiki_status**: `WIKI_ARTICLE_CANDIDATE` (a "Moedas do Blood Moon" page;
  the Wiki's static topic list has no currency article)

## FAQ-VIP-001 — Can I buy Bronze VIP?

- **question**: "Posso comprar VIP Bronze?"
- **normalized_topic**: VIP
- **answer_internal**: No. `DEC-VIP-001` (ACTIVE, 2026-09-17): commercial
  VIP is Free/Silver/Gold, `BRONZE_COMMERCIAL_ENABLED = false`; Bronze stays
  in the enum and history only. The deployed page `/painel/vip` shows only
  Silver (Prata) and Gold (Ouro), citing Bryan's Fase AD decision of
  2026-09-05 in a code comment. **Caveat:** the API purchase path does not
  itself refuse `BRONZE`; if an admin enabled a Bronze `VipProductConfig`
  with a price, `GET /vip/catalog` would return it and the API would sell
  it through a direct call (`GAP-AI07-13`). Whether production has such a
  row is `UNKNOWN`.
- **answer_player_safe**: "Não. Os planos VIP à venda são Prata e Ouro, na
  página VIP do seu painel. O Bronze não é oferecido aos jogadores."
- **audience**: PLAYER · **visibility** (internal): `INTERNAL_SYSTEM`
- **source**: `context/DECISIONS.md` `DEC-VIP-001`;
  `web/pages/painel/vip.vue:84-89,137`;
  `api/src/modules/vip/vip.service.ts:121-241`.
- **verification_status**: `DECISION_VERIFIED` + `CODE_VERIFIED`
- **last_verified**: 2026-09-26 · **related_route**: `/painel/vip`
- **related_use_case**: UC-VIP-001
- **known_limitations**: `GAP-AI07-13` (API does not enforce).
- **ux_signal**: `FAQ_NEED`
- **wiki_status**: `WIKI_ARTICLE_CANDIDATE` (the Wiki's static topic tree,
  `web/composables/useLocale.ts:164-173`, has no VIP topic)

## FAQ-VIP-002 — I bought VIP. How does it reach my character?

- **question**: "Comprei VIP, quando ele aparece no jogo?"
- **normalized_topic**: VIP
- **answer_internal**: The purchase debits the wallet, creates a
  `VipGrant` and queues a `GameBridgeJob` with operation `GRANT_VIP`. A
  delivery worker polls those jobs and sends the VIP level to the game
  account through the game-data worker, retrying on failure. It runs only
  if `VIP_DELIVERY_WORKER_ENABLED=true` and the game-data worker URL and
  portal command secret are configured, and the account needs a
  provisioned game-account identity. VIP is **account-level** (not per
  character). The page says "VIP {tier} ativado com sucesso." as soon as
  the portal records the grant, before and independently of in-game
  delivery. Whether the worker is enabled in production, and whether
  `GRANT_VIP` is deployed on the game side (`GAP-P20-02` lists it as
  implemented, not deployed, on the command-extension path) are `UNKNOWN`
  → `GAP-AI07-11`.
- **answer_player_safe**: "Depois da compra, o VIP fica registrado na sua
  conta do portal e é enviado automaticamente para a sua conta do jogo (é
  por conta, não por personagem). Se ele não aparecer no jogo depois de
  sair e entrar de novo, abra um ticket em Suporte no seu painel com a
  data da compra."
- **audience**: PLAYER · **visibility** (internal): `INTERNAL_SYSTEM`
  (worker/env details are `OPERATIONS_PRIVATE`)
- **source**: `api/src/modules/vip/vip.service.ts:121-241`;
  `api/src/modules/vip/vip-delivery.service.ts:9,59,84`;
  `web/pages/painel/vip.vue:160`;
  `docs/knowledge/KNOWLEDGE_GAPS.md` `GAP-P20-02`.
- **verification_status**: `CODE_VERIFIED_RUNTIME_UNKNOWN`
- **last_verified**: 2026-09-26 · **related_route**: `/painel/vip`,
  `/painel/suporte` · **related_use_case**: UC-VIP-001
- **known_limitations**: no timing can be promised; the player cannot see
  delivery status anywhere; VIP purchases are not listed in "Minhas
  compras" (`GAP-AI07-12`); support replies are not visible to players
  (`GAP-AI07-05`). The "sair e entrar" advice is general practice, not a
  verified requirement.
- **ux_signal**: `FAQ_NEED`, `UX_WORDING_PROBLEM` (success shown before
  delivery)
- **wiki_status**: `WIKI_ARTICLE_CANDIDATE` (together with FAQ-VIP-001, one
  "VIP" article)

## FAQ-ACCOUNT-001 — I forgot my password

- **question**: "Esqueci minha senha."
- **normalized_topic**: ACCOUNT
- **answer_internal**: UC-ACCOUNT-002. `/recuperar-conta` → e-mail +
  Turnstile → neutral message → link `/redefinir-senha?token=…` (valid 30
  min by default, single use) → new password 8-72 chars. Real delivery to
  an external mailbox is unproven in production (`GAP-AI07-07`).
- **answer_player_safe**: "Na tela de login ou no rodapé, clique em
  Recuperar senha, informe o e-mail da conta e siga o link que enviaremos
  (ele expira e só pode ser usado uma vez). Se o e-mail não chegar, confira
  a caixa de spam e depois abra um ticket em Suporte."
- **audience**: PLAYER · **visibility** (internal): `INTERNAL_SYSTEM`
- **source**: see UC-ACCOUNT-002.
- **verification_status**: `CODE_VERIFIED_RUNTIME_UNKNOWN`
- **last_verified**: 2026-09-26 · **related_route**: `/recuperar-conta`,
  `/redefinir-senha` · **related_use_case**: UC-ACCOUNT-002
- **known_limitations**: a player who cannot log in cannot open a support
  ticket (tickets need login) and the Discord header button has no target
  (`GAP-AI07-17`); there is no public contact channel proven in code.
  Account help is not portal-page content for the Wiki's game topics.
- **ux_signal**: `FAQ_NEED`
- **wiki_status**: `NOT_WIKI_CONTENT` (portal/account help; belongs in a
  help/FAQ page, not the game Wiki)

## FAQ-DOWNLOADS-001 — Where do I download the game?

- **question**: "Onde baixo o jogo / o launcher?"
- **normalized_topic**: DOWNLOADS
- **answer_internal**: UC-LAUNCHER-001. `/downloads`: Launcher v1.1.0 and
  Full Client v1.1.0 (launcher included), MediaFire links; Patch and Extras
  "Em breve". Link availability `UNKNOWN` (`GAP-AI07-14`).
- **answer_player_safe**: "No menu Downloads. Se é sua primeira vez, baixe
  o Cliente Completo (já vem com o launcher). Se você já tem o jogo, baixe
  só o Launcher; depois ele se atualiza sozinho."
- **audience**: PLAYER · **visibility** (internal): `PUBLIC_PLAYER`
- **source**: `web/pages/downloads.vue:44-60`.
- **verification_status**: `CODE_VERIFIED`
- **last_verified**: 2026-09-26 · **related_route**: `/downloads`
- **related_use_case**: UC-LAUNCHER-001
- **known_limitations**: `GAP-AI07-14`.
- **ux_signal**: none
- **wiki_status**: `WIKI_UPDATE_CANDIDATE` (the Wiki's "Primeiros passos"
  topic is the natural home; its body lives in the CMS database and was
  not read)

## Question the base must not answer (UNKNOWN example)

"Quanto tempo demora para o VIP chegar no jogo?" — **UNKNOWN**. No code
sets a delivery deadline and the production worker state is unknown. The
correct response is FAQ-VIP-002's player-safe answer without a time, plus
a gap entry (`GAP-AI07-11`), never an invented number.
