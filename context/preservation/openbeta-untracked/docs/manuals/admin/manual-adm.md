---
status: LIVING_DOCUMENT
category: manuals/admin
audience: ADMIN role staff
lastVerified: 2026-08-31 (Fase Q)
---

# Manual do Administrador (ADM) — Blood Moon

Este manual descreve o que uma conta com papel **ADMIN** pode operar hoje
no Blood Moon. **É importante entender desde já**: no Blood Moon, ter o
papel ADMIN **não concede automaticamente** todas as permissões
administrativas — cada capacidade (`admin.*`) precisa ser delegada
individualmente por um **SUPER_ADMIN**, através do mecanismo de permissões
por conta (ver seção 2). Este manual descreve o que uma conta ADMIN *pode*
operar quando as permissões relevantes foram delegadas a ela, não o que
toda conta ADMIN tem por padrão.

## 1. Papéis e RBAC¹

A hierarquia de papéis é: `PLAYER` < `GM` < `ADMIN` < `SUPER_ADMIN`. Cada
papel tem um conjunto-base de permissões, mas capacidades administrativas
(`admin.*`) não são concedidas automaticamente pelo papel sozinho — um
SUPER_ADMIN precisa delegá-las individualmente, conta por conta, através
do painel de permissões. Isso significa que duas contas ADMIN podem, na
prática, conseguir operar coisas diferentes, dependendo do que foi
delegado a cada uma.

**2FA² é obrigatório** para todo papel diferente de PLAYER — uma conta
ADMIN sem 2FA ativo é bloqueada de acessar as áreas administrativas até
ativá-lo.

## 2. Permissões (visão do que existe, não do que você necessariamente tem)

O sistema de permissões usa chaves específicas, uma por capacidade —
exemplos: `admin.accounts.view`, `admin.accounts.status.manage`,
`admin.content.manage`, `admin.game-provisioning.view`,
`admin.vip-sync.view`. Cada uma precisa ser delegada individualmente pelo
SUPER_ADMIN à sua conta antes que você consiga acessar a tela/ação
correspondente.

## 3. CMS³ e conteúdo

Se delegado `admin.content.manage`, você pode editar conteúdo do
site/portal (notícias, textos, banners) através do CMS.

## 4. Launcher CMS/Studio

Se delegado a permissão correspondente, você pode gerenciar o conteúdo
exibido dentro do Launcher (avisos, banners de patch, changelog) através
do Launcher Studio (`/painel/admin/launcher-studio`).

## 5. Administração de contas

Com `admin.accounts.view`/`admin.accounts.status.manage`, você pode
visualizar contas de jogadores e alterar seu status (ex.: bloquear uma
conta suspeita). A exclusão **normal** de conta (`NORMAL_ACCOUNT_DELETION`
— anonimização, não apagamento físico) também usa
`admin.accounts.status.manage`, já que é tratada como o tipo mais
consequente de mudança de status.

## 6. Suporte

Com a permissão correspondente, você pode visualizar e responder tickets
de suporte abertos por jogadores (`/painel/admin` → seção de tickets).

## 6b. Bug Hunters — triagem

Distinto do Suporte: um chamado de Suporte é uma questão pessoal da conta
do jogador; um relato de Bug Hunters (`admin.bug-hunters.view`/`.triage`,
`/painel/admin/bug-hunters`) é um defeito reproduzível do produto/jogo. Se
um relato de Bug Hunters for na verdade uma questão de suporte, você pode
redirecioná-lo/encerrá-lo pelo próprio fluxo de status, sem conversão
automática entre os dois modelos.

Com `admin.bug-hunters.view` você visualiza a fila, filtra por status/
categoria/severidade e abre o histórico completo de um relato (incluindo
notas internas, nunca visíveis ao jogador). Com `admin.bug-hunters.triage`
você também pode: atribuir a um responsável, mudar o status (sempre com
justificativa), definir a severidade avaliada pela equipe (independente
da severidade informada pelo jogador), responder ao jogador, adicionar
uma nota interna, e **registrar elegibilidade de recompensa**.

**Importante: registrar elegibilidade de recompensa nunca paga nada
automaticamente.** Isso cria apenas um registro de participação (fato de
elegibilidade, auditável) em Recompensas de Beta — a geração real da
recompensa é uma ação separada e explícita, feita por um Super ADM em
`/painel/admin/beta-rewards`.

## 7. Visibilidade administrativa do Marketplace

Se delegado, você pode visualizar o estado de anúncios/transações do
Marketplace para fins de moderação e suporte — sem necessariamente ter
permissão de alterar configurações do sistema de Marketplace em si (isso
é escopo do Super ADM, ver o outro manual).

## 8. Configuração de VIP

A configuração comercial de VIP (preços, produtos, benefícios ativados)
é tratada como uma capacidade separada e mais sensível — ver o manual do
Super ADM. Uma conta ADM pode, se delegado, visualizar o estado de
sincronização VIP entre o Portal e o GameServer (`admin.vip-sync.view`,
tela `/painel/admin` → seção VIP Sync) sem poder alterar preços/produtos.

## 8b. Financeiro e pagamentos

Como todo o resto neste manual, **nenhuma permissão financeira é
concedida a ADM por padrão** — cada uma precisa de delegação explícita
do Super ADM.

Se delegado `admin.finance.reports.view`, você pode visualizar a fila de
compras/recargas (`/painel/admin/financeiro`, aba "Filas"). Ações
adicionais têm permissões próprias e mais restritas, nunca incluídas
automaticamente:

- **Estornar uma recarga** (local, no Portal) exige `admin.recharge.refund`
  especificamente — não basta poder visualizar ou operar pedidos
  (`admin.orders.operate`).
- **Tentar um estorno real no Mercado Pago** exige
  `admin.recharge.provider-refund`, uma permissão ainda mais restrita —
  e só tem efeito se a equipe técnica tiver habilitado essa capacidade no
  ambiente (ver manual de Super ADM/operação técnica).
- **Ver/gerenciar casos de risco** (antifraude) exige `admin.risk.view`/
  `admin.risk.manage` separadamente.
- **Ver/gerenciar casos de chargeback** exige `admin.chargeback.view`/
  `admin.chargeback.manage` separadamente.
- **Gerenciar pacotes de recarga** (preços, ativar/desativar) exige
  `admin.shop.manage` — a tela agora existe (`/painel/admin/financeiro`,
  aba "Pacotes", Fase Q, 2026-08-31), antes só era possivel via API.
- **Aplicar/remover restrições de pagamento, transferência ou conta**
  (`PAYMENT_RESTRICTION`/`TRANSFER_RESTRICTION`/`ACCOUNT_RESTRICTION`,
  Fase Q, 2026-08-31) exige `admin.risk.manage`, a mesma permissão de
  gerenciamento de casos de risco — nao existe uma permissao separada so
  para aplicar restricoes.

**GM não tem acesso a nenhuma tela ou ação financeira** — é um papel
operacional voltado ao jogo (eventos, ocorrências), não à administração
comercial; seu conjunto de permissões nunca inclui nenhuma capacidade
`admin.finance.*`/`admin.recharge.*`/`admin.risk.*`/`admin.chargeback.*`.

## 9. Acesso à auditoria

Se delegado `admin.audit.view`, você pode consultar o histórico de ações
administrativas registradas (quem fez o quê, quando).

## 10. Privacidade — visibilidade de solicitações

Se delegado, você pode visualizar solicitações de exclusão de conta em
andamento (status: aguardando confirmação, em período de carência,
cancelada, concluída) — mas a execução automática e o cancelamento são
sempre iniciados pelo próprio jogador, nunca por um ADM agindo em nome
dele sem uma solicitação real do jogador.

## 11. O que o ADM NÃO pode fazer

- **`PRE_BETA_PURGE` (expurgo de contas de pré-Beta) NÃO é uma capacidade
  de ADM por padrão.** Esta é uma operação irreversível, restrita
  exclusivamente a **SUPER_ADMIN** através de uma permissão própria e
  separada (`admin.accounts.purge.manage`) — mesmo um ADM que já tenha
  `admin.accounts.status.manage` delegado (usado para exclusão normal)
  **não recebe automaticamente** acesso ao expurgo. Se no futuro isso
  precisar ser delegado a um ADM específico, é uma decisão separada e
  deliberada do Super ADM, nunca um efeito colateral de outra permissão.
- Alterar configuração de kill switches⁴ do GameBridge⁵ ou do Agent —
  isso é escopo exclusivo do Super ADM/operação técnica.
- Gerenciar papéis de outras contas (promover/rebaixar) — exclusivo de
  SUPER_ADMIN.
- Alterar o próprio 2FA de outra conta administrativa (reset de 2FA de
  terceiros é ação exclusiva de Super ADM, via um fluxo com verificação
  extra).

## Glossário deste manual

1. **RBAC — Role-Based Access Control**: modelo de controle de acesso
   baseado em funções, usado para definir o que cada perfil pode
   visualizar ou executar.
2. **2FA — Autenticação em duas etapas**: ver manual do jogador, seção 3.
3. **CMS — Content Management System**: sistema de gerenciamento de
   conteúdo, permite editar textos/imagens do site sem alterar código.
4. **Kill switch**: um interruptor de configuração que desliga
   completamente uma funcionalidade específica sem precisar remover
   código ou fazer um novo deploy — usado no GameBridge para permitir
   desligar uma operação individual (ex.: só o PURGE) em caso de problema,
   sem afetar as demais.
5. **GameBridge**: ver glossário central (`docs/glossary.md`).
