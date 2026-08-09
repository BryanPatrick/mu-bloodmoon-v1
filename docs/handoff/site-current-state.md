# BloodMoon portal - estado atual do site

Data da auditoria original: 2026-08-08 (Etapa 5, estatica, sem runtime).
Data da revalidacao: 2026-08-08 (Etapa 17, pente-fino pre-beta com codigo
atual + navegador real). Branch auditada: `main`.
Base inicial da auditoria: `a2aaf21` (`feat: apply Blood Moon v1.5 visual identity`).

**Este documento e majoritariamente historico (Etapa 5).** Community foi
completamente revalidada e homologada nas Etapas 6-16 (ver
`community-current-state.md`, status atual `COMMUNITY_BETA_READY`) -- as
observacoes de Community abaixo estao desatualizadas, mantidas so por
registro historico. **O restante do site foi revalidado do zero na Etapa 17
diretamente contra o codigo atual (nao a partir deste documento)** -- ver
"Auditoria site-wide (Etapa 17)" ao final deste arquivo para o estado real
e atual de autenticacao, recuperacao de senha, loja, marketplace/GameBridge,
wiki, rankings, busca, launcher, paginas de erro, SEO e seguranca.

## Escopo e criterio

Este documento descreve o codigo local observado. Ele nao afirma que uma funcao esta
operacional em producao apenas porque compila. Os status significam:

- `READY`: fluxo implementado e coerente no codigo; ainda requer smoke test no ambiente alvo.
- `PARTIAL`: existe implementacao util, mas ha fluxo incompleto, mock, dependencia externa ou validacao pendente.
- `BROKEN`: falha reproduzida por verificacao executada nesta auditoria.
- `PLACEHOLDER`: pagina ou bloco deliberadamente provisoria.
- `NOT_IMPLEMENTED`: rota/recurso esperado sem implementacao.
- `UNKNOWN`: nao foi possivel validar sem banco, credenciais ou ambiente real.

Nenhuma funcionalidade, migration, API, producao ou infraestrutura foi alterada nesta etapa.

## Arquitetura resumida

Monorepo npm workspaces:

```text
apps/
  web/               Nuxt 4 SSR, portal publico, painel player e painel ADM
  api/               NestJS, Prisma, MySQL e regras de negocio
  launcher/          launcher desktop
  launcher-updater/  atualizador do launcher
packages/
  shared/            tipos/constantes compartilhados
docs/                arquitetura, seguranca, fluxos e operacao
deploy/              exemplos e scripts de empacotamento/deploy
scripts/             importacao, catalogos, build, launcher e deploy
references/          referencias e dados de conhecimento
knowledge/           dados preparados para a Wiki
```

Fluxo principal:

```text
Browser -> Nuxt SSR -> NestJS API -> Prisma -> MySQL do portal
                              \-> game-integration/GameBridge -> servidor MU
```

O navegador nao deve acessar banco do portal ou do jogo diretamente. A integracao
sensivel com o MU passa por jobs idempotentes e auditados.

## Stack confirmada

### Frontend

- Nuxt `4.4.8` (build reportou Nitro `2.13.4`, Vite `7.3.5`, Vue `3.5.35`).
- `@nuxt/ui ^4.0.0`.
- Vue `^3.5.13`, Vue Router `^4.4.5`.
- Pinia `^2.2.6`, `@pinia/nuxt ^0.9.0`.
- Lucide Vue/Iconify para icones.
- SSR com preset Nitro `node-server`.

### API

- NestJS `^10`.
- Prisma/Prisma Client `^5`, provider MySQL.
- JWT + Passport, bcryptjs, 2FA via otplib/QR code.
- class-validator/class-transformer.
- Helmet e CORS por lista de origens.
- Sharp para validacao e reprocessamento de imagens.
- ExcelJS para exportacoes.

### Persistencia

- MySQL e migrations Prisma em `apps/api/prisma/migrations`.
- Banco do portal separado conceitualmente do SQL Server do jogo.
- Storage local configuravel para midia Community.

## Inventario de rotas

### Publicas

| Rota | Status | Estado observado |
|---|---|---|
| `/` | PARTIAL | Home visual pronta, busca conteudo/launcher na API; possui fallback editorial e depende de dados reais. |
| `/about` | PARTIAL | Conteudo carregado pela API; depende de publicacao CMS. |
| `/acesso-negado` | READY | Estado de autorizacao negada. |
| `/downloads` | READY | Links externos de launcher/cliente existem; patch e extras permanecem `Em breve`. |
| `/login` | PARTIAL | Login JWT, refresh e 2FA ligados a API; falta smoke/E2E com banco real nesta auditoria. |
| `/registrar` | PARTIAL | Cadastro chama API; falta validar fluxo completo e e-mail real. |
| `/recuperar-conta` | PLACEHOLDER | Apenas valida localmente e exibe mensagem de teste; nao envia recuperacao. |
| `/noticias` | PARTIAL | Lista via Content API; qualidade depende do conteudo publicado. |
| `/rankings` | PARTIAL | UI existe, mas dados dependem do store/sincronizacao do servidor; vazio e tratado. |
| `/guias` | PARTIAL | Indice de guias existe; coexistencia com `/wiki` precisa decisao de produto. |
| `/guias/[category]/[topic]` | PARTIAL | Renderizador amplo, incluindo equipamentos; arquivo grande e combina dados gerados/API. |
| `/wiki` | PARTIAL | Wiki ampla, filtros e catalogos; depende de API/dados e possui bundle/arquivo muito grande. |
| `/loja` | PARTIAL | Catalogo publico conectado a Store API. Compra depende de autenticacao, saldo e entrega. |
| `/loja/[slug]` | PARTIAL | Detalhe/variante/destino implementados; requer teste comercial ponta a ponta. |
| `/marketplace` | PARTIAL | Busca/listagem/compra conectadas a API; escrow/GameBridge requer homologacao real. |
| `/roadmap` | PARTIAL | Listagem/filtros via Roadmap API; depende de itens publicados. |
| `/roadmap/[slug]` | PARTIAL | Detalhe via Roadmap API. |
| `/recarga` | PARTIAL | Intencao de recarga existe; confirmacao de pagamento real nao foi validada. |
| `/comunidade` | PARTIAL | Feed/posts/interacoes reais misturados com rails e perfil mockados. Ver documento dedicado. |
| `/comunidade/[username]` | READY | Etapa 7: dados 100% reais, sem mock/fallback; estados loading/erro/nao-encontrado explicitos. Coberto por E2E (`community-profile.e2e-spec.ts`). Ainda requer QA visual manual em navegador. |
| `/comunidade/perfil/[username]` | READY | Alias que redireciona ao perfil canonico. |

### Painel do jogador

| Rota | Status | Estado observado |
|---|---|---|
| `/painel` | PARTIAL | Dashboard muda por papel; depende das APIs e permissoes. |
| `/painel/conta` | PARTIAL | Perfil, senha, sessoes e 2FA implementados; requer E2E. |
| `/painel/personagens` | PARTIAL | Consulta/gestao conectada a Characters API; dados reais dependem da ponte MU. |
| `/painel/compras` | PARTIAL | Lista compras reais; falha de API vira estado vazio sem diagnostico ao usuario. |
| `/painel/loja` | READY | Redireciona para `/loja`. |
| `/painel/marketplace` | PARTIAL | Criacao e gestao de anuncios/pedidos; depende de escrow/GameBridge. |
| `/painel/notificacoes` | PLACEHOLDER | Agrega NEWS/EVENT globais; nao e notificacao pessoal persistida. |
| `/painel/suporte` | PARTIAL | Criacao/listagem de tickets conectadas a API. |
| `/painel/configuracoes` | PARTIAL | Preferencias visuais/conta; revisar persistencia real. |

### Painel administrativo

Aliases `/admin/community`, `/admin/reports`, `/admin/roadmap`, `/admin/store` e
`/admin/tasks` apenas redirecionam para o painel oficial.

| Rota | Status | Estado observado |
|---|---|---|
| `/painel/admin/contas` | PARTIAL | Consulta, status, papeis/permissoes e sessoes; requer homologacao por papel. |
| `/painel/admin/financeiro` | PARTIAL | Operacao financeira/commerce; valores estrategicos protegidos por permissao. |
| `/painel/admin/conteudo` | PARTIAL | CMS de conteudo, equipamentos, configuracoes e midia. |
| `/painel/admin/loja` | PARTIAL | Manager completo no codigo para produtos, variantes, pedidos, entregas e teste protegido. |
| `/painel/admin/marketplace` | PARTIAL | Manager para anuncios, transacoes, denuncias e configuracoes. |
| `/painel/admin/marketplace/escrow` | PARTIAL | Reusa manager na aba escrow; exige homologacao da ponte do jogo. |
| `/painel/admin/comunidade` | PARTIAL | Moderacao/catalogos/politicas/tarefas/analytics; migrations locais pendentes. |
| `/painel/admin/tarefas` | PARTIAL | Central de tarefas, evidencia, revisao e historico. |
| `/painel/admin/relatorios` | PARTIAL | Relatorios e exportacoes por permissao; validar dados reais. |
| `/painel/admin/roadmap` | PARTIAL | Workflow, revisao, publicacao, atualizacoes e tarefas. |
| `/painel/admin/auditoria` | PARTIAL | Consulta de AuditLog e filtros. |
| `/painel/admin/historico` | PARTIAL | Historico por entidade/ID. |
| `/painel/admin/logs-trabalho` | PARTIAL | Consulta/criacao de AdminWorkLog. |
| `/painel/admin/eventos-operacionais` | PARTIAL | Linha de eventos operacionais compartilhada. |
| `/painel/admin/exportacoes` | PARTIAL | Exportacao administrativa por permissao. |
| `/painel/admin/erros` | PARTIAL | Central de erros, atribuicao, investigacao e resolucao. |
| `/painel/admin/alertas` | PARTIAL | Alertas do sistema. |
| `/painel/admin/retencao` | PARTIAL | Politicas de retencao. |
| `/painel/admin/moderacao` | PARTIAL | Moderacao de contas. |
| `/painel/admin/tickets` | PARTIAL | Fila e resolucao de tickets. |
| `/painel/admin/personagens` | PLACEHOLDER | Apenas encaminha para consulta por conta. |
| `/painel/admin/sistema` | PARTIAL | Configuracoes/importacoes administrativas; valores sensiveis devem ficar no ambiente. |

Nenhuma rota foi classificada `BROKEN` pela compilacao. Isso nao substitui teste com
API e banco em execucao.

## Modulos do portal

| Dominio | Status | Observacoes principais |
|---|---|---|
| Autenticacao | PARTIAL | JWT/refresh, sessoes unicas, 2FA e permissoes existem; token ainda e persistido em localStorage. |
| Cadastro | PARTIAL | Endpoint e tela existem; e-mail/ativacao real precisam validacao. |
| Recuperacao | PLACEHOLDER | Sem envio/consumo de token de recuperacao. |
| Conteudo/noticias | PARTIAL | Content API e CMS existem; ha fallbacks/textos ficticios no frontend. |
| Wiki/equipamentos | PARTIAL | 613 equipamentos e 1.031 variantes passam no verificador; UI e payloads sao grandes. |
| Ranking | PARTIAL | Sem prova de sincronizacao online nesta auditoria. |
| Loja | PARTIAL | Catalogo, workflow, pedidos e entregas existem; pagamento/entrega real pendem de homologacao. |
| Marketplace | PARTIAL | Escrow e jobs existem; e dominio de alto risco sem E2E real comprovado. |
| Roadmap | PARTIAL | Publico/admin/workflow implementados. |
| Suporte | PARTIAL | Tickets player/admin implementados. |
| Launcher/download | PARTIAL | Downloads disponiveis e endpoints launcher existem; atualizacao real nao testada. |
| Comunidade | PARTIAL | Implementacao local extensa e nao commitada. |
| Observabilidade | PARTIAL | AuditLog, trabalho, eventos, erros, alertas, correlacao e retencao existem. |
| Relatorios | PARTIAL | APIs/UI/exportacao existem; consolidacao real nao testada. |
| Game Bridge | PARTIAL | Jobs/worker existem; nao conectar escrita real sem homologacao e rollback. |

## Backend e API

Modulos encontrados em `apps/api/src/modules`:

`accounts`, `admin-audit`, `admin-content`, `admin-dashboard`,
`admin-observability`, `admin-reports`, `admin-tasks`, `audit`, `auth`,
`characters`, `commerce`, `community`, `content`, `game-integration`, `launcher`,
`marketplace`, `media`, `muserver-export`, `observability`, `recharge`,
`references`, `roadmap`, `shop`, `support`, `tickets`, `web-source`, `wiki`.

Protecoes observadas:

- Helmet global e filtro seguro de excecoes.
- CORS restrito por `WEB_PUBLIC_URL(S)` mais origens locais.
- JWT guards, roles e permissoes granulares em rotas administrativas.
- DTOs/contratos validados nos dominios principais.
- Correlation ID, auditoria e erros compartilhados nos fluxos administrativos.
- Midia Community exige JWT, limita 8 MB, detecta formato real, limita dimensoes,
  reprocessa imagem e registra erro operacional.

Riscos/pendencias:

- Nao ha suite E2E cobrindo frontend -> API -> MySQL -> GameBridge.
- O frontend frequentemente converte erro de API em lista vazia, escondendo falhas.
- Rate limiting global nao foi identificado no bootstrap da API.
- Storage de Community e filesystem local; precisa persistencia/backup no ambiente alvo.
- Endpoints novos de Community dependem das tres migrations locais ainda nao commitadas.

## Banco e migrations

Provider atual: MySQL.

Dominios persistidos incluem contas/sessoes/2FA/permissoes/moedas/personagens,
conteudo/wiki/referencias/equipamentos, loja/pedidos/entregas, marketplace/escrow,
roadmap, suporte, auditoria/observabilidade/tarefas e Community.

Migrations versionadas anteriores cobrem baseline MySQL, sessao unica, permissoes,
suporte/moderacao, 2FA, launcher, observabilidade, roadmap, loja, marketplace,
Community inicial, tarefas ADM e limpeza Season 6.

Migrations locais nao commitadas:

- `20260802130000_community_social_profiles`
- `20260802170000_community_posts_stage_three`
- `20260802190000_community_social_interactions`

Elas nao foram aplicadas nesta auditoria. Antes de qualquer deploy: revisar SQL versus
schema, testar em copia do banco, gerar backup e validar rollback.

Nao foi encontrada entidade de notificacao pessoal persistida. Guild ainda e dado
textual no personagem/perfil, nao um dominio social completo.

## UI/UX e responsividade

Sistema visual compartilhado:

- tokens e utilitarios em `apps/web/assets/css/main.css`;
- layout global em `apps/web/layouts/default.vue`;
- header/footer e `ManagementShell` compartilhados;
- Nuxt UI, Lucide, cards, modais e componentes administrativos reutilizaveis;
- breakpoints recorrentes em 767, 899, 1199 px e grids responsivos.

Inconsistencias observadas:

- Community usa dados reais no centro e mocks nas laterais/perfil.
- Algumas telas antigas usam classes de cor branca/translucida que podem conflitar
  com a identidade clara v1.5.
- `/wiki` tem 3.367 linhas e gera chunks de dados grandes; manutencao/performance sao riscos.
- Build alertou chunks acima de 500 kB; ha oportunidade de lazy loading/code splitting.
- varios erros de API viram estado vazio sem explicacao ou retry.
- rotas Community secundarias mostram `CommunityPlaceholderView`.

Revisao de breakpoints foi feita no codigo. Nao houve validacao visual em navegador
desktop/tablet/mobile com API+banco nesta etapa; portanto comportamento runtime e `UNKNOWN`.

## Achados de TODO, mock e placeholder

Alta relevancia:

- ~~`stage-one.mock.ts` e `stage-two.mock.ts` alimentam perfil, anuncios e rails Community.~~ **(Etapa 7: `stage-two.mock.ts` deletado; `stage-one.mock.ts` mantem somente os 4 exports do rail direito de anuncios -- perfil e identidade da home agora sao 100% reais.)**
- `/recuperar-conta` registra apenas solicitacao de teste.
- `/painel/notificacoes` nao e uma caixa pessoal real.
- textos ficticios permanecem em `useLocale.ts`, `data/site.ts` e preview HTML.
- `implementationRoadmap.ts` contem descricao antiga sobre login/cadastro e nao deve
  ser tratado como estado atual sem reconciliacao.
- `docs/community-architecture-audit.md` mistura auditoria antiga com atualizacoes;
  varias lacunas descritas ali ja foram parcialmente implementadas no worktree.

Nao foram encontrados erros de TypeScript/build. Os achados acima sao de produto,
integracao e fidelidade de dados.

## Verificacoes executadas

| Verificacao | Resultado | Observacao |
|---|---|---|
| `npm run api:check` | PASS | Checks estruturais + `tsc --noEmit`. |
| `npm run web:build` | PASS | Build SSR/Nitro concluido; avisos de sourcemap, deprecacao e chunks grandes. |
| `npm run data:check-equipment` | PASS | 613 equipamentos, 1.031 variantes, 132 sets, zero vazamento acima da Season 6. |
| `npm run lint` (Etapa 5) | FAIL (1 erro) | ESLint 10 flat config + eslint-plugin-vue + typescript-eslint, cobrindo apps/web/apps/api/packages/shared. 1075 problemas brutos -> 56 apos configurar 3 falsos-positivos conhecidos (no-undef de auto-import Nuxt, ternario-como-statement, catch vazio intencional). O 1 erro restante e uma atribuicao morta inofensiva em `admin-tasks.service.ts:363` (nao-Community, nao corrigida nesta etapa); 55 warnings sao `unused-vars` pre-existentes (baseline, nao corrigidos em massa). **Escopo Community isolado: 0 erros, 0 warnings** apos correcao trivial de ordem de atributos. Ver docs/handoff/community-current-state.md. |
| `npm run format:check` (Etapa 5) | FAIL (261 arquivos) | Prettier 3 configurado (`.prettierrc.json`/`.prettierignore`); repositorio nunca foi formatado antes desta etapa. Nao formatado em massa por instrucao explicita -- apenas os arquivos novos de cada etapa estao em conformidade. |
| `npm run lint` (Etapa 7) | FAIL (mesmo 1 erro pre-existente) | Sem regressao -- mesmo erro nao-Community ja conhecido (`admin-tasks.service.ts:363`). Arquivos tocados nesta etapa (perfil, backend de perfil, testes E2E) lintam limpos. |
| `npm run web:build` (Etapa 7) | PASS | Rebuild apos remocao dos mocks de perfil e novos arquivos de tipos/mapeamento -- sem erro. |
| `npm run api:test:e2e` (Etapa 7) | PASS (6/6) | Primeiro E2E do repositorio -- Jest + Supertest contra container MariaDB descartavel. Ver "Perfil (Etapa 7)" em docs/handoff/community-current-state.md. |
| testes unitarios | NOT_CONFIGURED | Nao ha script/suite identificada. |
| banco/migrations | NOT_EXECUTED | Proibido aplicar nesta auditoria/etapa -- ver "Migrations pendentes (Etapa 5)"/"Homologacao das migrations (Etapa 6)" em docs/handoff/community-current-state.md. |
| smoke de producao | NOT_EXECUTED | Proibido alterar/testar producao nesta etapa. |

## Producao e deploy documentados

- Nuxt gera servidor Node em `apps/web/.output/server/index.mjs`.
- API inicia em `dist/apps/api/src/main.js`.
- `npm run deploy:cpanel:package` empacota web/API para cPanel.
- Variaveis exigidas estao exemplificadas em `deploy/*.example`; valores reais nao
  pertencem ao Git.
- Documentacao contempla cPanel/LiteSpeed/Node, VPS, proxy, SSL, backups e Game Bridge.
- A documentacao historica tem decisoes antigas conflitantes (PostgreSQL/VPS versus
  MySQL/cPanel). O codigo atual e a fonte: Prisma esta em MySQL e Nuxt usa SSR Node.

## Como rodar localmente sem secrets

1. Instalar Node compativel e executar `npm install`.
2. Criar arquivo de ambiente local a partir dos exemplos, preenchendo apenas com
   credenciais locais fora do Git.
3. Disponibilizar MySQL local e executar o procedimento documentado de setup/import.
4. Rodar `npm run dev:full` para web/API ou, separadamente, `npm run api:dev` e
   `npm run web:dev`.
5. Abrir o portal em `http://localhost:3000`; API padrao em `http://localhost:3333/api`.
6. Antes de qualquer migration, usar banco descartavel/backup.

## Claude Code - Recommended Starting Point

1. Ler primeiro este arquivo, `docs/handoff/community-current-state.md`,
   `docs/handoff/site-beta-checklist.md` e `git status`.
2. Abrir primeiro o modulo Community e preservar o worktree local existente.
3. Continuar pela reconciliacao das tres migrations Community e retirada controlada
   dos mocks do fluxo real, sem apagar a composicao visual antes de haver dados.
4. Dependencias: Nuxt, NestJS, Prisma/MySQL, Auth, MediaService, Observability e permissoes.
5. Executar `npm run api:check`, `npm run web:build` e depois E2E em banco de teste.
6. Nao alterar producao, GameBridge, catalogo Season 6 ou deploy antes da homologacao.
7. Riscos: worktree sujo, migrations nao aplicadas, storage local e erros mascarados
   como listas vazias.
8. Conclusao: Community sem mocks no caminho real, migrations homologadas, fluxos
   autenticados testados e principais blockers do beta fechados.

## Auditoria site-wide (Etapa 17)

Objetivo do brief: pente-fino no portal inteiro antes do beta -- "nao
assumir que build passou significa que funciona". Metodologia: 6 agentes de
auditoria de codigo em paralelo (um por cluster de modulos, cada um lendo o
codigo atual diretamente, nao este documento), mais QA ao vivo em navegador
real (dev server + build de producao) para o que e alcancavel sem
autenticacao, mais quality gate completo. Nenhuma correcao de codigo foi
feita nesta etapa -- e auditoria, com tasks especificas criadas por BLOCKER
em vez de uma refatoracao unica.

### Autenticacao, cadastro, recuperacao de senha, 2FA, perfil

- **Login**: real, JWT+refresh+2FA via `auth.service.ts:34-113`, sem mock.
  Erro generico correto (nao revela se o problema foi usuario ou senha,
  `auth.service.ts:52,58`). **Sem rate limit no backend** -- `/auth/login` e
  `/auth/register` nao usam `ThrottlerGuard` (so o upload de midia da
  Community tem, `media.module.ts:16`, 10/60s). O "bloqueio" de 5
  tentativas existente e **so client-side** via `localStorage`
  (`useAuth.ts:50-53,74-75,272-290`) -- trivialmente contornavel chamando a
  API direto.
- **Cadastro**: validacao real de username/senha/email (`auth.service.ts:148-186`).
  **Sem verificacao de e-mail** -- conta e criada `ACTIVE` imediatamente
  (`auth.service.ts:196`); o enum `AccountStatus.PENDING` existe no schema
  mas nunca e usado em lugar nenhum do codigo (confirmado por grep, zero
  ocorrencias). **CAPTCHA e decorativo**: `registrar.vue:70-71` e um array
  fixo de 4 codigos (`A9K2M`, `BM7Q4`, `N0RIA`, `DL6X8`) validado so no
  browser (`registrar.vue:138-142`) -- o campo **nunca e enviado** ao
  backend (`registrar.vue:146-156`), e `AuthService.register()` nao tem
  nenhum parametro/validacao de captcha. **Isso significa que o CAPTCHA nao
  bloqueia nada automatizado que fale com a API diretamente** -- cadastro
  em massa por bot e credential-stuffing sao possiveis hoje sem nenhuma
  barreira real.
- **Recuperacao de senha (`/recuperar-conta`)**: confirmado 100% stub,
  igual ao que ja era suspeitado, so que sem nenhuma ambiguidade agora. O
  handler inteiro (`recuperar-conta.vue:63-72`) e sincrono, nao faz
  nenhuma chamada de rede, e sempre mostra "Solicitacao registrada para
  teste..." se o campo de e-mail nao estiver vazio -- independente do
  e-mail existir ou nao. Nao ha rota no backend (`auth.controller.ts` nao
  tem `forgot-password`/`reset-password`), nao ha model de token no
  schema, e **nao existe nenhuma infraestrutura de e-mail/SMTP em todo o
  `apps/api`** (grep por `nodemailer|smtp|sendMail` retorna zero).
- **2FA**: real e completo (setup/verify/disable via `two-factor.service.ts`,
  segredo cifrado AES-256-GCM em repouso, aplicado obrigatoriamente no
  login se ativado). Nenhum bypass encontrado.
- **Perfil/conta do jogador** (`painel/conta.vue`): troca de senha, lista/
  revogacao de sessoes e gestao de 2FA sao reais, Prisma-backed, sem mock.
- **Tokens em `localStorage`** (nao cookie httpOnly) -- `useAuth.ts:70,97-101,155-174`.
  Implicacao factual: um XSS em qualquer parte do app exporia ambos os
  tokens (acesso e refresh) sem precisar interceptar rede.
- **Zero teste automatizado** cobre auth/cadastro/recuperacao/2FA/perfil --
  nem E2E, nem unitario (confirmado: `apps/api/src` nao tem nenhum
  `*.spec.ts`, `apps/api/test/` so tem specs de Community).

### Loja e Recarga (commerce)

- **Modulo real e unico**: `apps/api/src/modules/commerce/*`. `shop`/
  `recharge` (contract-only) sao arquivos orfaos, nunca importados --
  ruido, nao uma segunda implementacao.
- **Nenhum gateway de pagamento existe no codigo** -- zero dependencia
  Stripe/PagSeguro/Mercado Pago/etc. em qualquer `package.json`, zero rota
  de webhook. "Compra" = debito direto e imediato de moeda virtual
  (`commerce.service.ts:435-586`, `PurchaseIntent` nasce `status: 'PAID'`
  na hora, linha 547) -- nao existe nem um gateway simulado/stub para
  homologar depois, e preciso construir do zero.
- **Entrega e 100% manual** -- um admin clica "Concluir" no painel
  (`store-admin.service.ts:1107-1166`), o que so muda o status no banco.
  **Nao existe worker/fila automatica** consumindo `StoreDelivery`; o
  proprio painel admin documenta isso (`store-admin.service.ts:1217`:
  "Simulacao nao alterou o servidor de jogo").
- **Recarga** (`recarga.vue`) e ainda mais manual: o texto da propria
  pagina admite (`recarga.vue:9`): *"A integracao real de pagamento entra
  na etapa de backend."* Confirmar pagamento = admin troca um status
  manualmente (`commerce.service.ts:717-765`), sem nenhuma verificacao
  contra uma transacao real.
- **Sem idempotencia no purchase-intent** -- `correlationId` e gerado pelo
  servidor (`commerce.service.ts:495`), nao pelo cliente, entao nao
  deduplica um duplo-clique/duas abas.
- **Ponto positivo real**: debito de saldo/estoque e transacional
  (`Serializable`, `commerce.service.ts:496-564`) -- nao ha corrupcao de
  dados na criacao. O risco esta depois: se uma entrega falha/trava, o
  dinheiro fica debitado sem estorno automatico -- so um admin percebendo
  manualmente resolve.
- **Zero teste automatizado** para compra/saldo/entrega/estorno/recarga.

### Marketplace, Escrow e Game Bridge

- **Confirma e piora o que ja era suspeitado**: o worker
  (`apps/api/scripts/process-game-bridge-jobs.mjs:129-135`) **sempre
  falha por design** -- `throw new Error('MU bridge worker is not
  connected to the game database yet.')`. Modo dry-run e o padrao
  (`MU_BRIDGE_ENABLED=false` no `.env.example`). Nenhuma conexao a
  SQL Server do jogo existe em lugar nenhum de `apps/api` hoje.
  `apps/api/src/modules/game-integration/` so tem um arquivo de tipos --
  nao ha servico real.
- **Nao existe wiring automatico de job concluido -> listagem/pedido
  concluido** -- mesmo se o worker um dia funcionasse de verdade, nada no
  codigo atual conectaria "job completou" a "pedido entregue". Isso e
  feito manualmente por endpoints administrativos.
- **Endpoints administrativos "de desenvolvimento" continuam vivos em
  producao**: `activateListing`, `updateListingStatus`,
  `updateOrderStatus`, `updateBridgeJob` (`marketplace.controller.ts:79-117`)
  pulam a maquina de estados/motivo obrigatorio que o resto do painel usa
  -- exatamente o que `docs/marketplace-game-bridge.md:101-103` e
  `docs/payment-and-escrow-flow.md:49-56` ja dizem que **precisa ser
  removido antes de producao**, mas ainda nao foi.
  `docs/game-vps-sqlserver-transition.md:94-100` reforca: "Nao ativar
  marketplace com transferencia real de item antes de validar o formato
  do inventario/warehouse."
- **Escrow e um ledger real com transacoes DB** (`$transaction` em toda
  mudanca de estado que toca dinheiro/custodia), reserva de listagem via
  `updateMany` condicional (protecao real contra venda dupla,
  `marketplace.service.ts:398-404`). Sem deteccao automatica de transacao
  presa -- so o worker de expiracao de listagens existe
  (`process-marketplace-expirations.mjs`), nada equivalente para pedidos
  travados em `DELIVERING`.
- **`site-beta-checklist.md`** ja tinha os 3 itens de homologacao de
  loja/marketplace/GameBridge como BLOCKER nao marcados -- confirmado que
  continuam corretos e, pela auditoria de codigo, ainda mais distantes do
  que "pendente de homologacao" sugeria: nao ha nem infraestrutura real
  para homologar contra.
- **Zero teste automatizado** para marketplace/escrow/GameBridge.

### Home, noticias, eventos, roadmap, suporte

- **Home** (`index.vue`): maioria real (config do servidor via
  `SiteSetting`), mas `Season 6` esta hardcoded (`index.vue:22,160`), e
  **duas noticias falsas fixas** (`index.vue:132-135`, "Notas de patch
  0.5", "Previa do evento de lancamento", datadas de `2026-05-18`) sao
  misturadas **sem nenhuma distincao visual** com noticias reais sempre
  que a API retorna menos de 2 itens reais -- um usuario nao tem como
  saber que esta vendo conteudo inventado.
- **Noticias** (`/noticias`): lista real, sem mock, mas **nao existe
  pagina de detalhe/artigo completo** (`noticias/[slug].vue` nao existe)
  -- o campo "Conteudo" que o CMS admin captura nunca chega ao publico.
- **Eventos**: nao e um dominio proprio -- e so mais um `kind` (`EVENT`)
  dentro do mesmo CMS unificado de conteudo, consumido pela Wiki (eventos
  de jogo) e pela pagina de notificacoes, sem pagina/calendario publico
  dedicado.
- **Roadmap**: o modulo mais maduro encontrado em toda a auditoria --
  workflow real DRAFT->APROVADO->PUBLICADO->ARQUIVADO com permissao por
  transicao, auto-publish agendado, auditoria completa, SEO por item real
  (`[slug].vue:35`). Nenhum problema relevante encontrado.
- **Suporte**: o modulo real chama-se `support` (nao `tickets`) --
  `apps/api/src/modules/tickets/` e **codigo morto orfao**, nunca
  registrado em `app.module.ts`, com um contrato de tipos incompativel com
  o schema real (deveria ser removido para evitar confusao futura). Fila
  de tickets do admin funciona mas e "fina": sem filtro de status na UI,
  atribuicao so implicita (quem responde vira o assignee).
- **404/erro**: **BLOCKER confirmado ao vivo em navegador**, ver secao
  dedicada abaixo.
- **500**: tratamento do backend e solido e seguro por padrao -- nenhuma
  stack trace ou mensagem interna vaza ao browser em nenhum ambiente
  (`safe-exception.filter.ts:46-81`, sempre ativo, nao so em producao).
  Ponto positivo real, sem ressalva.
- **SEO/robots/sitemap**: so titulo (sem descricao) em Home/Noticias;
  Roadmap tem SEO completo e dinamico. **Nao existe `robots.txt` nem
  geracao de sitemap em lugar nenhum** do projeto. Favicon e real e
  proprio (nao o padrao do Nuxt).

### Wiki, Rankings, Busca, Launcher/Download

- **Achado novo e serio**: o backend real de equipamentos da Wiki
  (Prisma/DB, 613 itens/1031 variantes, pipeline de import real) **nao e
  usado pela propria pagina que deveria consumi-lo**. `wiki.vue` nunca
  chama `wikiApi.equipment()`/`equipmentDetail()`/`summary()` -- em vez
  disso carrega um JSON estatico raspado de um site de fas externo
  (`guiamuonline.com`, 554 itens, numero diferente do banco real) via
  `apps/web/data/muEquipmentCatalog.ts`/`guiamuonlineItems.ts`. O backend
  real existe e funciona, mas e efetivamente codigo morto para navegacao
  de itens -- so sets/personagens/guias da Wiki usam a API de verdade.
  Esse mesmo JSON e importado duas vezes por dois modulos quase-duplicados,
  gerando chunks de build duplicados (confirmado: dois chunks de ~668KB e
  ~376KB com o mesmo conteudo inicial `ancient-normal-warrior-leather`).
- **A caixa de busca global da Wiki e decorativa** -- `wikiSearch`
  (`wiki.vue:10`, ref declarado na linha 1540) nunca e lido em nenhum
  outro lugar do arquivo de 3367 linhas; parece funcional mas nao filtra
  nada.
- **Rankings e 100% um stub vazio, sem excecao** -- `useLocale.ts:23`:
  `const baseRankingRows = []` hardcoded, sem nenhuma fonte de dado. Nao
  existe modulo `rankings` no backend, nenhum model `Ranking` no schema, e
  **nao existe infraestrutura de agendamento/cron em todo o `apps/api`**
  (confirmado por grep, zero `@Cron`/`ScheduleModule`). O estado vazio
  ("O ranking ainda nao possui dados sincronizados") e honesto -- nao ha
  dado falso -- mas tambem nunca vai deixar de ser vazio sem trabalho
  novo de verdade.
- **Busca site-wide nao existe** -- confirmado ausencia total (nenhuma
  pagina, componente ou rota de API de busca global).
- **Downloads**: links do launcher e cliente completo reais e testados
  como acessiveis (HTTP 200 via HEAD request ao vivo). "Patch" e "Extras"
  mostram "Em breve" porque tem `url: null` no codigo -- intencional, nao
  quebrado.
  **Launcher/auto-update**: mecanismo real e bem construido (RSA-2048 +
  SHA-256 + aplicacao transacional com rollback, `apps/launcher/Services/
  PatchService.cs`), mas o manifesto de producao esta vazio
  (`manifest.production.json`: `files: []`) -- nao ha nada para
  distribuir ainda, o mecanismo existe mas nao tem conteudo.

### Painel administrativo, notificacoes, relatorios, seguranca

- **Contas admin/RBAC**: real, Prisma-backed, e **confirmado consistente
  com o modelo ja validado em Community** -- so um `PermissionsGuard`
  compartilhado em todo o site, `role` sozinho nunca concede `admin.*`.
- **Observabilidade** (erros/alertas/auditoria/logs de trabalho): real e
  extensamente conectado. Duas falhas concretas: (1) politica de retencao
  e so um valor de configuracao -- **nao existe job de expurgo agendado
  em lugar nenhum**; (2) exportacao CSV do painel de observabilidade nao
  neutraliza injecao de formula (`=`,`+`,`-`,`@`) como a exportacao de
  relatorios administrativos ja faz -- risco real se um admin abrir um
  CSV exportado com texto controlado pelo usuario (motivo de acao, etc.)
  no Excel.
- **Notificacoes pessoais**: confirmado que nao existe -- nao ha model
  `Notification` no schema; a pagina so re-filtra o mesmo feed global de
  noticias/eventos.
- **Relatorios/exportacoes**: reais, ExcelJS de verdade, sem numero
  inventado, com checksum e trilha de auditoria por exportacao.
- **Headers de seguranca**: `helmet()` sem nenhuma customizacao (sem CSP/
  HSTS/frame-options proprios). CORS restrito por origem (nao
  wildcard), mas `localhost`/`127.0.0.1` ficam liberados incondicionalmente
  mesmo em producao. **Rate limit continua ausente globalmente** -- so
  upload de midia da Community tem (10/60s); toda outra rota, incluindo
  login/cadastro/exportacoes/acoes administrativas, nao tem limite algum.
- **Achado sensivel**: um arquivo local (nao versionado, no `.gitignore`)
  contem uma credencial real de banco de dados de producao em texto
  plano. Confirmado que **nao esta no Git** (nunca commitado, `git
  check-ignore` confirma), mas esta em texto plano no disco desta maquina
  -- recomendacao: mover para um gerenciador de segredos e rotacionar se
  esse arquivo ja foi copiado/compartilhado de forma insegura em algum
  momento. Valor da credencial deliberadamente **nao reproduzido** neste
  documento.

### Bug de producao confirmado ao vivo: 404 quebra em pagina de erro crua

Nao existe `apps/web/error.vue` nem rota catch-all (`[...slug].vue`) --
confirmado por busca no repositorio inteiro. Testado ao vivo, duas vezes,
contra o **build de producao real** (`node apps/web/.output/server/index.mjs`,
nao o dev server):

- `curl` (sem `Accept: text/html`) para uma rota inexistente recebe
  corretamente **HTTP 404** com JSON `{"statusCode":404,"message":"Page
  not found: ..."}` -- o backend/roteador Nitro esta correto.
- **Um navegador real navegando para a mesma URL recebe HTTP 500** (nao
  404) e renderiza a pagina de erro padrao (nao customizada) do proprio
  Nuxt, mostrando literalmente `500` / `undefined` / "This page is
  temporarily unavailable." -- confirmado via `read_network_requests`
  (`GET .../rota-inexistente -> 500 Server Error`) e via HTML bruto
  devolvido (o template padrao do Nuxt, nao um componente customizado do
  projeto).
- **Isso significa que qualquer link quebrado, URL digitada errada ou
  bookmark antigo -- o trafego mais comum de qualquer site publico -- vai
  mostrar aos usuarios reais uma tela de erro generica e sem identidade
  visual, com um titulo confuso ("500 undefined") em vez de um "404 -
  pagina nao encontrada" com volta para a Home.** Reproduzido de forma
  consistente em duas URLs diferentes.

### Etapa 19.4: error pages e contrato global corrigidos

O blocker acima foi corrigido sem rota catch-all. O Nuxt continua sendo a autoridade para resolver
rotas e preservar o status HTTP, enquanto `apps/web/error.vue` fornece a superficie visual comum.

- 404 HTML agora retorna HTTP 404 e a pagina Blood Moon, com `robots=noindex,nofollow` e acao para
  voltar a Home.
- 403 e 500 usam mensagens publicas distintas; o 500 oferece retry e mostra apenas um
  `requestId` validado quando esse identificador estiver explicitamente em `error.data`.
- stack, causa e mensagem interna nunca sao renderizadas pela pagina.
- a API preserva 403/404, mascara 500 e inclui o mesmo `requestId` usado por observabilidade.
- Pinia foi atualizado de 2.3.1 para 4.0.2 e `@pinia/nuxt` de 0.9.0 para 1.0.1. A versao antiga
  causava o segundo erro durante a serializacao SSR (`obj.hasOwnProperty is not a function`), que
  transformava o 404 HTML em `500 undefined`.
- testes: 3 casos do normalizador frontend e 4 casos E2E do contrato global da API.

Validacao SSR local de producao: Home 200; rota inexistente com `Accept: text/html` 404; a mesma
rota com `Accept: application/json` 404. O blocker 5 da classificacao abaixo deve ser considerado
resolvido por esta secao historicamente posterior.

### Classificacao final (BLOCKER / HIGH / MEDIUM / LOW)

**BLOCKER** (bloqueiam o beta ate serem tratados; uma task especifica foi
criada no Hub para cada um):

1. Recuperacao de senha inexistente (so mensagem falsa de sucesso, zero
   backend, zero e-mail).
2. CAPTCHA de cadastro decorativo/contornavel + zero rate limit em
   login/cadastro no backend -- cadastro em massa e credential-stuffing
   sao possiveis hoje sem nenhuma barreira real.
3. Loja sem nenhum gateway de pagamento real e sem entrega automatizada
   (100% manual via admin) -- "compra" e so debito de saldo interno.
4. Marketplace/Escrow/GameBridge sem homologacao real -- worker sempre
   falha por design, nenhuma conexao ao banco do jogo existe, endpoints
   administrativos "de desenvolvimento" inseguros continuam vivos.
5. **RESOLVIDO NA ETAPA 19.4:** paginas inexistentes agora retornam 404 real com a pagina de erro
   Blood Moon; o antigo `500 undefined` era causado pela serializacao SSR do Pinia 2.3.1.
6. Nenhum teste automatizado (E2E ou unitario) cobre auth, cadastro,
   recuperacao, 2FA, loja, recarga, marketplace, escrow, GameBridge, wiki,
   rankings, suporte, painel administrativo ou observabilidade -- so
   Community tem cobertura real.

**HIGH**:

- Storage de midia da Community nao sobrevive a redeploy de producao (ja
  documentado em `community-current-state.md`).
- Wiki: catalogo de equipamentos real (banco de dados, pipeline de
  import) e ignorado pela propria pagina, que usa dado raspado de site
  externo em vez disso -- risco de desalinhamento entre o que a Wiki
  mostra e o que o servidor de jogo realmente tem (Season 6, atributos).
- Rankings 100% vazio, sem nenhuma fonte de dado (nao e "desatualizado",
  e "nunca existiu").
- Ausencia de `robots.txt`/sitemap.
- Politica de retencao de dados sem job de expurgo real.
- Credencial de producao real em texto plano num arquivo local
  (nao versionado no Git, mas presente no disco).

### Etapa 19.5 - validacao HTTPS/TLS de producao

O trajeto real foi validado ao vivo em 2026-08-09: DNS HiNetworks aponta root e
API diretamente para `190.102.41.133`; LiteSpeed/cPanel termina TLS e encaminha
para as aplicacoes Passenger Nuxt/Nest. Nao ha Cloudflare no proxy observado.
Root, `www` e API possuem certificados Let's Encrypt validos e aceitam TLS
1.2/1.3. Home, Login, assets e endpoints de leitura da API funcionam por HTTPS,
sem erro de certificado ou mixed content detectado no smoke test de navegador.

O blocker HTTPS continua aberto porque root, `www` e Login ainda servem `200`
em HTTP, enquanto o HTTP da API devolve `503`; nenhum deles redireciona para
HTTPS. A API HTTPS envia HSTS via Helmet, mas o site Nuxt nao. A correcao depende
de autorizacao para ativar Force HTTPS Redirect e HSTS no cPanel/LiteSpeed.
`deploy/nginx.bloodmoon.conf` e template legado, nao configuracao de producao.
Ver `docs/handoff/production-tls-validation.md`.

**MEDIUM**:

- Home mistura 2 noticias falsas fixas com noticias reais sem nenhuma
  distincao visual.
- Pagina de detalhe/artigo completo de noticia nao existe.
- Modulo `tickets` orfao/morto (nao usado, tipos incompativeis com o
  schema real) -- risco de confusao futura, nao um bug ativo.
- Caixa de busca global da Wiki e decorativa (nao filtra nada).
- Exportacao CSV do painel de observabilidade nao neutraliza injecao de
  formula (diferente da exportacao de relatorios, que ja neutraliza).
- CORS libera `localhost`/`127.0.0.1` mesmo em producao.
- Headers da API usam a politica padrao do Helmet e incluem CSP/HSTS; o site
  Nuxt continua sem HSTS e sem os headers equivalentes no hosting.
- Chunks de build duplicados (~668KB + ~376KB) por import duplicado do
  mesmo JSON de equipamentos em dois modulos quase-identicos.
- Fila de suporte administrativa sem filtro de status na UI.

**LOW**:

- `Season 6` hardcoded na Home em vez de vir de configuracao.
- Inconsistencia de fallback de secret entre `auth.module.ts` (com guarda
  de `NODE_ENV`) e um ponto em `auth.service.ts` (sem a mesma guarda,
  hoje inofensivo pois o module-level throw ja impede o boot sem segredo
  real em producao).
- Endpoint `admin-audit` duplicado/morto (a UI real usa so
  `admin-observability`).
- `getMuEquipmentPage()` em `muEquipmentCatalog.ts` nunca chamado (codigo
  morto).

### Resultado

**`SITE_BETA_BLOCKED`.**

6 BLOCKERs confirmados por auditoria de codigo + evidencia ao vivo (um
deles, o 404, reproduzido diretamente em navegador contra o build de
producao). Nenhum foi corrigido nesta etapa por decisao deliberada de
escopo -- o brief pede tasks especificas por blocker em vez de uma
refatoracao gigante. Ver `site-beta-checklist.md` para o checklist
atualizado e o Hub para as tasks individuais de cada BLOCKER.
