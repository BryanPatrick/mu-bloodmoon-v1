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
