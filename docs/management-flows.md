# Fluxos do painel de gerenciamento

Este documento registra o que ja foi implementado no painel Blood Moon e como revisar os fluxos depois. A implementacao atual ainda e local/mock: os dados ficam no navegador via `localStorage` ate entrarmos com backend e banco de dados.

## Organizacao atual

- `apps/web`: site Nuxt, painel, telas publicas e prototipos locais.
- `apps/api`: base planejada do backend NestJS, contratos dos modulos e schema inicial do Prisma.
- `packages/shared`: tipos e constantes compartilhadas entre frontend e backend.
- `references`: referencias brutas, imagens e dados coletados.
- `docs`: documentacao operacional e tecnica.
- `scripts`: scripts auxiliares de coleta/organizacao.

## Acesso de teste

- Usuario administrativo: `admin`
- Senha administrativa: `admin`
- Usuario player: `player`
- Senha player: `player`

Ao tentar acessar uma rota de painel sem login, o site redireciona para `/login` e volta para a pagina original depois da autenticacao.

## Arquivos principais

- `apps/web/data/security.ts`: permissoes, perfis e regras de acesso.
- `apps/web/composables/useAuth.ts`: login, sessao, expiracao, bloqueio por tentativas e auditoria.
- `apps/web/middleware/auth.global.ts`: protecao das rotas `/painel` e `/painel/admin`.
- `apps/web/data/management.ts`: dados iniciais mockados de contas, personagens, loja e pacotes.
- `apps/web/composables/useManagement.ts`: persistencia local e operacoes do painel.
- `apps/web/components/ManagementShell.vue`: layout e menu lateral do painel.
- `apps/web/pages/painel/admin/auditoria.vue`: registros de auditoria.
- `apps/web/pages/painel/admin/contas.vue`: gerenciamento administrativo de contas.
- `apps/web/pages/painel/admin/financeiro.vue`: aprovacao/cancelamento de compras e recargas.
- `apps/web/pages/painel/admin/loja.vue`: CRUD administrativo dos produtos da loja.
- `apps/web/pages/painel/admin/recargas.vue`: CRUD administrativo dos pacotes de recarga.
- `apps/web/pages/painel/admin/sistema.vue`: exportacao, importacao e reset da base local.
- `apps/web/pages/painel/admin/referencias.vue`: biblioteca visual e tecnica de referencias.
- `apps/web/pages/painel/admin/pendencias.vue`: lista de implementacoes e pendencias.
- `apps/web/pages/painel/personagens.vue`: gerenciamento de personagens da conta.
- `apps/web/pages/painel/conta.vue`: dados da conta, troca de senha mockada e historico.
- `apps/web/pages/painel/loja.vue`: loja com intencao de compra.
- `apps/web/pages/recarga.vue`: recarga com intencao de pagamento.

## Perfis e permissoes

- `player`: gerencia a propria conta, personagens, loja e recarga.
- `moderator`: reservado para moderacao futura.
- `game-master`: reservado para ferramentas de jogo futuras.
- `admin`: acessa painel administrativo, referencias, auditoria, financeiro e guias futuros.
- `super-admin`: reservado para acesso total.

Permissoes importantes:

- `admin.dashboard.view`: libera painel administrativo.
- `admin.references.manage`: libera referencias dev.
- `admin.audit.view`: libera auditoria.
- `admin.finance.manage`: libera financeiro.
- `admin.shop.manage`: libera gerenciamento administrativo da loja.
- `admin.recharge.manage`: libera gerenciamento administrativo dos pacotes de recarga.
- `admin.system.manage`: libera ferramentas locais de manutencao do sistema.
- `account.manage`: libera conta.
- `characters.manage`: libera personagens.
- `shop.access`: libera loja.
- `recharge.access`: libera recarga.
- `guides.future.view`: permite visualizar guias de personagens de versoes futuras.

## Fluxo de login

1. Usuario entra em `/login`.
2. `loginWithCredentials()` valida as credenciais mockadas.
3. Em caso de sucesso:
   - cria sessao em `localStorage`;
   - registra auditoria `auth.login.success`;
   - redireciona para a rota solicitada ou `/`.
4. Em caso de erro:
   - registra auditoria `auth.login.failed`;
   - apos varias tentativas, bloqueia login temporariamente.
5. Se a conta estiver `Bloqueada`, o login e negado e registra `auth.login.blocked`.
6. Se a conta for bloqueada durante uma sessao aberta, a sessao e encerrada ao recarregar/navegar e registra `auth.session.blocked`.
7. Sair da conta registra `auth.logout`.

## Fluxo de contas

Rota: `/painel/admin/contas`

1. Admin visualiza contas mockadas/persistidas.
2. Pode filtrar por texto, perfil e status.
3. Pode marcar conta como `Ativa`, `Pendente` ou `Bloqueada`.
4. Alteracao chama `updateAccountStatus()`.
5. O novo status e salvo no `localStorage`.
6. Auditoria registra `admin.account.status`.

Observacao: no mock atual, conta bloqueada ja impede login local. No backend real, essa validacao precisa acontecer no servidor antes de emitir sessao.

## Fluxo de personagens

Rota: `/painel/personagens`

1. Player ve apenas personagens da propria conta.
2. Admin ve todos os personagens.
3. A pagina permite filtrar por nome, classe e status.
4. Acoes atuais:
   - `Detalhes`: registra consulta em modo teste.
   - `Resetar`: registra solicitacao de reset em modo teste.
5. Auditoria:
   - `characters.details.opened`
   - `characters.reset.requested`

## Fluxo de loja

Rota: `/painel/loja`

1. Usuario filtra produtos por texto, categoria e moeda.
2. Ao clicar em comprar, cria uma intencao de compra.
3. A intencao fica em `state.purchases`.
4. A compra aparece no historico da conta.
5. A compra aparece no financeiro administrativo.
6. Auditoria registra `shop.purchase.intent`.

Status de compra:

- `Preparada`: usuario clicou em comprar.
- `Concluida`: admin aprovou no financeiro, debitando saldo.
- `Cancelada`: admin cancelou; se ja estava concluida, o saldo volta.

## Fluxo de loja administrativa

Rota: `/painel/admin/loja`

1. Admin visualiza os produtos cadastrados.
2. Pode buscar produto por nome, categoria, descricao, moeda ou status.
3. Pode criar novo produto.
4. Pode editar produto existente.
5. Pode alternar status entre `Ativo` e `Rascunho`.
6. Pode excluir produto.
7. As alteracoes ficam em `state.products` e persistem no `localStorage`.
8. Auditoria:
   - `admin.shop.product.created`
   - `admin.shop.product.updated`
   - `admin.shop.product.status`
   - `admin.shop.product.deleted`

Observacao: produto em `Rascunho` aparece desabilitado na loja do jogador.

## Fluxo de recarga

Rota: `/recarga`

1. Usuario seleciona moeda.
2. Seleciona pacote.
3. Clica em continuar pagamento.
4. Cria uma intencao de recarga em `state.recharges`.
5. A recarga aparece no historico da conta.
6. A recarga aparece no financeiro administrativo.
7. Auditoria registra `recharge.payment.intent`.

Status de recarga:

- `Preparada`: usuario iniciou a recarga.
- `Paga`: admin aprovou no financeiro, creditando saldo + bonus.
- `Cancelada`: admin cancelou; se ja estava paga, o credito e revertido.

## Fluxo de recargas administrativas

Rota: `/painel/admin/recargas`

1. Admin visualiza os pacotes cadastrados.
2. Pode filtrar por moeda.
3. Pode criar novo pacote.
4. Pode editar pacote existente.
5. Pode marcar um pacote como popular.
6. Pode excluir pacote.
7. As alteracoes ficam em `state.rechargePacks` e persistem no `localStorage`.
8. Auditoria:
   - `admin.recharge.pack.created`
   - `admin.recharge.pack.updated`
   - `admin.recharge.pack.deleted`

## Fluxo financeiro

Rota: `/painel/admin/financeiro`

1. Admin ve compras e recargas preparadas.
2. Pode filtrar por busca, status e tipo.
3. Em compras:
   - `Concluir`: debita moeda da conta se houver saldo.
   - `Cancelar`: cancela a compra e devolve saldo se ja tinha sido concluida.
4. Em recargas:
   - `Aprovar`: credita moeda + bonus na conta.
   - `Cancelar`: cancela e reverte credito se ja tinha sido paga.
5. Auditoria:
   - `admin.finance.purchase`
   - `admin.finance.recharge`

## Fluxo de referencias

Rota: `/painel/admin/referencias`

1. Admin escolhe a biblioteca: referencias de desenvolvimento ou gerados/otimizados.
2. Escolhe grupo: personagens, equipamentos, mapas, monstros ou fontes.
3. Seleciona uma categoria antes de renderizar cards.
4. A tela renderiza os cards em lotes para evitar carregar centenas de imagens de uma vez.
5. Pode criar, editar e excluir referencias criadas localmente.
6. Auditoria:
   - `references.asset.created`
   - `references.asset.updated`
   - `references.asset.deleted`

## Fluxo de auditoria

Rota: `/painel/admin/auditoria`

Eventos registrados ate agora:

- Login com sucesso.
- Login invalido.
- Logout.
- Sessao expirada.
- Criar/editar/excluir referencias.
- Alterar status de conta.
- Consultar detalhes de personagem.
- Solicitar reset.
- Intencao de compra.
- Intencao de recarga.
- Aprovar/cancelar compra.
- Aprovar/cancelar recarga.
- Criar/editar/desativar/excluir produto da loja.
- Criar/editar/excluir pacote de recarga.
- Importar/resetar base local do sistema.

## Persistencia local

Chave principal:

- `blood-moon-management-state`

Outras chaves:

- `blood-moon-auth`: sessao atual.
- `blood-moon-login-attempts`: tentativas de login.
- `blood-moon-audit-log`: auditoria.
- `blood-moon-dev-reference-assets`: referencias criadas/editadas no painel.

Importante: limpar o armazenamento do navegador reseta esses dados.

## Fluxo de sistema

Rota: `/painel/admin/sistema`

1. Admin pode exportar a base local em JSON.
2. Admin pode importar um JSON exportado anteriormente.
3. Admin pode resetar a base local para os dados iniciais.
4. O reset da base local nao apaga sessao nem auditoria.
5. Auditoria:
   - `admin.system.import`
   - `admin.system.reset`

## Pontos que ainda precisam virar backend

- Login real com senha criptografada.
- Verificacao de conta bloqueada antes de autenticar.
- Sessao via cookie seguro/token.
- Auditoria salva em banco.
- Contas e personagens reais vindos do banco do servidor.
- Validacao real de Personal ID.
- Troca de senha real.
- Pagamento real.
- Credito de moedas real.
- Entrega real de item/servico na conta.
- Controle de permissao server-side.
- Logs de seguranca por IP/dispositivo.

## Roteiro rapido de teste

1. Entrar como `admin / admin`.
2. Abrir `/painel/admin/contas`.
3. Marcar uma conta como `Bloqueada`.
4. Recarregar a pagina e confirmar que o status permaneceu.
5. Tentar logar com uma conta bloqueada e confirmar bloqueio.
6. Abrir `/painel/admin/loja`.
7. Criar um produto de teste.
8. Abrir `/painel/loja` e confirmar que o produto aparece.
9. Abrir `/painel/admin/recargas`.
10. Criar um pacote de recarga de teste.
11. Abrir `/recarga`.
12. Preparar uma recarga.
13. Abrir `/painel/admin/financeiro`.
14. Aprovar a recarga.
15. Abrir `/painel/conta` e confirmar o historico.
16. Abrir `/painel/admin/auditoria` e confirmar os eventos.
17. Abrir `/painel/admin/sistema`.
18. Gerar JSON de backup.
19. Resetar base local.
20. Importar o JSON e confirmar que os dados voltaram.

## Decisoes tomadas ate aqui

- Painel administrativo aparece apenas para admin.
- Dropdown de boas-vindas leva player para areas de conta/personagem/loja.
- Moedas levam para recarga.
- Dados locais ficam centralizados em `useManagement`.
- Regras de acesso ficam centralizadas em `apps/web/data/security.ts`.
- A auditoria existe desde ja para nao perdermos o rastro dos fluxos enquanto o sistema cresce.
