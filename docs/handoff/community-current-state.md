# BloodMoon Community - estado atual

Data da auditoria: 2026-08-08
Importancia: documento principal para continuidade cross-agent.

## Resumo executivo

A Community nao e apenas um layout. O worktree local contem uma implementacao
consideravel de API, schema, media, feed, posts, comentarios, reacoes, salvos,
reposts, perfis, follow/block, denuncias, quests e administracao.

O desenvolvimento parou antes da reconciliacao final:

- as alteracoes estao locais e nao commitadas;
- tres migrations novas existem, mas nao foram aplicadas nesta auditoria;
- o feed central usa API real, enquanto perfil/rails/anuncios ainda usam mocks;
- secoes de navegacao como Explorar, Guilds, Eventos, Quests e Conquistas ainda
  renderizam placeholder;
- compila e passa typecheck, mas nao ha E2E com MySQL/storage/autenticacao.

Status geral (na auditoria original, Etapa 5): `PARTIAL`, com base backend
relevante e integracao final pendente.

**Status atual (Etapa 16, gate formal): `COMMUNITY_BETA_READY`.** Etapas
6-16 fecharam a reconciliacao, homologaram migrations, media, feed/posts,
interacoes sociais, perfis/privacidade, moderacao, administracao, a
jornada E2E ponta a ponta completa (Etapa 14) e um passe de UX/polish
(Etapa 15). A Etapa 16 e a auditoria final formal (checklist completo,
classificacao BLOCKER/HIGH/MEDIUM/LOW, decisao de readiness registrada no
Hub) -- ver "Gate de release para beta (Etapa 16)" abaixo para o relatorio
completo. `npm run api:test:e2e` combinado: **111/111 PASS**, 8 suites,
**zero BLOCKER** encontrado no codigo/funcionalidade da Community.
`COMMUNITY_BETA_READY` cobre especificamente a Community; outras areas do
site (autenticacao/recuperacao de senha, loja/marketplace, deploy/producao)
continuam com blockers proprios documentados em `site-beta-checklist.md`.

## Arquivos relevantes

### API

- `apps/api/src/modules/community/community.controller.ts`
- `apps/api/src/modules/community/community.service.ts`
- `apps/api/src/modules/community/community.contract.ts`
- `apps/api/src/modules/community/community-admin.controller.ts`
- `apps/api/src/modules/community/community-admin.service.ts`
- `apps/api/src/modules/community/community.module.ts`
- `apps/api/src/modules/community/README.md`
- `apps/api/src/modules/media/media.controller.ts`
- `apps/api/src/modules/media/media.service.ts`
- `apps/api/src/modules/media/media.module.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260802130000_community_social_profiles`
- `apps/api/prisma/migrations/20260802170000_community_posts_stage_three`
- `apps/api/prisma/migrations/20260802190000_community_social_interactions`

### Frontend

- `apps/web/pages/comunidade/index.vue`
- `apps/web/pages/comunidade/[username].vue`
- `apps/web/pages/comunidade/perfil/[username].vue`
- `apps/web/composables/useCommunityApi.ts`
- `apps/web/components/community/CommunitySubheader.vue`
- `apps/web/components/community/CommunityUserRail.vue`
- `apps/web/components/community/CommunityRightRail.vue`
- `apps/web/components/community/CommunityPostComposer.vue`
- `apps/web/components/community/CommunityPostCard.vue`
- `apps/web/components/community/CommunityAdCard.vue`
- `apps/web/components/community/CommunityProfileHeader.vue`
- `apps/web/components/community/CommunityProfileTabs.vue`
- `apps/web/components/community/CommunityProfileEditor.vue`
- `apps/web/components/community/CommunityProfileHoverCard.vue`
- `apps/web/components/community/CommunityAchievementPopover.vue`
- `apps/web/components/community/CommunityPlaceholderView.vue`
- `apps/web/components/community/CommunityAdminManager.vue`
- `apps/web/features/community/data/stage-one.mock.ts`
- `apps/web/features/community/data/stage-two.mock.ts`
- `apps/web/features/community/types/post.ts`

## Paginas e fluxo atual

### `/comunidade`

- Shell com subheader e tres colunas em desktop.
- Coluna central consulta feed da API com modos `for-you`, `following`, `recent`
  e `saved`.
- Composer cria/edita posts autenticados.
- Cards permitem editar/excluir proprio post, reagir, salvar, repostar, copiar link,
  comentar, responder, editar/excluir comentario e reagir em comentario.
- Loading, erro e vazio existem.
- Usuario sem sessao e enviado ao login para interacoes protegidas.
- Coluna esquerda/perfil e coluna direita/anuncios ainda usam mocks.
- Explorar, Perfil pelo query param, Guilds, Eventos, Quests e Conquistas usam
  placeholder. `Salvos` usa o feed real.

### `/comunidade/[username]`

- Inicializa um perfil visual de mock e tenta mesclar o retorno real da API.
- Exibe header, stats, conquistas, abas e editor para o proprio perfil.
- Em falha de API, mantem silenciosamente a composicao mock.
- As abas usam dados derivados de posts/achievements quando disponiveis, mas ainda
  preservam mock para lacunas.

### `/comunidade/perfil/[username]`

- Alias que redireciona para `/comunidade/[username]`.

### `/painel/admin/comunidade`

- Reusa `CommunityAdminManager`.
- Possui dashboard e abas administrativas para posts, comentarios, reacoes,
  usuarios, denuncias, conquistas, quests, badges, politicas, tarefas e analytics.
- Acesso exige papel ADM/SUPER_ADM e permissao granular no backend.

## Matriz funcional

| Recurso | Status | Evidencia/limite |
|---|---|---|
| Shell/subheader | DONE | Componentes separados e responsivos. |
| Feed publico | DONE | `GET /community/feed`. |
| Feed autenticado | DONE | `GET /community/feed/authenticated`. |
| Feed Seguindo | DONE | Parametro `feed=following`; depende de Follow persistido. |
| Feed Recentes | DONE | Parametro `feed=recent`. |
| Para Voce | PARTIAL | Regra simples; nao ha ranking/recomendacao madura. |
| Paginacao backend | DONE | Query/page/pageSize e resposta paginada (offset, nao cursor). |
| Paginacao UI do feed | `DONE` | Etapa 9: botao "Carregar mais publicacoes" acumula paginas alem da 1a; qualquer mutacao (criar/editar/excluir/reagir/salvar/repostar/comentar) reseta para a pagina 1 fresca, por design -- ver "Feed e Posts (Etapa 9)" abaixo. |
| Criar post | DONE | Tipos TEXT/IMAGE/GALLERY/GIF/ARTICLE preparados. |
| Visualizar post | `DONE` | Etapa 9: `GET /community/posts/:id` (+ `/authenticated`) real, com as mesmas regras de visibilidade/bloqueio do feed -- fecha o link morto do "Copiar link" (ver linha abaixo). |
| Editar post | DONE | Proprio autor; cria revisao; permissao verificada no backend (E2E prova que outro usuario recebe 404, nao so que o botao fica oculto). |
| Excluir post | DONE | Soft delete/auditoria preservada; mesma prova de permissao via E2E. |
| Comentarios | `DONE` | Etapa 10: criar/editar/excluir com ownership real (E2E prova 404 entre contas distintas); paginacao real via `GET /community/posts/:id/comments` (+`/authenticated`) alem dos 5 primeiros embutidos no post; contador corrigido (nao contava mais comentarios removidos, ver "Interacoes Sociais (Etapa 10)"). |
| Reacoes | `DONE` | Etapa 10: toggle add/remove confirmado; race de double-click auditada e corrigida (nao duplica linha, nao derruba a requisicao). |
| Salvos | `DONE` | Etapa 10: save/unsave confirmados; listagem privada (`feed=saved`) confirmada isolada por conta (E2E prova que a lista de A nao vaza para B); race de double-click corrigida. |
| Repost interno | `DONE` | Etapa 10: repost/undo confirmados; referencia ao post original preservada (nao cria post novo); bloqueios reais confirmados (nao repostar proprio post, nao repostar post nao-publico mesmo quando visivel); race de double-click corrigida. |
| Copiar link | `DONE` | Etapa 9: o link gerado (`/comunidade?post=<id>`) agora abre um modal real com a publicacao (antes: query param nunca lido, link nao fazia nada). |
| Hashtags/mencoes | PARTIAL | Campos e parsing/contratos existem; busca/notificacao nao. |
| Perfil publico | `DONE` | Etapa 7: sem mock/fallback. Etapa 11: `profileVisibility` (PUBLIC/FOLLOWERS/PRIVATE) agora realmente aplicada -- antes FOLLOWERS era decorativo e um dono podia ficar trancado do proprio perfil PRIVATE. Ver "Perfis e Relacionamentos (Etapa 11)" abaixo. |
| Editar perfil | `DONE` | Etapa 7: `PATCH /community/me` com validacao real (tipo, enum, URL) no backend; UI sem atualizacao otimista -- so fecha e reflete apos confirmacao do servidor; erro exibido inline se a API falhar. |
| Follow/unfollow | `DONE` | Etapa 11: confirmado real e funcional (botao no header do perfil, nao um placeholder); E2E cobre follow/unfollow refletindo no endpoint de relacionamento. |
| Block/unblock | `DONE` | Etapa 11: confirmado real; bloqueio agora tambem oculta a pagina de perfil (antes so ocultava posts no feed) e remove follow em ambas direcoes -- E2E cobre. |
| Mute | MISSING | Enum preparado, sem fluxo publico identificado. Nao inventado nesta etapa. |
| Hover card | `DONE` | Etapa 11: confirmado com link real "Ver perfil" navegando para `/comunidade/:username`. Etapa 15: bug real corrigido -- botao "Seguir" era decorativo (so alternava um ref local, nunca chamava a API); agora busca o relacionamento real e segue/deixa de seguir de verdade, com erro tratado via toast. |
| Upload de imagem | `DONE` | Etapa 8: pipeline real ligado a avatar/capa/posts (zero base64/mock); rate limit (10/60s); erro de validacao (400) separado de falha de infraestrutura (500); E2E cobre valido/tipo invalido/arquivo grande/corrompido/sem-auth/falha de storage. Storage continua local -- ver "Midia (Etapa 8)" abaixo para o blocker de producao. |
| Upload de GIF | DONE backend | Valida e reprocessa GIF; conversao para video nao existe. |
| Galeria | DONE backend | 2 a 6 assets; E2E cobre post com midia (ver "Midia (Etapa 8)"); QA visual em navegador ainda pendente. |
| Denuncia | `DONE` | Etapa 12: fluxo completo homologado -- usuario denuncia (com motivo obrigatorio) -> registro -> fila administrativa (`GET /admin/community/reports`) -> acao do moderador -> resolucao. Duplicata abusiva e auto-denuncia ja bloqueadas (confirmado, pre-existente). E2E cobre o fluxo ponta a ponta com 2 contas reais. |
| Moderacao | `DONE` | Etapa 12: post/comment/reaction/user (incluindo avatar/capa/bio) homologados via E2E real -- acao de moderador aplicada, efeito confirmado (post oculto some do feed publico), autorizacao backend confirmada (nao so UI). "Media" moderada indiretamente via hide/remove do post que a contem, ou via `AVATAR_REMOVAL`/`COVER_REMOVAL` para foto de perfil -- nao existe remocao de uma imagem isolada dentro de uma galeria ainda (nao construido, ver riscos). |
| Conquistas | `PARTIAL` | CRUD/grants/admin e exibicao de perfil; dados reais dependem do banco. Etapa 13: bug real corrigido -- painel admin desativava a conquista a cada edicao, mesmo trocando so a descricao. |
| Quests | `PARTIAL` | Listar/participar/admin/progresso/recompensa; home dedicada ausente. Etapa 13: mesmo bug de "editar reseta status" corrigido (editar uma quest publicada nao volta mais para DRAFT sozinho). |
| Painel administrativo (posts/comentarios/reacoes/perfis/moderacao/denuncias/badges/policy/tarefas/analytics) | `DONE` | Etapa 13: homologado ponta a ponta -- filtros, busca, paginacao e todas as acoes confirmadas reais contra o backend (nenhum mock). RBAC de 3 niveis confirmado por E2E: player barrado (401/403), moderador com permissoes granulares reais (nao um `if (role==='ADMIN')` binario -- confirmado que `role: 'ADMIN'` sozinho nao concede nada de Community), admin/super-admin com acesso total. Estados de loading/vazio/erro reais adicionados (antes: nenhum -- uma falha de rede deixava a tela em branco sem aviso). |
| Validacao E2E ponta a ponta | `DONE` | Etapa 14: jornada real unica homologada (`apps/api/test/community-e2e-journey.e2e-spec.ts`, novo) -- cadastro/login, perfil, edicao, avatar, post, feed, permalink, comentario, reacao, save, repost, perfil de outro usuario, edicao indevida, denuncia, moderacao, administracao, logout/login, persistencia apos nova sessao. 401/403/404/validacao/falha de storage/estados vazios cobertos explicitamente; "API indisponivel" documentado como nao aplicavel (Community nao tem dependencia sincrona externa a simular). Nenhum bug funcional novo encontrado -- etapa de homologacao/organizacao, nao de correcao. Combinado: **111/111 PASS**. |
| Badges | PARTIAL | Admin/grants existem; exibicao social final incompleta. Etapa 11: exposicao publica auditada e corrigida (campos internos de admin removidos do payload). |
| Compartilhados (reposts no perfil) | `DONE` | Etapa 11: aba "Compartilhados" tinha zero dado real (kind sempre `'publication'`) apesar de reposts serem uma feature real -- fechado, agora mostra reposts reais com referencia ao post/autor original. |
| Guilds | MISSING | Guild e string; sem entidade/pagina/membros/cargos. |
| Eventos sociais | MISSING | Navegacao e placeholder, sem dominio dedicado. |
| Notificacoes sociais | MISSING | Sem entidade/inbox/preferencias. |
| Busca social | MISSING | Sem indice unificado de pessoas/posts/tags. |
| Ads reais | MISSING | Etapa 9: mocks removidos (`communityAdsMock` e o resto de `stage-one.mock.ts`, `CommunityAdCard.vue` deletados). Right rail mostra estado honesto de indisponivel -- nao inventa mais anuncios/eventos/trending/sugestoes. Sem campanha/impressao/clique real. |
| Estatisticas sociais | PARTIAL | Stats basicos de perfil/API; sem snapshots/privacy efetiva completa. |
| Estados loading/vazio/erro | DONE feed | Etapa 9: right rail tambem honesto (era mock antes). Outras secoes de navegacao (Explorar/Guilds/Eventos/Quests/Conquistas) continuam `CommunityPlaceholderView`, honesto. |
| Responsividade | PARTIAL | Breakpoints e drawer existem; sem QA visual runtime nesta auditoria. |

## Endpoints publicos/autenticados

Base: `/api/community` quando `API_GLOBAL_PREFIX=api`.

### Leitura publica

- `GET /community/feed`
- `GET /community/profiles/:username`
- `GET /community/quests`

### Leitura/acoes autenticadas

- `GET /community/feed/authenticated`
- `GET /community/me`
- `PATCH /community/me`
- `GET /community/profiles/:username/relationship`
- `POST|DELETE /community/profiles/:username/follow`
- `POST|DELETE /community/profiles/:username/block`
- `POST /community/posts`
- `PATCH|DELETE /community/posts/:id`
- `POST /community/posts/:id/comments`
- `PATCH|DELETE /community/comments/:id`
- `POST /community/reactions`
- `POST /community/posts/:id/save`
- `POST /community/posts/:id/repost`
- `POST /community/reports`
- `POST /community/quests/:id/join`
- `POST /community/media`

## Endpoints administrativos

Base: `/api/admin/community`. Todos usam JWT + roles + permissoes.

- dashboard;
- posts/lista/historico/acoes;
- comentarios/lista/acoes;
- reacoes/lista/acoes;
- usuarios/lista/moderacao/restauracao;
- denuncias/lista/decisao;
- conquistas CRUD/acoes/grants/revogacao;
- quests CRUD/acoes/participantes/progresso/recompensa;
- badges CRUD/grants/revogacao;
- policy leitura/edicao;
- tarefas CRUD;
- analytics.

O `useCommunityApi.ts` possui chamadas correspondentes aos endpoints acima. Nao foi
identificado, por leitura estatica, endpoint esperado pelo composable sem controller.

## Models/tabelas

- `Account` (identidade central; nao existe perfil independente por personagem).
- `CommunityProfile`.
- `CommunityFollow`.
- `CommunityUsernameHistory`.
- `CommunityPost` e `CommunityPostRevision`.
- `CommunityMedia`.
- `CommunityComment` e `CommunityCommentRevision`.
- `CommunityReaction`.
- `CommunityPostSave`.
- `CommunityRepost`.
- `CommunitySocialRelation`.
- `CommunityReport`.
- `CommunityModerationAction`.
- `CommunityAchievement` e `CommunityAchievementGrant`.
- `CommunityQuest` e `CommunityQuestParticipant`.
- `CommunityBadge` e `CommunityBadgeGrant`.
- `CommunityPolicy`.
- `CommunityTask`.

Observacao: `CommunityTask` coexiste com `AdminTask`, criando sobreposicao de
responsabilidade que deve ser decidida depois do beta, nao refatorada agora.

## Migrations pendentes (Etapa 5)

Tres migrations Prisma existem no worktree local (`apps/api/prisma/migrations/`)
mas **nao foram aplicadas** -- nem nesta etapa, nem na auditoria anterior. A
ultima migration realmente aplicada ao schema e `20260730110000_season6_scope_cleanup`;
as tres abaixo vem depois dela, nessa ordem, e cada uma depende da anterior
(historico linear do Prisma -- nao podem ser reordenadas nem aplicadas isoladamente).

### 1. `20260802130000_community_social_profiles`

- **Depende de**: `20260730110000_season6_scope_cleanup` (baseline atual).
- **Models afetados**: `CommunityProfile` (10 colunas novas: personagem/guild em
  destaque, `featuredAchievementIds`, e 6 flags de visibilidade granular --
  `profileVisibility`/`charactersVisibility`/`equipmentVisibility`/
  `statisticsVisibility`/`guildVisibility`/`activityVisibility`, todas com
  `DEFAULT` seguro); `CommunityModerationAction` (amplia o `ENUM` de `type`,
  adiciona `USERNAME_CHANGE`/`REACH_LIMIT` e outros); `CommunityPolicy`
  (`usernameCooldownDays INT DEFAULT 30`); cria `CommunityFollow` e
  `CommunityUsernameHistory` (tabelas novas, sem FK declarada no SQL bruto --
  a integridade referencial com `Account` fica a cargo da camada de aplicacao).
- **Risco aparente**: baixo-medio. Todas as colunas novas tem `DEFAULT`
  (nenhuma exige backfill manual); a mudanca de maior atencao e o `ENUM`
  ampliado de `CommunityModerationAction.type` -- expandir um ENUM MySQL via
  `MODIFY COLUMN` e uma operacao que reescreve a definicao da coluna e deve
  ser testada contra o volume real de linhas antes de produzir.
- **Necessidade de teste**: validar em clone descartavel que o `MODIFY COLUMN`
  do ENUM preserva os valores existentes; confirmar que `CommunityFollow`/
  `CommunityUsernameHistory` realmente aplicam integridade referencial no
  service layer (Prisma), ja que o SQL bruto nao tem `FOREIGN KEY` para essas
  duas tabelas.

### 2. `20260802170000_community_posts_stage_three`

- **Depende de**: migration 1 (mesma cadeia linear).
- **Models afetados**: `CommunityPost` (adiciona `type` ENUM de 13 valores
  com `DEFAULT 'TEXT'`, `visibility` ENUM com `DEFAULT 'PUBLIC'`, `tags`/
  `mentions` JSON, `edited`/`editedAt`, `sponsored`/`official`,
  `sourceType`/`sourceId` -- os dois ultimos sem FK declarada, mesma
  observacao de integridade via aplicacao); `CommunityPostRevision` (replica
  `type`/`visibility`/`tags`/`mentions`); cria `CommunityMedia` (tabela nova,
  com FK real: `postId` -> `CommunityPost.id` `ON DELETE SET NULL`) e dois
  indices compostos em `CommunityPost`.
- **Risco aparente**: baixo. Todas as colunas novas tem `DEFAULT`; unico
  ponto de atencao e o mesmo padrao de `sourceType`/`sourceId` sem FK (fonte
  polimorfica, decisao deliberada igual ao `entity_type`/`entity_id` do
  proprio Knowledge Hub -- nao e um erro, mas exige validacao na aplicacao).
- **Necessidade de teste**: confirmar que `MediaService` (ver "Midia e
  seguranca" abaixo) grava `postId` corretamente e que o `ON DELETE SET NULL`
  se comporta como esperado quando um post e apagado com midia anexada.

### 3. `20260802190000_community_social_interactions`

- **Depende de**: migration 2 (mesma cadeia linear).
- **Models afetados**: cria `CommunityCommentRevision` (FK real para
  `CommunityComment.id`, `ON DELETE CASCADE`); `CommunityComment` ganha
  `edited`/`editedAt`; cria `CommunityPostSave` (FK real para
  `CommunityPost.id`, `ON DELETE CASCADE`, unique por `accountId`+`postId`);
  cria `CommunityRepost` (mesma forma, unique por `accountId`+`postId`); cria
  `CommunitySocialRelation` (`BLOCK`/`MUTE`, unique por
  `actorId`+`targetId`+`type`, sem FK declarada para `Account` -- mesma
  observacao de integridade via aplicacao).
- **Risco aparente**: baixo. Estrutura toda nova (nenhum `ALTER` de dado
  existente critico alem de duas colunas nullable em `CommunityComment`);
  maior superficie das tres migrations, mas a mais "aditiva pura".
- **Necessidade de teste**: validar os `UNIQUE INDEX` compostos de
  `CommunityPostSave`/`CommunityRepost`/`CommunitySocialRelation` sob
  concorrencia (double-click de save/repost/block e um risco classico de
  unique-constraint-violation tratado ou nao pelo service).

**Nenhuma das tres foi aplicada em nenhum ambiente nesta etapa** -- homologacao
completa (clone descartavel do MySQL, teste de rollback) fica para a Etapa 6,
conforme o proprio handoff da Etapa C1 ja registrava.

## Homologacao das migrations (Etapa 6)

Executada em 2026-08-08 contra um container MariaDB 11 **descartavel e isolado**
(`docker run`, sem volume nomeado, destruido ao final) -- nunca o container
`bloodmoon-mysql` de desenvolvimento, nunca producao, nenhum dado real de
jogador em nenhum momento. Sequencia real testada: baseline (14 migrations
ja commitadas) -> migration 1 -> estado -> migration 2 -> estado -> migration
3 -> estado final, com `SHOW TABLES`/`DESCRIBE`/`SHOW CREATE TABLE` apos cada
passo. `prisma migrate deploy` aplicou as 17 migrations sem erro em nenhum
passo; `prisma migrate status` confirmou "Database schema is up to date"
ao final; `prisma generate` produziu o client sem erro (apos um EPERM
transitorio de lock de arquivo do Windows, resolvido limpando o cache
`.prisma/client` -- nao relacionado as migrations).

### Classificacao de risco

| Migration | Classificacao | Motivo |
|---|---|---|
| `20260802130000_community_social_profiles` | `ADDITIVE` | 10 colunas novas em `CommunityProfile` (todas nullable ou com `DEFAULT`); `ALTER ... MODIFY COLUMN` do ENUM de `CommunityModerationAction.type` -- **verificado empiricamente**: os 8 valores originais (`WARNING`...`REACH_LIMIT`) sobrevivem intactos, incluindo `REACH_LIMIT`, cuja posicao ordinal muda de 8/8 para 10/10 (teste dedicado: 3 linhas semeadas com o enum antigo, `MODIFY COLUMN` aplicado, valores relidos identicos -- MySQL/MariaDB remapeiam por valor de string, nao por indice bruto); coluna nova em `CommunityPolicy` com `DEFAULT`; 2 tabelas novas (`CommunityFollow`, `CommunityUsernameHistory`). Nenhum `DROP`, nenhuma coluna passou de nullable para `NOT NULL` sem default, nenhum dado preexistente e afetado. |
| `20260802170000_community_posts_stage_three` | `ADDITIVE` | 10 colunas novas em `CommunityPost`, 4 em `CommunityPostRevision` (todas nullable/default); 2 indices compostos novos; tabela nova `CommunityMedia` com FK real para `CommunityPost.id` (`ON DELETE SET NULL`, verificada -- insert com `postId` inexistente foi corretamente rejeitado pelo banco). Nenhum `DROP`, nenhuma alteracao destrutiva. |
| `20260802190000_community_social_interactions` | `ADDITIVE` | Tabela nova `CommunityCommentRevision` (FK real para `CommunityComment.id`, `ON DELETE CASCADE`, verificada); 2 colunas nullable novas em `CommunityComment`; tabelas novas `CommunityPostSave`/`CommunityRepost` (FK real para `CommunityPost.id`, `ON DELETE CASCADE`, unique `accountId+postId` -- verificado: segunda tentativa de save duplicado foi corretamente rejeitada); tabela nova `CommunitySocialRelation` (unique `actorId+targetId+type`). Nenhum `DROP`, nenhuma alteracao destrutiva. |

**Achado de arquitetura (nao bloqueia a aplicacao das migrations, mas exige
decisao futura)**: `CommunityFollow` (`followerId`/`followingId`),
`CommunityUsernameHistory` (`accountId`/`changedBy`) e
`CommunitySocialRelation` (`actorId`/`targetId`) **nao tem nenhuma
referencia a `Account`** -- nem `FOREIGN KEY` no SQL, nem `@relation` no
`schema.prisma`. Confirmado tanto por leitura do schema quanto
empiricamente: um `CommunityFollow` apontando para uma conta inexistente
foi aceito pelo banco sem erro. A integridade referencial dessas tres
tabelas depende inteiramente da disciplina do service layer (NestJS) --
nada no schema impede um id orfao. Nao e um bug das migrations em si (o
design e deliberado, mesmo padrao ja usado em `CommunityPost.sourceType`/
`sourceId`), mas e um risco real para a Etapa 7+ se qualquer fluxo futuro
inserir esses ids sem validar a conta primeiro.

### Testes minimos executados (schema, nao E2E autenticado)

Via Prisma Client gerado, contra o banco descartavel ja com as 3 migrations
aplicadas -- 16/16 verificacoes com sucesso, incluindo dois testes negativos
deliberados:

- perfil (`CommunityProfile.create` com as novas colunas de visibilidade);
- follow (`CommunityFollow.create`, incluindo o caso de `followingId`
  inexistente -- aceito, confirmando a ausencia de FK acima);
- post (`CommunityPost.create` com `type`/`visibility`/`tags`/`mentions`);
- midia (`CommunityMedia.create` com FK valida; `CommunityMedia.create` com
  `postId` inexistente -- corretamente rejeitado);
- comentario + revisao (`CommunityComment.create`,
  `CommunityCommentRevision.create`, `edited`/`editedAt`);
- reacao (`CommunityReaction.create`);
- save (`CommunityPostSave.create`; duplicata -- corretamente rejeitada pelo
  `UNIQUE(accountId, postId)`);
- repost (`CommunityRepost.create`);
- bloqueio social (`CommunitySocialRelation.create` tipo `BLOCK`);
- moderacao (`CommunityModerationAction.create` usando o valor de enum novo
  `USERNAME_CHANGE`, confirmando que a aplicacao consegue gravar os valores
  adicionados pela migration 1).

E2E autenticado real (login -> perfil -> upload -> post -> ... -> report,
via HTTP/JWT contra a API rodando) **nao foi executado nesta etapa** -- o
smoke test acima e no nivel de schema/Prisma Client, nao de aplicacao
completa. Fica para a Etapa 7, conforme o proprio objetivo desta etapa
(homologar as migrations, nao substituir os mocks nem fazer E2E completo).

### Rollback / recovery (estrategia real, nao inventada)

Prisma Migrate **nao gera migrations de reversao automaticas** neste
projeto -- confirmado: cada pasta em `apps/api/prisma/migrations/` contem
apenas `migration.sql`, nenhum `down.sql`/equivalente existe em nenhuma das
17 migrations. Nao existe um comando `prisma migrate down` nativo para uso
em producao. A estrategia real de recuperacao, caso uma destas 3 migrations
precise ser desfeita apos aplicacao em producao, e:

1. **Backup completo do MySQL de producao antes de aplicar** (dump
   restauravel, testado) -- pre-requisito, nao opcional.
2. Aplicar as migrations (`prisma migrate deploy`).
3. Validacao imediata pos-deploy (smoke test funcional minimo).
4. **Se um problema for encontrado**: restaurar o backup completo do passo 1.
   Isso reverte o banco inteiro ao estado anterior a todas as 3 migrations
   (nao existe reversao seletiva de uma migration especifica sem escrever
   SQL de reversao manual, o que nao foi feito nem e recomendado nesta
   etapa).

Esta etapa **nao executou nenhum passo deste procedimento contra producao**
-- e a documentacao da estrategia para quando a aplicacao real acontecer
(Etapa 7 ou posterior, mediante aprovacao explicita), nao uma execucao.

### Resultado

| Migration | Resultado |
|---|---|
| `20260802130000_community_social_profiles` | `APPROVED_FOR_PRODUCTION` |
| `20260802170000_community_posts_stage_three` | `APPROVED_FOR_PRODUCTION` |
| `20260802190000_community_social_interactions` | `APPROVED_FOR_PRODUCTION` |

Aprovacao e sobre a **seguranca tecnica da migration em si** (schema,
constraints, ausencia de perda de dados) -- nao e autorizacao para aplicar
em producao agora. Isso continua exigindo: backup verificado, janela de
manutencao/coordenacao, e aprovacao explicita do operador, per
[docs/security-model.md](../security-model.md) deste repositorio e pelo
protocolo de acoes destrutivas do AI Knowledge Hub (Knowledge Hub e um
repositorio separado -- ver `docs/protocols/destructive-actions.md` la).
**Nenhuma migration foi aplicada em producao nesta etapa.**

## Midia e seguranca

`MediaService`:

- exige JWT;
- aceita JPG, PNG, WebP e GIF;
- limita um arquivo e 8 MB no controller;
- usa Sharp para detectar formato real e rejeitar extensao/MIME divergentes;
- limita 8.000 px e 40 milhoes de pixels;
- converte imagens estaticas para WebP ate 2.048 px;
- reprocessa GIF;
- calcula SHA-256;
- registra owner/status/path no banco;
- so permite anexar asset da propria conta em estado permitido;
- registra falhas em SystemError;
- **(Etapa 8)** rate limit de 10 uploads/60s por cliente (`ThrottlerGuard`,
  escopado ao `MediaModule`, nao API-wide);
- **(Etapa 8)** provenance basica: cada upload gera um `SystemOperationalEvent`
  (`COMMUNITY_MEDIA_UPLOADED`) com uploader, correlation id (via
  `CorrelationMiddleware`, automatico), timestamp e SHA-256 -- reaproveita a
  trilha de auditoria que os outros modulos ja escrevem, sem coluna/tabela nova.

Pendencias:

- storage e filesystem local, sem objeto remoto/CDN -- **blocker de Beta
  Release, ver "Midia (Etapa 8)" abaixo**;
- limpeza de assets orfaos por falha parcial de upload multi-arquivo
  **identificada nesta etapa** (ver "Midia (Etapa 8)" abaixo) -- ainda sem
  ciclo de limpeza automatico;
- URL e servida pela propria API; proxy/cache/backup precisam homologacao;
- GIF pesado ainda nao converte para WebM/MP4;
- nao aceitar SVG arbitrario esta corretamente preservado;
- moderacao de conteudo (revisar/remover midia reportada) ainda nao tem
  superficie admin -- o evento de provenance existe, mas nada o le ainda.

## Autenticacao, autorizacao e moderacao

- Feed publico nao requer sessao; following/saved e mutacoes exigem JWT.
- Alteracoes proprias verificam autor no service.
- Admin controller exige `ADMIN` ou `SUPER_ADMIN` e permissoes granulares.
- Acoes administrativas geram AuditLog/AdminWorkLog conforme service compartilhado.
- Erros relevantes sao enviados para observabilidade.
- Posts/comentarios mantem revisoes e soft delete/moderacao.
- CommunityPolicy armazena palavras, dominios, spam, limites e cooldowns.

Pendencias de homologacao:

- testes por papel/permissao;
- rate limit real sob concorrencia;
- sanitizacao/renderizacao de ARTICLE e texto rico;
- bloqueio/follow concorrente;
- privacidade efetiva de cada campo do perfil;
- moderacao de midia e remocao fisica segura.

## Perfil (Etapa 7)

Fluxo completo, sem mock/fallback, do perfil Community:

```
UI (pages/comunidade/[username].vue, CommunityProfileHeader/Tabs/Editor)
  v
composable (useCommunityApi -- publicProfile/updateProfile/followProfile/...)
  v
API (CommunityController: GET /community/profiles/:username, PATCH /community/me, ...)
  v
service (CommunityService: publicProfile/updateProfile/follow/...)
  v
Prisma (CommunityProfile, Account, CommunityAchievementGrant, CommunityPost)
  v
MySQL
```

### O que mudou

- **Mocks removidos**: `pages/comunidade/[username].vue` nao inicializa mais com
  `profileForUsername()` nem mantem a composicao mock em caso de falha da API.
  `apps/web/features/community/data/stage-two.mock.ts` foi **deletado**
  (ficou 100% orfao). `stage-one.mock.ts` perdeu `communityProfileMock`/
  `CommunityProfileMock`/`communityPostsMock`/`CommunityPostMock` (idem,
  orfaos); mantem apenas os 4 exports do rail direito, que continuam em uso
  fora do escopo desta etapa.
- **Tipos realocados**: `CommunitySocialProfile` e afins saíram de um arquivo
  chamado "mock" para `apps/web/features/community/types/profile.ts` (tipos
  reais, nao dados). `usernamePolicy` (logica real, nunca foi mock) saiu para
  `apps/web/features/community/username-policy.ts`.
- **Mapeamento compartilhado**: `apps/web/features/community/map-profile-response.ts`
  centraliza a conversao da resposta real da API para a forma de exibicao --
  usado tanto pela pagina de perfil quanto pelo card de "meu perfil" no rail
  da home (`pages/comunidade/index.vue`), evitando duas implementacoes
  divergentes do mesmo mapeamento.
- **Estados reais**: a pagina de perfil agora tem `loading` (via
  `useAsyncData`/`pending`), `error` (com botao "Tentar novamente"),
  `not-found` (404 real da API -- perfil inexistente ou privado) e `success`.
  Nenhum estado mostra dado inventado.
- **Salvar sem fingir sucesso**: o editor so fecha e a UI so reflete a mudanca
  **depois** que `PATCH /community/me` responde com sucesso, e o valor exibido
  vem de um refetch real (`refresh()`), nao do formulario local -- captura
  qualquer normalizacao que o servidor aplique (trim, defaults). Em erro, a
  mensagem e exibida inline no editor (`saving`/`error` props novos em
  `CommunityProfileEditor.vue`) e nada e alterado na tela.
- **Proprio perfil vs. perfil de terceiro**: `ownProfile` compara
  `user.value.username` com o username da rota (inalterado, ja existia).
  Estrutural, nao apenas visual: **nao existe endpoint** para editar o perfil
  de outra pessoa -- `PATCH /community/me` sempre opera sobre o id da conta
  extraido do JWT, nunca sobre um parametro/body. Provado no E2E abaixo.
- **Validacao de entrada real no backend** (`community.service.ts`,
  `updateProfile`): campos de texto agora sao checados como `string` antes de
  `.trim()` (evita erro 500 bruto com payload malformado, retorna 400 limpo);
  os 6 campos de visibilidade (`profileVisibility`, `charactersVisibility`,
  etc.) agora sao validados contra a lista de valores permitidos -- antes
  aceitavam **qualquer string**, ja que as colunas sao `VARCHAR(20)` no MySQL
  (nao um ENUM), sem checagem nenhuma. `avatarUrl`/`coverUrl` agora exigem
  `http(s)://` valido quando informados.
- **2 correcoes triviais e seguras**: mojibake corrigido em 3 mensagens de
  erro de `follow`/`unfollow` (bytes UTF-8 mal interpretados, nao um problema
  de terminal). `vue/attributes-order` (0 ocorrencias novas -- ja resolvido na
  Etapa 5).

### Achado de seguranca (nao um bug -- documentado para referencia futura)

Antes desta etapa, `updateProfile` aceitava qualquer valor de string para os 6
campos de visibilidade, porque `CommunityProfile.profileVisibility` e as
demais colunas sao `VARCHAR(20)` sem `CHECK`/`ENUM` no banco (ver Etapa 6).
Nenhuma exploracao real disso foi encontrada (o frontend so envia os valores
do `<select>`), mas um cliente HTTP direto podia gravar qualquer string.
Corrigido nesta etapa com uma allowlist explicita no service, no mesmo estilo
ja usado por `postType()`/`visibility()` no mesmo arquivo.

### E2E minimo (primeiro do repositorio)

`apps/api/test/community-profile.e2e-spec.ts` -- Jest + Supertest, escolhido
sobre Playwright/E2E de navegador por ser o padrao oficial do proprio NestJS
(`nest new` gera exatamente esse par) e por nao exigir subir simultaneamente
API + web + navegador + banco quando nada disso existe ainda no repositorio
("nao criar arquitetura exagerada" -- brief desta etapa). Cobre o fluxo real
via HTTP, contra um container MariaDB **descartavel e isolado** (mesmo padrao
da Etapa 6 -- nunca `bloodmoon-mysql`, nunca producao), criado e destruido
pelo proprio teste:

1. Registra e loga 2 contas reais (`POST /auth/register` + `POST /auth/login`).
2. Login -> abre o proprio perfil -> edita `displayName`/`bio` -> persiste ->
   recarrega (`GET` independente) -> confirma que o dado real foi gravado.
3. Abre o perfil de outra pessoa -> tenta editar -> confirma que a conta B
   so consegue alterar o **proprio** perfil, nunca o da conta A (e confirma
   que a propria alteracao de B funcionou, descartando "o endpoint so esta
   quebrado" como explicacao alternativa).
4. Rejeita `profileVisibility` invalido (400) -- valida a correcao acima.
5. Rejeita atualizacao sem autenticacao (401).
6. Retorna 404 para perfil inexistente.

Rodar: `npm run api:test:e2e` (exige Docker). Resultado: **6/6 PASS**.

Fora do escopo: QA visual manual em navegador (a validacao aqui e via HTTP
real, nao pixel-a-pixel); testes de outros modulos Community (feed, posts,
midia -- sem cobertura ainda).

## Midia (Etapa 8)

Objetivo da etapa: tornar imagem/midia da Community real, segura e pronta
para beta -- **sem** assumir que "existe R2 no Knowledge Hub" implica migrar
o storage da Community para la (instrucao explicita do brief; Knowledge Hub e
um repositorio/infra separado do BloodMoon).

### Inventario (ponto de partida)

Antes de qualquer mudanca, o pipeline existente (`MediaService`, herdado das
etapas anteriores) ja era solido: upload autenticado via `POST
/community/media`, limite de 8 MB no `FileInterceptor`, validacao por bytes
reais com Sharp (nao confia em extensao/Content-Type do cliente), filename
gerado no servidor (`randomUUID()`, nunca o nome enviado pelo usuario -- sem
path traversal possivel), allowlist fechada (JPG/PNG/WebP/GIF, SVG
deliberadamente fora), reencode que descarta qualquer payload/metadata
embutido no arquivo original, `CommunityMedia` com owner/status/hash no
banco, e `resolveForPost`/`snapshot` com checagem de propriedade e limite de
quantidade por tipo de post. Os gaps reais encontrados (nao especulativos --
cada um comprovado por teste ou leitura direta do codigo) foram os listados
abaixo.

### O que foi corrigido nesta etapa

- **Seguranca -- rate limiting**: `POST /community/media` nao tinha nenhum
  limite de taxa (Sharp + escrita em disco e o endpoint mais caro da API).
  Adicionado `@nestjs/throttler` (`^5.2.0`, unica versao com
  `reflect-metadata@^0.2.0` compativel com o stack atual -- verificado via
  `npm view` antes de instalar, mesma disciplina da Etapa 7 para
  `@nestjs/testing`), escopado ao `MediaModule` (10 uploads/60s), nao
  aplicado a API inteira -- fora de escopo desta etapa.
- **Perfil -- pipeline real, zero base64/mock**: `CommunityProfileEditor.vue`
  antes tinha `<input type="url">` puro para `avatarUrl`/`coverUrl` (o
  usuario colava uma URL manualmente, nenhum upload real). Reescrito para
  usar `useCommunityApi().uploadMedia()` (mesmo endpoint de posts) com
  preview, estado de loading e erro inline por campo; o formulario so grava
  a URL real devolvida pelo servidor, nunca um valor fabricado.
- **Posts -- falha sem estado fantasma**: `CommunityPostComposer.vue` agora
  captura falha de upload por arquivo individual (com nome do arquivo e
  indice no lote na mensagem de erro) e **interrompe antes de criar/editar o
  post** -- o post so e criado depois que todos os uploads do lote terminam
  com sucesso. Ghost-post tambem foi coberto no backend: `resolveForPost`
  ja rejeitava `mediaIds` inexistente ou de outra conta (400), confirmado
  agora por E2E dedicado.
- **Bug corrigido (Etapa 7 → Etapa 8)**: `community.service.ts#optionalUrl`
  exigia `http(s)://` valido, mas `MediaService.publicUrl()` sempre devolveu
  caminho relativo (`/api/media/community/<uuid>.webp`) -- ou seja, o
  upload real de avatar/capa desta propria etapa era **rejeitado pela
  validacao de perfil da etapa anterior** (`PATCH /community/me` retornava
  400). So foi encontrado porque o E2E exercitou upload + perfil juntos, nao
  cada modulo isolado. Corrigido com `if (text.startsWith('/')) return
  text` antes do `new URL()`. Frontend ganhou `resolveMediaUrl()`
  (`apps/web/features/community/map-profile-response.ts`), compartilhado por
  post card, composer e header de perfil, para resolver esse mesmo caminho
  relativo em URL absoluta na hora de exibir.
- **`removeOwnPost` nao desanexava midia**: `updateOwnPost` ja desanexava
  `CommunityMedia` quando um post editado perdia sua imagem, mas
  `removeOwnPost` (excluir o post inteiro) nao fazia o mesmo -- linhas de
  `CommunityMedia` ficavam `ATTACHED` a um post `REMOVED` para sempre.
  Corrigido: exclusao de post agora tambem executa
  `communityMedia.updateMany({ postId: null, status: 'REMOVED' })` na mesma
  transacao.
- **400 vs. 500 confundidos**: antes, qualquer erro dentro de
  `MediaService.upload` (incluindo falha real de disco/permissao) virava
  400 (`BadRequestException`) genericamente. Corrigido para separar por
  origem: falha de validacao do arquivo (formato invalido, dimensao invalida,
  Sharp nao consegue decodificar) continua 400; falha de infraestrutura
  (escrita em disco falha, `mkdir` falha) agora e `InternalServerErrorException`
  (500) -- nao dizer ao usuario "seu arquivo esta invalido" quando o problema
  foi do servidor. Coberto por E2E dedicado (bloqueia o diretorio de destino
  com um arquivo para forcar `ENOTDIR` real, nao simulado).

### Limitacao conhecida, nao corrigida nesta etapa

Upload multi-arquivo parcialmente falho (ex.: 3 de 5 imagens de uma galeria
sobem com sucesso, a 4a falha) deixa as `CommunityMedia` ja enviadas com
`status: 'READY'` e sem post associado -- nao ha endpoint de exclusao de
midia avulsa ainda para o composer fazer rollback dessas linhas. Nao e um
bug de seguranca (o asset pertence ao proprio usuario, nao fica exposto a
terceiros nem conta como post publicado), mas e desperdicio de storage.
Registrado como candidato ao "ciclo de limpeza de midia temporaria/orfa" ja
listado no checklist de beta (MEDIUM).

### Storage local -- avaliacao e blocker de Beta Release

O brief pediu avaliacao concreta, nao migracao automatica. Achado real
(nao teorico): o deploy de producao usado por este projeto e via cPanel
(`scripts/package-cpanel-deploy.mjs`, confirmado como o pipeline real e
atual -- ver nota de descarte do plano VPS+Docker+PostgreSQL desatualizado em
`docs/deployment-architecture.md`). Esse script empacota o build da API/web
para upload manual/automatizado ao cPanel, mas **nao gerencia, preserva nem
faz backup do diretorio `COMMUNITY_MEDIA_DIR`** (`storage/community-media/`
por padrao). Isso significa que um redeploy de rotina para producao tem risco
real de apagar silenciosamente toda midia de usuario ja enviada (avatar,
capa, imagens de post) -- nao e uma preocupacao generica de "disco local e
ruim", e um gap concreto e verificavel no script de deploy que este projeto
realmente usa.

**Recomendacao** (nao implementada nesta etapa -- fora do escopo autorizado):
antes do beta, ou (a) o script de deploy cPanel passa a preservar
explicitamente `storage/community-media/` entre deploys (rsync/skip
overwrite), ou (b) migrar para armazenamento de objeto remoto (R2, S3
compativel, ou equivalente) com URL publica estavel -- decisao de
arquitetura que exige escopo e aprovacao explicitos, per a propria instrucao
do brief desta etapa. **Registrado como blocker de Beta Release** em
`docs/handoff/site-beta-checklist.md` (bloco Deploy/producao).

### E2E (novo: `apps/api/test/community-media.e2e-spec.ts`)

Mesmo padrao de banco descartavel e isolado da Etapa 7 (`disposable-mysql.ts`,
extraido nesta etapa para `apps/api/test/support/` e compartilhado pelos dois
specs), mais um `COMMUNITY_MEDIA_DIR` isolado em `os.tmpdir()` (criado no
`beforeAll`, removido no `afterAll` -- nunca escreve no storage real de
dev/producao). 10 casos, **10/10 PASS**:

1. registra e loga uma conta real;
2. rejeita upload sem autenticacao (401);
3. upload valido -- 201, `kind`/`mimeType`/formato da URL confirmados
   (reencode real para WebP);
4. rejeita tipo de arquivo nao permitido (`.txt`, 400);
5. rejeita arquivo acima de 8 MB (4xx);
6. rejeita arquivo corrompido -- extensao/Content-Type validos, bytes
   invalidos (400);
7. retorna 500 (nao 400) quando o proprio storage falha, e nao cria linha de
   `CommunityMedia` (simulado forcando `ENOTDIR` real no diretorio de
   destino);
8. avatar: upload real -> `PATCH /community/me` -> `GET` do perfil confirma
   a URL relativa persistida (prova o bug do `optionalUrl` corrigido acima);
9. post com midia: upload real -> criar post -> `GET` do perfil confirma o
   post com a midia anexada corretamente;
10. falha de upload nao cria post fantasma: `mediaIds` inexistente rejeitado
    (400), nenhum post criado.

Combinado com `community-profile.e2e-spec.ts` (Etapa 7, 6/6, revalidado
apos o fix do `optionalUrl`): `npm run api:test:e2e` -> **16/16 PASS**.
Nenhum container Docker deixado para tras em nenhuma execucao (`docker ps -a
--filter name=bloodmoon-e2e` vazio ao final).

Fora do escopo: QA visual manual em navegador; testes de outros modulos
Community alem de perfil/midia (feed, comentarios, reacoes, follow/block,
denuncia -- ainda sem E2E).

## Feed e Posts (Etapa 9)

Objetivo da etapa: feed e posts operando exclusivamente sobre API/banco reais,
sem fallback que possa enganar o usuario no beta.

### Fallbacks removidos (right rail)

Unico mock real remanescente ligado a feed/posts (perfil ja foi resolvido na
Etapa 7, midia na Etapa 8): `communityAdsMock`, `communityEventsMock`,
`communityTrendingMock`, `communitySuggestionsMock`, todos em
`stage-one.mock.ts`, consumidos incondicionalmente (sem checar API, sem
estado vazio) por `CommunityRightRail.vue` e, para dois deles, tambem
interpolados no feed mobile de `pages/comunidade/index.vue`. Investigacao
confirmou **zero backend real por tras de qualquer um dos quatro** -- nao
existe model/tabela de anuncio, campanha, evento social, calculo de trending
ou algoritmo de sugestao no schema Prisma. Como o brief instruiu
explicitamente a nao inventar anuncios falsos e a preferir um estado
vazio/indisponivel real quando a funcionalidade subjacente nao existe:

- `stage-one.mock.ts` e o diretorio `features/community/data/` foram
  **deletados** (ficaram 100% orfaos);
- `CommunityAdCard.vue` foi **deletado** (unico consumidor era o mock);
- `CommunityRightRail.vue` foi reescrito para um estado honesto ("Anuncios,
  eventos, topicos em alta e sugestoes de perfil ainda nao estao disponiveis
  ... nada aqui e inventado"), verificado visualmente no navegador (ver
  "QA visual" abaixo);
- `pages/comunidade/index.vue` teve a interpolacao de anuncios mockados no
  feed mobile removida.

Construir anuncios/eventos/trending/sugestoes reais e um dominio novo
(schema, endpoints, admin) -- fora do escopo desta etapa, permanece `MISSING`
na matriz funcional acima, nao `BLOCKER_BETA` fabricado (nao ha mais dado
falso exibido a um usuario real; a area so mostra que ainda nao existe).

`CommunityPostCard.vue`/`CommunityPostComposer.vue` foram auditados e
confirmados **ja reais** desde a Etapa 8 (pipeline de midia real, sem
base64/mock) -- nenhuma mudanca necessaria neles nesta etapa alem do que
segue abaixo.

### Gap real fechado: permalink de post ("abrir post")

Nao havia `GET /community/posts/:id` -- o botao "Copiar link" ja existia e
gerava uma URL (`/comunidade?post=<id>`), mas nada no frontend lia esse
query param e nada no backend servia um post isolado. Um link "copiado" era
um link morto: exatamente o tipo de recurso real-mas-quebrado que engana um
usuario no beta. Fechado nesta etapa:

- **Backend**: `CommunityService.getPost(id, user?)` (`community.service.ts`),
  com as mesmas regras de visibilidade/bloqueio do feed -- reaproveita
  `accessiblePost` para visitante autenticado; visitante anonimo so ve posts
  `PUBLIC` de perfil publico. A logica de include/contexto por post
  (`author`, `comments`, `reactions`, `_count`, `viewer`, `labels`) foi
  extraida de `feed()` para os metodos privados `postInclude()`/
  `postContext()`, reaproveitados por ambos -- sem duplicar o bloco grande de
  `include` do Prisma.
- **Rotas**: `GET /community/posts/:id` (publica) e
  `GET /community/posts/:id/authenticated` (JWT), mesmo padrao ja usado por
  `feed`/`feed/authenticated`.
- **Frontend**: `pages/comunidade/index.vue` agora le `route.query.post`,
  busca o post real via `api.getPost()` e abre um modal (mesmo padrao visual
  do drawer de perfil) reaproveitando `CommunityPostCard.vue` -- editar/
  excluir a partir do modal funciona (fecha o modal e reflete no composer/
  feed real, sem estado duplicado).

### Paginacao do feed

Backend ja usava paginacao real por `page`/`pageSize` (offset, `skip`/`take`
no Prisma) -- **nao cursor**; decisao de manter offset nesta etapa (simples,
já testado, suficiente na escala atual; migrar para cursor por
`createdAt`/`id` fica registrado como melhoria futura caso o feed cresça o
bastante para offset apresentar duplicatas/saltos sob insercao concorrente).
O gap real era a UI: `pages/comunidade/index.vue` sempre buscava a pagina 1
com `pageSize: 30` e nunca expunha controle nenhum. Fechado com um botao
"Carregar mais publicacoes" que busca a proxima pagina e acumula no cliente;
qualquer refresh disparado por uma mutacao (criar/editar/excluir/reagir/
salvar/repostar/comentar) ou troca de aba/secao **sempre volta para uma
pagina 1 fresca** -- decisao deliberada e simples (uma publicacao nova entra
no topo; manter uma "pagina 3" desatualizada apos uma mutacao seria mais
confuso que reiniciar), documentada em comentario no proprio arquivo. Um
botao "Atualizar feed" tambem foi adicionado ao lado das abas, cobrindo o
item "refresh" do brief com uma acao explicita alem do refresh automatico
que ja existia apos toda mutacao.

### Validacao e autorizacao (auditoria, sem mudanca de codigo)

Investigacao confirmou que o backend ja era a autoridade real, nao a UI:

- limite de conteudo (2-10000 caracteres em post, 2-2000 em comentario),
  palavras bloqueadas, dominios bloqueados/permitidos, limite horario e
  cooldown entre posts -- tudo em `validateText()`
  (`community.service.ts`), aplicado tanto na criacao quanto na edicao;
- `updateOwnPost`/`removeOwnPost` verificam `post.authorId !== user.id` e
  retornam 404 (nao apenas ocultam um botao na UI) -- confirmado por E2E
  dedicado com uma segunda conta tentando editar/excluir o post da primeira;
- `postType()` restringe a um allowlist fechado de tipos implementados;
  `ARTICLE` exige titulo;
- renderizacao de conteudo: nenhum componente Community usa `v-html` ou
  `innerHTML` -- confirmado por busca no diretorio inteiro. Todo texto de
  post/comentario passa por interpolacao padrao do Vue (`{{ }}`), que
  escapa HTML automaticamente. Isso vale inclusive para `ARTICLE`, cujo
  editor (`UEditor`, `content-type="markdown"`) grava markdown como texto
  puro -- exibido literalmente, nunca convertido para HTML renderizado (sem
  pipeline de markdown-to-HTML, logo sem superficie de XSS por ai; como
  efeito colateral, artigos aparecem com a sintaxe markdown visivel em vez de
  formatada -- limitacao de UX conhecida, nao de seguranca, registrada aqui
  e nao corrigida nesta etapa por ser fora do escopo de "feed e posts reais");
  media de post passa pelo pipeline real da Etapa 8 (Sharp reencode, sem
  SVG/HTML arbitrario);
- limite de tamanho do textarea no composer (`maxlength="10000"`) ja
  espelhava exatamente o limite do backend -- nenhuma mudanca necessaria.

Nenhum destes pontos exigiu mudanca de codigo -- a auditoria confirmou que a
protecao real ja existia no backend antes desta etapa; o trabalho aqui foi
verificar e documentar, nao implementar.

### E2E (novo: `apps/api/test/community-post.e2e-spec.ts`)

Mesmo padrao de banco descartavel e isolado das etapas anteriores
(`disposable-mysql.ts`). 15 casos, **15/15 PASS**:

registra/loga 2 contas reais; rejeita criacao sem autenticacao (401); rejeita
post sem conteudo e sem midia (400); rejeita conteudo abaixo do minimo e
acima do limite de 10000 caracteres (400 nos dois); rejeita ARTICLE sem
titulo (400); cria um post real e confirma que o feed o exibe; abre o post
pelo novo endpoint de permalink (visualizar); retorna 404 para id
inexistente; **usuario B tentando editar o post de A -- 404, autorizacao do
backend, nao so botao oculto**; usuario B tentando excluir o post de A --
404; edita o proprio post, recarrega de forma independente (nao a resposta
do PATCH) e confirma persistencia real; exclui o proprio post e confirma
remocao tanto no feed quanto no permalink; posts `PRIVATE` ficam ocultos do
permalink para visitante anonimo mas visiveis para o autor e ocultos para
outro usuario autenticado; pagina o feed com `page`/`pageSize` e confirma que
paginas diferentes retornam conjuntos distintos de ids.

Nota tecnica: o cooldown real entre posts (30s por padrao,
`CommunityPolicy.postCooldownSeconds`) e relaxado apenas no banco descartavel
deste teste (via `PrismaService` direto no `beforeAll`) para permitir criar
varios posts em sequencia sem esperar -- os defaults de producao (30s / 10
por hora) nao sao tocados.

Combinado com as suites das etapas anteriores: `npm run api:test:e2e` ->
**31/31 PASS**. Nenhum container Docker deixado para tras.

### QA visual (navegador real)

Servidor de API (porta 3333) e Nuxt dev (porta 3000) ja estavam ativos no
ambiente local -- confirmados via HTTP antes de usar, reaproveitados em vez
de subir uma segunda instancia. Navegado `/comunidade` sem sessao: feed vazio
honesto ("Ainda nao ha publicacoes..."), right rail mostrando o novo estado
"nada aqui e inventado" (nao mais anuncios/eventos fabricados), botao
"Atualizar feed" presente, zero erros no console. Testado tambem em viewport
mobile (375px) -- layout responsivo intacto, right rail ocultado como
esperado, sem erros novos no console.

**Fluxo autenticado (criar/editar/excluir post, abrir permalink, paginar) nao
foi validado clicando no navegador nesta etapa** -- o cadastro de uma conta
de teste exige resolver um captcha na tela `/registrar`, e contornar/
resolver captcha esta expressamente fora do que este agente pode fazer.
Esses fluxos foram validados via os 15 testes E2E HTTP acima (que exercitam
exatamente os mesmos endpoints que os cliques no navegador chamariam, com a
vantagem de provar a autorizacao no nivel do backend, nao apenas o que a UI
permite clicar). Registrado como lacuna de QA visual para uma etapa futura
com uma conta de teste ja provisionada.

## Interacoes Sociais (Etapa 10)

Objetivo: validar ponta a ponta comentarios, reacoes, salvos e reposts sobre
dados reais, incluindo concorrencia (double-click) e contadores. Diferente
das Etapas 8-9, aqui a maior parte do trabalho foi **auditoria que encontrou
bugs reais**, nao construcao de feature nova.

### COMMENTS

Create/edit/delete/ownership ja eram reais (`createComment`/
`updateOwnComment`/`removeOwnComment` em `community.service.ts`, existentes
desde etapas anteriores) -- confirmado por E2E, incluindo 404 real quando a
conta B tenta editar/excluir um comentario da conta A. Paginacao **nao
existia**: o post so embutia os primeiros 5 comentarios de nivel superior
(`postInclude()`, `take: 5`), sem forma de ver o resto. Fechado com
`GET /community/posts/:id/comments` (+`/authenticated`), reaproveitando um
novo `commentInclude()` privado compartilhado com `postInclude()` para nao
duplicar o include grande do Prisma. Frontend: `CommunityPostCard.vue` ganhou
"Carregar mais comentarios", com `normalizeComment` extraido para
`features/community/map-post-response.ts` (compartilhado com
`normalizePost`, antes duplicado em `pages/comunidade/index.vue`).

**Bug real encontrado e corrigido**: `_count.comments` (usado em
`postInclude()` e em `publicProfile()`) contava **todos** os comentarios do
post, incluindo os com `status: 'REMOVED'` (soft delete) -- ou seja, excluir
um comentario nunca diminuia o contador exibido. Corrigido filtrando a
contagem por `status: 'PUBLISHED'` (`_count: { select: { comments: { where:
{ status: 'PUBLISHED' } }, ... } }` -- suportado desde Prisma 4.16, projeto
usa `^5.0.0`). `reactions`/`saves`/`reposts` nao tinham o mesmo problema
porque esses toggles fazem `delete()` real na linha (sem status/soft
delete), confirmado por leitura do schema antes de assumir que o mesmo bug
existiria ali.

### REACTIONS / SAVES / REPOSTS

`toggleReaction`/`toggleSave`/`toggleRepost` (todos pre-existentes) ja tinham
protecao real contra duplicacao no nivel do banco -- `@@unique([accountId,
postId, type])` em `CommunityReaction`, `@@unique([accountId, postId])` em
`CommunityPostSave`/`CommunityRepost` -- confirmado por leitura do
`schema.prisma` antes de qualquer mudanca. Contadores nunca sao calculados
no cliente: sempre vem de `_count` do servidor, refeito apos cada acao via
`runSocial()` no frontend -- confirmado que nenhum componente Community
incrementa/decrementa contador localmente (busca no diretorio inteiro).
Repost corretamente nao cria um post novo (nao ha "quote" nem duplicacao de
conteudo) -- apenas uma linha de junction table referenciando o post
original; `toggleRepost` ja bloqueava repostar o proprio post e postar
conteudo nao-`PUBLIC`.

### Bug real encontrado e corrigido: race de double-click causava 401 falso em QUALQUER endpoint autenticado

Ao escrever o teste de concorrencia (duas requisicoes simultaneas do mesmo
usuario), a segunda requisicao ocasionalmente falhava com **401 "Invalid
bearer token"** -- apesar do token ser genuinamente valido. Investigado
com logging temporario no `JwtAuthGuard` (removido depois): o erro real era
`PrismaClientUnknownRequestError` / MySQL `1020 "Record has changed since
last read in table 'AccountSession'"` -- duas requisicoes concorrentes da
mesma sessao colidindo no `UPDATE AccountSession SET lastSeenAt = NOW()`
que o guard executa em **toda** requisicao autenticada para rastrear
atividade. O `catch` do guard era largo demais: qualquer excecao nao
prevista virava "token invalido", inclusive uma falha transitoria de
escrita numa coluna puramente informativa. **Isso nao e um bug de Community
-- e um bug no `JwtAuthGuard` compartilhado por toda a API**, que qualquer
duplo-clique em qualquer acao autenticada (nao so reacao/save/repost) podia
disparar. Corrigido isolando esse `UPDATE` em seu proprio `try/catch` que
absorve a falha (perder um "last seen" e inofensivo; invalidar uma sessao
valida por isso nao e). `apps/api/src/modules/auth/jwt-auth.guard.ts`.

### CONCORRENCIA

Com os dois bugs acima corrigidos, testado explicitamente via `Promise.all`
disparando duas requisicoes simultaneas para o mesmo toggle (reacao, save,
repost): nenhuma crasha, nenhuma cria uma segunda linha (constraint unique
+ `catch` de `P2002` adicionado nesta etapa em `toggleReaction`/
`toggleSave`/`toggleRepost` -- o "perdedor" da corrida trata a violacao de
unicidade como sucesso idempotente, nao como erro). Uma observacao
documentada, nao um bug: como esses tres endpoints sao **toggles reais**
(nao "set true"), o resultado exato de duas chamadas simultaneas depende de
como elas se intercalam -- ambas podem "ganhar" a criacao (contagem final
1) ou uma pode terminar antes da outra comecar e ser desfeita por ela
(contagem final 0). As duas saidas sao seguras (sem duplicata, sem crash);
so uma contagem >1 ou um erro 500 seriam bugs. Os testes E2E verificam essa
invariante real, nao um numero fixo.

### PERMISSOES

`community-admin.controller.ts` confirmado com autorizacao real de
producao: `@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)` +
`@Roles('ADMIN', 'SUPER_ADMIN')` no controller inteiro, mais
`@RequirePermissions(...)` granular por acao (`adminCommunityPostsModerate`,
`adminCommunityCommentsModerate`, etc.) -- nao um controle superficial.
Usuario comum (A) nunca altera conteudo de outro (B): confirmado por E2E
para post e para comentario (edit/delete cross-account -> 404 nos dois
casos).

### E2E (novo: `apps/api/test/community-social.e2e-spec.ts`)

Mesmo padrao de banco descartavel e isolado das etapas anteriores, com o
mesmo relaxamento de cooldown do `CommunityPolicy` (via `PrismaService`
direto, so no banco descartavel) usado na Etapa 9 para permitir criar varios
comentarios em sequencia para o teste de paginacao. **22 casos, 22/22 PASS**,
seguindo o fluxo minimo pedido pelo brief -- dois usuarios sinteticos (A
autor, B interage), post -> comentario -> reacao -> save -> repost ->
reload -- mais:

- comentario: criar, editar (com reload independente confirmando
  persistencia), 404 ao editar/excluir de outra conta, resposta de segundo
  nivel rejeitada, paginacao (paginas 1 e 2 sem sobreposicao de ids),
  excluir com contador corrigido corretamente decrementando;
- reacao: adicionar, alternar (remover no segundo clique), corrida
  concorrente segura;
- save: salvar, listar (feed `saved` isola por conta -- A nunca ve o que
  so B salvou), remover, corrida concorrente segura;
- repost: bloqueia repostar o proprio post, bloqueia repostar post
  nao-`PUBLIC` mesmo quando visivel ao usuario (FOLLOWERS + B segue A),
  repostar preserva autor/conteudo do original, desfazer, corrida
  concorrente segura;
- fluxo completo: post -> comentario -> reacao -> save -> repost -> reload
  autenticado confirma `_count` e `viewer` (saved/reposted/reactions)
  corretos numa unica leitura fresca, nao nas respostas das mutacoes.

Combinado com as tres suites anteriores: `npm run api:test:e2e` ->
**53/53 PASS**, estavel em execucoes repetidas (rodado duas vezes seguidas
apos as correcoes para confirmar que a race do guard nao voltava a
aparecer). Nenhum container Docker deixado para tras.

Nenhum dado real de jogador foi usado -- as duas contas (`e2esocial_a_*`/
`e2esocial_b_*`) sao sinteticas, criadas e descartadas junto com o banco
descartavel do teste.

## Perfis e Relacionamentos (Etapa 11)

Objetivo: auditar quais relacoes sociais realmente existem (nao inventar
follow/friend alem do que ja existe), validar o que ja funciona, eliminar
mocks/UI morta restantes e validar privacidade real. **Relacoes que
realmente existem no schema**: `CommunityFollow` (seguir, assimetrico -- nao
ha "amizade" mutua), `CommunitySocialRelation` com `type: BLOCK` (bloqueio
mutuo-efetivo) e `type: MUTE` (enum preparado, **sem nenhum endpoint ou UI**
-- confirmado por busca no codigo inteiro, permanece `MISSING`, nao
inventado). Nao existe conceito de "amigo"/"friend" em nenhum lugar do
schema ou da API.

### 3 bugs reais de privacidade encontrados e corrigidos

Auditoria de `publicProfile()` (`community.service.ts`) revelou que a
funcionalidade de privacidade, embora pareca completa na UI (o editor de
perfil ja expunha 6 selects de visibilidade desde a Etapa 6/7), tinha
**metade dela nunca de fato aplicada no backend**:

1. **`profileVisibility: 'FOLLOWERS'` era decorativo.** O unico gate real
   era `isPublic === false` (que so vira `false` quando `profileVisibility
   === 'PRIVATE'` -- ver `updateProfile()`, `isPublic: profileVisibility
   !== 'PRIVATE'`). Ou seja, `FOLLOWERS` e `PUBLIC` eram **indistinguiveis**
   para qualquer visitante -- selecionar "Seguidores" no editor nao
   restringia nada. Corrigido: `publicProfile()` agora recebe o viewer
   (rota autenticada nova, ver abaixo) e checa `CommunityFollow` real
   quando `profileVisibility === 'FOLLOWERS'`.
2. **Dono podia ficar trancado do proprio perfil.** `publicProfile()` nunca
   distinguia "o proprio dono esta vendo" de "outra pessoa esta vendo" --
   se um usuario configurasse o proprio perfil como `PRIVATE` ou
   `FOLLOWERS`, a pagina `/comunidade/[username]` (que sempre chama
   `publicProfile()`, mesmo para o proprio usuario) comecava a retornar 404
   para ele mesmo. Corrigido: `isOwner` sempre ve o proprio perfil por
   inteiro, independente da visibilidade configurada.
3. **Bloqueio nao ocultava a pagina de perfil, so os posts.** `accessiblePost`
   ja excluia autores bloqueados do feed, mas `publicProfile()` nunca
   verificava bloqueio -- uma conta bloqueada podia abrir a pagina de
   perfil diretamente (incluindo os posts publicos embutidos nela) mesmo
   sendo bloqueada. Corrigido: mesma checagem de bloqueio mutuo do
   `accessiblePost`, aplicada tambem ao perfil.

Como `publicProfile()` e uma rota publica (sem guard), identidade do
visitante so existe se ele estiver autenticado -- mesmo padrao ja usado
desde a Etapa 9/10 (feed/posts/comentarios): `GET
/community/profiles/:username` continua publica (so ve `PUBLIC`); `GET
/community/profiles/:username/authenticated` (JWT) resolve
FOLLOWERS/PRIVATE/bloqueio/dono corretamente. Frontend atualizado para
chamar a rota autenticada quando ha sessao
(`useCommunityApi.publicProfile(username, authenticated)`), tanto na pagina
de perfil (`[username].vue`) quanto no card de perfil proprio da home
(`index.vue`, que agora sempre usa `authenticated: true` pois so busca o
proprio usuario).

### Exposicao de dados desnecessarios corrigida

`publicProfile()` usava `communityProfile: true` / `include: { achievement:
true }` / `include: { badge: true }` -- includes cegos que devolviam a
linha inteira do banco. Confirmado por leitura do schema que isso vazava,
**para qualquer visitante de qualquer perfil publico, incluindo anonimo**:

- de `CommunityProfile`: `socialSuspendedUntil`, `postBlockedUntil`,
  `commentBlockedUntil`, `messagesLimitedUntil`, `reachLimitedUntil`,
  `warningCount` -- estado de moderacao interno, nunca deveria ser publico;
- de `CommunityAchievementGrant`/`CommunityBadgeGrant`: `grantedBy`
  (identificador do admin que concedeu) e `reason` (justificativa interna
  de moderacao/concessao);
- de `CommunityAchievement`/`CommunityBadge` (aninhado): `createdBy`,
  `updatedBy`, `condition` (logica interna de desbloqueio da conquista).

Nenhum destes campos e usado pelo frontend (`map-profile-response.ts`
confirmado antes de cortar). Corrigido trocando os `include` cegos por
`select` explicito (`publicAccountSelect()`) limitado exatamente ao que a
UI renderiza -- assim adicionar uma coluna nova a qualquer um desses
models no futuro nao vaza automaticamente, e preciso decidir explicitamente
incluir. `email`/`role`/hash de senha etc. do proprio `Account` **nunca
estiveram no select** (confirmado, nao era um bug -- so os 4 campos citados
precisavam de correcao).

**`guildVisibility: HIDDEN` tambem era decorativo** (mesmo padrao do bug 1
acima, so que para `guildName` em vez do perfil inteiro) -- corrigido:
`guildName` e removido da resposta quando `guildVisibility === 'HIDDEN'` e
o viewer nao e o dono. `characters`/`equipment`/`statistics`/`activity`
Visibility permanecem **intencionalmente nao aplicados** -- nao existe
nenhum dado de personagem/equipamento/estatistica por tras desses campos
neste endpoint ainda (nada a proteger), e "activity" e ambigua o bastante
(posts? ultima atividade?) para nao merecer uma decisao de enforcement
adivinhada. Documentado, nao inventado.

### UI morta removida: aba "Marcações / Collabs"

`CommunityProfileTabs.vue` tinha uma 4a aba ("Marcações / Collabs") que
filtrava `entries` por `kind: 'tagged' | 'collaboration'` -- **nenhum
codigo em todo o repositorio jamais produzia uma entry desses dois tipos**;
o campo `kind` em `map-profile-response.ts` era hardcoded para
`'publication'` em todo post. A aba estruturalmente nunca poderia mostrar
nada, mas exibia o mesmo estado vazio generico de uma aba legitimamente
vazia -- indistinguivel de "voce nao tem nada aqui" vs. "esta funcionalidade
nao existe". Removida (nao existe schema/endpoint para marcacoes ou
colaboracoes -- nao inventado). A aba "Compartilhados" ficou ao lado, agora
corrigida (proximo item).

### Gap real fechado: reposts nunca apareciam no perfil

Diferente de "Marcações/Collabs", **reposts sao uma feature real**
(`CommunityRepost`, `toggleRepost`, ja auditados na Etapa 10) -- so nunca
foram ligados ao perfil. `publicProfile()` agora busca os reposts reais da
conta (limitados a posts ainda `PUBLISHED`/`PUBLIC`, um repost nunca aponta
para o proprio post do usuario -- `toggleRepost` ja bloqueia isso) e
`map-profile-response.ts` produz entries `kind: 'repost'` com o
autor/conteudo do post original preservados (nao fabrica um post novo).

### E2E (novo: `apps/api/test/community-profile-privacy.e2e-spec.ts`)

Mesmo padrao de banco descartavel isolado. Achievement/badge de teste
criados diretamente via `PrismaService` (nao pela API admin -- evita
provisionar uma conta ADMIN so para testar exposicao de campo). **10 casos,
10/10 PASS**:

perfil PUBLIC visivel anonimo e autenticado; ausencia confirmada de
`email`, dos 6 campos de moderacao do `CommunityProfile`, e de
`grantedBy`/`reason`/`condition`/`createdBy` em achievement/badge grants;
rejeita `profileVisibility` invalida (400); FOLLOWERS oculto de anonimo e
nao-seguidor, visivel para seguidor, sempre visivel para o dono mesmo sem
seguir a si mesmo; PRIVATE oculto de todos incluindo seguidor existente,
visivel so ao dono; `guildVisibility: HIDDEN` remove `guildName` para
nao-donos mas preserva para o dono; reposts aparecem no perfil de quem
repostou, referenciando post/autor originais; bloqueio oculta o perfil do
bloqueado mas nao de visitante anonimo (confirma tambem, como efeito
colateral real do `block()` ja existente, que bloquear remove follow em
ambas direcoes); follow/unfollow refletem corretamente no endpoint de
relacionamento.

Combinado com as quatro suites anteriores: `npm run api:test:e2e` ->
**63/63 PASS**, estavel em 2 execucoes seguidas. Nenhum container Docker
deixado para tras.

### QA visual

Anonimo em navegador: `/comunidade/bryan` (conta real do ambiente de dev,
nao um usuario sintetico) retorna o estado honesto de "nao encontrado" sem
erro de console -- confirma que o novo formato de resposta nao quebra o
frontend mesmo para uma conta ja existente antes desta etapa. Fluxo
autenticado (ver o proprio perfil apos login, alternar visibilidade pelo
editor) continua bloqueado por captcha no cadastro, mesma limitacao
registrada nas Etapas 9-10 -- coberto pelos 10 E2E acima em vez de clique
manual.

## Moderacao e Abuse Safety (Etapa 12)

Objetivo: garantir que conteudo real de usuario possa ser moderado.
**Nenhum sistema paralelo foi criado** -- a auditoria encontrou um sistema
de moderacao ja maduro e abrangente (`community-admin.service.ts`,
768 linhas, construido em etapas anteriores nao documentadas
individualmente); o trabalho real desta etapa foi homologar (confirmar via
E2E real), encontrar 3 bugs pequenos e corrigi-los, e documentar o que
existe.

### Inventario real (o que ja existia, confirmado por leitura + E2E)

- **Denuncias**: `CommunityReport` (reporterId, reportedUserId, post/comment,
  reason, description, evidence, priority, status, assigneeId, decision,
  internalNotes, dueAt, resolvedBy/resolvedAt). Fluxo completo: `POST
  /community/reports` (usuario) -> fila (`GET /admin/community/reports`,
  ordenada por prioridade) -> `PATCH /admin/community/reports/:id`
  (moderador decide: ASSIGNED/INVESTIGATING/WAITING_FOR_USER/RESOLVED/
  REJECTED/ESCALATED/REOPENED). Duplicata abusiva **ja bloqueada antes desta
  etapa** (rejeita nova denuncia do mesmo usuario para o mesmo conteudo
  enquanto uma anterior segue aberta); auto-denuncia tambem **ja bloqueada**.
- **Moderacao de conteudo**: `postAction`/`commentAction`/`reactionAction`
  em `community-admin.service.ts` -- HIDE/RESTORE/REMOVE/ARCHIVE para posts
  (mais PIN/UNPIN/FEATURE/UNFEATURE/LIMIT_REACH/RESTORE_REACH/EDIT
  administrativo, que cria uma `CommunityPostRevision` antes de sobrescrever),
  HIDE/RESTORE/REMOVE para comentarios, REMOVE para reacoes. Todas exigem
  justificativa (`reason`, minimo 3-4 caracteres) e sao auditadas.
- **Sancoes de usuario** (`CommunityModerationType`, 10 tipos): `WARNING`
  (incrementa contador), `SOCIAL_SUSPENSION`, `POST_BLOCK`, `COMMENT_BLOCK`,
  `MESSAGE_LIMIT`, `REACH_LIMIT` (todos com `expiresAt`, default 7 dias se
  nao informado), `AVATAR_REMOVAL`/`COVER_REMOVAL`/`BIO_REMOVAL` (moderacao
  de "perfil" no sentido do brief), `USERNAME_CHANGE` (forcado, com historico
  em `CommunityUsernameHistory`). `restoreUser` limpa todas as suspensoes/
  bloqueios temporizados de uma vez e marca as `CommunityModerationAction`
  correspondentes como restauradas (`restoredAt`/`restoredBy`). **Mute como
  sancao de usuario nao existe** (o enum `MUTE` em `CommunitySocialRelation`
  e para bloqueio *entre usuarios*, nao para silenciar via moderacao -- ver
  Etapa 11). Ban permanente tambem nao existe como tipo dedicado -- a
  ferramenta mais proxima e `SOCIAL_SUSPENSION` com `expiresAt` distante ou
  a suspensao de conta no nivel de `Account.status` (fora do escopo
  Community). Nao inventado nesta etapa -- documentado como o que
  realisticamente existe.
- **Auditoria**: `AuditService`/`AuditEvent` (modulo compartilhado,
  `apps/api/src/modules/audit/`) -- actor (id/username/role), action,
  targetType/targetId/targetUserId, before/after data, reason, result,
  ip/userAgent/session/correlationId, timestamp (`createdAt`). **Redacao de
  segredos e dados pessoais ja embutida** (`apps/api/src/common/
  sensitive-data.ts`): `redactSensitiveText` mascara Bearer tokens, JWTs,
  connection strings, query params de token/secret/senha; `toSafeJson` com
  `maskPersonalData: true` mascara email/telefone/documento/IP e redige
  totalmente qualquer chave que pareca senha/token/segredo/credential. Toda
  acao administrativa relevante tambem gera um `AdminWorkLog` (trabalho
  administrativo rastreavel). Confirmado por E2E que nenhuma acao de
  moderacao desta etapa vazou `passwordHash`/`personalIdHash`/token no
  registro de auditoria.

### 3 bugs reais encontrados e corrigidos

1. **Contador de erros do dashboard administrativo undercounted uploads
   maliciosos.** `dashboard()` contava `SystemError` com `module: 'community'`
   (match exato) -- mas `MediaService` registra falhas de upload (arquivo
   corrompido, spoofed, falha de storage) com `module: 'community.media'`.
   Todo upload rejeitado/malicioso ficava **invisivel no widget de erros do
   dashboard**, mesmo com o registro de evidencia (`SystemError`) sendo
   criado corretamente. Corrigido trocando para `module: { startsWith:
   'community' }`. Confirmado por E2E que dispara um upload corrompido real
   e verifica o contador do dashboard antes/depois.
2 e 3. **Mojibake** (`Username invÃ¡lido.`, `jÃ¡ estÃ¡`) em
   `community-admin.service.ts#moderateUser` -- mesmo padrao de bug ja
   corrigido em `community.service.ts` na Etapa 7 (bytes UTF-8 mal
   interpretados), mas essa ocorrencia especifica nunca tinha sido varrida.
   Corrigido para `inválido`/`já está`.

### Upload malicioso -- integracao com a Etapa 8

Confirmado (nao alterado): quando um upload e rejeitado por conteudo
corrompido/spoofed, **os bytes do arquivo nunca sao gravados em disco** --
`MediaService.upload()` so escreve apos toda a validacao passar, entao nao
existe nenhum arquivo malicioso persistido em lugar nenhum para "vazar" ou
precisar de limpeza. A evidencia preservada e proporcional e suficiente
para investigar padrao de abuso sem vigilancia excessiva: quem (`userId`),
quando (`createdAt`), e por que exatamente falhou (`internalMessage` com o
motivo especifico da validacao -- formato invalido, conteudo nao bate com a
extensao, arquivo corrompido, falha de storage), tudo em `SystemError`
(modulo `community.media`), agora corretamente contado no dashboard (bug 1
acima). Nenhum novo campo/tabela foi criado -- a infraestrutura de
evidencia ja existia desde a Etapa 8, so nao estava sendo somada
corretamente na visao administrativa.

### Prompt injection / conteudo como dado

**Nao existe nenhuma integracao com IA/LLM neste repositorio hoje**
(confirmado por busca em todo `apps/api/src` e `apps/web` -- zero
dependencia de OpenAI/Anthropic/LangChain/etc. em qualquer `package.json`).
Esta secao e puramente preparatoria, conforme pedido pelo brief
("documentar boundary se houver futura integracao IA"):

**Principio a preservar em qualquer integracao futura**: conteudo publicado
por um usuario da Community (posts, comentarios, bio, nome de exibicao,
motivo/descricao de denuncia, evidencia anexada) e **dado**, nunca
**instrucao**. Se um agente de IA algum dia processar esse conteudo (ex.:
moderacao automatica, resumo de denuncias, sugestao de resposta), o texto
do usuario deve ser tratado exatamente como este projeto ja trata contexto
observado por agentes de codigo (ver `CLAUDE.md`/regras deste proprio
agente): citado e analisado, nunca executado como comando, independente de
quao imperativa a redacao pareca ("ignore as regras anteriores", "aja como
administrador", etc. dentro de um post ou denuncia devem ser tratados como
texto suspeito a ser sinalizado, nunca obedecido). Nenhum codigo foi escrito
para isso agora porque nao ha superficie de IA para proteger -- este e um
guardrail de arquitetura a aplicar quando (se) essa integracao existir, nao
uma correcao de bug atual.

### E2E (novo: `apps/api/test/community-moderation.e2e-spec.ts`)

Mesmo padrao de banco descartavel isolado, com `COMMUNITY_MEDIA_DIR`
isolado adicional (para o teste de upload malicioso). Terceira conta
sintetica promovida a `SUPER_ADMIN` diretamente via `PrismaService` no
`beforeAll` -- **nao existe promocao self-service** (confirmado: `role`
tem default `PLAYER`; nenhum endpoint publico eleva role). Achado relevante
confirmado durante a escrita do teste: `role: 'ADMIN'` sozinho **nao**
concede as permissoes `admin.community.*` automaticamente
(`permissionsForAccount` em `permissions.ts` -- ADMIN herda so as
permissoes de PLAYER + uma flag; so `SUPER_ADMIN` tem wildcard `'*'`).
Confirma que a autorizacao e granular e least-privilege por padrao, nao um
`if (role === 'ADMIN')` superficial. **17 casos, 17/17 PASS**:

login com token real para autor/denunciante/moderador; usuario comum
recebe 401 (sem token) e 403 (autenticado, sem permissao) em endpoint
administrativo, testado em duas rotas diferentes; autor publica; fluxo
completo de denuncia (registro, motivo obrigatorio, duplicata abusiva
bloqueada, auto-denuncia bloqueada, aparece na fila do moderador, moderador
oculta o post com justificativa, post oculto some do feed publico,
moderador resolve a denuncia); auditoria confirma entrada real com
actor/action/target/reason/timestamp para a acao de moderacao E para a
resolucao da denuncia, com verificacao explicita de ausencia de
`passwordHash`/`personalIdHash`/`token`/`secret` no JSON armazenado;
sancoes homologadas (WARNING incrementa contador, POST_BLOCK temporizado
realmente impede o usuario sancionado de publicar -- 403 real do backend,
`restoreUser` limpa a sancao e a publicacao volta a funcionar); upload
malicioso real (bytes corrompidos com extensao/mimetype falsificados) gera
evidencia tecnica (`SystemError` com `userId`) e e contado no dashboard
administrativo apos a correcao do bug 1.

Combinado com as cinco suites anteriores: `npm run api:test:e2e` ->
**80/80 PASS**, estavel. Nenhum container Docker deixado para tras.

## Administracao da Community (Etapa 13)

Objetivo: dar aos administradores ferramentas minimas para operar a
Community durante o beta. Auditoria do painel real
(`CommunityAdminManager.vue`, 274 linhas antes desta etapa, consumido por
`pages/painel/admin/comunidade.vue`) -- **nenhum mock administrativo
encontrado**: toda aba (dashboard, publicacoes, comentarios, reacoes,
perfis, moderacao, denuncias, conquistas, quests, badges, regras/spam,
tarefas, relatorios) ja chamava endpoints reais de
`useCommunityApi.ts`/`community-admin.service.ts`, todos ja confirmados
reais nas Etapas 7-12. O trabalho real desta etapa foi auditar o
componente inteiro, corrigir 2 problemas concretos, e homologar RBAC de
3 niveis via E2E.

### Bug real encontrado e corrigido: editar catalogo desativava/despublicava silenciosamente

`saveCatalog()` (usado para salvar conquistas, quests e badges tanto ao
criar quanto ao editar) mandava um valor **hardcoded** de `isActive`/`status`
em **toda** chamada de salvar, inclusive ao editar um registro ja existente:

- conquistas: sempre `isActive: false` -- editar a descricao de uma
  conquista ja ativa a desativava sem aviso;
- quests: sempre `status: 'DRAFT'` -- editar uma quest ja publicada a
  devolvia para rascunho, potencialmente interrompendo participantes ativos;
- badges: sempre `isActive: true` -- o inverso, mas o mesmo problema: um
  badge deliberadamente desativado por um admin voltava a ficar ativo ao
  ser editado.

O formulario ja carregava o valor real do registro ao iniciar uma edicao
(`beginCatalogEdit()` faz `Object.assign(catalogForm, row, {...})`, que ja
inclui `isActive`/`status` reais) -- o bug era `saveCatalog()` ignorar esse
valor e sobrescrever com a constante de "novo registro" mesmo quando nao
era um registro novo. Corrigido: a constante so e aplicada quando
`catalogEditingId` e nulo (criacao real); ao editar, o valor atual do
formulario (`catalogForm.isActive`/`catalogForm.status`) e enviado como
esta. Confirmado por E2E direto na API (nao foi possivel renderizar o Vue
no ambiente de teste, mas o contrato exato que o frontend corrigido agora
envia foi validado no backend): criar conquista ativa -> editar mantendo
ativa -> confirma que continua ativa; editar desativando -> confirma que
o campo e genuinamente respeitado nos dois sentidos.

### Estados loading/empty/error adicionados

`loadCurrent()` (a busca de dados de toda aba, distinta das acoes de
escrita que ja tinham feedback via `message`/`failed`) **nao tinha nenhum
tratamento de erro nem indicador de carregamento** -- uma falha de rede ou
um 500 do backend deixava a tela na ultima lista carregada (ou em branco,
na primeira visita), sem nenhum aviso. Corrigido com um `try/catch` real
em `loadCurrent()` (estado `loadError`, reaproveita o banner `message`/
`failed` ja existente) e um indicador `loading` explicito, aplicados nas 5
secoes que renderizam `currentPage`/`dashboard`/`analyticsData`
(dashboard, listagens post/comment/reaction/profile/moderation/report,
catalogo de conquista/quest/badge, tarefas, relatorios). Em erro, a lista
e esvaziada explicitamente (`{data:[], total:0, ...}`) em vez de deixar a
pagina anterior parecendo atual.

### RBAC de 3 niveis homologado (novo: `apps/api/test/community-admin-panel.e2e-spec.ts`)

Achado relevante confirmado ao montar o cenario de teste: para simular um
"moderador" com permissoes **reais e granulares** (nao um admin completo),
foi necessario `role: 'ADMIN'` **mais** conceder explicitamente um subconjunto
de `AccountPermission` (`admin.community.view`/`posts.moderate`/
`comments.moderate`/`reports.moderate`/`users.moderate`) -- confirma de
novo (ja visto na Etapa 12) que `role: 'ADMIN'` sozinho nao concede nada de
Community; a autorizacao real vem das permissoes explicitas, nunca de um
`if (role === 'ADMIN')` binario. **9 casos novos, 89/89 PASS combinado**:

- **player**: 401 sem token, 403 autenticado sem permissao, em duas rotas
  administrativas distintas;
- **moderador** (permissoes escopadas): lista posts com filtro real de
  status + busca por texto + paginacao (confirma zero resultados para uma
  busca sem match, nao um erro nem uma lista fantasma); modera post,
  comentario, denuncia e usuario (todas dentro do escopo concedido);
  **rejeitado com 403** ao tentar criar conquista, editar regras/spam,
  criar tarefa administrativa ou ver relatorios -- fora do escopo
  concedido;
- **admin/super-admin**: cria e edita conquista confirmando a correcao do
  bug de desativacao (ver acima); gerencia regras/spam e ve relatorios --
  exatamente o que o moderador nao podia;
- **auditoria**: acao de moderador em comentario gera `AuditEvent` real
  (actor/action/target/reason), complementando post/denuncia ja cobertos
  na Etapa 12.

Combinado com as seis suites anteriores: `npm run api:test:e2e` ->
**89/89 PASS**, estavel. Nenhum container Docker deixado para tras.

### QA visual

Build do frontend (`npm run web:build`) confirmado limpo -- pega erros de
sintaxe de template (`v-if`/`v-else` mal encadeados, por exemplo) que um
teste de API nao pegaria. Fluxo anonimo em navegador real confirmado sem
regressao (feed publico renderiza normalmente, zero erro novo no console).
**QA visual do painel administrativo em si nao foi feito** -- exige uma
sessao autenticada como ADMIN/SUPER_ADMIN, e o cadastro de conta de teste
continua bloqueado por captcha (mesma limitacao das Etapas 9-12). Toda a
logica corrigida nesta etapa (estados de loading/erro, o fix de
isActive/status) foi validada no nivel do contrato via E2E, nao por clique
manual na UI.

## Validacao E2E completa (Etapa 14)

Objetivo: consolidar a validacao E2E da Community numa jornada real unica,
ponta a ponta, em vez de apenas testes isolados por feature (Etapas 7-13),
e cobrir explicitamente as classes de erro que o beta exige (401/403/404/
validacao/falha de storage/estados vazios). Por instrucao explicita do
brief, esta etapa **nao adicionou nenhuma feature nova** -- so organizacao
de teste e, se necessario, correcao do minimo para os testes passarem.
Nenhuma correcao foi necessaria: nenhum bug funcional novo foi encontrado.

### Suite nova: `apps/api/test/community-e2e-journey.e2e-spec.ts` (22 casos)

Uma unica `describe` conta a jornada de um usuario real, numerada 1-18
igual ao brief, reaproveitando exatamente as mesmas rotas/servicos ja
homologados nas Etapas 7-13 (nenhum sistema paralelo):

1. cadastro/login reais (com 401 previo: rota protegida sem token nenhum);
2. `GET /community/me` logo apos o cadastro -- **estado vazio real**
   confirmado (`bio`/`avatarUrl` nulos, `displayName` = nome de cadastro),
   e feed de salvos vazio antes de qualquer save;
3. `PATCH /community/me` -- edicao persistida em releitura independente;
4. upload real de midia (pipeline real, mesma usada por posts) + associacao
   como avatar via `PATCH /community/me`;
5. criar post -- validacao (400, conteudo vazio) antes do post real;
6. feed publico mostra o post criado;
7. permalink real (`GET /community/posts/:id`) -- comentarios comecam
   vazios (**estado vazio real**, nao um array inventado);
8. comentario criado e refletido na releitura do post;
9. reacao (toggle) e contador refletido;
10. save e post aparece na listagem de salvos (`feed=saved`);
11. registra um segundo usuario real (B) e reposta o conteudo dele --
    confirma que repostar o proprio post continua rejeitado (400);
12. visualizacao publica real do perfil de B (sem vazamento de `email`,
    mesma garantia da Etapa 11);
13. **tentativa de edicao indevida**: A tenta editar/excluir o post de B
    -- rejeitado com 404 (design de ownership-scoped lookup, nao expoe
    "existe mas nao e seu" -- mesmo comportamento confirmado nas Etapas
    9/10); A tambem tenta forcar via rota administrativa sem permissao --
    rejeitado com **403** genuino (RolesGuard);
14. denuncia real do post de B por A, com motivo;
15. moderacao: um moderador com `AccountPermission` granular real (nao
    `role: 'ADMIN'` sozinho -- mesmo achado reafirmado das Etapas 12/13) ve
    a fila, oculta o post denunciado, resolve a denuncia; post some do
    feed publico;
16. administracao: super admin gerencia a policy da Community
    (`PATCH /admin/community/policy`); o moderador da etapa anterior
    continua **fora desse escopo** (403) -- reforca a distincao
    moderacao-vs-administracao ja homologada na Etapa 13;
17. logout/login: sessao real encerrada (`POST /auth/logout`) invalida o
    token antigo imediatamente (401 na proxima chamada -- mesmo mecanismo
    de `sessionVersion` da Etapa 10); novo login gera um token valido;
18. persistencia apos nova sessao: perfil editado, avatar, post, comentario,
    reacao e item salvo continuam intactos com o novo token -- prova real
    de que nada depende de estado em memoria da sessao anterior.

Mais 4 casos dedicados de erro/limite intercalados na jornada:
validacao de cadastro invalido (username curto), validacao de
`profileVisibility` invalido, `GET` de post inexistente (404), e uma
**falha real de storage** (nao mock) reaproveitando o mecanismo ja
estabelecido pelo `community-media.e2e-spec.ts` -- aponta
`COMMUNITY_MEDIA_DIR` para dentro de um arquivo (nao diretorio),
provocando um `ENOTDIR` genuino de filesystem, e confirma 500 real (nao
400) sem deixar registro orfao.

### "API indisponivel": documentado como nao aplicavel, nao inventado

O brief pede cobertura de "API unavailable quando simulavel". Levantamento
em toda a suite `apps/api/test/` (nao so Community) nao encontrou nenhum
padrao existente para simular uma dependencia sincrona fora do ar -- e por
um motivo real: a Community so depende de banco (Prisma) e filesystem
local, nenhuma chamada sincrona a um servico externo durante uma
requisicao. O unico paralelo (GameBridge, usado por marketplace) e uma
fila assincrona processada por um worker separado, sem momento de
"dependencia caiu" dentro de uma requisicao para simular. Forcar essa
cobertura exigiria inventar infraestrutura nova (matar o container MySQL
descartavel no meio de um teste, por exemplo) que nao existe em nenhum
outro spec desta suite -- o brief pede explicitamente para nao adicionar
nada alem do necessario para os testes passarem, entao esta lacuna fica
documentada como **nao aplicavel**, nao preenchida artificialmente.

### Quality gate completo (Etapa 14)

- `npm run lint`: 53 problemas (1 erro, 52 warnings), **identicos aos da
  Etapa 13** -- nenhum novo. O 1 erro (`no-useless-assignment` em
  `admin-tasks.service.ts:363`) e pre-existente, fora do modulo Community,
  ja sinalizado como task separada.
- `npm run format:check`: 256 arquivos com divergencia de formatacao --
  confirmado pre-existente (checado o commit anterior a Etapa 13, o mesmo
  estado ja existia), espalhado pelo repositorio inteiro (paginas, scripts,
  docs, docker-compose), nao introduzido por nenhuma etapa da Community.
  Reformatar em massa esta fora do escopo desta etapa (mudaria centenas de
  arquivos sem relacao com Community, contra a instrucao explicita de nao
  adicionar nada alem do necessario).
- `npm run api:check` (estrutura + `tsc --noEmit`): limpo.
- `npm run web:build`: build completo, sem erro, `Nitro output checked: 61
  file(s) patched`.
- `npm run api:test:e2e` (8 suites, incluindo a nova): **111/111 PASS**
  (89 das Etapas 7-13 + 22 da jornada nova desta etapa).

### Relatorio PASS/FAIL/BLOCKER

**PASS** -- toda a jornada Community (18 passos), 401/403/404/validacao/
estado-vazio/falha-de-storage cobertos, `api:check` limpo, `web:build`
limpo, 111/111 E2E.

**FAIL (pre-existente, fora do escopo Community, nao bloqueante)** -- 1
erro de lint em `admin-tasks.service.ts` (modulo nao-Community); 256
arquivos com formatacao divergente em todo o repositorio (nenhum deles
tocado por nenhuma etapa da Community).

**BLOCKER** -- nenhum encontrado na Community.

**Status da Community: `BETA_READY`.**

## UX e responsividade (Etapa 15)

Objetivo: revisar visual e funcionalmente feed/post/perfil/comentarios/
midia/modais/forms/admin-moderacao em desktop/tablet/mobile, e os estados
loading/skeleton/empty/error/toast/confirmation/disabled/focus/keyboard/
overflow/texto-longo/username-longo/imagem-quebrada/rede-lenta. Sem
redesenho de identidade visual, sem micro-otimizacao prematura -- so
correcoes reais e concretas do que a auditoria encontrou.

### Bug real encontrado e corrigido: botao "Seguir" do hover card era decorativo

`CommunityProfileHoverCard.vue` (usado em todo lugar que renderiza um nome
de usuario -- posts, comentarios) tinha um botao "Seguir"/"Seguindo" que
**nunca chamava a API real** -- era um `ref` local alternado no clique
(`following.value = !following.value`), sem `api.followProfile`/
`unfollowProfile`. Um usuario clicando "Seguir" no hover card via o rotulo
mudar e acreditava ter seguido o perfil, mas nada era persistido no
backend -- distinto de `CommunityProfileHeader.vue`, cujo follow/unfollow
ja era real (homologado na Etapa 11). Corrigido: o hover card agora busca o
estado real de relacionamento (`api.profileRelationship`, carregado sob
demanda so quando o popover realmente abre -- evita N+1 num feed com
dezenas de cards) e chama `followProfile`/`unfollowProfile` de verdade, com
erro tratado e reportado via toast, mesma disciplina do header.

### Gaps de UX corrigidos (por categoria do brief)

- **Disabled/double-submit**: botao de comentar (`CommunityPostCard.vue`)
  nao tinha nenhum estado ocupado -- um clique duplo/duplo-Enter podia
  disparar dois comentarios antes do primeiro resolver; corrigido com um
  guard local. Reacao/save/repost no rodape do post idem -- adicionado um
  guard de curta duracao (limpo quando o post e recarregado apos a mutacao,
  ou por um timeout de seguranca se a mutacao falhar). No painel
  administrativo, **nenhum dos ~30 botoes de acao tinha estado de
  loading/disabled** -- qualquer moderacao/edicao de catalogo podia ser
  disparada duas vezes por um clique rapido; corrigido com uma flag `busy`
  unica no painel (via `provide`/`inject`, sem precisar editar cada um dos
  30 pontos de uso) que desabilita toda acao enquanto uma mutacao esta em
  andamento.
- **Toast/feedback**: `toggleFollow` do header (`CommunityProfileHeader.vue`)
  nao tinha `catch` nem toast de erro -- uma falha de rede virava uma
  rejeicao nao tratada, silenciosa. Corrigido com o mesmo padrao ja usado
  pelo bloqueio/desbloqueio no mesmo arquivo.
- **Erro silencioso**: "carregar mais comentarios" (`CommunityPostCard.vue`)
  tinha `finally` mas nenhum `catch` -- uma falha de rede virava uma
  rejeicao nao tratada e nenhuma mensagem visivel. Corrigido com mensagem
  de erro real.
- **Estado vazio faltando**: a aba "Midia" do perfil (`CommunityProfileTabs.vue`)
  era a unica das 3 abas sem mensagem de vazio -- um perfil sem midia
  renderizava uma grade silenciosamente vazia. Corrigida para o mesmo
  padrao das outras abas.
- **Estado enganoso durante loading**: o card de perfil proprio (rail
  esquerdo/drawer mobile, `pages/comunidade/index.vue`) mostrava o convite
  "Entre na sua conta" durante a breve janela em que o resumo do perfil
  ainda estava carregando -- mesmo para um usuario ja autenticado. Corrigido
  trocando a condicao de `v-else` para `v-else-if="!accessToken"`.
- **Foco/teclado**: os 3 dialogos customizados via `Teleport` (editor de
  perfil, drawer "Meu espaco", modal de visualizar post) nao tinham
  nenhum tratamento de teclado -- `aria-modal="true"` sem suporte a Escape
  e um gap real de acessibilidade/UX para quem nao usa mouse. Corrigido com
  `Escape` fechando cada um (respeitando os mesmos guards de "nao fechar
  durante salvamento/upload" que os botoes de fechar ja tinham).
- **Overflow/username longo**: nenhum lugar que renderiza um username tinha
  `text-overflow`/`truncate` -- cabecalho de perfil, rail lateral, hover
  card, byline do post (`@username · data`), e algumas colunas do painel
  admin. Corrigido em todos com `overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap` (ou a classe `truncate` do Tailwind no painel admin,
  com `min-w-0`/`shrink-0` ajustados onde necessario para o truncamento
  funcionar dentro de flex).
- **Imagem quebrada**: nenhum `<img>` de avatar/midia da Community tinha
  `@error`/fallback -- uma URL nao-vazia mas morta (404) caia no icone
  padrao quebrado do navegador. Corrigido com um handler `@error` que troca
  para `/favicon.png` (mesmo fallback ja usado para avatar vazio em varios
  lugares) em post cards, comentarios/respostas, rail lateral, hover card,
  previas do editor de perfil e grade de midia do perfil; no cabecalho de
  perfil, especificamente, o fallback e o placeholder de iniciais que ja
  existia para "sem avatar" (mais consistente visualmente que o favicon
  num circulo de 150px).
- **Mobile no painel admin**: as grades fixas de botoes de acao
  (`grid-cols-3`) nao tinham variante responsiva -- 3 colunas fixas em tela
  estreita ficavam com alvos de toque pequenos. Corrigido para
  `grid-cols-2 sm:grid-cols-3`.

### O que foi revisado e deliberadamente NAO alterado

- **Confirmacao nativa (`window.confirm`/`window.prompt`)**: usada em toda
  parte para exclusao/moderacao/justificativa. Substituir por um dialogo
  estilizado proprio tocaria dezenas de pontos de chamada e e, na pratica,
  um redesenho da interacao -- fora do que o brief autoriza ("nao
  redesenhar identidade visual inteira"). Documentado como gap conhecido,
  nao corrigido.
- **Lazy-loading de imagens / `<NuxtImg>`**: nenhum `<img>` da Community usa
  `loading="lazy"` hoje. Sem medicao real de impacto (LCP/CLS) que
  justifique a mudanca agora, isso e micro-otimizacao prematura por
  definicao do proprio brief -- fica registrado como candidato futuro, nao
  como bug.
- **Paginacao/queries**: confirmado que o feed e as listas administrativas
  continuam no padrao paginado (`load more`/paginacao real) das Etapas 9/13,
  sem regressao para renderizacao nao-paginada. Nenhum N+1 novo encontrado
  alem do que ja foi corrigido acima (hover card).
- **Consistencia de framework CSS** (Tailwind no painel admin vs. CSS
  customico com variaveis `--bm-*` no resto da Community): decisao de
  arquitetura pre-existente, fora do escopo de uma etapa de polish.

### QA (Etapa 15 -- primeira vez com navegador real nesta sessao)

Diferente das etapas anteriores (sempre bloqueadas por captcha no cadastro
para qualquer fluxo autenticado), esta etapa conseguiu efetivamente abrir
`npm run --workspace apps/web dev` num navegador real e navegar
`/comunidade` anonimamente em desktop (1280x800) e mobile (375x812): zero
erro de console em ambos, feed renderizando o estado vazio real (nao um
erro, nao um mock), subheader/drawer mobile funcionando. Fluxo autenticado
(perfil proprio, hover cards, painel admin) continua nao verificavel
visualmente pela mesma razao das etapas anteriores -- compensado por
`npm run web:build` limpo (pega erro de sintaxe de template em qualquer um
dos 9 arquivos tocados) e pela logica corrigida ser simples o suficiente
para revisar com confianca por leitura de codigo (guards de estado local,
handlers de evento, CSS de truncamento).

## Gate de release para beta (Etapa 16)

Objetivo: auditoria final -- **nao construcao**. Revalidar o checklist
completo pedido pelo brief, classificar qualquer problema
BLOCKER/HIGH/MEDIUM/LOW, e emitir um resultado formal unico:
`COMMUNITY_BETA_READY` ou `COMMUNITY_BETA_BLOCKED`. Nenhuma correcao de
codigo foi feita nesta etapa -- so revalidacao do que as Etapas 5-15 ja
entregaram, mais uma nova rodada limpa do quality gate completo.

### Checklist revalidado

| Item | Status | Evidencia |
|---|---|---|
| Migrations homologadas | ✅ | Etapa 6: 3/3 `APPROVED_FOR_PRODUCTION` em clone descartavel, rollback documentado. Ainda **nao aplicadas em ambiente real** -- isso e um gate de deploy separado (backup + janela + aprovacao do operador), nao um problema de codigo da Community, ja rastreado em `site-beta-checklist.md` > Deploy/producao. |
| Autenticacao | ✅ | JWT access+refresh, sessao unica por conta, senha com bcrypt, logout real invalida token na hora (`sessionVersion`). Race de concorrencia que causava 401 falso corrigida na Etapa 10 (bug app-wide, nao so Community). |
| Autorizacao | ✅ | RBAC granular via `AccountPermission`; confirmado repetidamente (Etapas 12/13/14) que `role: 'ADMIN'` sozinho nao concede nada -- overrides explicitos e reais autorizam cada acao administrativa. |
| Perfil real | ✅ | Etapa 7 (zero mock) + Etapa 11 (tiers de privacidade PUBLIC/FOLLOWERS/PRIVATE realmente aplicados, dono nunca trancado do proprio perfil). |
| Uploads reais | ✅ | Etapa 8: pipeline real (validacao de bytes, re-encode via `sharp`, rate limit 10/60s). Storage e local em disco -- ver risco HIGH abaixo. |
| Posts reais | ✅ | Etapa 9: CRUD real, validacao de conteudo, revisao em edicao admin. |
| Feed real | ✅ | Etapa 9: paginacao real (`load more`), sem fallback mock. |
| Comentarios | ✅ | Etapa 10: ownership real (404 entre contas), paginacao alem dos 5 embutidos. |
| Reacoes | ✅ | Etapa 10: toggle race-safe (concorrencia auditada por E2E). |
| Saves | ✅ | Etapa 10: isolado por conta, race-safe. |
| Reposts | ✅ | Etapa 10: bloqueios reais (proprio post, post nao-publico), race-safe. |
| Moderacao | ✅ | Etapa 12: acoes reais com efeito confirmado (post oculto some do feed publico), auditoria real. |
| Denuncias | ✅ | Etapa 12: fluxo completo, auto-denuncia e duplicata bloqueados. |
| Administracao | ✅ | Etapa 13: painel homologado ponta a ponta, 2 bugs reais corrigidos (unpublish silencioso, estados loading/erro). |
| Sem mocks mascarando falhas | ✅ | `grep` de `mock/Mock/MOCK` em todo `apps/api/src/modules/{community,media,admin-tasks}` e `apps/web/{components/community,pages/comunidade}`: zero ocorrencia real (so comentarios explicando a ausencia de mock). Placeholders honestos (Explorar/Guilds/Eventos/Quests/Conquistas, right rail) nunca fingem ter dados. |
| E2E | ✅ | **111/111 PASS**, 8 suites, confirmado em execucao isolada nesta etapa (uma rodada anterior no mesmo dia teve 22 falhas por contencao de recursos -- rodei `web:build` concorrente com a suite completa por engano; re-executada sozinha, 111/111 estavel). |
| Mobile | ✅ | Etapa 15: CSS responsivo real confirmado em todos os componentes + QA com navegador real (primeira desta sessao) em desktop/mobile, zero erro de console. Gap de reflow mobile no painel admin corrigido na mesma etapa. |
| Lint | ✅ | 53 problemas no repositorio inteiro (1 erro, 52 warnings) -- **zero na Community**. O 1 erro e pre-existente em `admin-tasks.service.ts` (modulo nao-Community), ja sinalizado como task separada na Etapa 13. |
| Prettier | ✅ | 256 arquivos com formatacao divergente no repositorio inteiro -- confirmado pre-existente para todo arquivo Community tocado nas Etapas 13-15 (comparado via `git stash` contra o estado antes de cada etapa). Nenhum novo introduzido. |
| API check | ✅ | `npm run api:check` (estrutura + `tsc --noEmit`) limpo. |
| Web build | ✅ | `npm run web:build` limpo, confirmado de novo nesta etapa. |
| Seguranca minima | ✅ | Trilha de auditoria real com redacao de secrets (`AuditEvent`); lookups escopados por dono retornam 404 (nunca revelam "existe mas nao e seu"); nenhum campo interno/PII vaza no perfil publico (Etapa 11, reverificado); rate limit em upload; sessao com `sessionVersion` (Etapa 10); zero uso de `v-html` em qualquer componente Community (sem vetor de XSS via conteudo de post/comentario); auto-denuncia e denuncia duplicada bloqueadas no backend. |
| Documentacao | ✅ | `community-current-state.md` (este arquivo) e `site-beta-checklist.md` atualizados em toda etapa desde a 5. |

### Classificacao de problemas conhecidos

**BLOCKER: nenhum encontrado no codigo/funcionalidade da Community.**

**HIGH** (nao bloqueiam o codigo da Community, mas sao os riscos reais de
maior impacto para o lancamento):
1. Storage de midia e local em disco e o pipeline de deploy de producao
   (`scripts/package-cpanel-deploy.mjs`) nao preserva `COMMUNITY_MEDIA_DIR`
   entre deploys -- um redeploy de rotina pode apagar avatares/midia de
   post de usuarios reais em silencio. Ja rastreado como BLOCKER em
   `site-beta-checklist.md` > Deploy/producao (nao Community) -- migrar
   storage exige escopo e aprovacao explicitos, fora do "so o minimo
   necessario" desta etapa.
2. QA visual autenticado (perfil proprio, hover cards, painel admin) nunca
   foi feito por navegador real em nenhuma etapa -- bloqueado por captcha
   no cadastro (`/registrar`), limitacao constante desde a Etapa 9.
   Compensado por 111 casos de E2E de contrato + revisao de codigo, mas e
   um gap de verificacao residual, nao um defeito conhecido.

**MEDIUM**:
1. Sem sancao dedicada de "mute" ou "ban" permanente -- `SOCIAL_SUSPENSION`
   com `expiresAt` distante e o mais proximo (mapeado na Etapa 12, nao
   construido).
2. Sem remocao administrativa de uma imagem isolada numa galeria -- so
   ocultar/remover o post inteiro (Etapa 12).
3. Sem job de limpeza para midia temporaria orfa de upload multi-arquivo
   parcialmente falho (Etapa 8).
4. Confirmacao usa `window.confirm`/`window.prompt` nativos em toda parte
   em vez de um dialogo estilizado -- revisado e deliberadamente nao
   trocado na Etapa 15 (seria um redesenho de interacao, nao um "polish").
5. Dominio real de anuncios/eventos/trending/sugestoes de perfil ausente
   na right rail -- estado honesto de indisponivel, nao mock (Etapa 9).
6. Secoes de navegacao Explorar/Guilds/Eventos/Quests/Conquistas/Busca
   social continuam placeholder -- nunca construidas, nunca mascaradas.
7. 1 erro de lint pre-existente fora da Community (`admin-tasks.service.ts`).
8. 256 arquivos com formatacao divergente pre-existente em todo o
   repositorio -- reformatar em massa fica fora de escopo.
9. Paginacao do feed continua por offset, nao cursor -- decisao aceita na
   Etapa 9, baixo risco na escala atual.

**LOW**:
1. Sem lazy-loading de imagem (`loading="lazy"`/`NuxtImg`) -- sem medicao
   de LCP/CLS que justifique a mudanca agora (Etapa 15).
2. Painel admin usa Tailwind enquanto o resto da Community usa CSS
   customizado com variaveis `--bm-*` -- decisao de arquitetura
   pre-existente, so cosmetica.
3. Possiveis outras ocorrencias de mojibake alem da corrigida na Etapa 12
   -- nenhuma varredura completa do repositorio foi feita.

### Resultado final

**`COMMUNITY_BETA_READY`.**

Nenhum BLOCKER conhecido no codigo/funcionalidade da Community. Os dois
itens HIGH sao riscos reais que merecem atencao antes/durante o
lancamento -- especialmente o item 1 (persistencia de midia no deploy),
que e uma acao de infraestrutura, nao de codigo da Community, e portanto
nao impede este gate especificamente. Decisao formal de readiness
registrada no AI Knowledge Hub.

## Catalogo de mocks/fallbacks (Etapa 5)

Auditoria de 2026-08-08 (Etapa C1) ja apontava mocks em prosa (itens 3-4 de
"Bugs/riscos conhecidos" abaixo). Esta tabela e o inventario exato -- toda
constante exportada de `stage-one.mock.ts`/`stage-two.mock.ts` e onde cada uma
e efetivamente renderizada -- classificado por severidade para o beta.
Nenhum mock foi removido nesta etapa (fora de escopo -- ver Etapa 5, brief).

| Item | Definido em | Consumido em | Classificacao | Motivo |
|---|---|---|---|---|
| `communityProfileMock` | `stage-one.mock.ts` | `pages/comunidade/index.vue` (identidade no rail esquerdo, mesclado com `user.value` real); base de `communitySocialProfileMock` | `BLOCKER_BETA` | Checklist HIGH: "Substituir profile/user rail mock por dados reais ou estado vazio honesto" |
| ~~`communityAdsMock`~~ | ~~`stage-one.mock.ts`~~ | ~~`CommunityRightRail.vue` (2 anuncios desktop); `pages/comunidade/index.vue` (anuncio mobile)~~ | **`RESOLVED` (Etapa 9)** | `stage-one.mock.ts` e `CommunityAdCard.vue` deletados. Right rail mostra estado honesto de indisponivel -- ver "Feed e Posts (Etapa 9)". Anuncios reais continuam `MISSING` (sem schema/endpoint), nao mais fabricados. |
| ~~`communityEventsMock`~~ | ~~`stage-one.mock.ts`~~ | ~~`CommunityRightRail.vue` (bloco de eventos)~~ | **`RESOLVED` (Etapa 9)** | Mesmo fix acima. |
| ~~`communityTrendingMock`~~ | ~~`stage-one.mock.ts`~~ | ~~`CommunityRightRail.vue` (topicos em alta)~~ | **`RESOLVED` (Etapa 9)** | Mesmo fix acima. |
| ~~`communitySuggestionsMock`~~ | ~~`stage-one.mock.ts`~~ | ~~`CommunityRightRail.vue` (sugestoes de seguir)~~ | **`RESOLVED` (Etapa 9)** | Mesmo fix acima. |
| ~~`communityPostsMock`~~ | ~~`stage-one.mock.ts`~~ | ~~Alimentava `communitySocialProfileMock`~~ | **`RESOLVED` (Etapa 7)** | Removido -- `stage-two.mock.ts` foi deletado (ficou 100% orfao). `entries`/`media` do perfil agora vem somente de `communityPosts` reais. |
| ~~`communitySocialProfileMock` / `profileForUsername()`~~ | ~~`stage-two.mock.ts`~~ | ~~`pages/comunidade/[username].vue`~~ | **`RESOLVED` (Etapa 7)** | O fallback silencioso foi removido. `pages/comunidade/[username].vue` agora usa `useAsyncData` + `GET /community/profiles/:username` puro, com estados `loading`/`error`/`not-found`/`success` explicitos -- ver "Perfil (Etapa 7)" abaixo. |
| `usernamePolicy` | `~~stage-two.mock.ts~~` → `features/community/username-policy.ts` (Etapa 7) | `CommunityProfileEditor.vue` | `DEV_ONLY` → movido | Nunca foi dado fabricado. Realocado para fora do diretorio de mocks nesta etapa, encerrando a classificacao `DEV_ONLY` (o "so misclassificado de arquivo" que a motivava deixou de existir). |
| `CommunityPlaceholderView` (Explorar, Perfil por query, Guilds, Eventos, Quests, Conquistas) | `components/community/CommunityPlaceholderView.vue` | `pages/comunidade/index.vue` (roteamento por `section` query) | `TEMPORARY_SAFE` | Sem alteracao nesta etapa -- fora de escopo (perfil, nao navegacao de secoes). Estado "ainda nao implementado" honesto, nao fabrica conteudo. |

Resumo original (Etapa 5): 6 `BLOCKER_BETA`, 1 `DEV_ONLY`, 1 `TEMPORARY_SAFE`. **Atualizacao Etapa 7**: os 2 itens `BLOCKER_BETA` da cadeia de *perfil* (`communityPostsMock` via `stage-two.mock.ts`, `communitySocialProfileMock`/`profileForUsername()`) foram **resolvidos** -- `stage-two.mock.ts` foi deletado do repositorio. `communityProfileMock` em si (registro do rail esquerdo) tambem foi removido na Etapa 7 -- `pages/comunidade/index.vue` busca o proprio perfil via API real quando ha sessao, convite de login honesto quando nao ha. **Atualizacao Etapa 9**: os 4 itens `BLOCKER_BETA` restantes (`communityAdsMock`, `communityEventsMock`, `communityTrendingMock`, `communitySuggestionsMock`) foram **resolvidos** -- `stage-one.mock.ts` e `features/community/data/` deletados por inteiro do repositorio, `CommunityAdCard.vue` deletado. **Nenhum mock relacionado a feed/posts/right-rail permanece no codigo.** Anuncios/eventos/trending/sugestoes reais continuam `MISSING` na matriz funcional (dominio nao construido), mas isso agora e um estado vazio honesto, nao mais dado fabricado.

## Bugs/riscos conhecidos

1. Worktree Community esta sujo e nao commitado; nao perder nem misturar com correcoes. **(Etapa 5: commitado, preservado -- ver commit 2302263.)**
2. Schema e services esperam tres migrations locais ainda nao homologadas. **(Etapa 6: homologadas em ambiente descartavel, APPROVED_FOR_PRODUCTION; ainda nao aplicadas em nenhum ambiente real.)**
3. ~~Perfil pode parecer funcional quando API falha porque cai silenciosamente no mock.~~ **(RESOLVIDO na Etapa 7: fallback removido, estados loading/erro/nao-encontrado explicitos.)**
4. ~~Home usa `communityProfileMock` para usuario/rail~~ **(RESOLVIDO na Etapa 7: rail proprio agora busca dado real; convite de login quando sem sessao.)** ~~`communityAdsMock` continua em uso~~ **(RESOLVIDO na Etapa 9: right rail inteiro sem mock, estado honesto de indisponivel.)**
5. Secoes secundarias (Explorar/Guilds/Eventos/Quests/Conquistas) ainda sao placeholders honestos. (Inalterado -- fora do escopo desta linha de etapas de feed/posts/perfil/midia.)
6. ~~Erros de feed sao genericos; nao ha retry explicito.~~ **(PARCIALMENTE RESOLVIDO na Etapa 9: botao "Atualizar feed" explicito adicionado; a mensagem de erro em si continua generica, sem botao "Tentar novamente" dedicado como o perfil tem -- ver `feedError` em `pages/comunidade/index.vue`.)**
7. Nao ha notificacao persistida para follow, mention, comment ou achievement. (Inalterado.)
8. ~~Sem testes unitarios/E2E~~ **(Etapa 7: primeiro E2E do repositorio -- `apps/api/test/community-profile.e2e-spec.ts`, Jest+Supertest, cobre o fluxo de perfil. Demais modulos ainda sem cobertura.)**
9. Nao houve QA visual em browser com API e banco nesta auditoria. (Inalterado -- ver "Perfil (Etapa 7)" abaixo para o que foi validado via API/E2E em vez de QA visual manual.)
10. Algumas strings apareceram com mojibake no terminal PowerShell; confirmar encoding
    visual em browser antes de alterar arquivos. **(Etapa 7: as 3 ocorrencias reais em `community.service.ts` -- `follow`/`unfollow` -- foram corrigidas. Nao foi feita uma varredura completa do repositorio; outras ocorrencias podem existir fora do escopo tocado nesta etapa.)**
11. ~~`optionalUrl` (perfil, Etapa 7) rejeitava a URL relativa que o upload real (Etapa 8) sempre devolve.~~ **(RESOLVIDO na Etapa 8: aceita caminho relativo iniciado por `/`, alem de `http(s)://` absoluto. So foi encontrado por E2E cruzando upload real + perfil real.)**
12. ~~`removeOwnPost` nao desanexava `CommunityMedia` ao excluir um post.~~ **(RESOLVIDO na Etapa 8: mesma logica de desanexar que `updateOwnPost` ja tinha, agora tambem na exclusao.)**
13. Upload multi-arquivo parcialmente falho deixa `CommunityMedia` orfa (sem post, sem endpoint de exclusao avulsa ainda). **(Identificado na Etapa 8 -- nao e falha de seguranca, e desperdicio de storage. Ver "Midia (Etapa 8)" acima.)**
14. Storage de midia Community e filesystem local e o script de deploy cPanel real (`scripts/package-cpanel-deploy.mjs`) nao preserva esse diretorio entre deploys. **(Identificado na Etapa 8 -- blocker de Beta Release, ver "Midia (Etapa 8)" acima e `site-beta-checklist.md`.)**
15. ~~"Copiar link" de post gerava uma URL que nada no frontend/backend sabia abrir (query param nunca lido, sem endpoint de post isolado).~~ **(RESOLVIDO na Etapa 9: `GET /community/posts/:id` real + modal de permalink no frontend. Ver "Feed e Posts (Etapa 9)" acima.)**
16. Paginacao real do feed nao migrou de offset para cursor -- aceitavel na escala atual, mas offset (`skip`/`take`) pode produzir saltos/duplicatas sob insercao concorrente de posts enquanto alguem faz "carregar mais". (Identificado na Etapa 9 -- nao corrigido, registrado como melhoria futura caso o volume justifique.)
17. QA visual autenticado (criar/editar/excluir post, abrir permalink pelo navegador) nao foi feito nesta etapa -- cadastro de conta de teste exige resolver captcha em `/registrar`, fora do que este agente pode fazer. (Identificado na Etapa 9 -- fluxos autenticados validados via E2E HTTP real em vez de clique manual; ver "QA visual" em "Feed e Posts (Etapa 9)" acima. Mesma limitacao confirmada na Etapa 10.)
18. ~~`_count.comments` (post e perfil publico) contava comentarios com `status: REMOVED` -- excluir um comentario nunca diminuia o numero exibido.~~ **(RESOLVIDO na Etapa 10: contagem filtrada por `status: 'PUBLISHED'`. So foi encontrado escrevendo o E2E de exclusao de comentario com reload independente. Ver "Interacoes Sociais (Etapa 10)" acima.)**
19. ~~`JwtAuthGuard` convertia QUALQUER erro nao previsto (inclusive falha transitoria de escrita no `UPDATE AccountSession.lastSeenAt`) em 401 "Invalid bearer token"~~ **(RESOLVIDO na Etapa 10: duas requisicoes concorrentes autenticadas da mesma sessao podiam colidir nesse UPDATE (MySQL 1020) e a segunda perdia a sessao por engano -- afetava qualquer endpoint autenticado da API, nao so Community. Corrigido isolando o UPDATE em seu proprio try/catch que absorve a falha. So foi encontrado escrevendo o teste de concorrencia desta etapa. Ver "Interacoes Sociais (Etapa 10)" acima.)**
20. ~~`profileVisibility: 'FOLLOWERS'` nao tinha nenhum efeito real -- perfil se comportava como PUBLIC para qualquer visitante.~~ **(RESOLVIDO na Etapa 11: `publicProfile()` agora checa `CommunityFollow` real via rota autenticada. Ver "Perfis e Relacionamentos (Etapa 11)" acima.)**
21. ~~Dono podia ficar trancado do proprio perfil ao configura-lo como PRIVATE ou FOLLOWERS.~~ **(RESOLVIDO na Etapa 11: dono sempre ve o proprio perfil, independente da visibilidade configurada.)**
22. ~~Bloqueio nao ocultava a pagina de perfil, so os posts no feed.~~ **(RESOLVIDO na Etapa 11: mesma checagem de bloqueio mutuo aplicada tambem a `publicProfile()`.)**
23. ~~`publicProfile()` vazava campos de moderacao internos (`socialSuspendedUntil`, `postBlockedUntil`, `warningCount`, etc.) e de admin (`grantedBy`, `reason` em achievement/badge grants) para qualquer visitante.~~ **(RESOLVIDO na Etapa 11: `include` cego trocado por `select` explicito limitado ao que a UI renderiza.)**
24. ~~`guildVisibility: 'HIDDEN'` nao tinha efeito real -- `guildName` sempre aparecia.~~ **(RESOLVIDO na Etapa 11: `guildName` removido da resposta quando oculto e o viewer nao e o dono.)**
25. ~~Aba "Marcações / Collabs" do perfil nunca podia mostrar nada (nenhum codigo produzia esse `kind`) mas exibia o mesmo vazio generico de uma aba legitimamente vazia.~~ **(RESOLVIDO na Etapa 11: aba removida -- nao existe schema/endpoint para marcacoes/colaboracoes, nao inventado.)**
26. ~~Aba "Compartilhados" (reposts) do perfil nunca mostrava nada apesar de reposts serem uma feature real com dados reais.~~ **(RESOLVIDO na Etapa 11: perfil agora busca e exibe reposts reais.)**
27. ~~Dashboard administrativo da Community undercounted uploads maliciosos/rejeitados no widget de erros (`module: 'community'` exato nao capturava `module: 'community.media'`).~~ **(RESOLVIDO na Etapa 12: filtro trocado para `startsWith`. Ver "Moderacao e Abuse Safety (Etapa 12)" acima.)**
28. ~~Mojibake em `community-admin.service.ts#moderateUser` (mensagens de erro de troca de username).~~ **(RESOLVIDO na Etapa 12: nao foi feita ainda uma varredura completa do repositorio -- outras ocorrencias podem existir fora do escopo tocado ate agora, mesma ressalva do item 10.)**
29. ~~Painel admin da Community sempre mandava `isActive:false` (conquistas), `status:'DRAFT'` (quests) ou `isActive:true` (badges) em TODA edicao, inclusive de registros ja publicados/ativos -- editar a descricao de uma conquista ativa a desativava sem aviso; o mesmo para despublicar uma quest ou reativar um badge deliberadamente desligado.~~ **(RESOLVIDO na Etapa 13: esses valores so sao forcados ao criar um registro novo; ao editar, o valor real do formulario -- ja carregado do registro -- e enviado como esta. Ver "Administracao da Community (Etapa 13)" acima.)**
30. ~~`loadCurrent()` do painel admin nao tinha nenhum tratamento de erro nem indicador de carregamento -- uma falha de rede deixava a tela em branco ou com dados desatualizados, sem nenhum aviso.~~ **(RESOLVIDO na Etapa 13: estados loading/error/empty reais adicionados em todas as 5 secoes que exibem dados carregados.)**
31. ~~O botao "Seguir" do `CommunityProfileHoverCard.vue` era decorativo -- alternava um `ref` local (`following.value = !following.value`) sem nunca chamar `api.followProfile`/`unfollowProfile`; o usuario via o rotulo mudar para "Seguindo" acreditando ter seguido o perfil, mas nada era persistido.~~ **(RESOLVIDO na Etapa 15: hover card agora busca o relacionamento real sob demanda e chama a API de verdade, com erro tratado via toast. Ver "UX e responsividade (Etapa 15)" acima.)**
29. Nao existe remocao administrativa de uma unica imagem dentro de uma galeria de post -- a unica ferramenta e ocultar/remover o post inteiro. (Identificado na Etapa 12 -- nao corrigido, escopo alem do "minimo necessario" pedido pelo brief desta etapa; moderacao de post inteiro ja cobre o caso pratico.)
30. Nao existe sancao de "mute" (silenciar publicacoes sem bloquear acesso) nem "ban" permanente dedicado como tipos de moderacao administrativa -- o mais proximo e `SOCIAL_SUSPENSION` com `expiresAt` distante. (Identificado na Etapa 12 -- mapeado, nao inventado; documentar necessidade antes de construir, conforme pedido pelo brief.)

## Ponto exato para continuar

Ordem recomendada:

1. Preservar o worktree e revisar o diff Community por arquivo.
2. Revisar as tres migrations contra `schema.prisma`; testar em clone descartavel do MySQL.
3. Subir API+web+MySQL local de teste e executar fluxo: login -> perfil -> upload ->
   post -> comentario -> reacao -> save -> repost -> follow -> block -> report.
4. Corrigir apenas falhas comprovadas desse fluxo.
5. Remover fallback mock do perfil real, substituindo por empty/loading/error honesto.
6. Trocar rail/perfil/anuncios mockados por dados reais ou placeholders explicitamente
   editoriais, sem inventar usuarios/metricas.
7. Implementar paginacao/infinite loading no feed.
8. Fazer QA desktop/tablet/mobile e permissao ADM.

## Claude Code - Recommended Starting Point

1. Ler `git status`, este documento, `community.controller.ts`,
   `community.service.ts`, `useCommunityApi.ts` e as tres migrations.
2. Abrir primeiro `apps/api/src/modules/community` e confirmar o contrato completo.
3. Continuar pela homologacao das migrations e pelo E2E minimo de posts/interacoes.
4. Dependencias: Auth/JWT, Prisma/MySQL, MediaService/Sharp, Observability e Nuxt UI.
5. Rodar `npm run api:check` e `npm run web:build`; adicionar E2E em banco descartavel.
6. Nao alterar producao, GameBridge, layout global ou arquitetura de tarefas ainda.
7. Risco principal: mock esconde falha real e migration ausente quebra runtime apesar
   de TypeScript/build passarem.
8. Concluir quando dados reais substituirem mocks no caminho principal, os fluxos
   autenticados passarem e os blockers Community do beta estiverem fechados.
