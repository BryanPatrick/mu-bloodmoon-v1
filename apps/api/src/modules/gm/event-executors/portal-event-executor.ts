import { Injectable } from '@nestjs/common'
import type { EventExecutionContext, EventExecutionResult, EventExecutor } from './event-executor.interface'

// Today's only real path (MANUAL_GM/HYBRID): a GM operates the event by
// hand, and the portal simply records that fact. It never claims the MU
// game server itself was touched -- there is no live connection to it this
// round (see the schema.prisma header comment on GmEventDefinition).
@Injectable()
export class PortalEventExecutor implements EventExecutor {
  readonly name = 'portal'

  async execute(_context: EventExecutionContext): Promise<EventExecutionResult> {
    return { origin: 'PORTAL_ONLY', success: true, externalResult: null, externalError: null }
  }
}
