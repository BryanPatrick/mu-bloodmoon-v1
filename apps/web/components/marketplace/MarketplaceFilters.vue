<template>
  <section class="market-filters" aria-label="Filtros do marketplace">
    <header><BloodMoonIcon name="systems" /><strong>Filtros</strong></header>

    <div class="filter-section">
      <label for="market-category"><BloodMoonIcon name="items" /> Categoria</label>
      <select id="market-category" :value="category" class="market-control" @change="$emit('update:category', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as categorias</option>
        <option v-for="option in categories" :key="option.value" :value="option.value">{{ option.value }} ({{ option.count }})</option>
      </select>
    </div>

    <div class="filter-section">
      <label for="market-currency"><BloodMoonIcon name="xp" /> Moeda</label>
      <select id="market-currency" :value="currency" class="market-control" @change="$emit('update:currency', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as moedas</option>
        <option value="WCOIN">WCoin</option><option value="GOBLIN_POINT">Goblin Point</option><option value="HUNT_POINT">Hunt Point</option>
      </select>
    </div>

    <div class="filter-section">
      <p><BloodMoonIcon name="drop" /> Tipos de item</p>
      <div class="filter-shortcuts">
        <button v-for="shortcut in shortcuts" :key="shortcut" :class="{ 'is-active': category.toLowerCase().includes(shortcut.toLowerCase()) }" type="button" @click="$emit('update:category', shortcut)">
          <span />{{ shortcut }}
        </button>
      </div>
    </div>

    <div class="filter-section">
      <label for="market-sort"><BloodMoonIcon name="progress" /> Ordenar</label>
      <select id="market-sort" :value="sort" class="market-control" @change="$emit('update:sort', ($event.target as HTMLSelectElement).value)">
        <option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="priceAsc">Menor preço</option><option value="priceDesc">Maior preço</option>
      </select>
    </div>

    <button class="clear-button" type="button" :disabled="!hasFilters" @click="$emit('clear')"><RotateCcw class="size-3.5" /> Limpar filtros</button>
  </section>
</template>

<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
const props = defineProps<{ search: string; category: string; currency: string; sort: string; view: 'grid' | 'list'; categories: Array<{ value: string; count: number }> }>()
defineEmits<{ 'update:search': [value: string]; 'update:category': [value: string]; 'update:currency': [value: string]; 'update:sort': [value: string]; 'update:view': [value: 'grid' | 'list']; clear: [] }>()
const shortcuts = ['Armaduras', 'Armas', 'Asas', 'Acessórios', 'Joias']
const hasFilters = computed(() => Boolean(props.search || props.category || props.currency || props.sort !== 'newest'))
</script>

<style scoped>
.market-filters{border:1px solid #d5ccc3;background:#faf7f2}.market-filters header{display:flex;align-items:center;gap:10px;padding:17px;border-bottom:1px solid #d5ccc3;color:#540809;text-transform:uppercase}.market-filters header strong{font-family:Cinzel,serif;font-size:15px}.filter-section{padding:16px;border-bottom:1px solid #e2dad2}.filter-section>label,.filter-section>p{display:flex;align-items:center;gap:9px;margin-bottom:10px;color:#540809;font-size:11px;font-weight:900;text-transform:uppercase}.market-control{width:100%;height:38px;border:1px solid #cfc5bc;border-radius:3px;background:#f3f0ea;padding:0 10px;color:#27211e;font-size:11px}.market-control:focus{border-color:#73090b}.filter-shortcuts{display:grid;gap:8px}.filter-shortcuts button{display:flex;align-items:center;gap:8px;color:#5f5751;font-size:11px;text-align:left}.filter-shortcuts button span{width:12px;height:12px;border:1px solid #c7bbb1;background:#fff}.filter-shortcuts button.is-active{color:#73090b;font-weight:850}.filter-shortcuts button.is-active span{border-color:#73090b;background:#73090b;box-shadow:inset 0 0 0 2px #fff}.clear-button{display:flex;width:calc(100% - 32px);min-height:36px;align-items:center;justify-content:center;gap:7px;margin:16px;border:1px solid #a88f87;color:#5d0b0f;font-size:10px;font-weight:900;text-transform:uppercase}.clear-button:disabled{opacity:.45}.clear-button:not(:disabled):hover{background:#73090b;color:#fff}
</style>
