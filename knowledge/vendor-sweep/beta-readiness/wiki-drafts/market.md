---
status: DRAFT_NEEDS_MORE_DATA
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: PARTIAL -- existência confirmada, mecânica não detalhada
source: GameServer/DATA/GameServerInfo - Custom.dat (config real, lido 27/08/2026)
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only, precisa de mais pesquisa antes de virar página completa
---

# Market

**Status**: `CustomMarketShopSwitch = 1` -- confirmado **ATIVO** no servidor real.

## O que NÃO está confirmado nesta sessão

- Como o jogador acessa o Market (comando, NPC, painel).
- Que tipo de item pode ser vendido/comprado.
- Se existe taxa ou limite de listagem.
- Se este "Market" in-game é o mesmo sistema do "marketplace" do portal (`apps/api/src/modules/marketplace/`, também real, mas uma implementação distinta e já documentada em auditoria anterior) ou um sistema totalmente separado dentro do próprio jogo.

**Ação recomendada antes de publicar**: processar o vídeo de fornecedor específico sobre CustomMarketShop (se existir na fila) e/ou testar em jogo antes de escrever uma página completa. Não confundir com o marketplace do site.
