---
status: DRAFT_READY_FOR_REVIEW
category: beta-readiness/wiki-drafts
audience: player-facing
confidence: CONFIRMED_BY_CONFIG
source: GameServer/DATA/GameServerInfo - Custom.dat (config real, lido 27/08/2026)
lastVerified: 2026-08-27
publish: NOT_PUBLISHED -- draft only
---

# Rankings

| Ranking | Status |
|---|---|
| Ranking geral (`CustomRankingSwitch`) | **DESATIVADO** hoje |
| Ranking por tipo (`CustomRankingTypeSwitch`) | **DESATIVADO** hoje |
| Ranking de chefes/bosses (`CustomRankingBossSwitch`) | **ATIVO** |
| Ranking de zumbi (`CustomRankingZombieSwitch`) | **DESATIVADO** hoje |
| Recompensa de ranking (`CustomRankingRewardSwitch`) | **DESATIVADO** hoje |

**Nota importante para suporte**: hoje só o ranking de bosses está realmente ativo no servidor de jogo. Isso é diferente da página `/rankings` do site, que segundo auditoria anterior é **um stub vazio sem nenhuma fonte de dado real conectada** (achado de auditoria, não desta fase) -- ou seja, mesmo o ranking de bosses ativo no servidor pode não estar sendo exibido no site ainda. Isso precisa ser resolvido antes de anunciar "veja o ranking no site" para o Open Beta.

## O que NÃO está confirmado

- Frequência de atualização do ranking de bosses -- `MISSING_DATA`.
- Se existe algum prêmio/recompensa real vinculado ao ranking de bosses hoje (o switch de recompensa geral está desativado) -- `NEEDS_MORE_DATA`.
