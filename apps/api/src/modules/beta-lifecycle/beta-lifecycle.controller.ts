import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BetaLifecycleService } from './beta-lifecycle.service'

@Controller()
export class BetaLifecycleController {
  constructor(private readonly betaLifecycle: BetaLifecycleService) {}

  @Get('beta/registration-notice')
  registrationNotice() {
    return this.betaLifecycle.getRegistrationNotice()
  }

  @Post('account/beta/claim-rewards')
  @UseGuards(JwtAuthGuard)
  claimMyEntitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.betaLifecycle.claimMyEntitlements(user)
  }

  // Read-only. Never deletes anything -- see beta-lifecycle.service.ts's
  // cleanupDryRun for the exact safety guarantees.
  @Get('admin/beta/cleanup-dry-run')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminBetaLifecycleManage)
  cleanupDryRun(@Query('betaCycleId') betaCycleId: string) {
    return this.betaLifecycle.cleanupDryRun(betaCycleId)
  }
}
