---
status: DRAFT
category: beta-readiness
audience: internal (support + content)
provenance: atomic-claims.json CLAIM-079, CLAIM-104-153 (per-event JoinEventXxxSyntax cross-references); event-registry.json
lastVerified: 2026-08-27
---

# Reconciliação do allowlist `/participar` (Part G)

Registro real confirmado (`JoinEventXxxSyntax`, `GameServer/DATA/GameServerInfo - Command.dat`): exatamente **10 eventos** suportam `/join`/`/participar`.

| # | Palavra-chave real | Entidade canônica | Vínculo de comando | Ativo hoje? | Comportamento conhecido |
|---|---|---|---|---|---|
| 1 | `EventGM` | EventGM (container genérico) | `JoinEventSyntax = EventGM` | `ENGINE_PRESENT` (sem switch dedicado encontrado) | Entra em qualquer evento genérico que um GM tenha aberto via Command Start Event -- não tem mecânica fixa própria |
| 2 | `Russian` | EventRussianRoulette | `JoinEventRussianRouletteSyntax = Russian` | **DISABLED** | Eliminação manual por rodada, GM precisa `/trade` cada jogador |
| 3 | `Absorption` | EventAbsorption | `JoinEventAbsorptionSyntax = Absorption` | **DISABLED** | Eliminação aleatória automática por rodada, mesmo padrão do Russian Roulette |
| 4 | `TvT` | CustomEventTeamVsTeam | `JoinEventTvTSyntax = TvT` | **DISABLED** | 2 times automáticos, morte não elimina, vence por pontos |
| 5 | `RunAndCatch` | EventRunAndCatch | `JoinEventRunAndCatchSyntax = RunAndCatch` | **DISABLED** | Um hit elimina, sem barra de vida |
| 6 | `BBB` | EventBBB | `JoinEventBBBSyntax = BBB` | **DISABLED** | Trivia com eliminação permanente ao errar |
| 7 | `CTF` | CustomEventCaptureTheFlag | `JoinEventCTFSyntax = CTF` | **DISABLED** | Captura de bandeira, 2 times |
| 8 | `PvPAll` | PvPAll / EventKillAll | `JoinEventKillAllSyntax = PvPAll` | **DISABLED** | Pontuação +2/-1, premia top 3 |
| 9 | `StopOrDie` | CustomEventStopOrDie | `JoinEventStopOrDieSyntax = StopOrDie` | **DISABLED** | "Luz vermelha, luz verde", só o último sobrevivente vence hoje |
| 10 | `Pandora` | CustomEventPandora | `JoinEventPandoraSyntax = Pandora` | **DISABLED** | Rei da colina, quem segura a skin no fim vence |

## Confirmado que NÃO usam `/participar`

- **CustomArena**, **Battle Royale**, **Drop Npc** -- exigem clicar em NPC dedicado no mapa (confirmado explicitamente, CLAIM-079/121/124).
- **CustomEventAuction** -- comando de "action" próprio, fora do registro `JoinEventXxxSyntax` inteiramente.
- **CustomEventRobber, CustomGuildVsGuild, CustomEventRacer, CustomEventKillVsKill** -- não aparecem no registro de 10, mecanismo de entrada real não confirmado como `/participar`.
- **Quiz** -- transmissão global, nenhum passo de entrada física existe.
- **Hide And Seek** -- aberto por `/openevent`, mas o método de entrada do jogador (encontrar e trocar com o GM) não usa `/participar`.

## Regra explícita (não presumir disponibilidade comando ⇒ evento ativo)

**O comando `/participar` em si está funcional e existe no registro do servidor independentemente de qualquer evento específico estar ativado.** A disponibilidade do COMANDO não implica que o EVENTO-ALVO está ativo -- de fato, 9 dos 10 eventos-alvo confirmados estão desativados hoje. Isso significa: um jogador digitando `/participar pandora` hoje provavelmente recebe uma mensagem de erro do próprio jogo (evento não está aberto/ativo), não porque o comando está quebrado, mas porque não há uma instância ativa do evento Pandora para entrar. Suporte deve tratar isso como comportamento esperado, não bug -- ver `event-support-faq.md`.
