---
status: DRAFT
category: beta-readiness
audience: internal support/triage
lastVerified: 2026-08-27
---

# Roteamento de bugs específicos de evento (extensão do template de Bug Hunters)

Adiciona um campo `eventBugCategory` ao template de `bug-report-template.md` (Part K da Fase 7), específico para reports relacionados a eventos.

| Categoria | Quando usar | Primeira pergunta de triagem |
|---|---|---|
| `EVENT_NOT_STARTING` | Evento não inicia no horário esperado ou quando o GM tenta abrir | O evento está confirmado `ACTIVE` no registro? Se `DISABLED`, não é bug -- fechar como "evento não disponível" |
| `ENTRY_FAILED` | Jogador não consegue entrar mesmo com o evento ativo | Checar `entryMethod` no registro -- é `/participar`, NPC, ou GM-only? O jogador usou o método certo? |
| `COMMAND_FAILED` | `/participar` ou outro comando não responde | Ver `participar-command-reconciliation.md` -- confirmar se o evento-alvo está mesmo ativo antes de tratar como bug de comando |
| `WRONG_REQUIREMENT` | Jogador diz que cumpriu o requisito mas foi barrado | Requisitos exatos são `UNKNOWN` para a maioria dos eventos -- coletar o que o jogador tentou e escalar para verificação de config real |
| `WRONG_REWARD` | Recompensa recebida diferente da esperada | Comparar com o valor confirmado no registro, se houver; se `UNKNOWN`, escalar sem confirmar/negar |
| `WRONG_SCORE` | Pontuação/placar incorreto | Escalar -- requer verificação de log real, fora do que este pacote de conhecimento cobre |
| `DISCONNECT` | Jogador caiu durante o evento | Perguntar se perdeu progresso/item -- alguns eventos têm garantia de não-perda documentada (ex.: Robber -- item devolvido automaticamente se a vítima desconectar), outros não confirmado |
| `MAP_TRANSFER` | Problema ao ser transportado para o mapa do evento | Escalar -- questão de infraestrutura/mapa, não coberta pelo conhecimento de eventos |
| `NPC_INTERACTION` | NPC do evento não responde/não existe | Para eventos com múltiplas instâncias (Drop Npc, Custom Arena), um NPC mal registrado é uma causa real documentada (mapa/coordenada não bate entre o registro do NPC e o config do evento) -- mas isso é um problema de configuração do servidor, não do jogador; escalar |
| `SCHEDULE_MISMATCH` | Evento não apareceu no horário anunciado | Só Zombie (02:45) e Pandora (20:00) têm horário real confirmado -- para os demais, não confirmar nem negar um horário que não temos, escalar |

## Explicitamente fora de escopo

- Cálculo/validação de recompensa não é implementado aqui (repete a restrição já estabelecida na Fase 7 -- decisão de produto, não deste pacote de conhecimento).
