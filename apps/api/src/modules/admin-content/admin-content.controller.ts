import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AdminContentService } from './admin-content.service'
import type {
  AdminAssetQuery,
  AdminContentQuery,
  AdminEquipmentQuery,
  AdminSettingQuery,
  AdminCreateKnowledgeEntryPayload,
  AdminCreateEquipmentPayload,
  AdminCreateReferenceAssetPayload,
  AdminCreateSiteSettingPayload,
  AdminUpdateEquipmentPayload,
  AdminUpdateKnowledgeEntryPayload,
  AdminUpdateReferenceAssetPayload,
  AdminUpdateSiteSettingPayload,
  AdminUploadImagePayload
} from './admin-content.types'

@Controller('admin/content')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermissions(permissionKeys.adminContentManage)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('summary')
  summary() {
    return this.adminContentService.summary()
  }

  @Get('entries')
  entries(@Query() query: AdminContentQuery) {
    return this.adminContentService.entries(query)
  }

  @Get('settings')
  @RequirePermissions(permissionKeys.adminServerSettingsManage)
  settings(@Query() query: AdminSettingQuery) {
    return this.adminContentService.settings(query)
  }

  @Post('settings')
  @RequirePermissions(permissionKeys.adminServerSettingsManage)
  createSetting(@Body() payload: AdminCreateSiteSettingPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.createSetting(payload, user)
  }

  @Patch('settings/:id')
  @RequirePermissions(permissionKeys.adminServerSettingsManage)
  updateSetting(@Param('id') id: string, @Body() payload: AdminUpdateSiteSettingPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.updateSetting(id, payload, user)
  }

  @Delete('settings/:id')
  @RequirePermissions(permissionKeys.adminServerSettingsManage)
  archiveSetting(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.archiveSetting(id, user)
  }

  @Post('entries')
  createEntry(@Body() payload: AdminCreateKnowledgeEntryPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.createEntry(payload, user)
  }

  @Patch('entries/:id')
  updateEntry(@Param('id') id: string, @Body() payload: AdminUpdateKnowledgeEntryPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.updateEntry(id, payload, user)
  }

  @Delete('entries/:id')
  archiveEntry(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.archiveEntry(id, user)
  }

  @Get('assets')
  assets(@Query() query: AdminAssetQuery) {
    return this.adminContentService.assets(query)
  }

  @Post('assets')
  createAsset(@Body() payload: AdminCreateReferenceAssetPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.createAsset(payload, user)
  }

  @Post('assets/upload')
  uploadImage(@Body() payload: AdminUploadImagePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.uploadImage(payload, user)
  }

  @Patch('assets/:id')
  updateAsset(@Param('id') id: string, @Body() payload: AdminUpdateReferenceAssetPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.updateAsset(id, payload, user)
  }

  @Delete('assets/:id')
  archiveAsset(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.archiveAsset(id, user)
  }

  @Get('equipment')
  equipment(@Query() query: AdminEquipmentQuery) {
    return this.adminContentService.equipment(query)
  }

  @Get('equipment-metadata')
  equipmentMetadata() {
    return this.adminContentService.equipmentMetadata()
  }

  @Get('equipment/record/:id')
  equipmentDetail(@Param('id') id: string) {
    return this.adminContentService.equipmentDetail(id)
  }

  @Post('equipment')
  createEquipment(@Body() payload: AdminCreateEquipmentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.createEquipment(payload, user)
  }

  @Patch('equipment/:id')
  updateEquipment(@Param('id') id: string, @Body() payload: AdminUpdateEquipmentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.updateEquipment(id, payload, user)
  }

  @Delete('equipment/:id')
  archiveEquipment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminContentService.archiveEquipment(id, user)
  }

  @Get('equipment-gaps')
  equipmentGaps(@Query() query: AdminContentQuery) {
    return this.adminContentService.equipmentGaps(query)
  }
}
