import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  AdminTaskActionPayload,
  AdminTaskCommentPayload,
  AdminTaskEvidencePayload,
  AdminTaskLinkPayload,
  AdminTaskPayload,
  AdminTaskQuery
} from './admin-tasks.contract'
import { AdminTasksService } from './admin-tasks.service'

@Controller('admin/tasks')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTasksController {
  constructor(private readonly tasks: AdminTasksService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminTasksView)
  list(@Query() query: AdminTaskQuery) {
    return this.tasks.list(query)
  }

  @Get('dashboard/me')
  @RequirePermissions(permissionKeys.adminTasksView)
  personalDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.tasks.personalDashboard(user)
  }

  @Get('dashboard/management')
  @RequirePermissions(permissionKeys.adminTasksReportsView)
  managementDashboard() {
    return this.tasks.managementDashboard()
  }

  @Get('reports')
  @RequirePermissions(permissionKeys.adminTasksReportsView)
  reports() {
    return this.tasks.reports()
  }

  @Get('administrators')
  @RequirePermissions(permissionKeys.adminTasksAssign)
  administrators() {
    return this.tasks.administrators()
  }

  @Get(':id')
  @RequirePermissions(permissionKeys.adminTasksView)
  details(@Param('id') id: string) {
    return this.tasks.details(id)
  }

  @Post()
  @RequirePermissions(permissionKeys.adminTasksCreate)
  create(@Body() payload: AdminTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.create(payload, user)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminTasksManage)
  update(@Param('id') id: string, @Body() payload: AdminTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.update(id, payload, user)
  }

  @Post(':id/actions')
  @RequirePermissions(permissionKeys.adminTasksView)
  action(@Param('id') id: string, @Body() payload: AdminTaskActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.action(id, payload, user)
  }

  @Post(':id/comments')
  @RequirePermissions(permissionKeys.adminTasksOperate)
  addComment(@Param('id') id: string, @Body() payload: AdminTaskCommentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.addComment(id, payload, user)
  }

  @Patch('comments/:commentId')
  @RequirePermissions(permissionKeys.adminTasksOperate)
  editComment(@Param('commentId') commentId: string, @Body() payload: AdminTaskCommentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.editComment(commentId, payload, user)
  }

  @Post(':id/evidence')
  @RequirePermissions(permissionKeys.adminTasksOperate)
  addEvidence(@Param('id') id: string, @Body() payload: AdminTaskEvidencePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.addEvidence(id, payload, user)
  }

  @Post(':id/links')
  @RequirePermissions(permissionKeys.adminTasksManage)
  addLink(@Param('id') id: string, @Body() payload: AdminTaskLinkPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.addLink(id, payload, user)
  }

  @Post(':id/links/:linkId/remove')
  @RequirePermissions(permissionKeys.adminTasksManage)
  removeLink(@Param('id') id: string, @Param('linkId') linkId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tasks.removeLink(id, linkId, user)
  }
}
