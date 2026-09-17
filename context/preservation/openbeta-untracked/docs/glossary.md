---
status: LIVING_DOCUMENT
category: reference
audience: internal + future manual readers
lastVerified: 2026-08-30
---

# Glossário central — Blood Moon

Este glossário reúne, em um único lugar, os termos e siglas técnicos usados
em toda a documentação do projeto. Ele **não substitui** as notas de
rodapé numeradas que aparecem dentro de cada documento — os dois
convivem, com papéis diferentes:

- **Nota de rodapé numerada** (ex.: `RBAC¹`): permite que uma pessoa leia
  um único documento, sozinho, do início ao fim, sem precisar abrir outro
  arquivo para entender uma sigla. Ver "Padrão de notas de rodapé" abaixo.
- **Este glossário**: um índice central para quem já está navegando pela
  documentação como um todo, ou quer confirmar rapidamente um termo sem
  procurar em qual documento ele foi definido primeiro.

Termos abaixo em ordem alfabética.

## Padrão de notas de rodapé (convenção obrigatória para novos documentos)

Dentro do texto corrido, a sigla ou termo técnico é escrito com um número
sobrescrito (Unicode, ex.: `¹`, `²`, `³`), nunca entre parênteses. A
definição completa vai no final da seção ou do documento, numerada na
mesma ordem em que os termos aparecem pela primeira vez.

**Exemplo exato** (o padrão original usado neste projeto):

> O sistema utiliza RBAC¹.
>
> 1. RBAC — Role-Based Access Control: modelo de controle de acesso
>    baseado em funções, usado para definir o que cada perfil pode
>    visualizar ou executar.

Por que não usar parênteses no meio do parágrafo: um parágrafo cheio de
`(sigla explicada assim)` fica difícil de ler em voz corrida, e a mesma
sigla frequentemente aparece várias vezes no mesmo documento — repetir a
explicação toda vez é redundante, e explicar só na primeira vez sem marcar
visualmente a explicação obriga o leitor a rolar o documento inteiro para
trás procurando onde ela apareceu. A nota de rodapé numerada resolve as
duas coisas: o sobrescrito sinaliza "isto tem uma definição em algum
lugar", e o número deixa claro exatamente onde.

## Termos

**API** — Application Programming Interface: a camada de software que
permite que dois sistemas conversem entre si através de um contrato bem
definido (endpoints, formatos de requisição/resposta). Neste projeto,
"a API" geralmente se refere a `apps/api`, o backend NestJS que serve o
Portal.

**CMS** — Content Management System: sistema de gerenciamento de
conteúdo — no Blood Moon, a área administrativa que permite editar
conteúdo do site/Launcher (notícias, banners, textos) sem precisar alterar
código.

**D1** — o banco de dados SQL (SQLite) gerenciado pela Cloudflare, rodando
na borda da rede (edge) em vez de um servidor central único. Usado pelo
`apps/game-data-worker` como armazenamento durável para o estado dos
comandos do GameBridge.

**FK — Foreign Key (chave estrangeira)** — uma restrição de banco de
dados relacional que garante que um valor em uma tabela ("filha")
corresponda a um valor existente em outra tabela ("pai"), impedindo
referências para dados que não existem. No schema real do GameServer do
Blood Moon, existe apenas **uma** FK declarada em todo o banco de dados
(`CustomQuest.Name → Character.Name`) — todas as outras relações são
lógicas, garantidas apenas pelo código da aplicação, nunca pelo próprio
banco.

**GameBridge** — o subsistema responsável por levar decisões tomadas no
Portal (conceder VIP, sincronizar nível VIP, anonimizar conta, expurgar
conta) até o SQL Server¹ real do GameServer, de forma segura e
auditável. Não é um único componente — é o conjunto de: `apps/api` (quem
decide o que fazer) → Cloudflare Worker/D1/Queue (o transporte durável) →
GameBridge Agent (o processo .NET que efetivamente executa o comando
contra o SQL Server).

**Idempotência** — a propriedade de uma operação poder ser executada mais
de uma vez, com o mesmo resultado final, sem causar um efeito duplicado
ou incorreto. No GameBridge, cada uma das quatro operações novas tem sua
própria forma de ser idempotente: `GRANT_VIP` nunca reduz um nível já
maior (regra `MAX()`), `SYNC_VIP_TIER` sempre aplica o valor desejado
diretamente (idempotente por natureza, já que reenviar o mesmo valor não
muda nada), `ANONYMIZE_GAME_ACCOUNT` detecta uma conta já anonimizada
antes de agir de novo, e `PURGE_GAME_ACCOUNT` detecta que a conta já não
existe mais e reporta sucesso sem tentar apagar de novo.

**JWT — JSON Web Token** — um formato padrão de token de autenticação:
uma string assinada digitalmente que carrega informações sobre quem é o
usuário autenticado, usada pelo Portal para manter uma sessão sem precisar
consultar o banco de dados a cada requisição.

**Ledger** — um registro contábil, apenas-inserção (nunca alterado
depois de escrito), usado para rastrear um histórico completo de eventos
financeiros ou de estado. No Blood Moon, `WalletLedgerEntry` é o ledger
de movimentações de moeda do Portal.

**Least Privilege (privilégio mínimo)** — o princípio de segurança de
conceder a qualquer usuário, processo ou credencial apenas o acesso
estritamente necessário para fazer seu trabalho, nunca mais. O login
`bloodmoon_writer` (produção) / `bloodmoon_writer_local` (ambiente de
teste local) é o exemplo central deste princípio no projeto: só pode
executar (`EXECUTE`) um conjunto fixo de stored procedures¹ nomeadas,
nunca ler ou escrever diretamente em nenhuma tabela.

**Queue (fila)** — um mecanismo de mensageria assíncrona: um produtor
coloca uma mensagem na fila, e um ou mais consumidores a processam
depois, na ordem, sem que o produtor precise esperar o processamento
terminar. A Cloudflare Queue é usada para levar o `commandId` de um
comando do GameBridge do Worker até o momento em que ele é disponibilizado
para o Agent buscar.

**R2** — o serviço de armazenamento de objetos (arquivos) da Cloudflare,
compatível com S3. Mencionado no projeto como avaliado mas **não
utilizado** nesta fase do Game Data Platform.

**RBAC — Role-Based Access Control** — modelo de controle de acesso
baseado em funções, usado para definir o que cada perfil (PLAYER, GM,
ADMIN, SUPER_ADMIN) pode visualizar ou executar.

**Reconciliação (reconciliation)** — o processo de comparar
periodicamente o estado que o Portal *acredita* ser verdadeiro contra o
estado real observado (ou o resultado de uma operação assíncrona ainda em
andamento), e corrigir divergências encontradas. `VipSyncService` é um
exemplo: ele compara o nível VIP calculado a partir de `VipEntitlement`
contra o último nível confirmado no GameServer (`VipSyncState`) e emite um
novo comando `SYNC_VIP_TIER` sempre que os dois divergem.

**SDK — Software Development Kit** — o conjunto de ferramentas
(compilador, bibliotecas, utilitários de linha de comando) necessário
para desenvolver software em uma linguagem/plataforma específica. O
GameBridge Agent precisa do .NET SDK¹ instalado para ser compilado e
testado localmente.

**SQL** — Structured Query Language: a linguagem padrão usada para
consultar e manipular bancos de dados relacionais.

**SQL Server** — o motor de banco de dados relacional da Microsoft usado
pelo GameServer real do Blood Moon (banco `MuOnline`) — diferente do
MySQL usado pelo Portal (`apps/api`).

**Stored Procedure (procedimento armazenado)** — um bloco de código SQL
pré-compilado e salvo dentro do próprio banco de dados, que pode ser
executado por nome em vez de enviar o SQL bruto a cada chamada. É a base
do modelo de segurança do GameBridge: o login `bloodmoon_writer` só pode
*executar* procedures específicas, nunca enviar SQL livre.

**T-SQL — Transact-SQL** — o dialeto de SQL usado especificamente pelo SQL
Server (diferente do dialeto usado por MySQL/MariaDB) — inclui recursos
como `sp_getapplock` (usado neste projeto para controle de concorrência)
que não existem em outros bancos.

**TOTP — Time-based One-Time Password** — o algoritmo usado pela
autenticação de dois fatores (2FA) do Portal: um código numérico de uso
único, gerado a partir de uma chave secreta compartilhada e do horário
atual, que muda a cada 30 segundos.

**UAC — User Account Control** — o mecanismo do Windows que exibe um
prompt de confirmação antes de permitir que um programa faça alterações
que exigem privilégio de administrador — não pode ser respondido por um
processo não interativo (relevante para o ambiente de desenvolvimento
local, ver `docs/environment/sql-server-test-environment.md`).

**Webhook** — um mecanismo pelo qual um sistema notifica outro sobre um
evento, através de uma chamada HTTP feita automaticamente quando o evento
acontece, em vez do sistema que quer saber precisar ficar perguntando
repetidamente ("polling").

**Worker** — no contexto Cloudflare, uma função que roda na borda da rede
(edge), perto do usuário, em vez de em um servidor central único. O
`apps/game-data-worker` é o Cloudflare Worker que recebe, valida e
enfileira os comandos do GameBridge antes de disponibilizá-los para o
Agent.
