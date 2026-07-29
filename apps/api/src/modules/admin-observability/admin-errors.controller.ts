import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
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
  AlertUpdatePayload,
  ErrorUpdatePayload,
  ObservabilityListQuery
} from './admin-observability.contract'
import { AdminObservabilityService } from './admin-observability.service'

@Controller('admin/errors')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminErrorsController {
  constructor(private readonly service: AdminObservabilityService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminErrorsView)
  list(@Query() query: ObservabilityListQuery) {
    return this.service.errors(query)
  }

  @Get(':id')
  @RequirePermissions(permissionKeys.adminErrorsView)
  detail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.error(id, user)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminErrorsManage)
  update(
    @Param('id') id: string,
    @Body() payload: ErrorUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.updateError(id, payload, user)
  }
}

@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminAlertsController {
  constructor(private readonly service: AdminObservabilityService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminAlertsView)
  list(@Query() query: ObservabilityListQuery) {
    return this.service.alerts(query)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminAlertsManage)
  update(
    @Param('id') id: string,
    @Body() payload: AlertUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.updateAlert(id, payload, user)
  }
}
