import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ObservabilityService } from '../observability/observability.service'
import { parseReportOpsEventInput } from './internal-ops-events.contract'
import { InternalOpsEventsGuard } from './internal-ops-events.guard'

// Part 17 -- lets backup tooling (and, later, a Game VPS/SQL Server
// backup task) report started/completed/failed/verification-failed/
// offsite-failed as a real OperationalEvent, so a backup failure flows
// through the exact same detection -> SystemAlert -> AlertSweepService
// pipeline as every other critical condition in this app, rather than a
// bespoke, parallel notification path. Bearer-token guarded (no user
// session exists for a cron job); disabled by default until
// OPS_EVENT_INGEST_TOKEN is set, so this endpoint does not require any
// production wiring this phase.
@Controller('internal/ops-events')
@UseGuards(InternalOpsEventsGuard)
export class InternalOpsEventsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Post()
  @HttpCode(202)
  async report(@Body() body: unknown) {
    const input = parseReportOpsEventInput(body)
    await this.observability.recordOperationalEvent({
      module: input.module,
      eventType: input.eventType,
      severity: input.severity,
      description: input.description,
      data: input.data
    })
    return { accepted: true }
  }
}
