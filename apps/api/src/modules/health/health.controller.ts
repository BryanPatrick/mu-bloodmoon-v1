import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import type { Response } from 'express'
import { PrismaService } from '../../database/prisma.service'

// Liveness vs readiness (2026-09-15, added during the LSAPI hosting
// incident as a diagnostic/monitoring gap noted while investigating it --
// these endpoints do not fix that incident, see README.md in this folder).
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: only proves the Nest process booted and the request
  // pipeline works. Deliberately never touches the database -- a slow or
  // unavailable DB is a readiness concern, not a reason to report the
  // process itself as dead (orchestration/monitoring tooling that acts on
  // liveness failures, e.g. by killing the process, would do the wrong
  // thing if this depended on the DB).
  @Get('health')
  health() {
    return { status: 'ok' }
  }

  // Readiness: proves the process can serve DB-backed traffic right now.
  // SELECT 1 is the minimal proof the connection pool is live -- no real
  // table/schema touched. Returns via @Res({ passthrough: true }) instead
  // of throwing so an expected "DB is down" response never goes through
  // SafeExceptionFilter's 5xx path -- that path logs a SystemError and
  // feeds Http5xxBurstDetector, both meant for real application errors,
  // not the routine, frequent polling a readiness probe implies (that
  // would double-report the same outage a real request already reports,
  // and could itself trip a false 5xx-burst alert during an outage).
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE)
      return { status: 'not_ready' }
    }
  }
}
