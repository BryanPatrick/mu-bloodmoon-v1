---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: CONFIRMED_BY_CONFIG
source: GameServer/DATA/GameServerInfo - Custom.dat (config real, lido 27/08/2026)
provenance: atomic-claims.json CLAIM-039, CLAIM-040, CLAIM-041
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only
---

# Leilão (Auction)

**Status: ATIVO** (`CustomEventAuctionSwitch = 1`) -- este é o sistema de evento custom confirmado mais completo e mais confiável deste pacote.

## Como funciona

- Um item é colocado em leilão por tempo determinado.
- Jogadores dão lances -- em **zen** ou em um **item específico** (dependendo de como o leilão foi configurado). Se for lance em item, a configuração define exatamente qual item e quantidade contam como um lance válido.
- Cada novo lance precisa ser **estritamente maior** que o lance atual mais alto -- um lance igual ou menor é recusado com uma mensagem no jogo.
- Quando a contagem regressiva termina, quem deu o lance mais alto recebe o item.

## Como entrar

Este evento **não usa `/participar`** nem o painel de abrir evento do GM -- ele é acessado por um comando de "action" próprio, configurado separadamente. O nome exato do comando não foi confirmado nesta sessão (ver `INTERNAL_ONLY` no guia de Comandos).

## O que NÃO está confirmado

- Frequência/agenda real dos leilões no Blood Moon.
- Se existe um limite de lances por jogador.
- Comando exato digitado pelo jogador para participar.
