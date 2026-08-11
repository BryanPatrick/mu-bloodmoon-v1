import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const readWebFile = (path) =>
  readFile(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8')

test('keeps one public commercial entry with two separate engines', async () => {
  const marketplace = await readWebFile('pages/marketplace.vue')
  assert.match(marketplace, /useMarketplaceApi\(\)/)
  assert.match(marketplace, /useStoreApi\(\)/)
  assert.match(marketplace, /marketMode === 'players'/)
  assert.match(marketplace, /marketMode === 'official'/)
  assert.match(marketplace, /Loja Oficial/)
})

test('keeps official product details and admin modules separate', async () => {
  const storeRedirect = await readWebFile('pages/loja/index.vue')
  const header = await readWebFile('components/layout/SiteHeader.vue')
  const management = await readWebFile('components/layout/ManagementShell.vue')
  assert.match(storeRedirect, /\/marketplace\?mercado=oficial/)
  assert.equal((header.match(/to: '\/marketplace'/g) || []).length, 1)
  assert.doesNotMatch(header, /label: 'Loja', to: '\/loja'/)
  assert.match(management, /\/painel\/admin\/loja/)
  assert.match(management, /\/painel\/admin\/marketplace/)
})

test('uses only API-provided marketplace category facets', async () => {
  const filters = await readWebFile('components/marketplace/MarketplaceFilters.vue')
  assert.match(filters, /v-for="option in categories"/)
  assert.doesNotMatch(filters, /const shortcuts/)
})

test('keeps market filters isolated and restores mode from browser history', async () => {
  const marketplace = await readWebFile('pages/marketplace.vue')
  assert.match(marketplace, /playerCategory/)
  assert.match(marketplace, /officialCategory/)
  assert.match(marketplace, /skipNextRouteWrite/)
  assert.match(marketplace, /route\.query\.mercado/)
  assert.match(marketplace, /router\.push/)
  assert.match(marketplace, /@applied="closeMobileFilters"/)
})
