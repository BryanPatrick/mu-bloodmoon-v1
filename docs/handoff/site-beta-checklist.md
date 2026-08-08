# BloodMoon - checklist para beta aberto

Baseado na auditoria estatica e nas verificacoes de 2026-08-08. Itens nao foram
marcados como concluidos sem evidencia runtime. Prioridade responde primeiro a:
"o que impede usuarios reais de usar o portal com seguranca?"

## BLOCKER

### Comunidade

- [ ] Preservar/revisar o diff local Community antes de qualquer merge.
- [ ] Homologar as tres migrations Community em clone descartavel do MySQL.
- [ ] Executar E2E autenticado de perfil, upload, post, edicao, exclusao, comentario,
  resposta, reacao, save, repost, follow, block e denuncia.
- [ ] Remover o fallback silencioso de perfil mockado no caminho de usuario real.
- [ ] Garantir que falha de API nao seja exibida como conteudo inventado.

### Autenticacao e seguranca

- [ ] E2E de cadastro, login, refresh, logout, sessao unica e 2FA com banco de teste.
- [ ] Implementar recuperacao de senha real com token curto, expiração e invalidacao.
- [ ] Revisar armazenamento de access/refresh token no browser e protecao XSS.
- [ ] Validar rate limit para login, cadastro, recuperacao, posts, comentarios e upload.
- [ ] Testar matriz PLAYER/ADMIN/SUPER_ADMIN e overrides de permissao no backend.
- [ ] Confirmar segredo/`.env` apenas no ambiente e executar secret scan antes do beta.

### Loja e marketplace

- [ ] Homologar compra, saldo, idempotencia, entrega, retry, estorno e auditoria.
- [ ] Homologar escrow completo: entrada, reserva, venda, entrega, retorno e rollback.
- [ ] Simular concorrencia para impedir compra/entrega duplicada.
- [ ] Bloquear operacoes reais quando GameBridge estiver indisponivel/inconsistente.

### Deploy/producao

- [ ] Backup restauravel do MySQL, storage e build antes da liberacao.
- [ ] Aplicar migrations somente apos backup e teste de rollback.
- [ ] Configurar storage persistente/backup para midia Community.
- [ ] Smoke test HTTPS de web, API, banco, uploads, downloads e jobs.
- [ ] Configurar logs/alertas para falha de banco, entrega, escrow e storage.

## HIGH

### Comunidade

- [ ] Substituir profile/user rail mock por dados reais ou estado vazio honesto.
- [ ] Substituir anuncios/right rail mock por conteudo administrativo ou ocultar blocos.
- [ ] Adicionar paginacao/infinite loading visivel ao feed.
- [ ] Ligar hover card e follow/unfollow em todos os locais de username.
- [ ] Validar privacidade de perfil/personagem/equipamento/stats/guild/atividade.
- [ ] Implementar notificacoes persistidas para mencoes, comentarios, follow e conquistas.
- [ ] QA de moderacao, revisoes, soft delete e historico administrativo.

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
- [ ] Implementar mute e colecoes de salvos.
- [ ] Definir ciclo de limpeza de midia temporaria/orfa.
- [ ] Converter GIF pesado para formato de video quando apropriado.

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
- [ ] Adicionar lint frontend.
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
