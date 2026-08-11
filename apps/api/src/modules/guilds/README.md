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

Apenas administrativa nesta rodada (`POST admin/guilds`). Não existe
`POST guilds` público. `Guild.foundedByAccountId` é anulável para permitir que
uma guild `GAME`/`IMPORTED` futura seja "reivindicada" por um Guild Master
depois (fluxo C, ainda não implementado -- ver `GuildClaimRequest` nos planos
futuros).

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
sincronização com MU, criação pública de guild, Alliance funcional.
