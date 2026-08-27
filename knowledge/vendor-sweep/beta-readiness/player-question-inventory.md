---
status: DRAFT
category: beta-readiness
audience: internal (support + content planning)
lastVerified: 2026-08-27
---

# Inventário de perguntas de jogador -- Open Beta

Classificação: `READY_TO_ANSWER` (temos evidência real suficiente), `PARTIAL` (temos parte da resposta), `MISSING_DATA` (não sabemos, precisa de pesquisa), `POLICY_REQUIRED` (depende de decisão de produto/negócio, não de fato técnico), `PRODUCT_REQUIRED` (a funcionalidade em si ainda não existe/não foi decidida).

| # | Pergunta | Classificação | Nota |
|---|---|---|---|
| 1 | Como criar conta? | PARTIAL | Cadastro real existe na API (`/auth/register`), mas o fluxo completo de e-mail/ativação não foi confirmado nesta sessão -- ver `docs/handoff/site-current-state.md` |
| 2 | Como baixar o Launcher? | READY_TO_ANSWER | Página `/downloads` real, testada, link de launcher acessível (HTTP 200 confirmado em auditoria anterior) |
| 3 | Como entrar no jogo? | PARTIAL | Fluxo de launcher→patch→conectar existe estruturalmente; não testado ponta a ponta com servidor de jogo real nesta sessão |
| 4 | Como criar personagem? | MISSING_DATA | Não pesquisado nesta sessão -- provavelmente padrão MU Online (tela de criação no cliente), mas não confirmado especificamente para Blood Moon |
| 5 | O que fazer nos primeiros níveis? | MISSING_DATA | Nenhuma progressão inicial (mapas recomendados, monstros, quests) foi confirmada como real do Blood Moon nesta sessão -- ver `NEEDS_GAMEPLAY_VALIDATION` no guia "Começando" |
| 6 | Como funciona Reset? | READY_TO_ANSWER | Totalmente confirmado por config real -- ver guia de Reset/Master Reset |
| 7 | Como funciona Master Reset? | READY_TO_ANSWER (para o estado atual) | Confirmado: existe, está desativado hoje, requisitos configurados (400 nível + 1000 resets) |
| 8 | Quais comandos são úteis? | PARTIAL | Lista extensa de comandos confirmados ativos, mas sintaxe exata de digitação não testada em cliente -- ver guia de Comandos |
| 9 | Como entrar nos eventos? | PARTIAL | Mecanismo confirmado (`/openevent` por GM, `/participar` para 10 eventos, painel tecla D), mas a maioria dos eventos-alvo está desativada hoje |
| 10 | Quais eventos usam /participar? | READY_TO_ANSWER | Lista exata de 10 confirmada por config real -- ver Central de Eventos |
| 11 | Como funciona VIP, se confirmado? | PARTIAL / POLICY_REQUIRED | Códigos internos AL0-AL3 confirmados; nomes comerciais e benefícios de cada faixa dependem de decisão de produto |
| 12 | Como funciona trade? | MISSING_DATA | Não pesquisado nesta sessão |
| 13 | Como funciona RMT? | POLICY_REQUIRED | Nenhuma política definida -- não usar conteúdo de vídeo de fornecedor para isso, é decisão do Bryan/produto |
| 14 | Como funciona F2P? | POLICY_REQUIRED | Idem -- existe uma faixa de conta gratuita (AL0) confirmada, mas a estrutura de limitações/benefícios é decisão de produto, não inventar |
| 15 | Como denunciar bug? | PRODUCT_REQUIRED (agora resolvido nesta fase) | Ver template de bug report criado nesta fase (Part K) |
| 16 | Onde pedir ajuda? | PARTIAL | O módulo `support`/tickets do portal existe e é real (confirmado em auditoria anterior); central de ajuda/FAQ pública ainda não existe como página |
| 17 | Como reportar jogador? | MISSING_DATA | Nenhum fluxo de denúncia de jogador (diferente de denúncia de conteúdo de Community, que existe) foi confirmado para o contexto de jogo nesta sessão |
| 18 | Como entrar em guild/clan? | READY_TO_ANSWER | Sistema de guild real e completo no portal (criação, convites, papéis) -- ver `apps/api/src/modules/guilds/` |
| 19 | Como funcionam rankings? | PARTIAL | Sistema existe; ranking geral desativado hoje, ranking de chefes ativo |
| 20 | Como funciona Auction, se visível ao jogador? | READY_TO_ANSWER | Confirmado ativo e bem documentado -- ver Central de Eventos |
| 21 | Como funciona Market, se visível ao jogador? | PARTIAL | Confirmado ativo (`CustomMarketShopSwitch=1`), mas o fluxo de uso detalhado não foi documentado nesta sessão |
| 22 | O que mudou para alguém que não joga MU há anos? | PARTIAL | Podemos listar sistemas custom confirmados (loja, leilão, market, painel de eventos tecla D/H), mas não temos uma comparação estruturada "clássico vs. Blood Moon" pronta |
| 23 | Existe cash shop / loja com dinheiro real? | PARTIAL | `CustomStoreSwitch` ativo (loja custom in-game); o módulo de loja do portal (`commerce`) também existe e é real, mas sem gateway de pagamento real confirmado (achado de auditoria anterior) |
| 24 | Quais classes de personagem existem? | MISSING_DATA | Não pesquisado nesta sessão |
| 25 | O servidor tem quantos personagens por conta? | MISSING_DATA | Não pesquisado nesta sessão |

## Cobertura por faixa de resposta

- READY_TO_ANSWER: 6 (perguntas 2, 6, 7, 10, 18, 20)
- PARTIAL: 11 (perguntas 1, 3, 8, 9, 11, 16, 19, 21, 22, 23, e a metade "estado atual" de 7)
- MISSING_DATA: 6 (perguntas 4, 5, 12, 17, 24, 25)
- POLICY_REQUIRED: 3 (perguntas 11 parcialmente, 13, 14)
- PRODUCT_REQUIRED: 1 (pergunta 15, endereçada nesta fase)
