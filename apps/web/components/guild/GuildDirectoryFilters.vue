<template>
  <section class="guild-filters" aria-label="Filtros de guildas">
    <header><BloodMoonIcon name="systems" /><strong>Filtros</strong></header>

    <div class="filter-section">
      <label for="guild-recruitment"><BloodMoonIcon name="items" /> Recrutamento</label>
      <select id="guild-recruitment" class="guild-control" :value="recruitment" @change="$emit('update:recruitment', ($event.target as HTMLSelectElement).value)">
        <option value="">Todos</option>
        <option value="OPEN">Aberto</option>
        <option value="APPROVAL_REQUIRED">Requer aprovação</option>
        <option value="INVITE_ONLY">Somente convite</option>
        <option value="CLOSED">Fechado</option>
      </select>
    </div>

    <div class="filter-section">
      <label for="guild-sort"><BloodMoonIcon name="progress" /> Ordenar</label>
      <select id="guild-sort" class="guild-control" :value="sort" @change="$emit('update:sort', ($event.target as HTMLSelectElement).value)">
        <option value="newest">Mais recentes</option>
        <option value="level">Maior nível</option>
        <option value="members">Mais membros</option>
        <option value="name">Nome (A-Z)</option>
      </select>
    </div>

    <div class="filter-section">
      <label><BloodMoonIcon name="xp" /> Foco</label>
      <div class="guild-focus-grid">
        <button
          v-for="tag in focusTags"
          :key="tag.value"
          type="button"
          class="guild-focus-chip"
          :class="{ 'is-active': focus === tag.value }"
          @click="$emit('update:focus', focus === tag.value ? '' : tag.value)"
        >
          {{ tag.label }}
        </button>
      </div>
    </div>

    <button class="clear-button" type="button" :disabled="!hasFilters" @click="$emit('clear')">
      <RotateCcw class="size-3.5" /> Limpar filtros
    </button>
  </section>
</template>

<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  search: string
  recruitment: string
  focus: string
  sort: string
}>()
defineEmits<{
  'update:search': [value: string]
  'update:recruitment': [value: string]
  'update:focus': [value: string]
  'update:sort': [value: string]
  clear: []
}>()

const focusTags = [
  { value: 'PVP', label: 'PvP' },
  { value: 'PVE', label: 'PvE' },
  { value: 'CASTLE_SIEGE', label: 'Castle Siege' },
  { value: 'BOSS', label: 'Boss' },
  { value: 'FARM', label: 'Farm' },
  { value: 'EVENTS', label: 'Eventos' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'COMPETITIVE', label: 'Competitivo' }
]

const hasFilters = computed(() => Boolean(props.search || props.recruitment || props.focus || props.sort !== 'newest'))
</script>

<style scoped>
.guild-filters { border: 1px solid var(--bm-border-strong); background: var(--bm-surface-soft); border-radius: 8px; }
.guild-filters header { display: flex; align-items: center; gap: 10px; padding: 17px; border-bottom: 1px solid var(--bm-border-strong); color: var(--bm-wine); text-transform: uppercase; }
.guild-filters header strong { font-family: Cinzel, serif; font-size: 15px; }
.filter-section { padding: 16px; border-bottom: 1px solid var(--bm-border); }
.filter-section > label { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; color: var(--bm-wine); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.guild-control { width: 100%; height: 38px; border: 1px solid var(--bm-border); border-radius: 3px; background: var(--bm-surface); padding: 0 10px; color: var(--bm-text); font-size: 11px; }
.guild-control:focus { border-color: var(--bm-red); }
.guild-focus-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.guild-focus-chip { border: 1px solid var(--bm-border); border-radius: 999px; padding: 5px 11px; color: var(--bm-muted); font-size: 10px; font-weight: 800; text-transform: uppercase; background: transparent; }
.guild-focus-chip.is-active { border-color: var(--bm-red); background: var(--bm-red); color: #fff; }
.clear-button { display: flex; width: calc(100% - 32px); min-height: 36px; align-items: center; justify-content: center; gap: 7px; margin: 16px; border: 1px solid var(--bm-border-strong); color: var(--bm-wine); font-size: 10px; font-weight: 900; text-transform: uppercase; background: transparent; border-radius: 4px; }
.clear-button:disabled { opacity: 0.45; }
.clear-button:not(:disabled):hover { background: var(--bm-red); color: #fff; }
</style>
