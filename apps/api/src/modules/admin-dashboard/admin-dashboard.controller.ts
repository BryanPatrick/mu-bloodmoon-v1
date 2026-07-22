import { Controller, Get, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AdminDashboardService } from './admin-dashboard.service'

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermissions(permissionKeys.adminDashboardView)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('summary')
  @RequirePermissions(permissionKeys.adminFinanceView)
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.adminDashboardService.summary(user)
  }

  @Get('operational')
  operational(@CurrentUser() user: AuthenticatedUser) {
    return this.adminDashboardService.operational(user)
  }

  @Get('strategic')
  @Roles('SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminFinanceView)
  strategic(@CurrentUser() user: AuthenticatedUser) {
    return this.adminDashboardService.summary(user)
  }
}
