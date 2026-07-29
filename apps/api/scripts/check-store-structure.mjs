import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const schema = read('prisma/schema.prisma')
const service = read('src/modules/commerce/store-admin.service.ts')
const commerce = read('src/modules/commerce/commerce.service.ts')
const controller = read('src/modules/commerce/commerce.controller.ts')
const permissions = read('src/modules/auth/permissions.ts')
const failures = []

for (const model of ['StoreCategory', 'ShopProduct', 'ShopProductVariant', 'PurchaseIntent', 'StoreDelivery', 'StoreOrderNote', 'StoreProductTest']) {
  if (!schema.includes(`model ${model}`)) failures.push(`${model} model is missing`)
}
for (const enumName of ['ShopProductStatus', 'PurchaseIntentStatus', 'StoreDeliveryStatus', 'StoreDeliveryTarget']) {
  if (!schema.includes(`enum ${enumName}`)) failures.push(`${enumName} enum is missing`)
}
for (const permission of ['adminStoreCategories', 'adminStoreProducts', 'adminStoreReview', 'adminStorePublish', 'adminStoreOrders', 'adminStoreRefund', 'adminStoreDeliveries', 'adminStoreTest']) {
  if (!permissions.includes(permission)) failures.push(`${permission} permission is missing`)
}
for (const feature of ['publishDueProducts', 'importCatalog', 'transitionProduct', 'bulkTransitionProducts', 'exportProducts', 'orderAction', 'deliveryAction', 'testProduct', "user.role === 'SUPER_ADMIN'"]) {
  if (!service.includes(feature)) failures.push(`Store admin service is missing ${feature}`)
}
for (const invariant of ["isolationLevel: 'Serializable'", 'increment: order.quantity', 'decrement: quantity', 'STORE_DELIVERY_FAILED']) {
  if (!commerce.includes(invariant) && !service.includes(invariant)) failures.push(`Store transaction invariant is missing ${invariant}`)
}
for (const route of ["@Get('shop/products')", "@Post('shop/purchases')", "@Get('admin/store/dashboard')", "@Get('admin/store/products-export')", "@Post('admin/store/products-bulk')", "@Post('admin/store/catalog/import')", "@Post('admin/store/orders/:id/action')", "@Post('admin/store/deliveries/:id/action')"]) {
  if (!controller.includes(route)) failures.push(`Store controller is missing ${route}`)
}
if (!service.includes('Realize o estorno pelo pedido')) {
  failures.push('Direct delivery refunds must remain blocked')
}

if (failures.length) {
  console.error(`Store structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}
console.log('Store structure OK')
