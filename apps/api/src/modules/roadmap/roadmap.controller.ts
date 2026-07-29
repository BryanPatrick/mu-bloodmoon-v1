import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  RoadmapItemPayload, RoadmapQuery, RoadmapRelationPayload, RoadmapReorderPayload,
  RoadmapTaskPayload, RoadmapTransitionPayload, RoadmapUpdatePayload
} from './roadmap.contract'
import { RoadmapService } from './roadmap.service'

@Controller('roadmap')
export class RoadmapPublicController {
  constructor(private readonly roadmap: RoadmapService) {}

  @Get()
  overview(@Query() query: RoadmapQuery) {
    return this.roadmap.publicOverview(query)
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.roadmap.publicDetail(slug)
  }
}

@Controller('admin/roadmap')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class RoadmapAdminController {
  constructor(private readonly roadmap: RoadmapService) {}

  @Get('summary')
  @RequirePermissions(permissionKeys.adminRoadmapView)
  summary() { return this.roadmap.summary() }

  @Get()
  @RequirePermissions(permissionKeys.adminRoadmapView)
  list(@Query() query: RoadmapQuery) { return this.roadmap.list(query) }

  @Get(':id/history')
  @RequirePermissions(permissionKeys.adminRoadmapView)
  history(@Param('id') id: string) { return this.roadmap.history(id) }

  @Get(':id')
  @RequirePermissions(permissionKeys.adminRoadmapView)
  detail(@Param('id') id: string) { return this.roadmap.detail(id) }

  @Post()
  @RequirePermissions(permissionKeys.adminRoadmapCreate)
  create(@Body() payload: RoadmapItemPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.create(payload, user)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  update(@Param('id') id: string, @Body() payload: Partial<RoadmapItemPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.update(id, payload, user)
  }

  @Post(':id/duplicate')
  @RequirePermissions(permissionKeys.adminRoadmapCreate)
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.duplicate(id, user)
  }

  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() payload: RoadmapTransitionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.transition(id, payload, user)
  }

  @Post('order/apply')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  reorder(@Body() payload: RoadmapReorderPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.reorder(payload, user)
  }

  @Post(':id/updates')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  addUpdate(@Param('id') id: string, @Body() payload: RoadmapUpdatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.addUpdate(id, payload, user)
  }

  @Post(':id/tasks')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  createTask(@Param('id') id: string, @Body() payload: RoadmapTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.createTask(id, payload, user)
  }

  @Patch('tasks/:taskId')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  updateTask(@Param('taskId') taskId: string, @Body() payload: Partial<RoadmapTaskPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.updateTask(taskId, payload, user)
  }

  @Post(':id/relations')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  addRelation(@Param('id') id: string, @Body() payload: RoadmapRelationPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.addRelation(id, payload, user)
  }

  @Delete('relations/:relationId')
  @RequirePermissions(permissionKeys.adminRoadmapEdit)
  removeRelation(@Param('relationId') relationId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roadmap.removeRelation(relationId, user)
  }
}
