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
import { AccountLifecycleBridgeService } from './account-lifecycle-bridge.service'
import type { NormalDeletionPayload, PreBetaPurgePayload } from './account-deletion.contract'

// Phase 14 Part D, RBAC narrowed 2026-08-30. `normal/*` reuses
// admin.accounts.status.manage -- the same permission accounts.controller.ts
// already requires for account status changes. `pre-beta-purge/*` requires
// its OWN, separate admin.accounts.purge.manage permission -- deliberately
// NOT bundled with admin.accounts.status.manage, so an admin delegated
// ordinary account-status management does not also, as a side effect,
// receive irreversible purge access. Neither permission is part of
// ADMIN's default role permission set (permissions.ts's rolePermissions),
// so both endpoints are SUPER_ADMIN-only until a SUPER_ADMIN explicitly
// delegates the specific permission to an ADMIN account via the existing
// AccountPermission override mechanism.
@Controller('admin/accounts/deletion')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AccountDeletionController {
  constructor(
    private readonly deletion: AccountDeletionService,
    private readonly lifecycleBridge: AccountLifecycleBridgeService,
    private readonly deletionRequest: AccountDeletionRequestService
  ) {}

  @Get('normal/:accountId/dry-run')
  @RequirePermissions(permissionKeys.adminAccountsStatusManage)
  dryRunNormal(@Param('accountId') accountId: string) {
    return this.deletion.dryRunNormalDeletion(accountId)
  }

  @Post('normal')
  @RequirePermissions(permissionKeys.adminAccountsStatusManage)
  async executeNormal(@Body() payload: NormalDeletionPayload, @CurrentUser() user: AuthenticatedUser) {
    if (!payload?.accountId) throw new BadRequestException('ACCOUNT_ID_REQUIRED')
    return this.deletion.executeNormalDeletion(user, payload.accountId, payload.reason)
  }

  @Get('pre-beta-purge/dry-run')
  @RequirePermissions(permissionKeys.adminAccountsPurgeManage)
  dryRunPreBetaPurge(@Query('betaCycleId') betaCycleId: string) {
    return this.deletion.dryRunPreBetaPurge(betaCycleId)
  }

  @Post('pre-beta-purge')
  @RequirePermissions(permissionKeys.adminAccountsPurgeManage)
  async executePreBetaPurge(@Body() payload: PreBetaPurgePayload, @CurrentUser() user: AuthenticatedUser) {
    if (!payload?.betaCycleId || !payload?.accountIds) throw new BadRequestException('BETA_CYCLE_ID_AND_ACCOUNT_IDS_REQUIRED')
    return this.deletion.executePreBetaPurge(user, payload.betaCycleId, payload.accountIds)
  }

  // GameBridge extension plan Part 5's "post-verification" / "relatório do
  // batch" -- shows the real GameServer-side delivery status for every
  // PURGE_GAME_ACCOUNT job queued under this betaCycleId, complementing
  // dryRunPreBetaPurge()'s own Portal-side re-check.
  @Get('pre-beta-purge/:betaCycleId/report')
  @RequirePermissions(permissionKeys.adminAccountsPurgeManage)
  purgeBatchReport(@Param('betaCycleId') betaCycleId: string) {
    return this.lifecycleBridge.purgeBatchReport(betaCycleId)
  }

  // General GameBridge lifecycle observability, covering both
  // ANONYMIZE_GAME_ACCOUNT and PURGE_GAME_ACCOUNT jobs needing attention --
  // mirrors vip-delivery.service.ts's own listNeedingAttention() shape.
  @Get('lifecycle-bridge')
  @RequirePermissions(permissionKeys.adminAccountsPurgeManage)
  lifecycleBridgeStatus() {
    return this.lifecycleBridge.listNeedingAttention()
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
  @RequirePermissions(permissionKeys.adminAccountsStatusManage)
  exitFeedbackSummary(@Query('windowDays') windowDays?: string) {
    const parsed = windowDays ? Number(windowDays) : undefined
    return this.deletionRequest.exitFeedbackSummary(parsed && Number.isFinite(parsed) ? parsed : undefined)
  }
}
