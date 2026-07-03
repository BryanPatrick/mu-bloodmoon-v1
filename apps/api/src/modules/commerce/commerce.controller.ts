import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CommerceQuery,
  CreatePurchaseIntentPayload,
  CreateRechargeIntentPayload,
  RechargePackagePayload,
  ShopProductPayload,
  UpdatePurchaseStatusPayload,
  UpdateRechargeStatusPayload
} from './commerce.contract'
import { CommerceService } from './commerce.service'

@Controller()
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('shop/products')
  publicProducts(@Query() query: CommerceQuery) {
    return this.commerceService.listProducts(query, true)
  }

  @Post('shop/purchases')
  @UseGuards(JwtAuthGuard)
  createPurchase(@Body() payload: CreatePurchaseIntentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createPurchaseIntent(payload, user)
  }

  @Get('recharge/packages')
  publicRechargePackages(@Query() query: CommerceQuery) {
    return this.commerceService.listRechargePackages(query, true)
  }

  @Post('recharge/intents')
  @UseGuards(JwtAuthGuard)
  createRecharge(@Body() payload: CreateRechargeIntentPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createRechargeIntent(payload, user)
  }

  @Get('account/purchases')
  @UseGuards(JwtAuthGuard)
  accountPurchases(@CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.listPurchasesForAccount(user.id)
  }

  @Get('account/recharges')
  @UseGuards(JwtAuthGuard)
  accountRecharges(@CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.listRechargesForAccount(user.id)
  }

  @Get('admin/shop/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminProducts(@Query() query: CommerceQuery) {
    return this.commerceService.listProducts(query)
  }

  @Post('admin/shop/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createProduct(@Body() payload: ShopProductPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createProduct(payload, user)
  }

  @Patch('admin/shop/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateProduct(@Param('id') id: string, @Body() payload: Partial<ShopProductPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updateProduct(id, payload, user)
  }

  @Delete('admin/shop/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.archiveProduct(id, user)
  }

  @Get('admin/recharge/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminRechargePackages(@Query() query: CommerceQuery) {
    return this.commerceService.listRechargePackages(query)
  }

  @Post('admin/recharge/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createRechargePackage(@Body() payload: RechargePackagePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createRechargePackage(payload, user)
  }

  @Patch('admin/recharge/packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateRechargePackage(@Param('id') id: string, @Body() payload: Partial<RechargePackagePayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updateRechargePackage(id, payload, user)
  }

  @Delete('admin/recharge/packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteRechargePackage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.disableRechargePackage(id, user)
  }

  @Get('admin/finance/purchases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminPurchases() {
    return this.commerceService.listPurchases()
  }

  @Get('admin/finance/recharges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminRecharges() {
    return this.commerceService.listRecharges()
  }

  @Patch('admin/finance/purchases/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updatePurchaseStatus(@Param('id') id: string, @Body() payload: UpdatePurchaseStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updatePurchaseStatus(id, payload, user)
  }

  @Patch('admin/finance/recharges/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateRechargeStatus(@Param('id') id: string, @Body() payload: UpdateRechargeStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updateRechargeStatus(id, payload, user)
  }
}
