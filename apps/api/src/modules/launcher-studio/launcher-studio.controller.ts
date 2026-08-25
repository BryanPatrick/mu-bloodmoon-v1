import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import {
  FIXTURE_EVENTS,
  FIXTURE_NEWS,
  FIXTURE_RANKING,
  FIXTURE_STORE_PRODUCTS,
  LAUNCHER_PREVIEW_STATES,
  fixtureAccountForState,
  type LauncherPreviewState
} from './launcher-studio.fixtures'
import { LauncherStudioService } from './launcher-studio.service'
import type {
  AdminLauncherAssetQuery,
  AdminLauncherAssetUploadPayload,
  AdminLauncherPublishPayload,
  AdminLauncherRollbackPayload,
  AdminLauncherSlotUpdatePayload,
  AdminLauncherTermsCreatePayload
} from './launcher-studio.types'

// Part AI/AK -- every route below requires launcher.content.* /
// launcher.assets.manage explicitly. GM does not inherit these (see
// permissions.ts) -- only ADMIN/SUPER_ADMIN by default, same pattern as
// AdminContentController.
@Controller('admin/launcher-studio')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class LauncherStudioController {
  constructor(private readonly launcherStudio: LauncherStudioService) {}

  @Get('pages')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  pages() {
    return this.launcherStudio.pages()
  }

  @Get('registry')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  registry(@Query('page') page?: string) {
    return this.launcherStudio.registry(page)
  }

  @Get('draft')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  draft(@Query('page') page?: string) {
    return this.launcherStudio.draftState(page)
  }

  @Patch('slots/:slotId')
  @RequirePermissions(permissionKeys.adminLauncherContentEdit)
  updateSlot(
    @Param('slotId') slotId: string,
    @Body() payload: AdminLauncherSlotUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.launcherStudio.updateSlotDraft(slotId, payload, user)
  }

  @Post('publish')
  @RequirePermissions(permissionKeys.adminLauncherContentPublish)
  publish(@Body() payload: AdminLauncherPublishPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.launcherStudio.publish(payload ?? {}, user)
  }

  @Post('rollback')
  @RequirePermissions(permissionKeys.adminLauncherContentPublish)
  rollback(@Body() payload: AdminLauncherRollbackPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.launcherStudio.rollback(payload, user)
  }

  @Get('publish-history')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  publishHistory() {
    return this.launcherStudio.publishHistory()
  }

  @Get('assets')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  assets(@Query() query: AdminLauncherAssetQuery) {
    return this.launcherStudio.listAssets(query)
  }

  @Post('assets/upload')
  @RequirePermissions(permissionKeys.adminLauncherAssetsManage)
  uploadAsset(@Body() payload: AdminLauncherAssetUploadPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.launcherStudio.uploadAsset(payload, user)
  }

  @Delete('assets/:id')
  @RequirePermissions(permissionKeys.adminLauncherAssetsManage)
  archiveAsset(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.launcherStudio.archiveAsset(id, user)
  }

  @Get('terms')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  terms() {
    return this.launcherStudio.listTerms()
  }

  @Post('terms')
  @RequirePermissions(permissionKeys.adminLauncherContentPublish)
  createTerms(@Body() payload: AdminLauncherTermsCreatePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.launcherStudio.createTerms(payload, user)
  }

  // Part AM -- local, non-production fixtures the preview renders against
  // (characters, news, events, ranking, store products) plus the closed
  // list of selectable preview states (Part G).
  @Get('preview/fixtures')
  @RequirePermissions(permissionKeys.adminLauncherContentRead)
  previewFixtures(@Query('state') state?: string) {
    const resolvedState = (LAUNCHER_PREVIEW_STATES as string[]).includes(state ?? '')
      ? (state as LauncherPreviewState)
      : 'LOGGED_OUT'
    return {
      states: LAUNCHER_PREVIEW_STATES,
      state: resolvedState,
      account: fixtureAccountForState(resolvedState),
      news: FIXTURE_NEWS,
      events: FIXTURE_EVENTS,
      ranking: FIXTURE_RANKING,
      storeProducts: FIXTURE_STORE_PRODUCTS
    }
  }
}
