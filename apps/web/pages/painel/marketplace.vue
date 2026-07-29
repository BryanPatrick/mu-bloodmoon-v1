<template>
  <ManagementShell>
    <div class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Marketplace</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Meus anuncios</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
            Cadastre itens para venda entre jogadores. Nesta fase, o item fica pendente ate a ponte do jogo confirmar o bloqueio real.
          </p>
        </div>
        <NuxtLink class="bm-button-glass rounded-md px-5 py-3 text-sm font-black" to="/marketplace">
          Ver marketplace publico
        </NuxtLink>
      </div>

      <section class="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form class="bm-panel grid gap-4 rounded-md p-5" @submit.prevent="createListing">
          <div>
            <p class="bm-kicker">Novo anuncio</p>
            <h2 class="mt-2 font-display text-2xl font-black uppercase">Anunciar item</h2>
          </div>

          <label class="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
            Nome do item
            <input v-model="form.itemName" class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70" placeholder="Excellent Bow +9" required>
          </label>

          <label class="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
            Categoria
            <input v-model="form.itemCategory" class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70" placeholder="Armas - Fairy Elf" required>
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
              Preco
              <input v-model.number="form.price" class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70" min="1" required type="number">
            </label>
            <label class="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
              Moeda
              <select v-model="form.currency" class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70">
                <option class="bg-zinc-950 text-white" value="WCOIN">WCOIN</option>
                <option class="bg-zinc-950 text-white" value="GOBLIN_POINT">GOBLIN_POINT</option>
                <option class="bg-zinc-950 text-white" value="HUNT_POINT">HUNT_POINT</option>
              </select>
            </label>
          </div>

          <button class="rounded-md bg-blood-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blood-500" type="submit">
            Criar anuncio pendente
          </button>
        </form>

        <section class="grid gap-5">
          <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
            {{ message }}
          </p>

          <div class="grid gap-4">
            <div class="flex items-end justify-between border-b border-white/10 pb-3">
              <div>
                <p class="bm-kicker">Vendas</p>
                <h2 class="mt-1 font-display text-2xl font-black uppercase">Anuncios da conta</h2>
              </div>
              <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ listings.length }} registros</span>
            </div>

            <article v-for="listing in listings" :key="listing.id" class="bm-panel rounded-md p-5">
              <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div class="flex flex-wrap gap-2">
                    <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="listingStatusClass(listing.status)">
                      {{ listing.status }}
                    </span>
                    <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                      {{ listing.currency }}
                    </span>
                  </div>
                  <h3 class="mt-3 font-display text-2xl font-black">{{ listing.itemName }}</h3>
                  <p class="mt-1 text-sm font-bold text-white/58">
                    {{ listing.itemCategory }} - {{ listing.price.toLocaleString('pt-BR') }} {{ listing.currency }}
                  </p>
                </div>
                <button
                  class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100 disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                  :disabled="!['DRAFT', 'ESCROW_PENDING', 'ACTIVE'].includes(listing.status)"
                  @click="cancelListing(listing)"
                >
                  Cancelar
                </button>
              </div>
            </article>
          </div>

          <div class="grid gap-4">
            <div class="flex items-end justify-between border-b border-white/10 pb-3">
              <div>
                <p class="bm-kicker">Compras</p>
                <h2 class="mt-1 font-display text-2xl font-black uppercase">Pedidos da conta</h2>
              </div>
              <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ orders.length }} registros</span>
            </div>

            <article v-for="order in orders" :key="order.id" class="bm-panel rounded-md p-5">
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="orderStatusClass(order.status)">
                  {{ order.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  {{ order.currency }}
                </span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ order.itemName || 'Item do marketplace' }}</h3>
              <p class="mt-1 text-sm font-bold text-white/58">
                {{ order.price.toLocaleString('pt-BR') }} {{ order.currency }} - vendedor {{ order.sellerUsername || 'desconhecido' }}
              </p>
            </article>
          </div>
        </section>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { CreateMarketplaceListingPayload, MarketplaceListing, MarketplaceOrder } from '~/composables/useMarketplaceApi'

useSeoMeta({ title: 'Meus anuncios' })

const marketplaceApi = useMarketplaceApi()
const message = ref('')
const isSuccess = ref(true)
const listings = ref<MarketplaceListing[]>([])
const orders = ref<MarketplaceOrder[]>([])
const form = reactive<CreateMarketplaceListingPayload>({
  gameItemRef: '',
  itemName: '',
  itemCategory: '',
  itemData: {},
  price: 1,
  currency: 'WCOIN'
})

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const loadRows = async () => {
  const [listingRows, orderRows] = await Promise.all([
    marketplaceApi.listMyListings(),
    marketplaceApi.listMyOrders()
  ])
  listings.value = listingRows
  orders.value = orderRows
}

const createListing = async () => {
  try {
    const gameItemRef = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    await marketplaceApi.createListing({ ...form, gameItemRef, itemData: { pendingGameSync: true } })
    Object.assign(form, { gameItemRef: '', itemName: '', itemCategory: '', itemData: {}, price: 1, currency: 'WCOIN' })
    isSuccess.value = true
    message.value = 'Anuncio enviado ao escrow. Ele so fica ativo depois do bloqueio real do item no jogo.'
    await loadRows()
  } catch {
    isSuccess.value = false
    message.value = 'Não foi possível criar o anúncio. Confira os dados e tente novamente.'
  }
}

const cancelListing = async (listing: MarketplaceListing) => {
  try {
    await marketplaceApi.cancelListing(listing.id)
    isSuccess.value = true
    message.value = `Anuncio ${listing.itemName} cancelado.`
    await loadRows()
  } catch {
    isSuccess.value = false
    message.value = 'Não foi possível cancelar o anúncio. Tente novamente.'
  }
}

const listingStatusClass = (status: MarketplaceListing['status']) => ({
  'bg-ember/15 text-ember': ['DRAFT', 'ESCROW_PENDING', 'RETURN_PENDING', 'MANUAL_REVIEW'].includes(status),
  'bg-emerald-500/15 text-emerald-100': status === 'ACTIVE',
  'bg-sky-500/15 text-sky-100': status === 'SOLD',
  'bg-blood-700/25 text-blood-100': ['CANCELED', 'FAILED', 'EXPIRED', 'SUSPENDED'].includes(status)
})

const orderStatusClass = (status: MarketplaceOrder['status']) => ({
  'bg-ember/15 text-ember': ['PREPARED', 'PAID', 'DELIVERING'].includes(status),
  'bg-emerald-500/15 text-emerald-100': status === 'COMPLETED',
  'bg-blood-700/25 text-blood-100': ['CANCELLED', 'REFUNDED', 'FAILED'].includes(status)
})

onMounted(loadRows)
</script>

