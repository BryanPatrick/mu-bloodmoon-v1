<template>
  <article class="market-item" :class="[`market-item-${view}`, qualityClass]">
    <button class="market-item-visual" type="button" :aria-label="`Ver detalhes de ${listing.itemName}`" @click="$emit('inspect', listing)">
      <img v-if="imageUrl" :src="imageUrl" :alt="listing.itemName" loading="lazy">
      <Gem v-else class="size-10 text-white/16" />
      <span v-if="itemLevel" class="market-level">+{{ itemLevel }}</span>
    </button>

    <div class="market-item-copy">
      <div class="flex min-w-0 items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-[9px] font-black uppercase tracking-[0.14em] text-ember">{{ listing.itemCategory }}</p>
          <button class="mt-1 line-clamp-2 text-left text-sm font-black leading-tight text-white" type="button" @click="$emit('inspect', listing)">
            {{ listing.itemName }}
          </button>
        </div>
        <ShieldCheck class="mt-0.5 size-4 shrink-0 text-emerald-400" aria-label="Item bloqueado pelo servidor" />
      </div>

      <div class="mt-2 flex min-h-5 flex-wrap gap-1">
        <span v-for="option in optionLabels.slice(0, view === 'list' ? 5 : 3)" :key="option" class="market-option">{{ option }}</span>
        <span v-if="optionLabels.length > (view === 'list' ? 5 : 3)" class="market-option">+{{ optionLabels.length - (view === 'list' ? 5 : 3) }}</span>
      </div>

      <div class="market-item-meta">
        <span class="truncate"><UserRound class="size-3" /> {{ listing.sellerCharacter?.name || listing.sellerUsername || 'Jogador' }}</span>
        <span><Clock3 class="size-3" /> {{ relativeDate }}</span>
      </div>
    </div>

    <div class="market-item-action">
      <div>
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">Preco</p>
        <p class="mt-0.5 whitespace-nowrap text-sm font-black text-ember">{{ listing.price.toLocaleString('pt-BR') }} {{ currencyLabel }}</p>
      </div>
      <UButton color="primary" size="sm" @click="$emit('inspect', listing)">Ver item</UButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Clock3, Gem, ShieldCheck, UserRound } from 'lucide-vue-next'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'

const props = defineProps<{ listing: MarketplaceListing, view: 'grid' | 'list' }>()
defineEmits<{ inspect: [listing: MarketplaceListing] }>()

const data = computed<Record<string, unknown>>(() => props.listing.itemData && typeof props.listing.itemData === 'object' ? props.listing.itemData as Record<string, unknown> : {})
const imageUrl = computed(() => String(data.value.imageUrl || data.value.imagePath || data.value.thumbnail || data.value.image || ''))
const itemLevel = computed(() => Number(data.value.level || data.value.itemLevel || 0))
const optionLabels = computed(() => {
  const raw = data.value.options || data.value.excellentOptions || data.value.attributes || []
  if (Array.isArray(raw)) return raw.map((item) => typeof item === 'string' ? item : String((item as Record<string, unknown>)?.label || (item as Record<string, unknown>)?.name || '')).filter(Boolean)
  return []
})
const qualityClass = computed(() => {
  const quality = String(data.value.quality || data.value.type || '').toLowerCase()
  if (quality.includes('ancient')) return 'market-quality-ancient'
  if (quality.includes('socket')) return 'market-quality-socket'
  if (quality.includes('excellent')) return 'market-quality-excellent'
  return ''
})
const currencyLabel = computed(() => ({ WCOIN: 'WCoin', GOBLIN_POINT: 'GP', HUNT_POINT: 'HP' }[props.listing.currency] || props.listing.currency))
const relativeDate = computed(() => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(props.listing.createdAt)))
</script>

<style scoped>
.market-item { position: relative; overflow: hidden; border: 1px solid rgb(255 255 255 / 0.12); border-radius: 7px; background: linear-gradient(145deg, rgb(255 255 255 / 0.075), rgb(8 9 13 / 0.92)); box-shadow: inset 0 1px rgb(255 255 255 / 0.08); }
.market-item::before { position: absolute; inset: 0 auto 0 0; width: 2px; content: ''; background: #64748b; }
.market-quality-excellent::before { background: #22c55e; }
.market-quality-ancient::before { background: #84cc16; }
.market-quality-socket::before { background: #a855f7; }
.market-item-grid { display: grid; grid-template-rows: 132px 1fr auto; min-height: 270px; }
.market-item-list { display: grid; grid-template-columns: 74px minmax(0, 1fr) auto; min-height: 82px; align-items: stretch; }
.market-item-visual { position: relative; display: grid; min-width: 0; place-items: center; overflow: hidden; background: radial-gradient(circle, rgb(255 255 255 / 0.11), transparent 64%), rgb(0 0 0 / 0.22); }
.market-item-grid .market-item-visual { border-bottom: 1px solid rgb(255 255 255 / 0.08); }
.market-item-list .market-item-visual { border-right: 1px solid rgb(255 255 255 / 0.08); }
.market-item-visual img { width: 100%; height: 100%; object-fit: contain; padding: 12px; transition: transform 180ms ease; }
.market-item:hover .market-item-visual img { transform: scale(1.06); }
.market-level { position: absolute; right: 6px; top: 6px; border: 1px solid rgb(245 158 11 / 0.35); border-radius: 4px; background: rgb(0 0 0 / 0.72); padding: 2px 5px; color: #fbbf24; font-size: 9px; font-weight: 900; }
.market-item-copy { min-width: 0; padding: 11px; }
.market-option { border: 1px solid rgb(56 189 248 / 0.22); border-radius: 999px; background: rgb(14 165 233 / 0.08); padding: 2px 6px; color: #7dd3fc; font-size: 8px; font-weight: 850; text-transform: uppercase; }
.market-item-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 9px; color: rgb(255 255 255 / 0.38); font-size: 9px; font-weight: 700; }
.market-item-meta span { display: flex; min-width: 0; align-items: center; gap: 4px; }
.market-item-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid rgb(255 255 255 / 0.08); padding: 9px 11px; }
.market-item-list .market-item-action { min-width: 190px; border-top: 0; border-left: 1px solid rgb(255 255 255 / 0.08); }
html.light .market-item { border-color: rgb(15 23 42 / 0.14); background: rgb(255 255 255 / 0.7); }
html.light .market-item :where(.text-white, [class*="text-white/"]) { color: #172033 !important; }
@media (max-width: 640px) {
  .market-item-list { grid-template-columns: 64px minmax(0, 1fr); }
  .market-item-list .market-item-action { grid-column: 1 / -1; border-top: 1px solid rgb(255 255 255 / 0.08); border-left: 0; }
}
</style>
