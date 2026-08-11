import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../auth/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RequirePermissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { permissionKeys } from '../auth/permissions'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import type {
  CommerceQuery,
  CreatePurchaseIntentPayload,
  CreateRechargeIntentPayload,
  RechargePackagePayload,
  ShopProductPayload,
  ShopProductVariantPayload,
  StoreCatalogImportPayload,
  StoreBulkProductPayload,
  StoreCategoryPayload,
  StoreDeliveryActionPayload,
  StoreOrderActionPayload,
  StoreOrderNotePayload,
  StoreProductTestPayload,
  StoreProductTransitionPayload,
  StoreReorderPayload,
  UpdatePurchaseStatusPayload,
  UpdateRechargeStatusPayload
} from './commerce.contract'
import { CommerceService } from './commerce.service'
import { StoreAdminService } from './store-admin.service'

@Controller()
export class CommerceController {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly storeAdminService: StoreAdminService
  ) {}

  @Get('shop/products')
  publicProducts(@Query() query: CommerceQuery) {
    return this.commerceService.listProducts(query, true)
  }

  @Get('shop/categories')
  publicCategories(@Query() query: CommerceQuery) {
    return this.storeAdminService.listCategories(query, true)
  }

  @Get('shop/products/:slug')
  publicProduct(@Param('slug') slug: string) {
    return this.storeAdminService.publicProduct(slug)
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

  @Post('recharge/intents/:id/checkout')
  @UseGuards(JwtAuthGuard)
  createRechargeCheckout(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createRechargeCheckout(id, user)
  }

  @Get('recharge/intents/:id')
  @UseGuards(JwtAuthGuard)
  rechargeIntent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.getRechargeForAccount(id, user)
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
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  adminProducts(@Query() query: CommerceQuery) {
    return this.storeAdminService.listProducts(query)
  }

  @Post('admin/shop/products')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  createProduct(@Body() payload: ShopProductPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.createProduct(payload, user)
  }

  @Patch('admin/shop/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  updateProduct(@Param('id') id: string, @Body() payload: Partial<ShopProductPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.updateProduct(id, payload, user)
  }

  @Delete('admin/shop/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  deleteProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.transitionProduct(id, { action: 'delete' }, user)
  }

  @Get('admin/store/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  storeDashboard(@Query() query: CommerceQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.dashboard(user, query)
  }

  @Get('admin/store/categories')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  storeCategories(@Query() query: CommerceQuery) {
    return this.storeAdminService.listCategories(query)
  }

  @Post('admin/store/categories')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreCategories)
  createStoreCategory(@Body() payload: StoreCategoryPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.createCategory(payload, user)
  }

  @Patch('admin/store/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreCategories)
  updateStoreCategory(@Param('id') id: string, @Body() payload: Partial<StoreCategoryPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.updateCategory(id, payload, user)
  }

  @Post('admin/store/categories/:id/:action')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreCategories)
  storeCategoryAction(
    @Param('id') id: string,
    @Param('action') action: 'archive' | 'restore' | 'delete',
    @Body() payload: { reason?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.storeAdminService.categoryAction(id, action, user, payload.reason)
  }

  @Get('admin/store/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  storeProduct(@Param('id') id: string) {
    return this.storeAdminService.productDetails(id)
  }

  @Get('admin/store/products-export')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  exportStoreProducts(@Query() query: CommerceQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.exportProducts(query, user)
  }

  @Post('admin/store/products-bulk')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  bulkStoreProducts(@Body() payload: StoreBulkProductPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.bulkTransitionProducts(payload, user)
  }

  @Get('admin/store/products/:id/history')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  storeProductHistory(@Param('id') id: string) {
    return this.storeAdminService.productHistory(id)
  }

  @Post('admin/store/products/:id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  duplicateStoreProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.duplicateProduct(id, user)
  }

  @Post('admin/store/products/:id/transition')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  transitionStoreProduct(@Param('id') id: string, @Body() payload: StoreProductTransitionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.transitionProduct(id, payload, user)
  }

  @Post('admin/store/products/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  reorderStoreProducts(@Body() payload: StoreReorderPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.reorderProducts(payload, user)
  }

  @Post('admin/store/products/:id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  createStoreVariant(@Param('id') id: string, @Body() payload: ShopProductVariantPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.createVariant(id, payload, user)
  }

  @Patch('admin/store/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  updateStoreVariant(@Param('id') id: string, @Body() payload: Partial<ShopProductVariantPayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.updateVariant(id, payload, user)
  }

  @Delete('admin/store/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  deleteStoreVariant(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.deleteVariant(id, user)
  }

  @Post('admin/store/catalog/import')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreProducts)
  importStoreCatalog(@Body() payload: StoreCatalogImportPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.importCatalog(payload, user)
  }

  @Get('admin/store/orders')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreOrders)
  storeOrders(@Query() query: CommerceQuery) {
    return this.storeAdminService.listOrders(query)
  }

  @Get('admin/store/orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreOrders)
  storeOrder(@Param('id') id: string) {
    return this.storeAdminService.orderDetails(id)
  }

  @Post('admin/store/orders/:id/action')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreOrders)
  storeOrderAction(@Param('id') id: string, @Body() payload: StoreOrderActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.orderAction(id, payload, user)
  }

  @Post('admin/store/orders/:id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreOrders)
  addStoreOrderNote(@Param('id') id: string, @Body() payload: StoreOrderNotePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.addOrderNote(id, payload, user)
  }

  @Get('admin/store/deliveries')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreDeliveries)
  storeDeliveries(@Query() query: CommerceQuery) {
    return this.storeAdminService.listDeliveries(query)
  }

  @Post('admin/store/deliveries/:id/action')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreDeliveries)
  storeDeliveryAction(@Param('id') id: string, @Body() payload: StoreDeliveryActionPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.deliveryAction(id, payload, user)
  }

  @Get('admin/store/reports')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreView)
  storeReports(@Query() query: CommerceQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.reports(query, user)
  }

  @Post('admin/store/tests')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminStoreTest)
  testStoreProduct(@Body() payload: StoreProductTestPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.storeAdminService.testProduct(payload, user)
  }

  @Get('admin/recharge/packages')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminShopManage)
  adminRechargePackages(@Query() query: CommerceQuery) {
    return this.commerceService.listRechargePackages(query)
  }

  @Post('admin/recharge/packages')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminShopManage)
  createRechargePackage(@Body() payload: RechargePackagePayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.createRechargePackage(payload, user)
  }

  @Patch('admin/recharge/packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminShopManage)
  updateRechargePackage(@Param('id') id: string, @Body() payload: Partial<RechargePackagePayload>, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updateRechargePackage(id, payload, user)
  }

  @Delete('admin/recharge/packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminShopManage)
  deleteRechargePackage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.disableRechargePackage(id, user)
  }

  @Get('admin/finance/purchases')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminFinancialReportsView)
  adminPurchases() {
    return this.commerceService.listPurchases()
  }

  @Get('admin/shop/orders')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminOrdersOperate)
  async operationalOrders() {
    const [purchases, recharges] = await Promise.all([
      this.commerceService.listPurchases(),
      this.commerceService.listRecharges()
    ])
    return { purchases, recharges }
  }

  @Get('admin/finance/recharges')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminFinancialReportsView)
  adminRecharges() {
    return this.commerceService.listRecharges()
  }

  @Patch('admin/finance/purchases/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminOrdersOperate)
  updatePurchaseStatus(@Param('id') id: string, @Body() payload: UpdatePurchaseStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updatePurchaseStatus(id, payload, user)
  }

  @Patch('admin/finance/recharges/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminOrdersOperate)
  updateRechargeStatus(@Param('id') id: string, @Body() payload: UpdateRechargeStatusPayload, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.updateRechargeStatus(id, payload, user)
  }

  @Get('admin/finance/recharges/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminFinancialReportsView)
  rechargeDetail(@Param('id') id: string) {
    return this.commerceService.getRechargeDetail(id)
  }

  @Post('admin/finance/recharges/:id/resync')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @RequirePermissions(permissionKeys.adminOrdersOperate)
  resyncRecharge(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.commerceService.resyncRechargeFromProvider(id, user)
  }
}
