---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: mixed, marked por linha
source: GameServer/DATA/GameServerInfo - Custom.dat (config real); apps/api/prisma/schema.prisma (portal real)
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only
---

# Economia e moedas

| Moeda | Onde é usada (confirmado) | Status |
|---|---|---|
| Zen | Moeda clássica do MU, usada na tesouraria de guild do portal | BLOODMOON_SPECIFIC (uso confirmado) + UPSTREAM_MU_CONTEXT (conceito) |
| WCoinC | Loja Custom in-game (`CustomStoreSwitch`, ativa) | BLOODMOON_SPECIFIC |
| WCoinP | Loja Custom in-game, distinta de WCoinC | BLOODMOON_SPECIFIC |
| GoblinPoint | Confirmada em recompensa de sorteio (hoje desativado) e na tesouraria de guild do portal | BLOODMOON_SPECIFIC |
| HuntPoint | Confirmada apenas na tesouraria de guild do portal -- uso in-game não confirmado | `NEEDS_MORE_DATA` |
| Joias (Bless/Soul/Chaos/Life/Creation/Guardian/Genstone/Harmony) | Sistema de empacotar/desempacotar confirmado ativo (`/pack`, `/unpack`) | BLOODMOON_SPECIFIC (existência) |

## O que NÃO está confirmado

- Taxas de câmbio ou conversão entre moedas -- `MISSING_DATA`.
- Como o jogador ganha WCoinC vs. WCoinP (compra vs. farm) -- inferido do nome, não confirmado em texto oficial do servidor além das mensagens de aviso da loja.
- Preços reais da loja custom -- `MISSING_DATA`, não pesquisado nesta sessão.
- Política de recarga/pagamento real -- `POLICY_REQUIRED` (achado de auditoria anterior: o portal não tem gateway de pagamento real implementado ainda).
