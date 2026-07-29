import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (file) => readFileSync(join(root, file), 'utf8')
const schema = read('prisma/schema.prisma')
const service = read('src/modules/marketplace/marketplace.service.ts')
const adminService = read('src/modules/marketplace/marketplace-admin.service.ts')
const controller = read('src/modules/marketplace/marketplace-admin.controller.ts')
const permissions = read('src/modules/auth/permissions.ts')
const expirationWorker = read('scripts/process-marketplace-expirations.mjs')
const failures = []

for (const model of [
  'PlayerMarketListing',
  'PlayerMarketOrder',
  'MarketplaceEscrow',
  'MarketplaceReport',
  'MarketplaceTask',
  'MarketplaceEconomyConfig'
]) {
  if (!schema.includes(`model ${model}`)) failures.push(`${model} model is missing`)
}
for (const enumName of [
  'MarketplaceListingStatus',
  'MarketplaceEscrowStatus',
  'MarketplaceReportStatus',
  'MarketplaceTaskStatus'
]) {
  if (!schema.includes(`enum ${enumName}`)) failures.push(`${enumName} enum is missing`)
}
for (const permission of [
  'adminMarketplaceView',
  'adminMarketplaceListingsModerate',
  'adminMarketplaceEscrowOperate',
  'adminMarketplaceTransactionsOperate',
  'adminMarketplaceReportsModerate',
  'adminMarketplaceUsersSuspend',
  'adminMarketplaceEconomyManage',
  'adminMarketplaceTasksManage',
  'adminMarketplaceReportsView'
]) {
  if (!permissions.includes(permission)) failures.push(`${permission} permission is missing`)
}
for (const route of [
  "@Get('dashboard')",
  "@Get('manage/listings')",
  "@Post('listings/:id/actions')",
  "@Post('listings/bulk-actions')",
  "@Get('listings/export')",
  "@Get('transactions')",
  "@Get('escrow')",
  "@Post('escrow/:id/actions')",
  "@Get('reports')",
  "@Post('reports/:id/suspend-user')",
  "@Get('tasks')",
  "@Patch('economy')",
  "@Get('analytics')"
]) {
  if (!controller.includes(route)) failures.push(`Marketplace admin route is missing ${route}`)
}
for (const invariant of [
  "status: 'ESCROW_PENDING'",
  "status: 'RESERVED'",
  'playerMarketListing.updateMany',
  'marketplaceEconomyConfig.findUnique',
  'publicationFee',
  'sellerAmount',
  'MARKETPLACE_DELIVERY_FAILED',
  'MARKETPLACE_ITEM_RETURN_FAILED'
]) {
  if (!service.includes(invariant)) failures.push(`Marketplace invariant is missing ${invariant}`)
}
for (const feature of [
  'listingAction',
  'listingBulkAction',
  'exportListings',
  'orderAction',
  'escrowAction',
  'updateReport',
  'suspendReportedUser',
  'createTask',
  'updateEconomy',
  "user.role !== 'SUPER_ADMIN'"
]) {
  if (!adminService.includes(feature)) failures.push(`Marketplace admin service is missing ${feature}`)
}
if (!adminService.includes('Use a acao protegida de suspensao de usuario.')) {
  failures.push('Generic report moderation must not suspend users')
}
for (const invariant of ["status: 'EXPIRED'", 'market-expiration-return:', "status: 'RETURN_PENDING'"]) {
  if (!expirationWorker.includes(invariant)) failures.push(`Expiration worker is missing ${invariant}`)
}

if (failures.length) {
  console.error(`Marketplace structure check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}
console.log('Marketplace structure OK')
