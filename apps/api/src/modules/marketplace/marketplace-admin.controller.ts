import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  MarketplaceAdminActionPayload,
  MarketplaceAdminQuery,
  MarketplaceBulkActionPayload,
  MarketplaceEconomyPayload,
  MarketplaceEscrowActionPayload,
  MarketplaceReportUpdatePayload,
  MarketplaceTaskPayload
} from './marketplace.contract'
import { MarketplaceAdminService } from './marketplace-admin.service'

@Controller('admin/marketplace')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class MarketplaceAdminController {
  constructor(private readonly admin: MarketplaceAdminService) {}

  @Get('dashboard')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.dashboard(user)
  }

  @Get('manage/listings')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  listings(@Query() query: MarketplaceAdminQuery) {
    return this.admin.listings(query)
  }

  @Post('listings/:id/actions')
  @RequirePermissions(permissionKeys.adminMarketplaceListingsModerate)
  listingAction(
    @Param('id') id: string,
    @Body() payload: MarketplaceAdminActionPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.listingAction(id, payload, user)
  }

  @Post('listings/bulk-actions')
  @RequirePermissions(permissionKeys.adminMarketplaceListingsModerate)
  listingBulkAction(
    @Body() payload: MarketplaceBulkActionPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.listingBulkAction(payload, user)
  }

  @Get('listings/export')
  @RequirePermissions(permissionKeys.adminMarketplaceReportsView)
  exportListings(@Query() query: MarketplaceAdminQuery) {
    return this.admin.exportListings(query)
  }

  @Get('transactions')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  transactions(@Query() query: MarketplaceAdminQuery) {
    return this.admin.orders(query)
  }

  @Post('transactions/:id/actions')
  @RequirePermissions(permissionKeys.adminMarketplaceTransactionsOperate)
  transactionAction(
    @Param('id') id: string,
    @Body() payload: MarketplaceAdminActionPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.orderAction(id, payload, user)
  }

  @Get('escrow')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  escrow(@Query() query: MarketplaceAdminQuery) {
    return this.admin.escrow(query)
  }

  @Post('escrow/:id/actions')
  @RequirePermissions(permissionKeys.adminMarketplaceEscrowOperate)
  escrowAction(
    @Param('id') id: string,
    @Body() payload: MarketplaceEscrowActionPayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.escrowAction(id, payload, user)
  }

  @Get('reports')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  reports(@Query() query: MarketplaceAdminQuery) {
    return this.admin.reports(query)
  }

  @Patch('reports/:id')
  @RequirePermissions(permissionKeys.adminMarketplaceReportsModerate)
  updateReport(
    @Param('id') id: string,
    @Body() payload: MarketplaceReportUpdatePayload,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.updateReport(id, payload, user)
  }

  @Post('reports/:id/suspend-user')
  @RequirePermissions(permissionKeys.adminMarketplaceUsersSuspend)
  suspendReportedUser(
    @Param('id') id: string,
    @Body() payload: { reason: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.suspendReportedUser(id, payload.reason, user)
  }

  @Get('tasks')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  tasks(@Query() query: MarketplaceAdminQuery) {
    return this.admin.tasks(query)
  }

  @Post('tasks')
  @RequirePermissions(permissionKeys.adminMarketplaceTasksManage)
  createTask(@Body() payload: MarketplaceTaskPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.createTask(payload, user)
  }

  @Patch('tasks/:id')
  @RequirePermissions(permissionKeys.adminMarketplaceTasksManage)
  updateTask(
    @Param('id') id: string,
    @Body() payload: Partial<MarketplaceTaskPayload>,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.admin.updateTask(id, payload, user)
  }

  @Get('economy')
  @RequirePermissions(permissionKeys.adminMarketplaceView)
  economy() {
    return this.admin.economy()
  }

  @Patch('economy')
  @Roles('SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminMarketplaceEconomyManage)
  updateEconomy(@Body() payload: MarketplaceEconomyPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.updateEconomy(payload, user)
  }

  @Get('analytics')
  @RequirePermissions(permissionKeys.adminMarketplaceReportsView)
  analytics(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.analytics(user)
  }
}
