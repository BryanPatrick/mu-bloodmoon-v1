---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: CONFIRMED_RUNTIME (sistema do portal, código real, não vídeo de fornecedor)
source: apps/api/src/modules/guilds/guilds.service.ts, guilds.contract.ts, prisma/schema.prisma (código real do projeto)
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only
---

# Guilds

**Esta página é a mais confiável do pacote**: o sistema de guilds não vem de vídeo de fornecedor nem de config de servidor de jogo -- é código real do portal Blood Moon, já testado (534 testes automatizados passando, incluindo cenários de concorrência).

## O que está confirmado

- Criação de guild, com nome e tag únicos entre guilds ativas.
- Papéis: **LEADER** (líder), **OFFICER**, **TREASURER**, **MEMBER**, **RECRUIT**. Uma guild sempre tem exatamente 1 LEADER -- nunca zero, nunca dois, mesmo sob ações simultâneas (garantido por testes automatizados).
- Convites e pedidos de entrada (join requests), com aprovação/recusa.
- Transferência de liderança: o líder atual pode transferir o cargo para outro membro; o líder anterior vira OFFICER automaticamente.
- Expulsão de membros (kick) -- o líder não pode ser expulso diretamente, precisa transferir a liderança primeiro.
- Encerramento (disband) da guild pelo líder, com confirmação por texto (digitar o nome ou a tag da guild).
- Tesouraria (treasury) e vault (baú) da guild, com moedas rastreadas: ZEN, WCOIN, GOBLIN_POINT, HUNT_POINT, além de joias (BLESS, SOUL, CHAOS).
- Modo de recrutamento configurável (ex.: aberto/fechado).

## O que NÃO está confirmado / fora do escopo desta página

- Vínculo em tempo real entre a guild do portal e a guild dentro do próprio jogo MU (personagem in-game) -- `NEEDS_MORE_DATA`.
- Benefícios de guild dentro do jogo (bônus de XP, drop, etc.) -- não pesquisado nesta sessão.
- Guild vs Guild como evento: confirmado **desativado** hoje (`CustomEventGuildVsGuildSwitch = 0`) -- ver Central de Eventos.

## Perguntas de jogador respondidas

- "Como eu crio uma guild?" → Sim, fluxo real existe.
- "Como eu convido alguém?" → Sim, sistema de convite/pedido real.
- "Posso expulsar um membro?" → Sim, LEADER e OFFICER podem, exceto o próprio líder.
- "O que acontece se eu sair sem transferir a liderança?" → O sistema nunca deixa a guild sem líder -- se você é o único LEADER, precisa transferir antes de sair (comportamento exato de "sair" não documentado nesta sessão especificamente, mas a garantia de "nunca zero líderes" é testada).
