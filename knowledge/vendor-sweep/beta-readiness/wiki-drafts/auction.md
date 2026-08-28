---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: CONFIRMED_BY_CONFIG
source: GameServer/DATA/GameServerInfo - Custom.dat (config real, lido 27/08/2026)
provenance: atomic-claims.json CLAIM-039, CLAIM-040, CLAIM-041; event-registry.json "CustomEventAuction"
lastVerified: 2026-08-27 (Phase 8 enrichment)
publish: NOT_PUBLISHED -- draft only
---

# Leilão (Auction)

**Status: ATIVO** (`CustomEventAuctionSwitch = 1`) -- este é o sistema de evento custom confirmado mais completo e mais confiável deste pacote.

## Mecânica de lance

- Um item é colocado em leilão por um tempo determinado (alarm-time/duration configurável).
- Jogadores dão lances -- em **zen** ou em um **item específico** (dependendo de como o leilão foi configurado). Se for lance em item, a configuração define exatamente qual item e quantidade contam como um lance válido.
- Cada novo lance precisa ser **estritamente maior** que o lance atual mais alto -- um lance igual ou menor é recusado com uma mensagem no jogo.
- Quando a contagem regressiva termina, quem deu o lance mais alto recebe o item, entregue como um drop no chão na posição do vencedor.
- Apostadores que não venceram **não perdem nada** -- mantêm os itens/moeda que não foram gastos (o lance só é "cobrado" de fato do vencedor).

## Estrutura de configuração (4 seções)

1. Agenda do evento.
2. Nome do evento / horário de alarme / duração.
3. Definição completa do item leiloado (índice, nível, durabilidade, skill, opção, socket, duração) -- todos independentemente configuráveis por leilão.
4. Moeda/item exigido para dar um lance.

## CURRENT_CONFIG vs RECOMMENDED_CONFIG

**Importante**: esta sessão não determinou se os valores atualmente configurados no Blood Moon (item específico em leilão, moeda de lance, horário) são os valores REAIS de produção pretendidos pelo time, ou se ainda são valores de demonstração/exemplo herdados da configuração padrão do fornecedor. **Não presumir que os valores demonstrados em vídeo do fornecedor são política de produto do Blood Moon** -- isso exigiria uma leitura adicional do arquivo de config específico do leilão (não feita nesta fase, fora do escopo de "não buscar novas fontes sem necessidade específica").

- `CURRENT_CONFIG` (confirmado): o switch está ligado, a mecânica funciona como descrito acima.
- `RECOMMENDED_CONFIG` (não confirmado, não inventar): quais itens deveriam ser leiloados, com que frequência, e com qual moeda -- são decisões de produto/operação, não fatos técnicos já definidos.

## Como entrar

Este evento **não usa `/participar`** nem o painel de abrir evento do GM -- ele é acessado por um comando de "action" próprio, configurado separadamente. O nome exato do comando não foi confirmado nesta sessão.

## O que NÃO está confirmado

- Frequência/agenda real dos leilões no Blood Moon.
- Se existe um limite de lances por jogador.
- Comando exato digitado pelo jogador para participar.
- Mapa onde o leilão acontece (não confirmado).
- Se os itens atualmente configurados em leilão são a intenção final de produto ou ainda placeholder.
