# BloodMoon - checklist para beta aberto

Baseado na auditoria estatica e nas verificacoes de 2026-08-08. Itens nao foram
marcados como concluidos sem evidencia runtime. Prioridade responde primeiro a:
"o que impede usuarios reais de usar o portal com seguranca?"

## BLOCKER

### Comunidade

- [x] Preservar/revisar o diff local Community antes de qualquer merge. (Etapa 5: auditado via `git status`/`git diff --stat`, catalogado no Hub, nada descartado -- ver docs/handoff/community-current-state.md.)
- [x] Homologar as tres migrations Community em clone descartavel do MySQL. (Etapa 6: aplicadas em sequencia real em container MariaDB descartavel e isolado, todas classificadas ADDITIVE, todas `APPROVED_FOR_PRODUCTION` -- ver docs/handoff/community-current-state.md#homologacao-das-migrations-etapa-6. Ainda nao aplicadas em nenhum ambiente real; E2E autenticado completo continua pendente, ver item abaixo.)
- [ ] Executar E2E autenticado de perfil, upload, post, edicao, exclusao, comentario,
  resposta, reacao, save, repost, follow, block e denuncia. (Etapa 7: escopo de
  **perfil** coberto -- `apps/api/test/community-profile.e2e-spec.ts`, 6/6 PASS.
  Etapa 8: escopo de **midia/upload** coberto -- `apps/api/test/community-media.e2e-spec.ts`,
  10/10 PASS (valido, tipo invalido, arquivo grande, corrompido, sem-auth, avatar,
  post com midia, falha de storage). Etapa 9: escopo de **feed/posts** coberto --
  `apps/api/test/community-post.e2e-spec.ts`, 15/15 PASS (criar, visualizar via
  permalink, editar proprio, excluir proprio, permissao entre usuarios distintos
  em editar E excluir, validacao de conteudo, ARTICLE sem titulo, paginacao,
  visibilidade PRIVATE). Etapa 10: escopo de **comentario/reacao/save/repost**
  coberto -- `apps/api/test/community-social.e2e-spec.ts`, 22/22 PASS (ownership,
  paginacao de comentarios, contadores, concorrencia/double-click, referencia do
  repost ao original, isolamento de "salvos" por conta). Etapa 11: escopo de
  **perfil/privacidade/follow/block** coberto --
  `apps/api/test/community-profile-privacy.e2e-spec.ts`, 10/10 PASS (tiers
  PUBLIC/FOLLOWERS/PRIVATE reais, dono sempre ve o proprio perfil, bloqueio
  oculta o perfil, exposicao de dados internos auditada e corrigida, reposts no
  perfil, follow/unfollow via endpoint de relacionamento). Etapa 12: escopo de
  **denuncia/moderacao/sancoes/auditoria** coberto --
  `apps/api/test/community-moderation.e2e-spec.ts`, 17/17 PASS (fluxo completo
  denuncia -> fila -> acao -> resolucao; usuario comum barrado de endpoint
  administrativo com 401/403; auditoria real sem secrets; sancoes WARNING/
  POST_BLOCK/restore homologadas; evidencia de upload malicioso integrada com
  a Etapa 8). Etapa 13: escopo de **painel administrativo** coberto --
  `apps/api/test/community-admin-panel.e2e-spec.ts`, 9/9 PASS (player barrado
  em toda rota admin; moderador com permissoes granulares reais -- age em
  posts/comentarios/denuncias/usuarios, mas recebe 403 fora do seu escopo,
  ex.: catalogo de conquistas, policy, tarefas, analytics; admin/super-admin
  com acesso total; trilha de auditoria confirmada com o ator/motivo corretos;
  contrato de `isActive`/`status` em conquista validado explicitamente contra
  o bug de despublicacao silenciosa corrigido nesta etapa, ver
  community-current-state.md#administracao-da-community-etapa-13). Combinado:
  `npm run api:test:e2e` 89/89 PASS. QA visual autenticado em navegador
  (clicar criar/editar/excluir, incluindo o painel admin) continua pendente --
  bloqueado por captcha no cadastro, ver
  community-current-state.md#feed-e-posts-etapa-9.)
- [x] Remover o fallback silencioso de perfil mockado no caminho de usuario real. (Etapa 7: `stage-two.mock.ts` deletado; `pages/comunidade/[username].vue` usa somente dado real, com estados loading/error/not-found explicitos.)
- [x] Garantir que falha de API nao seja exibida como conteudo inventado. (Etapa 7, escopo perfil: erro real -> estado de erro real, nunca dado inventado. Demais telas Community fora do escopo desta etapa.)
- [x] Corrigir exposicao de dados internos/moderacao no perfil publico da Community. (Etapa 11:
  `publicProfile()` vazava `socialSuspendedUntil`/`postBlockedUntil`/`warningCount`/etc. do
  `CommunityProfile` e `grantedBy`/`reason` de achievement/badge grants (identificador de admin +
  justificativa interna) para QUALQUER visitante, incluindo anonimo. Corrigido trocando `include`
  cego por `select` explicito. `email`/senha/role nunca estiveram expostos -- confirmado, nao era
  parte do bug. Ver community-current-state.md#perfis-e-relacionamentos-etapa-11.)

### Autenticacao e seguranca

- [ ] E2E de cadastro, login, refresh, logout, sessao unica e 2FA com banco de teste.
- [x] Corrigir race de concorrencia no `JwtAuthGuard` que podia causar 401 falso ("sessao invalida")
  em requisicoes autenticadas simultaneas legitimas (ex.: duplo-clique). (Etapa 10: encontrado
  escrevendo o teste de concorrencia de reacoes/saves/reposts da Community -- o guard fazia um
  `UPDATE AccountSession.lastSeenAt` em toda requisicao e tratava QUALQUER erro dai como token
  invalido; duas requisicoes concorrentes da mesma sessao podiam colidir nesse UPDATE (MySQL 1020)
  e a perdedora era deslogada por engano. Afeta toda a API, nao so Community. Corrigido isolando
  esse UPDATE em seu proprio try/catch -- ver community-current-state.md#interacoes-sociais-etapa-10.)
- [ ] Implementar recuperacao de senha real com token curto, expiração e invalidacao.
- [ ] Revisar armazenamento de access/refresh token no browser e protecao XSS.
- [ ] Validar rate limit para login, cadastro, recuperacao, posts, comentarios e upload.
- [ ] Testar matriz PLAYER/ADMIN/SUPER_ADMIN e overrides de permissao no backend. (Etapa 12,
  escopo Community apenas: confirmado que PLAYER recebe 401/403 real em endpoint administrativo
  (E2E); confirmado que `role: 'ADMIN'` sozinho NAO concede `admin.community.*` automaticamente
  -- so `SUPER_ADMIN` (wildcard) ou overrides explicitos em `AccountPermission`. Etapa 13: matriz
  estendida por E2E a todo o painel administrativo da Community (posts, comentarios, denuncias,
  usuarios/moderacao, catalogos, policy, tarefas, analytics) -- confirmado que um moderador com
  overrides granulares reais age exatamente no que foi concedido e recebe 403 em qualquer acao
  fora do escopo, nao um binario `role === 'ADMIN'`. Matriz completa para os demais modulos (loja,
  marketplace, suporte, etc.) continua sem E2E dedicado.)
- [ ] Confirmar segredo/`.env` apenas no ambiente e executar secret scan antes do beta.

### Loja e marketplace

- [ ] Homologar compra, saldo, idempotencia, entrega, retry, estorno e auditoria.
- [ ] Homologar escrow completo: entrada, reserva, venda, entrega, retorno e rollback.
- [ ] Simular concorrencia para impedir compra/entrega duplicada.
- [ ] Bloquear operacoes reais quando GameBridge estiver indisponivel/inconsistente.

### Deploy/producao

- [ ] Backup restauravel do MySQL, storage e build antes da liberacao.
- [ ] Aplicar migrations somente apos backup e teste de rollback.
- [ ] Configurar storage persistente/backup para midia Community. (Etapa 8: confirmado como
  blocker real, nao teorico -- `scripts/package-cpanel-deploy.mjs`, o pipeline de deploy
  de producao efetivamente usado por este projeto, nao gerencia/preserva
  `COMMUNITY_MEDIA_DIR` entre deploys; redeploy de rotina arrisca apagar midia de usuario
  em silencio. Recomendacao registrada, nao implementada -- ver
  docs/handoff/community-current-state.md#midia-etapa-8. Migrar storage exige escopo e
  aprovacao explicitos em etapa futura.)
- [ ] Smoke test HTTPS de web, API, banco, uploads, downloads e jobs.
- [ ] Configurar logs/alertas para falha de banco, entrega, escrow e storage.

## HIGH

### Comunidade

- [x] Substituir profile/user rail mock por dados reais ou estado vazio honesto. (Etapa 7: `pages/comunidade/index.vue` busca o proprio perfil real quando ha sessao; mostra convite de login honesto quando nao ha. `communityAdsMock`/eventos/trending/sugestoes do rail direito continuam mock -- fora do escopo, ver item HIGH "Substituir anuncios/right rail mock".)
- [x] Substituir anuncios/right rail mock por conteudo administrativo ou ocultar blocos. (Etapa 9:
  `communityAdsMock`/`communityEventsMock`/`communityTrendingMock`/`communitySuggestionsMock`
  removidos por inteiro do repositorio -- `stage-one.mock.ts` e `CommunityAdCard.vue` deletados.
  `CommunityRightRail.vue` mostra estado honesto de indisponivel. Anuncios/eventos/trending/
  sugestoes *reais* continuam nao implementados -- item movido para MEDIUM abaixo como
  "implementar dominio real", nao mais um mock enganando o usuario.)
- [x] Adicionar paginacao/infinite loading visivel ao feed. (Etapa 9: botao "Carregar mais
  publicacoes" sobre o page/pageSize offset ja existente no backend; qualquer mutacao reseta
  para pagina 1 fresca. Nao migrado para cursor -- ver MEDIUM abaixo.)
- [ ] Ligar hover card e follow/unfollow em todos os locais de username. (Etapa 11: confirmado
  real e funcional em `CommunityProfileHeader.vue`/`CommunityProfileHoverCard.vue` -- nao um
  placeholder. Auditoria exaustiva de todo local que renderiza um username no app nao foi feita
  nesta etapa; item permanece aberto por precaucao.)
- [x] Validar privacidade de perfil/personagem/equipamento/stats/guild/atividade. (Etapa 11:
  `profile` (PUBLIC/FOLLOWERS/PRIVATE) e `guild` (VISIBLE/HIDDEN) tinham enforcement real
  ausente/parcial -- corrigidos, ver community-current-state.md#perfis-e-relacionamentos-etapa-11.
  `personagem`/`equipamento`/`estatisticas`/`atividade` deliberadamente NAO aplicados -- nenhum
  dado de personagem/equipamento/estatistica existe neste endpoint ainda para proteger, e
  "atividade" e semanticamente ambigua o bastante para nao merecer enforcement adivinhado.
  Reavaliar quando esses dados existirem de fato.)
- [ ] Implementar notificacoes persistidas para mencoes, comentarios, follow e conquistas.
- [x] QA de moderacao, revisoes, soft delete e historico administrativo. (Etapa 12: fluxo completo
  homologado via E2E real -- denuncia, fila, acao do moderador (post/comment/reaction/user),
  revisao administrativa (`CommunityPostRevision` criada em edicao admin), soft delete
  (HIDE/REMOVE nunca apagam a linha), trilha de auditoria real (`AuditEvent`) com verificacao
  explicita de ausencia de secrets. Nao inventado -- sistema ja existia, so nao tinha E2E.)
- [x] Homologar o painel administrativo da Community ponta a ponta (posts, comentarios, reacoes,
  perfis/moderacao, denuncias, catalogos de conquista/quest/badge, policy, tarefas, analytics) com
  filtros, busca, paginacao e nenhuma acao dependendo so de protecao frontend. (Etapa 13: zero
  mocks confirmados -- todo tab chama a API real. Dois bugs reais corrigidos: (1) salvar edicao de
  conquista/quest/badge ja publicada sobrescrevia `isActive`/`status` com o default de "novo
  registro", desativando/despublicando silenciosamente; (2) leitura de dados no painel nao tinha
  estado de loading/erro, entao falha de rede deixava a tela em branco sem aviso. Ver
  community-current-state.md#administracao-da-community-etapa-13.)

### Paginas publicas e dados mock

- [ ] Remover textos/metricas ficticios da Home e traducoes antes de divulgacao.
- [ ] Revisar noticias/eventos publicados e fallbacks editoriais.
- [ ] Decidir destino de `/guias` versus `/wiki` e evitar navegacao duplicada.
- [ ] Confirmar ranking sincronizado com o servidor ou comunicar indisponibilidade.
- [ ] Validar links atuais de launcher e cliente completo.

### Wiki

- [ ] Smoke de busca/filtros/equipamentos com API e base de producao clonada.
- [ ] Confirmar que somente Season 6/Rage Fighter ou anterior e exibido ao publico.
- [ ] Verificar imagens ausentes e dados incompletos sem inventar atributos.
- [ ] Reduzir carregamento inicial de catalogos grandes por lazy loading/paginacao.

### Suporte e administracao

- [ ] E2E de abertura, atribuicao, resposta e resolucao de ticket.
- [ ] Validar auditoria para toda acao administrativa sensivel.
- [ ] Testar central de erros, alertas e exportacoes por permissao.
- [ ] Reconciliar itens antigos de roadmap interno que ja foram implementados.

### Mobile

- [ ] QA visual em 360, 390, 768, 1024 e desktop para Home, Wiki, Community,
  Marketplace, login e painel.
- [ ] Testar drawers, header, composer, modais e tabelas com teclado/touch.

## MEDIUM

### Comunidade

- [ ] Implementar Explorar e busca social.
- [ ] Implementar paginas reais de Quests e Conquistas.
- [ ] Implementar eventos sociais.
- [ ] Definir dominio de Guilds (entidade, membros, cargos e pagina).
- [ ] Implementar mute (silenciar sem bloquear) e colecoes de salvos. (Etapa 12: confirmado que
  nao existe nenhum tipo de sancao "mute" nem "ban" permanente dedicado na moderacao
  administrativa -- mapeado, nao inventado. O mais proximo hoje e `SOCIAL_SUSPENSION` com
  `expiresAt` distante. Documentar necessidade real antes de construir um sistema novo.)
- [ ] Permitir remocao administrativa de uma unica imagem dentro de uma galeria de post, sem
  remover o post inteiro. (Etapa 12: hoje a unica ferramenta e ocultar/remover o post completo --
  cobre o caso pratico de moderacao, mas nao e granular.)
- [ ] Definir ciclo de limpeza de midia temporaria/orfa. (Etapa 8: caso concreto identificado --
  upload multi-arquivo parcialmente falho deixa `CommunityMedia` sem post associado, sem
  endpoint de exclusao avulsa ainda. Nao e risco de seguranca, e desperdicio de storage.)
- [ ] Converter GIF pesado para formato de video quando apropriado.
- [ ] Implementar dominio real de anuncios/eventos sociais/trending/sugestoes de perfil para a
  right rail (Etapa 9 removeu os mocks e deixou um estado honesto de indisponivel no lugar --
  nenhum schema/endpoint real existe ainda para nenhum dos quatro).
- [ ] Avaliar migrar a paginacao do feed de offset (`page`/`pageSize`, atual) para cursor
  (`createdAt`/`id`) se o volume de posts justificar -- offset pode saltar/duplicar sob
  insercao concorrente durante "carregar mais" (Etapa 9, nao corrigido, baixo risco na escala
  atual).

### Loja/marketplace/roadmap

- [ ] Revisar estados vazios, retries e mensagens de erro ao usuario.
- [ ] Validar importacao/publicacao de catalogo sem nomes/codigos internos publicos.
- [ ] Validar agendamento e jobs de expiracao em ambiente semelhante a producao.
- [ ] Popular Roadmap apenas com iniciativas revisadas/publicadas.

### SEO e social sharing

- [ ] Adicionar metadata/OG especifica para noticias, roadmap, produtos, anuncios e posts.
- [ ] Definir canonical URLs para aliases e perfis.
- [ ] Gerar sitemap/robots coerentes com rotas privadas.
- [ ] Garantir que conteudo privado/administrativo nao seja indexado.

### Performance

- [ ] Investigar chunks acima de 500 kB reportados pelo build.
- [ ] Lazy-load da Wiki, icon bundle e managers administrativos.
- [ ] Medir LCP/CLS/INP das paginas principais com assets reais.
- [ ] Configurar cache/CDN adequado para imagens publicas.

### Erros e observabilidade

- [ ] Evitar `catch` que transforma indisponibilidade em lista vazia sem feedback.
- [ ] Incluir correlationId nas mensagens operacionais de suporte quando seguro.
- [ ] Testar agrupamento, atribuicao, resolucao e reabertura de SystemError.
- [ ] Definir retencao real para auditoria/comercial/financeiro.

## LOW

### UI/UX

- [ ] Uniformizar telas antigas com tokens v1.5 sem bloquear o beta.
- [ ] Melhorar estados skeleton e retry onde hoje ha apenas texto.
- [ ] Revisar consistencia de acentos/encoding no browser.
- [ ] Revisar acessibilidade de labels, foco, contraste e leitores de tela.

### Manutencao

- [ ] Dividir `apps/web/pages/wiki.vue` em modulos menores depois da estabilizacao.
- [ ] Decidir se `CommunityTask` sera adaptado ou migrado para `AdminTask`.
- [ ] Atualizar/remover documentos historicos que contradizem o codigo atual.
- [x] Adicionar lint frontend. (Etapa 5: ESLint 10 flat config cobrindo apps/web/apps/api/packages/shared -- `npm run lint`.)
- [ ] Adicionar testes unitarios para services criticos.

## Ordem pratica recomendada

1. Reconciliar e homologar o worktree Community/migrations.
2. Fechar autenticacao/recuperacao e matriz de permissoes.
3. Executar E2E Community com storage realista.
4. Homologar loja/marketplace/GameBridge com rollback.
5. Eliminar dados falsos das superficies publicas.
6. Fazer QA mobile, seguranca, performance e smoke de producao.
7. Abrir beta controlado com observabilidade e plano de rollback.

## Claude Code - Recommended Starting Point

1. Ler `site-current-state.md`, `community-current-state.md` e o worktree atual.
2. Comecar pelo blocker Community/migrations, nao por refinamento visual.
3. Continuar o E2E minimo e substituir mocks no caminho real.
4. Usar Nuxt, NestJS, Prisma/MySQL, MediaService, Auth e Observability existentes.
5. Rodar checks atuais e criar testes em banco descartavel.
6. Nao tocar producao/GameBridge nem aplicar migration sem backup/rollback.
7. Tratar qualquer lista vazia como possivel erro mascarado antes de concluir que nao ha dados.
8. Considerar concluido quando blockers estiverem validados com usuario real de teste,
   logs/auditoria e comportamento mobile aceitavel.
