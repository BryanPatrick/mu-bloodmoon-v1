import { Injectable } from '@nestjs/common'
import type { GmEventExecutionMode } from '@prisma/client'
import type { EventExecutor } from './event-executor.interface'
import { GameBridgeEventExecutor } from './game-bridge-event-executor'
import { PortalEventExecutor } from './portal-event-executor'

// MANUAL_GM/HYBRID are always GM-driven -- PortalEventExecutor. AUTOMATED
// is the one mode meant to run without a GM at the wheel, so it resolves to
// GameBridgeEventExecutor, which -- until a real bridge exists -- always
// reports an honest failure rather than pretending to run the event.
@Injectable()
export class EventExecutorFactory {
  constructor(
    private readonly portal: PortalEventExecutor,
    private readonly gameBridge: GameBridgeEventExecutor
  ) {}

  forMode(mode: GmEventExecutionMode): EventExecutor {
    return mode === 'AUTOMATED' ? this.gameBridge : this.portal
  }
}
