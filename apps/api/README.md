# Blood Moon API

Backend planejado para o portal Blood Moon.

Stack alvo:

- NestJS
- MySQL/MariaDB
- Prisma
- Redis
- Storage S3/R2/MinIO para imagens

Este diretorio possui a API NestJS para servir a base de conhecimento consolidada no MySQL/MariaDB.

## Modulos

- `auth`: login, sessao unica, historico de dispositivos, 2FA TOTP, refresh token, recuperacao e troca de senha.
- `accounts`: contas, perfis, status, moedas e seguranca.
- `characters`: personagens, acoes administrativas e leitura do servidor MU.
- `shop`: produtos, categorias, estoque e entrega.
- `recharge`: pacotes, pagamentos e creditos.
- `audit`: trilha de auditoria.
- `references`: imagens, fontes, itens, mapas, monstros e dados coletados.
- `tickets`: suporte e atendimento.
- `game-integration`: camada isolada para comunicacao com o servidor MU.
- `wiki`: leitura de entradas, assets e equipamentos consolidados no MySQL/MariaDB.
- `commerce`: loja, pacotes de recarga, intencoes de compra/recarga e filas financeiras.
- `marketplace`: anuncios entre jogadores, pedidos e jobs de ponte com o servidor MU.
- `muserver-export`: leitura dos arquivos reais extraidos do backup do MuServer para inventario, CMS e Wiki.
- `web-source`: inventario seguro da base web atual para migracao modular.

## Desenvolvimento

```bash
npm --workspace @blood-moon/api run dev
```

API local:

```text
http://localhost:3333/api
```

Endpoints iniciais:

- `GET /api/wiki/summary`
- `GET /api/wiki/entries`
- `GET /api/wiki/equipment`
- `GET /api/wiki/equipment/sets`
- `GET /api/wiki/equipment/missing-references`
- `GET /api/wiki/equipment/:key`

MuServer exportado:

- `GET /api/muserver-export/summary`
- `GET /api/muserver-export/cms-modules`
- `GET /api/muserver-export/inventory`
- `GET /api/muserver-export/items`
- `GET /api/muserver-export/skills`
- `GET /api/muserver-export/monsters`
- `GET /api/muserver-export/monster-spawns`
- `GET /api/muserver-export/maps`
- `GET /api/muserver-export/cash-shop-products`
- `GET /api/muserver-export/event-item-bags`
- `GET /api/muserver-export/files/:group`

As rotas de MuServer exportado sao somente leitura e usam os JSONs gerados em `references/game-data/muserver-export`.

Fonte web atual:

- `GET /api/source-web/current/summary`
- `GET /api/source-web/current/controllers`
- `GET /api/source-web/current/models`
- `GET /api/source-web/current/plugins`
- `GET /api/source-web/current/server-data`
- `GET /api/source-web/current/item-image-groups`
- `GET /api/source-web/current/reuse-plan`
- `GET /api/source-web/current/migration-board`
- `GET /api/source-web/current/normalized-domains`

As rotas de Fonte web atual exigem Bearer token com role `ADMIN` ou `SUPER_ADMIN`, sao somente leitura e usam `references/web-source-current/catalog.json` e `references/web-source-current/normalized-domains.json`.

Auth:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/change-password`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/2fa/disable`
- `GET /api/account/profile`
- `GET /api/account/sessions`

Contas de teste sao criadas somente pelo seed local documentado em
`src/modules/auth/README.md`. Login nunca cria contas automaticamente e nao ha
senha fixa de desenvolvimento no codigo.

O cadastro cria contas `PLAYER` ativas, grava senha e Personal ID com bcrypt, inicializa `WCOIN`, `GOBLIN_POINT` e `HUNT_POINT` com saldo `0` e registra auditoria `auth.account.registered`.
O login retorna permissoes e moedas reais do MySQL/MariaDB; a interface nao usa
fallback local para papel, status ou saldo.
`GET /api/account/profile` retorna perfil, status, Personal ID mascarado e moedas da conta logada.
Troca de senha exige Bearer token, senha atual, Personal ID e nova senha; a API valida hashes bcrypt e registra `auth.password.changed`.
Cada login cria uma sessao persistida e revoga as sessoes ativas anteriores. Access token e refresh token carregam o identificador da sessao; sessoes revogadas ou expiradas sao recusadas pelo guard.
O 2FA usa TOTP compativel com aplicativos autenticadores. O segredo fica criptografado com AES-256-GCM e exige `TWO_FACTOR_ENCRYPTION_KEY` em producao.

Admin CMS:

- `GET /api/admin/content/summary`
- `GET /api/admin/content/entries`
- `POST /api/admin/content/entries`
- `PATCH /api/admin/content/entries/:id`
- `DELETE /api/admin/content/entries/:id`
- `GET /api/admin/content/assets`
- `POST /api/admin/content/assets`
- `PATCH /api/admin/content/assets/:id`
- `DELETE /api/admin/content/assets/:id`
- `GET /api/admin/content/equipment`
- `POST /api/admin/content/equipment`
- `PATCH /api/admin/content/equipment/:id`
- `DELETE /api/admin/content/equipment/:id`
- `GET /api/admin/content/equipment-gaps`

As rotas `/api/admin/content/*` exigem Bearer token e role `ADMIN` ou `SUPER_ADMIN`.

Admin contas:

- `GET /api/admin/accounts`
- `PATCH /api/admin/accounts/:id`

As rotas `/api/admin/accounts/*` exigem Bearer token, papel administrativo e permissao granular.
O endpoint de listagem aceita `page`, `pageSize`, `search`, `role` e `status`.
O endpoint de edicao exige justificativa. `ADMIN` altera somente status de
`PLAYER`; apenas `SUPER_ADMIN` promove ou rebaixa entre `PLAYER` e `ADMIN`.

Comercio:

- `GET /api/shop/products`
- `POST /api/shop/purchases`
- `GET /api/recharge/packages`
- `POST /api/recharge/intents`
- `GET /api/account/purchases`
- `GET /api/account/recharges`
- `GET /api/admin/shop/products`
- `POST /api/admin/shop/products`
- `PATCH /api/admin/shop/products/:id`
- `DELETE /api/admin/shop/products/:id`
- `GET /api/admin/recharge/packages`
- `POST /api/admin/recharge/packages`
- `PATCH /api/admin/recharge/packages/:id`
- `DELETE /api/admin/recharge/packages/:id`
- `GET /api/admin/finance/purchases`
- `GET /api/admin/finance/recharges`
- `PATCH /api/admin/finance/purchases/:id/status`
- `PATCH /api/admin/finance/recharges/:id/status`

As rotas publicas de leitura mostram somente produtos/pacotes ativos. Criar intencao de compra/recarga exige login. Rotas administrativas exigem `ADMIN` ou `SUPER_ADMIN`.

Marketplace:

- `GET /api/marketplace/listings`
- `POST /api/marketplace/listings`
- `DELETE /api/marketplace/listings/:id`
- `POST /api/marketplace/orders`
- `GET /api/account/marketplace/listings`
- `GET /api/account/marketplace/orders`
- `GET /api/admin/marketplace/listings`
- `POST /api/admin/marketplace/listings/:id/activate`
- `PATCH /api/admin/marketplace/listings/:id/status`
- `PATCH /api/admin/marketplace/orders/:id/status`
- `GET /api/admin/game-bridge/jobs`
- `PATCH /api/admin/game-bridge/jobs/:id`

O marketplace usa `PlayerMarketListing`, `PlayerMarketOrder` e `GameBridgeJob`.
O anuncio nasce como `PENDING_LOCK` e so deve ficar `ACTIVE` depois que o item for travado no servidor do jogo. Enquanto o worker real nao existir, a ativacao administrativa serve apenas para desenvolvimento.

Worker da ponte com o jogo:

```bash
npm --workspace @blood-moon/api run worker:game-bridge
```

Com `MU_BRIDGE_ENABLED=false`, o worker apenas lista jobs pendentes em modo seguro. A conexao real com banco/servidor MU ainda precisa ser implementada antes de ligar `MU_BRIDGE_ENABLED=true`.

Auditoria administrativa:

- `GET /api/admin/audit/events`

Exige permissao `admin.audit.view` e le `AuditEvent` do MySQL/MariaDB. Eventos
financeiros, de papel e configuracao estrategica nao sao expostos ao `ADMIN`.

## Banco de dados

O Prisma esta em `apps/api/prisma`.

Modelos ja previstos:

- `Account`, `AccountCurrency` e `AuditEvent`.
- `ShopProduct`, `RechargePackage`, `PurchaseIntent` e `RechargeIntent`.
- `ReferenceSource` para fontes externas e internas.
- `KnowledgeEntry` para conteudo de Wiki, itens, mapas, skills, drops e eventos.
- `ReferenceAsset` para imagens, HTML, textos e JSON coletados.
- `KnowledgeEntryAsset` para vincular conteudo e assets.

Documentacao especifica:

- `apps/api/prisma/README.md`
- `docs/knowledge-base-pipeline.md`

Setup local com Docker:

```bash
npm run db:setup
```

Esse comando aplica o schema Prisma no MySQL/MariaDB configurado em `DATABASE_URL`.
No ambiente Docker local, use o servico `mysql` do `docker-compose.yml`.

Se Docker nao estiver instalado, configurar um MySQL/MariaDB manualmente com:

```bash
mysql://bloodmoon:bloodmoon@localhost:53306/bloodmoon_portal
```

Depois do banco preparado:

```bash
npm run db:import
```

Verificacao estrutural e TypeScript:

```bash
npm run api:check
```

## Regra importante

O banco do portal nao deve ser misturado diretamente com o banco do jogo. Toda integracao com dados do servidor MU deve passar por servicos controlados e auditados.
Para marketplace entre jogadores, o portal registra a intencao, cria jobs idempotentes e so finaliza moeda/entrega depois da confirmacao do worker do jogo.
