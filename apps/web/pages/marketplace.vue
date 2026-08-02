<template>
  <main class="market-page min-h-screen">
    <section class="market-hero">
      <img src="/images/guide-dark-lord-hero.png" alt="Mercado Blood Moon" class="market-hero-image">
      <div class="market-hero-overlay" />
      <div class="bm-container market-hero-content">
        <p><Diamond class="size-2.5" /> Comércio entre jogadores</p>
        <h1>Mercado <span>Blood Moon</span></h1>
        <small>Encontre equipamentos, compare ofertas e negocie com proteção do servidor.</small>
        <label class="market-search"><Search class="size-4" /><input v-model="query" type="search" placeholder="Pesquisar item, categoria ou vendedor..."></label>
        <div class="market-hero-tabs"><button class="is-active" type="button"><Package class="size-3.5" /> Itens</button><NuxtLink to="/painel/marketplace"><ScrollText class="size-3.5" /> Meus anúncios</NuxtLink></div>
      </div>
    </section>

    <section class="bm-container market-catalog">
      <div class="market-catalog-head"><p><strong>{{ total }}</strong> {{ total === 1 ? 'resultado encontrado' : 'resultados encontrados' }}</p><div><label>Ordenar por <select v-model="sort"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="priceAsc">Menor preço</option><option value="priceDesc">Maior preço</option></select></label><button :class="{ 'is-active': view === 'grid' }" type="button" aria-label="Exibir em grade" @click="view='grid'"><LayoutGrid class="size-4" /></button><button :class="{ 'is-active': view === 'list' }" type="button" aria-label="Exibir em lista" @click="view='list'"><List class="size-4" /></button><button class="mobile-filter-button" type="button" @click="filtersOpen=true"><SlidersHorizontal class="size-4" /></button></div></div>
      <p v-if="message" class="mt-4 rounded-md border px-4 py-3 text-xs font-bold" :class="messageClass">{{ message }}</p>

      <div class="market-layout">
        <MarketplaceFilters v-model:search="query" v-model:category="category" v-model:currency="currency" v-model:sort="sort" v-model:view="view" class="hidden lg:block" :categories="categories" @clear="clearFilters" />
        <div class="min-w-0">
          <div v-if="isLoading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"><div v-for="item in 10" :key="item" class="h-[270px] animate-pulse rounded-lg bg-black/5" /></div>
          <div v-else-if="listings.length" class="grid gap-3" :class="view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5' : 'grid-cols-1'">
            <MarketplaceItemCard v-for="listing in listings" :key="listing.id" :listing="listing" :view="view" @inspect="inspect" />
          </div>
          <div v-else class="grid min-h-64 place-items-center rounded-lg border border-dashed border-black/15 bg-white/40 p-8 text-center"><div><PackageSearch class="mx-auto size-9 text-black/20" /><p class="bm-kicker mt-3">Marketplace</p><h2 class="mt-2 font-display text-xl font-bold">Nenhum item encontrado</h2><p class="bm-muted mt-2 text-sm">Ajuste os filtros ou volte quando novos itens forem anunciados.</p></div></div>
          <nav v-if="totalPages > 1" class="mt-7 flex items-center justify-center gap-2" aria-label="Paginacao"><UButton color="neutral" variant="soft" :disabled="page <= 1" square @click="page--"><ChevronLeft class="size-4" /></UButton><button v-for="number in visiblePages" :key="number" class="market-page-button" :class="{ 'market-page-button-active': page === number }" type="button" @click="page = number">{{ number }}</button><UButton color="neutral" variant="soft" :disabled="page >= totalPages" square @click="page++"><ChevronRight class="size-4" /></UButton></nav>
        </div>
      </div>
    </section>

    <Transition name="fade"><button v-if="filtersOpen" class="fixed inset-0 z-[70] bg-black/45 lg:hidden" type="button" aria-label="Fechar filtros" @click="filtersOpen = false" /></Transition>
    <Transition name="drawer"><div v-if="filtersOpen" class="fixed inset-y-0 right-0 z-[80] w-[min(90vw,380px)] overflow-y-auto bg-[#f5f2ec] p-4 lg:hidden"><div class="mb-4 flex items-center justify-between"><strong class="font-display text-xl">Filtros</strong><button class="bm-icon-button" type="button" @click="filtersOpen = false"><X class="size-4" /></button></div><MarketplaceFilters v-model:search="query" v-model:category="category" v-model:currency="currency" v-model:sort="sort" v-model:view="view" :categories="categories" @clear="clearFilters" /></div></Transition>
    <MarketplaceItemDetails v-model:open="detailsOpen" :listing="selectedListing" :buying="isBuying" @buy="buy" @report="reportListing" />
  </main>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Diamond, LayoutGrid, List, Package, PackageSearch, ScrollText, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

useSeoMeta({ title: 'Mercado Blood Moon' })

const marketplaceApi = useMarketplaceApi()
const { isLoggedIn, loadSession } = useAuth()
const query = ref('')
const category = ref('')
const currency = ref('')
const sort = ref('newest')
const view = ref<'grid' | 'list'>('list')
const page = ref(1)
const pageSize = 30
const total = ref(0)
const totalPages = ref(1)
const categories = ref<Array<{ value: string, count: number }>>([])
const listings = ref<MarketplaceListing[]>([])
const selectedListing = ref<MarketplaceListing | null>(null)
const detailsOpen = ref(false)
const message = ref('')
const isSuccess = ref(true)
const isLoading = ref(false)
const isBuying = ref(false)
const filtersOpen = ref(false)
let loadTimer: ReturnType<typeof setTimeout> | undefined

const hasFilters = computed(() => Boolean(query.value || category.value || currency.value || sort.value !== 'newest'))
const messageClass = computed(() => isSuccess.value ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-blood-400/25 bg-blood-700/10 text-blood-100')
const visiblePages = computed(() => {
  const start = Math.max(1, Math.min(page.value - 2, totalPages.value - 4))
  const end = Math.min(totalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const loadListings = async () => {
  isLoading.value = true
  try {
    const response = await marketplaceApi.listListings({
      search: query.value || undefined,
      category: category.value || undefined,
      currency: currency.value || undefined,
      sort: sort.value,
      page: page.value,
      pageSize
    })
    listings.value = response.data
    total.value = response.total
    totalPages.value = response.totalPages
    categories.value = response.facets?.categories || []
  } catch (error) {
    listings.value = []
    total.value = 0
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar o marketplace.'
  } finally {
    isLoading.value = false
  }
}

const scheduleLoad = () => {
  clearTimeout(loadTimer)
  loadTimer = setTimeout(loadListings, 260)
}

const clearFilters = () => {
  query.value = ''
  category.value = ''
  currency.value = ''
  sort.value = 'newest'
  page.value = 1
}

const inspect = (listing: MarketplaceListing) => {
  selectedListing.value = listing
  detailsOpen.value = true
}

const buy = async (listing: MarketplaceListing) => {
  loadSession()
  if (!isLoggedIn.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/marketplace')}`)
    return
  }

  isBuying.value = true
  try {
    await marketplaceApi.createOrder(listing.id)
    isSuccess.value = true
    message.value = `Compra de ${listing.itemName} enviada para entrega protegida.`
    detailsOpen.value = false
    await loadListings()
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel comprar este item.'
  } finally {
    isBuying.value = false
  }
}

const reportListing = async (listing: MarketplaceListing) => {
  loadSession()
  if (!isLoggedIn.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/marketplace')}`)
    return
  }
  const reason = import.meta.client ? window.prompt('Motivo da denuncia:')?.trim() : ''
  if (!reason) return
  const description = import.meta.client ? window.prompt('Descreva o problema encontrado:')?.trim() : ''
  if (!description) return
  try {
    await marketplaceApi.createReport({ listingId: listing.id, reason, description })
    isSuccess.value = true
    message.value = 'Denuncia enviada para a equipe de moderacao.'
    detailsOpen.value = false
  } catch {
    isSuccess.value = false
    message.value = 'Nao foi possivel enviar a denuncia.'
  }
}

watch([query, category, currency, sort], () => {
  page.value = 1
  scheduleLoad()
})
watch(page, loadListings)
watch(view, (value) => import.meta.client && localStorage.setItem('blood-moon-market-view', value))

onMounted(() => {
  const savedView = localStorage.getItem('blood-moon-market-view')
  if (savedView === 'grid' || savedView === 'list') view.value = savedView
  loadListings()
})
onBeforeUnmount(() => clearTimeout(loadTimer))
</script>

<style scoped>
.market-page{background:#f5f2ec;color:#211a17}.market-hero{position:relative;min-height:330px;overflow:hidden;border-bottom:1px solid #d5ccc4}.market-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right 32%;filter:grayscale(.4) sepia(.35);opacity:.22}.market-hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,#f5f2ec 0%,rgba(245,242,236,.93) 56%,rgba(245,242,236,.6) 100%)}.market-hero-content{position:relative;z-index:1;display:flex;min-height:330px;flex-direction:column;align-items:center;justify-content:center;padding-block:42px;text-align:center}.market-hero-content>p{display:flex;align-items:center;gap:7px;color:#73090b;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.market-hero-content h1{margin-top:8px;font-size:38px;font-weight:500;text-transform:uppercase}.market-hero-content h1 span{color:#73090b}.market-hero-content small{margin-top:7px;color:#685f59;font-size:11px}.market-search{display:flex;width:min(100%,650px);height:44px;align-items:center;gap:10px;margin-top:22px;border:1px solid #d2c8bf;background:rgba(255,255,255,.78);padding:0 15px;color:#80736d;box-shadow:0 4px 12px rgba(50,30,25,.06)}.market-search input{min-width:0;flex:1;background:transparent;font-size:11px}.market-hero-tabs{display:grid;width:min(100%,440px);grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.market-hero-tabs>*{display:flex;min-height:38px;align-items:center;justify-content:center;gap:8px;border:1px solid #d0c5bc;color:#5c504b;font-size:10px;font-weight:900;text-transform:uppercase}.market-hero-tabs .is-active{border-color:#73090b;background:#73090b;color:#fff}.market-catalog{padding-block:34px 70px}.market-catalog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-left:270px;margin-bottom:12px}.market-catalog-head>p{font-size:10px}.market-catalog-head>div{display:flex;align-items:center;gap:6px}.market-catalog-head label{display:flex;align-items:center;gap:9px;margin-right:6px;font-size:9px}.market-catalog-head select{height:34px;border:1px solid #d0c5bc;background:#fff;padding:0 28px 0 10px;font-size:9px}.market-catalog-head button{display:grid;width:34px;height:34px;place-items:center;border:1px solid #d0c5bc;background:#fff;color:#6a5e58}.market-catalog-head button.is-active{border-color:#73090b;background:#73090b;color:#fff}.mobile-filter-button{display:none!important}.market-layout{display:grid;grid-template-columns:250px minmax(0,1fr);align-items:start;gap:18px}.market-page-button{display:grid;width:34px;height:34px;place-items:center;border:1px solid #cfc5bc;background:#fff;color:#6b5e58;font-size:11px;font-weight:900}.market-page-button-active{border-color:#73090b;background:#73090b;color:#fff}
@media(max-width:1023px){.market-catalog-head{margin-left:0}.mobile-filter-button{display:grid!important}.market-layout{grid-template-columns:1fr}}
@media(max-width:640px){.market-hero{min-height:300px}.market-hero-content{min-height:300px}.market-hero-content h1{font-size:28px}.market-catalog-head{align-items:flex-start;flex-direction:column}.market-catalog-head>div{width:100%;justify-content:flex-end}.market-catalog-head label{margin-right:auto}.market-catalog-head label{font-size:0}.market-hero-tabs{gap:7px}}
</style>
