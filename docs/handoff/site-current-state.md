# BloodMoon portal - estado atual do site

Data da auditoria: 2026-08-08
Branch auditada: `main`
Base inicial da auditoria: `a2aaf21` (`feat: apply Blood Moon v1.5 visual identity`)

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
| `/comunidade/[username]` | PARTIAL | Perfil consulta API, mas inicializa e completa lacunas com mock. |
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

- `stage-one.mock.ts` e `stage-two.mock.ts` alimentam perfil, anuncios e rails Community.
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
| lint frontend | NOT_CONFIGURED | Nao ha script dedicado. |
| testes unitarios | NOT_CONFIGURED | Nao ha script/suite identificada. |
| testes E2E | NOT_CONFIGURED | Nao ha suite identificada. |
| banco/migrations | NOT_EXECUTED | Proibido aplicar nesta auditoria. |
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
