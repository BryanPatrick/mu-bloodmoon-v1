import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { permissionKeys } from '../auth/permissions'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { PurchaseVipPayload, UpsertVipBenefitConfigPayload, UpsertVipProductConfigPayload } from './vip.contract'
import { VipService } from './vip.service'

@Controller()
export class VipController {
  constructor(private readonly vip: VipService) {}

  @Get('vip/catalog')
  catalog() {
    return this.vip.listCatalog()
  }

  // PHASE Q (2026-08-31), Part 3 -- public, approved-only benefit list
  // for the player purchase page (see listPublicBenefits()'s own comment
  // for why xp/drop/chaos/reset never appear here at all).
  @Get('vip/benefits')
  publicBenefits() {
    return this.vip.listPublicBenefits()
  }

  @Get('account/vip')
  @UseGuards(JwtAuthGuard)
  myEntitlement(@CurrentUser() user: AuthenticatedUser) {
    return this.vip.getMyEntitlement(user)
  }

  // PHASE Q (2026-08-31), Part 15 -- player's own VIP purchase history.
  @Get('account/vip/history')
  @UseGuards(JwtAuthGuard)
  myVipHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.vip.listMyVipHistory(user)
  }

  @Post('account/vip/purchase')
  @UseGuards(JwtAuthGuard)
  purchase(@Body() payload: PurchaseVipPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.vip.purchase(user, payload)
  }

  @Get('admin/vip/products')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminVipManage)
  adminListProducts() {
    return this.vip.listAllProducts()
  }

  @Post('admin/vip/products')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminVipManage)
  adminUpsertProduct(@Body() payload: UpsertVipProductConfigPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.vip.upsertProduct(payload, user)
  }

  @Get('admin/vip/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminVipManage)
  adminListBenefits() {
    return this.vip.listBenefitConfigs()
  }

  @Post('admin/vip/benefits')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminVipManage)
  adminUpsertBenefit(@Body() payload: UpsertVipBenefitConfigPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.vip.upsertBenefitConfig(payload, user)
  }
}
