# BloodMoon - checklist para beta aberto

Baseado na auditoria estatica e nas verificacoes de 2026-08-08. Itens nao foram
marcados como concluidos sem evidencia runtime. Prioridade responde primeiro a:
"o que impede usuarios reais de usar o portal com seguranca?"

**Community: `COMMUNITY_BETA_READY`** (Etapa 16 -- gate de release formal,
checklist completo revalidado, 111/111 PASS, zero BLOCKER no
codigo/funcionalidade da Community; 2 riscos HIGH documentados, nenhum deles
um BLOCKER de codigo -- ver
community-current-state.md#gate-de-release-para-beta-etapa-16 para o
relatorio completo e a decisao formal registrada no Hub).

**Site inteiro: `SITE_BETA_BLOCKED`** (Etapa 17 -- pente-fino completo,
6 agentes de auditoria de codigo em paralelo + QA ao vivo em navegador real
contra o build de producao + quality gate. 6 BLOCKERs confirmados: recuperacao
de senha inexistente, CAPTCHA decorativo/sem rate limit real em login e
cadastro, loja sem gateway de pagamento/entrega automatizada, marketplace/
escrow/GameBridge sem homologacao real, paginas 404 quebrando em erro cru
("500 undefined") confirmado ao vivo em producao, e zero teste automatizado
fora de Community. Ver
site-current-state.md#auditoria-site-wide-etapa-17 para o relatorio completo
por modulo e a classificacao BLOCKER/HIGH/MEDIUM/LOW. Nenhum BLOCKER foi
corrigido nesta etapa -- tasks especificas foram criadas no Hub para cada um,
por instrucao explicita do brief.)

## Gate final de release (Etapa 18): `NO-GO`

Objetivo: determinar se o BloodMoon esta tecnicamente pronto para receber
usuarios reais e divulgacao publica, revisando Community Gate + Site-wide
Gate + seguranca + migrations + backups + rollback + API/MySQL/GameBridge/
fronteira SQL Server + uploads + auth + admin + marketplace + loja +
launcher + monitoramento + dominio/HTTPS + producao. Regra do brief: nunca
declarar GO com blocker conhecido. **Nenhum deploy foi executado ou
sera executado sem autorizacao explicita do operador -- este gate e so
avaliacao, exatamente como pedido.**

### Confirmacoes exigidas pelo brief

| Confirmar ausencia de... | Status |
|---|---|
| BLOCKERS conhecidos | **NAO CONFIRMADO** -- 5 BLOCKERs operacionais permanecem abertos no Hub; CAPTCHA, 404 e HTTPS foram resolvidos nas Etapas 19.2, 19.4 e 19.5. |
| Mocks em fluxo critico | Confirmado ausente em Community e nos modulos auditados na Etapa 17 (loja/marketplace/auth nao tem mock -- o problema neles e ausencia de implementacao real, nao mock mascarando). Home tem 2 noticias falsas fixas misturadas ao conteudo real (MEDIUM, nao um fluxo critico de transacao). |
| Credentials expostas | **CONFIRMADO -- pior do que o relatado na Etapa 17/18.** Etapa 19.1 descobriu que a mesma credencial real de banco de producao (`BLOODMOON_DB_PRODUCTION_CREDENTIAL`, MySQL) nao estava so em 2 arquivos locais gitignored -- estava tambem **commitada num arquivo rastreado** (`deploy/CPANEL_NODE_DEPLOY.md`), presente em `origin/main` desde commits antigos (anteriores a esta sessao), e o repositorio GitHub `BryanPatrick/mu-bloodmoon-v1` esta **confirmado PUBLICO** (HTTP 200 sem autenticacao). A credencial deve ser tratada como comprometida. Remediado nesta etapa: (1) linha redigida no arquivo rastreado e enviada ao repositorio; (2) 14 arquivos locais adicionais em `work/` (nao so os 2 originais) tambem continham a mesma credencial e foram higienizados/transformados em template sem valor; (3) confirmado que o codigo da aplicacao sempre referenciou `DATABASE_URL` via variavel de ambiente (Prisma `env("DATABASE_URL")`), nunca hardcoded -- o vazamento era so em documentacao/arquivos de operacao, nunca no codigo; (4) confirmado que a credencial nao aparece no bundle/build (`apps/web/.output`, `apps/api/dist`) nem em `runtimeConfig.public` do Nuxt. **Rotacao da senha real no cPanel continua pendente e depende do operador.** Ver a task BLOCKER correspondente no Hub para o plano exato. Valor da credencial nunca reproduzido em nenhum documento/resposta/log. |
| Migration nao homologada | Parcialmente confirmado ausente -- as 3 migrations pendentes da Community estao homologadas tecnicamente (`APPROVED_FOR_PRODUCTION`, Etapa 6) mas **nunca foram aplicadas em ambiente real**, so em container descartavel. Nenhuma das 17 migrations tem rollback automatizado (`down.sql`) -- a unica recuperacao e restaurar backup completo do banco, nunca testado contra producao. |
| Operacao comercial nao testada | **NAO CONFIRMADO** -- loja e marketplace confirmados sem nenhum teste automatizado e sem homologacao real (ver BLOCKERs 3 e 4 da Etapa 17). GameBridge nunca processou um job real (worker sempre falha por design). |
| Rota critica quebrada | **CORRIGIDO NA ETAPA 19.4** -- rotas inexistentes e recursos/API 404 possuem tratamento coerente e nao exibem mais `500 undefined`. |

### Etapa 19.5: HTTPS obrigatorio em producao

A verificacao ao vivo corrigiu a inferencia anterior: ausencia de TLS no
repositorio nao significa ausencia de TLS no hosting. Root, `www` e API possuem
certificados Let's Encrypt validos, negociam TLS 1.2/1.3 e respondem por HTTPS.
O caminho real e DNS HiNetworks -> LiteSpeed/cPanel -> Passenger/Nuxt/Nest,
sem Cloudflare no proxy atual. `deploy/nginx.bloodmoon.conf` e somente um
template legado e nao atende o trafego de producao.

Force HTTPS Redirect foi habilitado no cPanel para o dominio principal e API.
Root, `www`, Login e API agora retornam `301` para HTTPS, preservando path/query,
em um unico salto e sem loop. A regressao de Home, Login, Wiki, Roadmap,
Downloads, API, CORS, assets e fontes passou. HSTS do site principal permanece
hardening separado; a API ja envia HSTS. Evidencias e matriz em
`docs/handoff/production-tls-validation.md`.

### Backups, rollback, monitoramento -- status factual (Documentado vs Implementado)

| Item | Status |
|---|---|
| Backup (cPanel/MySQL) | **IMPLEMENTADO** -- `deploy/scripts/cpanel-production-backup.sh` real e executavel (mysqldump, checksum, lockfile, pronto para cron). Retencao local de so 3 dias por padrao; copia externa (`RCLONE_REMOTE`) e opcional e nao confirmada como configurada de fato. |
| Backup (VPS do jogo) | Script existe mas cobre so o site PHP antigo, invocado manualmente -- sem cron/automacao para o stack novo do BloodMoon nesse caminho. |
| Rollback de aplicacao (troca de site) | **SO DOCUMENTADO** -- runbook manual escrito (`deploy/GAME_VPS_BACKUP_AND_DEPLOY.md:186-194`), nenhum script automatiza. |
| Rollback de migration | **SO DOCUMENTADO** -- nenhuma das 17 migrations tem `down.sql`; unica recuperacao e restaurar backup completo do banco (nao por-migration), estrategia nunca executada contra producao. |
| Seguranca de aplicacao de migration | Parcial -- sequencia de seguranca (backup->migrate->validar->rollback testado) esta documentada como plano em `deployment-architecture.md:138-148,185-192`, mas nunca foi executada de fato. |
| Dominio/HTTPS | **IMPLEMENTADO** -- certificados validos e Force HTTPS ativo em root, `www` e API; HSTS do site principal e hardening separado. |
| Monitoramento/logging (nivel de app) | **IMPLEMENTADO** -- correlationId, AuditLog real, fingerprinting de erro, retencao configuravel (`docs/observability-and-audit.md`) -- ja confirmado funcional pela Community e pelo painel administrativo (Etapa 17). |
| Monitoramento/logging (nivel de infra) | **NENHUM DOS DOIS** -- nenhum APM/Sentry/uptime-checker/agregador de log encontrado. `docker-compose.production.yml` tem healthcheck local de container, nao monitoramento de producao real; o alvo de deploy real (cPanel/VPS) nem usa esse compose. |

### Resultado final: `NO-GO`

**Motivo**: existem BLOCKERs conhecidos (regra do brief: nunca declarar GO
nessa condicao). Nenhum checklist de deploy separado foi gerado, pois o
brief so pede isso em caso de GO.

**Exatamente o que falta (tasks ja criadas no Hub, nao uma so
refatoracao)**:

1. `e641176f` -- Recuperacao de senha real (token, expiracao, e-mail).
2. `88ebaa56` -- Loja: gateway de pagamento real + entrega automatizada
   (ou pelo menos processo real de entrega).
3. `fb796d14` -- Marketplace/escrow/GameBridge: worker real + remover
   endpoints administrativos de desenvolvimento.
4. `305947d6` -- Cobertura minima de teste automatizado fora de
   Community (login/cadastro, compra na loja, listagem no marketplace).
5. `01a7e88f` -- Rotacionar a credencial de banco de producao exposta e
   atualizar os consumidores autorizados.

**Resolvidos depois da Etapa 18:** protecao contra abuso de autenticacao
(`20921b4d`, Etapa 19.2), tratamento global/404 (`47eadd58`, Etapa 19.4) e
HTTPS obrigatorio (`fbd01471`, Etapa 19.5).

**Alem das 5 tasks BLOCKER restantes**, antes de reavaliar GO tambem e necessario
(sem task dedicada -- ja rastreado nas secoes BLOCKER "Deploy/producao"
deste documento): aplicar as 3 migrations da Community em producao com
backup+rollback testado de verdade (nao so documentado), configurar
retencao/copia externa real de backup, e decidir/priorizar monitoramento
de infraestrutura (APM/uptime) antes de divulgacao ampla.

Decisao formal `NO-GO` registrada no AI Knowledge Hub.

## BLOCKER

### Comunidade

- [x] Preservar/revisar o diff local Community antes de qualquer merge. (Etapa 5: auditado via `git status`/`git diff --stat`, catalogado no Hub, nada descartado -- ver docs/handoff/community-current-state.md.)
- [x] Homologar as tres migrations Community em clone descartavel do MySQL. (Etapa 6: aplicadas em sequencia real em container MariaDB descartavel e isolado, todas classificadas ADDITIVE, todas `APPROVED_FOR_PRODUCTION` -- ver docs/handoff/community-current-state.md#homologacao-das-migrations-etapa-6. Ainda nao aplicadas em nenhum ambiente real; E2E autenticado completo continua pendente, ver item abaixo.)
- [x] Executar E2E autenticado de perfil, upload, post, edicao, exclusao, comentario,
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
  community-current-state.md#administracao-da-community-etapa-13). **Etapa 14:
  jornada E2E ponta a ponta unica** consolidando os 18 passos reais do usuario
  (cadastro -> login -> perfil -> edicao -> avatar -> post -> feed -> visualizar
  -> comentario -> reacao -> save -> repost -> perfil de outro usuario -> edicao
  indevida -> denuncia -> moderacao -> administracao -> logout/login ->
  persistencia apos nova sessao) --
  `apps/api/test/community-e2e-journey.e2e-spec.ts`, 22/22 PASS, incluindo
  401/403/404/validacao/falha-de-storage/estados-vazios explicitos. Nenhum bug
  funcional novo encontrado -- etapa de homologacao/organizacao, nao de
  correcao. "API indisponivel" documentado como nao aplicavel (Community nao
  tem dependencia sincrona externa), ver
  community-current-state.md#validacao-e2e-completa-etapa-14 para o relatorio
  PASS/FAIL/BLOCKER completo. Combinado: `npm run api:test:e2e` **111/111
  PASS**, 8 suites. QA visual autenticado em navegador (clicar criar/editar/
  excluir, incluindo o painel admin) continua pendente -- bloqueado por
  captcha no cadastro, ver community-current-state.md#feed-e-posts-etapa-9.
  **Status da Community: `BETA_READY`** (nenhum BLOCKER funcional encontrado
  na Community; outras areas do site continuam com blockers proprios, ver
  secoes abaixo.))
- [x] Remover o fallback silencioso de perfil mockado no caminho de usuario real. (Etapa 7: `stage-two.mock.ts` deletado; `pages/comunidade/[username].vue` usa somente dado real, com estados loading/error/not-found explicitos.)
- [x] Garantir que falha de API nao seja exibida como conteudo inventado. (Etapa 7, escopo perfil: erro real -> estado de erro real, nunca dado inventado. Demais telas Community fora do escopo desta etapa.)
- [x] Corrigir exposicao de dados internos/moderacao no perfil publico da Community. (Etapa 11:
  `publicProfile()` vazava `socialSuspendedUntil`/`postBlockedUntil`/`warningCount`/etc. do
  `CommunityProfile` e `grantedBy`/`reason` de achievement/badge grants (identificador de admin +
  justificativa interna) para QUALQUER visitante, incluindo anonimo. Corrigido trocando `include`
  cego por `select` explicito. `email`/senha/role nunca estiveram expostos -- confirmado, nao era
  parte do bug. Ver community-current-state.md#perfis-e-relacionamentos-etapa-11.)

### Autenticacao e seguranca

- [ ] E2E de cadastro, login, refresh, logout, sessao unica e 2FA com banco de teste. (Etapa 17:
  confirmado zero teste -- nem E2E nem unitario -- cobre qualquer parte de auth/cadastro/
  recuperacao/2FA/perfil. Fica pendente.)
- [x] Corrigir race de concorrencia no `JwtAuthGuard` que podia causar 401 falso ("sessao invalida")
  em requisicoes autenticadas simultaneas legitimas (ex.: duplo-clique). (Etapa 10: encontrado
  escrevendo o teste de concorrencia de reacoes/saves/reposts da Community -- o guard fazia um
  `UPDATE AccountSession.lastSeenAt` em toda requisicao e tratava QUALQUER erro dai como token
  invalido; duas requisicoes concorrentes da mesma sessao podiam colidir nesse UPDATE (MySQL 1020)
  e a perdedora era deslogada por engano. Afeta toda a API, nao so Community. Corrigido isolando
  esse UPDATE em seu proprio try/catch -- ver community-current-state.md#interacoes-sociais-etapa-10.)
- [ ] **BLOCKER (Etapa 17):** Implementar recuperacao de senha real com token curto, expiração e
  invalidacao. Confirmado 100% ausente -- `recuperar-conta.vue:63-72` e sincrono, nunca chama a
  API, sempre mostra sucesso falso se o e-mail nao estiver vazio. Nao ha rota no backend, nao ha
  model de token, nao ha infraestrutura de e-mail/SMTP em `apps/api` (grep zero resultados). Ver
  site-current-state.md#auditoria-site-wide-etapa-17.
- [ ] Revisar armazenamento de access/refresh token no browser e protecao XSS. (Etapa 17: confirmado
  que ambos os tokens ficam em `localStorage` -- `useAuth.ts:70,97-101,155-174` -- nao em cookie
  httpOnly. Nenhum vetor de XSS confirmado nesta etapa, mas a exposicao factual existe caso um
  surja em qualquer parte do app.)
- [ ] **BLOCKER (Etapa 17):** Validar rate limit para login, cadastro, recuperacao, posts,
  comentarios e upload. Confirmado: **zero rate limit no backend** para login/cadastro
  (`ThrottlerGuard` so existe no upload de midia da Community, 10/60s). O "bloqueio" de tentativas
  de login e client-side apenas (`localStorage`, `useAuth.ts:50-53,74-75,272-290`), contornavel
  chamando a API direto. **Alem disso, o CAPTCHA de cadastro e puramente decorativo**:
  `registrar.vue:70-71` e um array fixo de 4 codigos validado so no browser, o campo nunca e
  enviado ao backend, `AuthService.register()` nao tem nenhuma validacao de captcha. Cadastro em
  massa e credential-stuffing sao possiveis hoje sem nenhuma barreira real. Ver
  site-current-state.md#auditoria-site-wide-etapa-17.
- [ ] Testar matriz PLAYER/ADMIN/SUPER_ADMIN e overrides de permissao no backend. (Etapa 12,
  escopo Community apenas: confirmado que PLAYER recebe 401/403 real em endpoint administrativo
  (E2E); confirmado que `role: 'ADMIN'` sozinho NAO concede `admin.community.*` automaticamente
  -- so `SUPER_ADMIN` (wildcard) ou overrides explicitos em `AccountPermission`. Etapa 13: matriz
  estendida por E2E a todo o painel administrativo da Community (posts, comentarios, denuncias,
  usuarios/moderacao, catalogos, policy, tarefas, analytics) -- confirmado que um moderador com
  overrides granulares reais age exatamente no que foi concedido e recebe 403 em qualquer acao
  fora do escopo, nao um binario `role === 'ADMIN'`. Etapa 17: confirmado por auditoria de codigo
  (nao E2E) que o mesmo `PermissionsGuard` compartilhado e usado site-wide -- contas
  administrativas fora de Community seguem o mesmo modelo, sem divergencia. Matriz completa por
  E2E dedicado continua so em Community.)
- [ ] Confirmar segredo/`.env` apenas no ambiente e executar secret scan antes do beta. (Etapa 17:
  scan de codigo confirmado limpo -- nenhum segredo hardcoded em arquivos versionados. Achado
  sensivel: uma credencial real de banco de producao existe em texto plano num arquivo local
  gitignored, nao versionado -- recomendado migrar para gerenciador de segredos e rotacionar se o
  arquivo ja circulou. Valor nao reproduzido em nenhum documento por seguranca.)

### Loja e marketplace

- [ ] **BLOCKER (Etapa 17):** Homologar compra, saldo, idempotencia, entrega, retry, estorno e
  auditoria. Confirmado: **nenhum gateway de pagamento existe no codigo** (zero dependencia
  Stripe/PagSeguro/Mercado Pago, zero webhook) -- "compra" e so debito imediato de moeda virtual
  (`commerce.service.ts:435-586`, `PurchaseIntent` nasce `PAID` na hora). Entrega e 100% manual via
  admin clicando "Concluir" -- nao existe worker/fila automatica (o proprio painel documenta isso
  em `store-admin.service.ts:1217`). Sem idempotencia no purchase-intent (`correlationId` gerado
  pelo servidor, nao dedupllica duplo-clique/duas abas). Debito de saldo/estoque em si e
  transacional (ponto positivo real), mas entrega travada/falha deixa dinheiro debitado sem
  estorno automatico. Ver site-current-state.md#auditoria-site-wide-etapa-17.
- [ ] **BLOCKER (Etapa 17):** Homologar escrow completo: entrada, reserva, venda, entrega, retorno
  e rollback. Escrow em si e um ledger real com transacoes DB e reserva atomica contra venda dupla
  (`marketplace.service.ts:398-404`) -- mas ver GameBridge abaixo: nada conclui uma venda de forma
  automatica mesmo com o escrow correto.
- [ ] Simular concorrencia para impedir compra/entrega duplicada. (Etapa 17: reserva de listagem via
  `updateMany` condicional confirmada real -- protege contra venda dupla. Purchase-intent do
  commerce nao tem idempotencia client-side, ver item acima.)
- [ ] **BLOCKER (Etapa 17):** Bloquear operacoes reais quando GameBridge estiver
  indisponivel/inconsistente. Confirmado: o worker (`apps/api/scripts/process-game-bridge-jobs.mjs:
  129-135`) **sempre falha por design** ("MU bridge worker is not connected to the game database
  yet"), modo dry-run e o padrao, nenhuma conexao a SQL Server do jogo existe em `apps/api` hoje.
  Nao ha wiring automatico de "job concluido" -> "pedido/listagem concluido" -- isso e feito
  manualmente. Endpoints administrativos "de desenvolvimento"
  (`activateListing`/`updateListingStatus`/`updateOrderStatus`/`updateBridgeJob`,
  `marketplace.controller.ts:79-117`) pulam a maquina de estados e continuam vivos em producao,
  exatamente o que `docs/marketplace-game-bridge.md:101-103` e `docs/payment-and-escrow-flow.md:
  49-56` ja dizem que precisa ser removido antes de producao. Ver
  site-current-state.md#auditoria-site-wide-etapa-17.

### Site inteiro (Etapa 17)

- [x] **BLOCKER (Etapa 19.4):** Corrigir paginas 404 quebrando em erro cru de producao. A causa
  secundaria era o payload reducer do Pinia 2.3.1 chamando `hasOwnProperty` em um objeto sem
  prototipo durante a renderizacao de erro. `pinia`/`@pinia/nuxt` foram atualizados para as linhas
  compativeis atuais e `apps/web/error.vue` agora trata 403/404/500 sem expor stack ou mensagem
  interna. Validado no build SSR: rota HTML inexistente retorna HTTP 404 real, `noindex`, identidade
  Blood Moon e retorno seguro para a Home; o contrato JSON continua 404. Cobertura adicionada em
  `apps/web/test/error-presentation.test.mjs` e `apps/api/test/error-handling.e2e-spec.ts`.
- [ ] **BLOCKER:** Adicionar teste automatizado minimo (E2E ou unitario) para pelo menos os fluxos
  criticos fora de Community: login/cadastro, compra na loja, criacao de listagem no marketplace.
  Confirmado: `apps/api/src` nao tem nenhum `*.spec.ts`; `apps/api/test/` so tem specs de
  Community; `apps/web` nao tem nenhum teste. Todo o resto do site (auth, loja, marketplace,
  suporte, wiki, rankings, painel admin, observabilidade) roda sem nenhuma rede de seguranca
  automatizada.

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
- [x] Revisar UX/responsividade da Community (feed, post, perfil, comentarios, midia, modais,
  forms, admin/moderacao) em desktop/tablet/mobile, e estados loading/empty/error/toast/
  confirmation/disabled/focus/keyboard/overflow/username-longo/imagem-quebrada. (Etapa 15: 1 bug
  real corrigido -- botao "Seguir" do hover card era decorativo, nunca chamava a API. Gaps de UX
  corrigidos: double-submit sem guard (comentar, reagir, salvar, repostar, e todas as ~30 acoes do
  painel admin), toast/catch faltando em follow/unfollow e "carregar mais comentarios", estado
  vazio faltando na aba Midia do perfil, flash enganoso do card de perfil proprio durante loading,
  Escape-to-close ausente nos 3 dialogos customizados, truncamento ausente para username longo em
  todo lugar que renderiza um, fallback ausente para imagem quebrada em todo avatar/midia, grade de
  acoes do painel fixa em 3 colunas sem reflow mobile. Confirmacao nativa (`window.confirm`/
  `prompt`), lazy-loading de imagens e consistencia de framework CSS revisados e deliberadamente
  NAO alterados -- fora do escopo de polish sem redesenho/micro-otimizacao prematura. QA com
  navegador real (primeira vez nesta sessao) em desktop e mobile no fluxo anonimo, zero erro de
  console; fluxo autenticado continua nao verificavel visualmente (captcha). Ver
  community-current-state.md#ux-e-responsividade-etapa-15.)

### Paginas publicas e dados mock

- [ ] Remover textos/metricas ficticios da Home e traducoes antes de divulgacao. (Etapa 17:
  confirmado -- `index.vue:132-137` mistura 2 noticias falsas fixas ("Notas de patch 0.5",
  "Previa do evento de lancamento", datadas de 2026-05-18) com noticias reais sem NENHUMA
  distincao visual sempre que a API retorna menos de 2 itens reais. Tambem `Season 6` hardcoded
  em vez de vir de configuracao, `index.vue:22,160`.)
- [ ] Revisar noticias/eventos publicados e fallbacks editoriais. (Etapa 17: pagina de
  detalhe/artigo completo de noticia nao existe -- `noticias/[slug].vue` ausente, o campo
  "Conteudo" capturado no CMS admin nunca chega ao publico. "Eventos" nao e dominio proprio, e so
  um `kind` dentro do CMS unificado, sem pagina/calendario publico dedicado.)
- [ ] Decidir destino de `/guias` versus `/wiki` e evitar navegacao duplicada.
- [x] Confirmar ranking sincronizado com o servidor ou comunicar indisponibilidade. (Etapa 17:
  confirmado que Rankings e **100% um stub vazio, sem excecao** -- `useLocale.ts:23`, array
  hardcoded `[]`, sem fonte de dado alguma. Nao existe modulo `rankings` no backend, nenhum model
  no schema, nenhuma infraestrutura de cron/agendamento em todo `apps/api`. O estado vazio
  exibido e honesto (nao inventa dado), mas tambem nunca vai deixar de ser vazio sem trabalho
  novo de verdade -- movido para HIGH em vez de aberto como antes, ja que a comunicacao de
  indisponibilidade em si esta correta.)
- [x] Validar links atuais de launcher e cliente completo. (Etapa 17: confirmado ao vivo -- ambos
  os links (launcher v1.1.0, cliente completo v1.1.0) retornam HTTP 200 via HEAD request real.
  "Patch" e "Extras" mostram "Em breve" intencionalmente (`url: null` no codigo, nao quebrado).
  Mecanismo de auto-update do launcher e real e bem construido (RSA-2048+SHA-256+rollback), mas o
  manifesto de producao esta vazio -- nada para distribuir ainda.)

### Wiki

- [ ] Smoke de busca/filtros/equipamentos com API e base de producao clonada.
- [ ] **HIGH (Etapa 17):** o backend real de equipamentos (Prisma/DB, 613 itens/1031 variantes,
  pipeline de import real) **nao e usado pela propria pagina da Wiki**. `wiki.vue` nunca chama
  `wikiApi.equipment()`/`equipmentDetail()`/`summary()` -- carrega em vez disso um JSON estatico
  raspado de um site de fas externo (`guiamuonline.com`, 554 itens, numero diferente do banco
  real) via `apps/web/data/muEquipmentCatalog.ts`. Risco real de desalinhamento entre o que a
  Wiki mostra e o que o servidor realmente tem. O mesmo JSON e importado duas vezes por dois
  modulos quase-duplicados, gerando dois chunks de build de ~668KB/~376KB com o mesmo conteudo.
- [ ] A caixa de busca global da Wiki e decorativa -- `wikiSearch` (`wiki.vue:10`, ref na linha
  1540) nunca e lido em nenhum outro lugar do arquivo; parece funcional mas nao filtra nada.
- [ ] Confirmar que somente Season 6/Rage Fighter ou anterior e exibido ao publico.
- [ ] Verificar imagens ausentes e dados incompletos sem inventar atributos.
- [ ] Reduzir carregamento inicial de catalogos grandes por lazy loading/paginacao.

### Suporte e administracao

- [ ] E2E de abertura, atribuicao, resposta e resolucao de ticket. (Etapa 17: confirmado que o
  modulo real chama-se `support` (nao `tickets`) -- `apps/api/src/modules/tickets/` e codigo
  morto orfao, nunca registrado em `app.module.ts`, com tipos incompativeis com o schema real;
  recomendado remover para evitar confusao futura. Fila de tickets do admin funciona mas e "fina"
  -- sem filtro de status na UI, atribuicao so implicita.)
- [ ] Validar auditoria para toda acao administrativa sensivel. (Etapa 17: confirmado real e
  extenso via `AuditEvent`/`AdminWorkLog`/`OperationalEvent` -- todo o painel administrativo
  (contas, observabilidade, relatorios) grava trilha real. Ver riscos especificos abaixo.)
- [ ] Testar central de erros, alertas e exportacoes por permissao. (Etapa 17: confirmado real e
  bem conectado -- `SystemError` populado pelo filtro global de excecoes, alertas com
  reconhecimento/resolucao rastreados. Dois gaps: (1) politica de retencao e so um valor de
  configuracao, sem job de expurgo agendado real em lugar nenhum da API; (2) exportacao CSV do
  painel de observabilidade nao neutraliza injecao de formula (`=`,`+`,`-`,`@`), diferente da
  exportacao de relatorios administrativos que ja neutraliza -- risco real se um admin abrir um
  CSV exportado com texto controlado pelo usuario no Excel.)
- [ ] Reconciliar itens antigos de roadmap interno que ja foram implementados. (Etapa 17: Roadmap
  confirmado como o modulo mais maduro de todo o site -- workflow real completo, auto-publish
  agendado, SEO dinamico por item, nenhum problema relevante encontrado.)

### Mobile

- [ ] QA visual em 360, 390, 768, 1024 e desktop para Home, Wiki, Community,
  Marketplace, login e painel. (Etapa 15: escopo **Community** revisado -- responsividade
  existente confirmada por auditoria de codigo + navegador real em desktop/mobile no fluxo
  anonimo; gaps de mobile corrigidos (grade de acoes do painel admin). Home/Wiki/Marketplace/
  login/painel de conta continuam pendentes.)
- [ ] Testar drawers, header, composer, modais e tabelas com teclado/touch. (Etapa 15: escopo
  **Community** -- Escape-to-close adicionado aos 3 dialogos customizados (editor de perfil,
  drawer "Meu espaço", modal de post); demais paginas do site continuam pendentes.)

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

- [ ] Adicionar metadata/OG especifica para noticias, roadmap, produtos, anuncios e posts. (Etapa
  17: Roadmap ja tem SEO completo e dinamico por item (`[slug].vue:35`); Home/Noticias so tem
  titulo, sem descricao.)
- [ ] Definir canonical URLs para aliases e perfis.
- [ ] **HIGH (Etapa 17):** Gerar sitemap/robots coerentes com rotas privadas. Confirmado: **nao
  existe `robots.txt` nem geracao de sitemap em lugar nenhum** do projeto (nenhum modulo
  `@nuxtjs/robots`/`@nuxtjs/sitemap`, nenhum arquivo estatico). Favicon e real e proprio (nao o
  padrao do Nuxt) -- unico item deste bloco ja resolvido.
- [ ] Garantir que conteudo privado/administrativo nao seja indexado.

### Performance

- [ ] Investigar chunks acima de 500 kB reportados pelo build. (Etapa 17: causa raiz identificada
  para o maior deles -- import duplicado do mesmo JSON de detalhes de equipamento em
  `apps/web/data/muEquipmentCatalog.ts` e `guiamuonlineItems.ts` gera dois chunks de ~668KB/~376KB
  com conteudo identico. Corrigir consolidando num unico modulo elimina a duplicacao.)
- [ ] Lazy-load da Wiki, icon bundle e managers administrativos.
- [ ] Medir LCP/CLS/INP das paginas principais com assets reais.
- [ ] Configurar cache/CDN adequado para imagens publicas.

### Seguranca (Etapa 17)

- [ ] Customizar headers de seguranca (`helmet()`). Confirmado uso 100% default -- sem CSP/HSTS/
  frame-options proprios configurados em `apps/api/src/main.ts`.
- [ ] Restringir CORS a `localhost`/`127.0.0.1` apenas fora de producao. Confirmado que esses
  origins ficam liberados incondicionalmente mesmo quando `NODE_ENV=production`
  (`main.ts`, lista de origens).
- [ ] Centralizar resolucao de segredo JWT de fallback. Confirmado uma inconsistencia entre
  `auth.module.ts` (guarda `NODE_ENV`, impede boot sem segredo real em producao) e um ponto em
  `auth.service.ts:121,388` que usa o mesmo fallback sem a mesma guarda local -- hoje inofensivo
  (o module-level throw ja impede o boot), mas fragil a refatoracao futura.

### Erros e observabilidade

- [ ] Evitar `catch` que transforma indisponibilidade em lista vazia sem feedback. (Etapa 15: 1
  caso real corrigido na Community -- "carregar mais comentarios" tinha `finally` sem `catch`,
  falha virava rejeicao nao tratada e silenciosa; demais areas do site nao auditadas nesta etapa.)
- [ ] Incluir correlationId nas mensagens operacionais de suporte quando seguro.
- [ ] Testar agrupamento, atribuicao, resolucao e reabertura de SystemError. (Etapa 17: confirmado
  real -- `SystemError` fingerprinting/reabertura automatica ja funcionam via
  `observability.service.ts`.)
- [ ] Definir retencao real para auditoria/comercial/financeiro. (Etapa 17: confirmado que a
  politica de retencao (`ObservabilityRetentionPolicy`) e um valor de configuracao editavel real,
  mas **sem nenhum job de expurgo agendado** por tras -- nenhum `@Cron`/`ScheduleModule` existe em
  `apps/api`. A politica hoje nao apaga nada sozinha.)
- [ ] Neutralizar injecao de formula CSV na exportacao do painel de observabilidade (`=`,`+`,`-`,
  `@`) -- a exportacao de relatorios administrativos ja faz isso corretamente, a de
  observabilidade nao (Etapa 17).

## LOW

### UI/UX

- [ ] Uniformizar telas antigas com tokens v1.5 sem bloquear o beta.
- [ ] Melhorar estados skeleton e retry onde hoje ha apenas texto.
- [ ] Revisar consistencia de acentos/encoding no browser.
- [ ] Revisar acessibilidade de labels, foco, contraste e leitores de tela.

### Manutencao

- [ ] Dividir `apps/web/pages/wiki.vue` em modulos menores depois da estabilizacao.
- [ ] Decidir se `CommunityTask` sera adaptado ou migrado para `AdminTask`.
- [ ] Atualizar/remover documentos historicos que contradizem o codigo atual. (Etapa 17: confirmado
  que `docs/game-vps-sqlserver-transition.md` esta ela mesma desatualizada -- afirma que o schema
  usa provider `postgresql` quando o schema atual usa `mysql`. Adicionar a lista.)
- [x] Adicionar lint frontend. (Etapa 5: ESLint 10 flat config cobrindo apps/web/apps/api/packages/shared -- `npm run lint`.)
- [ ] Adicionar testes unitarios para services criticos.
- [ ] Remover modulo orfao `apps/api/src/modules/tickets/` (Etapa 17: nunca registrado em
  `app.module.ts`, tipos incompativeis com o `SupportTicket` real do schema -- risco de confusao
  futura, nao um bug ativo).
- [ ] Remover endpoint duplicado `admin-audit` (Etapa 17: `admin-observability` e o unico
  realmente usado pela UI -- `useAdminAuditApi` tem zero usos em qualquer `.vue`).
- [ ] Remover funcao morta `getMuEquipmentPage()` em `apps/web/data/muEquipmentCatalog.ts` (Etapa
  17: nunca chamada em lugar nenhum).

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
