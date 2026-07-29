import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type {
  ExportQuery,
  ObservabilityListQuery,
  RetentionPolicyPayload,
  WorkLogPayload
} from './admin-observability.contract'
import { AdminObservabilityService } from './admin-observability.service'

type DownloadResponse = {
  setHeader: (name: string, value: string) => void
  send: (body: string) => void
}

@Controller('admin/observability')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminObservabilityController {
  constructor(private readonly service: AdminObservabilityService) {}

  @Get('summary')
  @RequirePermissions(permissionKeys.adminAuditView)
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user)
  }

  @Get('audit')
  @RequirePermissions(permissionKeys.adminAuditView)
  audit(
    @Query() query: ObservabilityListQuery,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.auditEvents(query, user)
  }

  @Get('history/:entityType/:entityId')
  @RequirePermissions(permissionKeys.adminAuditHistoryView)
  history(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.entityHistory(entityType, entityId, user)
  }

  @Get('work-logs')
  @RequirePermissions(permissionKeys.adminWorkLogsView)
  workLogs(
    @Query() query: ObservabilityListQuery,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.workLogs(query, user)
  }

  @Post('work-logs')
  @RequirePermissions(permissionKeys.adminWorkLogsManage)
  createWorkLog(
    @Body() payload: WorkLogPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.createWorkLog(payload, user)
  }

  @Get('events')
  @RequirePermissions(permissionKeys.adminOperationalLogsView)
  events(
    @Query() query: ObservabilityListQuery,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.operationalEvents(query, user)
  }

  @Get('exports')
  @RequirePermissions(permissionKeys.adminLogsExport)
  exports(
    @Query() query: ObservabilityListQuery,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.exports(query, user)
  }

  @Get('export')
  @RequirePermissions(permissionKeys.adminLogsExport)
  async export(
    @Query() query: ExportQuery,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: DownloadResponse
  ) {
    const exported = await this.service.exportCsv(query, user)
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`
    )
    response.send(exported.content)
  }

  @Get('retention')
  @Roles('SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminRetentionManage)
  retention() {
    return this.service.retentionPolicies()
  }

  @Patch('retention/:dataType')
  @Roles('SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminRetentionManage)
  updateRetention(
    @Param('dataType') dataType: string,
    @Body() payload: RetentionPolicyPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.updateRetentionPolicy(dataType, payload, user)
  }
}
