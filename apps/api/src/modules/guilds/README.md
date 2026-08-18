# Guilds

Módulo greenfield (Etapa "Guilds MVP"). Diretório público `/guilds` e perfil
`/guild/[slug]`, mais administração. Nenhum domínio de Guild existia antes
desta etapa -- apenas vestígios decorativos (`AccountCharacter.guild`,
`CommunityProfile.guildName`), que permanecem intocados.

## Sincronização com o jogo (MU)

Sincronização real com a guild do jogo **ainda não existe**. `Guild` carrega
`source`, `gameGuildId/Name/Tag` e `syncStatus` desde já (todos nulos /
`PORTAL` / `NOT_LINKED` nesta rodada) para que uma ponte futura não exija
migração -- mas nenhuma lógica de sincronização roda hoje.

## Criação de guild

Dois caminhos, ambos sobre o mesmo núcleo (`GuildsService.createGuild`) --
nenhuma lógica duplicada entre eles:

- **Administrativa** (`POST admin/guilds`, `GuildsAdminService.createGuild`):
  latitude total, incluindo `leaderCharacterId` arbitrário.
- **Self-service** (`POST guilds`, `GuildsService.createGuildSelfService`,
  Guild Step 5.5): o personagem líder precisa pertencer à conta autenticada
  e não ter membership ativa em nenhuma guild; `foundedByAccountId` é sempre
  a conta autenticada, nunca vindo do payload do cliente. Protegida pelo
  `ThrottlerGuard` já usado no upload de emblema/banner (mesmo limite
  global, nenhum limiter novo). Elegibilidade adicional (`minimumLevel`,
  `minimumReset`, `zenCost`, `itemRequirement`, ...) tem um único ponto de
  extensão já preparado -- `GuildsService.assertCreationEligibility` --,
  hoje permissivo (nenhuma regra ativa); não inventar valores até haver
  decisão de produto.

`Guild.foundedByAccountId` é anulável para permitir que uma guild
`GAME`/`IMPORTED` futura seja "reivindicada" por um Guild Master depois
(fluxo C, ainda não implementado -- ver `GuildClaimRequest` nos planos
futuros).

## Disband (encerramento)

Não destrutivo -- sempre um flip de `Guild.status` para `DISBANDED`
(`GuildStatus`; o mesmo valor que a ação administrativa `DISBAND` já
escrevia). `GuildMember`/`GuildTreasury`/`GuildVault`/`GuildProject`
permanecem intocados: histórico, saldo e membros de uma guild encerrada
continuam existindo, só deixam de ser acionáveis (`directory()`/toda
mutação de membership já filtram ou passam a rejeitar `status !== 'ACTIVE'`).

Dois caminhos:

- **Administrativa** (`POST admin/guilds/:id/actions` com `action: DISBAND`,
  `GuildsAdminService.action`): sem step-up, motivo textual obrigatório.
- **Do próprio líder** (`DELETE guilds/:slug`, Guild Step 5.5): somente
  `LEADER` (`assertRole(['LEADER'])`); exige `StepUpGuard`/`@RequireStepUp()`
  -- a mesma infraestrutura genérica que já protege reset de 2FA
  administrativo, não um fluxo de reautenticação novo; exige digitar o nome
  OU a tag da guild no corpo da requisição (`confirmText`) como confirmação
  forte -- não existe padrão de "digite para confirmar" em outro lugar do
  portal, então este é o único lugar que usa essa mecânica. Todo convite e
  solicitação de entrada `PENDING` é cancelado na MESMA transação do flip
  de status.

## Reuso de nome/tag/slug após disband

Decisão de produto (Guild Step 5.5, confirmada explicitamente pelo
usuário -- não inferida):

- `NAME_REUSE_AFTER_DISBAND = YES` -- `Guild.name` não é único no schema;
  a checagem de unicidade em `createGuild` é aplicada apenas contra guilds
  `status: 'ACTIVE'`, então o nome de uma guild `DISBANDED` fica livre para
  reuso imediatamente.
- `TAG_REUSE_AFTER_DISBAND = YES` -- mesma lógica, mesma checagem, para
  `Guild.tag`.
- `OLD_SLUG_REUSE_AFTER_DISBAND = NO` -- `Guild.slug` é `@unique` no schema
  **sem exceção para guilds não-ATIVAS**. Uma guild disbanded mantém seu
  slug histórico reservado para sempre; uma guild nova com o mesmo nome
  gera um slug diferente (`slugify(name)` com sufixo `-2`, `-3`, ...) via o
  loop de colisão já existente em `createGuild`. Motivo: preservar
  identidade histórica, audit trail, referências internas e URLs antigas
  (`/guild/<slug>`), e impedir que uma guild nova assuma a URL pública de
  uma entidade anterior.

Este comportamento já corresponde exatamente à decisão acima -- nenhuma
alteração de schema ou de lógica foi necessária, apenas este registro.
Consequência a ter em mente: `Guild.slug` cresce como um namespace
estritamente monotônico (nunca encolhe, mesmo com disbands), por design.

## Três eixos de progressão -- nunca conflacionar

- `GuildMember.memberXp` -- progressão pessoal do membro na guild;
- `GuildMember.contributionScore` -- contribuição histórica/reputacional;
- `Guild.guildXp` -- progressão da organização.

Depositar um recurso na Tesouraria (`GuildTreasuryBalance`) **nunca** gera
`guildXp`. Poderá futuramente gerar `memberXp`/`contributionScore`, mas apenas
quando existir uma política de contribuição auditável e protegida contra
farm (depósito/saque/redepósito, reversões, guild A→B→A) -- não implementado
nesta rodada. Guild XP só pode nascer de uma execução **irreversível e
auditada** de `GuildXpConversionRule` (destrói o recurso, credita XP fixo) --
nenhum endpoint executa uma regra hoje; `active` nasce `false`.

## Tesouraria e Cofre (Tier B)

`GuildTreasuryBalance` é normalizada (não um blob `Json`) porque o catálogo de
recursos é aberto por natureza. Os `resourceKey` semeados na criação (ZEN,
WCOIN, GOBLIN_POINT, HUNT_POINT, JEWEL_BLESS, JEWEL_SOUL, JEWEL_CHAOS) são
apenas um seed mínimo de demonstração, não o catálogo definitivo -- novos
recursos (Life/Creation/Harmony/Guardian/outras jewels, materiais, moedas
sazonais...) entram sem alteração de schema. Nenhum endpoint escreve em
`availableAmount`/`reservedAmount` nesta rodada; `GuildVault`/`GuildVaultItem`
seguem o mesmo padrão (real, vazio, somente leitura).

`GuildMovement`/`GuildMovementApproval` documentam o único caminho pelo qual
qualquer recurso ou item se moverá no futuro -- nunca uma mutação direta de
saldo, fechando o padrão depósito→saque→redepósito. Deliberadamente fora do
grafo de relações de `Guild` (sem campo `guild Guild @relation`) para deixar
estruturalmente óbvio que nada os utiliza ainda.

## Histórico / Chronicle

Toda mutação de guild já passa por `ObservabilityService.recordOperationalEvent`
com `module: 'guilds'`. Esse fluxo é o substrato preparado para uma futura
Chronicle/curadoria de histórico -- sem tabela dedicada nesta rodada.

## Camadas (Tier A / B / C)

- **Tier A** (CRUD real): Guild, GuildMember, GuildJoinRequest,
  GuildFocusAssignment, GuildLevelConfig, GuildXpConversionRule (regras nunca
  executadas), GuildRequest, GuildProject.
- **Tier B** (modelo real, zero endpoint de escrita): GuildTreasury/
  GuildTreasuryBalance, GuildVault/GuildVaultItem, GuildMovement/
  GuildMovementApproval.
- **Tier C** (preview de UI, sem modelo novo): Guides, Quests, Events,
  Statistics, Achievements, Alliance.

## Proibido nesta rodada

Movimentação real de recursos/itens, execução de `GuildXpConversionRule`,
sincronização com MU, ranks customizáveis (deferred, ver
`docs/guild-product-backlog.md`), Alliance funcional. Criação pública de
guild deixou de estar nesta lista no Guild Step 5.5 -- ver seção acima.
