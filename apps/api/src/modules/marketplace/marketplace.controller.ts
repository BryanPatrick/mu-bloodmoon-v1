import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { GameBridgeStatus } from '@prisma/client'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CreateMarketplaceListingPayload,
  CreateMarketplaceOrderPayload,
  MarketplaceQuery,
  UpdateGameBridgeJobPayload,
  UpdateMarketplaceListingStatusPayload,
  UpdateMarketplaceOrderStatusPayload
} from './marketplace.contract'
import { MarketplaceService } from './marketplace.service'

@Controller()
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('marketplace/listings')
  listings(@Query() query: MarketplaceQuery) {
    return this.marketplaceService.listPublic(query)
  }

  @Post('marketplace/listings')
  @UseGuards(JwtAuthGuard)
  createListing(@Body() payload: CreateMarketplaceListingPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.createListing(payload, user)
  }

  @Delete('marketplace/listings/:id')
  @UseGuards(JwtAuthGuard)
  cancelListing(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.cancelListing(id, user)
  }

  @Post('marketplace/orders')
  @UseGuards(JwtAuthGuard)
  createOrder(@Body() payload: CreateMarketplaceOrderPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.createOrder(payload, user)
  }

  @Get('account/marketplace/listings')
  @UseGuards(JwtAuthGuard)
  myListings(@CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.listMyListings(user)
  }

  @Get('account/marketplace/orders')
  @UseGuards(JwtAuthGuard)
  myOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.listMyOrders(user)
  }

  @Get('admin/marketplace/listings')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  adminListings(@Query() query: MarketplaceQuery) {
    return this.marketplaceService.listListings(query)
  }

  @Patch('admin/marketplace/listings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  updateListingStatus(@Param('id') id: string, @Body() payload: UpdateMarketplaceListingStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateListingStatus(id, payload, user)
  }

  @Post('admin/marketplace/listings/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  activateListing(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.activateListing(id, user)
  }

  @Patch('admin/marketplace/orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminMarketplaceManage)
  updateOrderStatus(@Param('id') id: string, @Body() payload: UpdateMarketplaceOrderStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateOrderStatus(id, payload, user)
  }

  @Get('admin/game-bridge/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  bridgeJobs(@Query() query: { status?: GameBridgeStatus, operation?: string }) {
    return this.marketplaceService.listBridgeJobs(query)
  }

  @Patch('admin/game-bridge/jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  updateBridgeJob(@Param('id') id: string, @Body() payload: UpdateGameBridgeJobPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceService.updateBridgeJob(id, payload, user)
  }
}
