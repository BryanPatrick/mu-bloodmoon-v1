import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BetaRewardsService } from './beta-rewards.service'

@Controller('admin/beta-rewards')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class BetaRewardsController {
  constructor(private readonly service: BetaRewardsService) {}

  @Get('participation')
  @RequirePermissions(permissionKeys.adminBetaRewardsView)
  listParticipation(@Query('status') status?: string, @Query('sourceType') sourceType?: string, @Query('betaCycleId') betaCycleId?: string) {
    return this.service.listParticipation({ status, sourceType, betaCycleId })
  }

  @Post('participation')
  @RequirePermissions(permissionKeys.adminBetaRewardsGenerate)
  recordParticipation(
    @Body() payload: { betaCycleId?: string, email?: string, accountId?: string, sourceType?: string, sourceId?: string, justification?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.recordParticipation(payload, user)
  }

  @Patch('participation/:id/reject')
  @RequirePermissions(permissionKeys.adminBetaRewardsGenerate)
  rejectParticipation(@Param('id') id: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.rejectParticipation(id, payload.reason, user)
  }

  @Post('generate/preview')
  @RequirePermissions(permissionKeys.adminBetaRewardsGenerate)
  previewGeneration(@Body() payload: { participationRecordIds?: string[], rewardType?: string, rewardAmount?: number }) {
    return this.service.previewGeneration(payload)
  }

  @Post('generate/commit')
  @RequirePermissions(permissionKeys.adminBetaRewardsGenerate)
  commitGeneration(
    @Body() payload: { participationRecordIds?: string[], rewardType?: string, rewardAmount?: number, reason?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.service.commitGeneration(payload, user)
  }
}
