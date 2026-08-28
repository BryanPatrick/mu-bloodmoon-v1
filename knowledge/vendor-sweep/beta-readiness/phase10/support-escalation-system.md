---
status: DRAFT
category: beta-readiness/phase10
audience: internal (support tooling design)
lastVerified: 2026-08-28
implementedBy: scripts/knowledge-support-escalation.mjs (Knowledge Phase 10, Part O)
---

# Sistema de escalação de suporte (Part O)

Camada de roteamento sobre a busca real (Part H). Para toda pergunta de jogador, decide entre responder via autoatendimento ou encaminhar para um humano em uma categoria especifica -- **nunca inventa uma resposta para evitar escalação**.

## Categorias

| Categoria | Quando é usada |
|---|---|
| `ACCOUNT_SUPPORT` | Conta, cadastro, e-mail, senha, login, 2FA |
| `LAUNCHER_SUPPORT` | Launcher, download, instalação, patch |
| `GAMEPLAY_SUPPORT` | Personagem, classe, nível, reset, eventos, guild, ranking, itens, trade, market, comandos |
| `BUG_REPORT` | Bug, erro, travamento, item sumido/duplicado |
| `POLICY_PENDING` | RMT, VIP/F2P, recompensa, preço, staff/GM, wipe pós-Beta -- qualquer coisa bloqueada por decisão de produto ainda não tomada |
| `STAFF_ESCALATION` | Fallback -- nada específico identificado, sempre um humano, nunca um chute |

## Regras de decisão (em ordem)

1. **`POLICY_PENDING` é verificado primeiro, antes de qualquer outra categoria.** Uma pergunta pode conter palavras de `GAMEPLAY_SUPPORT` (ex.: "item") e de `POLICY_PENDING` (ex.: "dinheiro real") ao mesmo tempo -- descoberto durante o desenvolvimento desta parte com a própria pergunta "posso vender item por dinheiro real", que originalmente caía em `GAMEPLAY_SUPPORT` por causa da palavra "item", escondendo a natureza de política da pergunta. Corrigido invertendo a ordem de verificação.
2. **Tópicos de política nunca respondem via autoatendimento, mesmo com uma pontuação de busca alta.** Verificado diretamente: a mesma pergunta de RMT pontuou mais alto (13.0) contra um trecho irrelevante sobre mecânica de reset do que contra a linha real de RMT do FAQ (11.3) -- um score "confiante" não é garantia de relevância real em tópicos sensíveis, e mesmo um match genuinamente relevante ali seria conteúdo de evidência, não uma resposta oficial de política. `POLICY_PENDING` escala incondicionalmente.
3. Para as demais categorias, o resultado só é tratado como autoatendimento se `score >= 9` (calibrado em cima do motor de busca do Part H/N -- abaixo disso, o resultado é descartado e a pergunta escala com o melhor match, se houver, anexado apenas como contexto não confirmado para o atendente, nunca apresentado ao jogador).
4. Se nada corresponder a nenhuma categoria, cai em `STAFF_ESCALATION` -- nunca em uma categoria adivinhada.

## Bug real encontrado e corrigido durante esta parte

O alias curto `it` (Illusion Temple) usava correspondência de substring simples (`raw.includes('it')`), que casava dentro de palavras comuns como "item" e "gratuito", injetando "illusion temple" como termo de busca em consultas completamente não relacionadas. Corrigido em `knowledge-search-query.mjs` trocando por correspondência com limite de palavra (`\bit\b`). Isso também elevou a qualidade geral do motor de busca (Part H), não apenas o roteador de escalação -- reconfirmado com o conjunto de 20 perguntas (`WRONG_RESULT: 0` mantido) e com o recálculo do FAQ (Part N, recontado após a correção).

## Limitação conhecida, não corrigida nesta fase

"Quando o Master Reset será ativado?" recebe resposta de autoatendimento honesta ("desativado hoje, sem data prometida") em vez de escalar para `POLICY_PENDING`, mesmo essa sub-pergunta especificamente sendo `POLICY_REQUIRED` no FAQ (Part N). A resposta dada não inventa nada e não promete uma data -- mas não identifica explicitamente que "quando" é a parte pendente de decisão. Não corrigido porque a palavra "quando" sozinha é genérica demais para virar gatilho de `POLICY_PENDING` sem produzir falsos positivos em excesso.
