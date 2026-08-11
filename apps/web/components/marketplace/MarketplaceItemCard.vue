<template>
  <article class="market-item" :class="[`market-item-${view}`, qualityClass]" @click="$emit('inspect', listing)">
    <div class="market-item-visual">
      <img v-if="imageUrl" :src="imageUrl" :alt="listing.itemName" loading="lazy">
      <Gem v-else class="size-10" />
      <span v-if="itemLevel">+{{ itemLevel }}</span>
    </div>

    <div class="market-item-copy">
      <button type="button" @click.stop="$emit('inspect', listing)">{{ listing.itemName }}</button>
      <span class="quality-label">{{ qualityLabel }}</span>
      <dl>
        <div><dt>Tipo</dt><dd>{{ listing.itemCategory }}</dd></div>
        <div><dt>Vendedor</dt><dd>{{ listing.sellerCharacter?.name || listing.sellerUsername || 'Jogador' }}</dd></div>
        <div v-if="itemLevel"><dt>Nível</dt><dd>+{{ itemLevel }}</dd></div>
        <div><dt>Publicado</dt><dd>{{ relativeDate }}</dd></div>
      </dl>
    </div>

    <div class="market-item-trade">
      <Bookmark class="bookmark size-4" />
      <div><span>Status</span><strong class="is-available"><i /> Disponível</strong></div>
      <div><span>Venda</span><strong>{{ listing.price.toLocaleString('pt-BR') }} {{ currencyLabel }}</strong></div>
      <div><span>Troca</span><strong><Repeat2 class="size-3" /> Protegida</strong></div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Bookmark, Gem, Repeat2 } from 'lucide-vue-next'
import type { MarketplaceListing } from '~/composables/useMarketplaceApi'
const props = defineProps<{ listing: MarketplaceListing; view: 'grid' | 'list' }>()
defineEmits<{ inspect: [listing: MarketplaceListing] }>()
const data = computed<Record<string, unknown>>(() => props.listing.itemData && typeof props.listing.itemData === 'object' ? props.listing.itemData as Record<string, unknown> : {})
const imageUrl = computed(() => String(data.value.imageUrl || data.value.imagePath || data.value.thumbnail || data.value.image || ''))
const itemLevel = computed(() => Number(data.value.level || data.value.itemLevel || 0))
const quality = computed(() => String(data.value.quality || data.value.type || 'normal').toLowerCase())
const qualityLabel = computed(() => quality.value.includes('ancient') ? 'Ancient' : quality.value.includes('socket') ? 'Socket' : quality.value.includes('excellent') ? 'Excellent' : quality.value.includes('epic') ? 'Épico' : 'Normal')
const qualityClass = computed(() => `quality-${qualityLabel.value.toLowerCase()}`)
const currencyLabel = computed(() => ({ WCOIN: 'WCoin', GOBLIN_POINT: 'GP', HUNT_POINT: 'HP' }[props.listing.currency] || props.listing.currency))
const relativeDate = computed(() => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(props.listing.createdAt)))
</script>

<style scoped>
.market-item{position:relative;display:grid;overflow:hidden;border:1px solid #d4cbc3;border-radius:7px;background:#fcfaf7;box-shadow:0 3px 8px rgba(39,23,18,.1);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.market-item:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(84,8,9,.13)}.market-item-list{grid-template-columns:180px minmax(0,1fr) 220px;min-height:166px}.market-item-grid{grid-template-rows:180px 1fr auto;min-height:410px}.market-item-visual{position:relative;display:grid;place-items:center;overflow:hidden;background:#0f0d0d;color:#827872}.market-item-visual img{width:100%;height:100%;object-fit:contain;padding:10px}.market-item-visual>span{position:absolute;right:7px;top:7px;background:#73090b;padding:3px 5px;color:#fff;font-size:9px;font-weight:900}.market-item-copy{padding:20px}.market-item-copy>button{display:block;color:#2b1b19;font-size:18px;font-weight:800;text-align:left;text-transform:uppercase}.quality-label{display:inline-block;margin-top:5px;border-radius:2px;background:#ece6df;padding:2px 7px;color:#73090b;font-size:9px;font-weight:900;text-transform:uppercase}.quality-excellent .quality-label{background:#d9f8df;color:#18863d}.quality-ancient .quality-label{background:#e8f7c7;color:#58820b}.quality-socket .quality-label{background:#f1ddfb;color:#7e22a8}.market-item dl{display:grid;margin-top:12px;gap:4px}.market-item dl div{display:flex;gap:5px;font-size:10px}.market-item dt{color:#6d635d}.market-item dd{font-weight:800}.market-item-trade{position:relative;display:grid;align-content:center;gap:14px;padding:20px;border-left:1px solid #e1d9d1}.market-item-trade .bookmark{position:absolute;right:14px;top:14px;color:#765b55}.market-item-trade span{display:block;color:#827772;font-size:8px;font-weight:900;text-transform:uppercase}.market-item-trade strong{display:flex;align-items:center;gap:5px;margin-top:4px;color:#2e2926;font-size:10px;text-transform:uppercase}.market-item-trade .is-available{color:#2a944a}.market-item-trade i{width:7px;height:7px;border-radius:50%;background:#39ac57}.market-item-grid .market-item-trade{border-top:1px solid #e1d9d1;border-left:0}.market-item-grid .market-item-copy{min-height:142px}
@media(max-width:720px){.market-item-list{grid-template-columns:105px 1fr}.market-item-list .market-item-trade{grid-column:1/-1;grid-template-columns:repeat(3,1fr);border-top:1px solid #e1d9d1;border-left:0;padding:12px 16px}.market-item-copy{padding:14px}.market-item-copy>button{font-size:14px}}
</style>
