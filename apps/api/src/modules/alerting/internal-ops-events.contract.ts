import { BadRequestException } from '@nestjs/common'

// Hand-rolled validation, matching this codebase's established convention
// (no class-validator/ValidationPipe is used anywhere in apps/api --
// confirmed during this phase's audit). Deliberately a narrow, closed
// allow-list rather than free-form strings: this endpoint is reachable by
// a shell script carrying a shared-secret token, not an authenticated
// staff session, so it should not be able to write an arbitrary
// module/eventType into the same OperationalEvent table every other
// (RBAC-gated) part of the admin app writes to.
const ALLOWED_MODULES = ['backup', 'sql-server-backup', 'deploy'] as const
const ALLOWED_SEVERITIES = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const

export type OpsEventModule = (typeof ALLOWED_MODULES)[number]
export type OpsEventSeverity = (typeof ALLOWED_SEVERITIES)[number]

export interface ReportOpsEventInput {
  module: OpsEventModule
  eventType: string
  severity: OpsEventSeverity
  description: string
  data?: Record<string, unknown>
}

export function parseReportOpsEventInput(body: unknown): ReportOpsEventInput {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Request body must be an object.')
  }
  const value = body as Record<string, unknown>

  if (typeof value.module !== 'string' || !ALLOWED_MODULES.includes(value.module as OpsEventModule)) {
    throw new BadRequestException(`module must be one of: ${ALLOWED_MODULES.join(', ')}`)
  }
  if (typeof value.eventType !== 'string' || value.eventType.length === 0 || value.eventType.length > 191) {
    throw new BadRequestException('eventType must be a non-empty string up to 191 characters.')
  }
  if (typeof value.severity !== 'string' || !ALLOWED_SEVERITIES.includes(value.severity as OpsEventSeverity)) {
    throw new BadRequestException(`severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}`)
  }
  if (typeof value.description !== 'string' || value.description.length === 0 || value.description.length > 2000) {
    throw new BadRequestException('description must be a non-empty string up to 2000 characters.')
  }
  if (value.data !== undefined && (typeof value.data !== 'object' || value.data === null || Array.isArray(value.data))) {
    throw new BadRequestException('data, if present, must be a plain object.')
  }

  return {
    module: value.module as OpsEventModule,
    eventType: value.eventType,
    severity: value.severity as OpsEventSeverity,
    description: value.description,
    data: value.data as Record<string, unknown> | undefined
  }
}
