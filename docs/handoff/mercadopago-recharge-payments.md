# Mercado Pago — recarga de WCoin (Checkout Transparente / Orders API, Pix)

Integração de pagamento real (ambiente TESTE/sandbox) para o fluxo de recarga
de carteira do portal. **Credita a carteira interna do portal (tabela
`AccountCurrency`) — não o saldo nativo do servidor MU.** Este fluxo nunca
toca `MU_DATABASE_URL` nem cria `GameBridgeJob`; recarga e o jogo continuam
completamente isolados, exatamente como hoje.

Escopo: apenas Pix via Checkout Transparente. Sem cartão/Bricks, sem refund
real (stub), sem produção, sem credenciais reais em lugar nenhum.

## 1. Arquivos criados

- `apps/api/prisma/migrations/20260811191200_mercadopago_recharge_payments/migration.sql`
- `apps/api/src/modules/payments/` (módulo novo, agnóstico de gateway):
  `payments.module.ts`, `payment-provider.interface.ts`, `payment-provider.types.ts`,
  `mercadopago.provider.ts`, `mercadopago.config.ts`, `mercadopago.types.ts`,
  `mercadopago.status-map.ts`, `webhook-signature.util.ts`,
  `payment-webhook-event.service.ts`, `webhook-rate-limit.util.ts`
- `apps/api/src/modules/commerce/recharge-webhook.controller.ts`
- `apps/api/test/recharge-payments.e2e-spec.ts`

## 2. Arquivos alterados

- `apps/api/prisma/schema.prisma` — `RechargeIntentStatus` (novos valores),
  colunas novas em `RechargeIntent`, modelo `PaymentWebhookEvent`.
- `apps/api/.env.example` — variáveis do Mercado Pago.
- `apps/api/src/modules/commerce/commerce.module.ts` — importa `PaymentsModule`,
  registra `RechargeWebhookController`.
- `apps/api/src/modules/commerce/commerce.contract.ts` — `UpdateRechargeStatusPayload.reason`,
  `MercadoPagoWebhookInput`.
- `apps/api/src/modules/commerce/commerce.controller.ts` — rotas novas (seção 4).
- `apps/api/src/modules/commerce/commerce.service.ts` — `createRechargeCheckout`,
  `getRechargeForAccount`, `getRechargeDetail`, `resyncRechargeFromProvider`,
  `handleMercadoPagoWebhook`, `transitionRechargeStatus` (núcleo compartilhado
  extraído de `updateRechargeStatus`), `reconcileWithProvider`.
- `apps/web/composables/useCommerceApi.ts` — status estendidos, `createRechargeCheckout`,
  `getRechargeStatus`, `getRechargeDetail`, `resyncRecharge`.
- `apps/web/pages/recarga.vue` — fluxo real de checkout (QR/Pix copia-e-cola,
  polling de status).
- `apps/web/pages/painel/admin/financeiro.vue` — painel de detalhes Mercado Pago
  + timeline de webhooks + botão de ressincronização, no lugar já existente
  (não foi criada uma tela nova).

## 3. Schema (resumo)

`RechargeIntentStatus`: `PREPARED, PENDING, PROCESSING, PAID, FAILED, CANCELLED, MANUAL_REVIEW, REFUND_PENDING, REFUNDED`.

`RechargeIntent` ganhou: `provider`, `correlationId` (cadeia de auditoria
interna), `externalReference` (enviado ao provider), `paymentIdempotencyKey`
(header de idempotência) — modelados como **três colunas separadas** por
pedido explícito do operador, mesmo coincidindo hoje, para não travar
retries/refunds/múltiplos providers no futuro — mais `externalOrderId`,
`externalStatus`, `externalStatusDetail`, `paymentMethod`, `failureReason`,
`manualReviewReason`, `refundReason`, `lastWebhookAt`, `approvedAt`, `refundedAt`.

`PaymentWebhookEvent` (nova tabela): dedupe de webhooks reenviados, chave
única `(provider, topic, eventId)`, guarda o payload sanitizado e o resultado
do processamento.

## 4. Rotas novas

| Método + rota | Autenticação |
|---|---|
| `POST /api/recharge/intents/:id/checkout` | jogador (dono da recarga) |
| `GET /api/recharge/intents/:id` | jogador (dono da recarga) |
| `POST /api/payments/webhooks/mercadopago` | pública, validada por assinatura |
| `GET /api/admin/finance/recharges/:id` | admin (`adminFinancialReportsView`) |
| `POST /api/admin/finance/recharges/:id/resync` | admin (`adminOrdersOperate`) |

## 5. URL exata do webhook

```
https://<API_PUBLIC_URL>/api/payments/webhooks/mercadopago
```

Em produção real seria `https://api.bloodmoonmu.com.br/api/payments/webhooks/mercadopago`
(ajuste conforme o domínio real da API) — **em teste/sandbox, precisa de uma URL
publicamente alcançável** (um túnel como ngrok/cloudflared apontando para a
API local, já que o Mercado Pago não alcança `localhost`).

## 6. Evento a selecionar no painel do Mercado Pago

**"Order (Mercado Pago)"** — confirmado na documentação atual
(`checkout-api-orders/notifications`). É o único tópico necessário; o payload
da notificação (`type: "order"`, `data.id`) é tratado em
`recharge-webhook.controller.ts`.

## 7. Variáveis de ambiente a configurar

```
MERCADO_PAGO_PUBLIC_KEY=          # não utilizada nesta etapa (sem fluxo de cartão/Bricks)
MERCADO_PAGO_ACCESS_TOKEN=        # Access Token de TESTE (APP_USR-... ou TEST-...)
MERCADO_PAGO_WEBHOOK_SECRET=      # Secret Signature da integração, painel do Mercado Pago
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
MERCADO_PAGO_TIMEOUT_MS=15000
```

`ACCESS_TOKEN` e `WEBHOOK_SECRET` são exigidas em produção (falha no boot da
API se ausentes); em desenvolvimento/teste a API sobe normalmente e cada
chamada ao Mercado Pago retorna `503` até serem configuradas.

## 8. Passo a passo para o primeiro Pix de teste

1. Criar uma aplicação de teste no [painel de desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers)
   e copiar o **Access Token de teste** e a **Public Key de teste**.
2. Preencher `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`
   (este último é gerado ao configurar o webhook no painel — seção "Suas
   integrações" → a aplicação → "Webhooks" → "Assinatura secreta").
3. Expor a API local publicamente (`ngrok http 3333` ou similar) e registrar
   a URL do passo 5 como webhook, evento "Order (Mercado Pago)".
4. Subir a API com essas variáveis configuradas.
5. Logar como jogador de teste, ir em `/recarga`, escolher um pacote, clicar
   em "Pagar com Pix".
6. A tela muda para o QR code + código copia-e-cola (retornados de verdade
   pelo Mercado Pago). Pagar usando uma conta de teste "comprador" do
   Mercado Pago (ou o simulador de notificações do painel, para não depender
   de um pagamento real de sandbox).
7. O Mercado Pago envia o webhook; a API valida a assinatura, consulta a
   Order diretamente, credita a carteira e a tela de recarga atualiza
   sozinha (poll a cada ~4s) para "Pagamento aprovado! Seu saldo já foi
   atualizado."
8. Conferir em `/painel/admin/financeiro` → recarga correspondente →
   "Detalhes (Mercado Pago)" → provider, order id, timeline de webhooks.

## 9. Confirmação: duplicidade não gera crédito duplicado

Coberto por teste automatizado (não é só uma alegação):

- **Checkout duplicado** (duplo clique): mesmo `paymentIdempotencyKey`
  reenviado ao Mercado Pago — o próprio Mercado Pago responde com a mesma
  Order em vez de criar uma nova (teste "reuses the same idempotency key...").
- **Webhook duplicado** (mesmo evento reentregue): tabela `PaymentWebhookEvent`
  com `@@unique([provider, topic, eventId])` barra o reprocessamento
  (teste "does not double-credit when the exact same webhook event is
  redelivered" — saldo creditado exatamente uma vez após duas entregas do
  mesmo evento).
- **Falha durante o crédito, depois nova tentativa**: uma falha real durante
  a transação deixa a recarga fora de `PAID` e devolve `500` (Mercado Pago
  reenviaria); uma redelivery subsequente credita exatamente uma vez, e uma
  terceira entrega (já processada) não credita nada a mais (teste "does not
  leave the intent PAID if crediting fails, and a later retry credits
  exactly once").

## 10. Resultado dos testes

```
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

15 cenários cobertos (os 13 pedidos + 2 de reforço — ownership/IDOR e
"preço nunca vem do cliente"): criação de order com idempotency-key; checkout
duplicado idempotente; webhook válido (credita e audita); webhook malformado/
order inexistente na Mercado Pago (200, sem mutação, sem retry infinito);
assinatura inválida (Mercado Pago nunca é consultada); webhook duplicado
(crédito único); `approvedAt` e valor exato creditado; pagamento recusado
(`FAILED`, sem crédito); pagamento pendente (sem crédito prematuro);
divergência de valor (`MANUAL_REVIEW` + `SystemAlert` CRITICAL real);
order sem `RechargeIntent` correspondente (200 + alerta); falha durante o
crédito seguida de nova tentativa bem-sucedida e uma terceira entrega que não
credita de novo; preço sempre vem do `RechargePackage` no servidor, nunca do
cliente; um jogador não consegue iniciar checkout na recarga de outro
(`403`).

Como rodar: `npm run api:test:e2e -- --testPathPatterns="recharge-payments"`
(sobe um container MariaDB descartável via Docker, roda as migrations reais,
mocka o HTTP do Mercado Pago via `global.fetch`).

Quality gate completo também passou: `tsc --noEmit` (0 erros), `eslint`
(0 erros nos arquivos desta etapa), `nest build`, `nuxt build`.

## 11. Como simular um webhook manualmente (sem sandbox real)

```bash
curl -X POST "http://localhost:3333/api/payments/webhooks/mercadopago?data.id=ORD_ID_AQUI" \
  -H "x-request-id: manual-test-1" \
  -H "x-signature: ts=$(date +%s),v1=$(node -e "console.log(require('crypto').createHmac('sha256', process.env.MERCADO_PAGO_WEBHOOK_SECRET).update('id:ORD_ID_AQUI;request-id:manual-test-1;ts:'+Math.floor(Date.now()/1000)+';').digest('hex'))")" \
  -H "content-type: application/json" \
  -d '{"action":"order.updated","api_version":"v1","application_id":"test","date_created":"2026-01-01T00:00:00Z","id":"evt-1","live_mode":false,"type":"order","user_id":1,"data":{"id":"ORD_ID_AQUI"}}'
```

Note que o `ts` usado no header precisa bater exatamente com o usado dentro
do HMAC — o exemplo acima tem uma pequena janela de corrida entre os dois
`date +%s`/`Date.now()`; para um teste real prefira o "Simulador de
notificações" do próprio painel do Mercado Pago, que já resolve isso.

## 12. Pendências antes de produção

- **Nunca testado contra o Mercado Pago real** — tudo aqui foi validado com
  mocks fiéis à documentação oficial (nomes de campos, formato de assinatura,
  vocabulário de status), mas uma passada real em sandbox com credenciais de
  teste de verdade ainda não aconteceu nesta sessão.
- Valores exatos de teste (cartões/Pix de teste para simular aprovado/
  recusado/pendente) dependem da conta sandbox do operador — não há como
  confirmar isso sem credenciais reais.
- `refundOrder()` é um stub — refund real não foi implementado, só a
  interface e o tratamento defensivo de `REFUND_PENDING` quando um estorno é
  sinalizado pelo Mercado Pago mas a carteira já foi gasta em jogo.
- Chargeback (`charged_back`) é roteado para `MANUAL_REVIEW` — nenhuma
  automação real de disputa foi implementada, por decisão explícita de
  escopo.
- `MERCADO_PAGO_PUBLIC_KEY` está no `.env.example` mas não é usada em lugar
  nenhum do código ainda — só entra em cena se um fluxo de cartão/Bricks for
  adicionado depois.
- Sem credenciais reais configuradas, todo o fluxo de pagamento responde
  `503` de forma controlada (confirmado manualmente) — não crasha a API.
