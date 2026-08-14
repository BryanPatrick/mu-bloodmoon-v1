import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
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
  GmEventResultSubmitPayload,
  GmEventResultValidatePayload,
  GmEventRunCancelPayload,
  GmEventRunCreatePayload,
  GmEventRunEndPayload,
  GmEventRunListQuery,
  GmEventRunProblemPayload,
  GmEventScheduleCreatePayload
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
  listDefinitions() {
    return this.events.listDefinitions()
  }

  @Post('definitions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createDefinition(@Body() payload: GmEventDefinitionCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.events.createDefinition(payload, user)
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
