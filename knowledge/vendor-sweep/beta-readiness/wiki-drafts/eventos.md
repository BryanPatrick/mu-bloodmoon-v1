---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing (Wiki + support) -- GM-only sections marked separately
confidence: mixed, marked per event
source: GameServer/DATA/GameServerInfo - Custom.dat, GameServerInfo - Event.dat, GameServerInfo - Command.dat, GameServerInfo - CommandGM.dat (real config, read 2026-08-27); Data/Custom/CustomEventZombie.txt, CustomEventPandora.txt, CustomEventStopOrDie.txt, CustomEventRobber.txt (real config); Data/Event/BloodCastle.dat, ChaosCastle.dat, DevilSquare.dat, IllusionTemple.dat, CustomEventEntryLevel.dat (real config, Phase 10)
provenance: knowledge/vendor-sweep/beta-readiness/event-registry.json (full claimRefs per event)
lastVerified: 2026-08-28 (Phase 10 correction -- classic castle events)
publish: NOT_PUBLISHED -- draft only
---

# Central de Eventos (Event Help Center)

**Fonte estrutural desta página**: `knowledge/vendor-sweep/beta-readiness/event-registry.json` -- todo campo abaixo tem `claimRefs` rastreáveis nesse arquivo. Esta página é a leitura humana; o JSON é a fonte de verdade.

## Achado mais importante para o Open Beta

**Eventos custom acessíveis por `/participar` (join)**: dos 10 eventos que o comando `/join` sabe abrir, **9 foram confirmados desligados**. O único evento custom confirmado ativo por esse caminho é o **Leilão (CustomEventAuction)**, que usa um comando próprio, não `/participar`.

**Correção da Fase 10**: os 4 eventos clássicos (Blood Castle, Chaos Castle, Devil Square, Illusion Temple) **não são um grupo uniforme** -- Blood Castle, Chaos Castle e Devil Square estão **confirmados ativos**, com agenda automática real (o servidor abre esses eventos sozinho, várias vezes por dia, sem intervenção de GM). Illusion Temple está **confirmado desativado**. Isso significa que, hoje, existem **4 eventos genuinamente jogáveis** no Blood Moon (Leilão + 3 castelos clássicos), não apenas 1 como as Fases 7-9 relatavam.

**REGRA DE SEGURANÇA PARA CONTEÚDO PÚBLICO (Part K)**: mesmo quando a documentação técnica interna de um evento desativado está completa (e várias estão, graças à Fase 7), **a página pública nunca pode descrever esse evento como disponível**. Toda seção de evento desativado abaixo está marcada `DISABLED_MUST_LABEL_UNAVAILABLE` -- qualquer versão publicada precisa manter essa rotulagem clara.

---

## ATIVO hoje

### Leilão (CustomEventAuction)

`ACTIVE` | `claimRefs: CLAIM-039, CLAIM-040, CLAIM-041` | `publicationSafety: ACTIVE_SAFE_TO_DESCRIBE_AS_LIVE`

- **Mecânica**: sistema de lances. Um item é colocado em leilão por tempo determinado; jogadores dão lances em zen ou em um item específico configurado; cada novo lance precisa ser estritamente maior que o atual (lance igual ou menor é recusado); quando o tempo acaba, o maior lance recebe o item, dropado no chão na posição do vencedor.
- **Entrada**: comando de "action" dedicado (não é o comando de evento usado por GMs, nem `/participar`).
- **Requisitos**: nenhum nível/reset confirmado. Custo é o próprio lance (zen ou item, configurável).
- **Mapa**: não confirmado nesta fase.
- **Recompensa**: o item leiloado, com todos os atributos (índice/nível/durabilidade/skill/opção/socket/duração) independentemente configuráveis por leilão.
- **Regras especiais**: apostadores perdedores não perdem nada (mantêm seus itens/moeda não gastos); 4 seções de config (agenda, nome/alarme/duração, definição do item, moeda/item exigido para lance).
- **Status**: `PLAYER_READY` -- ver também a página dedicada `auction.md`.

---

## Eventos clássicos do motor MU

**Atualização da Fase 10**: correção importante -- estes 4 eventos NÃO são todos iguais. 3 estão realmente ativos com agenda automática real; 1 está desativado. Isso corrige o conteúdo das Fases 7-9, que tratava os 4 uniformemente.

### Blood Castle -- `ACTIVE`

`claimRefs: CLAIM-035, CLAIM-100, CLAIM-106` | `publicationSafety: ACTIVE_SAFE_TO_DESCRIBE_AS_LIVE`

- **Confirmado ativo** (`BloodCastleEvent = 1`), com **agenda automática real**: a cada 2 horas, começando à meia-noite (12x por dia), evento de 15 minutos.
- **Requisito de nível real por sub-nível** (`CustomEventEntryLevel.dat`): nível 1 (10-79), 2 (80-129), 3 (130-179), 4 (180-229), 5 (230-279), 6 (280-329), 7 (330+).
- **Máximo de 10 jogadores** por instância (`BloodCastleMaxUser`).
- **Reset/Master Reset**: sem requisito hoje (trava existe, desligada -- ver guia de Reset).
- **Recompensa**: tabelas reais de Zen e XP por sub-nível existem; uma tabela adicional de WCoinC/WCoinP/GoblinPoint também existe mas está **desligada** (`BloodCastleRewardSwitch = 0`).
- **NPC/mapa de entrada**: `UNKNOWN` -- não encontrado em configuração real; provavelmente fixo no cliente.

### Chaos Castle -- `ACTIVE`

- **Confirmado ativo** (`ChaosCastleEvent = 1`), agenda automática: a cada 6 horas, no minuto :30 (00:30, 06:30, 12:30, 18:30), evento de 10 minutos.
- **Requisito de nível real**: 1 (10-49), 2 (50-119), 3 (120-179), 4 (180-239), 5 (240-299), 6 (300+).
- **Mínimo de 1 jogador** (`ChaosCastleMinUser`).
- **Recompensa**: tabela de XP real por sub-nível; bônus de moeda existe mas está desligado (`ChaosCastleRewardSwitch = 0`).

### Devil Square -- `ACTIVE`

- **Confirmado ativo** (`DevilSquareEvent = 1`), agenda automática: a cada 2 horas, começando à 01:00 (12x por dia), evento de 20 minutos.
- **Requisito de nível real**: 1 (10-129), 2 (130-179), 3 (180-229), 4 (230-279), 5 (280-329), 6 (330+).
- **Máximo de 15 jogadores** (`DevilSquareMaxUser`).
- **Recompensa**: tabelas reais de Zen e XP por onda (10 ondas por sub-nível); nenhum bônus de WCoin/GoblinPoint configurado.

### Illusion Temple -- `DISABLED`

- **Confirmado desativado** (`IllusionTempleEvent = 0`) -- diferente dos outros 3. Tem uma agenda real configurada (a cada 4 horas, começando 01:30) e requisito de nível real (220-400, em 5 faixas), mas **nada disso roda hoje** porque o evento está desligado.
- **⚠️ Não descrever como disponível.**

### Comum aos 4

- **Entrada** (`/participar`): nenhum dos 4 está na lista real de 10 eventos elegíveis a `/participar` -- a entrada normal é por outro mecanismo (provavelmente NPC/mapa, padrão MU Online), não confirmado especificamente para o Blood Moon nesta fase.
- **⚠️ Aviso obrigatório para conteúdo público**: nunca implicar requisito de reset para nenhum dos 4 -- essa trava existe no motor mas está desligada em todos.
- **Status**: `PARTIAL` para Blood Castle/Chaos Castle/Devil Square (agenda, requisito de nível e recompensa confirmados; NPC/mapa de entrada ainda não); Illusion Temple não deve ser descrito como disponível, pois está desativado hoje (ver acima).

---

## DESATIVADOS hoje (`DISABLED_MUST_LABEL_UNAVAILABLE`)

Cada evento abaixo tem documentação técnica completa (graças à Fase 7), mas **nenhum pode ser descrito como disponível para jogar agora**.

### Zombie (CustomEventZombie)

`claimRefs: CLAIM-031, CLAIM-107, CLAIM-108, CLAIM-109, CLAIM-110`

- **Agendamento configurado**: diário às 02:45, duração de 10 minutos (config real).
- **Mapa/NPC**: NPC de entrada classe 380 no Mapa 0, próximo às coordenadas (140,140); área do evento no Mapa 1.
- **Mecânica**: 4 ondas de monstros (índices 14, 15, 55, 515); um jogador morto por um monstro da onda fica "infectado" (não é removido) e precisa achar e clicar em um antídoto no chão para se curar. Quem estiver infectado quando o tempo acabar não recebe recompensa.
- **Recompensa**: moeda (Cash/Gold/PcPoint), configurada no arquivo real.
- **Regras especiais**: antídoto tem 100% de chance de drop, em coordenada fixa (mesma da 3ª onda); ranking ao vivo opcional (próprio switch, estado não confirmado).
- **Entrada**: clique em NPC (não é `/participar`).

### Pandora (CustomEventPandora)

`claimRefs: CLAIM-032, CLAIM-111, CLAIM-112, CLAIM-113, CLAIM-114, CLAIM-115`

- **Agendamento configurado**: diário às 20:00 (config real). Suporta agendamento automático (diferente do Stop Or Die, que não suporta).
- **Mapa**: 40. Para 2-20 jogadores de qualquer classe.
- **Mecânica**: "rei da colina" -- um monstro especial (skin de Skeleton King) nasce uma vez; quem o mata assume a skin; qualquer outro jogador que matar o portador atual da skin a rouba. Quem estiver com a skin quando o tempo acabar, vence.
- **Recompensa**: 100 Cash (config real).
- **Regras especiais**: entrar na sala de espera via `/participar` bloqueia PvP até o evento começar oficialmente; limite opcional de mortes-perdendo-a-skin (ex.: 3) ou ilimitado.
- **Entrada**: `/participar pandora`.

### Stop Or Die (CustomEventStopOrDie)

`claimRefs: CLAIM-033, CLAIM-114, CLAIM-116, CLAIM-117, CLAIM-118, CLAIM-119`

- **Mapa/NPC**: Mapa 1, NPC classe 684, coordenadas (22,41).
- **Mecânica**: "luz vermelha, luz verde" -- quem se mexe na fase "pare" é eliminado. Na versão 8.8, só o último sobrevivente vence (o fornecedor planeja mudar isso no futuro para premiar todos que cruzarem a linha, mas **isso ainda não é o comportamento atual**).
- **Timing**: lobby de 60s, contagem de 30s, janelas de movimento aleatórias de 4-8s, período de tolerância de 900ms.
- **Recompensa**: 500/500/500 Cash/Gold/PcPoint (config real).
- **Regras especiais**: não suporta agendamento automático hoje, precisa ser aberto manualmente por um GM; mínimo 2 jogadores, máximo configurável (demo: 20).
- **Entrada**: `/participar` (nome exato do evento no comando não confirmado além do registro genérico).

### Russian Roulette, Absorption, Run And Catch, BBB, Team vs Team, PvPAll

`claimRefs: CLAIM-129 a CLAIM-154, CLAIM-024/025/026` -- ver `event-registry.json` para o registro completo de cada um.

Resumo rápido (todos `/participar`-elegíveis, todos DESATIVADOS hoje):

| Evento | Mecânica em uma linha |
|---|---|
| Russian Roulette | GM precisa `/trade` manualmente um jogador por rodada para checar eliminação -- não é automático |
| Absorption | Eliminação aleatória automática por rodada, mesmo padrão da Russian Roulette |
| Run And Catch | Um único hit elimina o alvo -- sem barra de vida |
| BBB | Trivia com eliminação permanente ao errar |
| Team vs Team | 2 times automáticos, morte não é eliminação permanente, vence quem tiver mais pontos |
| PvPAll | Pontuação: +2 por kill, -1 por morte (ambos configuráveis); premia top 3 |

### Quiz, Hide And Seek

`claimRefs: CLAIM-131 a CLAIM-138`

- **Quiz**: transmissão global sem entrada física -- qualquer jogador online responde por comando de chat; vence quem responder certo primeiro; errar não elimina, pode tentar de novo.
- **Hide And Seek**: um GM se esconde; jogadores precisam encontrá-lo e abrir uma janela de troca com ele para vencer.
- **Estado de ativação**: nenhum dos dois tem switch dedicado encontrado nesta sessão -- `UNKNOWN`, não confirmado como ativo ou desativado.

### Arena, Battle Royale, Drop Npc, Kill vs Kill, Robber, Guild vs Guild, Racer, Capture The Flag

Todos confirmados **DESATIVADOS** por switch real. Ver `event-registry.json` para o registro técnico completo de cada um -- mecânicas detalhadas (ex.: Arena tem 3 modos: Mata-Mata/Sobrevivência/Resta 1; Battle Royale restaura itens automaticamente ao sair; Drop Npc grava ranking no banco SQL para exibição no site) estão documentadas ali, mas nenhum deve virar conteúdo público enquanto desativado.

**⚠️ Cuidado com nomes duplicados**: o preset "Mata-Mata" do Custom Arena e o evento dedicado "PvPAll / Mata-Mata Geral" são **sistemas completamente diferentes** que só coincidem no nome em português. Nunca tratar como o mesmo evento em conteúdo público.

---

## Painel de eventos (tecla D) -- GM e jogador

| Campo | Valor |
|---|---|
| Painel GM (tecla D) | Confirmado real: botões de um clique para quase todo evento custom catalogado |
| Painel jogador (aba "Join Event", tecla D) | Confirmado real: entra no evento que um GM tiver aberto, sem digitar `/join` |
| Painel de agenda (tecla H) | Confirmado **ATIVO** -- mostra a agenda de eventos habilitados; um evento desativado simplesmente não aparece na lista |
| **Status** | `PLAYER_READY` para a existência dos painéis; conteúdo de lista real limitado hoje pela maioria dos eventos estar desativada |

## `INTERNAL_ONLY` -- nunca publicar

- Sintaxe exata de `/openevent` (comando de GM).
- Registro completo `StartEventXxxSyntax`/`JoinEventXxxSyntax`.
- Ver `event-registry.json` para todos os campos técnicos completos por evento.

## Suporte no dia 1 do Open Beta

Se um jogador perguntar "por que não consigo entrar no evento X", a resposta correta na maioria dos casos é **"esse evento ainda não está ativo neste servidor"**, não um bug. Ver o FAQ de suporte dedicado (`event-support-faq.md`) para respostas prontas.
