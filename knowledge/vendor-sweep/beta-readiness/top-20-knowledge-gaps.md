---
status: DRAFT
category: beta-readiness
audience: internal (content/product planning)
lastVerified: 2026-08-27
---

# TOP 20 lacunas de conhecimento antes do Open Beta

P0 = bloqueia jogador/suporte no dia 1. P1 = alto volume de suporte esperado. P2 = útil. P3 = bom ter.

| # | Prioridade | Pergunta/lacuna | Evidência faltando | Melhor fonte para verificar | Esforço estimado |
|---|---|---|---|---|---|
| 1 | P0 | Como funciona a criação de personagem (classes, restrições)? | Nenhuma pesquisa feita nesta sessão | Vídeo de fornecedor sobre criação de personagem + teste em cliente real | Médio (1-2 vídeos + teste) |
| 2 | P0 | Progressão de nível inicial -- para onde ir, o que caçar | Nenhuma confirmação real do Blood Moon | Teste em jogo real, não vídeo de fornecedor (evitar inventar meta) | Alto (requer gameplay real) |
| 3 | P0 | O ranking de bosses (ativo no servidor) está sendo exibido no site? | Página `/rankings` era um stub vazio em auditoria anterior -- não checado nesta fase se isso mudou | Reler `docs/handoff/site-current-state.md` + checar a página ao vivo | Baixo |
| 4 | P0 | Política de RMT | Decisão de produto, não fato técnico | Decisão do Bryan/produto | N/A -- não é pesquisa, é decisão |
| 5 | P0 | Estrutura de F2P vs. VIP (benefícios reais por faixa AL0-AL3) | Só os códigos internos foram confirmados, não os benefícios/nomes comerciais | Decisão de produto + config real cruzado por faixa | Médio |
| 6 | P1 | Sintaxe exata de digitação de cada comando de jogador | Inferida do nome do campo de config, não testada em cliente | Teste em cliente real, comando por comando | Médio |
| 7 | P1 | Como funciona trade entre jogadores | Não pesquisado nesta sessão | Vídeo de fornecedor + teste em cliente | Baixo-médio |
| 8 | P1 | Fluxo de denúncia de jogador (comportamento abusivo) | Não confirmado nesta sessão | Verificar se existe no config/servidor ou só via suporte manual | Médio |
| 9 | P1 | Detalhe de uso do Market (CustomMarketShop) | Só confirmado que está ativo, sem detalhe de uso | Vídeo de fornecedor dedicado (se existir) + teste | Médio |
| 10 | P1 | Quantidade de personagens por conta | Não pesquisado nesta sessão | Config real ou teste em cliente | Baixo |
| 11 | P1 | E-mail de ativação de conta -- está funcionando de ponta a ponta? | Achado de auditoria anterior aponta bloqueio de provedor de e-mail aprovado | `docs/handoff/auth-recovery-provider-blocker.md` | Baixo (é reler doc existente) |
| 12 | P1 | Nome comercial e benefícios de cada faixa VIP (AL0-AL3) | Só códigos internos confirmados | Decisão de produto | N/A -- decisão |
| 13 | P2 | Comando exato do Leilão (participação do jogador) | Não encontrado nesta sessão | Vídeo de fornecedor dedicado ao Auction (se existir na fila) | Baixo |
| 14 | P2 | Sistema de recompensa por bug encontrado (Bug Hunters) | Explicitamente fora de escopo desta fase (decisão de produto) | Decisão de produto | N/A -- decisão |
| 15 | P2 | Estado real de Castle Siege / Crywolf no Blood Moon | Não encontrado com switch dedicado no config revisado | Buscar arquivo de config específico + vídeo de fornecedor | Médio |
| 16 | P2 | Requisitos de nível/reset por evento individual (além do gate genérico de ResetMin/Max dos 4 castelos) | A maioria dos eventos custom está desativada, sem requisito visível ainda | Aguardar ativação ou ler config de cada evento individualmente | Alto (27 vídeos + configs) |
| 17 | P2 | Classes de personagem disponíveis no Blood Moon | Não pesquisado nesta sessão | Config real + vídeo de fornecedor | Baixo-médio |
| 18 | P3 | Comparação estruturada "MU clássico vs. Blood Moon" para veteranos | Temos peças soltas, falta uma página de comparação dedicada | Síntese do que já existe, sem nova pesquisa | Baixo (é redação, não pesquisa) |
| 19 | P3 | Canal de chat/Discord dedicado a suporte de jogo (distinto do link genérico) | Não confirmado nesta sessão | Confirmar com o time de operações | Baixo |
| 20 | P3 | Tempo de resposta esperado do suporte por ticket | Não definido nesta sessão | Decisão de produto/operações | N/A -- decisão |

## Observação sobre os 27 vídeos P0 restantes

A maior parte (`item 16` acima) depende diretamente do processamento dos 27 vídeos P0 ainda não processados no pipeline de conhecimento -- ver seção de status de processamento no relatório final desta fase.
