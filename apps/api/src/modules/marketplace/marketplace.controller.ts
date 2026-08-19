import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
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
  MarketplaceReportPayload
} from './marketplace.contract'
import { MarketplaceService } from './marketplace.service'
import { MarketplaceAdminService } from './marketplace-admin.service'

@Controller()
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly marketplaceAdmin: MarketplaceAdminService
  ) {}

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

  @Post('marketplace/reports')
  @UseGuards(JwtAuthGuard)
  createReport(@Body() payload: MarketplaceReportPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.marketplaceAdmin.createReport(payload, user)
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

  // Read-only: lists GameBridgeJob rows for observability. Never mutates
  // state, so unlike the raw status-setters (moved to
  // marketplace-bridge-dev.controller.ts, dev/staging-only) this stays
  // registered everywhere.
  @Get('admin/game-bridge/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminGameBridgeManage)
  bridgeJobs(@Query() query: { status?: GameBridgeStatus, operation?: string }) {
    return this.marketplaceService.listBridgeJobs(query)
  }
}
