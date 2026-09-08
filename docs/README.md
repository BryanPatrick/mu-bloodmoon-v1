---
status: LIVING_INDEX
lastVerified: 2026-08-31
---

# Blood Moon — índice central da documentação

**O que é o Blood Moon** (adicionado 2026-08-31, Fase M, após uma
simulação real de bootstrap de agente novo apontar que isso nunca estava
escrito em nenhum lugar): Blood Moon é um servidor privado de MU Online
(Season 6, até Rage Fighter/Fist Master) com uma plataforma web/produto
completa em volta do jogo — Portal (`apps/web`, Nuxt) e API
(`apps/api`, NestJS) com contas, VIP, economia (WCoin/GP/HP), mercado
entre jogadores, comunidade/guildas, e um Launcher desktop (.NET/WPF) —
conectados ao GameServer real (SQL Server, banco `MuOnline`) através de
um pipeline dedicado, o GameBridge (`apps/game-bridge-agent` + Cloudflare
Worker), que é o único caminho de escrita para o banco do jogo. Ver a
seção "Arquitetura e sistemas" abaixo para o diagrama completo, e
`docs/manuals/technical/manual-operacao-tecnica.md` §1 para a versão
técnica detalhada.

Este arquivo é o ponto de entrada para toda a documentação técnica do
projeto. Ele não substitui os documentos individuais — cada um continua
sendo a fonte de verdade do seu próprio assunto — apenas aponta para onde
cada tipo de informação vive hoje.

**Nota de reconciliação (2026-09-08)**: este índice foi originalmente
escrito em `mu-bloodmoon-v1-openbeta` (onde permanece, ainda não
commitado, recuperado nesta mesma data em
`D:\MU\RecoveryBackups\openbeta-2026-09-08\`) e agora também vive,
canonicamente, em `governance/engineering-pack`
(`mu-bloodmoon-engineering-governance`), junto com `AGENTS.md` e
`docs/protocols/agent-bootstrap.md`. Este branch de governança contém
só documentação de processo/arquitetura — os domínios de feature que
este índice também mapeia abaixo (VIP, GameBridge, manuais, ADRs,
knowledge, etc.) continuam existindo apenas nas branches de feature
correspondentes até uma consolidação futura; os links abaixo para esses
domínios são referências cross-branch reais, não conteúdo presente
nesta árvore.

**Regra permanente**: histórico nunca é apagado. Quando uma decisão muda,
o documento afetado registra ANTERIOR → motivo da mudança → NOVA DECISÃO,
em vez de sobrescrever silenciosamente. Este índice é atualizado sempre que
um documento novo é criado ou uma categoria muda de lugar — mas, como
qualquer índice, ele pode ficar temporariamente atrás da árvore real de
arquivos; em caso de dúvida, o `ls`/`find` da pasta é sempre a fonte
definitiva do que existe agora.

**ANTES DE QUALQUER AÇÃO DE ENGENHARIA não-trivial** (estabelecido
2026-08-31, regra permanente): siga
[`docs/protocols/agent-bootstrap.md`](protocols/agent-bootstrap.md) —
leia este índice, identifique o domínio, verifique
[`docs/decisions/`](decisions/) e os docs de sistema relevantes, e só
então trabalhe. Nunca trabalhe apenas da memória do modelo, de um resumo
de sessão anterior, ou de uma suposição — se a informação necessária não
existir nos docs, procure e documente o que foi encontrado (marque
`UNKNOWN`/`NEEDS_VALIDATION` se não resolvido), nunca adivinhe. Esta regra
existe por um motivo real e concreto: um documento desta árvore
(`docs/gameserver/database/legacy-unknown-structures.md`) já afirmou
incorretamente que uma fonte não existia localmente, porque a busca que a
gerou não seguiu esse protocolo — ver a correção registrada nesse mesmo
arquivo.

Regras completas para qualquer agente de IA trabalhando neste repositório
(Claude Code, Codex, ou outro) estão em [`AGENTS.md`](../AGENTS.md) (na
raiz do repositório) — `CLAUDE.md` existe apenas pela convenção própria
de carregamento do Claude Code e aponta para o mesmo `AGENTS.md`.

**Estado atual deste índice**: criado em 2026-08-30 como parte da extensão
do GameBridge Agent (`docs/gamebridge/`), atualizado no mesmo dia com os
manuais dedicados e o glossário central. Atualizado novamente em
2026-08-31 (Fase M) com o log de ADRs expandido (17 decisões), o mapa de
23 módulos, o padrão de registro de sessão, o limite Knowledge Hub, os
índices de riscos/perguntas/evidência-de-teste abertos, e o índice
legível por máquina (`docs/index.json`). Cobre as pastas que existem hoje
com uma descrição honesta do que cada uma contém — não é um catálogo
arquivo-por-arquivo de tudo.

## Manuais e referência

| Documento | O que contém |
|---|---|
| [`docs/manuals/player/manual-player.md`](manuals/player/manual-player.md) | Manual do jogador — conta, segurança, Launcher, loja, VIP, marketplace, guildas, privacidade, exclusão de conta |
| [`docs/manuals/admin/manual-adm.md`](manuals/admin/manual-adm.md) | Manual do ADM — RBAC, o que ADM pode operar, explicitamente o que NÃO pode (PRE_BETA_PURGE) |
| [`docs/manuals/super-admin/manual-super-admin.md`](manuals/super-admin/manual-super-admin.md) | Manual do Super ADM — o manual operacional mais completo: papéis, GameBridge, PRE_BETA_PURGE, kill switches, controles de produção |
| [`docs/manuals/technical/manual-operacao-tecnica.md`](manuals/technical/manual-operacao-tecnica.md) | Manual de operação técnica — arquitetura de cada componente, procedimentos "como fazer", solução de problemas |
| [`docs/glossary.md`](glossary.md) | Glossário central de siglas/termos técnicos + o padrão de notas de rodapé numeradas |

## Arquitetura e sistemas

| Pasta | O que contém |
|---|---|
| [`docs/game-data/`](game-data/) | Arquitetura do Game Data Platform: pipeline Agent→Cloudflare→apps/api, contrato de eventos, topologia de deployment, schema do GameServer (`docs/game-data/schema/`), vinculação de contas |
| [`docs/gamebridge/`](gamebridge/) | O plano de extensão do GameBridge Agent (GRANT_VIP/SYNC_VIP_TIER/ANONYMIZE_GAME_ACCOUNT/PURGE_GAME_ACCOUNT) — arquitetura, contratos, decisões, status de implementação, e o [pacote de segunda revisão](gamebridge/gamebridge-second-review-package.md) (checksums, checklist formal) |
| [`docs/privacy/`](privacy/) | Status real do Centro de Privacidade do jogador, a fundação de preferências opcionais/essenciais, e (Fase L) a [validação real de migração + QA autenticado](privacy/privacy-center-migration-and-qa.md) |
| [`docs/gameserver/database/`](gameserver/database/) | Engenharia reversa sistemática do banco SQL Server real (138 tabelas/86 procedures/2 views/1 trigger): visão geral, dicionário de dados, relacionamentos lógicos, procedures, views/triggers, mapas de conta/personagem/economia/privacidade, estruturas legadas desconhecidas, e o ambiente de laboratório local (`lab-environment.md`) — cada estrutura marcada `CONFIRMED`/`STRONG_EVIDENCE`/`HYPOTHESIS`/`UNKNOWN` |
| [`docs/legacy/provider-web/`](legacy/provider-web/) | Segunda investigação profunda do painel PHP legado ("DmN CMS", backup local `hostbr-web-20260716`, **NOT_DEPLOYED** em produção — ver Decisão 1 em `vip/wz-setaccountlevel-coexistence.md`): inventário completo de módulos, mapeamento código-web→tabela-SQL, achados de segurança (sem segredos reais impressos), VIP/pagamentos/ciclo-de-vida-de-conta legados, tarefas cron, e referência histórica útil — tudo classificado como HISTORICAL_REFERENCE, nunca política atual do Blood Moon |
| [`docs/accounts/`](accounts/) | Identidade de conta GameServer, provisionamento, arquitetura de exclusão de conta, revisão das contas pré-Beta |
| [`docs/security/`](security/) | Classificação de dados, envelope de credencial do GameServer, limite de escrita do GameBridge (`game-write-boundary.md`), histórico de incidentes de segredo, e a [auditoria de credenciais do GameServer](security/gameserver-credential-audit.md) (Fase L) |
| [`docs/database/`](database/) | Histórico e reconciliação de migrações |
| [`docs/launcher/`](launcher/) | Contrato de API/assets do Launcher, cache, CMS do Launcher Studio, o [motor de resolução](launcher/resolution-engine.md) (Fase L3), desde a Fase 8 (2026-09-04): [escala do launcher + escala de texto](launcher/launcher-scale-and-text-scale.md) (COMPACTO 70% a MUITO GRANDE 130%, independente do tamanho de texto, `LayoutTransform` real sem Viewbox, ajuste automático à área de trabalho) — e desde a Fase Launcher 2D (2026-09-04): [autenticação + CAPTCHA + Play gating](launcher/phase-2d-auth-captcha-play-gating.md) (desafio Turnstile real via WebView2, `captchaToken` alinhado ao contrato real da API, bug real de Play gating encontrado e corrigido, QA local ponta a ponta verificada ao vivo) |
| [`docs/integrations/`](integrations/) | Integrações externas (hoje: Discord read API) |
| [`docs/design/`](design/) e [`docs/design-history/`](design-history/) | Identidade visual, inventário de assets, histórico visual comparativo |
| [`docs/assets/`](assets/) | Biblioteca central de assets |

## Economia, VIP e comércio

| Pasta | O que contém |
|---|---|
| [`docs/vip/`](vip/) | Auditoria profunda de VIP, matriz de benefícios, decisões de benefício, prontidão de produto, o [fluxo de dados ponta a ponta](vip/vip-end-to-end-data-flow.md), e a [auditoria de coexistência WZ_SetAccountLevel](vip/wz-setaccountlevel-coexistence.md) (bug crítico real encontrado e corrigido, Fase L) |
| [`docs/economy/`](economy/) | Inventário completo do CashShop/X-Shop, investigação da legacy DMN CMS, plano de teste do Lucky Set, grupos de revisão em lote do X-Shop — mais, desde a Fase R (2026-09-02): [revisão comercial do X-Shop](economy/xshop-commercial-review.md) e [do CashShop](economy/cashshop-commercial-review.md) (classificação GREEN/YELLOW/RED/UNKNOWN real, contra fonte reverificada ao vivo), as [tabelas de decisão completas](economy/xshop-bryan-decision-table.md) (168 + 12 linhas), e os [candidatos a Open Beta/full release](economy/xshop-cashshop-release-candidates.md) — mais, desde a Fase S (2026-09-02, fechamento de decisões): as sete decisões finais de Bryan ([ADR-0023](decisions/0023-store-catalog-decision-closure.md)), o [runbook empírico de aluguel do CashShop](economy/cashshop-rental-empirical-test-runbook.md), e o [plano de teste de balanceamento dos acessórios do X-Shop](economy/accessory-balance-test-plan.md) |
| [`docs/catalogs/`](catalogs/) | Catálogo de itens de comércio (CSV/JSON/MD) |
| [`docs/payments/`](payments/) | Política de retenção financeira, e a [comparação completa das três superfícies de pagamento](payments/payment-surfaces-comparison.md) (Portal atual/CMS legado/`PixPayments`, Fase L) — mais, desde a Fase N (2026-08-31): o [contrato de prontidão de pagamento](payments/payment-readiness-contract.md), os inputs reconciliados para a próxima fase de implementação (fluxo Order/Payment/Delivery, modelo de entrega de WCoin, tabela de preço VIP preservada) |
| [`docs/store/`](store/) | Desde a Fase R (2026-09-02): [limites entre os cinco canais econômicos](store/store-channel-boundaries.md) (Loja oficial/X-Shop/CashShop/Marketplace/transferência direta de WC) e a [taxonomia de produtos futuros](store/store-product-taxonomy.md) — mapeamento de arquitetura apenas, nada integrado até a Fase S. Desde a Fase S: `/painel/admin/catalogo-legado` (camada de "estado desejado" real, sem sincronização com o GameServer). Desde a Fase T (2026-09-02, [ADR-0024](decisions/0024-legacy-shop-control-plane.md)): estado efetivo real (snapshot local hash-verificado), detecção de drift, operações em lote, e o [mapa de campos de configuração X-Shop/CashShop](economy/xshop-cashshop-config-field-matrix.md) |
| [`docs/product/`](product/) | Documentação de produto por fase/sistema (guild, phase13, ...) e a [fundação do sistema de pesquisas](product/survey-foundation.md) (schema, sem UI ainda) |
| [`docs/progression/`](progression/) | Desde a Fase U (2026-09-03, [ADR-0025](decisions/0025-progression-control-plane.md)): [mapa de campos de configuração de XP/Drop/Reset/Master Reset](progression/progression-config-field-matrix.md) (hash-verificado contra a produção real) e a [investigação de stacking de XP](progression/xp-stacking-investigation.md) (fórmula real permanece `UNKNOWN`, honestamente) — `/painel/admin/progressao` (camada de "estado desejado" real, sem sincronização com o GameServer, mesma arquitetura da Fase T). Desde a Fase V (2026-09-04, [ADR-0026](decisions/0026-progression-evidence-and-balance-readiness.md)): [matriz de drift de política VIP](progression/vip-progression-policy-drift-matrix.md) (limite de reset fechado em 20 para todos os tiers), [evidência de fórmula de XP + pacote de perguntas ao fornecedor](progression/xp-formula-evidence-and-vendor-questions.md), [dataset de nível/monstro/mapa](progression/level-curve-monster-map-dataset.md), [auditoria de reset + modelo de tempo-até-reset](progression/reset-audit-and-time-to-reset-model.md), e [prontidão de simulador/telemetria](progression/balance-simulator-and-telemetry-readiness.md). Desde a Fase W (2026-09-04, [ADR-0027](decisions/0027-or-023-forensics-and-balance-inputs.md)): [pacote de perguntas ao fornecedor em PT-BR](progression/xp-vendor-package-pt-br.md) (finalizado, não enviado), o [template de registro de resposta do fornecedor](progression/vendor-response-intake-template.md), e [modelo de playtime + auditoria de poder final VIP](progression/balance-inputs-playtime-and-vip-power.md) (achado real: `reset.stat_points` continua sendo uma vantagem de poder final mesmo depois do `reset.cap` ser corrigido). Desde a Fase X (2026-09-04, [ADR-0028](decisions/0028-xp-stack-and-progression-calculator.md)): [inventário de stack de XP](progression/xp-stack-inventory.md) (itens/selos/buffs reais do `Effect.txt` de produção, mecanismo real de exclusão mútua por Group confirmado pelo fornecedor), [análise do dataset de spots](progression/spot-dataset-analysis.md) (58 spots reais, 407 monstros, 15/67 mapas), os datasets `xp-modifier-dataset.json`/`spot-dataset.json`, e `/painel/admin/calculadora-progressao` (calculadora estrutural nova, nunca inventa uma porcentagem combinada) |
| [`docs/drop/`](drop/) | Novo na Fase W (2026-09-04): [forense completa do OR-023](drop/or-023-forensics.md) — linha do tempo real de 4 checkpoints (fábrica/julho/17-ago/3-set), a descoberta de que a mudança de drop é na verdade duas etapas (um "boost" em massa em 224 monstros seguido de uma reversão precisa em 10 chefes), e a atribuição de origem (não é código deste projeto) |

## Ambiente e operação

| Pasta | O que contém |
|---|---|
| [`docs/environment/`](environment/) | Estado do ambiente de desenvolvimento local: `development-environment.md` (SDKs/ferramentas instaladas), `sql-server-test-environment.md` (bloqueio de instalação do SQL Server, ainda não resolvido) |
| [`docs/operations/`](operations/) | Isolamento de banco de teste local, retenção de logs, saúde/reconciliação de provisionamento |
| [`docs/testing/`](testing/) | Baseline de teste do Beta, portão incremental de qualidade |
| [`docs/handoff/`](handoff/) | Documentos de transição/estado atual por área (comunidade, guilds, comércio Beta, bloqueadores) |

## Conhecimento e histórico

| Pasta | O que contém |
|---|---|
| [`docs/knowledge/`](knowledge/) | Pipeline de ingestão de conhecimento (VPS, YouTube), resolução de conflitos, autoridade de fonte — mais, desde a Fase M (2026-08-31): [mapa dos 23 módulos](knowledge/module-map.md) (dependências/interfaces/permissões/status reais, com citações de código), [limite Knowledge Hub vs. docs do repo](knowledge/knowledge-hub-boundary.md), [direção de modularidade comercial](knowledge/commercial-modularity.md), [direção de arquitetura de configurações/features](knowledge/settings-architecture-direction.md), [estrutura do "Blood Moon Book"](knowledge/documentation-book-structure.md), [auditoria atual-vs-histórico](knowledge/current-vs-history-audit.md), [recomendações de limpeza de documentação](knowledge/cleanup-recommendations.md) |
| [`docs/protocols/`](protocols/) | [Protocolo de bootstrap de agente](protocols/agent-bootstrap.md) — sequência obrigatória de 15 passos antes de qualquer ação de engenharia não-trivial, incluindo leitura escopada (não ler a árvore inteira a cada tarefa) — regra permanente desde 2026-08-31; mais [padrão de rodapés numerados](protocols/footnote-standard.md) e [padrão de atualidade de documentação](protocols/freshness-standard.md) (LAST_VERIFIED/CONFIDENCE/etc.) |
| [`docs/decisions/`](decisions/) | Log de decisões formato ADR (CONTEXTO/DECISÃO/POR QUÊ/ALTERNATIVAS/CONSEQUÊNCIAS) — 17 ADRs (0001-0017, Fase M, 2026-08-31), cobrindo VIP/GameBridge/economia/contas/privacidade/pagamentos/modularidade; ainda não é 100% retroativo (ver nota abaixo) — alguns ADRs documentam honestamente uma LACUNA em vez de inventar uma decisão (ex.: ADR-0016, política de RMT não localizada) |
| [`docs/sessions/`](sessions/) | Padrão formal de registro de sessão de trabalho (SESSION_ID/TASK/DOCS_CONSULTED/WORK_DONE/TESTS/HANDOFF/etc., Fase M) — não é para edições triviais, ver critério no próprio arquivo |
| [`docs/open-risks.md`](open-risks.md) / [`docs/open-questions.md`](open-questions.md) | Índices centralizados de riscos técnicos/operacionais conhecidos e de perguntas ainda sem decisão — cada entrada aponta para o doc de domínio completo, não duplica a explicação técnica |
| [`docs/test-evidence-index.md`](test-evidence-index.md) | Mapa central de "quando/como/onde isso foi testado pela última vez" por área (GameBridge, VIP, Pagamentos, etc.) |
| [`docs/index.json`](index.json) | Índice legível por máquina dos documentos em `docs/` — honestamente escopado (ver seu próprio campo `_meta`: cobertura parcial, não uma auditoria completa dos 205 arquivos) |

## Decisões e planos vivos

A maioria das decisões de produto/segurança continua registrada dentro do
documento do sistema a que pertence (ex.: decisões de VIP em
`docs/vip/`, decisões de exclusão de conta em
`docs/accounts/account-deletion-architecture.md`, decisões do GameBridge
em `docs/gamebridge/gamebridge-agent-extension-plan.md`) — isso não
mudou, e continua sendo o lugar certo para decisões específicas de um
único sistema.

[`docs/decisions/`](decisions/) é um log formato ADR para decisões
arquiteturais/de produto que atravessam múltiplos sistemas ou que
precisam ser encontráveis independente de qual doc de domínio alguém
abre primeiro (ex.: ADR-0001 "Portal é a fonte da verdade de VIP" afeta
VIP, GameBridge, e a Portal ao mesmo tempo).

**Atualizado, 2026-08-31 (Fase M)**: um backfill real de 14 novas ADRs
(0004-0017) cobriu a maioria das decisões antes listadas como pendentes
aqui — ciclo de vida de conta no Open Beta (ADR-0004), preservação de
recompensa via e-mail (ADR-0005), arquitetura de dois modos de exclusão
de conta (ADR-0006), postura atual de retenção de dados (ADR-0007), o
modelo de peg/taxa do WCoin (ADR-0008/0009), o mínimo de transferência
direta (ADR-0011), a filosofia do CashShop (ADR-0012), a metodologia de
revisão do X-Shop (ADR-0013), o fallback de assets do Launcher
(ADR-0014), o modelo de recompensa do Bug Hunters (ADR-0015), e a
direção de modularidade comercial (ADR-0017). Cada ADR foi construído a
partir de pesquisa real com citação de arquivo:linha — nenhuma decisão
foi inventada. **Honestamente reportado, ainda incompleto**: a política
de RMT especificamente **não foi encontrada** em nenhum lugar do
repositório após uma busca real (ADR-0016 documenta essa lacuna
explicitamente, em vez de inventar uma política) — permanece como
pergunta aberta real (`docs/open-questions.md`, OQ-005). Muitas outras
decisões arquiteturais mais antigas, fora do escopo desta rodada,
continuam documentadas apenas nos seus docs de domínio, não reescritas
em formato ADR — preencher o restante retroativamente continua sendo
trabalho real futuro, não fingido como já feito.

**Atualizado novamente, 2026-08-31 (Fase N — reconciliação de
política)**: três discrepâncias reais encontradas pela Fase M entre
DECISÃO DE PRODUTO / CÓDIGO ATUAL / DOCUMENTAÇÃO ATUAL foram investigadas
a fundo e reconciliadas, com a política real persistida (não inventada)
diretamente de Bryan: ADR-0008 (peg 1:1 WCoin/R$ — um conflito de código
real foi encontrado e corrigido localmente, não apenas documentado),
ADR-0015 (modelo de recompensa Bug Hunters), ADR-0016 (política de RMT,
incluindo venda de personagem/conta). Cada atualização preserva o texto
histórico original visivelmente (nunca apagado) e registra
explicitamente "a política já existia — o repositório é que não tinha
ela persistida" onde é o caso. Ver
[`docs/payments/payment-readiness-contract.md`](payments/payment-readiness-contract.md)
para os inputs reconciliados que a próxima fase de implementação de
pagamentos deve usar.

**Atualizado novamente, 2026-08-31 (Fase O — implementação de
pagamentos ponta a ponta)**: a Fase O auditou o modelo de domínio de
pagamento real antes de adicionar qualquer coisa nova (resultado:
[`docs/payments/payment-domain-model.md`](payments/payment-domain-model.md)
— três pipelines paralelos e corretos, `RechargeIntent`/`PurchaseIntent`/
`VipEntitlement`, não um `Order` genérico único) e fechou quatro lacunas
reais: (1) `GameBridgeVipGateway`, a primeira implementação real do canal
GameBridge para entrega de VIP (antes, apenas um gateway honesto
"não configurado" existia, apesar de todo o worker de retry/reconciliação
já estar pronto e testado); (2) proveniência explícita
(`baseAmount`/`bonusAmount`/`grossPaidBRL`/`provider`) no lançamento de
crédito de WC; (3) uma ação de estorno explícita e separadamente
permissionada para `RechargeIntent` (`admin.recharge.refund`), espelhando
o padrão já maduro de `PurchaseIntent`; (4) rastreamento de dispersão de
chargeback (`traceChargebackDispersal`) e uma reconciliação agendada
local (`PaymentReconciliationService`). Tudo implementado e testado
localmente (37 novos/atualizados testes reais, ver
[`docs/test-evidence-index.md`](test-evidence-index.md)); nada foi
implantado em produção. Ver
[`docs/decisions/0018-payment-architecture-phase-o.md`](decisions/0018-payment-architecture-phase-o.md)
para o racional completo, incluindo um bug real encontrado e corrigido
durante a própria implementação (não por um teste depois). Lacunas reais
e divulgadas, não escondidas: a leitura read-only do `RechargePackage` de
produção continua bloqueada esperando uma sessão cPanel ao vivo de Bryan
(`docs/open-questions.md` OQ-018); a API real de estorno do Mercado Pago
e uma reconciliação com polling real no provedor não foram construídas
(OQ-019/OQ-021); QA em sandbox real do Mercado Pago não foi possível por
falta de credenciais (OQ-020); fundação de antifraude, UI completa de
pagamento (admin além do botão "Estornar", e jogador), gestão avançada de
pacotes de recarga, e recibo/histórico de pagamento não foram
construídos nesta fase — ver a seção de roteiro abaixo, ainda `PARTIAL`.

**Atualizado novamente, 2026-08-31 (Fase P — fechamento operacional de
pagamentos)**: a Fase P começou com uma correção honesta sobre a própria
Fase O — `PHASE_O = PASS` foi reportado junto de `MANUAL_UPDATED = NAO`
sem sinalizar a tensão contra a regra permanente deste projeto (mudança
de comportamento exige atualização dos manuais). Ver
[ADR-0019](decisions/0019-payment-operational-closure-phase-p.md) para o
registro completo dessa correção e de tudo mais construído nesta fase:
fundação de antifraude real (sinais explícitos e auditáveis, nunca uma
pontuação opaca — `PaymentRiskSignal`/`PaymentRiskCase`), um modelo
formal de caso de chargeback (substituindo a convenção informal
anterior, e revelando + corrigindo um bug real de máquina de estados que
impedia o próprio cenário de chargeback de funcionar), os adaptadores
reais de estorno e reconciliação com o Mercado Pago (construídos contra
a documentação oficial viva do provedor, testados via contrato simulado,
mas explicitamente `SANDBOX_VALIDATION_REQUIRED` — nunca verificados
contra uma chamada real, desligados por padrão), uma trava no cadastro
de pacotes WCOIN que impede o conflito real que a Fase N corrigiu de
voltar por descuido administrativo, três novas abas na tela financeira
administrativa (Reconciliação/Risco/Chargebacks), uma reconstrução real
da página "Meus Pedidos" do jogador (histórico unificado de compras e
recargas, status de entrega, saldo de carteira nunca exibido antes, e o
aviso crítico "não pague de novo" quando um pagamento já foi confirmado
mas a entrega ainda está pendente), e a atualização dos quatro manuais
operacionais. Um total de 41 novos testes reais passando em 8
suítes novas/estendidas, mais uma regressão completa de 126/126 sem
quebras. Lacunas reais e divulgadas, não escondidas: nenhum dos dois
novos adaptadores do Mercado Pago foi validado contra um sandbox real
(`docs/open-questions.md` OQ-019/OQ-021), a política de preço fracionado
para WCOIN permanece uma pergunta aberta (OQ-022), nenhuma página de
compra de VIP existe para o jogador ainda, e a verificação em navegador
desta fase confirmou que as novas telas compilam e renderizam
corretamente mas não foi possível testá-las contra dados reais de
pagamento (API/banco completos não estavam disponíveis nesta sessão) —
ver `docs/open-risks.md` OR-010/OR-011.

**Atualizado novamente, 2026-08-31 (Fase Q — fechamento de prontidao
para producao de pagamentos)**: Bryan tomou cinco decisoes autoritativas
que fecharam a maior lacuna aberta da Fase P. Ver
[ADR-0020](decisions/0020-wcoin-integer-brl-policy-final.md) (politica
final de preco inteiro em reais para WCOIN, fechando OQ-022 sem nenhuma
mudanca de codigo -- a trava da Fase P ja implementava exatamente essa
regra) e [ADR-0021](decisions/0021-payment-restriction-and-transfer-policy.md)
(tudo mais): as tres restricoes financeiras
(`PAYMENT_RESTRICTION`/`TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION`) sao
agora reais, reversiveis, auditaveis e permission-gated -- nunca
automaticas a partir de um sinal; uma transferencia direta de WC entre
jogadores foi construida pela primeira vez neste projeto (nao existia
nenhum recurso real antes, so um valor de enum e uma ADR marcada como
"decidida mas nao implementada"), com os quatro sinais antifraude de
transferencia que ficaram sem detector desde a Fase P agora ligados a
dados reais do ledger; uma pagina real de compra de VIP para o jogador
foi construida (`/painel/vip`) -- contra o fluxo REAL ja existente
(debito sincrono de WC, nao um novo checkout via Mercado Pago), uma
divergencia deliberada e registrada em relacao ao fluxo que a instrucao
da fase presumia, para nao duplicar o modelo de dominio de pagamento ja
auditado; uma aba real de administracao de pacotes de recarga foi
adicionada a tela Financeiro, incluindo a UX exata que Bryan pediu
(Preco/WC base/Bonus/Total entregue, com aviso em tempo real quando a
regra 1:1 e violada). Um bug real e pre-existente foi encontrado e
corrigido durante essa mesma UI: o cliente nunca conseguia desativar um
pacote de recarga (o campo `active` era sempre enviado como `true`).
Testes reais: 27 novos casos de teste em 4 suites novas, mais extensoes
a suites existentes, tudo passando (182/182 numa regressao completa
apos as mudancas). Fechamentos adicionais divulgados honestamente:
cobertura de RBAC para o papel GM (nunca testada antes contra qualquer
endpoint de pagamento) e testes reais de IDOR confirmando (nao so
documentando) que nenhuma conta consegue ler dados financeiros de
outra. Lacunas reais que permanecem, nao escondidas: `PAYMENT_ACCOUNT_MISMATCH`
continua sem suporte (o Mercado Pago nao devolve identificador de
pagador consultavel), a pergunta sobre se `TRANSFER_RESTRICTION` deve
tambem bloquear venda no Marketplace ficou como recomendacao tecnica
para Bryan decidir (nao decidida silenciosamente), a transferencia
direta de WC ainda nao tem tela para o jogador, a politica de
troca de nivel de VIP enquanto ja ativo nunca foi uma decisao de
produto formalmente confirmada, e a validacao em sandbox real do
Mercado Pago e o acesso de leitura a producao continuam bloqueados
exatamente como a Fase P deixou.

**Atualizado novamente, 2026-08-31 (Fase Q — fechamento de decisoes)**:
Bryan resolveu quatro das proprias perguntas em aberto que a Fase Q
deixou, com quatro novas decisoes autoritativas. Ver
[ADR-0022](decisions/0022-phase-q-decision-closure.md). O minimo de 20 WC
para transferencia direta foi confirmado como politica final (fecha
OQ-002); uma tela real de transferencia direta de WC para o jogador foi
construida (`/painel/transferencias`) -- estimativa de taxa ao vivo,
confirmacao explicita, historico de enviados/recebidos, verificada ao
vivo contra um servidor e banco de dados reais rodando (transferencia
real de 100 WC, saldo e historico atualizados corretamente); a politica
de troca de nivel de VIP foi decidida (mesmo nivel enquanto ativo
sempre estende normalmente, nivel diferente fica bloqueado ate expirar
-- reverte o comportamento anterior "ultimo nivel vence" que podia
destruir ou inflar valor pre-pago silenciosamente), com uma nova
pergunta em aberto criada para o desenho futuro de conversao
(`VIP_TIER_CHANGE_VALUE_CONVERSION`, OQ-026); e a recomendacao tecnica
anterior sobre Marketplace + `TRANSFER_RESTRICTION` foi **corrigida**
apos uma auditoria real do fluxo economico (nao apenas mantida) --
Compra no Marketplace debita a carteira do comprador e move o WC
diretamente para o vendedor, exatamente o padrao que a restricao existe
para impedir, entao agora e bloqueada; Venda/Liquidacao/Anuncio/Reembolso
nunca dispersam WC do zero, entao permanecem liberados (fecha OQ-024).
Testes reais: 5 novos casos nomeados especificamente pela instrucao de
Bryan, mais regressao completa sem quebras.

**Atualizado novamente, 2026-09-02 (Fase R — revisao comercial do
catalogo X-Shop + CashShop)**: auditoria completa de classificacao +
preparacao de decisao para os 168 itens do X-Shop e os 12 itens do
CashShop -- **nenhum item foi apagado, removido, desativado ou
modificado**, esta fase prepara evidencia, nao decide em nome de Bryan.
Toda a fonte foi rebaixada e reverificada ao vivo (nao apenas citando o
relatorio da Fase 14) via RemoteOps + o laboratorio local de banco de
dados do GameServer: confirmado que 165/168 nomes do X-Shop resolvem
(os 3 Machados restantes, indices 9/10/11, genuinamente nao existem em
`Item.txt`, reconfirmado com download fresco); **uma correcao real** ao
proprio enunciado da fase -- o CashShop tem 9 itens de aluguel de 7 dias
mais 3 bilhetes de evento (nao "8 + 4" como presumido); o mapeamento de
moeda Coin0/1/2 ↔ WCoinC/WCoinP/GoblinPoint foi **elevado de inferencia
para CONFIRMADO** ao consultar o codigo-fonte real da procedure
`WZ_SetCoin` diretamente no laboratorio SQL Server local; `CoinIndex=508`
permanece genuinamente desconhecido apos uma busca exaustiva. Classificacao
comercial real contra a politica atual (cosmeticos/conveniencia
permitidos; equipamento Excellent/Ancient/Socket endgame, Wings
endgame, poder exclusivo nao): **0 GREEN / 12 YELLOW / 153 RED / 3
UNKNOWN** no X-Shop (nenhum item e um candidato incondicional --
achado central desta fase, decorrente diretamente da propria
construcao uniforme +13/full-excellent do catalogo), **3 GREEN / 9
YELLOW / 0 RED** no CashShop. Tabelas de decisao completas (168 + 12
linhas, `BRYAN_DECISION=PENDING` em cada uma), 10 grupos de revisao,
limites entre os cinco canais economicos documentados (Loja
oficial/X-Shop/CashShop/Marketplace/transferencia direta de WC nunca
devem ser confundidos), e taxonomia de produtos futuros mapeada contra
a arquitetura real do Portal (nada integrado). Nenhuma ADR nova nesta
fase -- nenhuma decisao de produto foi tomada, apenas preparada. Ver
[`docs/economy/xshop-commercial-review.md`](economy/xshop-commercial-review.md).

**Atualizado novamente, 2026-09-02 (Fase S -- fechamento de decisoes do
catalogo comercial + fundacao do painel de controle X-Shop/CashShop)**:
Bryan tomou sete decisoes comerciais finais sobre o catalogo auditado na
Fase R -- ver [ADR-0023](decisions/0023-store-catalog-decision-closure.md).
Os 153 itens RED do X-Shop viram `LEGACY_CATALOG_NOT_FOR_COMMERCIAL_SALE`
permanente (preservados, nunca vendidos); os 12 acessorios ficam
`BALANCE_TEST_REQUIRED`; os 3 Machados mortos viram
`DEAD_UNRESOLVABLE_CATALOG_ROW`; os 9 alugueis do CashShop viram
`RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST`; os 3 bilhetes de evento viram
`GREEN_CANDIDATE_NOT_APPROVED` (GREEN != aprovado -- falta revisao real
de evento). Uma auditoria real da arquitetura Store confirmou que
`ShopProduct` (o Portal Oficial) ja e a fonte de verdade -- nenhum
catalogo concorrente foi criado. Um gap real e nunca testado foi
encontrado e fechado: `StoreAdminService#importCatalog` (a importacao em
massa) nunca tinha cobertura de teste, e sua heuristica antiga nao sabia
nada sobre a classificacao real do X-Shop -- `legacy-catalog-policy.ts`
agora bloqueia os 153+12 itens decididos de verdade, provado por um
teste real contra o catalogo de producao (`docs/catalogs/commerce-item-catalog.json`).
Bryan tambem pediu o inicio de um painel de controle admin para
X-Shop/CashShop -- construido como uma camada real de "estado desejado"
do Portal (`LegacyCatalogItem`, 180 linhas, `/painel/admin/catalogo-legado`),
com RBAC de tres niveis (`view`/`edit`/`sync`, nenhum concedido a ADM por
padrao) e uma trava real: itens das Decisoes 1/3 nunca podem virar
comercializaveis/aprovados/publicados por essa via, provado ao vivo no
navegador (tentativa real contra "Kris" rejeitada com 403). **Nenhuma
sincronizacao com o GameServer foi construida** -- `apps/api` nunca
teve credencial de producao como dependencia de runtime, e essa e uma
decisao de arquitetura maior demais para esta fase decidir sozinha; o
design da sincronizacao fica `NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE`,
documentado, nao construido silenciosamente. Testes reais: 16 novos
casos em 2 suites novas (5+11), mais verificacao ao vivo no navegador
que encontrou e corrigiu um bug real (Tailwind v4 `@apply` em
`<style scoped>` sem `@reference` quebra a pagina -- corrigido inline).
Nenhuma mudanca de producao, nenhum deploy, nenhum push.

**Atualizado novamente, 2026-09-02 (Fase T -- camada de controle do
catalogo legado, X-Shop + CashShop atraves do Portal)**: segunda
extensao real do painel `/painel/admin/catalogo-legado` -- ver
[ADR-0024](decisions/0024-legacy-shop-control-plane.md). Novo campo
`desiredEnabled` (ENABLED != APPROVED -- um item BLOCKED pode ficar
"habilitado desejado" para teste/GM/evento sem nunca ficar
comercializavel). Novo "estado efetivo": leitura real de um snapshot
local, hash-verificado, comprometido no repositorio (nunca uma conexao
ao vivo com o GameServer -- a mesma fronteira de arquitetura da Fase S,
so que via arquivo, nao via credencial SQL) com deteccao real de drift
(`EM SINCRONIA`/`DIVERGENTE`/`NUNCA VERIFICADO`). Operacoes em lote
(sete acoes fechadas, nunca preco/moeda/opcoes em lote), busca/filtros,
e um `sync()` guardado por permissao E por feature flag E sem
implementacao nenhuma por tras (`NOT_IMPLEMENTED_PENDING_RUNTIME_KNOWLEDGE`
-- nunca pode disparar de verdade). Uma correcao deliberada e documentada
da Fase S: os 12 acessorios agora comecam `REVIEW_REQUIRED`, nao
`BLOCKED` (pedido explicito de Bryan). Testes reais: 14 casos novos (25
no total entre as 3 suites do catalogo legado). Verificacao ao vivo no
navegador encontrou e corrigiu um bug real: a acao em lote usava
`window.prompt()` nativo, que trava a automacao de navegador deste
projeto (e e uma pratica de UX/acessibilidade ruim de qualquer forma) --
substituido por um campo de texto inline. Nenhuma mudanca de producao,
nenhum deploy, nenhum push, nenhuma sincronizacao com o GameServer
construida ou ativada.

**Atualizado novamente, 2026-09-03 (Fase U -- fundacao do controle de
Progressao: XP, Master XP, Drop, Reset, Master Reset)**: segundo grande
dominio do Control Plane, mesma arquitetura da Fase T (estado
desejado/efetivo, RBAC, auditoria, drift, sync desligado por padrao) --
ver [ADR-0025](decisions/0025-progression-control-plane.md). Bryan
fechou a OQ-032 nesta fase com uma politica permanente: acesso ao
Control Plane = RBAC; mutacao real no GameServer = permissao dedicada
`.sync` + kill switch de runtime -- nunca uma terceira camada de flag
so para duplicar RBAC. Descoberta real: `Command.dat`/`Common.dat`
re-lidos e hash-verificados (identicos desde a Fase 11, exceto 12
campos nao relacionados a progressao que mudaram desde 17/08 --
CashShop, drop de PK, durabilidade). O limite de reset do tier Gold
(AL3) esta hoje em 50, 2,5x acima dos outros tres tiers E da meta de
politica de Bryan (20, Parte 17) -- um drift real, persistido e
visivel, nunca sincronizado. A formula real de XP permanece
`UNKNOWN` apos investigacao real (nao por falta de esforco) --
`AddExperienceRate_AL0=50` NUNCA pode ser chamado de "50x" sem prova
([investigacao completa](progression/xp-stacking-investigation.md)).
25 linhas de configuracao (nao ~370 chaves brutas), unidades nunca
rotuladas "x"/"%" sem confirmacao, justificativa obrigatoria para
edicoes de risco HIGH/CRITICAL. Changeset/preview multi-configuracao
(Partes 26-27) e historico nomeado (Parte 28) foram desenhados mas
`NOT_BUILT` -- escopo maior demais para esta fase fundacional; o
historico por configuracao individual via auditoria ja existe e
funciona. Testes reais: 9/9. Nenhuma mudanca de producao, nenhum
deploy, nenhum push, nenhuma sincronizacao com o GameServer construida
ou ativada.

**Atualizado novamente, 2026-09-04 (Fase V -- evidencia de progressao +
prontidao para balanceamento)**: ver
[ADR-0026](decisions/0026-progression-evidence-and-balance-readiness.md).
Bryan fechou de vez o limite de reset: **20 para todos os tiers, sem
excecao** -- persistido por tier explicito, formalizado via uma edicao
real e auditada (nao um reseed silencioso), com o motivo do proprio
Bryan registrado ("VIP pode oferecer aceleracao/conveniencia
controlada, mas nao um destino de progressao permanente indisponivel
ao F2P"). Novo eixo real no modelo: `policyStatus`, separado de
`driftStatus` -- toda configuracao de XP/drop diferenciada por VIP
comeca `EFFECTIVE_BUT_UNAPPROVED` (efetiva, nunca aprovada
automaticamente), nunca `APPROVED` por definicao de fabrica. Achado
grande sobre reload: um tutorial real do fornecedor confirma um menu
"Reload" no console do `GameServer.exe` (`Reload Common`/`Reload
Command`/`Reload Custom`/`Reload CashShop`, 18 categorias) que
releem `Common.dat`/`Command.dat`/`CustomXShop.txt`/`CashShopProduct.txt`
**sem reiniciar o servidor** -- resolve `RESTART_REQUIRED=NAO` para
varios dominios (incluindo X-Shop/CashShop da Fase T, OQ-031
atualizada), mas o gatilho em si exige a janela interativa do console
-- se e programavel remotamente continua `UNKNOWN`, sincronizacao
continua `BLOCKED_BY_RUNTIME_EVIDENCE`. Descoberta real e nao
planejada ao reler `MapManager.txt`/`Monster.txt` (fechando a lacuna
que a Fase U deixou deliberadamente aberta): a taxa de drop de item
por mapa foi zerada nos 67 mapas, e a taxa de excelente cortada 10x,
desde 17/08 -- alem de 10 chefes (Hydra, Kundun, Erohim, Medusa...)
terem sua taxa de item individual cortada de um valor-sentinela
"sempre dropa" para um valor normal. Nada disso foi feito por esta
sessao -- achado por releitura hash-verificada, real e atual, reportado
a Bryan (OR-023). Simulador estrutural real construido
(`progression-simulator.ts`): aritmetica real sobre numeros conhecidos
(cadencia de reset, pontos de reset), com uma recusa real e testada
(`XpFormulaUnknownError`) sempre que alguem tenta derivar XP a partir
so de tier+nivel de monstro. Changeset multi-configuracao permanece
`NOT_BUILT` (desenhado no ADR-0026, escopo maior que o necessario
agora). Testes reais: 9 novos (43 no total entre as 6 suites de
progressao + catalogo legado). Nenhuma mudanca de producao, nenhum
deploy, nenhum push, nenhuma sincronizacao com o GameServer construida
ou ativada.

**Atualizado novamente, 2026-09-04 (Fase W -- forense de drift de
producao OR-023 + fechamento de inputs de balanceamento)**: ver
[ADR-0027](decisions/0027-or-023-forensics-and-balance-inputs.md).
Investigacao completa, real, sem nenhuma correcao aplicada (conforme
instrucao explicita de Bryan: "nao conserte nada ainda"). O OR-023 se
revelou uma historia de duas etapas, nao uma: entre julho e 17/08 (sem
cobertura de log disponivel -- origem `UNKNOWN`), 224 dos 545 monstros
tiveram seu `ItemRate` levado a um valor-sentinela `999999999`
("sempre dropa"); entre 17/08 e 3/09 (cobertura completa de log
RemoteOps -- toda operacao registrada contra esses arquivos e
`download`, nunca `upload`, e zero historico git), o drop por mapa foi
zerado nos 67 mapas E exatamente 10 chefes nomeados (Hydra, Kundun,
Erohim, Medusa...) foram revertidos do sentinela de volta a um valor
normal -- **214 outros monstros continuam no sentinela hoje**.
Atribuicao: `PROJECT_CHANGE_NOT_FOUND` para a janela mais recente
(alta confianca), `UNKNOWN` para a mais antiga (sem como provar).
Achado novo e real sobre poder final de VIP: mesmo depois do
`reset.cap` ser corrigido para 20 em todos os tiers,
`reset.stat_points` (450 Free vs 500 pago) continua sendo uma vantagem
de poder final genuina -- 1.000 pontos de diferenca permanente em 20
resets, nao um efeito de velocidade. Achado novo e real sobre o
laboratorio local (`D:\MU\docs\local-muserver-lab.md`): o bloqueio de
"SQL Server ausente" registrado em sessao anterior **nao e mais
verdade** -- um SQL Server local ja esta rodando, com um banco
(`bloodmoon_gameserver_lab`, 145 tabelas, schema real) ja criado; falta
apenas um DSN ODBC (mudanca de configuracao de sistema, corretamente
nao feita por este agente) e a execucao dos binarios (recusada por
esta sessao, regra de procedencia, inalterada). Pacote de perguntas ao
fornecedor finalizado em PT-BR, **nao enviado**. Testes reais: 9 novos.
Nenhuma mudanca de producao, nenhum arquivo restaurado, nenhum reload/
restart, nenhum push, nenhum deploy.

**Atualizado novamente, 2026-09-04 (Fase X -- fundacao de stack de XP +
calculadora de progressao)**: ver
[ADR-0028](decisions/0028-xp-stack-and-progression-calculator.md).
Bryan fechou duas novas decisoes de produto: `BASE_SERVER_RATE = 50x` e
agora terminologia oficial (separada da questao tecnica ainda
`UNKNOWN` sobre a taxa EFETIVA com todos os bonus combinados, que
continua sem prova); e a recompensa de pontos de reset deve ser
**igual para todos os tiers** (450 desejado para todos, gerando um novo
`POLICY_DRIFT` real contra o efetivo 450/500/500/500, persistido do
mesmo jeito que o `reset.cap` foi na Fase V). Achado real e novo sobre
selos de XP: `Effect.txt` de producao (baixado somente leitura,
172 linhas reais) confirma, via tutorial do fornecedor
("Group: so um efeito ativo por grupo"), que Seal of Ascension e
Master Seal of Ascension **compartilham o mesmo Group e sao
mutuamente exclusivos entre si** -- um jogador nao pode ter os dois
ativos ao mesmo tempo. Dataset real de spots construido a partir do
`MonsterSetBase.txt` de producao: 58 spots reais, 407 monstros, mas
apenas 15 de 67 mapas tem dados de spawn custom neste arquivo -- os
outros 52 mapas provavelmente tem seus spawns definidos em outro lugar
(provavelmente compilado no binario do servidor), nao "sem monstros."
Nenhuma curva de XP por nivel foi encontrada em lugar nenhum acessivel
(arquivos, schema SQL do laboratorio local, tutoriais do fornecedor, ou
os 330 paginas de referencia externa ja coletadas neste projeto) -- a
calculadora foi construida para aceitar uma fonte externa futura,
claramente rotulada, em vez de inventar uma formula da memoria.
Calculadora estrutural real construida (`progression-calculator.ts` +
`/painel/admin/calculadora-progressao`, verificada ao vivo ponta a
ponta contra uma API real rodando): nunca calcula uma porcentagem
combinada, sempre recusa com um erro nomeado quando a formula seria
necessaria, rejeita combinacoes de modificadores comprovadamente
impossiveis, e mostra `CALCULATION_BLOCKED_BY: XP_STACK_FORMULA,
LEVEL_CURVE` em vez de um tempo-ate-nivel inventado. Testes reais: 14
novos (11 puros + 3 com banco). Nenhuma mudanca de producao, nenhuma
escrita no GameServer, nenhum reload/restart, nenhum push, nenhum
deploy.

**Atualizado novamente, 2026-09-04 (Fase 8 do Launcher -- escala de
janela, DPI, acessibilidade)**: ver
[launcher-scale-and-text-scale.md](launcher/launcher-scale-and-text-scale.md).
Duas novas preferencias reais e independentes: `LauncherScale`
(Compacto 70% a Muito grande 130%, um `LayoutTransform` real aplicado
ao shell inteiro mais um redimensionamento fisico real da janela --
nunca um Viewbox, ja rejeitado numa fase anterior por produzir texto
borrado) e `TextScale` (Pequeno 90% a Grande 115%, aplicado só aos
tokens de fonte do Typography.xaml, exige reabrir o launcher --
StaticResource nao suporta troca em tempo real sem uma migracao ampla
e fragil que esta fase decidiu nao fazer). Bug real encontrado e
corrigido: o MinWidth/MinHeight fixo (1024x600) da janela ja existente
teria impedido Compacto de realmente encolher a janela -- agora
acompanha dinamicamente a escala ativa. Fallback automatico real: se a
escala salva nao cabe na area de trabalho atual, o launcher usa a
maior escala que cabe, sem descartar a preferencia salva. Achado real
sobre a ferramenta de QA (nao um bug do app): a captura automatizada
`--render-preview=` corta a barra de status inferior, reproduzido
mesmo em escala Padrao (100%) usando o codigo pre-existente sem
alteracao -- uma captura real de tela do app rodando confirma que a
barra renderiza corretamente; registrado como OR-025. QA ao vivo real
via captura de tela: Compacto + texto Grande (a combinacao mais
exigente pedida) funcionou sem cortes. Testes reais: 13 novos (109
total no launcher). Nenhuma mudanca de producao.

**Atualizado novamente, 2026-09-04 (Fase Launcher 2D -- autenticacao +
CAPTCHA + Play gating)**: ver
[phase-2d-auth-captcha-play-gating.md](launcher/phase-2d-auth-captcha-play-gating.md).
Fecha o bloqueador real que a Fase 2C (`launcher/desktop-phase-1`,
outra worktree do mesmo repositorio) identificou: a API real exige
`captchaToken` obrigatorio em `POST /auth/login`, mas o `LoginPayload`
do Launcher nunca o enviava. Arquitetura real implementada: um
controle WebView2 real (pacote oficial da Microsoft) navega para uma
pagina real e hospedada (`/launcher/captcha` no Portal web, o mesmo
componente `TurnstileWidget.vue` e a mesma site key do login web) e le
o token de volta pela ponte real JS-nativo do WebView2 -- nunca um
token falso, nunca um bypass, nunca um segredo de producao usado.
Bug real encontrado e corrigido, o mesmo tipo de falha que a Fase 8 ja
tinha encontrado uma vez: `PlayState.GameAccountNotReady` existia no
enum e no switch da UI desde uma fase anterior, mas
`HomeStateMapper.ResolvePlayState` nunca realmente o produzia -- so
verificava `isLoggedIn`, entao uma sessao autenticada com
`gameReady=false` era tratada como pronta para jogar. Corrigido com um
novo `PlayGateEngine` puro e totalmente testado. QA local real e
completa ao vivo (nao so testes unitarios): conta de QA real criada
via `POST /auth/register` real, desafio Turnstile real renderizado e
concluido dentro do WebView2 (round-trip real ao Cloudflare, confirmado
por `curl` direto), login bem-sucedido, e o botao JOGAR corretamente
bloqueado com "Sua conta de jogo ainda esta sendo preparada." para o
`gameReady=false` real dessa conta -- prova ao vivo do bug corrigido.
Nao verificado ao vivo nesta fase (ver OQ-037): login real com 2FA
ativo, e o novo card de status da pagina CONTA (limitacao da
automacao de UI desta sessao, nao um bug conhecido do app). Testes
reais: 25 novos (136 total no launcher). Nenhum login de producao,
nenhuma rotacao de segredo, nenhuma mudanca de producao, nenhum
deploy, nenhum push.

## Roteiro de documentação (classificação honesta por área) — 2026-08-30

Bryan pediu uma classificação real, não otimista, de cada área do Blood
Moon: `COMPLETE` (documentação técnica + de sistema atual existe e está
atualizada), `PARTIAL` (existe algo real, mas incompleto), `MISSING`
(nada dedicado existe ainda), `OUTDATED` (existe, mas não reflete o
estado real do código hoje).

| Área | Status | Nota |
|---|---|---|
| Portal (`apps/web`) | PARTIAL | Manual do jogador cobre o uso; não existe documento técnico consolidado da arquitetura frontend em si |
| API (`apps/api`) | PARTIAL | Bem documentada por módulo/feature (ex.: `docs/accounts/`, `docs/vip/`), sem um documento único "arquitetura da API" |
| Banco de dados (MySQL/Portal) | PARTIAL | `docs/database/migration-history-reconciliation.md` existe; sem um documento de schema consolidado fora do próprio `schema.prisma` |
| GameServer (schema SQL Server) | PARTIAL (muito mais forte, Fase K, 2026-08-30) | `docs/game-data/schema/` + `docs/gameserver/database/` (11 documentos, agora incluindo uma classificação de domínio para as 138 tabelas, um catálogo real das 90 procedures via `sys.sql_expression_dependencies`, o corpo completo do único trigger real lido via `sys.sql_modules`, e uma auditoria de campos sensíveis nas 138 tabelas) cobrem em profundidade tudo que o GameBridge toca, o inventário completo, e a superfície legada DmN_* inteira (75 tabelas classificadas); ainda não cobre em nível de coluna itens/inventário/skill trees para todo o restante do banco fora do escopo GameBridge |
| GameBridge | COMPLETE (para as 5 operações reais) | `docs/gamebridge/` cobre arquitetura, plano, decisões, e o registro completo de teste local |
| Cloudflare (Worker/D1/Queue) | PARTIAL | `docs/game-data/architecture.md`/`cloudflare-resources.md` existem; sem um runbook operacional dedicado |
| Launcher | PARTIAL | `docs/launcher/` cobre contrato de API/assets/cache; sem um documento de arquitetura de distribuição completo |
| CMS / Launcher Studio | PARTIAL | Mencionado em `docs/launcher/`; sem documento dedicado próprio |
| Segurança | PARTIAL | `docs/security/` cobre classificação de dados, credenciais, histórico de incidentes; sem um documento único de "postura de segurança" consolidado |
| Contas | COMPLETE (para exclusão/provisionamento) | `docs/accounts/` — arquitetura de exclusão agora com o addendum de Fase 15, provisionamento, revisão pré-Beta |
| Economia | PARTIAL | `docs/economy/` cobre CashShop/X-Shop/DMN CMS legado extensivamente; WCoinC/WCoinP vs. WCOIN do Portal segue sem integração decidida (documentado como tal, não como lacuna escondida) |
| Pagamentos | PARTIAL (prontidao operacional real, ainda sem validacao externa, Fase Q) | `docs/payments/` cobre política de retenção financeira, comparação de superfícies, contrato de prontidão, e o [modelo de domínio auditado](payments/payment-domain-model.md); Fase O fechou 4 lacunas, Fase P fechou mais 6 (antifraude/chargeback/adaptadores/UI/manuais, ver [ADR-0019](decisions/0019-payment-operational-closure-phase-p.md)), Fase Q (2026-08-31) fechou a política final de preço WCOIN, as três restrições financeiras reais, transferência direta de WC (recurso novo), compra de VIP pelo jogador, e administração de pacotes de recarga — ver [ADR-0020](decisions/0020-wcoin-integer-brl-policy-final.md)/[ADR-0021](decisions/0021-payment-restriction-and-transfer-policy.md); ainda faltam validação em sandbox real do Mercado Pago e leitura de produção |
| VIP | COMPLETE | `docs/vip/` — auditoria profunda, matriz de benefícios, decisões, mais o addendum do reconciliador em `docs/gamebridge/` |
| Market(place) | MISSING (documento dedicado) | Existe código real (`marketplace.controller.ts`/`marketplace-admin.controller.ts`) e cobertura nos manuais novos, mas sem um documento técnico de arquitetura próprio ainda |
| Guildas | PARTIAL | Coberto em `docs/product/guild` e no manual do jogador; sem documento técnico de arquitetura consolidado |
| Rankings | MISSING (documento dedicado) | Rankings existem no schema real (`docs/game-data/schema/`) e na Wiki/manuais, sem documento próprio |
| Social/comunidade | PARTIAL | `docs/handoff/community-current-state.md` existe; é um documento de transição, não uma referência de arquitetura atual |
| Wiki | MISSING (documento dedicado) | Módulo real (`apps/api/src/modules/wiki/`), sem documentação técnica própria |
| Suporte | PARTIAL | Coberto nos manuais novos (uso); sem documento técnico da arquitetura de tickets |
| Pesquisas / questionário de saída | PARTIAL (atualizado, 2026-08-30) | Questionário de saída completo (12 motivos + pergunta de acompanhamento por motivo + rastreamento de oferta de retenção); fundação Prisma real do sistema de pesquisas periódicas mais amplo criada (`docs/product/survey-foundation.md`), mas sem UI |
| Privacidade / LGPD¹ | PARTIAL | Vários pontos marcados `LEGAL_REVIEW_REQUIRED` explicitamente (retenção de tombstone, retenção financeira, texto legal da exclusão) — a arquitetura técnica existe, a revisão jurídica formal, não |
| Beta | COMPLETE (para o fluxo de fim de ciclo) | `docs/accounts/account-deletion-architecture.md`'s workflow de 12 passos, `docs/testing/beta-test-baseline.md`, interface `PRE_BETA_PURGE` com segunda confirmação explícita (`/painel/admin/pre-beta-purge`) |
| Deployment | PARTIAL | Mencionado em vários documentos (cPanel, sem SSH); sem runbook de deploy único e completo |
| Manutenção | PARTIAL | Coberta pelo novo manual de operação técnica (seção "como fazer"); sem um calendário/checklist de manutenção recorrente |
| Recuperação (recovery) | PARTIAL | "Como reverter/recuperar" documentado por funcionalidade (ex.: `sql-server-test-environment.md`); sem um plano de disaster recovery consolidado |
| Manuais operacionais | COMPLETE (os quatro pedidos) | Ver seção "Manuais e referência" acima |
| Documentação comercial futura | MISSING (arquitetural apenas) | Ver seção seguinte |

## Direção arquitetural — documentação comercial futura (não implementada agora)

Bryan pediu para registrar, como direção futura (não como trabalho desta
rodada), duas camadas adicionais de documentação que o projeto vai
eventualmente precisar:

**Camadas de documentação por audiência** (além dos quatro manuais já
criados): PLAYER, GM, ADM, SUPER ADM, e OPERADOR TÉCNICO já existem hoje.
Uma futura expansão pode incluir camadas específicas por contexto (ex.:
onboarding de um novo membro de equipe, ou um guia de primeiros passos
separado do manual de referência completo).

**Documentação comercial** (caso o Blood Moon ou partes de sua
plataforma sejam eventualmente oferecidas como produto reutilizável para
terceiros): visão geral do produto, manual do administrador-cliente, guia
de instalação/implantação, referência de módulos, guia de integração
técnica. **Nenhuma implementação comercial é necessária agora** — isso é
registrado puramente como direção arquitetural, para que decisões
técnicas futuras não fechem essa porta sem necessidade. A documentação
comercial, quando existir, precisa descrever módulos reutilizáveis da
plataforma **sem expor segredos internos exclusivos do Blood Moon**
(credenciais, topologia exata de produção, dados reais de jogadores) —
um princípio de design a manter em mente desde já em qualquer nova
documentação técnica, não algo a ser aplicado retroativamente depois.

## Direção arquitetural — modularidade comercial futura (2026-08-30, Fase K, Parte 20)

Registrado como direção futura, não como trabalho de implementação desta
rodada: os sistemas do Blood Moon devem, progressivamente, preservar
fronteiras modulares claras — Core, Contas, Launcher, CMS, GameBridge,
Pagamentos, VIP, Market, Comunidade, Wiki, Suporte, Pesquisas (ver
`docs/product/survey-foundation.md`), Centro de Privacidade (ver
`docs/privacy/`), Analytics — de forma que, se o Blood Moon ou partes da
sua plataforma forem eventualmente oferecidas como produto reutilizável
para terceiros, essas fronteiras já existam em vez de precisarem ser
retroativamente extraídas de um monólito acoplado.

**Nenhum licenciamento ou cobrança por módulo é implementado nesta
fase.** O que já é real hoje: os módulos NestJS (`apps/api/src/modules/`)
já são fisicamente separados por pasta/import boundary; o schema Prisma
usa o padrão deliberado de "sem FK físico em `accountId`" em toda tabela
que precisa sobreviver à exclusão de uma conta, o que também facilita
uma futura separação de dados por módulo. Nenhuma mudança de código foi
feita para essa preservação de fronteiras nesta rodada especificamente —
é uma observação sobre o estado atual e uma diretriz para decisões
futuras, não um refactor realizado agora.

## Pendências deste índice (honestamente reportadas, não escondidas)

- **Histórico de fases consolidado** — hoje o histórico de cada fase vive
  na mensagem de commit + no próprio documento técnico daquela fase (ex.:
  `docs/gamebridge/gamebridge-agent-extension-plan.md`'s "Decisions
  incorporated" table, ou a seção "Histórico" em
  `docs/gameserver/database/lab-environment.md` para a rodada "GameServer
  Database Lab"). Um documento único "linha do tempo de todas as fases"
  ainda não existe — cada fase relevante continua documentando seu próprio
  histórico localmente, o que é suficiente para rastreabilidade mas não
  para uma visão cronológica única do projeto.
- Vários itens `PARTIAL`/`MISSING` na tabela de roteiro acima permanecem
  reais lacunas, não escondidas — cada um pode virar uma tarefa futura
  específica quando priorizado.

Essas pendências são reportadas aqui deliberadamente, em vez de
omitidas, seguindo a regra de que uma fase sem toda a documentação
esperada deve ser reportada como PARTIAL, não como completa.

## Glossário deste documento

1. **LGPD — Lei Geral de Proteção de Dados**: a lei brasileira que
   regula como dados pessoais podem ser coletados, usados e retidos —
   pontos marcados `LEGAL_REVIEW_REQUIRED` neste projeto aguardam
   confirmação jurídica formal de conformidade com ela.
