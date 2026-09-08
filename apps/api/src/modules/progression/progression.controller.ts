import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { ProgressionConfigQuery, ProgressionConfigUpdatePayload } from './progression-config.service'
import { ProgressionConfigService } from './progression-config.service'
import {
  XP_MODIFIER_CATALOG,
  bestCaseStack,
  validateModifierSelection,
  spawnCapacityPerHour,
  RespawnTimeUnknownError,
  estimateXpPerHour
} from './progression-calculator'

// PHASE U (2026-09-03) -- Progression control plane (XP/Drop/Reset/
// Master Reset). Same RBAC shape as the legacy-catalog control plane
// (ADR-0024): GM gets nothing here by default (role hierarchy never
// grants admin.* permissions to GM -- see permissions.ts's own header
// comment), ADM needs an explicit grant, SUPER_ADMIN has full access
// via the wildcard permission.
@Controller('admin/progression')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ProgressionController {
  constructor(private readonly progressionConfig: ProgressionConfigService) {}

  @Get()
  @RequirePermissions(permissionKeys.adminProgressionView)
  list(@Query() query: ProgressionConfigQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.list(user, query)
  }

  @Get('summary')
  @RequirePermissions(permissionKeys.adminProgressionView)
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.summary(user)
  }

  @Post('seed')
  @RequirePermissions(permissionKeys.adminProgressionEdit)
  seed(@CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.seedAll(user)
  }

  @Patch(':id')
  @RequirePermissions(permissionKeys.adminProgressionEdit)
  update(@Param('id') id: string, @Body() payload: ProgressionConfigUpdatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.update(id, payload, user)
  }

  @Get(':id/history')
  @RequirePermissions(permissionKeys.adminProgressionView)
  history(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.history(id, user)
  }

  @Post('effective-state/refresh')
  @RequirePermissions(permissionKeys.adminProgressionEdit)
  refreshEffectiveState(@CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.refreshEffectiveState(user)
  }

  @Post('sync')
  @RequirePermissions(permissionKeys.adminProgressionSync)
  sync(@CurrentUser() user: AuthenticatedUser) {
    return this.progressionConfig.sync(user)
  }

  // PHASE X (2026-09-04) -- XP stack calculator (structural foundation
  // only, docs/decisions/0028-xp-stack-and-progression-calculator.md).
  // Read-only computation, no GameServer/DB write -- reuses
  // admin.progression.view since it adds no new sensitive capability.
  @Get('calculator/catalog')
  @RequirePermissions(permissionKeys.adminProgressionView)
  calculatorCatalog() {
    return { modifiers: XP_MODIFIER_CATALOG, bestCaseStack: bestCaseStack() }
  }

  @Post('calculator/validate-selection')
  @RequirePermissions(permissionKeys.adminProgressionView)
  calculatorValidateSelection(@Body() body: { modifierIds: string[] }) {
    return validateModifierSelection(body.modifierIds ?? [])
  }

  @Post('calculator/spawn-capacity')
  @RequirePermissions(permissionKeys.adminProgressionView)
  calculatorSpawnCapacity(@Body() body: { spotMonsterCount: number, confirmedRespawnSeconds: number | null }) {
    try {
      return { blocked: false, ...spawnCapacityPerHour(body) }
    } catch (error) {
      if (error instanceof RespawnTimeUnknownError) return { blocked: true, reason: error.message }
      throw error
    }
  }

  @Post('calculator/xp-per-hour')
  @RequirePermissions(permissionKeys.adminProgressionView)
  calculatorXpPerHour(@Body() body: { xpPerKill: number, killsPerHour: number }) {
    return estimateXpPerHour(body)
  }
}
