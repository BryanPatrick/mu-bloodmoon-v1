import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  UpdateGameBridgeJobPayload,
  UpdateMarketplaceListingStatusPayload,
  UpdateMarketplaceOrderStatusPayload
} from './marketplace.contract'
import { MarketplaceService } from './marketplace.service'

// Only ever registered when isMarketplaceBridgeDevControlsSafe() allows it
// (see marketplace.module.ts and marketplace-bridge-dev.env.ts) -- these
// handlers set listing/order/bridge-job status directly, with no
// state-transition rules, fabricating what a real GameBridge confirmation
// would normally produce. Never the production admin moderation surface;
// that is marketplace-admin.controller.ts.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MarketplaceBridgeDevController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Patch('admin/marketplace/listings/:id/status')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  updateListingStatus(@Param('id') id: string, @Body() payload: UpdateMarketplaceListingStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateListingStatus(id, payload, user)
  }

  @Post('admin/marketplace/listings/:id/activate')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  activateListing(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.activateListing(id, user)
  }

  @Patch('admin/marketplace/orders/:id/status')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  updateOrderStatus(@Param('id') id: string, @Body() payload: UpdateMarketplaceOrderStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateOrderStatus(id, payload, user)
  }

  @Patch('admin/game-bridge/jobs/:id')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  updateBridgeJob(@Param('id') id: string, @Body() payload: UpdateGameBridgeJobPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateBridgeJob(id, payload, user)
  }
}
