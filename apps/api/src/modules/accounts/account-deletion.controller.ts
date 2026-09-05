import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccountDeletionService } from './account-deletion.service'
import { AccountDeletionRequestService } from './account-deletion-request.service'
import type { NormalDeletionPayload, PreBetaPurgePayload } from './account-deletion.contract'

// Phase 14 Part D. Reuses admin.accounts.status.manage -- the same
// permission accounts.controller.ts already requires for account status
// changes, since deletion is, structurally, the most consequential status
// change this surface can make. No new permission invented for this.
@Controller('admin/accounts/deletion')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermissions(permissionKeys.adminAccountsStatusManage)
export class AccountDeletionController {
  constructor(
    private readonly deletion: AccountDeletionService,
    private readonly deletionRequest: AccountDeletionRequestService
  ) {}

  @Get('normal/:accountId/dry-run')
  dryRunNormal(@Param('accountId') accountId: string) {
    return this.deletion.dryRunNormalDeletion(accountId)
  }

  @Post('normal')
  async executeNormal(@Body() payload: NormalDeletionPayload, @CurrentUser() user: AuthenticatedUser) {
    if (!payload?.accountId) throw new BadRequestException('ACCOUNT_ID_REQUIRED')
    return this.deletion.executeNormalDeletion(user, payload.accountId, payload.reason)
  }

  @Get('pre-beta-purge/dry-run')
  dryRunPreBetaPurge(@Query('betaCycleId') betaCycleId: string) {
    return this.deletion.dryRunPreBetaPurge(betaCycleId)
  }

  @Post('pre-beta-purge')
  async executePreBetaPurge(@Body() payload: PreBetaPurgePayload, @CurrentUser() user: AuthenticatedUser) {
    if (!payload?.betaCycleId || !payload?.accountIds) throw new BadRequestException('BETA_CYCLE_ID_AND_ACCOUNT_IDS_REQUIRED')
    return this.deletion.executePreBetaPurge(user, payload.betaCycleId, payload.accountIds)
  }

  // Bryan's 2026-08-30 follow-up, Part 5: anonymized exit-feedback
  // analytics -- counts per reason code for the current window vs. the
  // prior window of the same length, so "which reasons are rising" is
  // answerable without ever touching player identity (the query never
  // reads accountId). Reuses admin.accounts.status.manage, the same
  // permission normal-deletion visibility already requires -- this is
  // product analytics over already-anonymizable feedback, not a
  // destructive purge capability.
  @Get('exit-feedback/summary')
  exitFeedbackSummary(@Query('windowDays') windowDays?: string) {
    const parsed = windowDays ? Number(windowDays) : undefined
    return this.deletionRequest.exitFeedbackSummary(parsed && Number.isFinite(parsed) ? parsed : undefined)
  }
}
