import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { AdminReportExportQuery, AdminReportQuery } from './admin-reports.contract'
import { AdminReportsService } from './admin-reports.service'

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get('options')
  @RequirePermissions(permissionKeys.adminReportsView)
  options(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.options(user)
  }

  @Get('export')
  @RequirePermissions(permissionKeys.adminReportsView, permissionKeys.adminReportsExport)
  exportReport(@Query() query: AdminReportExportQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.exportReport(query, user)
  }

  @Get()
  @RequirePermissions(permissionKeys.adminReportsView)
  report(@Query() query: AdminReportQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.report(query, user)
  }
}
