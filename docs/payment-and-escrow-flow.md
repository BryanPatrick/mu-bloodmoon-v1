# Pagamentos, Pix e Escrow do Marketplace

Este documento registra a regra operacional para recargas e venda jogador para jogador.

## Pix e recarga

O fluxo recomendado para a primeira versao e usar Pix para recarregar moeda do portal. O jogador paga o servidor, recebe saldo no site e usa esse saldo na loja ou marketplace.

Fluxo:

1. API cria uma `RechargeIntent` com status `PREPARED`.
2. Provedor Pix gera QR Code, codigo copia-e-cola e identificador externo.
3. Webhook do provedor chega no backend, nunca direto no frontend.
4. Backend valida assinatura, valor, moeda, idempotencia e status.
5. Backend marca a recarga como `PAID`.
6. Backend credita a moeda no portal ou cria job financeiro auditavel.
7. Auditoria registra conta, IP, provedor, valor, moeda e payload resumido.

Regra: o frontend apenas mostra o QR Code e consulta status. Ele nao confirma pagamento.

## Marketplace entre jogadores

Na primeira fase, o marketplace deve usar moeda interna do portal. Evitamos Pix direto entre jogadores porque isso exige split, dados bancarios, KYC e disputa financeira entre pessoas.

Fluxo seguro:

1. Vendedor anuncia item real.
2. API cria anuncio `PENDING_LOCK`.
3. Worker do jogo trava ou move o item para escrow.
4. Somente depois do lock confirmado o anuncio vira `ACTIVE`.
5. Comprador compra com moeda interna.
6. API debita comprador em transacao.
7. API cria pedido `DELIVERING`.
8. Worker entrega o item ao comprador.
9. Pedido vira `COMPLETED`.
10. Somente nesse momento o vendedor recebe a moeda.

Se a entrega falhar, o pedido vira `FAILED` ou `REFUNDED` e o comprador recebe estorno.

## Sincronizacao entre banco do portal e banco do jogo

O portal e o jogo continuam separados.

- Portal: contas web, permissoes, moedas, pedidos, auditoria, CMS e Wiki.
- Jogo: inventario real, personagens reais e estado final dos itens.

A sincronizacao deve passar por `GameBridgeJob`, sempre com `idempotencyKey`, retries e logs. Isso evita item duplicado, perda de item e pagamento liberado antes da entrega.

## O que falta antes de producao

- Escolher provedor Pix.
- Criar tabela de eventos/webhooks de pagamento.
- Implementar validacao de assinatura do provedor.
- Implementar worker real da ponte com o banco do jogo.
- Definir onde fica o escrow do item no jogo.
- Remover qualquer ativacao manual de anuncio usada apenas para desenvolvimento.
