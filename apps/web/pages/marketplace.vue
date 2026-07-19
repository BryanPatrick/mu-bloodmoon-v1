<template>
  <main class="market-page min-h-screen bg-black text-white">
    <section class="mx-auto w-full max-w-[1880px] px-4 py-6 sm:px-6 lg:px-8">
      <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="grid size-8 place-items-center rounded-md border border-emerald-400/20 bg-emerald-500/10"><ShieldCheck class="size-4 text-emerald-400" /></span>
            <p class="bm-kicker">Comercio protegido entre jogadores</p>
          </div>
          <h1 class="mt-2 font-display text-3xl font-black uppercase">Mercado Blood Moon</h1>
          <p class="mt-2 max-w-3xl text-xs font-semibold leading-6 text-white/56">
            Encontre equipamentos, compare atributos e compre com entrega confirmada pelo servidor.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="market-summary">
            <span>Disponiveis</span>
            <strong>{{ total.toLocaleString('pt-BR') }}</strong>
          </div>
          <div class="market-summary">
            <span>Entrega</span>
            <strong>Protegida</strong>
          </div>
          <NuxtLink class="bm-button-glass inline-flex h-10 items-center gap-2 rounded-md px-4 text-xs font-black" to="/painel/marketplace">
            <CirclePlus class="size-4 text-ember" /> Anunciar item
          </NuxtLink>
        </div>
      </header>

      <MarketplaceFilters
        v-model:search="query"
        v-model:category="category"
        v-model:currency="currency"
        v-model:sort="sort"
        v-model:view="view"
        class="mt-4"
        :categories="categories"
        @clear="clearFilters"
      />

      <p v-if="message" class="mt-4 rounded-md border px-4 py-3 text-xs font-bold" :class="messageClass">{{ message }}</p>

      <div class="mt-4 flex items-center justify-between gap-3">
        <p class="text-[10px] font-black uppercase tracking-[0.17em] text-white/42">
          {{ total }} {{ total === 1 ? 'item encontrado' : 'itens encontrados' }}
        </p>
        <p v-if="totalPages > 1" class="text-[10px] font-black uppercase tracking-[0.17em] text-white/42">Pagina {{ page }} de {{ totalPages }}</p>
      </div>

      <div v-if="isLoading" class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <div v-for="item in 10" :key="item" class="h-[270px] animate-pulse rounded-md border border-white/10 bg-white/5" />
      </div>

      <div
        v-else-if="listings.length"
        class="mt-3 grid gap-3"
        :class="view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-1'"
      >
        <MarketplaceItemCard
          v-for="listing in listings"
          :key="listing.id"
          :listing="listing"
          :view="view"
          @inspect="inspect"
        />
      </div>

      <div v-else class="mt-3 grid min-h-64 place-items-center rounded-md border border-dashed border-white/14 bg-white/[0.025] p-8 text-center">
        <div>
          <PackageSearch class="mx-auto size-9 text-white/20" />
          <p class="bm-kicker mt-3">Marketplace</p>
          <h2 class="mt-2 font-display text-xl font-black uppercase">Nenhum item encontrado</h2>
          <p class="mt-2 text-xs font-semibold text-white/48">Ajuste os filtros ou volte quando novos itens forem anunciados.</p>
          <UButton v-if="hasFilters" class="mt-4" color="neutral" variant="soft" @click="clearFilters">Limpar filtros</UButton>
        </div>
      </div>

      <nav v-if="totalPages > 1" class="mt-5 flex items-center justify-center gap-2" aria-label="Paginacao do marketplace">
        <UButton color="neutral" variant="soft" :disabled="page <= 1" square aria-label="Pagina anterior" @click="page--"><ChevronLeft class="size-4" /></UButton>
        <button
          v-for="number in visiblePages"
          :key="number"
          class="market-page-button"
          :class="{ 'market-page-button-active': page === number }"
          type="button"
          @click="page = number"
        >
          {{ number }}
        </button>
        <UButton color="neutral" variant="soft" :disabled="page >= totalPages" square aria-label="Proxima pagina" @click="page++"><ChevronRight class="size-4" /></UButton>
      </nav>
    </section>

    <MarketplaceItemDetails v-model:open="detailsOpen" :listing="selectedListing" :buying="isBuying" @buy="buy" />
  </main>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, CirclePlus, PackageSearch, ShieldCheck } from 'lucide-vue-next'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

useSeoMeta({ title: 'Mercado Blood Moon' })

const marketplaceApi = useMarketplaceApi()
const { isLoggedIn, loadSession } = useAuth()
const query = ref('')
const category = ref('')
const currency = ref('')
const sort = ref('newest')
const view = ref<'grid' | 'list'>('grid')
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
.market-page { background: radial-gradient(circle at 78% 8%, rgb(14 116 144 / 0.1), transparent 30rem), #050608; }
.market-summary { min-width: 92px; border: 1px solid rgb(255 255 255 / 0.1); border-radius: 6px; background: rgb(255 255 255 / 0.045); padding: 7px 10px; }
.market-summary span { display: block; color: rgb(255 255 255 / 0.38); font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.market-summary strong { display: block; margin-top: 2px; color: rgb(255 255 255 / 0.78); font-size: 11px; }
.market-page-button { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgb(255 255 255 / 0.1); border-radius: 5px; background: rgb(255 255 255 / 0.05); color: rgb(255 255 255 / 0.55); font-size: 11px; font-weight: 900; }
.market-page-button-active { border-color: rgb(245 158 11 / 0.5); background: rgb(245 158 11 / 0.14); color: #fbbf24; }
html.light .market-page { background: var(--bm-page-bg); }
html.light .market-summary { border-color: rgb(15 23 42 / 0.12); background: rgb(255 255 255 / 0.64); }
html.light .market-summary span { color: #64748b; }
html.light .market-summary strong { color: #172033; }
</style>
