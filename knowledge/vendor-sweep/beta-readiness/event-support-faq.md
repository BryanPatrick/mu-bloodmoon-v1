---
status: DRAFT
category: beta-readiness
audience: internal support staff only
lastVerified: 2026-08-27
---

# FAQ interno de suporte -- Eventos

Classificação: `READY` (resposta pronta, pode usar direto), `PARTIAL` (resposta parcial, complementar com investigação), `ESCALATE` (sempre encaminhar), `UNKNOWN` (não temos base para responder ainda).

| Pergunta do jogador | Classificação | Resposta/orientação |
|---|---|---|
| "Como entro no evento X?" | `PARTIAL` | Depende do evento -- consultar `event-registry.json`/Central de Eventos pelo `entryMethod` (`/participar`, clique em NPC, ou GM-only). Se o evento estiver `DISABLED`, a resposta é que ele não está disponível agora, não um passo a passo. |
| "Por que `/participar` não funciona?" | `READY` | O comando em si funciona; a resposta quase sempre é que o evento-alvo não está ativo hoje (9 dos 10 eventos elegíveis estão desativados). Ver `participar-command-reconciliation.md`. Não é bug na maioria dos casos. |
| "Evento está ativo?" | `READY` | Consultar a tabela de status em `event-registry.json`/Central de Eventos -- resposta direta e confiável, dados de config real. |
| "Qual nível eu preciso?" | `PARTIAL`/`UNKNOWN` | Para a maioria dos eventos, o requisito de nível não foi confirmado nesta fase (`UNKNOWN` no registro). Não inventar um número -- responder "não confirmado, vou verificar" e escalar se o jogador insistir. |
| "Precisa de item?" | `PARTIAL` | Confirmado que não para a maioria dos eventos revisados; alguns (TvT) podem exigir item configurável -- checar o registro por evento específico antes de responder com certeza. |
| "Qual horário?" | `PARTIAL` | Zombie (02:45 diário) e Pandora (20:00 diário) têm horário real confirmado. Os demais: `UNKNOWN` -- não inventar um horário. |
| "Qual mapa?" | `PARTIAL` | Zombie (Mapa 0/1), Pandora (Mapa 40), Stop Or Die (Mapa 1) confirmados. Maioria dos outros: `UNKNOWN`. |
| "Qual prêmio?" | `PARTIAL` | Zombie, Pandora, Stop Or Die, PvPAll, KillVsKill, Racer, Arena, Battle Royale (parcial), Auction têm recompensa real ou estrutura de recompensa confirmada. Vários outros: `UNKNOWN` exato. |
| "Perdi minha entrada, o que faço?" | `ESCALATE` | Sempre escalar -- requer verificação de dados reais do jogador, suporte de primeira linha não deve prometer restauração. |
| "Evento bugou, como reporto?" | `READY` | Direcionar para o template de bug report desta fase, com o contexto de evento (ver `event-bug-routing.md`). |
| "Por que o evento sumiu do painel (tecla H)?" | `READY` | Comportamento esperado -- eventos desativados simplesmente não aparecem na agenda, sem indicação visual de "desativado". Não é bug. |
| "Posso jogar Zombie/Pandora/Stop Or Die agora?" | `READY` | Não -- os 3 estão confirmados desativados hoje. Ver `zombie-pandora-stopordie-deepdive.md` para quando forem ativados. |
| "O Leilão está funcionando?" | `READY` | Sim, confirmado ativo. Ver `auction.md`. |
| "Existe Castle Siege / Crywolf?" | `UNKNOWN` | Não confirmado nesta fase -- nenhum switch dedicado encontrado. Escalar para verificação técnica se o jogador perguntar especificamente. |
