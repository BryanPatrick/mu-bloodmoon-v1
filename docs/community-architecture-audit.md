# Community Blood Moon - auditoria e arquitetura inicial

## Escopo desta etapa

Esta etapa apenas consolida o estado atual e define a fundacao modular da Community. Nao inclui a reconstrucao pesada da interface, feed recomendado, publicidade, guilds sociais ou notificacoes em tempo real.

Regra central: a identidade social pertence a `Account`. Personagens do MU sao dados associados a essa conta e nunca perfis sociais independentes.

## 1. Estrutura atual verificada

### Aplicacoes

- Frontend: Nuxt 4, Vue 3 e Nuxt UI em `apps/web`.
- API: NestJS em `apps/api`.
- Banco: Prisma com MySQL em `apps/api/prisma/schema.prisma`.
- Autenticacao: JWT de acesso e renovacao, sessoes persistidas e permissoes granulares.
- Observabilidade: auditoria, tarefas administrativas, erros do sistema, eventos operacionais e correlation ID ja possuem infraestrutura compartilhada.

### Community existente

Frontend atual:

- `apps/web/pages/comunidade.vue`: composer, feed, reacoes, comentarios, denuncias, editor de perfil e quests.
- `apps/web/pages/comunidade/perfil/[username].vue`: perfil publico.
- `apps/web/components/community`: toolbar, paginacao, acoes e gerenciador administrativo.
- `apps/web/pages/painel/admin/comunidade.vue`: entrada administrativa.

Backend atual:

- `apps/api/src/modules/community/community.controller.ts`: operacoes publicas e autenticadas.
- `apps/api/src/modules/community/community-admin.controller.ts`: moderacao e gestao.
- `community.service.ts` e `community-admin.service.ts`: regras de negocio existentes.
- `community.contract.ts`: contratos de entrada.

Entidades existentes:

- `CommunityProfile`
- `CommunityPost` e `CommunityPostRevision`
- `CommunityComment`
- `CommunityReaction`
- `CommunityReport`
- `CommunityModerationAction`
- `CommunityAchievement` e `CommunityAchievementGrant`
- `CommunityQuest` e `CommunityQuestParticipant`
- `CommunityBadge` e `CommunityBadgeGrant`
- `CommunityPolicy`
- `CommunityTask`

### Conta, personagem e guild

- `Account` e a identidade autenticada e possui no maximo um `CommunityProfile`.
- `AccountCharacter` pertence a `Account` e contem classe, nivel, resets, mapa e guild.
- A guild ainda e apenas uma string em `AccountCharacter`; nao existe entidade de guild, membros, cargos ou pagina social.

### Permissoes administrativas

Ja existem permissoes separadas para visualizar Community, moderar posts, comentarios, denuncias e usuarios, gerenciar conquistas, quests, badges, politicas, tarefas e analytics. O backend aplica guardas por permissao, sem depender apenas do papel ADM.

### Midia e notificacoes

- O CMS administrativo possui upload local validado para imagens.
- A Community ainda recebe URL de midia no composer; nao possui biblioteca, propriedade, processamento ou ciclo de vida de midia proprio.
- A pagina pessoal de notificacoes agrega noticias e eventos. Nao existe uma entidade de notificacao por usuario, preferencia, leitura ou entrega.

## 2. O que pode ser reaproveitado

- Conta, sessao, personagem e moedas existentes.
- Perfil social vinculado a conta.
- Posts, comentarios, reacoes, revisoes e denuncias.
- Moderacao, politicas antispam e limitacoes temporarias.
- Conquistas, quests e badges.
- Auditoria, logs de trabalho, tarefas, erros e correlation ID compartilhados.
- Nuxt UI, tokens visuais e componentes de layout existentes.
- API de conteudo para publicacoes oficiais, eventos e futuras insercoes automaticas controladas.

## 3. Lacunas para a visao definitiva

### Modulos inexistentes

- `SocialGraph`: seguir, deixar de seguir, bloquear, silenciar e sugestoes.
- `Guilds`: guild, membros, cargos, pagina, eventos e moderacao.
- `Saved`: posts, perfis, eventos e buscas salvas.
- `Notifications`: caixa de entrada, preferencias, lidas, canais e entrega.
- `Media`: upload, propriedade, variantes, moderacao e remocao.
- `CommunityEvents`: eventos sociais e vinculacao com eventos do jogo.
- `Ads`: campanha, criativo, posicionamento, periodo, impressao e clique.
- `Statistics`: snapshots autorizados e configuracao de privacidade.
- `Search`: indice unificado para pessoas, guilds, posts, tags e eventos.
- `Feed`: preferencias, fontes, ranking, recomendacao e explicacao do motivo da recomendacao.

### Recursos parciais

- Perfil tem apenas `isPublic`; faltam controles separados para personagens, guild, conquistas, estatisticas e atividade.
- Post suporta midia em JSON, mas nao ha entidade de asset nem upload proprio.
- Reacao existe, mas compartilhamento, mencao, hashtag, colaboracao e bookmark nao.
- Quests e conquistas existem, mas ainda nao formam os blocos completos da home em tres colunas.
- `CommunityTask` duplica responsabilidades de `AdminTask` e deve ser migrada ou adaptada para a central compartilhada.

## 4. Arquitetura proposta

### Frontend

```text
apps/web/features/community/
  shell/
  feed/
  profiles/
  posts/
  media/
  social-graph/
  achievements/
  quests/
  events/
  ads/
  statistics/
  notifications/
  moderation/
  search/
  settings/
```

As paginas em `apps/web/pages/comunidade` devem apenas compor features. A pagina principal nao deve concentrar chamadas, formularios, cards e regras de todos os modulos.

Componentes compartilhados previstos:

- `CommunityShell`
- `CommunitySubheader`
- `CommunityLeftRail`
- `CommunityFeed`
- `CommunityRightRail`
- `CommunityComposer`
- `CommunityPostCard`
- `BloodMoonHoverCard`

Usar `UUser`, `UAvatar`, `UBadge`, `UTooltip` e `UPopover` como base e aplicar a identidade Blood Moon por variantes, sem duplicar primitivas do Nuxt UI.

### API

```text
apps/api/src/modules/community/
  feed/
  profiles/
  posts/
  media/
  social-graph/
  achievements/
  quests/
  events/
  ads/
  statistics/
  notifications/
  moderation/
  search/
  settings/
```

O modulo raiz deve apenas registrar os submodulos. Auditoria, observabilidade e tarefas permanecem servicos compartilhados do sistema.

## 5. Entidades novas propostas

- `CommunityFollow`, `CommunityBlock`, `CommunityMute`
- `CommunitySavedItem`
- `CommunityMediaAsset`
- `CommunityNotification`, `CommunityNotificationPreference`
- `CommunityEvent`, `CommunityEventParticipant`
- `CommunityAdCampaign`, `CommunityAdCreative`, `CommunityAdPlacement`, `CommunityAdEvent`
- `CommunityStatisticSnapshot`, `CommunityPrivacySetting`
- `CommunityFeedPreference`
- `CommunityTopic`, `CommunityPostTopic`, `CommunityMention`
- `Guild`, `GuildMember`, `GuildRole`, `GuildCommunitySettings`
- `GameActivityPolicy`, com modos `MANDATORY`, `OPTIONAL` e `DISABLED`
- `GameActivityPostLink`, para impedir duplicacao e permitir rastreabilidade

Todos os modelos novos devem ter indices, soft delete quando aplicavel, autor, datas, auditoria e politica de retencao antes da migracao.

## 6. Riscos e decisoes obrigatorias

1. Tokens de acesso e renovacao ainda sao persistidos em `localStorage`. Isso aumenta o impacto de XSS; a evolucao recomendada e cookie `HttpOnly`, `Secure` e `SameSite` emitido pela API.
2. `comunidade.vue` ja esta monolitica. Adicionar a nova home diretamente nela aumentara acoplamento e regressao.
3. URLs externas de midia nao garantem propriedade, disponibilidade ou moderacao. A biblioteca propria deve vir antes de posts ricos.
4. Guild como texto nao sustenta pagina social, cargos ou recomendacao. Criar a entidade antes da experiencia de Guilds.
5. Notificacoes atuais sao noticias agregadas, nao notificacoes pessoais. Nao reutilizar essa tela como se fosse inbox social sem persistencia.
6. `CommunityTask` e `AdminTask` nao devem continuar como duas centrais concorrentes.
7. Conteudo automatico do jogo exige consentimento, visibilidade, idempotencia e politica por tipo de evento antes de ser publicado.
8. Publicidade deve ser identificada, auditavel e separada de recomendacao organica. Os dois primeiros blocos da coluna direita serao `MERCHAN 01` e `MERCHAN 02`.

## 7. Plano incremental

### Fase 1 - fundacao da interface e contratos

- Dividir a pagina atual em shell, subheader, tres colunas e componentes de feed.
- Manter comportamento existente durante a extracao.
- Criar contratos de privacidade, midia e notificacao sem ativar recursos incompletos.
- Migrar `CommunityTask` para `AdminTask` ou criar adaptador de compatibilidade.

### Fase 2 - perfil, midia e grafo social

- Privacidade granular.
- Upload e biblioteca de midia.
- Seguir, bloquear e silenciar.
- Personagem principal como referencia da conta, nao como perfil.

### Fase 3 - feed e publicacoes

- Implementado: feed simples `for-you`, seguido e recente.
- Implementado: hashtags, mencoes, repost interno e salvos.
- Implementado: labels que explicam origem editorial e social do conteudo.
- Pendente: ranking de em alta baseado em sinais persistidos e explicacao
  detalhada de recomendacao quando houver algoritmo alem da regra simples.

### Fase 4 - navegacao social

- Busca unificada.
- Notificacoes persistidas e preferencias.
- Paginas Explorar, Salvos e Criar.

### Fase 5 - guilds, eventos, quests e conquistas

- Entidades de guild e membros.
- Eventos sociais.
- Blocos laterais e atalhos da home.

### Fase 6 - publicidade

- Campanhas, criativos, posicionamentos, metricas e moderacao.
- `MERCHAN 01` e `MERCHAN 02` antes dos demais itens da coluna direita.

### Fase 7 - integracao com o jogo e estatisticas

- Politicas `MANDATORY`, `OPTIONAL` e `DISABLED`.
- Eventos idempotentes e auditados.
- Snapshots de estatisticas com privacidade.

### Fase 8 - endurecimento administrativo

- Filas de moderacao, relatorios, alertas, retencao, exportacao e testes de permissao.

## 8. Primeira implementacao recomendada

A proxima etapa deve ser pequena: extrair a Community atual para `CommunityShell`, `CommunitySubheader`, `CommunityFeed`, `CommunityComposer` e os tres rails sem mudar o contrato da API. O aceite exige paridade funcional, desktop em tres colunas, mobile em uma coluna e nenhuma regressao em publicar, comentar, reagir, denunciar ou editar perfil.
