---
status: LIVING_DOCUMENT
category: manuals/super-admin
audience: SUPER_ADMIN role staff
lastVerified: 2026-09-04 (Fase X)
---

# Manual do Super Administrador (Super ADM) — Blood Moon

Este é o manual operacional mais completo do Blood Moon — ele inclui tudo
que um ADM vê (ver `docs/manuals/admin/manual-adm.md`), mais as
capacidades exclusivas de SUPER_ADMIN, incluindo operações destrutivas e
irreversíveis. **Este documento não simplifica nem esconde risco** — cada
operação irreversível está marcada como tal, explicitamente.

Este manual cresce progressivamente conforme novas capacidades
administrativas são construídas — ele é o destino natural de qualquer
funcionalidade operacional nova do Blood Moon.

## 1. Tudo que o ADM vê

Ver `docs/manuals/admin/manual-adm.md` na íntegra — todo SUPER_ADMIN tem,
por padrão, acesso a tudo isso e mais.

## 2. Gerenciamento de papéis e permissões

Apenas SUPER_ADMIN pode promover ou rebaixar contas entre papéis
(`PLAYER`/`GM`/`ADMIN`/`SUPER_ADMIN`) e delegar/revogar permissões
individuais (`admin.*`) para contas ADMIN específicas, através do painel
de contas (`/painel/admin/contas` → seção Permissões). Isso é o mecanismo
central de controle de acesso do projeto: **nenhuma capacidade
administrativa é concedida por padrão a ADMIN** — cada uma precisa de uma
decisão explícita sua.

Apenas SUPER_ADMIN também pode resetar o 2FA¹ de outra conta
administrativa que perdeu acesso (fluxo com verificação extra por design
— um GM/ADMIN nunca pode desativar o próprio 2FA sozinho).

## 3. Configuração de features

Configurações de sistema em nível de servidor (`admin.server-settings.manage`)
são exclusivas de Super ADM.

## 4. Produtos VIP e configuração comercial

A tabela real de preços VIP é totalmente configurável em banco/painel, sem
valores comerciais fixos no código — Bronze/Prata/Ouro, cada um com
opções de 7/15/30 dias. Você define os preços reais aqui, não o código.

**Sobre os 28 benefícios VIP mapeados no GameServer²**: apenas os
benefícios de conveniência (acesso ao warehouse por comando, redução de
custo de alguns comandos) estão ativados hoje. Todos os demais (bônus de
XP, taxa de drop, Chaos Machine, joias, harmonização, fusão) permanecem
candidatos, pendentes de uma análise de balanceamento explícita antes de
qualquer ativação — não ative nenhum deles sem essa análise.

## 5. Configuração de economia

Moedas, taxas e regras econômicas do Portal (WCOIN³, taxação de
transações) são configuráveis aqui. **WCoinC/WCoinP/Goblin Points** são
moedas internas do próprio GameServer, separadas do WCOIN do Portal — não
foram integradas ao WCOIN e não devem ser tratadas como equivalentes sem
uma decisão técnica explícita e um rastreamento completo de onde cada
uma é lida/escrita.

## 5b. Pagamentos — operações financeiras (Fase P, 2026-08-31)

Tela principal: `/painel/admin/financeiro`, com quatro abas: **Filas**
(compras/recargas, já existia), **Reconciliação**, **Risco**, e
**Chargebacks** (as três últimas, novas nesta fase).

### Inspeção de pagamento

A aba Filas mostra cada recarga com um painel de detalhes (Mercado Pago):
provider, order ID, correlation ID, status do provedor, e a **timeline
completa de webhooks recebidos** (tópico, status, se a assinatura era
válida, quando foi recebido). Use "Ressincronizar com Mercado Pago" para
forçar uma nova consulta manual ao provedor para uma recarga específica.

### Estorno — duas ações distintas, nunca confundidas

- **"Estornar (local)"** (`admin.recharge.refund`): reverte o estado no
  Portal — muda o status para Estornada/Estorno em andamento e debita o
  saldo do jogador (se ainda disponível). **Isto não confirma nenhum
  estorno real no Mercado Pago.**
- **"Tentar estorno no Mercado Pago"** (`admin.recharge.provider-refund`):
  só aparece depois que o estorno local já foi feito. Chama a API real de
  estorno do Mercado Pago. **`SANDBOX_VALIDATION_REQUIRED`** — o adaptador
  foi construído contra a documentação oficial do Mercado Pago e testado
  com respostas simuladas, mas **nunca verificado contra um ambiente de
  sandbox real** (nenhuma credencial de teste esteve disponível até
  agora). Além da permissão, exige a variável de ambiente
  `MERCADO_PAGO_REFUND_ENABLED=true`, desligada por padrão em qualquer
  ambiente — não ative em produção sem essa validação real primeiro. A
  interface nunca mostra "Estornado no Mercado Pago" a menos que a
  resposta real do provedor confirme (`refunded: true`).

### Reconciliação

Aba Reconciliação, botão "Verificar agora" — mostra duas categorias de
anomalia (ambas checagens locais, nunca chamam o provedor):
**`PAID_WITHOUT_LEDGER_CREDIT`** (uma recarga paga sem o crédito
correspondente no ledger — não deveria acontecer sob o código atual,
existe para pegar uma regressão futura) e **`STUCK_NON_TERMINAL`** (uma
recarga presa em status não-final há mais de uma hora).

Botão "Consultar provedor agora" (`admin.orders.operate`) dispara a
**reconciliação com o provedor real** — consulta o Mercado Pago
diretamente para recargas paradas, com limite de taxa (nunca consulta a
mesma recarga duas vezes em menos de 5 minutos) e lote limitado (padrão
20 por execução). **Também `SANDBOX_VALIDATION_REQUIRED`** — desligada
por padrão (`MERCADO_PAGO_PROVIDER_POLL_ENABLED`); a interface mostra
claramente "verificação externa pendente" quando desligada, nunca finge
um resultado.

### Chargebacks (contestações)

Um chargeback real do Mercado Pago (status `charged_back`) abre
automaticamente um **caso formal de chargeback** (aba Chargebacks) —
substituindo a antiga convenção informal ("Em análise" + motivo em
texto livre). Cada caso mostra: valor originalmente creditado, saldo da
conta no momento em que o caso foi aberto, e um **rastreamento de
dispersão** — a cadeia de transferências que esse WCoin percorreu depois
do crédito original, até o limite de 10 saltos.

**Regra permanente**: a responsabilidade primária é sempre da conta que
originou a compra. Contas que apenas receberam WCoin transferido nunca
são restringidas automaticamente por causa de um chargeback de outra
conta — o rastreamento existe para investigação humana, nunca para
retaliação em cadeia. Ações disponíveis (`admin.chargeback.manage`):
anotar o caso, e resolvê-lo como `CLEARED` (sem fraude confirmada),
`CONFIRMED_FRAUD`, ou `CLOSED`.

### Casos de risco (fundação antifraude)

Aba Risco (`admin.risk.view`/`admin.risk.manage`) — sinais explícitos e
auditáveis, nunca uma pontuação opaca. Cada sinal sempre vem com um
motivo legível e a evidência concreta usada para gerá-lo. Sinais reais
hoje: conta nova com compra de alto valor, múltiplos pagamentos
falhados, chargeback repetido, sequência de compras muito rápida,
anomalia de entrega/reconciliação, e recarga em revisão do provedor.
(Outros sinais — transferência imediata/quase todo o saldo, muitos
destinatários após compra, rede de destinatários repetidos, divergência
de titular de pagamento — existem como categorias válidas no sistema mas
ainda não têm um detector real ligado a eles.)

Sinais da mesma conta se agrupam automaticamente em um **caso** aberto.
Ações disponíveis sobre um caso: `MANUAL_REVIEW` (marcador), **
`PAYMENT_RESTRICTION`** (a única ação com efeito real hoje — bloqueia
novos checkouts de recarga para aquela conta até ser levantada
explicitamente), `TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION`
(registradas de forma auditável, mas **ainda sem um ponto de aplicação
real** — não bloqueiam nada por si só nesta fase). Resolver um caso exige
uma resolução escrita e move o status para `CLEARED`/`CONFIRMED_FRAUD`/
`CLOSED`.

### Gestão de pacotes de recarga (WCOIN)

`/admin/recharge/packages` (via API — sem tela dedicada de CRUD ainda,
**[PLANEJADO]**). Pacotes WCOIN têm uma trava obrigatória no backend
desde esta fase: o preço em reais precisa ser um número inteiro, e a
quantidade de WC concedida precisa ser exatamente igual ao preço (peg
1:1, ADR-0008) — uma tentativa de criar/editar um pacote WCOIN fora
dessa regra é recusada com erro claro, para que o conflito real que a
Fase N corrigiu (R$19,90 vendendo 500 WC) nunca volte a acontecer por um
descuido de cadastro. Pacotes GOBLIN_POINT/HUNT_POINT não têm essa
trava.

## 5c. Restrições, transferência direta de WC e compra de VIP (Fase Q, 2026-08-31)

### Tres tipos de restricao, nunca automaticas

Aba Risco (`/painel/admin/financeiro`) — o mesmo seletor de acao ja
existente na Fase P agora tem efeito real para tres delas:

| Restricao | Bloqueia | Nunca bloqueia |
|---|---|---|
| `PAYMENT_RESTRICTION` | Nova recarga (checkout) | Receber credito, estornos |
| `TRANSFER_RESTRICTION` | Enviar WC por transferencia direta | Receber transferencia, estornos |
| `ACCOUNT_RESTRICTION` | Recarga, compra na loja, compra de VIP, transferencia direta de WC | Login, acesso ao jogo, receber credito, estorno feito por um admin |

Todas sao reversiveis (botao "Levantar" no caso de risco), auditaveis
(quem aplicou/removeu, quando, motivo, caso vinculado) e exigem
`admin.risk.manage`. Nenhuma delas aplica automaticamente a partir de um
sinal — sempre uma pessoa da equipe decide.

**Uma restricao nunca impede a propria equipe de agir em nome do
jogador**: um SUPER_ADMIN sempre pode processar um estorno para uma
conta restrita (testado explicitamente,
`RESTRICTED_ADMIN_REFUND` em `payment-risk.e2e-spec.ts`) — a restricao
afeta apenas acoes que a PROPRIA conta restrita tenta iniciar.

### Transferencia direta de WC (recurso novo)

Antes da Fase Q, nao existia nenhuma forma de um jogador enviar WC
diretamente para outro (so via Marketplace). Agora existe
(`POST wallet/transfers`, minimo de 20 WC — confirmado como politica
final por Bryan na Fase Q (fechamento de decisoes), fecha OQ-002),
taxada como qualquer transferencia P2P real neste projeto. **Tela do
jogador construida** na Fase Q (fechamento de decisoes) —
`/painel/transferencias`, com estimativa de taxa em tempo real,
confirmacao explicita e historico de enviados/recebidos (`GET
wallet/transfers/history`, nunca expoe metadado de risco/seguranca). Ver
manual do jogador.

### Sinais de risco de transferencia (agora ligados)

`IMMEDIATE_WCOIN_TRANSFER`/`NEAR_FULL_BALANCE_TRANSFER`/
`MANY_RECIPIENTS_AFTER_PURCHASE`/`REPEATED_RECIPIENT_NETWORK` — definidos
desde a Fase P, sem detector real ate agora. Disparam a partir de dados
reais do ledger (credito de recarga recente, saldo antes da
transferencia, contagem de destinatarios/remetentes distintos numa
janela) — nunca uma suposicao sobre a origem do dinheiro.
`PAYMENT_ACCOUNT_MISMATCH` continua sem suporte — o Mercado Pago nao
devolve nenhum identificador de pagador consultavel (ver
`docs/open-questions.md` OQ-023).

**`TRANSFER_RESTRICTION` no Marketplace (Fase Q — fechamento de
decisoes)**: uma auditoria real do fluxo economico de
`marketplace.service.ts` (nao so uma suposicao) mostrou que a
recomendacao tecnica anterior da Fase Q estava **invertida** —
COMPRA no Marketplace debita a carteira do comprador e move o WC
diretamente para o vendedor especifico do anuncio, exatamente o padrao
que a restricao existe para impedir. Venda/Liquidacao/Anuncio/Reembolso
nunca dispersam WC do zero (so recebem credito de um pedido ja pago), e
por isso continuam liberados. Politica final, ja implementada:
`MARKET_BUY_WHILE_TRANSFER_RESTRICTED` = BLOQUEADO,
`MARKET_SELL/LIST/SETTLEMENT_WHILE_TRANSFER_RESTRICTED` = PERMITIDO.
Fecha OQ-024. Ver ADR-0022.

### Compra de VIP pelo jogador (tela nova)

`/painel/vip` — catalogo real (Bronze/Prata/Ouro x 7/15/30 dias),
beneficios aprovados, status atual, historico em Meus Pedidos. Usa o
mecanismo de compra JA EXISTENTE (debito de WC sincrono, atomico com a
concessao) — nao um novo fluxo via Mercado Pago. Precos ja batiam
exatamente com a tabela aprovada por Bryan (Bronze 6/11/20, Prata
9/17/30, Ouro 12/23/40 WC) desde a Fase 15 — nenhuma migracao de dados
foi necessaria.

**Politica de troca de nivel enquanto ja ativo** (Fase Q — fechamento de
decisoes) — Bryan rejeitou explicitamente o comportamento anterior
("ultimo nivel vence" + dias sempre somam, mesmo trocando de nivel), que
podia destruir ou inflar valor pre-pago silenciosamente (ex.: 20 dias
restantes de Bronze + compra de 30 dias de Ouro nunca deve virar 50 dias
de Ouro sem nenhuma base de conversao real). Politica nova, conservadora
e explicitamente temporaria: **mesmo nivel** enquanto ativo → soma os
dias normalmente (inalterado); **nivel diferente** enquanto ativo →
**bloqueado** ate expirar, nunca silencioso (`VIP_TIER_CHANGE_BLOCKED`).
A tela do jogador (`/painel/vip`) mostra os outros niveis como
bloqueados com explicacao quando ha VIP ativo. A pergunta de desenho
real (qual modelo de conversao/upgrade deve existir no futuro) foi
registrada separadamente como `VIP_TIER_CHANGE_VALUE_CONVERSION` —
`docs/open-questions.md` OQ-026 (substitui a OQ-025, agora fechada). Ver
ADR-0022.

## 5d. Catálogo legado X-Shop/CashShop (Fase S, 2026-09-02)

Bryan tomou sete decisões comerciais finais sobre os 168 itens do X-Shop
e os 12 do CashShop auditados na Fase R — ver ADR-0023. Nenhum item foi
apagado, removido, desativado ou modificado no GameServer; as decisões
foram persistidas como política real e testada:

| Decisão | Escopo | Status final |
|---|---|---|
| 1 | 153 itens X-Shop (Armas/Armaduras/Asas, todos +13 com as 6 opções excellent) | `LEGACY_CATALOG_NOT_FOR_COMMERCIAL_SALE` — nunca vendável |
| 2 | 12 acessórios X-Shop (Anéis/Pingentes) | `BALANCE_TEST_REQUIRED` — não vendável até teste real de balanceamento |
| 3 | 3 Machados não resolvidos (índices 9/10/11) | `DEAD_UNRESOLVABLE_CATALOG_ROW` |
| 4 | 9 aluguéis de 7 dias do CashShop | `RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST` — mecanismo confirmado, segurança de ciclo de vida ainda não testada |
| 5 | `CoinIndex=508` do CashShop | `UNKNOWN_NON_BLOCKING` — não bloqueia nada, não vale mais tempo de investigação |
| 6 | Schema legado DmN CMS (74 tabelas dormentes) | `LEGACY_DORMANT_PRESERVE_ISOLATED` — nunca reutilizar/reativar/migrar |
| 7 | 3 bilhetes de evento do CashShop | `GREEN_CANDIDATE_NOT_APPROVED` — GREEN não significa aprovado; falta revisão real de evento |

**Tela nova**: **Painel → Loja → Catálogo legado (X-Shop/CashShop)**
(`/painel/admin/catalogo-legado`) mostra as 180 linhas reais com a
decisão de Bryan, o status comercial e o "estado desejado" do Portal
(visível/comprável, preço/moeda/duração pretendidos, elegibilidade
Open Beta/Full Release). **Isto NÃO altera a configuração real do
GameServer** — não existe sincronização automática ainda (ver ADR-0023,
seções E/F). Um botão "Semear/atualizar catálogo" popula/atualiza as
180 linhas a partir da classificação real, de forma idempotente.

**Trava real, não apenas documentada**: itens das Decisões 1 e 3
(`NOT_FOR_COMMERCIAL_SALE`/`DEAD_UNRESOLVABLE_CATALOG_ROW`) nunca podem
virar `comprável=sim` nem status `APPROVED`/`PUBLISHED` por essa tela —
rejeitado com erro real, mesmo por um Super ADM. Nenhuma permissão de
"override" existe hoje.

**Permissões novas** (mesma convenção `admin.store.*` já usada):
`admin.store.legacy-catalog.view`, `.edit`, `.sync` — `.sync` existe
para uma futura sincronização real com o GameServer (ainda não
construída) e é deliberadamente separada de `.edit`. Nenhuma é
concedida a ADM por padrão — segue o mesmo padrão de concessão por
conta já usado por `admin.store.review`/`admin.store.publish`.

## 5e. Catálogo legado — estado efetivo, drift e operações em lote (Fase T, 2026-09-02)

Segunda extensão da mesma tela (`/painel/admin/catalogo-legado`) — ver
ADR-0024. Três capacidades novas:

**Habilitado desejado (`desiredEnabled`) é diferente de aprovado.** Um
item da Decisão 1 (RED, `BLOCKED`) pode ficar com "Habilitado desejado
= sim" sem nunca virar comprável/aprovado/publicado — pensado para uso
técnico/GM ou um evento controlado futuro, exatamente como Bryan
descreveu na Fase S. A trava de bloqueio permanente das Decisões 1/3
nunca impede esse campo especificamente.

**Estado efetivo real, não apenas desejado.** O botão "Atualizar estado
efetivo (snapshot local)" lê um snapshot local, comprometido no
repositório e verificado por hash contra os arquivos reais do
GameServer (nunca uma conexão ao vivo — a mesma fronteira de segurança
da Fase S, só que via arquivo, não credencial) e mostra, linha a linha,
se o "desejado" do Portal bate com o último estado real conhecido:
**Nunca verificado** / **Em sincronia** / **Divergente**. Isto NÃO
sincroniza nada de volta ao GameServer — é só leitura e comparação.

**Operações em lote.** Selecionar várias linhas e aplicar uma de sete
ações fechadas (marcar BLOCKED/REVIEW_REQUIRED, ocultar, permitir/remover
de Open Beta ou Full Release) — nunca preço, moeda ou opções em lote,
por desenho. Cada linha afetada recebe seu próprio registro de
auditoria (visível no "Histórico" daquela linha especificamente), com
uma justificativa obrigatória.

## 5f. Progressão — XP, Drop, Reset, Master Reset (Fase U, 2026-09-03)

Novo domínio do Control Plane, mesma arquitetura da Fase T aplicada a
um novo assunto — ver ADR-0025. **Tela nova**: **Painel → Servidor →
Progressão** (`/painel/admin/progressao`), com abas por domínio
(Experiência/Drop/Reset/Master Reset).

**O que esta tela mostra.** Para cada uma das 25 configurações reais
(agrupadas por conceito de negócio, não uma linha crua por chave de
arquivo): o valor **efetivo** (lido do GameServer, por snapshot local
hash-verificado — nunca uma conexão ao vivo), o valor **desejado**
(opinião do Portal, se existir — a maioria das linhas começa sem
opinião, o que é diferente de "divergente"), e o estado de
sincronização (**Nunca verificado**/**Em sincronia**/**Divergente**).

~~**Descoberta real desta fase**: o limite de reset do tier Gold está
hoje configurado em 50... e a meta de política de Bryan é 20 para
todos.~~ **Fechado na Fase V (2026-09-04, ver 5g abaixo)**: essa meta
provisória virou decisão final e formalizada. O Gold real continua 50
— a tela mostra "Divergente" honestamente, sem que nada tenha sido
alterado no GameServer.

**Unidades nunca inventadas.** Vários campos de XP (`AddExperienceRate_AL0-3`
e outros) mostram a unidade como "não confirmada" em vez de "x" ou "%"
— a fórmula real de cálculo de experiência deste servidor permanece
desconhecida mesmo após investigação real (ver documentação técnica).
**Nunca chame este servidor de "50x" com base nesse número.**

**Justificativa obrigatória para risco alto.** Configurações marcadas
risco HIGH ou CRITICAL (ex.: taxa de XP, limite de reset, chave
mestra de Reset/Master Reset) exigem uma justificativa por escrito
para qualquer edição — o botão "Salvar" fica desabilitado sem ela.

**Sem sincronização real, por desenho.** Igual à Fase T: existe um
botão/permissão de sincronização (`admin.progression.sync`), mas ele
está bloqueado por três razões independentes (permissão dedicada +
kill switch de ambiente desligado por padrão + nenhum comando real
implementado) — nada que essa tela faça altera o GameServer de
verdade ainda.

## 5g. Progressão — política de negócio vs configuração efetiva (Fase V, 2026-09-04)

Nova coluna/filtro na mesma tela: **Política de negócio**, com cinco
valores possíveis — **Não avaliado**, **Aprovado**, **Efetivo, não
aprovado**, **Divergente da política**, **Desativado**.

**Por que isso existe.** "Efetivo" e "desejado" respondem uma pergunta
técnica (o Portal e o GameServer concordam?). "Política de negócio"
responde uma pergunta diferente e mais importante para o negócio: esse
valor específico já foi realmente aprovado por Bryan como benefício VIP
intencional? Uma configuração estar ativa e funcionando no GameServer
NÃO significa que ela foi aprovada como política comercial — a maioria
das taxas diferenciadas por VIP hoje (XP, drop de item, drop de zen,
pontos de reset) mostra **"Efetivo, não aprovado"**, o estado honesto
padrão até que exista uma decisão real.

**Decisão final: limite de reset = 20 para todos os tiers.** A única
linha que já saiu desse estado padrão é `reset.cap` — Bryan fechou a
decisão nesta fase: **20 resets para Free/Bronze/Silver/Gold, sem
exceção**. O Gold real (50) aparece como **"Divergente da política"**
— uma divergência real e presente, não um exemplo hipotético. Motivo
registrado no histórico da linha: VIP pode oferecer aceleração/
conveniência controlada, mas nunca um destino de progressão permanente
indisponível ao jogador Free. Nenhuma sincronização com o GameServer
foi feita — o Gold real continua 50.

## 5h. Progressão — painel de evidência de drift em produção (Fase W, 2026-09-04)

Novo bloco informativo no topo de `/painel/admin/progressao`, acima dos
cartões de resumo: **"Evidência de drift em produção (OR-023) —
apenas leitura"**. Resume, em texto simples, um drift real e
pré-existente encontrado em produção (não causado por este Portal): o
drop de item por mapa foi zerado em 67 de 67 mapas, e 10 monstros-chefe
nomeados tiveram seu `ItemRate` individual revertido de um
valor-sentinela para um valor normal — enquanto 214 outros monstros
continuam no valor-sentinela hoje. **Este bloco não tem nenhum botão
ou ação** — é puramente informativo, com um link para a investigação
técnica completa (`docs/drop/or-023-forensics.md`). Nenhuma
funcionalidade de restauração automática existe nesta tela nem em
nenhum outro lugar do Portal para este drift.

## 5i. Calculadora de XP — fundação estrutural (Fase X, 2026-09-04)

Nova página: **Servidor → Calculadora de XP (estrutural)**
(`/painel/admin/calculadora-progressao`). Mostra a taxa base do
servidor (50x, política de produto) separada do valor de config
AccountLevel (50/60/60/60), a lista real de modificadores de XP
(selos, buffs, talismãs, pet, extraídos do `Effect.txt` real de
produção), e permite marcar quais estariam ativos — combinações que
compartilham o mesmo grupo do `Effect.txt` (ex.: Selo de Ascensão +
Selo Mestre de Ascensão) são **bloqueadas automaticamente**, com um
aviso explicando por quê.

**O que esta calculadora nunca faz**: nunca mostra uma porcentagem de
XP combinada (a fórmula real de stack é desconhecida), e nunca mostra
um tempo estimado até nível/reset — a seção correspondente sempre
mostra `CALCULATION_BLOCKED_BY: XP_STACK_FORMULA, LEVEL_CURVE`. Os
dois cálculos que ELA faz de verdade são aritmética real sobre números
que o admin informa manualmente: XP/hora (a partir de XP-por-kill e
kills/hora) e capacidade teórica de spawn (a partir da contagem de
monstros de um spot e um tempo de respawn confirmado — sem esse
tempo, mostra `BLOQUEADO` em vez de adivinhar). Somente leitura, mesma
permissão `admin.progressao.view` já usada na tela de Progressão —
nenhuma nova capacidade sensível foi adicionada.

## 5j. Recompensas de Beta e Bug Hunters — registro de elegibilidade e geração (Fase Z, 2026-09-04)

Nova página: **Configurações → Recompensas de Beta**
(`/painel/admin/beta-rewards`, `admin.beta-rewards.view`/`.generate`),
mais a nova área de triagem **Bug Hunters** (`/painel/admin/bug-hunters`,
`admin.bug-hunters.view`/`.triage`) descrita no manual do ADM.

**Dois passos deliberadamente separados**, para nunca inferir elegibilidade
de recompensa a partir de `accountPhase` ou de uma data sozinha:

1. **Registrar um FATO DE ELEGIBILIDADE** (`BetaParticipationRecord`) —
   origem explícita (participação no Open Beta, contribuição de Bug
   Hunter, participação em evento, concessão manual da equipe, ou lista
   revisada importada), justificativa obrigatória e auditável, e-mail
   normalizado/hash (mesmo mecanismo já existente de
   `beta-lifecycle.service.ts`, nunca reimplementado). Nenhum tipo ou
   valor de recompensa é definido aqui — essa é a linha entre "por que
   essa conta é elegível" e "o que ela recebe", propositalmente mantida
   separada.
2. **Gerar as recompensas reais** — selecione registros com status
   `RECORDED`, defina tipo/quantidade de recompensa, **rode a prévia
   (dry-run) antes de confirmar**. A geração é idempotente: um registro
   já `CONVERTED` nunca é processado de novo, mesmo que você repita a
   mesma seleção. Ao confirmar, cria um `BetaRewardEntitlement` real
   (status `ELIGIBLE`, imediatamente resgatável pelo fluxo de claim já
   existente) e marca o registro de origem como `CONVERTED`.

**A geração de recompensa nunca depende da conta original de Beta ainda
existir** — o vínculo durável é o e-mail normalizado com hash, não uma
referência de conta viva, exatamente como o `BetaRewardEntitlement`
original já foi desenhado (Fase Open Beta P0). Contas pré-Beta
protegidas contra purga não são afetadas por nada nesta tela — nenhuma
purga é acionada aqui.

**A ligação com Bug Hunters nunca paga nada sozinha.** Ao confirmar que
um relato de bug é elegível para recompensa (na tela de Bug Hunters), o
sistema apenas registra um `BetaParticipationRecord` com origem
`BUG_HUNTER_CONTRIBUTION` vinculado ao relato — a geração real da
recompensa continua exigindo o passo 2 acima, sempre uma ação explícita
de um Super ADM.

## 6. Operações administrativas destrutivas

### Exclusão normal de conta (`NORMAL_ACCOUNT_DELETION`)
Anonimização em vigor, não apagamento físico — o registro da conta
sobrevive (tombstoned⁴), mas nome/e-mail/senha/2FA são
irreversivelmente substituídos por valores não reversíveis. Disponível
para ADM com `admin.accounts.status.manage`.

### `PRE_BETA_PURGE` — exclusiva de Super ADM

**Esta é a única operação genuinamente irreversível e de apagamento físico
real do sistema.** Restrita por padrão a SUPER_ADMIN através de uma
permissão própria e separada (`admin.accounts.purge.manage`) — nunca
concedida automaticamente a ADM, nem mesmo a um ADM que já tenha
`admin.accounts.status.manage`.

**Só pode ser usada em contas explicitamente elegíveis**: fase da conta é
`PRE_BETA` (nunca `OPEN_BETA`/`OFFICIAL`), papel é `PLAYER` (nunca
equipe), saldo de moeda zerado, sem histórico de recarga/compra paga, sem
histórico de concessão VIP real. Qualquer uma dessas condições falhando
bloqueia o expurgo daquela conta especificamente.

**Interface**: `/painel/admin/pre-beta-purge` (item "PRE_BETA_PURGE" no
menu Configurações, visível apenas para SUPER_ADMIN com a permissão
`admin.accounts.purge.manage`).

**Fluxo obrigatório** (implementado por completo nesta rodada, Fase K):
1. **Dry-run⁵** (`GET pre-beta-purge/dry-run?betaCycleId=...`) — mostra,
   sem executar nada, quais contas seriam realmente apagadas
   (`WOULD_DELETE`), quais estão bloqueadas (`BLOCKED`, com o motivo
   exato) e quais têm dependência desconhecida.
2. **Revisão e seleção explícita** — a tabela de resultados do dry-run é
   exibida por completo (elegíveis e bloqueadas, com motivos); **nada vem
   pré-selecionado** — cada conta a purgar precisa ser marcada
   individualmente, e apenas contas `WOULD_DELETE` podem ser marcadas.
   Não existe um botão "apagar tudo".
3. **Resumo final** — antes de qualquer execução, uma tela dedicada lista
   exatamente quais `accountId`s serão purgados e o que isso remove
   (conta/personagens no Portal + comando `PURGE_GAME_ACCOUNT` real no
   GameServer).
4. **SEGUNDA CONFIRMAÇÃO explícita** — uma frase digitada,
   `PURGAR CONTAS`, precisa ser escrita exatamente igual para o botão de
   execução destravar. Nada pré-preenchido, nada pré-marcado. Esta é a
   confirmação destrutiva separada que faltava — implementada nesta
   rodada, fechando a lacuna registrada na seção "Pendências" de rodadas
   anteriores.
5. **Execução** — cada conta é revalidada de verdade no momento da
   execução (nunca confia num dry-run já feito antes); se qualquer conta
   da lista falhar a revalidação, o lote inteiro é recusado, sem exclusão
   parcial.
6. **Envio ao GameBridge** — para cada conta com identidade real no
   GameServer, um comando `PURGE_GAME_ACCOUNT` é enviado (ver seção 7).
7. **Relatório do lote** — `GET pre-beta-purge/:betaCycleId/report` mostra
   o status real da entrega no GameServer para cada conta do lote (a
   pós-verificação além do dry-run do lado do Portal).

### Anonimização real da conta no GameServer (`ANONYMIZE_GAME_ACCOUNT`)
Acionada automaticamente pelo fluxo de exclusão normal do jogador (não é
uma ação manual separada de Super ADM) — ver `docs/accounts/account-deletion-architecture.md`.

## 7. GameBridge⁶

O GameBridge é o mecanismo real que leva decisões do Portal até o SQL
Server⁷ do GameServer. Quatro operações reais hoje: `GRANT_VIP`,
`SYNC_VIP_TIER`, `ANONYMIZE_GAME_ACCOUNT`, `PURGE_GAME_ACCOUNT` — mais a
operação original, `CREATE_GAME_ACCOUNT` (provisionamento).

### Kill switches

Cada uma das quatro operações tem seu próprio interruptor independente no
lado do Agent (`GAME_BRIDGE_GRANT_VIP_ENABLED`,
`GAME_BRIDGE_SYNC_VIP_TIER_ENABLED`, `GAME_BRIDGE_ANONYMIZE_ENABLED`,
`GAME_BRIDGE_PURGE_ENABLED`) — todos desligados por padrão. `PURGE`
permanece desligado mesmo depois de ligar os outros três, por decisão
deliberada, já que é a única operação genuinamente irreversível. Também
existem interruptores do lado do Portal (`ACCOUNT_LIFECYCLE_BRIDGE_ENABLED`,
`VIP_SYNC_RECONCILIATION_ENABLED`) que controlam se o Portal sequer tenta
enviar comandos — desligados por padrão, defesa em profundidade com os
interruptores do Agent.

**Hoje (2026-08-30), todos esses interruptores estão desligados em
qualquer ambiente real** — o GameBridge foi validado localmente (ver
manual de operação técnica) mas nunca ligado contra produção.

### Reconciliador de VIP

Um serviço periódico do Portal (`VipSyncService`) compara continuamente o
nível VIP que o Portal calcula como correto contra o último nível
confirmado no GameServer, e corrige automaticamente qualquer divergência
(incluindo expiração natural, que derruba o nível para zero) — sem
depender de um humano revogar manualmente.

**Correção crítica real, Fase L (2026-08-31)**: uma auditoria completa do
corpo real das procedures nativas `WZ_SetAccountLevel`/`WZ_GetAccountLevel`
encontrou e reproduziu um bug real: `bm_GrantVip`/`bm_SyncVipTier` nunca
escreviam `MEMB_INFO.AccountExpireDate`, e a procedure nativa que roda a
cada login do jogador (`WZ_GetAccountLevel`) reverte automaticamente
`AccountLevel` para zero sempre que essa data está no passado (o padrão,
já que ela nunca era escrita). **Na prática, nenhuma concessão de VIP via
GameBridge teria sobrevivido ao próximo login do jogador antes desta
correção.** Corrigido e testado de ponta a ponta (SQL → Agent → Worker →
Portal) nesta rodada — ver `docs/vip/wz-setaccountlevel-coexistence.md`
para o detalhe completo. Ainda em aberto: se algo mais (uma ferramenta
nativa do GameServer, ou o painel legado `hostbr-web` encontrado nesta
rodada) ainda chama `WZ_SetAccountLevel` diretamente em produção — não
pôde ser confirmado nem descartado a partir dos arquivos locais.

## 8. Auditoria

`admin.audit.view`/`admin.audit.full.view`/`admin.audit.history.view` dão
acesso a diferentes níveis de detalhe do histórico de ações
administrativas. Operações do GameBridge para anonimização/expurgo são
espelhadas em eventos de auditoria correlacionados por `commandId`,
permitindo rastrear ponta a ponta: quem pediu → quando foi enviado →
quando/se foi confirmado pelo GameServer.

## 9. Segurança

- Todo papel diferente de PLAYER exige 2FA obrigatório.
- O login `bloodmoon_writer` (produção)/`bloodmoon_writer_local` (teste
  local) usado pelo GameBridge Agent tem privilégio mínimo⁸ — só pode
  executar (`EXECUTE`) procedures nomeadas específicas, nunca ler/escrever
  diretamente em nenhuma tabela.
- Nenhum segredo (senha, token, chave) deve aparecer em texto puro em
  nenhum arquivo versionado — ver `docs/security/secret-rotation.md` e
  `docs/security/secret-incident-history.md`.

## 10. Controles de produção

**Regra permanente, sem exceção**: nenhuma alteração em SQL Server⁷ de
produção, nenhuma mudança de grant³ de produção, nenhuma execução real de
anonimização ou expurgo, nenhuma venda VIP habilitada, nenhum deploy,
nenhum push — até uma decisão explícita e separada sua, depois de toda a
validação local estar completa. Isso vale mesmo quando o código já está
implementado e testado localmente — implementação e teste local nunca
autorizam produção por si só.

## 11. Propriedade de configuração e limites de ambiente

- **Ambiente local de desenvolvimento**: MySQL local (Portal),
  SQL Server 2022 Developer Edition local (GameServer de teste) — ver
  manual de operação técnica para os detalhes completos.
- **Produção**: hospedagem cPanel (Portal/site), SQL Server real de
  produção (GameServer) — acesso administrativo real, fora do escopo de
  qualquer sessão de automação.
- Nenhuma sessão de automação (incluindo assistentes de IA usados no
  desenvolvimento) tem ou deve ter acesso de escrita à produção sem uma
  autorização explícita, sessão por sessão.

## 12. Pendências conhecidas (reportadas honestamente, não escondidas)

- As quatro stored procedures⁹ do GameBridge foram validadas contra um
  SQL Server local real (123/123 testes passando, mais uma auditoria
  completa das 138 tabelas reais — ver `docs/gameserver/database/`), mas
  **nunca instaladas em produção** — isso continua exigindo sua decisão
  explícita e separada.
- A tela de gerenciamento de preferências opcionais do jogador (anúncios,
  convites de guilda, etc.) tem o schema pronto
  (`docs/privacy/privacy-center-overview.md`) mas nenhuma interface —
  ainda `EM BREVE` no Centro de Privacidade do jogador.
- Uma auditoria de segurança do CMS legado DmN não pôde determinar quem
  escreve em `DmN_Admin_Logins`/`DmN_IP_Log`/`DmN_OnlineCheck` hoje —
  nenhum binário do GameServer nem código-fonte do painel legado está
  disponível localmente para essa investigação
  (`docs/gameserver/database/legacy-unknown-structures.md`).

## Glossário deste manual

1. **2FA**: ver manual do jogador, seção 3.
2. **GameServer**: ver manual do jogador, seção "Provisionamento".
3. **WCOIN** / **Grant**: WCOIN é a moeda unificada do Portal (ver manual
   do jogador); "grant" aqui se refere a uma permissão concedida no banco
   de dados a um login (ex.: `GRANT EXECUTE`).
4. **Tombstone (lápide)**: um registro que marca "esta conta foi excluída"
   sem apagar fisicamente a linha do banco de dados — preserva a
   integridade referencial de outros registros que dependem dela (como
   histórico de compras).
5. **Dry-run**: uma execução simulada que mostra o que *aconteceria* sem
   realmente fazer nenhuma alteração — usada para revisar antes de
   confirmar uma ação irreversível.
6. **GameBridge**: ver `docs/glossary.md`.
7. **SQL Server**: ver `docs/glossary.md`.
8. **Privilégio mínimo (least privilege)**: ver `docs/glossary.md`.
9. **Stored procedure**: ver `docs/glossary.md`.
