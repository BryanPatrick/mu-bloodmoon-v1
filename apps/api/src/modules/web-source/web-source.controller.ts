import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { WebSourceService } from './web-source.service'

@Controller('source-web/current')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermissions(permissionKeys.adminGameDataView)
export class WebSourceController {
  constructor(private readonly webSourceService: WebSourceService) {}

  @Get('summary')
  summary() {
    return this.webSourceService.summary()
  }

  @Get('controllers')
  controllers() {
    return this.webSourceService.controllers()
  }

  @Get('models')
  models() {
    return this.webSourceService.models()
  }

  @Get('plugins')
  plugins() {
    return this.webSourceService.plugins()
  }

  @Get('server-data')
  serverData() {
    return this.webSourceService.serverData()
  }

  @Get('item-image-groups')
  itemImageGroups() {
    return this.webSourceService.itemImageGroups()
  }

  @Get('reuse-plan')
  reusePlan() {
    return this.webSourceService.reusePlan()
  }

  @Get('migration-board')
  migrationBoard() {
    return this.webSourceService.migrationBoard()
  }

  @Get('normalized-domains')
  normalizedDomains() {
    return this.webSourceService.normalizedDomains()
  }
}
