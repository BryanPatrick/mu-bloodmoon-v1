import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { isOpsEventIngestConfigured, opsEventIngestToken } from './alerting.env'

// Machine-to-machine auth for a cron/shell script (the cPanel backup
// script, a future SQL Server backup task) that has no user session --
// same shape as DiscordApiKeyGuard's shared-secret header check
// elsewhere in this codebase, but a Bearer token here since this is a
// standard internal API call, not a bot-facing integration. Fails closed:
// with no OPS_EVENT_INGEST_TOKEN configured, every request is rejected,
// matching Part 17's "do not require production wiring this phase."
@Injectable()
export class InternalOpsEventsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isOpsEventIngestConfigured()) {
      throw new UnauthorizedException('Ops event ingest is not configured.')
    }

    const request = context.switchToHttp().getRequest<Request>()
    const header = request.headers['authorization']
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    if (!token || token !== opsEventIngestToken()) {
      throw new UnauthorizedException('Invalid ops event ingest token.')
    }

    return true
  }
}
