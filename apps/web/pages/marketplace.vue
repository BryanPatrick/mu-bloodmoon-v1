<template>
  <main class="market-page min-h-screen">
    <section class="market-hero">
      <img
        src="/images/guide-dark-lord-hero.png"
        alt="Mercado Blood Moon"
        class="market-hero-image"
      />
      <div class="market-hero-overlay" />
      <div class="bm-container market-hero-content">
        <p><Diamond class="size-2.5" /> {{ heroEyebrow }}</p>
        <h1>Mercado <span>Blood Moon</span></h1>
        <small>{{ heroDescription }}</small>
        <label class="market-search"
          ><Search class="size-4" /><input
            v-model="query"
            type="search"
            :placeholder="searchPlaceholder"
        /></label>
        <div class="market-hero-tabs" role="group" aria-label="Escolha o mercado">
          <button
            :class="{ 'is-active': marketMode === 'players' }"
            type="button"
            @click="marketMode = 'players'"
          >
            <UsersRound class="size-3.5" /> Jogadores
          </button>
          <button
            :class="{ 'is-active': marketMode === 'official' }"
            type="button"
            @click="marketMode = 'official'"
          >
            <ShieldCheck class="size-3.5" /> Loja WCoin
          </button>
        </div>
      </div>
    </section>

    <section class="bm-container market-catalog">
      <div class="market-catalog-head">
        <p>
          <strong>{{ activeTotal }}</strong>
          {{ activeTotal === 1 ? 'resultado encontrado' : 'resultados encontrados' }} em
          <b>{{ activeSourceLabel }}</b>
        </p>
        <div>
          <label
            >Ordenar por
            <select v-model="activeSort">
              <option v-for="option in activeSortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select></label
          ><button
            :class="{ 'is-active': view === 'grid' }"
            type="button"
            aria-label="Exibir em grade"
            @click="view = 'grid'"
          >
            <LayoutGrid class="size-4" /></button
          ><button
            :class="{ 'is-active': view === 'list' }"
            type="button"
            aria-label="Exibir em lista"
            @click="view = 'list'"
          >
            <List class="size-4" /></button
          ><button
            class="mobile-filter-button"
            type="button"
            aria-label="Abrir filtros"
            @click="filtersOpen = true"
          >
            <SlidersHorizontal class="size-4" />
          </button>
        </div>
      </div>
      <p
        v-if="message"
        class="mt-4 rounded-md border px-4 py-3 text-xs font-bold"
        :class="messageClass"
      >
        {{ message }}
      </p>

      <div class="market-layout">
        <aside class="hidden lg:grid lg:gap-3">
          <CommercialMarketSwitch v-model="marketMode" />
          <MarketplaceFilters
            v-if="marketMode === 'players'"
            v-model:search="query"
            v-model:category="playerCategory"
            v-model:currency="playerCurrency"
            v-model:sort="playerSort"
            v-model:view="view"
            :categories="playerCategories"
            @clear="clearActiveFilters"
            @applied="closeMobileFilters"
          />
          <OfficialStoreFilters
            v-else
            v-model:category="officialCategory"
            v-model:currency="officialCurrency"
            v-model:sort="officialSort"
            :search="query"
            :categories="officialCategories"
            @clear="clearActiveFilters"
            @applied="closeMobileFilters"
          />
        </aside>

        <div class="min-w-0">
          <div v-if="isLoading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <div
              v-for="item in 10"
              :key="item"
              class="h-[270px] animate-pulse rounded-lg bg-black/5"
            />
          </div>

          <template v-else-if="marketMode === 'players'">
            <div v-if="playerListings.length" class="grid gap-3" :class="resultGridClass">
              <MarketplaceItemCard
                v-for="listing in playerListings"
                :key="listing.id"
                :listing="listing"
                :view="view"
                @inspect="inspect"
              />
            </div>
            <MarketEmptyState
              v-else
              source="Jogadores"
              description="Ajuste os filtros ou volte quando novos itens forem anunciados."
            />
          </template>

          <template v-else>
            <div v-if="visibleOfficialProducts.length" class="grid gap-3" :class="resultGridClass">
              <OfficialStoreProductCard
                v-for="product in visibleOfficialProducts"
                :key="product.id"
                :product="product"
                :view="view"
              />
            </div>
            <MarketEmptyState
              v-else
              source="Loja Oficial"
              description="Ajuste os filtros ou aguarde a publicação de novos produtos oficiais."
            />
          </template>

          <nav
            v-if="activeTotalPages > 1"
            class="mt-7 flex items-center justify-center gap-2"
            aria-label="Paginação"
          >
            <UButton color="neutral" variant="soft" :disabled="page <= 1" square @click="page--"
              ><ChevronLeft class="size-4" /></UButton
            ><button
              v-for="number in visiblePages"
              :key="number"
              class="market-page-button"
              :class="{ 'market-page-button-active': page === number }"
              type="button"
              @click="page = number"
            >
              {{ number }}</button
            ><UButton
              color="neutral"
              variant="soft"
              :disabled="page >= activeTotalPages"
              square
              @click="page++"
              ><ChevronRight class="size-4"
            /></UButton>
          </nav>
        </div>
      </div>
    </section>

    <Transition name="fade"
      ><button
        v-if="filtersOpen"
        class="fixed inset-0 z-[70] bg-black/45 lg:hidden"
        type="button"
        aria-label="Fechar filtros"
        @click="filtersOpen = false"
    /></Transition>
    <Transition name="drawer"
      ><aside
        v-if="filtersOpen"
        class="fixed inset-y-0 right-0 z-[80] w-[min(90vw,380px)] overflow-y-auto bg-[#f3f0ea] p-4 lg:hidden"
      >
        <div class="mb-4 flex items-center justify-between">
          <strong class="font-display text-xl">Mercado e filtros</strong
          ><button
            class="bm-icon-button"
            type="button"
            aria-label="Fechar filtros"
            @click="filtersOpen = false"
          >
            <X class="size-4" />
          </button>
        </div>
        <div class="grid gap-3">
          <CommercialMarketSwitch v-model="marketMode" /><MarketplaceFilters
            v-if="marketMode === 'players'"
            v-model:search="query"
            v-model:category="playerCategory"
            v-model:currency="playerCurrency"
            v-model:sort="playerSort"
            v-model:view="view"
            :categories="playerCategories"
            @clear="clearActiveFilters"
            @applied="closeMobileFilters"
          /><OfficialStoreFilters
            v-else
            v-model:category="officialCategory"
            v-model:currency="officialCurrency"
            v-model:sort="officialSort"
            :search="query"
            :categories="officialCategories"
            @clear="clearActiveFilters"
            @applied="closeMobileFilters"
          />
        </div></aside
    ></Transition>
    <MarketplaceItemDetails
      v-model:open="detailsOpen"
      :listing="selectedListing"
      :buying="isBuying"
      @buy="buy"
      @report="reportListing"
    />
  </main>
</template>

<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Diamond,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X
} from 'lucide-vue-next'
import type { CommercialMarketMode } from '~/components/marketplace/CommercialMarketSwitch.vue'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'
import type { StoreCategory, StoreProduct } from '~/composables/useStoreApi'

useSeoMeta({
  title: 'Mercado Blood Moon',
  description: 'Mercado entre jogadores e Loja Oficial Blood Moon em uma única experiência.'
})

const route = useRoute()
const router = useRouter()
const marketplaceApi = useMarketplaceApi()
const storeApi = useStoreApi()
const { isLoggedIn, loadSession } = useAuth()
const marketMode = ref<CommercialMarketMode>(
  route.query.mercado === 'oficial' ? 'official' : 'players'
)
const query = ref('')
const playerCategory = ref('')
const playerCurrency = ref('')
const playerSort = ref('newest')
const officialCategory = ref('')
const officialCurrency = ref('')
const officialSort = ref('featured')
const view = ref<'grid' | 'list'>('list')
const page = ref(1)
const pageSize = 30
const playerTotal = ref(0)
const playerTotalPages = ref(1)
const playerCategories = ref<Array<{ value: string; count: number }>>([])
const playerListings = ref<MarketplaceListing[]>([])
const officialProducts = ref<StoreProduct[]>([])
const officialCategories = ref<StoreCategory[]>([])
const officialLoaded = ref(false)
const selectedListing = ref<MarketplaceListing | null>(null)
const detailsOpen = ref(false)
const message = ref('')
const isSuccess = ref(true)
const isLoading = ref(false)
const isBuying = ref(false)
const filtersOpen = ref(false)
let loadTimer: ReturnType<typeof setTimeout> | undefined
let skipNextRouteWrite = false

const productPrice = (product: StoreProduct) =>
  [...(product.variants || [])]
    .filter((item) => item.available)
    .sort((a, b) => a.price - b.price)[0]?.price ?? product.price
const productCurrency = (product: StoreProduct) =>
  [...(product.variants || [])]
    .filter((item) => item.available)
    .sort((a, b) => a.price - b.price)[0]?.currency ?? product.currency
const filteredOfficialProducts = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('pt-BR')
  const filtered = officialProducts.value.filter((product) => {
    const haystack = [product.name, product.category, product.summary, product.description]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR')
    return (
      (!term || haystack.includes(term)) &&
      (!officialCategory.value || product.category === officialCategory.value) &&
      (!officialCurrency.value || productCurrency(product) === officialCurrency.value)
    )
  })
  return filtered.sort((a, b) =>
    officialSort.value === 'nameAsc'
      ? a.name.localeCompare(b.name, 'pt-BR')
      : officialSort.value === 'priceAsc'
        ? productPrice(a) - productPrice(b)
        : officialSort.value === 'priceDesc'
          ? productPrice(b) - productPrice(a)
          : Number(b.featured) - Number(a.featured)
  )
})
const officialTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredOfficialProducts.value.length / pageSize))
)
const visibleOfficialProducts = computed(() =>
  filteredOfficialProducts.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)
const activeTotal = computed(() =>
  marketMode.value === 'players' ? playerTotal.value : filteredOfficialProducts.value.length
)
const activeTotalPages = computed(() =>
  marketMode.value === 'players' ? playerTotalPages.value : officialTotalPages.value
)
const activeSourceLabel = computed(() =>
  marketMode.value === 'players' ? 'Jogadores' : 'Loja Oficial'
)
const heroEyebrow = computed(() =>
  marketMode.value === 'players' ? 'Comércio entre jogadores' : 'Catálogo oficial do servidor'
)
const heroDescription = computed(() =>
  marketMode.value === 'players'
    ? 'Encontre equipamentos, compare ofertas e negocie com proteção do servidor.'
    : 'Compre produtos oficiais publicados pelo Blood Moon com entrega rastreável.'
)
const searchPlaceholder = computed(() =>
  marketMode.value === 'players'
    ? 'Pesquisar item, categoria ou vendedor...'
    : 'Pesquisar produto ou categoria na Loja Oficial...'
)
const activeSort = computed({
  get: () => (marketMode.value === 'players' ? playerSort.value : officialSort.value),
  set: (value) =>
    marketMode.value === 'players' ? (playerSort.value = value) : (officialSort.value = value)
})
const activeSortOptions = computed(() =>
  marketMode.value === 'players'
    ? [
        { value: 'newest', label: 'Mais recentes' },
        { value: 'oldest', label: 'Mais antigos' },
        { value: 'priceAsc', label: 'Menor preço' },
        { value: 'priceDesc', label: 'Maior preço' }
      ]
    : [
        { value: 'featured', label: 'Destaques primeiro' },
        { value: 'nameAsc', label: 'Nome (A-Z)' },
        { value: 'priceAsc', label: 'Menor preço' },
        { value: 'priceDesc', label: 'Maior preço' }
      ]
)
const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-700/25 bg-emerald-100 text-emerald-900'
    : 'border-red-700/25 bg-red-100 text-red-900'
)
const visiblePages = computed(() => {
  const start = Math.max(1, Math.min(page.value - 2, activeTotalPages.value - 4))
  const end = Math.min(activeTotalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
const resultGridClass = computed(() =>
  view.value === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5' : 'grid-cols-1'
)

const loadPlayerListings = async () => {
  isLoading.value = true
  try {
    const response = await marketplaceApi.listListings({
      search: query.value || undefined,
      category: playerCategory.value || undefined,
      currency: playerCurrency.value || undefined,
      sort: playerSort.value,
      page: page.value,
      pageSize
    })
    playerListings.value = response.data
    playerTotal.value = response.total
    playerTotalPages.value = response.totalPages
    playerCategories.value = response.facets?.categories || []
  } catch (error) {
    playerListings.value = []
    playerTotal.value = 0
    isSuccess.value = false
    message.value =
      error instanceof Error ? error.message : 'Não foi possível carregar o mercado de jogadores.'
  } finally {
    isLoading.value = false
  }
}

const loadOfficialProducts = async () => {
  if (officialLoaded.value) return
  isLoading.value = true
  try {
    const [firstPage, categories] = await Promise.all([
      storeApi.publicProducts({ page: 1, pageSize: 100 }),
      storeApi.publicCategories()
    ])
    const remaining =
      firstPage.totalPages > 1
        ? await Promise.all(
            Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
              storeApi.publicProducts({ page: index + 2, pageSize: 100 })
            )
          )
        : []
    officialProducts.value = [firstPage, ...remaining].flatMap((result) => result.data)
    officialCategories.value = categories.filter(
      (item) => item.active && !item.archivedAt && !item.deletedAt
    )
    officialLoaded.value = true
  } catch (error) {
    officialProducts.value = []
    isSuccess.value = false
    message.value =
      error instanceof Error ? error.message : 'Não foi possível carregar a Loja Oficial.'
  } finally {
    isLoading.value = false
  }
}

const schedulePlayerLoad = () => {
  clearTimeout(loadTimer)
  loadTimer = setTimeout(loadPlayerListings, 260)
}
const clearActiveFilters = () => {
  query.value = ''
  page.value = 1
  if (marketMode.value === 'players') {
    playerCategory.value = ''
    playerCurrency.value = ''
    playerSort.value = 'newest'
  } else {
    officialCategory.value = ''
    officialCurrency.value = ''
    officialSort.value = 'featured'
  }
}
const closeMobileFilters = () => {
  filtersOpen.value = false
}
const inspect = (listing: MarketplaceListing) => {
  selectedListing.value = listing
  detailsOpen.value = true
}
const buy = async (listing: MarketplaceListing) => {
  loadSession()
  if (!isLoggedIn.value) return navigateTo(`/login?redirect=${encodeURIComponent('/marketplace')}`)
  isBuying.value = true
  try {
    await marketplaceApi.createOrder(listing.id)
    isSuccess.value = true
    message.value = `Compra de ${listing.itemName} enviada para entrega protegida.`
    detailsOpen.value = false
    await loadPlayerListings()
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Não foi possível comprar este item.'
  } finally {
    isBuying.value = false
  }
}
const reportListing = async (listing: MarketplaceListing) => {
  loadSession()
  if (!isLoggedIn.value) return navigateTo(`/login?redirect=${encodeURIComponent('/marketplace')}`)
  const reason = import.meta.client ? window.prompt('Motivo da denúncia:')?.trim() : ''
  if (!reason) return
  const description = import.meta.client
    ? window.prompt('Descreva o problema encontrado:')?.trim()
    : ''
  if (!description) return
  try {
    await marketplaceApi.createReport({ listingId: listing.id, reason, description })
    isSuccess.value = true
    message.value = 'Denúncia enviada para a equipe de moderação.'
    detailsOpen.value = false
  } catch {
    isSuccess.value = false
    message.value = 'Não foi possível enviar a denúncia.'
  }
}

watch(
  () => route.query.mercado,
  (value) => {
    const routeMode: CommercialMarketMode = value === 'oficial' ? 'official' : 'players'
    if (routeMode === marketMode.value) return
    skipNextRouteWrite = true
    marketMode.value = routeMode
  }
)
watch(marketMode, async (value) => {
  page.value = 1
  query.value = ''
  message.value = ''
  filtersOpen.value = false
  if (skipNextRouteWrite) skipNextRouteWrite = false
  else {
    await router.push({
      path: '/marketplace',
      query: value === 'official' ? { mercado: 'oficial' } : {}
    })
  }
  if (value === 'official') await loadOfficialProducts()
  else await loadPlayerListings()
})
watch([query, playerCategory, playerCurrency, playerSort], () => {
  if (marketMode.value !== 'players') return
  page.value = 1
  schedulePlayerLoad()
})
watch([query, officialCategory, officialCurrency, officialSort], () => {
  if (marketMode.value === 'official') page.value = 1
})
watch(page, () => {
  if (marketMode.value === 'players') loadPlayerListings()
})
watch(view, (value) => import.meta.client && localStorage.setItem('blood-moon-market-view', value))

onMounted(async () => {
  const savedView = localStorage.getItem('blood-moon-market-view')
  if (savedView === 'grid' || savedView === 'list') view.value = savedView
  if (marketMode.value === 'official') await loadOfficialProducts()
  else await loadPlayerListings()
})
onBeforeUnmount(() => clearTimeout(loadTimer))
</script>

<style scoped>
.market-page {
  background: #f3f0ea;
  color: #211a17;
}
.market-hero {
  position: relative;
  min-height: 330px;
  overflow: hidden;
  border-bottom: 1px solid #d5ccc4;
}
.market-hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right 32%;
  filter: grayscale(0.4) sepia(0.35);
  opacity: 0.22;
}
.market-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #f3f0ea 0%,
    rgba(243, 240, 234, 0.93) 56%,
    rgba(243, 240, 234, 0.6) 100%
  );
}
.market-hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 330px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-block: 42px;
  text-align: center;
}
.market-hero-content > p {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #73090b;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.market-hero-content h1 {
  margin-top: 8px;
  font-size: 38px;
  font-weight: 500;
  text-transform: uppercase;
}
.market-hero-content h1 span {
  color: #73090b;
}
.market-hero-content small {
  margin-top: 7px;
  color: #685f59;
  font-size: 11px;
}
.market-search {
  display: flex;
  width: min(100%, 650px);
  height: 44px;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  border: 1px solid #d2c8bf;
  background: rgba(255, 255, 255, 0.78);
  padding: 0 15px;
  color: #80736d;
  box-shadow: 0 4px 12px rgba(50, 30, 25, 0.06);
}
.market-search input {
  min-width: 0;
  flex: 1;
  background: transparent;
  font-size: 11px;
}
.market-hero-tabs {
  display: grid;
  width: min(100%, 440px);
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}
.market-hero-tabs > * {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #d0c5bc;
  color: #5c504b;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}
.market-hero-tabs .is-active {
  border-color: #73090b;
  background: #73090b;
  color: #fff;
}
.market-catalog {
  padding-block: 34px 70px;
}
.market-catalog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-left: 270px;
  margin-bottom: 12px;
}
.market-catalog-head > p {
  font-size: 10px;
}
.market-catalog-head > p b {
  color: #73090b;
}
.market-catalog-head > div {
  display: flex;
  align-items: center;
  gap: 6px;
}
.market-catalog-head label {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-right: 6px;
  font-size: 9px;
}
.market-catalog-head select {
  height: 34px;
  border: 1px solid #d0c5bc;
  background: #fff;
  padding: 0 28px 0 10px;
  font-size: 9px;
}
.market-catalog-head button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #d0c5bc;
  background: #fff;
  color: #6a5e58;
}
.market-catalog-head button.is-active {
  border-color: #73090b;
  background: #73090b;
  color: #fff;
}
.mobile-filter-button {
  display: none !important;
}
.market-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}
.market-page-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #cfc5bc;
  background: #fff;
  color: #6b5e58;
  font-size: 11px;
  font-weight: 900;
}
.market-page-button-active {
  border-color: #73090b;
  background: #73090b;
  color: #fff;
}
@media (max-width: 1023px) {
  .market-catalog-head {
    margin-left: 0;
  }
  .mobile-filter-button {
    display: grid !important;
  }
  .market-layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .market-hero {
    min-height: 300px;
  }
  .market-hero-content {
    min-height: 300px;
  }
  .market-hero-content h1 {
    font-size: 28px;
  }
  .market-catalog-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .market-catalog-head > div {
    width: 100%;
    justify-content: flex-end;
  }
  .market-catalog-head label {
    margin-right: auto;
    font-size: 0;
  }
  .market-hero-tabs {
    gap: 7px;
  }
}
</style>
