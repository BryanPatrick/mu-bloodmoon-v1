---
status: LIVING_DOCUMENT
category: manuals/player
audience: players (external-facing content, reviewed internally first)
lastVerified: 2026-08-31 (Fase Q)
---

# Manual do Jogador — Blood Moon

Este manual descreve, de forma completa e honesta, tudo o que você pode
fazer hoje como jogador no Blood Moon. Funcionalidades que ainda estão
sendo construídas aparecem marcadas explicitamente como
**[PLANEJADO — ainda não disponível]** — este manual nunca anuncia algo
como pronto se ainda não estiver.

## 1. Criando sua conta

Você cria sua conta no site oficial (`/registrar`), informando um nome de
usuário, e-mail, senha e Personal ID¹. O e-mail é único por conta — não é
possível registrar duas contas com o mesmo endereço.

## 2. Login

O login aceita seu nome de usuário e senha. Uma sessão é criada e mantida
através de um token de acesso² armazenado no seu navegador — ela expira
automaticamente após um período de inatividade, por segurança.

## 3. Segurança da sua conta

Acesse **Painel → Minha conta** para gerenciar tudo relacionado à
segurança:

### Trocar senha
Peça sua senha atual, seu Personal ID e a nova senha (duas vezes, para
confirmar). A troca de senha encerra automaticamente outras sessões
ativas em outros dispositivos, por segurança.

### Autenticação em duas etapas (2FA³)
Ative o 2FA usando um aplicativo autenticador (Google Authenticator,
Microsoft Authenticator, ou qualquer app compatível com o padrão TOTP⁴).
Ao ativar, você recebe um conjunto de **códigos de recuperação** — guarde-os
em um lugar seguro, pois cada código funciona apenas uma vez, no lugar do
código do aplicativo, caso você perca o acesso ao seu celular. Eles não
são mostrados novamente depois da ativação.

**Contas de equipe (GM, ADM, Super ADM) são obrigadas a manter o 2FA
ativo** — se você for promovido a uma função de equipe, precisará ativar
o 2FA para continuar acessando as áreas administrativas, e não poderá
desativá-lo por conta própria enquanto estiver nessa função.

### Histórico de sessões
Veja todos os dispositivos/locais onde sua conta está com sessão ativa, e
encerre qualquer uma delas (ou todas de uma vez) se notar algo suspeito.
Encerrar todas as sessões também encerra a sua sessão atual — você
precisará fazer login novamente.

### Recuperação de senha
Se você esquecer sua senha, use **"Esqueci minha senha"** na tela de
login (`/recuperar-conta`) para receber um link de redefinição por
e-mail.

## 4. Launcher

O Launcher é o programa usado para baixar, atualizar e iniciar o jogo. Ele
busca automaticamente as versões mais recentes de conteúdo e patches a
partir do Portal, e mantém um cache local para reduzir o tempo de
atualização em inicializações futuras.

## 5. Provisionamento da sua conta de jogo

Quando você acessa o jogo pela primeira vez através do Launcher com uma
conta do Portal, uma conta técnica correspondente é criada automaticamente
no servidor do jogo (GameServer⁵) — isso é chamado de **provisionamento**.
Você não precisa fazer nada manualmente; o processo acontece de forma
transparente na primeira conexão.

## 6. Personagens

Veja seus personagens em **Painel → Meus personagens**: nome, classe,
nível, quantidade de resets e master resets.

## 7. Perfil e configurações

Em **Painel → Configurações**, você pode ajustar preferências pessoais
como idioma de exibição e receber (ou não) notificações do servidor.
**Notificações** (Painel → Notificações) mostram avisos relevantes sobre
sua conta, compras, e eventos do servidor.

## 8. Loja, recarga e meus pedidos

A **Loja** (`/loja`) lista os itens/pacotes disponíveis para compra. A
página de **Recarga** (`/recarga`) permite adicionar saldo em moeda do
Portal à sua conta (via Pix, quando pagamentos reais estão habilitados),
que pode então ser usado para comprar na loja ou assinar VIP.

**Comprar VIP** (Fase Q, 2026-08-31; política de troca de nível
atualizada na Fase Q — fechamento de decisões, 2026-08-31) — acesse
**Painel → VIP** para ver os planos Bronze/Prata/Ouro disponíveis (7/15/30
dias), os benefícios realmente ativos de cada nível, seu status atual, e
comprar diretamente. A compra de VIP gasta WC do seu saldo já disponível
— recarregue primeiro em **Painel → Recarga** se precisar de mais saldo.
**Enquanto você já tem um VIP ativo**: comprar o **mesmo nível**
novamente sempre soma os dias ao seu prazo atual normalmente (nunca
reduz o que você já tinha); comprar um **nível diferente** fica
**bloqueado** até seu VIP atual expirar — a tela mostra claramente qual
nível está ativo, quando expira, e por que os outros níveis estão
indisponíveis no momento (um sistema de troca/upgrade entre níveis ainda
está sendo desenhado, não é uma falha).

### Transferência direta de WC (Fase Q, 2026-08-31; tela do jogador
adicionada na Fase Q — fechamento de decisões, 2026-08-31)

Acesse **Painel → Transferir WC** para enviar WC diretamente para outro
jogador, sem passar pelo Marketplace. A tela mostra: o nome de usuário
do destinatário (confira que é o **login da conta**, não o nome do
personagem — contas com nomes de personagem parecidos são uma causa
comum de transferências enviadas por engano), a quantidade, seu saldo
atual, e uma estimativa em tempo real de quanto o destinatário vai
receber depois da taxa econômica (o mínimo por transferência é 20 WC; a
mesma taxa aplicada a negociações do Marketplace). Você confirma antes
de enviar, e a transferência não pode ser desfeita pelo jogador depois
de confirmada. A mesma tela mostra seu histórico de transferências
enviadas e recebidas (data, contraparte, valor bruto, taxa, valor
líquido recebido).

### Meus Pedidos (`/painel/compras`)

Todo o seu histórico de compras na Loja e recargas de moeda fica reunido
em **Painel → Meus Pedidos**, junto com:

- **Seu saldo de moedas** (Painel → Minha conta) — o mesmo saldo usado
  pela Loja e pelo Marketplace.
- **Status do pagamento** de cada pedido, em português claro: Preparada,
  Aguardando pagamento, Paga, Em análise, Falhou, Cancelada, Estorno em
  andamento, Estornada.
- **Status da entrega**, para compras da Loja (recargas de moeda não têm
  uma etapa de entrega separada — o saldo é creditado no mesmo momento em
  que o pagamento é confirmado): Aguardando processamento, Processando,
  Entregue, Falhou, Reprocessando, Em análise.

**Se seu pagamento foi confirmado mas a entrega ainda não apareceu**: a
própria tela de Meus Pedidos mostra um aviso claro nesse caso —
**nunca realize um novo pagamento para o mesmo pedido**. A entrega é
processada automaticamente com novas tentativas; se não resolver em
algumas horas, abra um chamado de suporte informando o número do pedido
(mostrado na própria tela).

### Estornos (reembolsos)

Se a nossa equipe estornar uma recarga ou compra sua, o status muda para
**Estornada** e o saldo correspondente é debitado da sua conta (caso já
tivesse sido creditado). Um estorno registrado no Portal é sempre real e
imediato do lado da sua conta — a confirmação de que o valor
efetivamente retornou ao seu método de pagamento original no Mercado
Pago pode levar mais tempo e é tratada separadamente pela nossa equipe;
se tiver dúvidas sobre esse prazo, abra um chamado de suporte.

### Se você ver uma mensagem de restrição (Fase Q, 2026-08-31)

Em casos raros, nossa equipe pode aplicar uma restrição temporária e
reversível à sua conta enquanto revisa uma atividade específica —
nunca automaticamente, sempre por uma pessoa da equipe. Você pode ver
uma destas mensagens:

- **"Novas compras estão temporariamente indisponíveis para esta
  conta."** — recargas e compras na Loja ficam pausadas.
- **"Transferências de WC estão temporariamente indisponíveis."** —
  você não consegue enviar WC diretamente para outro jogador.
- **"Algumas operações da conta estão temporariamente restritas. Entre
  em contato com o suporte."** — uma restrição mais ampla, cobrindo
  pagamentos, transferências e compra de VIP ao mesmo tempo.

Nenhuma dessas restrições afeta seu acesso ao jogo, seu login, ou sua
capacidade de **receber** WC/reembolsos legítimos — elas afetam apenas
novas ações comerciais que você mesmo inicia. Se você receber uma dessas
mensagens, abra um chamado de suporte para entender e resolver a
situação.

## 9. Moedas

O Portal mantém um saldo de moeda unificado por conta (chamado internamente
de WCOIN⁶), usado nas compras da Loja e no Marketplace. Esse saldo é
diferente das moedas internas do próprio jogo (Zen, WCoinC/WCoinP,
Goblin Points) — o Portal e o GameServer têm sistemas de moeda separados.

## 10. Market (Marketplace)

O **Marketplace** (`/marketplace`) é onde jogadores compram e vendem
entre si. Você pode ver seus próprios anúncios em **Painel → Meus
anúncios**. Toda negociação passa por um sistema de garantia (escrow⁷) —
o valor/item fica retido até a transação ser concluída com sucesso,
protegendo tanto comprador quanto vendedor.

## 11. VIP

O Blood Moon oferece três níveis de assinatura VIP — **Bronze, Prata e
Ouro** — cada um com duração de 7, 15 ou 30 dias, conforme o pacote
escolhido. O nível VIP concede benefícios de conveniência já ativados
(como acesso ao warehouse por comando e redução no custo de alguns
comandos in-game); outros benefícios potenciais (bônus de XP, taxa de
drop, Chaos Machine, joias, harmonização, fusão) estão **[PLANEJADO — em
análise de balanceamento, ainda não ativados]**.

Sua assinatura VIP nunca é rebaixada por uma nova compra — comprar um
pacote de nível mais baixo enquanto você já tem um nível mais alto nunca
reduz seu benefício atual; o sistema sempre mantém o maior nível já
adquirido até a expiração natural.

## 12. Guildas

Veja e participe de guildas em `/guilds` e `/guild/[nome-da-guilda]`.

## 13. Comunidade

A área de Comunidade (`/comunidade`) reúne perfis sociais, publicações e
interações entre jogadores.

## 14. Rankings

Veja os rankings do servidor (`/rankings`) — colocação por reset,
conquistas em eventos, e outras categorias competitivas.

## 15. Central de Ajuda / Wiki

Consulte guias (`/guias`) e a Wiki (`/wiki`) para tutoriais e referências
sobre classes, sistemas do jogo e mecânicas.

## 16. Suporte e tickets

Abra um chamado em **Painel → Suporte** a qualquer momento que precisar de
ajuda da nossa equipe — descreva seu problema e acompanhe a resposta pela
mesma tela.

## 17. Bug Hunters — relatar um problema

**Suporte** é para questões pessoais da sua conta. **Bug Hunters** (em
**Painel → Bug Hunters**) é para relatar um problema real e repetível do
jogo, Launcher, Loja ou Portal — algo que qualquer jogador enfrentaria nas
mesmas condições.

Para relatar:

1. Escolha a **categoria** (Launcher, Login/Conta, Jogabilidade, Mapa/
   Monstro, Item, Evento, Quest, VIP, Loja/Pagamento, Marketplace, Guilda,
   Comunidade, Portal, Desempenho ou Outro).
2. Descreva o **título**, a **descrição**, os **passos para reproduzir**,
   o **comportamento esperado** e o **comportamento observado**. Quanto
   mais detalhe, mais rápido a equipe consegue reproduzir e corrigir.
3. Informe a **severidade que você percebeu** (Baixa/Média/Alta/Crítica)
   — isso é a sua avaliação como jogador; a equipe pode avaliar de forma
   independente depois.
4. Opcionalmente, informe seu personagem, um link de evidência (imagem/
   vídeo hospedado externamente) e qualquer contexto adicional.
5. Confirme que está ciente de que o relato poderá ser revisado pela
   equipe.

Depois de enviar, acompanhe o **status** do seu relato na mesma tela
(Aberto, Em triagem, Aguardando informações, Confirmado, Em andamento,
Resolvido, Encerrado, Duplicado ou Não é um bug) e veja qualquer resposta
da equipe. Se o status for "Aguardando informações", você pode enviar
mais detalhes diretamente pela tela do relato.

**Enviar um relato não garante uma recompensa.** Recompensas de Bug
Hunter são avaliadas e concedidas separadamente pela equipe, caso a caso,
nunca de forma automática só por ter enviado um relato.

## 18. Privacidade e meus dados

Acesse **Painel → Privacidade e meus dados** para:

- **Visualizar seus dados**: um resumo do que temos sobre sua conta,
  personagens e histórico.
- **Solicitar cópia dos seus dados**: baixe um arquivo com esses mesmos
  dados.
- **Corrigir informações** — **[PLANEJADO — por enquanto, abra um chamado
  de suporte para corrigir um dado incorreto]**.
- **Gerenciar consentimentos** — **[PLANEJADO — ainda não disponível]**.
- **Excluir sua conta** — descrito em detalhe abaixo.

## 19. Exclusão de conta

### Questionário de saída

Antes de enviar sua solicitação de exclusão, mostramos um questionário
opcional perguntando o motivo — falta de tempo, progressão, balanceamento,
bugs, desempenho/conexão, problema com outro jogador/comunidade,
problema com equipe/suporte, loja/VIP/economia, mudança para outro
servidor, problema na conta, privacidade/segurança, ou outro. **Você pode
pular o questionário inteiro** — ele nunca impede ou atrasa sua
solicitação.

Para a maioria dos motivos, uma pergunta de acompanhamento opcional
aparece assim que você marca o motivo — por exemplo, "Qual bug?" ou
"O que tornou a progressão frustrante?" — para nos ajudar a entender
melhor, sempre opcional.

Dependendo da sua resposta, podemos oferecer ajuda relevante:
- **Bug, problema com suporte, ou problema na conta**: botões diretos
  **"Criar chamado"** e **"Pedir ajuda"**.
- **Falta de tempo**: lembramos que você não precisa excluir a conta
  para ficar inativo — pode voltar quando quiser.

A opção **"Continuar com a exclusão"** está sempre disponível,
independente do que você escolher — nenhuma oferta de ajuda bloqueia ou
atrasa sua saída.

### Confirmações explícitas

Antes de confirmar, você precisa marcar, um por um (nenhuma caixa vem
pré-marcada):

- Entendo que meus personagens e progresso serão excluídos.
- Entendo que meus itens e warehouse serão excluídos.
- Entendo que, após a conclusão definitiva, os dados operacionais
  removidos não poderão ser restaurados.
- Quero continuar com a solicitação de exclusão.

### Confirmação por e-mail

Depois de solicitar, você recebe um e-mail com um link de confirmação. Se
você não clicar no link, **nada acontece** — a solicitação simplesmente
expira e sua conta continua normal.

### Período de carência

Depois de confirmada, sua exclusão entra em um **período de carência**
antes de ser executada de verdade — durante esse período, você pode
**cancelar a qualquer momento** em Painel → Privacidade e meus dados, e
tudo volta ao normal.

### O que acontece na exclusão definitiva

Personagens, progresso, itens e o conteúdo do seu warehouse são
removidos. Alguns registros podem ser mantidos quando exigido por
obrigações legais/fiscais, prevenção a fraude, segurança, ou exercício/
defesa de direitos — e seu feedback do questionário de saída (se você
respondeu) pode ser mantido de forma anonimizada, sem vínculo com sua
identidade, apenas para entendermos padrões gerais de saída de jogadores.
**Este ponto está marcado como [LEGAL_REVIEW_REQUIRED]** — a redação
final e exata dos termos legais desta seção ainda está em revisão.

## Glossário deste manual

1. **Personal ID** — um identificador pessoal (não o CPF em si)
   registrado na sua conta, usado como uma verificação extra em ações
   sensíveis (troca de senha, exclusão de conta).
2. **Token de acesso** — uma credencial temporária, gerada no login, que
   prova que você está autenticado sem precisar reenviar sua senha a cada
   ação.
3. **2FA — Autenticação em duas etapas**: uma camada extra de segurança
   além da senha — mesmo que alguém descubra sua senha, ainda precisaria
   de um código gerado pelo seu aplicativo autenticador para entrar.
4. **TOTP — Time-based One-Time Password**: o algoritmo usado pelo 2FA —
   um código numérico de uso único que muda a cada 30 segundos.
5. **GameServer** — o servidor onde o jogo em si roda, separado do Portal
   (o site/painel onde você gerencia sua conta).
6. **WCOIN** — o nome interno da moeda unificada do Portal, usada na Loja
   e no Marketplace.
7. **Escrow (garantia)** — um mecanismo onde o valor ou item de uma
   negociação fica retido por um terceiro confiável (neste caso, o
   próprio sistema) até a transação ser concluída, protegendo as duas
   partes contra fraude ou desistência.
