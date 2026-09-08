import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { VipSyncService } from './vip-sync.service'

// GameBridge extension plan Part 3B step 6 -- operational visibility for
// admin/support, mirroring game-provisioning-reconciliation.controller.ts's
// shape exactly. Never exposes payload/command detail beyond what
// VipSyncService's own methods already return safely -- no price, no
// payment reference, no entitlement id.
@Controller('admin/vip-sync')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class VipSyncController {
  constructor(private readonly vipSync: VipSyncService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminVipSyncView)
  list() {
    return this.vipSync.listDivergent()
  }

  @Post(':accountId/sync')
  @RequirePermissions(permissionKeys.adminVipSyncManage)
  async sync(@Param('accountId') accountId: string) {
    try {
      return await this.vipSync.manualSync(accountId)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'VIP_SYNC_FAILED')
    }
  }
}
