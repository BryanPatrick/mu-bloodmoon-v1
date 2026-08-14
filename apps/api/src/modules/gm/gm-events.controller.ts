import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GmEventsService } from './gm-events.service'
import type {
  GmEventDefinitionCreatePayload,
  GmEventDefinitionListQuery,
  GmEventDefinitionUpdatePayload,
  GmEventResultSubmitPayload,
  GmEventResultValidatePayload,
  GmEventRunCancelPayload,
  GmEventRunCreatePayload,
  GmEventRunEndPayload,
  GmEventRunListQuery,
  GmEventRunProblemPayload,
  GmEventScheduleCreatePayload,
  GmEventScheduleUpdatePayload
} from './gm-events.contract'

// Same base access as GmController (GM/ADMIN/SUPER_ADMIN), but the actions
// that go beyond viewing (execute/cancel/validate) are gated by their own
// gm.events.* permission, which is NOT part of every GM's baseline -- a
// SUPER_ADMIN delegates it per-account (accounts.service.ts). Definition
// and schedule *configuration* is ADMIN/SUPER_ADMIN only, overriding the
// class-level @Roles for those two endpoints specifically.
@Controller('gm/events')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('GM', 'ADMIN', 'SUPER_ADMIN')
export class GmEventsController {
  constructor(private readonly events: GmEventsService) {}

  @Get('definitions')
  @RequirePermissions(permissionKeys.gmEventsView)
  listDefinitions(@Query() query: GmEventDefinitionListQuery) {
    return this.events.listDefinitions(query)
  }

  @Post('definitions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createDefinition(@Body() payload: GmEventDefinitionCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.createDefinition(payload, user)
  }

  @Get('definitions/:id')
  @RequirePermissions(permissionKeys.gmEventsView)
  getDefinition(@Param('id') id: string) {
    return this.events.getDefinition(id)
  }

  @Patch('definitions/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateDefinition(
    @Param('id') id: string,
    @Body() payload: GmEventDefinitionUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.events.updateDefinition(id, payload, user)
  }

  @Get('definitions/:id/history')
  @Roles('ADMIN', 'SUPER_ADMIN')
  definitionHistory(@Param('id') id: string) {
    return this.events.definitionHistory(id)
  }

  @Post('definitions/:id/schedules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createSchedule(
    @Param('id') id: string,
    @Body() payload: GmEventScheduleCreatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.events.createSchedule(id, payload, user)
  }

  @Patch('definitions/:id/schedules/:scheduleId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @Body() payload: GmEventScheduleUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.events.updateSchedule(id, scheduleId, payload, user)
  }

  @Delete('definitions/:id/schedules/:scheduleId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.events.deleteSchedule(id, scheduleId, user)
  }

  @Get('agenda')
  @RequirePermissions(permissionKeys.gmEventsView)
  agenda() {
    return this.events.agenda()
  }

  @Get('runs')
  @RequirePermissions(permissionKeys.gmEventsView)
  listRuns(@Query() query: GmEventRunListQuery) {
    return this.events.listRuns(query)
  }

  @Get('runs/:id')
  @RequirePermissions(permissionKeys.gmEventsView)
  getRun(@Param('id') id: string) {
    return this.events.getRun(id)
  }

  @Post('runs')
  @RequirePermissions(permissionKeys.gmEventsExecute)
  startRun(@Body() payload: GmEventRunCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.startRun(payload, user)
  }

  @Patch('runs/:id/end')
  @RequirePermissions(permissionKeys.gmEventsExecute)
  endRun(@Param('id') id: string, @Body() payload: GmEventRunEndPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.endRun(id, payload, user)
  }

  @Patch('runs/:id/problem')
  @RequirePermissions(permissionKeys.gmEventsExecute)
  reportProblem(@Param('id') id: string, @Body() payload: GmEventRunProblemPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.reportProblem(id, payload, user)
  }

  @Patch('runs/:id/cancel')
  @RequirePermissions(permissionKeys.gmEventsCancel)
  cancelRun(@Param('id') id: string, @Body() payload: GmEventRunCancelPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.cancelRun(id, payload, user)
  }

  @Post('runs/:id/result')
  @RequirePermissions(permissionKeys.gmEventsExecute)
  submitResult(@Param('id') id: string, @Body() payload: GmEventResultSubmitPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.submitResult(id, payload, user)
  }

  @Patch('runs/:id/result/validate')
  @RequirePermissions(permissionKeys.gmEventsResultsValidate)
  validateResult(
    @Param('id') id: string,
    @Body() payload: GmEventResultValidatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.events.validateResult(id, payload, user)
  }
}
