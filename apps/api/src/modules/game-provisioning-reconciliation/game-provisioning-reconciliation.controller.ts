import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { GameProvisioningReconciliationService } from './game-provisioning-reconciliation.service'

// Phase 3D-B Part AN -- an operational view for support/admin, not a
// general game-command surface. Never exposes the game credential,
// ciphertext, legacyLogin, or a raw SQL error -- only what
// GameProvisioningReconciliationService.listNeedingAttention() already
// safely returns. The retry action always goes through the same
// dispatch()/reconcile() primitives Phase 3D-A already built; there is no
// generic "run this game command" endpoint here or anywhere else.
@Controller('admin/game-provisioning')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class GameProvisioningReconciliationController {
  constructor(private readonly reconciliation: GameProvisioningReconciliationService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminGameProvisioningView)
  list() {
    return this.reconciliation.listNeedingAttention()
  }

  @Post(':accountId/retry')
  @RequirePermissions(permissionKeys.adminGameProvisioningManage)
  async retry(@Param('accountId') accountId: string) {
    try {
      return await this.reconciliation.manualRetry(accountId)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'RETRY_FAILED')
    }
  }
}
