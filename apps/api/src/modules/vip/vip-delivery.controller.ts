import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { VipDeliveryService } from './vip-delivery.service'

// Phase 14 Part C. Operational visibility for the GRANT_VIP GameBridge
// queue -- reuses admin.game-bridge.manage (the same permission
// marketplace-bridge-dev.controller.ts's updateBridgeJob already requires)
// rather than inventing a new permission for what is still bridge-job
// operations, just scoped to VIP.
@Controller('admin/vip/delivery')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class VipDeliveryController {
  constructor(private readonly delivery: VipDeliveryService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  list() {
    return this.delivery.listNeedingAttention()
  }

  @Get('drift')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  drift() {
    return this.delivery.reconcileEntitlements()
  }

  @Post(':jobId/retry')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  async retry(@Param('jobId') jobId: string) {
    try {
      return await this.delivery.manualRetry(jobId)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'VIP_DELIVERY_RETRY_FAILED')
    }
  }
}
