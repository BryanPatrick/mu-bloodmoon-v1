import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GmService } from './gm.service'
import type {
  GmLogsQuery,
  GmOccurrenceCreatePayload,
  GmOccurrenceListQuery,
  GmOccurrenceNoteCreatePayload,
  GmOccurrenceUpdatePayload
} from './gm.contract'

// GM is never given admin.* permissions -- this controller only exists for
// the operational, game-facing surface described in the GM RBAC foundation
// (permissions.ts). ADMIN and SUPER_ADMIN can also reach it, consistent
// with the PLAYER < GM < ADMIN < SUPER_ADMIN hierarchy.
@Controller('gm')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('GM', 'ADMIN', 'SUPER_ADMIN')
export class GmController {
  constructor(private readonly gm: GmService) {}

  @Get('dashboard')
  @RequirePermissions(permissionKeys.gmDashboardView)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.gm.dashboard(user)
  }

  @Get('logs')
  @RequirePermissions(permissionKeys.gmOperationalLogsView)
  logs(@Query() query: GmLogsQuery) {
    return this.gm.logs(query)
  }

  @Get('occurrences')
  @RequirePermissions(permissionKeys.gmOccurrencesView)
  listOccurrences(@Query() query: GmOccurrenceListQuery) {
    return this.gm.listOccurrences(query)
  }

  @Get('occurrences/:id')
  @RequirePermissions(permissionKeys.gmOccurrencesView)
  getOccurrence(@Param('id') id: string) {
    return this.gm.getOccurrence(id)
  }

  @Post('occurrences')
  @RequirePermissions(permissionKeys.gmOccurrencesManage)
  createOccurrence(@Body() payload: GmOccurrenceCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.gm.createOccurrence(payload, user)
  }

  @Patch('occurrences/:id')
  @RequirePermissions(permissionKeys.gmOccurrencesManage)
  updateOccurrence(
    @Param('id') id: string,
    @Body() payload: GmOccurrenceUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.gm.updateOccurrence(id, payload, user)
  }

  @Post('occurrences/:id/notes')
  @RequirePermissions(permissionKeys.gmOccurrencesManage)
  addNote(
    @Param('id') id: string,
    @Body() payload: GmOccurrenceNoteCreatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.gm.addNote(id, payload, user)
  }
}
