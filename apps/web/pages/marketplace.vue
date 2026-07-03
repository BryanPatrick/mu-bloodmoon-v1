<template>
  <main class="min-h-screen bg-black text-white">
    <section class="mx-auto w-full max-w-[1880px] px-6 py-10 lg:px-8">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Comercio entre jogadores</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Marketplace</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
            Itens anunciados por jogadores. A entrega real sera confirmada pela ponte com o servidor MU antes de finalizar a compra.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[680px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar item"
            type="search"
          >
          <select v-model="currency" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="">Todas moedas</option>
            <option v-for="option in currencies" :key="option" class="bg-zinc-950 text-white" :value="option">{{ option }}</option>
          </select>
          <NuxtLink class="bm-button-glass grid h-11 place-items-center rounded-md px-4 text-sm font-black" to="/painel/marketplace">
            Anunciar item
          </NuxtLink>
        </div>
      </div>

      <p v-if="message" class="mt-6 rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
        {{ message }}
      </p>

      <div v-if="isLoading" class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 8" :key="item" class="bm-panel h-80 animate-pulse rounded-md" />
      </div>

      <div v-else-if="listings.length" class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="listing in listings" :key="listing.id" class="bm-panel rounded-md p-5">
          <div class="grid aspect-square place-items-center rounded-md border border-white/10 bg-black/35 p-5 text-center">
            <span class="font-display text-3xl font-black text-white/28">{{ listing.itemName }}</span>
          </div>
          <div class="mt-4">
            <p class="text-xs font-black uppercase tracking-[0.18em] text-ember">{{ listing.itemCategory }}</p>
            <h2 class="mt-2 font-display text-xl font-black">{{ listing.itemName }}</h2>
            <p class="mt-2 text-xs font-bold text-white/48">Vendedor: {{ listing.sellerUsername || 'jogador' }}</p>
            <p v-if="listing.sellerCharacter" class="mt-1 text-xs font-bold text-white/48">
              Personagem: {{ listing.sellerCharacter.name }} - {{ listing.sellerCharacter.className }}
            </p>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3">
            <span class="font-display text-xl font-black text-ember">{{ listing.price.toLocaleString('pt-BR') }} {{ listing.currency }}</span>
            <button class="rounded-md bg-blood-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blood-500" type="button" @click="buy(listing)">
              Comprar
            </button>
          </div>
        </article>
      </div>

      <div v-else class="bm-panel mt-8 rounded-md p-10 text-center">
        <p class="bm-kicker">Marketplace</p>
        <h2 class="mt-2 font-display text-2xl font-black uppercase">Nenhum anuncio ativo</h2>
        <p class="mt-3 text-sm font-semibold text-white/60">Quando os itens forem travados pela ponte do jogo, eles aparecerão aqui.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

useSeoMeta({ title: 'Marketplace Blood Moon' })

const marketplaceApi = useMarketplaceApi()
const { isLoggedIn, loadSession } = useAuth()
const query = ref('')
const currency = ref('')
const listings = ref<MarketplaceListing[]>([])
const message = ref('')
const isSuccess = ref(true)
const isLoading = ref(false)
const currencies = ['WCOIN', 'GOBLIN_POINT', 'HUNT_POINT']

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const loadListings = async () => {
  isLoading.value = true
  try {
    const response = await marketplaceApi.listListings({
      search: query.value || undefined,
      currency: currency.value || undefined,
      pageSize: 48
    })
    listings.value = response.data
  } finally {
    isLoading.value = false
  }
}

const buy = async (listing: MarketplaceListing) => {
  loadSession()
  if (!isLoggedIn.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/marketplace')}`)
    return
  }

  try {
    await marketplaceApi.createOrder(listing.id)
    isSuccess.value = true
    message.value = `Compra de ${listing.itemName} enviada para entrega.`
    await loadListings()
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel comprar este item.'
  }
}

watch([query, currency], () => {
  loadListings()
})

onMounted(loadListings)
</script>
