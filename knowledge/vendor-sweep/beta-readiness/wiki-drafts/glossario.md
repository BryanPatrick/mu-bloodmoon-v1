---
status: READY_WITH_MINOR_GAPS (audited Phase 9, Part N -- all 15 requested terms already present since Phase 7, structure already matches the Phase 9 confirmed/policy-required/unknown discipline)
category: beta-readiness/wiki-drafts
audience: player-facing (Wiki + support), aimed at returning/new players
confidence: mixed, marked per term
lastVerified: 2026-08-28 (Phase 9 audit, content unchanged)
publish: NOT_PUBLISHED -- draft only
---

# Glossário para jogador novo ou retornando

Termos marcados `BLOODMOON_SPECIFIC` foram confirmados por configuração real do servidor. Termos marcados `UPSTREAM_MU_CONTEXT` são conceitos gerais do MU Online que qualquer servidor privado usa, não uma decisão específica do Blood Moon.

| Termo | Definição | Classificação |
|---|---|---|
| **Reset** | Reinicia o nível do personagem para 1 ao atingir o nível máximo (400 no Blood Moon), em troca de pontos de status extras. Ver guia de Reset/Master Reset. | BLOODMOON_SPECIFIC (requisitos/recompensas exatos) |
| **Master Reset** | Um "reset dos resets": zera o contador de resets do personagem. No Blood Moon, o comando existe mas está **desativado hoje**. | BLOODMOON_SPECIFIC |
| **Master Level** | Sistema de nível pós-reset-máximo em versões clássicas do MU Online. Presença/uso real no Blood Moon **não confirmado** nesta sessão. | `NEEDS_MORE_DATA` |
| **WCoinC** | Uma das moedas usadas na Loja Custom do Blood Moon (`CustomStoreSwitch`, ativa). "C" provavelmente de "Cash" -- moeda de recarga/compra. | BLOODMOON_SPECIFIC |
| **WCoinP** | Segunda moeda da Loja Custom, distinta de WCoinC. "P" provavelmente de "Point" -- moeda ganha jogando, não comprada. Ambas confirmadas reais no config. | BLOODMOON_SPECIFIC |
| **GoblinPoint** | Moeda confirmada real, usada em pelo menos o sistema de sorteio (loteria) da loja custom (hoje desativado -- `CustomOnlineLotterySwitch = 0`). | BLOODMOON_SPECIFIC |
| **HuntPoint** | Aparece como um tipo de moeda no sistema de tesouraria de guild do site/portal. Uso dentro do próprio jogo MU (não o portal) não confirmado nesta sessão. | `NEEDS_MORE_DATA` |
| **VIP** | O Blood Moon tem 4 faixas de conta confirmadas no config real: AL0 (gratuita), AL1, AL2, AL3 -- usadas para diferenciar limites de reset, entre outras coisas. O nome comercial exato de cada faixa (ex.: "VIP Bronze/Prata/Ouro") **não foi confirmado** nesta sessão -- apenas os códigos internos AL0-AL3. | BLOODMOON_SPECIFIC (códigos), `POLICY_REQUIRED` (nomes/benefícios comerciais) |
| **RMT** (Real Money Trade) | Troca de itens/moeda do jogo por dinheiro real fora do sistema oficial do servidor. **Nenhuma política de RMT foi definida ou confirmada nesta sessão.** Qualquer explicação de regras de RMT precisa vir de uma decisão de produto, não de vídeo de fornecedor. | `POLICY_REQUIRED` |
| **F2P** (Free to Play) | Jogar sem pagar. O Blood Moon claramente tem uma faixa de conta gratuita (AL0), mas **o conjunto de limitações/benefícios exatos do F2P não foi definido como política de produto** nesta sessão -- não inventar uma estrutura de recompensa. | `POLICY_REQUIRED` |
| **Evento** | Atividade especial temporária ou recorrente. Ver Central de Eventos para o que está realmente ativo hoje. | BLOODMOON_SPECIFIC (estado atual), UPSTREAM_MU_CONTEXT (conceito geral) |
| **Invasão** | Evento de spawn de monstros especiais, gerenciado pelo "Invasion Manager" real do servidor (confirmado existir). Lista completa de invasões ativas **não confirmada** nesta sessão. | `NEEDS_MORE_DATA` |
| **Guild** | Sistema de clã/guilda. Confirmado existir como sistema completo no portal (criação, papéis, convites, tesouraria, vault) -- ver guia de Guilds. | BLOODMOON_SPECIFIC |
| **Castle Siege** | Evento clássico de disputa de castelo entre guilds, padrão em muitos servidores MU. Presença/estado real no Blood Moon **não confirmado** nesta sessão (não encontrado com switch próprio no config revisado). | UPSTREAM_MU_CONTEXT + `NEEDS_MORE_DATA` |
| **Leilão / Auction** | Sistema de lances por item, confirmado ativo no Blood Moon (`CustomEventAuctionSwitch = 1`). Ver Central de Eventos. | BLOODMOON_SPECIFIC |
| **Market** | Sistema de loja/mercado custom confirmado ativo (`CustomMarketShopSwitch = 1`). Detalhes de uso pelo jogador **não documentados em profundidade** nesta sessão. | BLOODMOON_SPECIFIC (existência), `NEEDS_MORE_DATA` (uso detalhado) |
| **Ranking** | Sistema de classificação de jogadores. O switch geral está desativado hoje (`CustomRankingSwitch = 0`), mas o ranking de chefes (boss) está ativo (`CustomRankingBossSwitch = 1`). | BLOODMOON_SPECIFIC |
| **/participar (join)** | Comando para entrar em um evento que um GM abriu, mas só funciona para uma lista fixa de 10 eventos -- ver guia de Comandos. | BLOODMOON_SPECIFIC |
