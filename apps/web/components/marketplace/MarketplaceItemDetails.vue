<template>
  <UModal v-model:open="isOpen" :title="listing?.itemName || 'Detalhes do item'" :description="listing?.itemCategory || 'Marketplace'" :ui="modalUi">
    <template #content>
      <section v-if="listing" class="market-details bm-panel">
        <header class="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div>
            <p class="bm-kicker">{{ listing.itemCategory }}</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">{{ listing.itemName }}</h2>
          </div>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" @click="isOpen = false"><X class="size-4" /></UButton>
        </header>

        <div class="grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          <div class="market-details-visual">
            <img v-if="imageUrl" :src="imageUrl" :alt="listing.itemName">
            <Gem v-else class="size-16 text-white/16" />
          </div>

          <div class="min-w-0">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div v-for="stat in stats" :key="stat.label" class="market-stat">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </div>

            <div v-if="options.length" class="mt-4">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Opcoes do equipamento</p>
              <div class="mt-2 grid gap-1.5 sm:grid-cols-2">
                <div v-for="option in options" :key="option" class="market-detail-option">{{ option }}</div>
              </div>
            </div>

            <div class="mt-4 grid gap-2 rounded-md border border-emerald-400/18 bg-emerald-500/7 p-3 text-xs font-semibold leading-5 text-white/60 sm:grid-cols-[auto_1fr]">
              <ShieldCheck class="mt-0.5 size-4 text-emerald-400" />
              <p>O item permanece bloqueado durante a compra. A moeda so e liberada ao vendedor depois que a ponte do jogo confirma a entrega.</p>
            </div>
          </div>
        </div>

        <footer class="flex flex-col gap-3 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Vendedor</p>
            <p class="mt-1 text-xs font-bold text-white/68">{{ listing.sellerCharacter?.name || listing.sellerUsername || 'Jogador' }}</p>
          </div>
          <div class="flex items-center justify-between gap-4 sm:justify-end">
            <strong class="font-display text-xl text-ember">{{ listing.price.toLocaleString('pt-BR') }} {{ currencyLabel }}</strong>
            <UButton color="primary" :loading="buying" @click="$emit('buy', listing)"><ShoppingCart class="size-4" /> Comprar</UButton>
          </div>
        </footer>
      </section>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { Gem, ShieldCheck, ShoppingCart, X } from 'lucide-vue-next'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

const props = defineProps<{ open: boolean, listing: MarketplaceListing | null, buying?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean], buy: [listing: MarketplaceListing] }>()
const isOpen = computed({ get: () => props.open, set: (value) => emit('update:open', value) })
const data = computed<Record<string, unknown>>(() => props.listing?.itemData && typeof props.listing.itemData === 'object' ? props.listing.itemData as Record<string, unknown> : {})
const imageUrl = computed(() => String(data.value.imageUrl || data.value.imagePath || data.value.thumbnail || data.value.image || ''))
const options = computed(() => {
  const raw = data.value.options || data.value.excellentOptions || data.value.attributes || []
  if (!Array.isArray(raw)) return []
  return raw.map((item) => typeof item === 'string' ? item : String((item as Record<string, unknown>)?.label || (item as Record<string, unknown>)?.name || '')).filter(Boolean)
})
const stats = computed(() => [
  { label: 'Nivel', value: `+${Number(data.value.level || data.value.itemLevel || 0)}` },
  { label: 'Luck', value: data.value.luck ? 'Sim' : 'Nao' },
  { label: 'Durabilidade', value: String(data.value.durability || '--') },
  { label: 'Referencia', value: props.listing?.gameItemRef || '--' }
])
const currencyLabel = computed(() => props.listing ? ({ WCOIN: 'WCoin', GOBLIN_POINT: 'GP', HUNT_POINT: 'HP' }[props.listing.currency] || props.listing.currency) : '')
const modalUi = { content: 'max-w-4xl bg-transparent shadow-none ring-0', overlay: 'bg-black/75 backdrop-blur-sm' }
</script>

<style scoped>
.market-details { overflow: hidden; border-radius: 8px; }
.market-details-visual { display: grid; min-height: 220px; place-items: center; border: 1px solid rgb(255 255 255 / 0.1); border-radius: 6px; background: radial-gradient(circle, rgb(255 255 255 / 0.1), transparent 65%), rgb(0 0 0 / 0.24); }
.market-details-visual img { width: 100%; height: 220px; object-fit: contain; padding: 16px; }
.market-stat { min-width: 0; border: 1px solid rgb(255 255 255 / 0.1); border-radius: 5px; background: rgb(0 0 0 / 0.2); padding: 9px; }
.market-stat span { display: block; color: rgb(255 255 255 / 0.38); font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.market-stat strong { display: block; margin-top: 4px; overflow: hidden; color: rgb(255 255 255 / 0.82); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.market-detail-option { border-left: 2px solid #38bdf8; background: rgb(14 165 233 / 0.07); padding: 7px 9px; color: #7dd3fc; font-size: 10px; font-weight: 750; }
</style>
