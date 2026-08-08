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

Status geral: `PARTIAL`, com base backend relevante e integracao final pendente.

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
| Paginacao backend | DONE | Query/page/pageSize e resposta paginada. |
| Paginacao UI do feed | PARTIAL | Home requisita pageSize 30 e nao expoe controles de pagina. |
| Criar post | DONE | Tipos TEXT/IMAGE/GALLERY/GIF/ARTICLE preparados. |
| Editar post | DONE | Proprio autor; cria revisao. |
| Excluir post | DONE | Soft delete/auditoria preservada. |
| Comentarios | DONE | Criar/editar/excluir e um nivel de resposta. |
| Reacoes | DONE | Toggle generico para post/comentario. |
| Salvos | DONE | Toggle + feed salvo; colecoes futuras apenas no schema. |
| Repost interno | DONE | Toggle persistido. |
| Copiar link | DONE | Cliente copia URL; deep-link do post nao e destacado automaticamente. |
| Hashtags/mencoes | PARTIAL | Campos e parsing/contratos existem; busca/notificacao nao. |
| Perfil publico | PARTIAL | API real mesclada sobre mock. |
| Editar perfil | PARTIAL | Endpoint/UI existem; editor visual precisa homologacao. |
| Follow/unfollow | DONE backend | Endpoints/composable existem; UI ampla ainda incompleta. |
| Block/unblock | DONE backend | Endpoints e relacao persistida; UX final incompleta. |
| Mute | MISSING | Enum preparado, sem fluxo publico identificado. |
| Hover card | PARTIAL | Componente existe; confirmar uso em todos os usernames. |
| Upload de imagem | DONE backend | Validacao/reprocessamento/storage local; E2E nao executado. |
| Upload de GIF | DONE backend | Valida e reprocessa GIF; conversao para video nao existe. |
| Galeria | DONE backend | 2 a 6 assets; UI precisa E2E. |
| Denuncia | DONE backend | Endpoint e workflow administrativo. |
| Moderacao | DONE backend/admin | Post/comment/reaction/user/report; precisa E2E por permissao. |
| Conquistas | PARTIAL | CRUD/grants/admin e exibicao de perfil; dados reais dependem do banco. |
| Quests | PARTIAL | Listar/participar/admin/progresso/recompensa; home dedicada ausente. |
| Badges | PARTIAL | Admin/grants existem; exibicao social final incompleta. |
| Guilds | MISSING | Guild e string; sem entidade/pagina/membros/cargos. |
| Eventos sociais | MISSING | Navegacao e placeholder, sem dominio dedicado. |
| Notificacoes sociais | MISSING | Sem entidade/inbox/preferencias. |
| Busca social | MISSING | Sem indice unificado de pessoas/posts/tags. |
| Ads reais | MISSING | Right rail usa mocks; sem campanha/impressao/clique. |
| Estatisticas sociais | PARTIAL | Stats basicos de perfil/API; sem snapshots/privacy efetiva completa. |
| Estados loading/vazio/erro | DONE feed | Perfil oculta erro usando mock; outras secoes sao placeholder. |
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
- registra falhas em SystemError.

Pendencias:

- storage e filesystem local, sem objeto remoto/CDN;
- nao foi verificada limpeza de assets temporarios/orfaos;
- URL e servida pela propria API; proxy/cache/backup precisam homologacao;
- GIF pesado ainda nao converte para WebM/MP4;
- nao aceitar SVG arbitrario esta corretamente preservado.

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

## Catalogo de mocks/fallbacks (Etapa 5)

Auditoria de 2026-08-08 (Etapa C1) ja apontava mocks em prosa (itens 3-4 de
"Bugs/riscos conhecidos" abaixo). Esta tabela e o inventario exato -- toda
constante exportada de `stage-one.mock.ts`/`stage-two.mock.ts` e onde cada uma
e efetivamente renderizada -- classificado por severidade para o beta.
Nenhum mock foi removido nesta etapa (fora de escopo -- ver Etapa 5, brief).

| Item | Definido em | Consumido em | Classificacao | Motivo |
|---|---|---|---|---|
| `communityProfileMock` | `stage-one.mock.ts` | `pages/comunidade/index.vue` (identidade no rail esquerdo, mesclado com `user.value` real); base de `communitySocialProfileMock` | `BLOCKER_BETA` | Checklist HIGH: "Substituir profile/user rail mock por dados reais ou estado vazio honesto" |
| `communityAdsMock` | `stage-one.mock.ts` | `CommunityRightRail.vue` (2 anuncios desktop); `pages/comunidade/index.vue` (anuncio mobile) | `BLOCKER_BETA` | Checklist HIGH: "Substituir anuncios/right rail mock por conteudo administrativo ou ocultar blocos" -- anuncio fabricado exibido a usuario real |
| `communityEventsMock` | `stage-one.mock.ts` | `CommunityRightRail.vue` (bloco de eventos) | `BLOCKER_BETA` | Mesmo rail que `communityAdsMock`; eventos inventados apresentados como reais |
| `communityTrendingMock` | `stage-one.mock.ts` | `CommunityRightRail.vue` (topicos em alta) | `BLOCKER_BETA` | Mesmo rail; hashtags fixas, nunca refletem atividade real |
| `communitySuggestionsMock` | `stage-one.mock.ts` | `CommunityRightRail.vue` (sugestoes de seguir) | `BLOCKER_BETA` | Mesmo rail; perfis sugeridos nao existem |
| `communityPostsMock` | `stage-one.mock.ts` | Uso interno apenas -- alimenta a atividade de `communitySocialProfileMock` em `stage-two.mock.ts` | `BLOCKER_BETA` | Nao tem tela propria, mas acaba renderizado via `profileForUsername()` quando a API falha -- mesma cadeia do item abaixo |
| `communitySocialProfileMock` / `profileForUsername()` | `stage-two.mock.ts` | `pages/comunidade/[username].vue` (perfil publico) | `BLOCKER_BETA` | Checklist BLOCKER: "Remover o fallback silencioso de perfil mockado" + "Garantir que falha de API nao seja exibida como conteudo inventado" -- risco 3 de "Bugs/riscos conhecidos" abaixo |
| `usernamePolicy` | `stage-two.mock.ts` | `CommunityProfileEditor.vue` (regras de validacao de username) | `DEV_ONLY` | Nao e dado fabricado -- e logica de validacao real, apenas coabitando o arquivo de mock por conveniencia. Seguro para o beta como esta; mover para um arquivo proprio e limpeza cosmetica, nao um blocker |
| `CommunityPlaceholderView` (Explorar, Perfil por query, Guilds, Eventos, Quests, Conquistas) | `components/community/CommunityPlaceholderView.vue` | `pages/comunidade/index.vue` (roteamento por `section` query) | `TEMPORARY_SAFE` | Estado "ainda nao implementado" honesto -- nao fabrica conteudo, apenas informa ausencia. Alinhado aos itens MEDIUM do checklist (implementar essas paginas depois), nao e um blocker de integridade |

Resumo: **6 pontos `BLOCKER_BETA`** (todos alimentados por `stage-one.mock.ts`/`stage-two.mock.ts`, todos no caminho de usuario real -- rail esquerdo, rail direito, perfil publico), **1 `DEV_ONLY`** (`usernamePolicy`, seguro, so misclassificado de arquivo), **1 `TEMPORARY_SAFE`** (placeholders honestos de secoes ainda nao construidas). Nenhum item `UNKNOWN` -- todo consumidor de mock foi rastreado ate sua tela/componente exato via `grep` exaustivo no escopo Community; nenhuma leitura estatica ficou sem explicacao.

## Bugs/riscos conhecidos

1. Worktree Community esta sujo e nao commitado; nao perder nem misturar com correcoes.
2. Schema e services esperam tres migrations locais ainda nao homologadas.
3. Perfil pode parecer funcional quando API falha porque cai silenciosamente no mock.
4. Home usa `communityProfileMock` para usuario/rail e `communityAdsMock` para publicidade.
5. Secoes secundarias ainda sao placeholders.
6. Erros de feed sao genericos; nao ha retry explicito.
7. Nao ha notificacao persistida para follow, mention, comment ou achievement.
8. Sem testes unitarios/E2E; somente checks estruturais/typecheck/build.
9. Nao houve QA visual em browser com API e banco nesta auditoria.
10. Algumas strings apareceram com mojibake no terminal PowerShell; confirmar encoding
    visual em browser antes de alterar arquivos.

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
