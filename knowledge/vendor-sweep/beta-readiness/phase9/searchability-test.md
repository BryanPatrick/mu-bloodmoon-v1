---
status: DRAFT
category: beta-readiness/phase9
audience: internal (content/tooling planning)
lastVerified: 2026-08-28
---

# Teste de buscabilidade (Part M)

Testado contra a ferramenta real `scripts/knowledge-query.mjs query "<termo>"`, não simulado.

| Busca em linguagem natural | Resultado ANTES do ajuste | Resultado DEPOIS do ajuste de aliases |
|---|---|---|
| "como resetar" | `NOT_FOUND` (0 hits para "resetar") | `FOUND` (33 hits) |
| "como dar master reset" | `FOUND` (16 hits, mas nenhum no topo é diretamente sobre o comando `/masterreset` -- é `PARTIAL` na prática) | igual |
| "como entrar no evento" | `PARTIAL` (a palavra "entrar" não é indexada como tal, mas variações combinando "participar"+"evento" funcionam) | igual |
| "qual comando participar" | `FOUND` (1 hit relevante, CLAIM-104) | igual |
| "onde baixo o launcher" | `NOT_FOUND` | `NOT_FOUND` -- ver gap estrutural abaixo |
| "não consigo logar" | `NOT_FOUND` (0 hits para "logar") | `FOUND` (8 hits) |
| "como reportar bug" | `NOT_FOUND` | `NOT_FOUND` -- ver gap estrutural abaixo |
| "como criar guild" | `NOT_FOUND` | `NOT_FOUND` -- ver gap estrutural abaixo |
| "como funciona auction" | `FOUND` (4 hits, diretos e relevantes) | igual |
| "qual evento está ativo" | `NOT_FOUND` | `NOT_FOUND` -- ver gap estrutural abaixo |

## Resumo

- `FOUND`: 4 de 10 (subiu para o total com o ajuste; "resetar" e "logar" migraram de NOT_FOUND para FOUND)
- `PARTIAL`: 2 de 10
- `NOT_FOUND`: 4 de 10

## Melhoria aplicada

Adicionado um pequeno mapa de aliases português→inglês em `scripts/knowledge-query.mjs` (`resetar→reset`, `logar→login/log`, `baixar→download`, `reportar→report`) -- corrige o caso específico de termo em português não bater com o texto em inglês das claims. Verificado que não quebra nenhum teste existente (`knowledge-tools-test.mjs`, 15/15 passando).

## Gap estrutural (não corrigido nesta fase, por decisão deliberada de escopo)

`knowledge-query.mjs` só pesquisa `atomic-claims.json` e `knowledge-index.json` -- o corpus de claims extraídas de vídeo de fornecedor. Ele **não tem visibilidade nenhuma** sobre:

- O FAQ completo desta fase (`faq-completo.md`).
- Os rascunhos de Wiki (`wiki-drafts/*.md`).
- O guia de comandos, glossário, ou qualquer conteúdo de suporte.

Por isso, perguntas sobre "baixar launcher", "reportar bug", "criar guild" e "evento está ativo" retornam `NOT_FOUND` mesmo quando **a resposta existe** em algum destes documentos -- o sistema de busca simplesmente não indexa esses arquivos. Isso não é uma lacuna de conteúdo (as respostas existem), é uma lacuna de **ferramenta de busca real para jogador** -- corrigir isso exigiria construir um índice de busca novo cobrindo todo o conteúdo markdown desta fase, o que está fora do escopo de "conhecimento/conteúdo primeiro" desta fase. Registrado como candidato claro para a Phase 10.
