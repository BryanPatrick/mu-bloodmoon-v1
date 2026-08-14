<template>
  <div class="roadmap-page">
    <header class="roadmap-header px-6 py-12 lg:px-12">
      <div class="mx-auto max-w-[1500px]">
        <p class="bm-kicker">Evolucao transparente</p>
        <div class="mt-3 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 class="bm-heading font-display text-4xl font-black uppercase sm:text-6xl">{{ overview.presentation.title }}</h1>
            <p class="bm-copy mt-4 max-w-3xl font-semibold">{{ overview.presentation.purpose }}</p>
          </div>
          <p class="roadmap-muted text-xs font-bold uppercase tracking-[0.18em]">
            Atualizado em {{ formatDate(overview.presentation.lastUpdatedAt) }}
          </p>
        </div>
        <div class="mt-8 border-l-2 border-[var(--bm-red)] pl-5">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-[var(--bm-red)]">Visao do projeto</p>
          <p class="bm-heading mt-2 max-w-4xl font-display text-xl font-bold">{{ overview.presentation.vision }}</p>
        </div>
      </div>
    </header>

    <main class="mx-auto grid max-w-[1500px] gap-10 px-6 py-10 lg:px-12">
      <section class="roadmap-filters grid gap-3 pb-6 md:grid-cols-[1fr_220px_220px]">
        <input v-model="filters.search" class="roadmap-field" placeholder="Buscar iniciativa" type="search">
        <select v-model="filters.horizon" class="roadmap-field">
          <option value="">Todos os horizontes</option>
          <option v-for="item in horizons" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.category" class="roadmap-field">
          <option value="">Todas as categorias</option>
          <option v-for="category in overview.categories" :key="category">{{ category }}</option>
        </select>
      </section>

      <section v-for="horizon in visibleHorizons" :key="horizon.value" class="grid gap-5">
        <div class="flex items-end justify-between gap-4">
          <div><p class="bm-kicker">{{ horizon.caption }}</p><h2 class="bm-heading mt-2 font-display text-3xl font-black uppercase">{{ horizon.label }}</h2></div>
          <span class="roadmap-muted text-xs font-black">{{ grouped[horizon.value]?.length || 0 }} iniciativas</span>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="item in grouped[horizon.value]" :key="item.id" class="bm-panel roadmap-card group overflow-hidden rounded-md">
            <div v-if="item.image" class="roadmap-card__image aspect-[16/7] overflow-hidden">
              <img :src="item.image" :alt="item.title" class="size-full object-cover transition duration-500 group-hover:scale-[1.025]">
            </div>
            <div class="p-5">
              <div class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]">
                <span class="roadmap-tag roadmap-tag--category">{{ item.category }}</span>
                <span class="roadmap-tag roadmap-tag--status">{{ statusLabel[item.status] }}</span>
                <span class="roadmap-muted ml-auto">{{ item.priority }}</span>
              </div>
              <h3 class="bm-heading mt-4 font-display text-2xl font-black">{{ item.title }}</h3>
              <p class="bm-copy mt-3 font-semibold">{{ item.summary }}</p>
              <div class="mt-5">
                <div class="roadmap-muted flex justify-between text-[11px] font-black uppercase tracking-[0.12em]"><span>Progresso</span><span>{{ item.progress }}%</span></div>
                <div class="roadmap-progress-track mt-2 h-1.5 overflow-hidden"><span class="block h-full bg-[var(--bm-red)]" :style="{ width: `${item.progress}%` }" /></div>
              </div>
              <div class="roadmap-card__footer mt-5 flex items-center justify-between pt-4">
                <span class="roadmap-muted text-xs font-bold">{{ item.estimatedPeriod || 'Periodo em definicao' }}</span>
                <NuxtLink :to="`/roadmap/${item.slug}`" class="text-xs font-black uppercase tracking-[0.12em] text-[var(--bm-red)]">Detalhes</NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="!filteredItems.length" class="roadmap-empty p-12 text-center">
        <h2 class="bm-heading font-display text-2xl font-black">Nenhuma iniciativa encontrada</h2>
        <p class="bm-copy mt-2">Ajuste os filtros para explorar o roadmap.</p>
      </section>

      <section v-if="overview.history.length" class="roadmap-history pt-10">
        <p class="bm-kicker">Historico de entregas</p>
        <h2 class="bm-heading mt-2 font-display text-3xl font-black uppercase">O que mudou</h2>
        <div class="mt-5 grid gap-3">
          <article v-for="update in overview.history.slice(0, 12)" :key="update.id" class="roadmap-history__item grid gap-2 py-2 pl-5 md:grid-cols-[180px_1fr]">
            <div><p class="text-xs font-black text-[var(--bm-red)]">{{ formatDate(update.createdAt) }}</p><p class="roadmap-muted mt-1 text-xs">{{ update.roadmapTitle }}</p></div>
            <div><h3 class="bm-heading font-display text-lg font-black">{{ update.title }}</h3><p class="bm-copy mt-1">{{ update.content }}</p></div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { RoadmapHorizon, RoadmapItem } from '~/composables/useRoadmapApi'

useSeoMeta({ title: 'Roadmap Blood Moon', description: 'Prioridades, progresso e entregas do Blood Moon.' })
const api = useRoadmapApi()
const empty = { presentation: { title: 'Roadmap Blood Moon', purpose: '', vision: '', lastUpdatedAt: null }, categories: [], items: [], delivered: [], history: [] }
const overview = ref<Awaited<ReturnType<typeof api.publicOverview>>>(empty)
try { overview.value = await api.publicOverview() } catch { overview.value = empty }
const filters = reactive({ search: '', category: '', horizon: '' })
const horizons: Array<{ value: RoadmapHorizon; label: string; caption: string }> = [
  { value: 'NOW', label: 'Agora', caption: 'Prioridade atual' },
  { value: 'NEXT', label: 'Proximo', caption: 'Na sequencia' },
  { value: 'FUTURE', label: 'Futuro', caption: 'Visao de longo prazo' },
  { value: 'ANALYSIS', label: 'Em analise', caption: 'Em avaliacao' },
  { value: 'COMPLETED', label: 'Concluido', caption: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado', caption: 'Historico de decisoes' }
]
const statusLabel: Record<string, string> = {
  PROPOSED: 'Proposto', ANALYSIS: 'Em analise', PLANNED: 'Planejado', DESIGN: 'Em design',
  DEVELOPMENT: 'Em desenvolvimento', TESTING: 'Em testes', CLOSED_BETA: 'Beta fechado',
  PUBLIC_BETA: 'Beta publico', READY: 'Pronto', RELEASED: 'Lancado', PAUSED: 'Pausado',
  POSTPONED: 'Adiado', CANCELLED: 'Cancelado'
}
const filteredItems = computed(() => overview.value.items.filter((item: RoadmapItem) => {
  const search = filters.search.trim().toLowerCase()
  return (!filters.category || item.category === filters.category)
    && (!filters.horizon || item.horizon === filters.horizon)
    && (!search || [item.title, item.summary, item.description, item.category, ...(item.tags || [])].join(' ').toLowerCase().includes(search))
}))
const grouped = computed(() => Object.fromEntries(horizons.map((horizon) => [horizon.value, filteredItems.value.filter((item) => item.horizon === horizon.value)])) as Record<RoadmapHorizon, RoadmapItem[]>)
const visibleHorizons = computed(() => horizons.filter((horizon) => grouped.value[horizon.value]?.length))
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) : 'sem publicacao'
</script>

<style scoped>
.roadmap-page { min-height: 100vh; background: var(--bm-page-bg); color: var(--bm-text); }
.roadmap-header { border-bottom: 1px solid var(--bm-border); background: linear-gradient(110deg, var(--bm-surface-soft), var(--bm-surface)); }
.roadmap-muted { color: var(--bm-muted); }
.roadmap-filters { border-bottom: 1px solid var(--bm-border); }
.roadmap-field { min-height: 44px; border: 1px solid var(--bm-border-strong); border-radius: 7px; background: var(--bm-surface-strong); padding: 0 14px; color: var(--bm-text); font-size: 13px; font-weight: 700; outline: none; }
.roadmap-field:focus { border-color: var(--bm-red); }
.roadmap-field option { background: var(--bm-surface-strong); color: var(--bm-text); }
.roadmap-card__image { background: var(--bm-surface); }
.roadmap-tag { border-radius: 5px; padding: 0.25rem 0.5rem; }
.roadmap-tag--category { background: rgb(159 2 2 / 0.12); color: var(--bm-red); }
.roadmap-tag--status { background: var(--bm-surface); color: var(--bm-muted); }
.roadmap-progress-track { border-radius: 999px; background: var(--bm-border); }
.roadmap-card__footer { border-top: 1px solid var(--bm-border); }
.roadmap-empty { border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); }
.roadmap-history { border-top: 1px solid var(--bm-border); }
.roadmap-history__item { border-left: 1px solid var(--bm-border); }
</style>
