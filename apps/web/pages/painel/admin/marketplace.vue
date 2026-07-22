<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminMarketplaceManage)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Marketplace</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
            Controle anuncios entre jogadores, pedidos e a fila de integracao com o servidor MU.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[680px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar item ou vendedor"
            type="search"
          >
          <select v-model="status" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="">Todos status</option>
            <option v-for="option in listingStatuses" :key="option" class="bg-zinc-950 text-white" :value="option">{{ option }}</option>
          </select>
          <button class="bm-button-glass rounded-md px-4 text-sm font-black" type="button" @click="loadAll">
            Atualizar
          </button>
        </div>
      </div>

      <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
        {{ message }}
      </p>

      <section class="grid gap-4">
        <div class="flex items-end justify-between border-b border-white/10 pb-3">
          <div>
            <p class="bm-kicker">Anuncios</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase">Fila do marketplace</h2>
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
                {{ listing.sellerUsername || 'sem vendedor' }} - {{ listing.itemCategory }} - {{ listing.price.toLocaleString('pt-BR') }} {{ listing.currency }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:w-80">
              <button
                class="bm-button-glass rounded-md px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                :disabled="listing.status !== 'PENDING_LOCK'"
                @click="activateListing(listing)"
              >
                Aprovar anúncio
              </button>
              <button
                class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100 disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                :disabled="!['PENDING_LOCK', 'ACTIVE'].includes(listing.status)"
                @click="setListingStatus(listing, 'CANCELLED')"
              >
                Cancelar
              </button>
            </div>
          </div>
        </article>
      </section>

    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

useSeoMeta({ title: 'Admin Marketplace' })

const { hasPermission, loadSession } = useAuth()
const marketplaceApi = useMarketplaceApi()
const query = ref('')
const status = ref('')
const listings = ref<MarketplaceListing[]>([])
const message = ref('')
const isSuccess = ref(true)
const listingStatuses: MarketplaceListing['status'][] = ['PENDING_LOCK', 'ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED', 'FAILED']

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const loadAll = async () => {
  const [listingRows] = await Promise.all([
    marketplaceApi.listAdminListings({ search: query.value || undefined, status: status.value || undefined, pageSize: 100 })
  ])
  listings.value = listingRows.data
}

const activateListing = async (listing: MarketplaceListing) => {
  try {
    await marketplaceApi.activateListing(listing.id)
    isSuccess.value = true
    message.value = `${listing.itemName} aprovado.`
    await loadAll()
  } catch {
    isSuccess.value = false
    message.value = 'Não foi possível aprovar o anúncio. Tente novamente.'
  }
}

const setListingStatus = async (listing: MarketplaceListing, nextStatus: MarketplaceListing['status']) => {
  try {
    await marketplaceApi.updateListingStatus(listing.id, nextStatus, 'admin-panel')
    isSuccess.value = true
    message.value = `${listing.itemName} alterado para ${nextStatus}.`
    await loadAll()
  } catch {
    isSuccess.value = false
    message.value = 'Não foi possível alterar o anúncio. Tente novamente.'
  }
}

const listingStatusClass = (value: MarketplaceListing['status']) => ({
  'bg-ember/15 text-ember': value === 'PENDING_LOCK',
  'bg-emerald-500/15 text-emerald-100': value === 'ACTIVE',
  'bg-sky-500/15 text-sky-100': value === 'SOLD',
  'bg-blood-700/25 text-blood-100': ['CANCELLED', 'FAILED', 'EXPIRED'].includes(value)
})

watch([query, status], loadAll)

onMounted(() => {
  loadSession()
  loadAll()
})
</script>
