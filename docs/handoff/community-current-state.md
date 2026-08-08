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
| Perfil publico | `DONE` | Etapa 7: sem mock/fallback. `GET /community/profiles/:username` real, mapeado direto para a UI; loading/erro/nao-encontrado honestos. Ver "Perfil (Etapa 7)" abaixo. |
| Editar perfil | `DONE` | Etapa 7: `PATCH /community/me` com validacao real (tipo, enum, URL) no backend; UI sem atualizacao otimista -- so fecha e reflete apos confirmacao do servidor; erro exibido inline se a API falhar. |
| Follow/unfollow | DONE backend | Endpoints/composable existem; UI ampla ainda incompleta. |
| Block/unblock | DONE backend | Endpoints e relacao persistida; UX final incompleta. |
| Mute | MISSING | Enum preparado, sem fluxo publico identificado. |
| Hover card | PARTIAL | Componente existe; confirmar uso em todos os usernames. |
| Upload de imagem | `DONE` | Etapa 8: pipeline real ligado a avatar/capa/posts (zero base64/mock); rate limit (10/60s); erro de validacao (400) separado de falha de infraestrutura (500); E2E cobre valido/tipo invalido/arquivo grande/corrompido/sem-auth/falha de storage. Storage continua local -- ver "Midia (Etapa 8)" abaixo para o blocker de producao. |
| Upload de GIF | DONE backend | Valida e reprocessa GIF; conversao para video nao existe. |
| Galeria | DONE backend | 2 a 6 assets; E2E cobre post com midia (ver "Midia (Etapa 8)"); QA visual em navegador ainda pendente. |
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
| ~~`communityPostsMock`~~ | ~~`stage-one.mock.ts`~~ | ~~Alimentava `communitySocialProfileMock`~~ | **`RESOLVED` (Etapa 7)** | Removido -- `stage-two.mock.ts` foi deletado (ficou 100% orfao). `entries`/`media` do perfil agora vem somente de `communityPosts` reais. |
| ~~`communitySocialProfileMock` / `profileForUsername()`~~ | ~~`stage-two.mock.ts`~~ | ~~`pages/comunidade/[username].vue`~~ | **`RESOLVED` (Etapa 7)** | O fallback silencioso foi removido. `pages/comunidade/[username].vue` agora usa `useAsyncData` + `GET /community/profiles/:username` puro, com estados `loading`/`error`/`not-found`/`success` explicitos -- ver "Perfil (Etapa 7)" abaixo. |
| `usernamePolicy` | `~~stage-two.mock.ts~~` → `features/community/username-policy.ts` (Etapa 7) | `CommunityProfileEditor.vue` | `DEV_ONLY` → movido | Nunca foi dado fabricado. Realocado para fora do diretorio de mocks nesta etapa, encerrando a classificacao `DEV_ONLY` (o "so misclassificado de arquivo" que a motivava deixou de existir). |
| `CommunityPlaceholderView` (Explorar, Perfil por query, Guilds, Eventos, Quests, Conquistas) | `components/community/CommunityPlaceholderView.vue` | `pages/comunidade/index.vue` (roteamento por `section` query) | `TEMPORARY_SAFE` | Sem alteracao nesta etapa -- fora de escopo (perfil, nao navegacao de secoes). Estado "ainda nao implementado" honesto, nao fabrica conteudo. |

Resumo original (Etapa 5): 6 `BLOCKER_BETA`, 1 `DEV_ONLY`, 1 `TEMPORARY_SAFE`. **Atualizacao Etapa 7**: os 2 itens `BLOCKER_BETA` da cadeia de *perfil* (`communityPostsMock` via `stage-two.mock.ts`, `communitySocialProfileMock`/`profileForUsername()`) foram **resolvidos** -- `stage-two.mock.ts` foi deletado do repositorio. Os 4 itens `BLOCKER_BETA` restantes (`communityProfileMock` do rail-esquerdo/home, `communityAdsMock`, `communityEventsMock`, `communityTrendingMock`, `communitySuggestionsMock` -- ver nota¹) permanecem **fora do escopo desta etapa** (rail direito/ads e identidade resumida da home, nao a pagina de perfil) e continuam pendentes para uma etapa futura.

¹ Nota: `communityProfileMock` em si (o registro original do rail esquerdo) tambem foi removido nesta etapa -- `pages/comunidade/index.vue` agora busca o proprio perfil via `GET /community/profiles/:username` (real) quando ha sessao, e mostra um convite de login honesto quando nao ha. Isso deixa `stage-one.mock.ts` com apenas os 4 exports de rail direito (`communityAdsMock`/`communityEventsMock`/`communityTrendingMock`/`communitySuggestionsMock`), que continuam `BLOCKER_BETA` e fora do escopo desta etapa.

## Bugs/riscos conhecidos

1. Worktree Community esta sujo e nao commitado; nao perder nem misturar com correcoes. **(Etapa 5: commitado, preservado -- ver commit 2302263.)**
2. Schema e services esperam tres migrations locais ainda nao homologadas. **(Etapa 6: homologadas em ambiente descartavel, APPROVED_FOR_PRODUCTION; ainda nao aplicadas em nenhum ambiente real.)**
3. ~~Perfil pode parecer funcional quando API falha porque cai silenciosamente no mock.~~ **(RESOLVIDO na Etapa 7: fallback removido, estados loading/erro/nao-encontrado explicitos.)**
4. ~~Home usa `communityProfileMock` para usuario/rail~~ **(RESOLVIDO na Etapa 7: rail proprio agora busca dado real; convite de login quando sem sessao.)** `communityAdsMock` continua em uso -- fora do escopo da Etapa 7 (nao e dado de perfil).
5. Secoes secundarias ainda sao placeholders. (Inalterado -- fora do escopo da Etapa 7.)
6. Erros de feed sao genericos; nao ha retry explicito. (Inalterado -- feed nao e perfil, fora do escopo da Etapa 7.)
7. Nao ha notificacao persistida para follow, mention, comment ou achievement. (Inalterado.)
8. ~~Sem testes unitarios/E2E~~ **(Etapa 7: primeiro E2E do repositorio -- `apps/api/test/community-profile.e2e-spec.ts`, Jest+Supertest, cobre o fluxo de perfil. Demais modulos ainda sem cobertura.)**
9. Nao houve QA visual em browser com API e banco nesta auditoria. (Inalterado -- ver "Perfil (Etapa 7)" abaixo para o que foi validado via API/E2E em vez de QA visual manual.)
10. Algumas strings apareceram com mojibake no terminal PowerShell; confirmar encoding
    visual em browser antes de alterar arquivos. **(Etapa 7: as 3 ocorrencias reais em `community.service.ts` -- `follow`/`unfollow` -- foram corrigidas. Nao foi feita uma varredura completa do repositorio; outras ocorrencias podem existir fora do escopo tocado nesta etapa.)**
11. ~~`optionalUrl` (perfil, Etapa 7) rejeitava a URL relativa que o upload real (Etapa 8) sempre devolve.~~ **(RESOLVIDO na Etapa 8: aceita caminho relativo iniciado por `/`, alem de `http(s)://` absoluto. So foi encontrado por E2E cruzando upload real + perfil real.)**
12. ~~`removeOwnPost` nao desanexava `CommunityMedia` ao excluir um post.~~ **(RESOLVIDO na Etapa 8: mesma logica de desanexar que `updateOwnPost` ja tinha, agora tambem na exclusao.)**
13. Upload multi-arquivo parcialmente falho deixa `CommunityMedia` orfa (sem post, sem endpoint de exclusao avulsa ainda). **(Identificado na Etapa 8 -- nao e falha de seguranca, e desperdicio de storage. Ver "Midia (Etapa 8)" acima.)**
14. Storage de midia Community e filesystem local e o script de deploy cPanel real (`scripts/package-cpanel-deploy.mjs`) nao preserva esse diretorio entre deploys. **(Identificado na Etapa 8 -- blocker de Beta Release, ver "Midia (Etapa 8)" acima e `site-beta-checklist.md`.)**

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
