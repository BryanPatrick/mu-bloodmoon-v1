# Blood Moon API

Backend planejado para o portal Blood Moon.

Stack alvo:

- NestJS
- PostgreSQL
- Prisma
- Redis
- Storage S3/R2/MinIO para imagens

Este diretorio agora possui a primeira API executavel em NestJS para servir a base de conhecimento consolidada no PostgreSQL.

## Modulos

- `auth`: login, sessao, refresh token, recuperacao e troca de senha.
- `accounts`: contas, perfis, status, moedas e seguranca.
- `characters`: personagens, acoes administrativas e leitura do servidor MU.
- `shop`: produtos, categorias, estoque e entrega.
- `recharge`: pacotes, pagamentos e creditos.
- `audit`: trilha de auditoria.
- `references`: imagens, fontes, itens, mapas, monstros e dados coletados.
- `tickets`: suporte e atendimento.
- `game-integration`: camada isolada para comunicacao com o servidor MU.
- `wiki`: leitura de entradas, assets e equipamentos consolidados no PostgreSQL.
- `commerce`: loja, pacotes de recarga, intencoes de compra/recarga e filas financeiras.
- `marketplace`: anuncios entre jogadores, pedidos e jobs de ponte com o servidor MU.

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

Auth:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/change-password`
- `GET /api/account/profile`

Credenciais locais de desenvolvimento:

- Admin: `admin / admin`
- Admin Personal ID: `admin`
- Player: `player / player`
- Player Personal ID: `player`

O cadastro cria contas `PLAYER` ativas, grava senha e Personal ID com bcrypt, inicializa `WCOIN`, `GOBLIN_POINT` e `HUNT_POINT` com saldo `0` e registra auditoria `auth.account.registered`.
O login retorna `user.currencies` com os saldos reais do PostgreSQL para o header e painel nao dependerem de fallback local.
`GET /api/account/profile` retorna perfil, status, Personal ID mascarado e moedas da conta logada.
Troca de senha exige Bearer token, senha atual, Personal ID e nova senha; a API valida hashes bcrypt e registra `auth.password.changed`.

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

As rotas `/api/admin/accounts/*` exigem Bearer token e role `ADMIN` ou `SUPER_ADMIN`.
O endpoint de listagem aceita `page`, `pageSize`, `search`, `role` e `status`.
O endpoint de edicao altera `role` e/ou `status`, registra auditoria server-side e retorna a conta no mesmo contrato da listagem.

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

Exige `ADMIN` ou `SUPER_ADMIN` e le `AuditEvent` do PostgreSQL.

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

Esse comando sobe o servico `postgres` do `docker-compose.yml` e aplica as migrations Prisma.
Se o Docker nao estiver saudavel, ele usa o PostgreSQL local instalado e cria um cluster isolado em `work/postgres-data`.

Se Docker nao estiver instalado, configurar um PostgreSQL manualmente com:

```bash
postgresql://bloodmoon:bloodmoon@localhost:55432/bloodmoon_portal?schema=public
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
