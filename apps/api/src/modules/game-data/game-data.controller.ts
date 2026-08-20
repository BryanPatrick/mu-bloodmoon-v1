import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { GameDataClient } from './game-data.client'

// A platform diagnostic, not a public Game Data API: real backend
// authorization, a dedicated permission, and a response that never
// includes the Worker URL, HMAC material, or any SQL detail -- see
// GameDataClient/game-data.contract.ts. Not exposed to the public portal or
// launcher.
@Controller('admin/game-data')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class GameDataController {
  constructor(private readonly client: GameDataClient) {}

  @Get('status')
  @RequirePermissions(permissionKeys.adminGameDataView)
  status() {
    return this.client.getBridgeStatus()
  }
}
