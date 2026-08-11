import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { GuildsAdminService } from './guilds-admin.service'
import type {
  GuildAdminActionPayload,
  GuildCreatePayload,
  GuildLevelConfigPayload,
  GuildQuery,
  GuildXpRulePayload
} from './guilds.contract'

@Controller('admin/guilds')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class GuildsAdminController {
  constructor(private readonly admin: GuildsAdminService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminGuildsView)
  list(@Query() query: GuildQuery) { return this.admin.list(query) }

  @Get(':id')
  @RequirePermissions(permissionKeys.adminGuildsView)
  detail(@Param('id') id: string) { return this.admin.detail(id) }

  // Admin-only this round -- players cannot self-service create a guild.
  // See the guilds README for the future claim/self-service flow this
  // stays ready for.
  @Post()
  @RequirePermissions(permissionKeys.adminGuildsModerate)
  create(@Body() payload: GuildCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.createGuild(payload, user)
  }

  @Post(':id/actions')
  @RequirePermissions(permissionKeys.adminGuildsModerate)
  action(@Param('id') id: string, @Body() payload: GuildAdminActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.action(id, payload, user)
  }

  @Get('config/levels')
  @RequirePermissions(permissionKeys.adminGuildsLevelsManage)
  levelConfig() { return this.admin.levelConfig() }

  @Post('config/levels')
  @RequirePermissions(permissionKeys.adminGuildsLevelsManage)
  createLevelConfig(@Body() payload: GuildLevelConfigPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveLevelConfig(null, payload, user)
  }

  @Patch('config/levels/:id')
  @RequirePermissions(permissionKeys.adminGuildsLevelsManage)
  updateLevelConfig(@Param('id') id: string, @Body() payload: GuildLevelConfigPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveLevelConfig(id, payload, user)
  }

  @Get('config/xp-rules')
  @RequirePermissions(permissionKeys.adminGuildsXpRulesManage)
  xpRules() { return this.admin.xpRules() }

  @Post('config/xp-rules')
  @RequirePermissions(permissionKeys.adminGuildsXpRulesManage)
  createXpRule(@Body() payload: GuildXpRulePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveXpRule(null, payload, user)
  }

  @Patch('config/xp-rules/:id')
  @RequirePermissions(permissionKeys.adminGuildsXpRulesManage)
  updateXpRule(@Param('id') id: string, @Body() payload: GuildXpRulePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.saveXpRule(id, payload, user)
  }

  @Delete('config/xp-rules/:id')
  @RequirePermissions(permissionKeys.adminGuildsXpRulesManage)
  deleteXpRule(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.deleteXpRule(id, user)
  }

  @Get('reports')
  @RequirePermissions(permissionKeys.adminGuildsReportsView)
  reports() { return this.admin.reports() }
}
