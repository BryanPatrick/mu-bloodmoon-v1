# Marketplace e ponte com o servidor MU

Este documento registra a arquitetura base para a futura loja entre jogadores.

## Decisao principal

O banco do portal e o banco do jogo devem continuar separados.

O portal controla:

- contas web;
- permissoes;
- moedas do site;
- pedidos;
- anuncios;
- auditoria;
- historico financeiro;
- conteudo CMS/Wiki.

O servidor do jogo controla:

- inventario real;
- bau;
- personagens reais;
- itens reais;
- estado final dentro do MU.

Por isso o site nao deve escrever livremente no banco do jogo a cada clique. A integracao deve passar por uma ponte auditavel, com jobs idempotentes e estados claros.

## Fluxo para anunciar item

1. Player escolhe um item real do inventario/bau.
2. API cria `PlayerMarketListing` com status `PENDING_LOCK`.
3. API cria `GameBridgeJob` com operacao `LOCK_ITEM`.
4. Worker do jogo valida se o item existe e pertence ao player.
5. Worker bloqueia ou move o item para uma area de escrow no jogo.
6. Worker marca o job como `COMPLETED`.
7. Anuncio passa para `ACTIVE`.

Enquanto o item nao estiver travado no jogo, ele nao deve aparecer como compravel.

## Fluxo para comprar item

1. Comprador escolhe um anuncio `ACTIVE`.
2. API bloqueia a operacao em transacao.
3. API debita a moeda do comprador.
4. API cria `PlayerMarketOrder` com status `DELIVERING`.
5. API marca o anuncio como `SOLD`.
6. API cria `GameBridgeJob` com operacao `TRANSFER_ITEM`.
7. Worker entrega o item ao comprador no jogo.
8. Quando confirmado, pedido vira `COMPLETED`.
9. Somente entao o vendedor recebe a moeda.

Se a entrega falhar, o pedido pode virar `FAILED` ou `REFUNDED`, com devolucao ao comprador.

## Por que usar jobs

- evita duplicar item quando a API ou o worker reinicia;
- permite repetir uma operacao com a mesma `idempotencyKey`;
- gera auditoria completa;
- separa regra financeira do detalhe tecnico do banco do jogo;
- permite testar o portal sem depender do servidor MU ligado.

## Tabelas criadas

- `PlayerMarketListing`: anuncio do item.
- `PlayerMarketOrder`: compra feita pelo player.
- `GameBridgeJob`: fila de operacoes entre portal e jogo.

## Estados importantes

Anuncio:

- `PENDING_LOCK`: criado, aguardando lock do item no jogo.
- `ACTIVE`: item travado e disponivel para compra.
- `SOLD`: vendido.
- `CANCELLED`: cancelado.
- `EXPIRED`: expirado.
- `FAILED`: falhou.

Pedido:

- `PREPARED`: reservado para fluxo futuro.
- `PAID`: reservado para pagamento externo.
- `DELIVERING`: comprador debitado e entrega pendente.
- `COMPLETED`: entregue e vendedor creditado.
- `CANCELLED`: cancelado.
- `REFUNDED`: comprador reembolsado.
- `FAILED`: falhou.

Job:

- `PENDING`: aguardando worker.
- `PROCESSING`: worker executando.
- `COMPLETED`: confirmado.
- `FAILED`: falhou.
- `CANCELLED`: cancelado.

## Producao

Ainda falta implementar o worker real que conversa com o banco/servidor MU. Ate la, existe endpoint administrativo de desenvolvimento para ativar anuncio e atualizar status de pedido/job.

Regra para producao: remover qualquer etapa manual que substitua confirmacao real do servidor do jogo.

## Arquivos implementados

- Backend: `apps/api/src/modules/marketplace`.
- Worker base: `apps/api/scripts/process-game-bridge-jobs.mjs`.
- Frontend publico: `apps/web/pages/marketplace.vue`.
- Frontend player: `apps/web/pages/painel/marketplace.vue`.
- Frontend admin: `apps/web/pages/painel/admin/marketplace.vue`.
- Cliente Nuxt: `apps/web/composables/useMarketplaceApi.ts`.

## Proximos requisitos para o worker real

1. Mapear a tabela real de inventario/bau do servidor MU.
2. Definir se o item anunciado sera travado por flag, movido para bau escrow ou removido temporariamente.
3. Garantir identificador unico do item real no jogo.
4. Implementar `LOCK_ITEM`.
5. Implementar `RELEASE_ITEM`.
6. Implementar `TRANSFER_ITEM`.
7. Testar repeticao da mesma `idempotencyKey` sem duplicar item.
8. Criar logs de auditoria por item, conta, personagem e IP.
