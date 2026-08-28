---
status: DRAFT
category: beta-readiness/phase10
audience: internal (feeds Event Center / FAQ / First 30 Minutes / Command Guide / Support Runbook updates)
lastVerified: 2026-08-28
sourceEvidence: RemoteOps read-only download of Data/Event/*.dat + GameServer/DATA/GameServerInfo-Event.dat, D:\MU\RemoteData\Phase10\
---

# Classic event entry -- Phase 10, Part D findings

**Correção importante em relação às Fases 7-9**: o conteúdo anterior tratava os 4 eventos clássicos uniformemente como "ENGINE_PRESENT, presumivelmente sempre ativos". Isso estava **parcialmente errado** -- agora temos evidência real e direta de que **3 dos 4 estão genuinamente ativos e 1 está desativado**.

## Achado principal: switches reais confirmados

| Evento | Switch mestre | Estado | Máx. jogadores |
|---|---|---|---|
| Blood Castle | `BloodCastleEvent` | **= 1 (ATIVO)** | 10 (`BloodCastleMaxUser`) |
| Chaos Castle | `ChaosCastleEvent` | **= 1 (ATIVO)** | mín. 1 (`ChaosCastleMinUser`) |
| Devil Square | `DevilSquareEvent` | **= 1 (ATIVO)** | 15 (`DevilSquareMaxUser`) |
| Illusion Temple | `IllusionTempleEvent` | **= 0 (DESATIVADO)** | mín. 2 (`IllusionTempleMinUser`) |

Fonte: `GameServer/DATA/GameServerInfo - Event.dat`, real, já baixado na Fase 6 mas este campo específico (`XxxEvent=`) não tinha sido extraído antes -- só os campos de `XxxResetSwitch`/`XxxMasterResetSwitch` (o gate de reset) tinham sido lidos.

## Agenda real e automática (confirmada, `Data/Event/*.dat`, baixados e lidos diretamente)

| Evento | Horários (automáticos, diários) | Duração do evento | Fecha em |
|---|---|---|---|
| Blood Castle | A cada 2h, começando 00:00 (12x/dia) | 15 min | 4 min |
| Chaos Castle | A cada 6h, no :30 (00:30, 06:30, 12:30, 18:30) | 10 min | 4 min |
| Devil Square | A cada 2h, começando 01:00 (12x/dia) | 20 min | 4 min |
| Illusion Temple | A cada 4h, no :30, começando 01:30 (6x/dia) -- **mas o evento está desativado, então esta agenda não roda hoje** | 15 min | 4 min |

## Requisito de nível real por sub-nível (confirmado, `CustomEventEntryLevel.dat`)

| Evento | Sub-nível 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Blood Castle | 10-79 | 80-129 | 130-179 | 180-229 | 230-279 | 280-329 | 330+ |
| Devil Square | 10-129 | 130-179 | 180-229 | 230-279 | 280-329 | 330+ | -- |
| Chaos Castle | 10-49 | 50-119 | 120-179 | 180-239 | 240-299 | 300+ | -- |
| Illusion Temple | 220-270 | 271-320 | 321-350 | 351-380 | 381-400 | -- | -- |

Nenhum switch de ativação/desativação dedicado foi encontrado para este mecanismo de nível especificamente -- diferente do gate de reset (que tem seu próprio switch, confirmado desligado). Tratado aqui como parte estrutural sempre-ativa do evento em si (quando o evento está ativo).

## Recompensa (confirmado -- e uma descoberta importante: a tabela de moeda existe mas está INATIVA nos 3 eventos ativos)

`BloodCastleRewardSwitch = 0`, `ChaosCastleRewardSwitch = 0`, `DevilSquareRewardSwitch = 0`, `IllusionTempleRewardSwitch = 0` -- **todas as 4 tabelas de recompensa em WCoinC/WCoinP/GoblinPoint estão desligadas**, mesmo nos 3 eventos ativos. As tabelas de EXP e Zen (Money) por sub-nível existem e não têm switch próprio encontrado -- presumivelmente essas continuam valendo (recompensa padrão de XP/zen ao vencer), mas a recompensa extra de WCoin/GoblinPoint especificamente está desligada.

## Cadeia PLAYER → REQUIREMENT → NPC/COMMAND → ITEM → EVENT TIER → MAP

| Campo | Blood Castle | Chaos Castle | Devil Square | Illusion Temple |
|---|---|---|---|---|
| REQUIREMENT (nível) | `CONFIRMED` -- ver tabela acima | `CONFIRMED` | `CONFIRMED` | `CONFIRMED` (mas evento desativado) |
| REQUIREMENT (reset) | `CONFIRMED`: nenhum hoje (switch off) | `CONFIRMED`: nenhum hoje | `CONFIRMED`: nenhum hoje | `CONFIRMED`: nenhum hoje |
| NPC/COMMAND | `UNKNOWN` -- nenhum campo de NPC configurável encontrado nestes arquivos; provavelmente fixo no cliente (padrão do motor base, não customizável) | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| ITEM exigido | `UNKNOWN` -- não encontrado nestes arquivos | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| EVENT TIER | `CONFIRMED` -- 7 sub-níveis | `CONFIRMED` -- 6 sub-níveis | `CONFIRMED` -- 6 sub-níveis | `CONFIRMED` -- 5 sub-níveis (mas evento off) |
| MAP | `UNKNOWN` -- não encontrado nestes arquivos | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| `/participar` envolvido? | `CONFIRMED`: **Não** -- nenhum dos 4 está na lista real de 10 eventos elegíveis a `/participar` (achado já confirmado na Fase 7/8) | idem | idem | idem |

**Conclusão**: NPC, item de entrada e mapa continuam `UNKNOWN` -- não inventados. O requisito de nível, a agenda real, e o estado ativo/desativado, sim, agora são `CONFIRMED_BY_CONFIG`, uma melhora real e substancial em relação às Fases 7-9.
