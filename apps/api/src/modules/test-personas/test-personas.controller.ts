import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { TestPersonaService } from './test-personas.service'
import type { ActivatePersonaRequest, AvailablePersonasResponse } from './test-personas.contract'

// This controller is ONLY ever registered when
// TestPersonasModule.register() decides the environment/database guard in
// test-personas.env.ts passes -- see test-personas.module.ts. In any other
// process (most importantly production) these routes do not exist: Nest
// never builds the handler, so a request to them 404s exactly like any other
// unregistered path, indistinguishable from a typo'd URL.
@Controller('test-personas')
export class TestPersonasController {
  constructor(private readonly personas: TestPersonaService) {}

  @Get('available')
  available(): Promise<AvailablePersonasResponse> {
    return this.personas.listAvailable().then((personas) => ({ personas }))
  }

  @Post('activate')
  activate(
    @Body() payload: ActivatePersonaRequest,
    @Req()
    request: {
      ip?: string
      socket: { remoteAddress?: string }
      get(name: string): string | undefined
    }
  ) {
    return this.personas.activate(payload.persona, {
      ip: request.ip || request.socket.remoteAddress || null,
      device: request.get('user-agent')?.slice(0, 240) || null
    })
  }

  @Post('reset')
  reset() {
    return this.personas.reset()
  }
}
