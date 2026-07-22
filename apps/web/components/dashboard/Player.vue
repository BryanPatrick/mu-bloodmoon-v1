<template>
  <div class="grid gap-4">
    <section class="bm-dashboard-shell grid gap-4 p-4">
      <header>
        <p class="bm-kicker">Minha jornada</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">Olá, {{ user?.name }}</h1>
        <p class="mt-2 text-sm font-semibold text-white/60">Sua conta, personagens e atividades em um só lugar.</p>
      </header>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="metric in metrics" :key="metric.label" class="bm-dashboard-card p-4">
          <component :is="metric.icon" class="size-5 text-ember" />
          <p class="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/45">{{ metric.label }}</p>
          <p class="mt-2 font-display text-2xl font-black">{{ metric.value }}</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="bm-dashboard-card p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-xl font-black uppercase">Meus personagens</h2>
            <NuxtLink to="/painel/personagens" class="text-xs font-black text-ember">Ver todos</NuxtLink>
          </div>
          <div class="mt-4 grid gap-2">
            <div v-for="character in characters.slice(0, 4)" :key="character.id" class="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div class="flex items-center justify-between gap-3">
                <strong>{{ character.name }}</strong>
                <span class="text-xs text-white/55">Lv. {{ character.level }} · {{ character.reset }} resets</span>
              </div>
              <p class="mt-1 text-xs text-white/45">{{ character.class }} · {{ character.status }}</p>
            </div>
            <p v-if="!characters.length" class="py-6 text-center text-sm text-white/45">Nenhum personagem vinculado.</p>
          </div>
        </article>

        <article class="bm-dashboard-card p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-xl font-black uppercase">Atividade recente</h2>
            <NuxtLink to="/painel/compras" class="text-xs font-black text-ember">Histórico</NuxtLink>
          </div>
          <div class="mt-4 grid gap-2">
            <div v-for="purchase in purchases.slice(0, 5)" :key="purchase.id" class="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div>
                <strong class="text-sm">{{ purchase.productName }}</strong>
                <p class="mt-1 text-xs text-white/45">{{ formatDate(purchase.createdAt) }}</p>
              </div>
              <span class="text-xs font-black text-emerald-200">{{ purchase.status }}</span>
            </div>
            <p v-if="!purchases.length" class="py-6 text-center text-sm text-white/45">Nenhuma compra registrada.</p>
          </div>
        </article>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Coins, Gamepad2, ShoppingBag, Store } from 'lucide-vue-next'
import type { ManagedCharacter } from '~/data/management'
import type { CommercePurchase } from '~/composables/useCommerceApi'

const { user } = useAuth()
const charactersApi = useCharactersApi()
const commerceApi = useCommerceApi()
const marketApi = useMarketplaceApi()
const characters = ref<ManagedCharacter[]>([])
const purchases = ref<CommercePurchase[]>([])
const listingCount = ref(0)

onMounted(async () => {
  const [characterResult, purchaseResult, listings] = await Promise.allSettled([
    charactersApi.list(), commerceApi.listAccountPurchases(), marketApi.listMyListings()
  ])
  if (characterResult.status === 'fulfilled') characters.value = characterResult.value.data
  if (purchaseResult.status === 'fulfilled') purchases.value = purchaseResult.value
  if (listings.status === 'fulfilled') listingCount.value = listings.value.length
})

const metrics = computed(() => [
  { label: 'Personagens', value: characters.value.length, icon: Gamepad2 },
  { label: 'Compras', value: purchases.value.length, icon: ShoppingBag },
  { label: 'Meus anúncios', value: listingCount.value, icon: Store },
  { label: 'Moedas', value: user.value?.currencies.reduce((sum, row) => sum + row.value, 0) || 0, icon: Coins }
])
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value))
</script>
