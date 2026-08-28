---
status: DRAFT
category: beta-readiness
audience: internal (content/product planning)
lastVerified: 2026-08-27
---

# TOP 15 lacunas de conhecimento de eventos (Knowledge Phase 8, Part U)

Ranking por impacto provável no jogador. `BLOQUEIA_PUBLICACAO` = sim/não indica se essa lacuna especificamente impede publicar uma página pública, mesmo com o evento ativo.

| # | Evento | Lacuna | Melhor fonte de verificação | Esforço estimado | Bloqueia publicação? |
|---|---|---|---|---|---|
| 1 | Todos os 17 eventos DISABLED | Nenhum tem data de ativação prevista | Decisão do time de produto, não pesquisa técnica | N/A -- decisão | Sim (mas por status, não por falta de dado) |
| 2 | CustomEventAuction | Comando exato de participação não confirmado | Ler `Data/Custom/CustomEventAuction.txt` diretamente ou vídeo de fornecedor dedicado | Baixo | Sim |
| 3 | CustomEventAuction | Mapa onde o leilão acontece | Mesmo arquivo acima | Baixo | Não (mecânica já publicável sem o mapa) |
| 4 | Blood Castle/Chaos Castle/Devil Square/Illusion Temple | Método de entrada real no Blood Moon (NPC/scroll/localização) | Teste em jogo real | Médio | Sim |
| 5 | Quiz, Hide And Seek | Estado de ativação (`UNKNOWN` -- nenhum switch dedicado encontrado) | Buscar nome exato do switch no config real (pode ter nome não-óbvio) | Médio | Sim |
| 6 | Event Tropa | Estado de ativação e vínculo real com CustomMonsterTime.txt não confirmado | Ler o config real específico do Event Tropa | Médio | Sim |
| 7 | Maioria dos eventos DISABLED | Requisito de nível não confirmado para praticamente nenhum | Ler cada `Data/Custom/CustomEventXxx.txt` individualmente | Alto (17 arquivos) | Não (evento desativado de qualquer forma) |
| 8 | Russian Roulette, Absorption, Run And Catch, BBB, TvT, CTF, PvPAll, KillVsKill, Robber, GuildVsGuild, Racer | Recompensa exata (valores, não só estrutura) | Ler cada config real | Alto | Não |
| 9 | Battle Royale | Win condition exato (mecânica de eliminação genérica, não detalhada) | Reler o vídeo de fornecedor com mais atenção ou config real | Baixo | Não (desativado) |
| 10 | Drop Npc, Battle Royale, Kill vs Kill, Robber, Custom Arena, Guild vs Guild, Racer | Nome do mapa (só temos "até 30 instâncias configuráveis", sem instância específica do Blood Moon) | Ler o config real de cada instância configurada | Alto | Não |
| 11 | CustomArena | Comportamento exato do modo "Sobrevivência"/"Resta 1" além da regra básica de eliminação | Vídeo de fornecedor mais detalhado ou config real | Baixo | Não |
| 12 | CustomEventKillVsKill | Se algum mapa customizado precisa do respawn-gate extra mencionado (CLAIM-047) | Config real + teste em jogo | Médio | Não |
| 13 | Painel de agenda (tecla H) e painel GM/jogador (tecla D) | Estado de ativação real desses 2 painéis no Blood Moon não reconfirmado nesta fase (herda da Fase 7) | Config real, checagem rápida | Baixo | Não (documentação de existência já é segura) |
| 14 | EventGM (container genérico) | Nenhuma mecânica própria -- não há como documentar "como jogar" sem saber o que um GM configuraria ad hoc | Não aplicável -- por natureza é definido pelo GM a cada uso | N/A | Sim, mas por design, não por lacuna de pesquisa |
| 15 | CustomEventRobber | Se o item recuperável tem uma janela de tempo antes de se perder permanentemente (a garantia de "sem perda" cobre só desconexão, não outros cenários) | Config real, seção adicional não lida | Baixo | Não (desativado) |

## Observação geral

A maior parte destas lacunas **não bloqueia** a Central de Eventos atual, porque a política de segurança (Part K) já impede publicar qualquer conteúdo de "como jogar" para eventos desativados -- as lacunas de recompensa/mapa/requisito só importam no momento em que um evento específico for ativado. As lacunas #2-6 são as que mais importam agora, porque afetam o único evento ativo (Auction) e os 4 eventos clássicos sempre disponíveis.
