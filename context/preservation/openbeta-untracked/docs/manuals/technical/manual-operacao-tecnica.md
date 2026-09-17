---
status: LIVING_DOCUMENT
category: manuals/technical-operations
audience: engineering / technical operators
lastVerified: 2026-09-04 (Fase Launcher 2D)
---

# Manual de Operação Técnica — Blood Moon

Este é o manual operacional para quem mantém a infraestrutura do Blood
Moon em funcionamento — arquitetura de cada componente, como configurar,
como diagnosticar problemas, e procedimentos "como fazer" passo a passo.

## 1. Visão geral da arquitetura

```
Jogador
  → Portal (apps/web, Nuxt) → API (apps/api, NestJS) → MySQL (dados do Portal)
  → Launcher → download de conteúdo servido pela API/CDN

Portal (decisão) → Cloudflare Worker (transporte durável) → GameBridge Agent (.NET)
  → SQL Server¹ real (dados do GameServer, banco MuOnline)
```

O Portal e o GameServer são **dois bancos de dados completamente
separados** (MySQL vs. SQL Server), com sistemas de moeda, contas e
identidade distintos, conectados apenas através do pipeline do
GameBridge — nunca por acesso direto de um sistema ao banco do outro.

## 2. Portal (`apps/web`)

Framework: Nuxt (Vue 3). Se comunica com a API via `$fetch`, usando um
token de acesso guardado em `localStorage` (`blood-moon-auth`), enviado
como cabeçalho `Authorization: Bearer <token>`.

**Como rodar localmente**: `npm run web:dev` (a partir da raiz do
repositório) — inicia o Nuxt em modo desenvolvimento na porta 3000.

**Build de produção — regra importante**: sempre use `npm run web:build`
(raiz do repositório), **nunca** `npx nuxt build` direto — o script raiz
aplica um patch necessário no output do Nitro² depois do build
(`scripts/patch-nitro-output.mjs`); pular esse patch produz um build que
falha em runtime.

## 3. API (`apps/api`)

Framework: NestJS. Persistência via Prisma ORM contra MySQL.

**Como rodar localmente**: precisa de `DATABASE_URL` (MySQL local),
`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` no
mínimo. Ver `docs/environment/development-environment.md` para a
credencial local (protegida via DPAPI³, nunca em texto puro).

**Checagem completa antes de considerar uma mudança pronta**:
```bash
cd apps/api && npm run check
```
Roda todas as verificações de estrutura por módulo mais `tsc --noEmit`.

## 4. MySQL (Portal)

Banco local de desenvolvimento: `bloodmoon_local`, usuário `bloodmoon`,
credencial protegida via DPAPI (`D:\MU\.secrets\mysql-bloodmoon-local.credential.xml`
neste ambiente específico — o caminho real varia por máquina).

**Migrações**: o usuário local não tem permissão para criar o banco
"shadow"⁴ que `prisma migrate dev` exige — todas as migrações deste
projeto são escritas manualmente no estilo que o Prisma geraria, e
aplicadas com `npx prisma migrate deploy` (que não precisa do banco
shadow). Ver qualquer arquivo em `apps/api/prisma/migrations/` recente
como exemplo do estilo esperado.

## 5. SQL Server (GameServer)

Banco de produção: `MuOnline`, acessado apenas via `bm-sql` (ferramenta
somente-leitura, login `bloodmoon_observer`) para consulta, e via o
GameBridge Agent + `bloodmoon_writer` (login de escrita, privilégio
mínimo⁵) para as operações reais.

**Fato central do schema real**: existe **exatamente uma** foreign key⁶
declarada em todo o banco (`FK_CustomQuest_Character`,
`CustomQuest.Name → Character.Name`, `ON DELETE CASCADE`) — todo o resto é
relação lógica, garantida só pelo código da aplicação, nunca pelo banco.
Isso significa que qualquer operação de limpeza (anonimizar, expurgar)
precisa tratar cada tabela relacionada explicitamente — nada cascateia
sozinho, exceto esse único caso.

### Ambiente de teste local de SQL Server

Ver seção 12 (procedimentos "como fazer") para o passo a passo completo
de reconstrução. Resumo: SQL Server 2022 Developer Edition instalado
localmente (modo misto de autenticação ativo), banco descartável
`bloodmoon_gamebridge_test`, login `bloodmoon_writer_local` com o mesmo
modelo de privilégio mínimo da produção.

## 6. GameServer

O servidor de jogo em si — fora do escopo de código deste repositório
(binário do MU Online), mas o schema do seu banco (`MuOnline`) é
documentado extensivamente em `docs/game-data/schema/`.

## 7. GameBridge Agent (`apps/game-bridge-agent`)

Processo .NET 8, roda no mesmo servidor que o GameServer (produção) ou
localmente para teste. Faz polling⁷ de comandos disponíveis no Worker,
executa a stored procedure correspondente contra o SQL Server via o login
`bloodmoon_writer`, e reporta o resultado de volta.

**Como rodar os testes** (unitários + integração real com SQL Server
local, se configurado):
```bash
cd apps/game-bridge-agent/BloodMoon.GameBridgeAgent.Tests
dotnet test
```

**SDK necessário**: .NET 8 SDK. Instalação por usuário (sem precisar de
administrador) via o script oficial:
```powershell
Invoke-WebRequest -Uri "https://dot.net/v1/dotnet-install.ps1" -OutFile "$env:TEMP\dotnet-install.ps1" -UseBasicParsing
& "$env:TEMP\dotnet-install.ps1" -Channel 8.0 -InstallDir "$env:LOCALAPPDATA\Microsoft\dotnet"
```
**Limitação conhecida**: essa instalação não altera o PATH permanente do
sistema — cada nova sessão de terminal precisa adicionar manualmente
`$env:LOCALAPPDATA\Microsoft\dotnet` ao início do `$env:PATH` antes de
usar `dotnet`.

## 8. Cloudflare Worker (`apps/game-data-worker`)

TypeScript, roda na borda da Cloudflare. Recebe, valida (assinatura HMAC⁸)
e enfileira os comandos do GameBridge antes de disponibilizá-los para o
Agent buscar.

**Como rodar os testes** (D1⁹ local real, sem precisar de conta Cloudflare):
```bash
cd apps/game-data-worker && npm test && npm run typecheck
```

## 9. D1 / Queue

D1 é o banco SQLite gerenciado pela Cloudflare, usado como armazenamento
durável do estado de cada comando (`game_command`). Queue é o mecanismo
de fila que leva o `commandId` do momento da criação até o momento em que
ele fica disponível para o Agent reivindicar.

## 10. Launcher / CMS / Launcher Studio

O Launcher consome conteúdo (avisos, banners, changelog) publicado pelo
CMS/Launcher Studio administrativo — ver o manual de Super ADM/ADM para o
lado operacional dessas telas.

## 10a. Launcher — autenticação, CAPTCHA e Play gating (Fase 2D, 2026-09-04)

O login do Launcher exige `captchaToken` real em toda chamada
`POST /auth/login`, igual ao Portal web. O Launcher renderiza o
desafio Cloudflare Turnstile real dentro de um controle WebView2
(pacote NuGet `Microsoft.Web.WebView2`), navegando para uma página
real e hospedada (`/launcher/captcha` no Portal web, mesmo componente
`TurnstileWidget.vue` e mesma site key do login web) — nunca um token
falso, nunca um bypass. `LauncherApiClient.IsSecureOrLoopback` exige
HTTPS para qualquer host real; a única exceção é `http://localhost`/
`127.0.0.1` (QA local, sem TLS local configurado), nunca para um host
remoto.

O botão JOGAR agora é bloqueado corretamente quando a conta está
autenticada mas `gameReady=false` (conta de jogo ainda em
provisionamento) — antes desta fase, `PlayState.GameAccountNotReady`
existia no código mas nunca era realmente produzido (bug real,
confirmado e corrigido; ver `docs/launcher/phase-2d-auth-captcha-play-gating.md`).

## 11. Deployment, configuração, segredos

- **Produção do Portal**: hospedagem cPanel — deploy é feito por sessão
  de navegador autenticada, nunca por acesso SSH/shell direto (não existe
  esse acesso neste projeto).
- **Segredos**: nunca em texto puro em nenhum arquivo versionado.
  Credenciais locais de desenvolvimento são protegidas via DPAPI³
  (Windows) e ficam fora da árvore do repositório Git. Ver
  `docs/security/secret-rotation.md` e `docs/security/secret-incident-history.md`.
- **Backup**: fora do escopo direto deste manual nesta versão — ver
  `docs/operations/` para o que já existe documentado sobre retenção e
  isolamento de banco de teste.

## 11b. Pagamentos (Fase P, 2026-08-31)

Módulo: `apps/api/src/modules/commerce/` + `apps/api/src/modules/payments/`.

### Observabilidade de webhook

`commerce.service.ts#handleMercadoPagoWebhook` emite eventos
operacionais (`ObservabilityService.recordOperationalEvent`, módulo
`store`) em cada etapa do ciclo de vida de um webhook:
`PAYMENT_WEBHOOK_RECEIVED` (chegou) → `PAYMENT_WEBHOOK_DUPLICATE` (já
processado, atalho) ou `PAYMENT_WEBHOOK_INVALID_SIGNATURE` (assinatura
inválida, encerra ali) → `PAYMENT_WEBHOOK_VERIFIED` (assinatura válida)
→ eventos específicos de reconciliação
(`PAYMENT_CONFIRMED`/`PAYMENT_AMOUNT_MISMATCH`/etc.). Nenhum evento grava
o payload bruto do webhook — esse já fica em `PaymentWebhookEvent.rawPayload`,
uma única vez, sem duplicar.

### Rastreamento de proveniência no ledger

`WalletLedgerEntry.paymentProvenanceRef` liga um crédito de volta ao
`RechargeIntent` que o originou; `WalletLedgerEntry.metadata` registra
`{baseAmount, bonusAmount, grossPaidBRL, provider}` explicitamente no
próprio crédito de WC (Fase O) — nunca é preciso fazer join para saber a
composição de um crédito. `counterpartyAccountId` (populado apenas por
`settleTaxedCredit()`, transferências P2P/venda no market) é a base do
rastreamento de dispersão de chargeback:
`WalletLedgerService.traceChargebackDispersal(rechargeIntentId)` faz uma
busca em largura, limitada a 10 saltos, avançando apenas no tempo a
partir do crédito original.

### Diagnóstico de entrega — VIP

`GameBridgeVipGateway` (Fase O) usa submissão-depois-consulta em duas
fases: a primeira chamada envia o comando `GRANT_VIP` real
(`GameCommandTransportClient`) e retorna
`GAME_COMMAND_SUBMITTED_AWAITING_CONFIRMATION` com um `gameCommandId`;
chamadas seguintes consultam o mesmo `gameCommandId` até `SUCCEEDED` (ou
`FAILED_FINAL`/`EXPIRED`, que limpam o `gameCommandId` para permitir uma
nova submissão — o `bm_GrantVip` nativo é idempotente por regra de MAX,
então reenviar é sempre seguro). Diagnostique via `GameBridgeJob.status`/
`.error` (Portal) e `bm_GameBridgeAudit` (SQL Server, ver ADR-0002).

### Diagnóstico de entrega — itens da Loja

`StoreDelivery.status`/`.attempts`/`.lastError` (tabela separada de
`PurchaseIntent`, um pedido pode ter múltiplas entregas). Ações manuais
via `/painel/admin/loja` → aba Entregas: Processar/Concluir/Reprocessar/
Falhou — `reprocess` é recusado quando `attempts >= maxAttempts` (padrão
3), exigindo revisão manual em vez de repetir indefinidamente.

### Reconciliação — local vs. provedor real

Duas checagens, dois interruptores independentes:

| | Verifica | Interruptor | Intervalo padrão |
|---|---|---|---|
| Local (`PaymentReconciliationService.runOnce`) | `PAID_WITHOUT_LEDGER_CREDIT`, `STUCK_NON_TERMINAL` — só consistência do banco local | `PAYMENT_RECONCILIATION_ENABLED` | `PAYMENT_RECONCILIATION_INTERVAL_MS` (5 min) |
| Provedor real (`pollProviderForStuckPayments`) | Consulta o Mercado Pago de verdade para recargas paradas (`PENDING`/`PROCESSING`/`REFUND_PENDING`/`MANUAL_REVIEW`) | `MERCADO_PAGO_PROVIDER_POLL_ENABLED` | `MERCADO_PAGO_PROVIDER_POLL_INTERVAL_MS` (10 min) |

Ambas usam o mesmo padrão `setInterval` + `GET_LOCK` MySQL nomeado já
usado por `vip-sync.service.ts`/`vip-delivery.service.ts` (nomes de lock
distintos: `bloodmoon:payment-reconciliation` e
`bloodmoon:payment-provider-poll`, para não brigarem entre si). O poll ao
provedor real tem limite de taxa (`MERCADO_PAGO_PROVIDER_POLL_BATCH_SIZE`,
padrão 20 por execução; nunca reconsulta a mesma recarga em menos de 5
minutos) e é rastreável (`reconcileFromProviderPoll` usa
`source: 'system-poll'` no log de auditoria, distinto de `'admin'`/`'webhook'`).
**`SANDBOX_VALIDATION_REQUIRED`**: desligado por padrão em todo ambiente
real — nunca ligar sem antes validar contra um sandbox de verdade do
Mercado Pago.

### Adaptador de estorno real (Mercado Pago)

`MercadoPagoProvider.refundOrder()` (Fase P) chama
`POST /v1/orders/{id}/refund` — contrato confirmado contra a
documentação oficial viva do Mercado Pago durante esta fase
(`mercadopago.com.ar/developers/en/reference/online-payments/checkout-api/refund-order/post`),
com testes de contrato reais usando `fetch` mockado
(`apps/api/test/mercadopago-refund-adapter.e2e-spec.ts`). **Nunca
verificado contra uma chamada real** — nenhuma credencial de sandbox
esteve disponível. Só é alcançável via
`CommerceService.attemptProviderRefund()`, que exige
`MERCADO_PAGO_REFUND_ENABLED=true` além da permissão
`admin.recharge.provider-refund` — desligado por padrão.

## 11c. Restricoes, transferencia de WC, compra de VIP (Fase Q, 2026-08-31)

### Enforcement centralizado

`PaymentRiskService` (nao um servico novo -- estendido) expoe
`assertNoActivePaymentRestriction`/`assertNoActiveTransferRestriction`/
`assertNoActiveAccountRestriction`, todas sobre o mesmo helper privado
(`hasActiveAction`) que consulta `PaymentRiskCaseAction` (`action`,
`liftedAt: null`, `riskCase.accountId`). Pontos de chamada reais:
`commerce.service.ts#createRechargeCheckout` (payment + account),
`commerce.service.ts#createPurchaseIntent` (account),
`vip.service.ts#purchase` (account),
`wallet-transfer.service.ts#transfer` (transfer + account). Nunca
chamado em login, sessao, ou qualquer rota de jogo.

### `WalletTransferModule` (modulo novo)

Nao foi colocado dentro de `WalletModule` -- `WalletModule` e uma
dependencia de `CommerceModule` (via `WalletLedgerService`), entao
`WalletModule` importar `CommerceModule` de volta (necessario para
`PaymentRiskService`) criaria um ciclo real de dependencia. `WalletTransferModule`
fica acima dos dois (`imports: [WalletModule, CommerceModule, ...]`).
Rota real: `POST /wallet/transfers`.

### Sinais de risco de transferencia

`WalletTransferService#evaluateTransferRiskSignals` roda DEPOIS do
commit da transferencia (mesmo padrao "advisory, nunca bloqueia a
transacao real" de `commerce.service.ts#fireRiskHooks`), consultando
`WalletLedgerEntry` real para os quatro sinais (ver manual de Super ADM
para a explicacao de produto de cada um). Env vars de limiar:
`WALLET_DIRECT_TRANSFER_MIN_WC` (20), `RISK_IMMEDIATE_TRANSFER_WINDOW_MINUTES`
(30), `RISK_NEAR_FULL_BALANCE_PERCENT` (90),
`RISK_MANY_RECIPIENTS_WINDOW_HOURS`/`_THRESHOLD` (24h/3),
`RISK_REPEATED_RECIPIENT_WINDOW_HOURS`/`_SENDERS_THRESHOLD` (24h/3).

### Novos endpoints VIP (player-facing)

`GET vip/benefits` (publico) -- so os dois campos de beneficio
realmente aprovados (`warehouseBonusPages`/`commandCostReductionPercent`),
nunca xp/drop/chaosMachine/reset. `GET account/vip/history` (JWT) --
historico de compras do proprio jogador, preco real vindo do
`WalletLedgerEntry` (`vip-purchase-debit:<idempotencyKey>`), nao do
`VipProductConfig` atual (que pode ja ter mudado desde a compra).

## 11d. Fechamento de decisoes (Fase Q -- fechamento de decisoes, 2026-08-31)

### `MarketplaceModule` agora importa `CommerceModule`

Adicionado especificamente para `PaymentRiskService`
(`assertNoActiveTransferRestriction`) dentro de
`marketplace.service.ts#createOrder`. Sem ciclo: `CommerceModule` nunca
importa `MarketplaceModule` de volta (confirmado antes de ligar).
`VipModule` ja tinha o mesmo import desde a Fase Q -- nenhuma novidade
estrutural, so mais um consumidor do mesmo padrao.

Auditoria real do fluxo economico de `marketplace.service.ts`, acao por
acao (corrige a recomendacao anterior da Fase Q, que estava invertida):

| Acao | Movimento de WC | Gateado? |
|---|---|---|
| `createOrder` (Compra) | Debita o comprador, endereca ao vendedor especifico do anuncio | **SIM** -- `assertNoActiveTransferRestriction()` |
| `createListing` (Anuncio) | So taxa de publicacao para a plataforma (`STORE_PURCHASE`) | Nao (nao e P2P) |
| Cancelar anuncio | Nenhum movimento de WC | Nao |
| `updateOrderStatus` -> COMPLETED (Liquidacao) | Credita o vendedor via `settleTaxedCredit()`, cumprindo um pedido JA pago | Nao (entrada, nao dispersao) |
| Reembolso (status REFUNDED) | Credita o comprador de volta | Nao (entrada) |

So `createOrder` foi gateado -- todo o resto move WC PARA a conta
restrita ou nao e P2P, e bloquear teria criado exatamente o deadlock
financeiro que este projeto evita por principio (ver secao 11c, item 3
do diagnostico abaixo).

### `vip.service.ts#purchase` -- ordem da transacao invertida

Antes: debitava o WC primeiro, so depois checava/atualizava o
entitlement. Agora: busca o `VipEntitlement` atual PRIMEIRO, calcula
`currentlyActive`, e lanca `BadRequestException({ code:
'VIP_TIER_CHANGE_BLOCKED' })` ANTES de qualquer debito se
`currentlyActive && current.tier !== product.tier` -- garante que uma
compra bloqueada nunca debita WC nem toca o entitlement (nao e um
rollback, e uma checagem que acontece antes de qualquer mutacao).

### Dois novos endpoints em `WalletTransferModule`

`GET wallet/transfers/fee-info` (JWT) -- `{ currency: 'WCOIN',
taxPercent, minimumAmount }`, lendo a MESMA linha
`MarketplaceEconomyConfig.wcoinTaxPercent` que `settleTaxedCredit()` usa
(nao o payload completo, admin-only, de `/admin/marketplace/economy`,
que carrega campos irrelevantes para uma tela de transferencia como
`publicationFee`). `GET wallet/transfers/history` (JWT) -- pareia as
duas linhas de ledger de cada transferencia (debito do remetente +
credito taxado do destinatario, mesmo `sourceId`) numa unica linha do
ponto de vista de quem chama (`SENT`/`RECEIVED`, bruto/taxa/liquido,
username da contraparte resolvido, `status: 'SETTLED'`) -- le somente
`WalletLedgerEntry`, nunca `PaymentRiskSignal`/`PaymentRiskCase`, entao
nao ha como metadado de risco vazar para esse endpoint.

### Diagnostico -- restricao nao aplicando ou nao removendo

1. Confirme a permissao do admin (`admin.risk.manage`) -- sem ela, o
   endpoint retorna 403 antes de chegar em qualquer logica de negocio.
2. `GET /admin/finance/risk-cases/:id` mostra `actions[]` com
   `liftedAt` -- `null` significa ativa.
3. Uma restricao so afeta o CONTEXTO explicitamente gateado (ver a
   tabela na secao 5c do manual de Super ADM) -- se uma acao que
   deveria estar bloqueada nao esta, confirme se aquele ponto de
   chamada especifico realmente tem um `assertNoActive*()` (nem toda
   acao comercial tem checagem de ACCOUNT_RESTRICTION por design --
   reembolso feito por um admin e reconciliacao NUNCA sao gateados,
   deliberadamente, para nunca criar um deadlock financeiro).

## 11e. Catalogo legado X-Shop/CashShop (Fase S, 2026-09-02)

### `legacy-catalog-policy.ts` -- blocklist real, gerada, nao lida em runtime

`apps/api/src/modules/commerce/legacy-catalog-policy.ts` contem os 153
keys `NOT_FOR_COMMERCIAL_SALE` + 12 `BALANCE_TEST_REQUIRED` como
`Set<string>` estatico (formato `"{ItemType}-{ItemIndex}"`, identico ao
`key` de `commerce-item-catalog.json`). Gerado a partir do CSV da Fase R
-- NAO le o CSV em runtime. Uma futura re-revisao exige regenerar este
arquivo manualmente junto com a ADR, nunca automatico.

`StoreAdminService#catalogItemBlocked` (o portao real de
`importCatalog()`) agora chama `classifyLegacyCatalogKey(item.key)`
alem da heuristica de texto antiga -- fecha um gap real: a heuristica
antiga nunca sabia nada sobre a configuracao +13/excellent do X-Shop
(dado que vive em `CustomXShop.txt`, nao no catalogo-base que
`importCatalog()` le). Testado em
`apps/api/test/store-legacy-catalog-import.e2e-spec.ts` contra o
catalogo real de producao (nao mockado).

### `LegacyCatalogItem` -- camada de "estado desejado", sem sync real

Novo modelo Prisma (migracao
`20260902100000_phase_s_legacy_catalog_item`, aplicada so no banco
local Claude-only). Uma linha por item real do X-Shop/CashShop (180
total). `LegacyCatalogConfigService#seedAll` semeia de forma idempotente
a partir de `legacy-catalog-seed-data.xshop.ts`/`.cashshop.ts` (tambem
gerados, mesmo principio do policy.ts acima).

**Trava real em `#update`**: `NOT_FOR_COMMERCIAL_SALE` e
`DEAD_UNRESOLVABLE_CATALOG_ROW` nunca podem virar `purchasable=true` nem
`commercialStatus=APPROVED/PUBLISHED` -- `ForbiddenException`
incondicional, sem permissao de override. Testado (incluindo via
navegador ao vivo, nao so pela suite de testes) em
`apps/api/test/store-legacy-catalog-config.e2e-spec.ts`.

~~**Sem sincronizacao com o GameServer**: `driftStatus`/
`effectiveStateSnapshot` existem no schema mas nenhum codigo os usa
ainda~~ -- **Atualizado na Fase T (2026-09-02, ver 11f abaixo)**:
`driftStatus` e os campos `effective*` agora tem codigo real por tras
(leitura de snapshot local, deteccao de drift) -- mas continua verdade
que `apps/api` nunca teve credencial RemoteOps/SSH como dependencia de
runtime (essa credencial vive so na maquina do operador,
`D:\MU\Tools\RemoteOps`), e dar essa credencial ao backend implantado e
uma decisao de arquitetura maior que nenhuma fase tomou sozinha. Ver
ADR-0023, secoes E/F, para o desenho conceitual dos comandos GameBridge
futuros (`SET_XSHOP_ITEM_ENABLED` etc.) -- classificados
`NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE`, nao construidos.

### Mecanismo real de habilitar/desabilitar no X-Shop/CashShop

Nenhum dos dois arquivos de config (`CustomXShop.txt`/
`CashShopProduct.txt`) tem uma coluna booleana "Enabled". O unico
mecanismo observado neste projeto (`CustomBuyVipAndCoin.txt`) e
comentar a linha com `//` -- ou seja, presenca/ausencia da linha, nao um
campo. `CustomXShop.txt` carrega um valor solto (`0`) entre o comentario
de titulo e o cabecalho de colunas, sem explicacao confirmada
(`UNKNOWN_LIKELY_GLOBAL_TOGGLE_OR_RESERVED`).

## 11f. Estado efetivo, drift e sync guard (Fase T, 2026-09-02)

Ver ADR-0024 para o design completo; resumo tecnico aqui.

**`LegacyCatalogEffectiveStateService#refresh`** le
`docs/economy/legacy-catalog-effective-state-snapshot.json` (mesmo
padrao multi-caminho de `StoreAdminService#readCatalog()`) -- nunca uma
conexao ao vivo. O snapshot e gerado pelo operador reexecutando o mesmo
download RemoteOps read-only ja usado nas Fases R/S, com hash SHA256
re-verificado contra o GameServer real no momento da geracao. `refresh()`
atualiza APENAS `effectiveEnabled`/`effectivePrice`/`effectiveCurrency`/
`effectiveDurationSeconds`/`effectiveOptions`/`driftStatus`/
`sourceLastReadAt`/`sourceFingerprint` -- nunca toca em nenhum campo de
estado desejado (`desiredEnabled`, `commercialStatus`, etc.), provado por
teste (`EFFECTIVE_REFRESH_PRESERVES_DESIRED_STATE`).

**`computeDrift()`** so marca `DRIFT_DETECTED` quando o Portal tem uma
opiniao real e desejada que conflita com o efetivo (`desiredEnabled !==
effective.enabled`, ou `priceDesired` definido e diferente do
`effectivePrice`) -- uma linha cujo estado desejado ainda esta no
default nunca vira falso-positivo de drift, so `IN_SYNC`/`NOT_CHECKED`.

**`LegacyCatalogConfigService#sync(channel, user)`** -- guardado por tres
razoes independentes, nenhuma delas ainda superavel: (1) exige a
permissao `.sync` especificamente, nao `.edit`; (2) verifica
`XSHOP_RUNTIME_SYNC_ENABLED`/`CASHSHOP_RUNTIME_SYNC_ENABLED` (variavel de
ambiente, mesmo padrao ja usado por `MERCADO_PAGO_REFUND_ENABLED` --
nenhum framework novo de feature flag foi criado), ambas ausentes/false
em todo ambiente que este projeto publica; (3) mesmo se as duas
passassem, o corpo do metodo ainda lanca
`NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE` -- nao existe despacho de
comando real por tras do guard. ~~As duas outras flags que a Fase T
nomeou (`XSHOP_PORTAL_MANAGEMENT_ENABLED`/`CASHSHOP_PORTAL_MANAGEMENT_ENABLED`)
NAO foram construidas -- gap aberto, ver OQ-032.~~ **OQ-032 fechada na
Fase U (2026-09-03)**: decisao definitiva de Bryan -- NAO construir
essas flags, elas duplicariam RBAC sem necessidade. Politica final:
acesso ao Control Plane = RBAC; mutacao real no GameServer = permissao
`.sync` dedicada + kill switch de runtime. Ver 11g abaixo para a
aplicacao dessa politica no dominio de Progressao.

**Operacoes em lote** (`bulkUpdate`) usam um enum fechado de sete acoes
(nunca preco/moeda/opcoes) e gravam um registro de auditoria POR LINHA
afetada (nao um unico registro por lote) -- um bug real foi encontrado e
corrigido nesta fase: a versao original gravava um unico registro sem
`targetId`, invisivel para `history(id)` de qualquer linha individual.

## 11g. Progressao -- XP, Drop, Reset, Master Reset (Fase U, 2026-09-03)

Ver ADR-0025 para o design completo; resumo tecnico aqui.

### Fontes reais, hash-verificadas

`GameServerInfo - Command.dat`/`- Custom.dat`: hash identico ao
cache da Fase 11 (`9D971E9F...`/`BA8A8C07...`), reutilizados sem novo
download. `GameServerInfo - Common.dat`: hash divergiu do snapshot
local de 2026-08-17 (`A7030F2D...` vs `F354CAA9...`) -- baixado de
novo e diffado. Nenhum campo de progressao mudou; os 12 campos que
mudaram (CashShopSwitch, drop de PK, durabilidade, etc.) sao
detalhados em `docs/progression/progression-config-field-matrix.md`.
Reaproveita tambem um mapa semantico pre-existente, exaustivo, campo-a-
campo de `Common.dat` (369 ocorrencias de chave, `D:\MU\docs\common-dat-
semantic-map.md`, referencia de operador, nao versionada no repo) --
citado como fonte, nao re-derivado do zero.

### `ProgressionConfigItem` -- mesmo formato do LegacyCatalogItem, campos `Json`

Novo modelo Prisma (migracao
`20260903120000_phase_u_progression_config_item`). 25 linhas
(EXPERIENCE:8, DROP:4, RESET:6, MASTER_RESET:7) -- nao uma linha por
chave crua (~370 chaves reais existem em Common.dat/Command.dat
juntos). `desiredValue`/`effectiveValue` sao `Json`, nao escalar,
porque a maioria dos campos e por tier de conta (`{AL0,AL1,AL2,AL3}`).
`computeDrift` (em `progression-config.service.ts`) compara um alvo
plano contra um valor por tier (ex.: `reset.cap` desejado=20 contra
efetivo `{AL0:20,AL1:20,AL2:20,AL3:50}` -> drift, por causa do AL3).

### Meta de reset persistida como fato real, nao hipotetico

`reset.cap` semeia com `desiredValue=20` (a meta de politica de Bryan,
Parte 17) -- e o valor efetivo real hoje E `{20,20,20,50}`, confirmado
por leitura hash-verificada, nao um exemplo ilustrativo do enunciado da
fase. Nenhuma sincronizacao foi feita -- o AL3 real continua 50.

### Seguranca de unidade -- estrutural, nao so na tela

`unit` e uma coluna de texto livre; toda linha de taxa de XP grava
literalmente `"unidade/formula nao confirmada"` em vez de `"x"`/`"%"`,
porque `docs/progression/xp-stacking-investigation.md` genuinamente
nao conseguiu confirmar qual e verdade. Isso e gravado no dado, nao
deixado para o frontend lembrar -- provado por teste real
(`XP_50_NOT_LABELED_50X_WITHOUT_PROOF`).

### `sync()` -- DESIGN_ONLY, mesmo shape do catalogo legado

Guardado por tres razoes independentes: permissao `.sync` dedicada;
flag `PROGRESSION_RUNTIME_SYNC_ENABLED` (ausente em todo ambiente);
corpo do metodo lanca `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE` mesmo
se as duas primeiras passassem -- ~~`RUNTIME_MUTABLE`/`RELOAD_REQUIRED`/
`RESTART_REQUIRED` permanecem `UNKNOWN` para todo campo~~ **atualizado
na Fase V, ver 11h abaixo: `RESTART_REQUIRED=NAO` agora tem evidencia
real de fornecedor para os dominios EXPERIENCE/DROP/RESET/MASTER_RESET**
-- o gatilho de reload remoto continua `UNKNOWN` (mesmo padrao da
OQ-031 do catalogo legado, tambem parcialmente resolvido na Fase V).

### Changeset/preview/historico nomeado -- desenhado, nao construido

Partes 26-28 da Fase U pediram um fluxo de changeset multi-configuracao
(rascunho -> revisao -> aprovacao -> aplicacao -> rollback) com preview
e snapshots historicos nomeados ("Semana 1 do Open Beta"). Essa fase
NAO construiu isso -- e um escopo maior que a fundacao de descoberta +
estado desejado/efetivo/drift/auditoria. O que existe: historico por
configuracao individual via `AuditEvent` (mesmo padrao do `history()`
do catalogo legado) -- real, funcional, mas nao o sistema de snapshot
nomeado que a Parte 28 descreve. **Fase V (2026-09-04) reafirmou essa
mesma decisao de escopo** -- ver 11h abaixo, ADR-0026 Decisao 6.

## 11h. Progressao -- evidencia + prontidao para balanceamento (Fase V, 2026-09-04)

Ver ADR-0026 para o design completo; resumo tecnico aqui.

### `policyStatus` -- novo eixo real, campo Prisma novo

`ProgressionConfigItem` ganhou `policyStatus`
(`ProgressionPolicyStatus`: `NOT_EVALUATED`/`APPROVED`/
`EFFECTIVE_BUT_UNAPPROVED`/`POLICY_DRIFT`/`DISABLED`/`UNKNOWN`),
migracao `20260904090000_phase_v_progression_policy_status`.
Reconciliado a cada reseed (como `riskLevel`) -- diferente de
`desiredValue`, que nunca e sobrescrito num reseed. Nenhuma linha
semeia como `APPROVED` por definicao -- so uma decisao real e datada
de Bryan move uma linha para la (so `reset.cap` chegou nesse estado
esta fase, via `POLICY_DRIFT`, nao `APPROVED` -- o valor aprovado e o
valor efetivo real ainda divergem).

### Mecanismo de reload -- evidencia real de fornecedor, nao mais UNKNOWN

Tutorial real do fornecedor (`Recarregando arquivos e configuracoes.htm`,
`CONFIRMED_VENDOR_DOC`) documenta um menu "Reload" real dentro do
console interativo do `GameServer.exe`, 18 categorias
(`Lista de Comandos Reload.txt`). "Reload Common" relê `Common.dat` +
12 arquivos irmaos (`ExperienceTable.txt`, `ResetTable.txt`,
`MapManager.txt`, etc.); "Reload Command" relê `Command.dat` inteiro --
ambos **explicitamente sem necessidade de reiniciar o servidor**. Isso
tambem resolve `RESTART_REQUIRED=NAO` para `CustomXShop.txt` (via
"Reload Custom") e `CashShopProduct.txt`/`CashShopPackage.txt` (via
"Reload CashShop") -- ver OQ-031, atualizada. O gatilho em si exige a
janela interativa do console do GameServer -- nao confirmado como
programavel via RemoteOps/SSH. `PROGRESSION_RUNTIME_SYNC` continua
`BLOCKED_BY_RUNTIME_EVIDENCE`.

### Drift real de producao encontrado ao fechar a lacuna de mapa/monstro da Fase U

`MapManager.txt`/`Monster.txt`/`MonsterSetBase.txt` foram relidos (a
lacuna que a Fase U deliberadamente deixou aberta). Achado real, nao
causado por esta sessao: `ItemDropRate` por mapa foi zerado nos 67
mapas, `ExcItemDropRate` cortado 10x, e 10 chefes tiveram seu
`ItemRate` proprio cortado de um valor-sentinela para um valor normal
-- tudo desde 17/08. Ver OR-023 e
`docs/progression/level-curve-monster-map-dataset.md`.

### `progression-simulator.ts` -- STRUCTURAL_SIMULATOR apenas

Aritmetica real sobre numeros conhecidos (cadencia de reset via
`cadenceFromResetsPerWeek`, pontos de reset via
`totalResetStatPoints`), mais uma projecao que exige que quem chama ja
tenha uma taxa de XP empirica conhecida (`estimateHoursFromKnownXpRate`)
-- nunca deriva XP do zero. `estimateXpFromFormula()` lanca sempre
`XpFormulaUnknownError` -- nenhum modo `FORMULA_VALIDATED` existe.

## 12. Procedimentos "Como fazer..."

### Como verificar a saúde do GameBridge
Consulte o heartbeat¹⁰ do Agent (endpoint interno do Worker) e o status
retornado por `GET /admin/game-data/status` na API — reporta
`bridgeStatus`/`lastHeartbeatAt`, nunca detalhes sensíveis (URL do
Worker, segredos, detalhes de SQL).

### Como validar o processamento da fila
Rode os testes do Worker (`npm test` em `apps/game-data-worker`) — cobrem
o ciclo completo `CREATED → QUEUED → AVAILABLE → CLAIMED → SUCCEEDED/FAILED`
contra um D1 local real.

### Como testar a reconciliação de VIP
```bash
cd apps/api
npx jest --config ./test/jest-e2e.json --runInBand vip-sync.e2e-spec.ts
```
Cobre detecção de divergência (nunca sincronizado, já sincronizado,
expiração), e o comportamento honesto quando o transporte não está
configurado (nunca reporta sucesso falso).

### Como fazer um dry-run de `PRE_BETA_PURGE`
```
GET /admin/accounts/deletion/pre-beta-purge/dry-run?betaCycleId=<id>
```
(exige a permissão `admin.accounts.purge.manage`, Super ADM). Retorna,
para cada conta da fase `PRE_BETA`, o veredito (`WOULD_DELETE`/`BLOCKED`/
`UNKNOWN_DEPENDENCY`) e os motivos, sem executar nenhuma exclusão.

### Como diagnosticar um comando `FAILED`
1. Consulte o status do comando via `GET /internal/game-commands/:id`
   (Worker) — mostra `resultCode`, `attemptCount`, `completedAt`.
2. `FAILED_RETRYABLE` significa uma falha transitória (ex.: SQL
   indisponível) — o comando já está sendo tentado novamente
   automaticamente com backoff.
3. `FAILED_FINAL` significa uma falha permanente (entrada inválida,
   conta não encontrada, tipo de comando desabilitado por kill switch) —
   não vai ser retentado automaticamente; exige investigação manual do
   `resultCode` específico.

### Como diagnosticar uma recarga presa (PAID sem crédito, ou não-final por muito tempo)
1. `GET /admin/finance/reconciliation` (`admin.finance.reports.view`) —
   roda as duas checagens locais em tempo real (não usa o resultado da
   última execução agendada) e retorna cada anomalia com o
   `rechargeIntentId`, motivo, e status atual.
2. Para `PAID_WITHOUT_LEDGER_CREDIT`: **não deveria acontecer** sob o
   código atual (o crédito é atômico com a mudança de status) — se
   aparecer, é uma regressão real, não um caso esperado; investigue a
   transação (`transitionRechargeStatus`) antes de qualquer correção
   manual no banco.
3. Para `STUCK_NON_TERMINAL`: use "Ressincronizar com Mercado Pago"
   (`admin.orders.operate`) na própria tela de detalhes da recarga, ou
   `POST /admin/finance/reconciliation/provider-poll` para rodar o lote
   de reconciliação com o provedor real (se `MERCADO_PAGO_PROVIDER_POLL_ENABLED`
   estiver ligado no ambiente).

### Como investigar um chargeback
1. `GET /admin/finance/recharges/:id/chargeback-trace` (`admin.chargeback.view`)
   — o rastreamento de dispersão bruto (útil mesmo antes de um caso
   formal existir, se o `RechargeIntent` já tiver o crédito original).
2. Se o Mercado Pago já reportou `charged_back`, um `ChargebackCase` já
   foi aberto automaticamente — `GET /admin/finance/chargeback-cases/:id`
   traz o snapshot completo (saldo da conta na abertura, motivo do
   provedor, rastreamento de dispersão já congelado no momento da
   abertura do caso).
3. **Nunca** aplique uma restrição a uma conta apenas por ela aparecer no
   rastreamento como destinatária de uma transferência — o rastreamento é
   para investigação, a responsabilidade primária é sempre de quem
   originou a compra.

### Como reconstruir o ambiente local de SQL Server do zero

1. Instalar o SQL Server 2022 (Developer Edition, instância padrão
   `MSSQLSERVER`) — **precisa de uma sessão interativa real com
   privilégio de administrador**; um processo de automação não-interativo
   não consegue completar essa instalação, mesmo que a conta já seja
   administradora (o Windows exige uma área de trabalho interativa para o
   prompt de UAC¹¹ aparecer).
2. Confirmar o modo misto de autenticação está ativo
   (`SERVERPROPERTY('IsIntegratedSecurityOnly') = 0`) — se não estiver,
   habilitar via:
   ```sql
   EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2;
   ```
   seguido de um reinício do serviço `MSSQLSERVER` (também exige sessão
   interativa/elevada).
3. Rodar o schema de teste:
   ```powershell
   sqlcmd -S localhost -E -i "references/game-data/sql-discovery/gamebridge-extension-20260830/derived/local-test-schema.sql"
   ```
4. Instalar as quatro procedures novas (uma por arquivo, na mesma pasta
   `derived/`).
5. Criar o login `bloodmoon_writer_local` com uma senha nova e aleatória
   (nunca reaproveitar uma senha antiga, nunca escrever a senha real em
   um arquivo versionado) e aplicar os grants¹² de
   `local-writer-login.sql`.
6. (Opcional) Rodar os scripts de smoke test¹³ da mesma pasta para
   reconfirmar tudo.

Ver `docs/environment/sql-server-test-environment.md` para o registro
completo desta reconstrução, incluindo os bloqueios reais encontrados e
como foram resolvidos.

### Como validar as quatro stored procedures do GameBridge contra um SQL
Server real (sem tocar produção)
```bash
cd apps/game-bridge-agent/BloodMoon.GameBridgeAgent.Tests
$env:GAMEBRIDGE_LOCAL_SQL_TEST_CONNECTION = "<connection string do bloodmoon_writer_local>"
$env:GAMEBRIDGE_LOCAL_SQL_ADMIN_CONNECTION = "<connection string admin, Trusted_Connection>"
dotnet test --filter "FullyQualifiedName~SqlServerLocalIntegrationTests"
```
Sem essas duas variáveis de ambiente definidas, os testes desse arquivo
são pulados silenciosamente (não falham, não bloqueiam o restante da
suíte) — é o padrão esperado em qualquer ambiente sem SQL Server local.

### Como verificar o modelo de privilégio mínimo do login de escrita
Conecte como o login restrito (`bloodmoon_writer`/`bloodmoon_writer_local`,
nunca como administrador) e rode:
```sql
SELECT HAS_PERMS_BY_NAME('dbo.<procedure>', 'OBJECT', 'EXECUTE')  -- deve ser 1 para cada procedure permitida
-- e, para toda tabela tocada pelas procedures:
SELECT HAS_PERMS_BY_NAME('dbo.<tabela>', 'OBJECT', 'SELECT')  -- deve ser 0
```
Ver `local-writer-login.sql`/`proposed-writer-login-grants.sql` para o
bloco de verificação completo e o resultado esperado exato.

### Como reconstruir o laboratório local do banco do GameServer (dados reais pseudonimizados)

Distinto do "ambiente de teste local de SQL Server" acima (que usa um
schema sintético de 25 tabelas) — este é um laboratório com a estrutura
real completa (138 tabelas/86 procedures/2 views/1 trigger), construído
a partir de um backup real de produção já encontrado localmente. Ver
`docs/gameserver/database/lab-environment.md` para o registro completo
desta construção (por que um novo backup de produção não foi necessário,
como o backup existente foi validado, o problema de ownership pós-restore
e sua correção).

1. Localizar o backup validado:
   `D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak`
   (tratar como sensível — nunca commitar, nunca copiar para fora da
   máquina local sem autorização explícita).
2. Restaurar **duas vezes**, cada vez com o portão de segurança
   confirmando `SERVER=localhost`, `DATABASE=<nome esperado>`,
   `ENVIRONMENT=NON_PRODUCTION` antes de qualquer operação destrutiva:
   ```sql
   RESTORE DATABASE bloodmoon_gameserver_raw_analysis
     FROM DISK = 'D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak'
     WITH MOVE 'MuOnline' TO '<caminho local .mdf>',
          MOVE 'MuOnline_log' TO '<caminho local .ldf>',
          RECOVERY, STATS = 10;
   -- repetir para bloodmoon_gameserver_lab
   ```
3. **Corrigir o ownership órfão em ambos os bancos** (passo obrigatório
   conhecido para este arquivo de backup específico, não um workaround
   pontual):
   ```sql
   ALTER AUTHORIZATION ON DATABASE::bloodmoon_gameserver_raw_analysis TO sa;
   ALTER AUTHORIZATION ON DATABASE::bloodmoon_gameserver_lab TO sa;
   ```
4. Rodar o script de sanitização **somente** contra `bloodmoon_gameserver_lab`
   (nunca contra `_raw_analysis`, que deve permanecer intacto como fonte
   read-only para revalidação futura):
   ```powershell
   sqlcmd -S localhost -E -d bloodmoon_gameserver_lab -i "references/game-data/sql-discovery/gameserver-lab-20260830/sanitize-lab.sql"
   ```
   O script tem um portão de segurança próprio (`RAISERROR` se
   `DB_NAME() <> 'bloodmoon_gameserver_lab'`) — falha fechado por design.
5. Instalar as quatro procedures do GameBridge em `bloodmoon_gameserver_lab`
   (mesmos arquivos da seção anterior).
6. Rodar o teste completo contra dados reais pseudonimizados:
   ```powershell
   sqlcmd -S localhost -E -d bloodmoon_gameserver_lab -i "references/game-data/sql-discovery/gameserver-lab-20260830/lab-gamebridge-test.sql"
   ```
   Resultado esperado: 11/11 `PASS`, incluindo os dois casos de bloqueio
   por guild master (um deles composto com vendedor ativo no market).

`bloodmoon_gameserver_lab` é intencionalmente destrutível/reconstruível —
qualquer teste que precise de dados "sujos" ou de cenários de falha pode
alterar esse banco livremente; para recomeçar do zero, basta repetir os
passos 2-6 (a Parte 7 de `lab-environment.md` documenta que a restauração
foi feita exatamente assim, duas vezes, deliberadamente).

## 12b. Fase K — auditoria completa do banco do GameServer (2026-08-30)

Rodada de auditoria total das 138 tabelas reais, 86 procedures nativas, 2
views e o único trigger real — ver `docs/gameserver/database/` (11
documentos). Achados que exigiram correção de código, não só documentação:

1. **`sanitize-lab.sql` deixava identidade real sem pseudonimizar** em 9
   tabelas, incluindo um vazamento real de IPs de admin em
   `DmN_Admin_Logins` (o `INNER JOIN` original nunca casava porque o
   login ali é o literal `'admin'`, não uma conta de jogador). Corrigido;
   laboratório reconstruído do zero e revalidado.
2. **`bm_AnonymizeGameAccount` nunca limpava os campos reais de PII** em
   `MEMB_INFO` (email/IP/endereço/telefone/pergunta de segurança) — só
   resetava `AccountLevel`/senha. Corrigido.
3. **`bm_AnonymizeGameAccount`/`bm_PurgeGameAccount` não cobriam ~20
   tabelas reais** de progressão/customização por personagem e
   armazenamento por conta, descobertas cruzando os dependency reais das
   procedures nativas `WZ_RenameCharacter`/`WZ_DeleteCharacter`. Corrigido
   — inclui um bug real de retenção (`ExtWarehouse` é uma tabela separada
   real, não só a coluna de mesmo nome em `AccountCharacter`).
4. **`RankingKingGuild` era referenciada incorretamente** (coluna
   `Name` de 8 caracteres, chave de GUILDA, comparada contra nome de
   PERSONAGEM) — removida das duas procedures, com comentário explicando
   o motivo.

Todas as correções foram reinstaladas e revalidadas: 123/123 testes do
Agent, 11/11 testes reais do `lab-gamebridge-test.sql` contra dados reais
pseudonimizados. Ver `docs/gameserver/database/account-data-map.md` para
a matriz de dependência completa e
`docs/gamebridge/gamebridge-second-review-package.md` para o pacote de
revisão independente (checksums, checklist formal).

## 12c. Fase K — novos modelos Prisma (fundações, sem UI)

`Survey`/`SurveyQuestion`/`SurveyOption`/`SurveyCampaign`/`SurveyAudience`/
`SurveyResponse`/`SurveyAnswer` (`docs/product/survey-foundation.md`) e
`PlayerPreferenceDefinition`/`PlayerPreference`
(`docs/privacy/privacy-center-overview.md`) — schema e migrations reais,
sem endpoint ou tela construídos ainda. As migrations
(`20260830190000_survey_foundation`,
`20260830191000_player_preferences_foundation`) foram escritas à mão
(nenhum MySQL local estava configurado nesta sessão/worktree para rodar
`prisma migrate dev`) — `npx prisma generate` e `npx tsc --noEmit`
passaram limpos, mas a aplicação real contra um banco local **não foi
verificada nesta rodada**.

## 13. Solução de problemas (troubleshooting)

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `dotnet` não é reconhecido | PATH não inclui o SDK instalado por usuário nesta sessão de terminal | `$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;" + $env:PATH` |
| `prisma migrate dev` falha pedindo permissão de criar banco | Usuário MySQL local não tem privilégio de criar banco shadow | Escrever a migração manualmente e aplicar com `prisma migrate deploy` (não precisa de shadow) |
| Instalador do SQL Server falha com "requer elevação" | Sessão não-interativa, sem uma área de trabalho para o UAC aparecer | Precisa ser feito por uma pessoa, interativamente, na máquina real |
| Teste que parece travar por vários minutos no PowerShell | Combinação de `--json --outputFile` com `2>$null` sob execução em segundo plano às vezes falha ao liberar o output de forma confiável | Rode com `--forceExit` e leia o arquivo de output diretamente depois que o processo terminar, em vez de tentar capturar via pipe |
| `SqlServerLocalIntegrationTests` reporta "0 falhas, 0 aprovados" | Variáveis de ambiente de conexão não definidas | Esperado — esses testes são pulados silenciosamente sem uma conexão real configurada, não é um erro |
| `WITH EXECUTE AS OWNER` falha com "a entidade de segurança 'dbo' não existe" após restaurar `MuOnline_COPY_ONLY.bak` | Ownership órfão pós-restore entre instâncias diferentes de SQL Server (bug real, documentado em `docs/gameserver/database/lab-environment.md` Parte 7) | `ALTER AUTHORIZATION ON DATABASE::<banco> TO sa;` — passo obrigatório para este arquivo de backup específico |

## Glossário deste manual

1. **SQL Server**: ver `docs/glossary.md`.
2. **Nitro**: o motor de servidor usado internamente pelo Nuxt para gerar
   o build de produção.
3. **DPAPI — Data Protection API**: um mecanismo do Windows para
   criptografar dados (como senhas) de forma vinculada ao usuário/máquina
   atual, sem precisar gerenciar uma chave de criptografia separada.
4. **Banco shadow (shadow database)**: um banco temporário que o Prisma
   usa internamente para calcular a diferença entre o schema atual e o
   novo, ao gerar uma migração automaticamente.
5. **Privilégio mínimo (least privilege)**: ver `docs/glossary.md`.
6. **Foreign key (FK)**: ver `docs/glossary.md`.
7. **Polling**: a prática de perguntar repetidamente, em intervalos, se
   há algo novo para processar — em vez de esperar passivamente por uma
   notificação.
8. **HMAC — Hash-based Message Authentication Code**: uma assinatura
   criptográfica que prova que uma mensagem não foi alterada e veio de
   quem diz ter enviado, usando uma chave secreta compartilhada.
9. **D1**: ver `docs/glossary.md`.
10. **Heartbeat (batimento)**: um sinal periódico enviado por um processo
    para provar que ainda está ativo e funcionando.
11. **UAC — User Account Control**: ver `docs/glossary.md`.
12. **Grant**: uma permissão concedida explicitamente a um usuário/login
    de banco de dados (ex.: `GRANT EXECUTE ON procedimento TO login`).
13. **Smoke test (teste de fumaça)**: um teste rápido e superficial que
    verifica se o básico funciona antes de investir em testes mais
    profundos — o nome vem da ideia de "ligar o equipamento e ver se sai
    fumaça".
