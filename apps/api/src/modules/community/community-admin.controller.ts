import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CommunityAdminService } from './community-admin.service'
import type {
  CommunityAchievementPayload,
  CommunityAdminActionPayload,
  CommunityBadgePayload,
  CommunityGrantPayload,
  CommunityModerationPayload,
  CommunityPolicyPayload,
  CommunityQuestProgressPayload,
  CommunityQuery,
  CommunityQuestPayload,
  CommunityTaskPayload
} from './community.contract'

@Controller('admin/community')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class CommunityAdminController {
  constructor(private readonly admin: CommunityAdminService) {}

  @Get('dashboard')
  @RequirePermissions(permissionKeys.adminCommunityView)
  dashboard(@CurrentUser() user: AuthenticatedUser) { return this.admin.dashboard(user) }

  @Get('posts')
  @RequirePermissions(permissionKeys.adminCommunityView)
  posts(@Query() query: CommunityQuery) { return this.admin.posts(query) }

  @Get('posts/:id/history')
  @RequirePermissions(permissionKeys.adminCommunityView)
  postHistory(@Param('id') id: string) { return this.admin.postHistory(id) }

  @Post('posts/:id/actions')
  @RequirePermissions(permissionKeys.adminCommunityPostsModerate)
  postAction(@Param('id') id: string, @Body() payload: CommunityAdminActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.postAction(id, payload, user)
  }

  @Get('comments')
  @RequirePermissions(permissionKeys.adminCommunityView)
  comments(@Query() query: CommunityQuery) { return this.admin.comments(query) }

  @Post('comments/:id/actions')
  @RequirePermissions(permissionKeys.adminCommunityCommentsModerate)
  commentAction(@Param('id') id: string, @Body() payload: CommunityAdminActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.commentAction(id, payload, user)
  }

  @Get('reactions')
  @RequirePermissions(permissionKeys.adminCommunityView)
  reactions(@Query() query: CommunityQuery) { return this.admin.reactions(query) }

  @Post('reactions/:id/actions')
  @RequirePermissions(permissionKeys.adminCommunityCommentsModerate)
  reactionAction(@Param('id') id: string, @Body() payload: CommunityAdminActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.reactionAction(id, payload, user)
  }

  @Get('users')
  @RequirePermissions(permissionKeys.adminCommunityView)
  users(@Query() query: CommunityQuery) { return this.admin.users(query) }

  @Post('users/:id/moderation')
  @RequirePermissions(permissionKeys.adminCommunityUsersModerate)
  moderateUser(@Param('id') id: string, @Body() payload: CommunityModerationPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.moderateUser(id, payload, user)
  }

  @Post('users/:id/restore')
  @RequirePermissions(permissionKeys.adminCommunityUsersModerate)
  restoreUser(@Param('id') id: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.restoreUser(id, payload.reason || '', user)
  }

  @Get('reports')
  @RequirePermissions(permissionKeys.adminCommunityView)
  reports(@Query() query: CommunityQuery) { return this.admin.reports(query) }

  @Patch('reports/:id')
  @RequirePermissions(permissionKeys.adminCommunityReportsModerate)
  reportAction(@Param('id') id: string, @Body() payload: CommunityAdminActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.reportAction(id, payload, user)
  }

  @Get('achievements')
  @RequirePermissions(permissionKeys.adminCommunityView)
  achievements(@Query() query: CommunityQuery) { return this.admin.achievements(query) }

  @Post('achievements')
  @RequirePermissions(permissionKeys.adminCommunityAchievementsManage)
  createAchievement(@Body() payload: CommunityAchievementPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveAchievement(null, payload, user)
  }

  @Patch('achievements/:id')
  @RequirePermissions(permissionKeys.adminCommunityAchievementsManage)
  editAchievement(@Param('id') id: string, @Body() payload: CommunityAchievementPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveAchievement(id, payload, user)
  }

  @Post('achievements/:id/actions/:action')
  @RequirePermissions(permissionKeys.adminCommunityAchievementsManage)
  achievementAction(@Param('id') id: string, @Param('action') action: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.achievementAction(id, action, payload.reason || '', user)
  }

  @Post('achievements/:id/grants')
  @RequirePermissions(permissionKeys.adminCommunityAchievementsManage)
  grantAchievement(@Param('id') id: string, @Body() payload: CommunityGrantPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.grantAchievement(id, payload, user)
  }

  @Post('achievements/:id/grants/:accountId/revoke')
  @RequirePermissions(permissionKeys.adminCommunityAchievementsManage)
  revokeAchievement(@Param('id') id: string, @Param('accountId') accountId: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.revokeAchievement(id, accountId, payload.reason || '', user)
  }

  @Get('quests')
  @RequirePermissions(permissionKeys.adminCommunityView)
  quests(@Query() query: CommunityQuery) { return this.admin.quests(query) }

  @Post('quests')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  createQuest(@Body() payload: CommunityQuestPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveQuest(null, payload, user)
  }

  @Patch('quests/:id')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  editQuest(@Param('id') id: string, @Body() payload: CommunityQuestPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveQuest(id, payload, user)
  }

  @Post('quests/:id/actions/:action')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  questAction(@Param('id') id: string, @Param('action') action: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.questAction(id, action, payload.reason || '', user)
  }

  @Get('quests/:id/participants')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  questParticipants(@Param('id') id: string) { return this.admin.questParticipants(id) }

  @Post('quests/:id/participants/:accountId/reward')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  validateReward(@Param('id') id: string, @Param('accountId') accountId: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.validateQuestReward(id, accountId, payload.reason || '', user)
  }

  @Patch('quests/:id/participants/:accountId')
  @RequirePermissions(permissionKeys.adminCommunityQuestsManage)
  updateQuestProgress(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() payload: CommunityQuestProgressPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.updateQuestProgress(id, accountId, payload, user)
  }

  @Get('badges')
  @RequirePermissions(permissionKeys.adminCommunityView)
  badges(@Query() query: CommunityQuery) { return this.admin.badges(query) }

  @Post('badges')
  @RequirePermissions(permissionKeys.adminCommunityBadgesManage)
  createBadge(@Body() payload: CommunityBadgePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveBadge(null, payload, user)
  }

  @Patch('badges/:id')
  @RequirePermissions(permissionKeys.adminCommunityBadgesManage)
  editBadge(@Param('id') id: string, @Body() payload: CommunityBadgePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveBadge(id, payload, user)
  }

  @Post('badges/:id/grants')
  @RequirePermissions(permissionKeys.adminCommunityBadgesManage)
  grantBadge(@Param('id') id: string, @Body() payload: CommunityGrantPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.grantBadge(id, payload, user)
  }

  @Post('badges/:id/grants/:accountId/revoke')
  @RequirePermissions(permissionKeys.adminCommunityBadgesManage)
  revokeBadge(@Param('id') id: string, @Param('accountId') accountId: string, @Body() payload: { reason?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.revokeBadge(id, accountId, payload.reason || '', user)
  }

  @Get('policy')
  @RequirePermissions(permissionKeys.adminCommunityView)
  policy() { return this.admin.policy() }

  @Patch('policy')
  @RequirePermissions(permissionKeys.adminCommunityPolicyManage)
  updatePolicy(@Body() payload: CommunityPolicyPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.updatePolicy(payload, user)
  }

  @Get('tasks')
  @RequirePermissions(permissionKeys.adminCommunityView)
  tasks(@Query() query: CommunityQuery) { return this.admin.tasks(query) }

  @Post('tasks')
  @RequirePermissions(permissionKeys.adminCommunityTasksManage)
  createTask(@Body() payload: CommunityTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveTask(null, payload, user)
  }

  @Patch('tasks/:id')
  @RequirePermissions(permissionKeys.adminCommunityTasksManage)
  editTask(@Param('id') id: string, @Body() payload: CommunityTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveTask(id, payload, user)
  }

  @Get('analytics')
  @RequirePermissions(permissionKeys.adminCommunityReportsView)
  analytics() { return this.admin.analytics() }
}
