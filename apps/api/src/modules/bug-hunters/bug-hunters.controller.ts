import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BugHuntersService } from './bug-hunters.service'

@Controller('account/bug-reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(permissionKeys.bugHuntersAccess)
export class PlayerBugReportsController {
  constructor(private readonly service: BugHuntersService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.service.listOwnReports(user) }

  @Post() create(@Body() payload: Parameters<BugHuntersService['createReport']>[0], @CurrentUser() user: AuthenticatedUser) {
    return this.service.createReport(payload, user)
  }

  @Get(':id') get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.service.getOwnReport(id, user) }

  @Post(':id/info') addInfo(@Param('id') id: string, @Body() payload: { message?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.addPlayerInfo(id, payload.message, user)
  }
}

@Controller('admin/bug-reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('GM', 'ADMIN', 'SUPER_ADMIN')
export class AdminBugReportsController {
  constructor(private readonly service: BugHuntersService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminBugHuntersView)
  list(@Query('status') status?: string, @Query('category') category?: string, @Query('playerSeverity') playerSeverity?: string, @Query('assignedToAccountId') assignedToAccountId?: string) {
    return this.service.listForStaff({ status, category, playerSeverity, assignedToAccountId })
  }

  @Get('metrics')
  @RequirePermissions(permissionKeys.adminBugHuntersView)
  metrics() { return this.service.metrics() }

  @Get('export')
  @RequirePermissions(permissionKeys.adminBugHuntersView)
  async export(@Query('status') status: string | undefined, @Query('category') category: string | undefined, @Res() res: Response) {
    const csv = await this.service.exportCsv({ status, category })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="bug-reports.csv"')
    res.send(csv)
  }

  @Get(':id')
  @RequirePermissions(permissionKeys.adminBugHuntersView)
  get(@Param('id') id: string) { return this.service.getForStaff(id) }

  @Patch(':id/assign')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  assign(@Param('id') id: string, @Body() payload: { assignedToAccountId?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.assign(id, payload.assignedToAccountId, user)
  }

  @Patch(':id/status')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  status(@Param('id') id: string, @Body() payload: { status?: string, reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.changeStatus(id, payload.status, payload.reason, user)
  }

  @Patch(':id/staff-severity')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  staffSeverity(@Param('id') id: string, @Body() payload: { staffSeverity?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setStaffSeverity(id, payload.staffSeverity, user)
  }

  @Post(':id/reply')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  reply(@Param('id') id: string, @Body() payload: { message?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reply(id, payload.message, user)
  }

  @Post(':id/internal-note')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  internalNote(@Param('id') id: string, @Body() payload: { message?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.addInternalNote(id, payload.message, user)
  }

  @Post(':id/reward-eligibility')
  @RequirePermissions(permissionKeys.adminBugHuntersTriage)
  rewardEligibility(@Param('id') id: string, @Body() payload: { betaCycleId?: string, justification?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.service.recordRewardEligibility(id, payload, user)
  }
}
