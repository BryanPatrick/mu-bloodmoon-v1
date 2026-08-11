import { Body, Controller, Headers, HttpCode, Post, Query, Req, ServiceUnavailableException } from '@nestjs/common'
import type { Request } from 'express'
import { CommerceService } from './commerce.service'
import type { MercadoPagoWebhookPayload } from '../payments/mercadopago.types'
import { isWebhookRateLimited } from '../payments/webhook-rate-limit.util'

// Public, unauthenticated -- Mercado Pago calls this. The signature check
// inside CommerceService.handleMercadoPagoWebhook is the auth. Route is
// provider-namespaced (payments/webhooks/mercadopago) even though this file
// lives in commerce/ -- deliberate, avoids a CommerceModule <-> PaymentsModule
// import cycle; CommerceModule imports PaymentsModule, never the reverse.
@Controller('payments/webhooks')
export class RechargeWebhookController {
  constructor(private readonly commerceService: CommerceService) {}

  @Post('mercadopago')
  @HttpCode(200)
  mercadoPagoWebhook(
    @Req() request: Request,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body() body: MercadoPagoWebhookPayload
  ) {
    if (isWebhookRateLimited(request.ip || 'unknown')) {
      throw new ServiceUnavailableException('Muitas notificacoes recebidas -- tente novamente em instantes.')
    }
    return this.commerceService.handleMercadoPagoWebhook({ signature, requestId, dataId, body })
  }
}
