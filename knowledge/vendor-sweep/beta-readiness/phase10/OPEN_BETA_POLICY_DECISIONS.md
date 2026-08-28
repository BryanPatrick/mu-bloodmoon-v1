---
status: DRAFT
category: beta-readiness/phase10
audience: internal (product/business decision only -- not technical, not for support to answer)
lastVerified: 2026-08-28
---

# OPEN_BETA_POLICY_DECISIONS (Part P)

Consolida os pacotes de decisão de política das Fases 8 e 9 (`policy-required-decisions.md`, `phase9/policy-decisions-required.md`) em um único documento com um esquema fixo por item. **Nenhum item aqui decide nada** -- cada um isola exatamente qual decisão falta, por que ela importa, e quais opções existem, sem escolher uma. Onde uma opção é marcada `RECOMMENDATION`, é uma sugestão explicitamente rotulada como tal, não uma decisão já tomada -- nenhum conteúdo de jogador (Wiki, FAQ, suporte) pode tratar qualquer item abaixo como resolvido até que apareça aqui como `DECIDED`.

---

## 1. Regras de RMT (Real Money Trade)

- **DECISION**: é permitido trocar itens/moeda do jogo por dinheiro real fora do sistema oficial? Se sim, sob quais condições?
- **WHY_NEEDED**: jogadores vão perguntar no dia 1 do Open Beta; suporte precisa de uma resposta oficial e consistente, não uma decisão ad hoc por atendente.
- **PLAYER_QUESTION_AFFECTED**: "Posso comprar/vender itens com dinheiro real?" (FAQ, seção RMT)
- **WHAT_BREAKS_IF_UNDECIDED**: suporte não tem base para confirmar, negar, ou punir RMT de forma consistente; risco de dois atendentes darem respostas diferentes ao mesmo jogador.
- **OPTIONS**: (a) proibido, com penalidade definida; (b) tolerado sem suporte oficial; (c) sistema de RMT oficial integrado ao portal.
- **RECOMMENDATION**: nenhuma -- decisão de negócio pura, fora do escopo deste pacote de conhecimento.

## 2. Recompensas de evento para contas F2P vs. VIP

- **DECISION**: contas gratuitas (AL0) têm alguma limitação de recompensa em eventos comparado a contas VIP (AL1-AL3)?
- **WHY_NEEDED**: mecânicas de bônus de recompensa por faixa VIP já existem no motor (confirmadas na Fase 10: `BloodCastleRewardSwitch`, `ChaosCastleRewardSwitch`, `DevilSquareRewardSwitch`, `IllusionTempleRewardSwitch`, todos hoje `0`/desligados) -- falta decidir se e como ativá-las.
- **PLAYER_QUESTION_AFFECTED**: "O servidor é gratuito?" (FAQ, seção F2P); percepção geral de equilíbrio F2P vs. pago.
- **WHAT_BREAKS_IF_UNDECIDED**: jogadores F2P podem se sentir enganados se bônus VIP forem ativados sem aviso; jogadores VIP podem reclamar de falta de benefício percebido.
- **OPTIONS**: (a) sem diferença entre F2P e VIP em eventos; (b) VIP recebe bônus percentual (mecanismo já existe, só desligado); (c) alguns eventos exclusivos para VIP.
- **RECOMMENDATION**: nenhuma -- decisão de produto.

## 3. Nomes comerciais, benefícios e preços de cada faixa VIP (AL0-AL3)

- **DECISION**: quais nomes de marketing, benefícios exatos e preços cada faixa VIP (AL0-AL3) deve ter?
- **WHY_NEEDED**: os códigos internos AL0-AL3 já existem no motor e afetam mecânicas reais e confirmadas (teto de resets: 20 para AL0-AL2, 50 para AL3; pontos por reset: 450 para AL0, 500 para AL1-AL3) -- mas os nomes comerciais e preços de venda não foram definidos.
- **PLAYER_QUESTION_AFFECTED**: "O servidor é gratuito?"; expectativa geral de monetização.
- **WHAT_BREAKS_IF_UNDECIDED**: é a decisão de monetização mais visível do lançamento -- sem ela, a Wiki/loja não pode publicar preços nem nomes de pacote.
- **OPTIONS**: fora do escopo deste pacote sugerir opções de preço -- decisão de negócio, não técnica.
- **RECOMMENDATION**: nenhuma.

## 4. O que acontece com o progresso do jogador depois do Open Beta

- **DECISION**: personagens, itens e progresso feitos durante o Open Beta serão apagados (wipe), migrados parcialmente, ou mantidos integralmente no lançamento oficial?
- **WHY_NEEDED**: **sinalizado como especialmente importante nesta fase** -- é provavelmente a pergunta de maior impacto emocional/motivacional que um jogador pode fazer antes de investir tempo no Beta, e não há nenhuma evidência real (config, código, ou decisão registrada) sobre isso em nenhuma fase até agora. Já apontado no rascunho de copy da Fase 9 (`phase9/open-beta-landing-copy.md`) como um vazio explícito.
- **PLAYER_QUESTION_AFFECTED**: "O que acontece com meu personagem depois do Beta?" (FAQ, seção OPEN_BETA) -- provavelmente uma das primeiras perguntas feitas por qualquer jogador antes de começar.
- **WHAT_BREAKS_IF_UNDECIDED**: risco direto de queda de engajamento no Beta ("por que vou investir tempo se pode ser apagado?") ou, pior, promessa implícita não cumprida se um jogador presumir que o progresso será mantido sem confirmação oficial.
- **OPTIONS**: (a) wipe completo no lançamento; (b) progresso mantido integralmente; (c) migração parcial (ex.: apenas nível/classe, sem itens); (d) sem decisão ainda, mas com um prazo público para anunciar antes do fim do Beta.
- **RECOMMENDATION**: nenhuma -- decisão de produto, mas dado o impacto no engajamento, recomenda-se fortemente (como observação, não como decisão) que isso seja resolvido e comunicado publicamente antes do início do Open Beta, não durante.

## 5. Recompensa por migração de clã de outro servidor

- **DECISION**: existe algum incentivo para clãs/guilds migrarem de outro servidor para o Blood Moon?
- **WHY_NEEDED**: prática comum em lançamentos de servidor MU privado, mas **nenhuma evidência real** de que esse recurso existe no Blood Moon -- incluído aqui apenas porque apareceu em briefings anteriores como risco, não porque há evidência de implementação.
- **PLAYER_QUESTION_AFFECTED**: "Existe recompensa por migrar meu clã de outro servidor?" (FAQ, seção CLAN_RECEPTION)
- **WHAT_BREAKS_IF_UNDECIDED**: pode influenciar a decisão de guildas inteiras migrarem (ou não) para o Blood Moon durante uma janela de lançamento sensível a tempo.
- **OPTIONS**: (a) nenhum incentivo especial; (b) pacote de boas-vindas por tamanho de clã; (c) evento de lançamento dedicado.
- **RECOMMENDATION**: nenhuma.

## 6. Valores de recompensa do programa Bug Hunters

- **DECISION**: qual é a recompensa exata por relatório de bug confirmado e útil?
- **WHY_NEEDED**: o programa já está sendo divulgado ao jogador (guia de Bug Hunters, Fase 9) com a frase aprovada "relatórios confirmados e úteis poderão contar para recompensas no lançamento" -- jogadores vão perguntar o valor exato assim que reportarem o primeiro bug.
- **PLAYER_QUESTION_AFFECTED**: "Ganho recompensa por reportar?" (FAQ, seção BUG_REPORT)
- **WHAT_BREAKS_IF_UNDECIDED**: risco de suporte prometer um valor não aprovado sob pressão de um jogador insistente -- a instrução vigente (usar apenas a frase aprovada, sem valor) já mitiga isso, mas não substitui a decisão real.
- **OPTIONS**: (a) moeda in-game; (b) item cosmético exclusivo; (c) reconhecimento público sem recompensa material; (d) combinação de (a)+(b)+(c).
- **RECOMMENDATION**: nenhuma.

## 7. Regras de recrutamento de staff/GM

- **DECISION**: como um jogador se candidata a GM/staff? Que critérios existem?
- **WHY_NEEDED**: pergunta comum na comunidade de qualquer servidor privado nos primeiros dias de um lançamento.
- **PLAYER_QUESTION_AFFECTED**: "Como me tornar staff/GM?" (FAQ, seção STAFF)
- **WHAT_BREAKS_IF_UNDECIDED**: define a expectativa de progressão social/comunitária de um jogador engajado além do próprio jogo -- sem uma resposta, o único caminho seguro para suporte é "não temos processo aberto ainda", o que pode desmotivar candidatos genuinamente interessados.
- **OPTIONS**: (a) processo de candidatura formal no site; (b) convite direto pela equipe; (c) sem recrutamento aberto no lançamento.
- **RECOMMENDATION**: nenhuma.

## 8. Preços da loja custom in-game e do portal

- **DECISION**: quanto custam os itens da loja custom in-game (WCoinC/WCoinP) e da loja do portal?
- **WHY_NEEDED**: nenhum preço foi pesquisado nesta ou em fases anteriores, e mesmo que fosse encontrado em configuração, preço final de venda é decisão de produto, não fato técnico a ser lido de um arquivo.
- **PLAYER_QUESTION_AFFECTED**: nenhuma pergunta de FAQ dedicada ainda (gap), mas afeta diretamente qualquer conteúdo futuro de loja/monetização.
- **WHAT_BREAKS_IF_UNDECIDED**: bloqueia a publicação de qualquer página de loja ou preço no site/Wiki.
- **OPTIONS**: fora do escopo deste pacote sugerir preços -- decisão de negócio.
- **RECOMMENDATION**: nenhuma.

## 9. Régua de penalidades e política antifraude

- **DECISION**: quais infrações (incluindo bots, exploits, duplicação de item) resultam em quais penalidades (aviso, suspensão, banimento)?
- **WHY_NEEDED**: suporte precisa de uma régua consistente para não aplicar punições arbitrárias; perguntas de segurança/integridade são esperadas logo no lançamento, especialmente com o programa Bug Hunters ativo incentivando jogadores a procurar problemas.
- **PLAYER_QUESTION_AFFECTED**: nenhuma pergunta de FAQ dedicada ainda (gap) -- mas é a base da resposta de suporte para qualquer denúncia de outro jogador.
- **WHAT_BREAKS_IF_UNDECIDED**: moderação inconsistente, risco de percepção de favoritismo ou arbitrariedade.
- **OPTIONS**: fora do escopo deste pacote sugerir uma tabela de penalidades ou mecanismos técnicos específicos -- decisão de produto + verificação técnica (Codex) combinadas.
- **RECOMMENDATION**: nenhuma.

## 10. Data de ativação do Master Reset

- **DECISION**: quando (ou se) o comando `/masterreset` será ativado?
- **WHY_NEEDED**: o comando existe no config real, desligado (`CommandMasterResetSwitch = 0`), com um requisito de 1000 resets configurado deliberadamente (não um valor padrão de template) -- evidência forte de que foi preparado para um lançamento futuro, mas sem data confirmada em nenhuma fonte real.
- **PLAYER_QUESTION_AFFECTED**: "Quando será ativado?" (FAQ, seção MASTER_RESET)
- **WHAT_BREAKS_IF_UNDECIDED**: jogadores avançados (400+ com múltiplos resets) podem perguntar repetidamente; resposta segura atual é "existe mas está desativado, sem data", o que já evita prometer algo não confirmado.
- **OPTIONS**: (a) anunciar uma data/marco de ativação; (b) manter desativado por tempo indeterminado; (c) ativar silenciosamente quando pronto.
- **RECOMMENDATION**: nenhuma.

## 11. Datas e regras oficiais do Open Beta

- **DECISION**: data de início/fim do Open Beta, e regras oficiais (ex.: quem pode participar, se há convites limitados).
- **WHY_NEEDED**: todo o pacote de copy de lançamento (Fase 9, `open-beta-landing-copy.md`) depende dessas datas para ser publicado.
- **PLAYER_QUESTION_AFFECTED**: "O que é o Open Beta?" (FAQ, seção OPEN_BETA)
- **WHAT_BREAKS_IF_UNDECIDED**: bloqueia a publicação da própria página de anúncio do Open Beta.
- **OPTIONS**: fora do escopo deste pacote -- decisão de cronograma de produto.
- **RECOMMENDATION**: nenhuma.

## 12. Data de publicação da Wiki

- **DECISION**: quando a Wiki do portal (construída nas Fases 7-10) será publicada para os jogadores?
- **WHY_NEEDED**: todo o trabalho de conteúdo destas fases (rascunhos de Wiki, FAQ, guias) está pronto ou quase pronto, mas marcado `NOT_PUBLISHED` até uma decisão explícita de lançamento.
- **PLAYER_QUESTION_AFFECTED**: "Onde encontro informação do jogo?" (FAQ, seção WIKI)
- **WHAT_BREAKS_IF_UNDECIDED**: suporte não pode direcionar jogadores para uma Wiki pública que não existe ainda.
- **OPTIONS**: (a) publicar antes do Open Beta; (b) publicar junto com o início do Open Beta; (c) publicar em fases (ex.: só as páginas `READY_FOR_OPEN_BETA`).
- **RECOMMENDATION**: nenhuma -- mas nota-se que a maior parte do conteúdo de maior prioridade (Reset, Guilds, Rankings) já está classificada `READY_FOR_OPEN_BETA` (ver `phase10/wiki-readiness-recalculation.md`), então uma publicação em fases (opção c) é tecnicamente viável hoje, se essa for a direção escolhida.

---

## Resumo

```
TOTAL_POLICY_ITEMS = 12
DECIDED = 0
PENDING = 12
```

Nenhum item foi decidido nesta ou em fases anteriores. Nenhum conteúdo de jogador deve apresentar qualquer um destes 12 itens como resolvido.
