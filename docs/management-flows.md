# Fluxos do painel de gerenciamento

Este documento registra o que ja foi implementado no painel Blood Moon e como revisar os fluxos depois. Autenticacao, CMS administrativo, Wiki, contas administrativas, personagens, loja, recargas, financeiro e marketplace ja possuem integracao inicial com API e PostgreSQL. O fallback local fica restrito a ferramentas de desenvolvimento ainda nao migradas, como a pagina de sistema local e parte da biblioteca de referencias offline.

## Organizacao atual

- `apps/web`: site Nuxt, painel, telas publicas e prototipos locais.
- `apps/api`: base planejada do backend NestJS, contratos dos modulos e schema inicial do Prisma.
- `packages/shared`: tipos e constantes compartilhadas entre frontend e backend.
- `references`: referencias brutas, imagens e dados coletados.
- `docs`: documentacao operacional e tecnica.
- `scripts`: scripts auxiliares de coleta/organizacao.

## Acesso de teste

- Usuario administrativo: `admin`
- Senha administrativa: `admin`
- Personal ID administrativo: `admin`
- Usuario player: `player`
- Senha player: `player`
- Personal ID player: `player`

Ao tentar acessar uma rota de painel sem login, o site redireciona para `/login` e volta para a pagina original depois da autenticacao.

## Arquivos principais

- `apps/web/data/security.ts`: permissoes, perfis e regras de acesso.
- `apps/web/composables/useAuth.ts`: login, sessao, expiracao, bloqueio por tentativas e auditoria.
- `apps/web/middleware/auth.global.ts`: protecao das rotas `/painel` e `/painel/admin`.
- `apps/web/data/management.ts`: dados antigos de desenvolvimento mantidos para ferramentas locais que ainda nao foram removidas.
- `apps/web/composables/useManagement.ts`: fallback local restrito a manutencao/exportacao local e fluxos dev ainda nao migrados.
- `apps/web/composables/useCommerceApi.ts`: produtos, pacotes de recarga, intencoes de compra/recarga e financeiro via API.
- `apps/web/components/ManagementShell.vue`: layout e menu lateral do painel.
- `apps/web/pages/painel/admin/auditoria.vue`: registros de auditoria.
- `apps/web/pages/painel/admin/contas.vue`: gerenciamento administrativo de contas.
- `apps/web/pages/painel/admin/financeiro.vue`: aprovacao/cancelamento de compras e recargas.
- `apps/web/pages/painel/admin/conteudo.vue`: central CMS para noticias, Wiki, itens exclusivos, paginas, banners e midias.
- `apps/web/pages/painel/admin/loja.vue`: CRUD administrativo dos produtos da loja.
- `apps/web/pages/painel/admin/recargas.vue`: CRUD administrativo dos pacotes de recarga.
- `apps/web/pages/painel/admin/sistema.vue`: exportacao, importacao e reset da base local.
- `apps/web/pages/painel/admin/referencias.vue`: biblioteca visual e tecnica de referencias.
- `apps/web/pages/painel/admin/pendencias.vue`: lista de implementacoes e pendencias.
- `apps/web/pages/painel/personagens.vue`: gerenciamento de personagens da conta.
- `apps/web/pages/painel/conta.vue`: dados da conta, troca de senha real com Personal ID e historico real de compras/recargas.
- `apps/web/pages/painel/loja.vue`: loja com intencao de compra.
- `apps/web/pages/recarga.vue`: recarga com intencao de pagamento.

## Perfis e permissoes

- `player`: gerencia a propria conta, personagens, loja e recarga.
- `moderator`: reservado para moderacao futura.
- `game-master`: reservado para ferramentas de jogo futuras.
- `admin`: acessa painel administrativo, referencias, auditoria, financeiro e guias futuros.
- `super-admin`: reservado para acesso total.

Permissoes importantes:

- `admin.dashboard.view`: libera painel administrativo.
- `admin.references.manage`: libera referencias dev.
- `admin.audit.view`: libera auditoria.
- `admin.finance.manage`: libera financeiro.
- `admin.shop.manage`: libera gerenciamento administrativo da loja.
- `admin.recharge.manage`: libera gerenciamento administrativo dos pacotes de recarga.
- `admin.system.manage`: libera ferramentas locais de manutencao do sistema.
- `account.manage`: libera conta.
- `characters.manage`: libera personagens.
- `shop.access`: libera loja.
- `recharge.access`: libera recarga.
- `guides.future.view`: permite visualizar guias de personagens de versoes futuras.

## Fluxo de login

1. Usuario entra em `/login`.
2. `loginWithCredentials()` tenta autenticar em `POST /api/auth/login`.
3. Se a API estiver disponivel, o backend valida conta ativa, senha bcrypt e devolve `accessToken`, `refreshToken` e usuario.
4. O frontend salva a sessao em `localStorage` junto com os tokens.
5. Se a API estiver indisponivel, o frontend nao cria sessao local de fallback.
6. Em caso de sucesso:
   - cria sessao em `localStorage`;
   - registra auditoria `auth.login.success`;
   - redireciona para a rota solicitada ou `/`.
7. Em caso de erro:
   - registra auditoria `auth.login.failed`;
   - apos varias tentativas, bloqueia login temporariamente.
8. Se a conta estiver `Bloqueada`, o login e negado e registra `auth.login.blocked`.
9. Se a conta for bloqueada durante uma sessao aberta, a sessao e encerrada ao recarregar/navegar e registra `auth.session.blocked`.
10. Sair da conta registra `auth.logout`.

## Fluxo de cadastro

Rota: `/registrar`

1. Usuario preenche nome, usuario, senha, Personal ID, e-mail, referencia opcional, captcha visual e termos.
2. O frontend valida campos obrigatorios, senha repetida, e-mail repetido, captcha local e aceite dos termos.
3. Em caso valido, envia para `POST /api/auth/register`.
4. O backend valida usuario, e-mail, senha e campos obrigatorios.
5. Usuario e e-mail duplicados retornam `409`.
6. Senha e Personal ID sao gravados com bcrypt.
7. A conta nasce como `PLAYER` e `ACTIVE`.
8. Moedas iniciais: `WCOIN`, `GOBLIN_POINT` e `HUNT_POINT` com saldo `0`.
9. Auditoria registra `auth.account.registered`.

Validacao do login:

- Teste de runtime criou uma conta temporaria, fez login com ela, validou duplicidade `409`, conferiu hashes e moedas iniciais, depois removeu a conta e auditoria de teste.

Validacao backend atual:

- Sem token em `/api/admin/content/summary`: `401`.
- Token `admin/admin`: acessa e retorna resumo do CMS.
- Token `player/player`: bloqueado com `403`.

## Fluxo de contas

Rota: `/painel/admin/contas`

1. Admin autenticado visualiza contas reais em `GET /api/admin/accounts`.
2. Pode filtrar por texto, perfil e status.
3. Pode marcar conta como `Ativa`, `Pendente` ou `Bloqueada`.
4. Alteracao chama `PATCH /api/admin/accounts/:id`.
5. O backend valida JWT e role `ADMIN` ou `SUPER_ADMIN`.
6. O backend grava `AuditEvent` com acao `admin.account.updated`.
7. A tela atualiza a linha retornada pela API mantendo o mesmo contrato da listagem.
8. Se a API estiver indisponivel, a tela exibe aviso e nao usa base local como fallback.

Contrato de conta administrativa:

- `role`: `PLAYER`, `MODERATOR`, `GAME_MASTER`, `ADMIN` ou `SUPER_ADMIN`.
- `status`: `ACTIVE`, `PENDING` ou `BLOCKED`.
- `currencies`: objeto com `WCOIN`, `GOBLIN_POINT` e `HUNT_POINT`.
- `personalIdHash` nunca e exposto; a API retorna apenas mascara textual.

Validacao backend atual:

- `GET /api/admin/accounts` com token admin retorna lista paginada.
- `PATCH /api/admin/accounts/:id` altera role/status e retorna moedas no mesmo formato da listagem.
- Teste de runtime criou uma conta temporaria, alterou para `BLOCKED`/`ADMIN`, validou moedas e removeu a conta/ auditoria de teste.

## Fluxo de seguranca da conta

Rota: `/painel/conta`

1. Usuario logado preenche senha atual, Personal ID, nova senha e repeticao.
2. O frontend valida campos obrigatorios e confirma se as novas senhas conferem.
3. Envia para `POST /api/auth/change-password` com Bearer token.
4. O backend valida conta ativa, senha atual por bcrypt e Personal ID por bcrypt.
5. A nova senha e gravada como hash bcrypt.
6. Auditoria server-side registra `auth.password.changed`.
7. Contas demo antigas sem Personal ID recebem Personal ID conhecido no seed de desenvolvimento.

## Fluxo de personagens

Rota: `/painel/personagens`

1. A tela carrega personagens em `GET /api/characters`.
2. Player ve apenas personagens da propria conta.
3. Admin ve todos os personagens.
4. A pagina permite filtrar por nome, classe e status.
4. Acoes atuais:
   - `Detalhes`: chama `POST /api/characters/:id/actions`.
   - `Resetar`: chama `POST /api/characters/:id/actions`.
5. Auditoria server-side:
   - `characters.details.opened`
   - `characters.reset.requested`
6. Se a API estiver indisponivel, a pagina exibe aviso e nao usa base local como fallback.

Validacao atual:

- Admin ve 4 personagens seedados no PostgreSQL.
- Player ve apenas 1 personagem proprio.
- Player tentando acao em personagem de outra conta recebe `404`.

Validacao de seguranca da conta:

- Smoke test criou conta temporaria, alterou senha em `POST /api/auth/change-password`, confirmou que a senha antiga falha e que a nova senha autentica, depois removeu a conta e auditoria temporarias.

## Fluxo de loja

Rota: `/painel/loja`

1. Usuario filtra produtos por texto, categoria e moeda.
2. A tela carrega produtos ativos de `GET /api/shop/products`.
3. Ao clicar em comprar, cria uma intencao em `POST /api/shop/purchases`.
4. A intencao fica em `PurchaseIntent` no PostgreSQL.
5. A compra aparece no historico da conta por `GET /api/account/purchases`.
6. A compra aparece no financeiro administrativo por `GET /api/admin/finance/purchases`.
7. Auditoria server-side registra `shop.purchase.intent`.

Status de compra:

- `Preparada`: usuario clicou em comprar.
- `Concluida`: admin aprovou no financeiro, debitando saldo.
- `Cancelada`: admin cancelou; se ja estava concluida, o saldo volta.

## Fluxo de loja administrativa

Rota: `/painel/admin/loja`

1. Admin visualiza produtos cadastrados em `GET /api/admin/shop/products`.
2. Pode buscar produto por nome, categoria, descricao, moeda ou status.
3. Pode criar novo produto em `POST /api/admin/shop/products`.
4. Pode editar produto existente em `PATCH /api/admin/shop/products/:id`.
5. Pode alternar status entre `Ativo` e `Rascunho`.
6. Pode arquivar produto em `DELETE /api/admin/shop/products/:id`.
7. As alteracoes ficam em `ShopProduct` no PostgreSQL.
8. Auditoria server-side:
   - `admin.shop.product.created`
   - `admin.shop.product.updated`
   - `admin.shop.product.archived`

Observacao: produto em `Rascunho` aparece desabilitado na loja do jogador.

## Fluxo de marketplace entre jogadores

Rotas: `/marketplace`, `/painel/marketplace` e `/painel/admin/marketplace`.

1. Player anuncia um item real do jogo.
2. A API cria `PlayerMarketListing` com status `PENDING_LOCK`.
3. A API cria `GameBridgeJob` com operacao `LOCK_ITEM`.
4. O worker do jogo deve confirmar que o item existe, pertence ao player e foi travado/movido para escrow.
5. Somente depois disso o anuncio passa para `ACTIVE`.
6. Comprador compra um anuncio ativo.
7. A API debita a moeda do comprador e cria `PlayerMarketOrder` com status `DELIVERING`.
8. A API cria `GameBridgeJob` com operacao `TRANSFER_ITEM`.
9. O vendedor so recebe a moeda quando o job de entrega for confirmado e o pedido virar `COMPLETED`.
10. Em falha, o pedido pode virar `FAILED` ou `REFUNDED`, devolvendo saldo ao comprador.

Endpoints criados:

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

Eventos de auditoria:

- `marketplace.listing.created`
- `marketplace.listing.activated`
- `marketplace.listing.cancelled`
- `marketplace.order.created`
- `admin.marketplace.order.status`
- `admin.game-bridge.job.updated`

Observacao importante: o endpoint de ativacao administrativa existe apenas para desenvolvimento enquanto o worker real do jogo nao estiver pronto. Em producao, quem deve ativar o anuncio e o worker apos confirmar o lock real do item.

Telas criadas:

- `/marketplace`: lista anuncios ativos, filtra por busca/moeda e permite comprar item logado.
- `/painel/marketplace`: permite criar anuncio `PENDING_LOCK`, listar anuncios da conta, cancelar anuncio e acompanhar pedidos.
- `/painel/admin/marketplace`: permite visualizar anuncios, ativar anuncio em modo dev, cancelar anuncio e acompanhar jobs `GameBridgeJob`.

Worker preparado:

- `npm --workspace @blood-moon/api run worker:game-bridge`.
- Com `MU_BRIDGE_ENABLED=false`, roda em modo seguro/dry-run.
- Com `MU_BRIDGE_ENABLED=true`, precisa de implementacao real da conexao com banco/servidor MU antes de producao.

## Fluxo de recarga

Rota: `/recarga`

1. A tela carrega pacotes ativos de `GET /api/recharge/packages`.
2. Usuario seleciona moeda.
3. Seleciona pacote.
4. Clica em continuar pagamento.
5. Cria uma intencao em `POST /api/recharge/intents`.
6. A recarga fica em `RechargeIntent` no PostgreSQL.
7. A recarga aparece no historico da conta por `GET /api/account/recharges`.
8. A recarga aparece no financeiro administrativo por `GET /api/admin/finance/recharges`.
9. Auditoria server-side registra `recharge.payment.intent`.

Status de recarga:

- `Preparada`: usuario iniciou a recarga.
- `Paga`: admin aprovou no financeiro, creditando saldo + bonus.
- `Cancelada`: admin cancelou; se ja estava paga, o credito e revertido.

## Fluxo de recargas administrativas

Rota: `/painel/admin/recargas`

1. Admin visualiza pacotes cadastrados em `GET /api/admin/recharge/packages`.
2. Pode filtrar por moeda.
3. Pode criar novo pacote em `POST /api/admin/recharge/packages`.
4. Pode editar pacote existente em `PATCH /api/admin/recharge/packages/:id`.
5. Pode marcar um pacote como popular.
6. Pode desativar pacote em `DELETE /api/admin/recharge/packages/:id`.
7. As alteracoes ficam em `RechargePackage` no PostgreSQL.
8. Auditoria:
   - `admin.recharge.package.created`
   - `admin.recharge.package.updated`

## Fluxo financeiro

Rota: `/painel/admin/financeiro`

1. Admin ve compras e recargas em `GET /api/admin/finance/purchases` e `GET /api/admin/finance/recharges`.
2. Pode filtrar por busca, status e tipo.
3. Em compras:
   - `Concluir`: chama `PATCH /api/admin/finance/purchases/:id/status` e debita moeda da conta se houver saldo.
   - `Cancelar`: cancela a compra e devolve saldo se ja tinha sido concluida.
4. Em recargas:
   - `Aprovar`: chama `PATCH /api/admin/finance/recharges/:id/status` e credita moeda + bonus na conta.
   - `Cancelar`: cancela e reverte credito se ja tinha sido paga.
5. Auditoria server-side:
  - `admin.finance.purchase.status`
  - `admin.finance.recharge.status`

## Fluxo de dashboard administrativo

Rota: `/painel`

1. Admin carrega resumo real em `GET /api/admin/dashboard/summary`.
2. A API agrega contas, personagens reais da conta, compras, recargas, pendencias financeiras e auditoria recente.
3. A rota exige `ADMIN` ou `SUPER_ADMIN`.
4. Se a API estiver indisponivel, a tela exibe estado vazio/indisponivel, sem inventar metricas locais.

Validacao atual:

- Admin recebeu resumo com contas, personagens, compras, recargas e 3 linhas de atividade.
- Player tentando acessar `GET /api/admin/dashboard/summary` recebeu `403`.

## Fluxo de auditoria

Rota: `/painel/admin/auditoria`

1. Admin carrega eventos reais em `GET /api/admin/audit/events`.
2. A rota exige Bearer token e role `ADMIN` ou `SUPER_ADMIN`.
3. A tela permite filtrar por busca e acao.
4. Se a API estiver indisponivel, a tela exibe aviso e nao usa auditoria local como fonte principal.

## Validacao de runtime em 2026-07-02

- `npm run api:check`: OK.
- `npm run web:build`: OK, com aviso persistente de chunks grandes em dados gerados. O chunk SSR principal da Wiki caiu de aproximadamente `1.33 MB` para `106 kB` depois de mover catalogos auxiliares para imports dinamicos.
- Docker/PostgreSQL: container `bloodmoon-postgres` saudavel em `localhost:55432`.
- Smoke test API:
  - `GET /api/shop/products`: 3 produtos ativos visiveis publicamente.
  - `GET /api/admin/shop/products`: 4 produtos para admin, incluindo rascunho.
  - `GET /api/recharge/packages`: 8 pacotes ativos.
  - `POST /api/shop/purchases`: cria `PurchaseIntent`.
  - `POST /api/recharge/intents`: cria `RechargeIntent`.
  - `PATCH /api/admin/finance/recharges/:id/status`: aprova recarga e credita moeda.
  - `GET /api/account/purchases` e `GET /api/account/recharges`: retornam historico da conta logada.
  - Player tentando `GET /api/admin/shop/products`: bloqueado com `403`.
  - Marketplace criou anuncio `PENDING_LOCK`, ativou como admin, criou pedido `DELIVERING`, concluiu pedido, creditou vendedor e removeu dados temporarios.
- Contagem atual no PostgreSQL local:
  - `ShopProduct`: 4.
  - `RechargePackage`: 8.
  - `PurchaseIntent`: 2.
  - `RechargeIntent`: 2.
  - `AuditEvent`: 5.
  - `EquipmentRecord`: 1719.
  - `ReferenceAsset`: 1537.
  - `KnowledgeEntry`: 330.

Pendencias tecnicas visiveis:

- Wiki teve o chunk principal reduzido com imports dinamicos; ainda existem chunks auxiliares grandes dos JSONs de catalogo e a etapa ideal e mover esses dados restantes para API paginada.

## Fluxo de referencias

Rota: `/painel/admin/referencias`

1. Admin escolhe a biblioteca: referencias de desenvolvimento ou gerados/otimizados.
2. Escolhe grupo: personagens, equipamentos, mapas, monstros ou fontes.
3. Seleciona uma categoria antes de renderizar cards.
4. A tela renderiza os cards em lotes para evitar carregar centenas de imagens de uma vez.
5. Pode criar, editar e arquivar referencias no PostgreSQL por `ReferenceAsset`.
6. A tela usa `metadata` do asset para guardar grupo, categoria, biblioteca, status visual, compatibilidade e observacoes.
7. `localStorage` fica apenas como fallback offline durante desenvolvimento local.
8. Auditoria server-side:
   - `admin.content.asset.created`
   - `admin.content.asset.updated`
   - `admin.content.asset.archived`

Validacao atual:

- Smoke test com admin criou, listou, editou e arquivou uma referencia `admin://dev-reference/*`, depois removeu o artefato temporario e auditorias de teste.

## Fluxo CMS administrativo

Rota: `/painel/admin/conteudo`

1. Admin visualiza resumo vindo da API administrativa.
2. A tela mostra totais de entradas, assets, equipamentos e pendencias.
3. A lista de pendencias vem de `GET /api/admin/content/equipment-gaps`.
4. A lista de assets vem de `GET /api/admin/content/assets`.
5. O backend ja possui rotas para criar, editar e arquivar `KnowledgeEntry` e `ReferenceAsset`.
6. O backend ja possui rotas para listar, criar, editar e arquivar `EquipmentRecord`.
7. O painel mostra uma amostra de equipamentos reais do PostgreSQL para orientar o CRUD de itens exclusivos.
8. O upload fisico de arquivo ainda nao esta implementado; o CRUD atual cataloga assets existentes ou caminhos ja persistidos.
9. O editor profundo de equipamento ainda precisa controlar pecas, variantes, opcoes, classes e seasons.
10. Pendencias importantes:
   - remover estados locais residuais quando recuperacao, conta do jogador e upload fisico estiverem 100% via API;
   - trocar fluxos administrativos legados que ainda existirem para endpoints protegidos;
   - criar formularios completos de criacao/edicao;
   - conectar storage de imagens.

Auditoria server-side ja registra:

- `admin.content.entry.created`
- `admin.content.entry.updated`
- `admin.content.entry.archived`
- `admin.content.asset.created`
- `admin.content.asset.updated`
- `admin.content.asset.archived`
- `admin.content.equipment.created`
- `admin.content.equipment.updated`
- `admin.content.equipment.archived`

## Fluxo de auditoria

Rota: `/painel/admin/auditoria`

Eventos registrados ate agora:

- Login com sucesso.
- Login invalido.
- Logout.
- Sessao expirada.
- Criar/editar/excluir referencias.
- Alterar status de conta.
- Consultar detalhes de personagem.
- Solicitar reset.
- Intencao de compra.
- Intencao de recarga.
- Aprovar/cancelar compra.
- Aprovar/cancelar recarga.
- Criar/editar/desativar/excluir produto da loja.
- Criar/editar/excluir pacote de recarga.
- Importar/resetar base local do sistema.

## Persistencia local restante

Chave principal:

- `blood-moon-management-state`

Outras chaves:

- `blood-moon-auth`: sessao atual.
- `blood-moon-login-attempts`: tentativas de login.
- `blood-moon-audit-log`: auditoria.
- `blood-moon-dev-reference-assets`: fallback offline das referencias dev quando a API local nao responde.

Importante: limpar o armazenamento do navegador reseta apenas preferencias/sessao/ferramentas locais. Dados de conta, loja, recarga, financeiro, marketplace e wiki devem vir da API/PostgreSQL.

## Fluxo de sistema

Rota: `/painel/admin/sistema`

1. Admin pode exportar a base local em JSON.
2. Admin pode importar um JSON exportado anteriormente.
3. Admin pode resetar a base local para os dados iniciais.
4. O reset da base local nao apaga sessao nem auditoria.
5. Auditoria:
   - `admin.system.import`
   - `admin.system.reset`

## Pontos que ainda precisam virar backend

- Sessao via cookie seguro/token.
- Pagamento real.
- Worker real para consumir `GameBridgeJob` e aplicar lock/transferencia no banco ou servidor MU.
- Entrega real de item/servico na conta.
- Interface publica e administrativa do marketplace entre jogadores.
- Logs de seguranca por IP/dispositivo.
- Upload real de assets para storage.

## Roteiro rapido de teste

1. Entrar como `admin / admin`.
2. Abrir `/painel/admin/contas`.
3. Marcar uma conta como `Bloqueada`.
4. Recarregar a pagina e confirmar que o status permaneceu.
5. Tentar logar com uma conta bloqueada e confirmar bloqueio.
6. Abrir `/painel/admin/loja`.
7. Criar um produto de teste.
8. Abrir `/painel/loja` e confirmar que o produto aparece.
9. Abrir `/painel/admin/recargas`.
10. Criar um pacote de recarga de teste.
11. Abrir `/recarga`.
12. Preparar uma recarga.
13. Abrir `/painel/admin/financeiro`.
14. Aprovar a recarga.
15. Abrir `/painel/conta` e confirmar o historico.
16. Abrir `/painel/admin/auditoria` e confirmar os eventos.
17. Abrir `/painel/admin/sistema`.
18. Gerar JSON de backup.
19. Resetar base local.
20. Importar o JSON e confirmar que os dados voltaram.

## Decisoes tomadas ate aqui

- Painel administrativo aparece apenas para admin.
- Dropdown de boas-vindas leva player para areas de conta/personagem/loja.
- Moedas levam para recarga.
- Dados locais restantes ficam restritos a `useManagement` enquanto a pagina de sistema local existir.
- Regras de acesso ficam centralizadas em `apps/web/data/security.ts`.
- A auditoria existe desde ja para nao perdermos o rastro dos fluxos enquanto o sistema cresce.
