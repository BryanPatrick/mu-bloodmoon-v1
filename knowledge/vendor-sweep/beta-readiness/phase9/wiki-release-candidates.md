---
status: DRAFT
category: beta-readiness/phase9
audience: internal (content/product decision)
lastVerified: 2026-08-28
---

# Auditoria de páginas da Wiki para o Open Beta (Part F)

Regra desta fase (mais rígida que as Fases 7/8): uma página só é `READY_FOR_OPEN_BETA` se toda afirmação relevante for `BLOODMOON_CONFIRMED` (evidência real de config/código, não só vídeo de fornecedor) ou explicitamente rotulada `GENERAL_MU_CONTEXT`. Conteúdo `BLOODMOON_LIKELY`/`PROVIDER_SPECIFIC`/`UNKNOWN`/`RECOMMENDATION` presente numa página o rebaixa automaticamente para `READY_WITH_MINOR_GAPS` (se isolável) ou `INTERNAL_ONLY`/`BLOCKED` (se central ao conteúdo).

| Página | Classificação | Por quê |
|---|---|---|
| **Reset** (`reset-master-reset.md`, seção Reset) | `READY_FOR_OPEN_BETA` | 100% `CONFIRMED_BY_CONFIG` -- nível 400, sem custo, 450/500 pontos, teto 20/50. Nenhuma afirmação especulativa. |
| **Master Reset** (mesmo arquivo) | `READY_FOR_OPEN_BETA` | Idem -- confirmado que existe, está desativado, requisitos reais (400 + 1000 resets) se fosse ativado. O estado "desativado" É a informação, não uma lacuna. |
| **Auction** (`auction.md`) | `READY_WITH_MINOR_GAPS` | Mecânica central 100% `CONFIRMED_BY_CONFIG`. Lacunas isoláveis (mapa, comando exato) já marcadas como não confirmadas, não inventadas -- não contaminam o resto da página. |
| **Guilds** (`guilds.md`) | `READY_FOR_OPEN_BETA` | Fonte é código real do portal, testado (534 testes automatizados) -- equivalente a `BLOODMOON_CONFIRMED`, não vídeo de fornecedor. |
| **Eventos / Central de Eventos** (`eventos.md`) | `READY_WITH_MINOR_GAPS` | A afirmação central (quase tudo desativado, só Auction ativo) é 100% `CONFIRMED_BY_CONFIG`. As seções de mecânica de eventos desativados (Zombie/Pandora/etc.) são `INTERNAL_ONLY` dentro da própria página -- útil como está, desde que a versão publicada remova ou colapse essas seções técnicas internas em vez de expor mecânica `BLOODMOON_LIKELY` como se fosse ativa. |
| **Rankings** (`rankings.md`) | `READY_FOR_OPEN_BETA` | 100% `CONFIRMED_BY_CONFIG` -- geral desativado, boss ativo. Nota sobre o site precisar de correção separada não é uma afirmação especulativa, é um achado de auditoria já registrado. |
| **Market** (`market.md`) | `BLOCKED` | Só a existência/estado ativo é confirmado; toda a mecânica de uso é `NEEDS_MORE_DATA`/`UNKNOWN`. Uma página só com "existe e está ativo, mas não sabemos como usar" não serve ao jogador -- não publicar até ter mecânica real. |
| **Economia/Moedas** (`economia-moedas.md`) | `READY_WITH_MINOR_GAPS` | WCoinC/WCoinP/GoblinPoint confirmados reais via mensagens de texto do config. Preços/taxas de câmbio ficam `POLICY_REQUIRED`/`UNKNOWN`, já isolados na própria página. |
| **Comandos** (`comandos.md`) | `READY_WITH_MINOR_GAPS` → substituído nesta fase pelo **Command Center** (Part I), que aplica a barra mais rígida explicitamente (remove qualquer comando cuja sintaxe exata não seja confirmada em vez de listá-la como inferida) |
| **Começando no Blood Moon** (`comecando.md`) | `BLOCKED` | Seções centrais (criação de personagem, primeiros níveis) já são explicitamente `MISSING_DATA`/`NEEDS_GAMEPLAY_VALIDATION` na própria página -- correto ter marcado assim, mas isso torna a página como um todo não publicável ainda. Substituída nesta fase por **Seus Primeiros 30 Minutos** (Part B), que é mais estreita e não tenta cobrir o que não temos. |
| **Central de Ajuda/FAQ** (`central-de-ajuda-faq.md`) | `BLOCKED` | Versão da Fase 7, superficial. Substituída nesta fase pelo FAQ completo (Part D). |
| **Reportando Bugs** (`reportando-bugs.md`) | `READY_WITH_MINOR_GAPS` | Conteúdo correto e cauteloso (não promete recompensa). Enriquecido nesta fase (Part L) com critérios de report útil/reprodução/severidade. |
| **Glossário** (`glossario.md`) | `READY_WITH_MINOR_GAPS` | Já distingue `BLOODMOON_SPECIFIC` de `UPSTREAM_MU_CONTEXT` desde a Fase 7 -- estrutura já compatível com a regra desta fase. Expandido nesta fase (Part N). |

## Novas páginas desta fase (substituem ou complementam as acima)

| Página nova | Status |
|---|---|
| Seus Primeiros 30 Minutos (Part B) | `READY_WITH_MINOR_GAPS` -- construída só com o que é confirmado, com `NEEDS_GAMEPLAY_VALIDATION` explícito onde falta |
| Voltando ao MU Depois de Anos (Part C) | `READY_WITH_MINOR_GAPS` |
| FAQ completo (Part D) | mista -- ver arquivo próprio para status por pergunta |
| Command Center (Part I) | `READY_WITH_MINOR_GAPS` -- só comandos com sintaxe confirmada |
| Central de Ajuda, estrutura (Part J) | `READY_FOR_OPEN_BETA` como arquitetura de informação (não é conteúdo em si) |

## Ordem de prioridade (Part G) com status real

| # | Página | Status real |
|---|---|---|
| 1 | Começando no Blood Moon | substituída por Primeiros 30 Minutos, `READY_WITH_MINOR_GAPS` |
| 2 | Conta e Launcher | não existe como página dedicada ainda -- conteúdo espalhado entre Primeiros 30 Minutos e o FAQ; `BLOCKED` como página própria |
| 3 | Reset | `READY_FOR_OPEN_BETA` |
| 4 | Master Reset | `READY_FOR_OPEN_BETA` |
| 5 | Eventos | `READY_WITH_MINOR_GAPS` |
| 6 | Comandos | substituída pelo Command Center, `READY_WITH_MINOR_GAPS` |
| 7 | Reportando Bugs | `READY_WITH_MINOR_GAPS` |
| 8 | Guilds | `READY_FOR_OPEN_BETA` |
| 9 | Market | `BLOCKED` |
| 10 | Auction | `READY_WITH_MINOR_GAPS` |
| 11 | Ranking | `READY_FOR_OPEN_BETA` |
| 12 | Moedas | `READY_WITH_MINOR_GAPS` |
| 13 | FAQ | mista, ver Part D |
| 14 | Voltando ao MU | `READY_WITH_MINOR_GAPS` |
| 15 | Central de Ajuda | arquitetura `READY_FOR_OPEN_BETA`, conteúdo mapeado na Part J |

**Se autorizado a publicar hoje**: Reset, Master Reset, Guilds, Rankings primeiro (zero lacuna relevante) -- ver resposta à pergunta 12 no relatório final.

## Resumo

- `READY_FOR_OPEN_BETA`: 5 (Reset, Master Reset, Guilds, Rankings, arquitetura da Central de Ajuda)
- `READY_WITH_MINOR_GAPS`: 8 (Auction, Eventos, Economia, Reportando Bugs, Glossário, Primeiros 30 Min, Voltando ao MU, Command Center)
- `BLOCKED`: 3 (Market, Começando no Blood Moon original, Central de Ajuda/FAQ original)
- `INTERNAL_ONLY`: todas as páginas de evento individual desativado (Zombie/Pandora/StopOrDie deep-dive, e os 17 eventos do registro marcados DISABLED)
- `OUTDATED`: nenhuma encontrada -- todo o conteúdo é desta e da fase anterior, nada desatualizado por decurso de tempo.
