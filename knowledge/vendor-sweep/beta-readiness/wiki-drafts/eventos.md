---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing (Wiki + support) -- GM-only sections marked separately
confidence: CONFIRMED_BY_CONFIG for enable/disable states; mixed for mechanics detail
source: GameServer/DATA/GameServerInfo - Custom.dat, GameServerInfo - Event.dat, GameServerInfo - Command.dat, GameServerInfo - CommandGM.dat (real config, read 2026-08-27, Phase 6)
provenance: atomic-claims.json CLAIM-035, CLAIM-039, CLAIM-040, CLAIM-041, CLAIM-048, CLAIM-049, CLAIM-079, CLAIM-080, CLAIM-092
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only, per Phase 7 instructions
---

# Central de Eventos (Event Help Center)

## Achado mais importante para o Open Beta

**Hoje, praticamente todo evento custom acessível por `/participar` (join) está DESATIVADO no servidor real.** Dos 10 eventos que o comando `/join` sabe abrir, **9 foram confirmados desligados** (`Switch = 0`) na configuração real lida em 27/08/2026. O único evento custom confirmado **ativo e funcionando** hoje é o **Leilão (CustomEventAuction)**, que usa um comando próprio, não `/participar`.

Isso significa: se um jogador perguntar "quais eventos eu posso entrar agora?", a resposta honesta hoje é **"o Leilão, e os eventos clássicos abertos manualmente por um GM quando anunciados"** -- não uma lista longa de eventos automáticos. Isso é uma constatação factual do estado atual do config, não uma crítica -- pode ser proposital (eventos sendo preparados em fases) ou pendente de ativação antes do lançamento. **Recomenda-se confirmar com o time antes do Open Beta** se essa é a intenção final.

## Registro por evento

Legenda de status de publicação: `PLAYER_READY` (pode virar página pública agora), `NEEDS_MORE_DATA` (mecânica real não totalmente confirmada), `INTERNAL_ONLY` (não deve virar conteúdo público).

### Leilão (CustomEventAuction)

| Campo | Valor |
|---|---|
| Nome real | CustomEventAuction |
| Ativo/Desativado | **ATIVO** (`CustomEventAuctionSwitch = 1`) |
| Entrada | Comando de "action" próprio (não é `/openevent` nem `/participar` -- este evento não aparece no registro `StartEventXxxSyntax` nem `JoinEventXxxSyntax`) |
| Suporte a /participar | Não |
| Requisito de nível/reset | Não documentado nesta sessão |
| Itens exigidos | Depende do modo de lance configurado -- ver abaixo |
| Fonte do agendamento | Arquivo de config próprio (`Data/Custom`), 4 seções: agenda do evento, config do evento, prêmios, lista de itens elegíveis |
| Mapa | Não documentado nesta sessão |
| Monstro/chefe relevante | Não aplicável |
| Recompensa | O item/prêmio configurado vai para quem vencer o lance mais alto quando a contagem regressiva termina |
| Comando | Comando de "action" dedicado (nome exato não capturado nesta sessão) |
| Controles GM-only | Sim, configuração via arquivo custom |
| Descrição para o jogador | Sistema de leilão por lance: jogadores dão lances (em zen ou em um item específico, dependendo da configuração) por um item colocado em leilão; cada novo lance precisa ser estritamente maior que o lance atual; quando o tempo acaba, quem deu o lance mais alto recebe o item |
| **Status de publicação** | **PLAYER_READY** -- mecânica bem documentada e confirmada ativa |

### Eventos confirmados DESATIVADOS hoje (não descrever como conteúdo ativo)

| Evento | Nome no config | Switch | Suporte a /participar (se fosse ativado) |
|---|---|---|---|
| Arena (10 salas) | CustomArenaSwitch | 0 | Não (exige clicar NPC no mapa) |
| Battle Royale | CustomEventBattleRoyaleSwitch | 0 | Não (exige clicar NPC no mapa) |
| Drop Npc | CustomEventDropNpcSwitch | 0 | Não (exige clicar NPC no mapa) |
| Drop (genérico) | CustomEventDropSwitch | 0 | Não documentado |
| Robber | CustomEventRobberSwitch | 0 | Não (fora da lista de 10) |
| Guild vs Guild | CustomEventGuildVsGuildSwitch | 0 | Não (fora da lista de 10) |
| Team vs Team | CustomEventTeamVsTeamSwitch | 0 | **Sim**, se fosse ativado |
| Capture The Flag | CustomEventCaptureTheFlagSwitch | 0 | Não (fora da lista de 10, apesar de ter sigla CTF na lista de comandos GM -- não confundir) |
| Kill vs Kill | CustomEventKillVsKillSwitch | 0 | Não (fora da lista de 10) |
| Racer | CustomEventRacerSwitch | 0 | Não (fora da lista de 10) |
| Stop or Die | CustomEventStopOrDieSwitch | 0 | **Sim**, se fosse ativado |
| Pandora | CustomEventPandoraSwitch | 0 | **Sim**, se fosse ativado |
| Zombie | CustomEventZombieSwitch | 0 | Não (fora da lista de 10) |
| Russian Roulette | EventRussianRouletteSwitch | 0 | **Sim**, se fosse ativado |
| Absorption | EventAbsorptionSwitch | 0 | **Sim**, se fosse ativado |
| Run and Catch | EventRunAndCatchSwitch | 0 | **Sim**, se fosse ativado |
| BBB | EventBBBSwitch | 0 | **Sim**, se fosse ativado |
| PvPAll (PvP geral) | EventKillAllSwitch | 0 | **Sim**, se fosse ativado |

**Status de publicação de todos os acima: `NEEDS_MORE_DATA` para conteúdo público** -- não publicar como "como jogar" enquanto estiverem desativados; no máximo, uma nota de FAQ tipo "este evento ainda não está disponível".

### Eventos clássicos (Blood Castle, Chaos Castle, Devil Square, Illusion Temple)

Estes são eventos-base do motor MU (não "Custom"), então não aparecem no painel de switches customizados da mesma forma. O que está confirmado:

- Não existe restrição de reset mínimo/máximo para entrar em nenhum dos 4 hoje (o mecanismo existe no motor mas está desligado -- ver o guia de Reset/Master Reset).
- Entrada/abertura pelo comando `/openevent` do GM está confirmada no registro real (`BloodCastle`, `ChaosCastle`, `DevilSquare`, `IllusionTemple` aparecem no `StartEventXxxSyntax`).
- Nenhum dos 4 aparece na lista de 10 eventos abríveis por `/participar` -- ou seja, a entrada normal desses eventos é pelo NPC/mapa correspondente (padrão MU Online), não pelo comando de participar. `UPSTREAM_MU_CONTEXT`: este é o comportamento padrão do MU Online genérico, não uma decisão específica do Blood Moon.
- **Status de publicação**: `NEEDS_MORE_DATA` -- confirmar em jogo o NPC/localização real de entrada antes de publicar como guia completo.

### Painel de eventos (tecla D) -- GM e jogador

| Campo | Valor |
|---|---|
| Painel GM (tecla D) | Confirmado real: botões de um clique para quase todo evento custom catalogado, GM precisa da permissão em `GameMaster.txt` |
| Painel jogador (aba "Join Event", tecla D) | Confirmado real: deixa o jogador entrar no evento que um GM tiver aberto no momento, sem digitar `/join`, com seu próprio flag de config independente |
| Painel de agenda (tecla H, CustomEventTime) | Confirmado ATIVO (`CustomEventTimeSwitch = 1`) -- mostra a agenda de eventos habilitados; um evento desativado simplesmente não aparece na lista, sem indicação visual de "desativado" |
| **Status de publicação** | **PLAYER_READY** para a existência dos painéis e a tecla de atalho; `NEEDS_MORE_DATA` para uma lista de conteúdo já que a maioria dos eventos que apareceriam está desligada hoje |

### `INTERNAL_ONLY` -- não expor em conteúdo público

- Sintaxe exata de `/openevent` (índice + string por evento) -- é um comando de GM, não de jogador; documentar apenas no [guia de comandos internos](command-guide.md).
- O registro completo `StartEventXxxSyntax`/`JoinEventXxxSyntax` (nomes internos de configuração) -- útil para desenvolvimento/suporte técnico, não para o jogador final.

## O que isso significa para o suporte no dia 1 do Open Beta

Se um jogador perguntar "por que não consigo entrar no evento X", a resposta correta na maioria dos casos hoje é **"esse evento ainda não está ativo neste servidor"**, não um bug -- ver a tabela acima antes de escalar como bug.
