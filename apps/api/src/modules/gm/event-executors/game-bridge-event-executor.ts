import { Injectable } from '@nestjs/common'
import type { EventExecutionContext, EventExecutionResult, EventExecutor } from './event-executor.interface'

// Deliberately inert scaffold for AUTOMATED events. There is no live
// connection to the MU game server/database in this build (same status as
// scripts/process-game-bridge-jobs.mjs's marketplace bridge worker -- see
// its header, which throws for the identical reason). This executor exists
// so the abstraction is wired end-to-end today (gm-events.service.ts
// already resolves AUTOMATED to this executor, not to PortalEventExecutor),
// and so a future real implementation has one obvious place to land: swap
// the body of execute() for an actual SQL Server call using
// bridgeCallPolicyFromEnv() for its timeout/retry behavior, and this file's
// contract does not need to change at any call site.
//
// Hard rule, not a suggestion: this must never return success:true. Doing
// so would let a GM believe an AUTOMATED event actually ran on the game
// server when nothing happened. If you are implementing the real bridge,
// delete this comment and the fallback below -- do not "fix" this executor
// to fake success in the meantime.
@Injectable()
export class GameBridgeEventExecutor implements EventExecutor {
  readonly name = 'game-bridge'

  async execute(_context: EventExecutionContext): Promise<EventExecutionResult> {
    return {
      origin: 'GAMEBRIDGE_ERROR',
      success: false,
      externalResult: null,
      externalError: 'GameBridge nao esta conectado ao servidor do jogo nesta versao -- eventos AUTOMATED nao tem driver real ainda.'
    }
  }
}
