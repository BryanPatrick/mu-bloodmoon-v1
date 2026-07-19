<template>
  <section class="market-filters bm-glass" aria-label="Filtros do marketplace">
    <div class="grid min-w-0 gap-2 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(10rem,.65fr))_auto]">
      <div class="relative min-w-0">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/42" />
        <input
          :value="search"
          class="market-control w-full pl-10"
          type="search"
          placeholder="Pesquisar pelo nome do item"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <select :value="category" class="market-control" @change="$emit('update:category', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as categorias</option>
        <option v-for="option in categories" :key="option.value" :value="option.value">
          {{ option.value }} ({{ option.count }})
        </option>
      </select>

      <select :value="currency" class="market-control" @change="$emit('update:currency', ($event.target as HTMLSelectElement).value)">
        <option value="">Todas as moedas</option>
        <option value="WCOIN">WCoin</option>
        <option value="GOBLIN_POINT">Goblin Point</option>
        <option value="HUNT_POINT">Hunt Point</option>
      </select>

      <select :value="sort" class="market-control" @change="$emit('update:sort', ($event.target as HTMLSelectElement).value)">
        <option value="newest">Mais recentes</option>
        <option value="oldest">Mais antigos</option>
        <option value="priceAsc">Menor preco</option>
        <option value="priceDesc">Maior preco</option>
      </select>

      <div class="flex items-center gap-2">
        <UButton
          :color="view === 'grid' ? 'primary' : 'neutral'"
          :variant="view === 'grid' ? 'solid' : 'soft'"
          square
          aria-label="Visualizacao em grade"
          @click="$emit('update:view', 'grid')"
        >
          <LayoutGrid class="size-4" />
        </UButton>
        <UButton
          :color="view === 'list' ? 'primary' : 'neutral'"
          :variant="view === 'list' ? 'solid' : 'soft'"
          square
          aria-label="Visualizacao em lista"
          @click="$emit('update:view', 'list')"
        >
          <List class="size-4" />
        </UButton>
        <UButton v-if="hasFilters" color="neutral" variant="ghost" square aria-label="Limpar filtros" @click="$emit('clear')">
          <RotateCcw class="size-4" />
        </UButton>
      </div>
    </div>

    <div class="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
      <span class="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Atalhos</span>
      <button
        v-for="shortcut in shortcuts"
        :key="shortcut"
        class="market-chip"
        :class="{ 'market-chip-active': category.toLowerCase().includes(shortcut.toLowerCase()) }"
        type="button"
        @click="$emit('update:category', shortcut)"
      >
        {{ shortcut }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { LayoutGrid, List, RotateCcw, Search } from 'lucide-vue-next'

const props = defineProps<{
  search: string
  category: string
  currency: string
  sort: string
  view: 'grid' | 'list'
  categories: Array<{ value: string, count: number }>
}>()

defineEmits<{
  'update:search': [value: string]
  'update:category': [value: string]
  'update:currency': [value: string]
  'update:sort': [value: string]
  'update:view': [value: 'grid' | 'list']
  clear: []
}>()

const shortcuts = ['Armaduras', 'Armas', 'Asas', 'Acessorios', 'Joias']
const hasFilters = computed(() => Boolean(props.search || props.category || props.currency || props.sort !== 'newest'))
</script>

<style scoped>
.market-filters { border-radius: 8px; padding: 10px; }
.market-control {
  min-height: 38px;
  border: 1px solid rgb(255 255 255 / 0.13);
  border-radius: 6px;
  background: rgb(0 0 0 / 0.34);
  padding: 0 12px;
  color: rgb(255 255 255 / 0.88);
  font-size: 12px;
  font-weight: 750;
  outline: none;
}
.market-control:focus { border-color: rgb(245 158 11 / 0.7); }
.market-control option { background: #111318; color: white; }
.market-chip { border: 1px solid rgb(255 255 255 / 0.1); border-radius: 999px; background: rgb(255 255 255 / 0.055); padding: 5px 10px; color: rgb(255 255 255 / 0.55); font-size: 10px; font-weight: 850; }
.market-chip:hover, .market-chip-active { border-color: rgb(245 158 11 / 0.45); background: rgb(245 158 11 / 0.12); color: #fbbf24; }
html.light .market-control { border-color: rgb(15 23 42 / 0.15); background: rgb(255 255 255 / 0.76); color: #172033; }
html.light .market-chip { border-color: rgb(15 23 42 / 0.12); color: #475569; }
</style>
