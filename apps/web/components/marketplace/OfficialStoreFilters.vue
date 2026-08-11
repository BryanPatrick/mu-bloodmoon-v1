<template>
  <section class="store-filters" aria-label="Filtros da Loja Oficial">
    <header><BloodMoonIcon name="systems" /><strong>Filtros da loja</strong></header>
    <div class="filter-section">
      <label for="official-category"><BloodMoonIcon name="items" /> Categoria</label
      ><select
        id="official-category"
        :value="category"
        class="store-control"
        @change="applyFilter('category', $event)"
      >
        <option value="">Todas as categorias</option>
        <option v-for="option in categories" :key="option.id" :value="option.name">
          {{ option.name }}
        </option>
      </select>
    </div>
    <div class="filter-section">
      <label for="official-currency"><BloodMoonIcon name="xp" /> Moeda</label
      ><select
        id="official-currency"
        :value="currency"
        class="store-control"
        @change="applyFilter('currency', $event)"
      >
        <option value="">Todas as moedas</option>
        <option value="WCOIN">WCoin</option>
        <option value="GOBLIN_POINT">Goblin Point</option>
        <option value="HUNT_POINT">Hunt Point</option>
      </select>
    </div>
    <div class="filter-section">
      <label for="official-sort"><BloodMoonIcon name="progress" /> Ordenar</label
      ><select
        id="official-sort"
        :value="sort"
        class="store-control"
        @change="applyFilter('sort', $event)"
      >
        <option value="featured">Destaques primeiro</option>
        <option value="nameAsc">Nome (A-Z)</option>
        <option value="priceAsc">Menor preço</option>
        <option value="priceDesc">Maior preço</option>
      </select>
    </div>
    <button class="clear-button" type="button" :disabled="!hasFilters" @click="clearFilters">
      <RotateCcw class="size-3.5" /> Limpar filtros
    </button>
  </section>
</template>

<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import type { StoreCategory } from '~/composables/useStoreApi'
const props = defineProps<{
  search: string
  category: string
  currency: string
  sort: string
  categories: StoreCategory[]
}>()
const emit = defineEmits<{
  'update:category': [value: string]
  'update:currency': [value: string]
  'update:sort': [value: string]
  clear: []
  applied: []
}>()
const applyFilter = (field: 'category' | 'currency' | 'sort', event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (field === 'category') emit('update:category', value)
  else if (field === 'currency') emit('update:currency', value)
  else emit('update:sort', value)
  emit('applied')
}
const clearFilters = () => {
  emit('clear')
  emit('applied')
}
const hasFilters = computed(() =>
  Boolean(props.search || props.category || props.currency || props.sort !== 'featured')
)
</script>

<style scoped>
.store-filters {
  border: 1px solid #d5ccc3;
  background: #faf7f2;
}
.store-filters header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 17px;
  border-bottom: 1px solid #d5ccc3;
  color: #540809;
  text-transform: uppercase;
}
.store-filters header strong {
  font-family: Cinzel, serif;
  font-size: 15px;
}
.filter-section {
  padding: 16px;
  border-bottom: 1px solid #e2dad2;
}
.filter-section > label {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  color: #540809;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.store-control {
  width: 100%;
  height: 38px;
  border: 1px solid #cfc5bc;
  border-radius: 3px;
  background: #f3f0ea;
  padding: 0 10px;
  color: #27211e;
  font-size: 11px;
}
.store-control:focus {
  border-color: #73090b;
}
.clear-button {
  display: flex;
  width: calc(100% - 32px);
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 16px;
  border: 1px solid #a88f87;
  color: #5d0b0f;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}
.clear-button:disabled {
  opacity: 0.45;
}
.clear-button:not(:disabled):hover {
  background: #73090b;
  color: #fff;
}
</style>
