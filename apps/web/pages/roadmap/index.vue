<template>
  <div class="min-h-screen bg-black text-white">
    <header class="border-b border-white/10 px-6 py-12 lg:px-12">
      <div class="mx-auto max-w-[1500px]">
        <p class="bm-kicker">Evolucao transparente</p>
        <div class="mt-3 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 class="font-display text-4xl font-black uppercase sm:text-6xl">{{ overview.presentation.title }}</h1>
            <p class="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/65">{{ overview.presentation.purpose }}</p>
          </div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
            Atualizado em {{ formatDate(overview.presentation.lastUpdatedAt) }}
          </p>
        </div>
        <div class="mt-8 border-l-2 border-ember pl-5">
          <p class="text-xs font-black uppercase tracking-[0.2em] text-ember">Visao do projeto</p>
          <p class="mt-2 max-w-4xl font-display text-xl font-bold text-white/85">{{ overview.presentation.vision }}</p>
        </div>
      </div>
    </header>

    <main class="mx-auto grid max-w-[1500px] gap-10 px-6 py-10 lg:px-12">
      <section class="grid gap-3 border-b border-white/10 pb-6 md:grid-cols-[1fr_220px_220px]">
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
          <div><p class="bm-kicker">{{ horizon.caption }}</p><h2 class="mt-2 font-display text-3xl font-black uppercase">{{ horizon.label }}</h2></div>
          <span class="text-xs font-black text-white/40">{{ grouped[horizon.value]?.length || 0 }} iniciativas</span>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="item in grouped[horizon.value]" :key="item.id" class="bm-panel group overflow-hidden rounded-md border border-white/10">
            <div v-if="item.image" class="aspect-[16/7] overflow-hidden bg-zinc-950">
              <img :src="item.image" :alt="item.title" class="size-full object-cover transition duration-500 group-hover:scale-[1.025]">
            </div>
            <div class="p-5">
              <div class="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]">
                <span class="bg-ember/15 px-2 py-1 text-ember">{{ item.category }}</span>
                <span class="bg-white/8 px-2 py-1 text-white/55">{{ statusLabel[item.status] }}</span>
                <span class="ml-auto text-white/35">{{ item.priority }}</span>
              </div>
              <h3 class="mt-4 font-display text-2xl font-black">{{ item.title }}</h3>
              <p class="mt-3 text-sm font-semibold leading-6 text-white/60">{{ item.summary }}</p>
              <div class="mt-5">
                <div class="flex justify-between text-[11px] font-black uppercase tracking-[0.12em] text-white/45"><span>Progresso</span><span>{{ item.progress }}%</span></div>
                <div class="mt-2 h-1.5 overflow-hidden bg-white/10"><span class="block h-full bg-ember" :style="{ width: `${item.progress}%` }" /></div>
              </div>
              <div class="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span class="text-xs font-bold text-white/45">{{ item.estimatedPeriod || 'Periodo em definicao' }}</span>
                <NuxtLink :to="`/roadmap/${item.slug}`" class="text-xs font-black uppercase tracking-[0.12em] text-ember">Detalhes</NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="!filteredItems.length" class="border border-dashed border-white/15 p-12 text-center">
        <h2 class="font-display text-2xl font-black">Nenhuma iniciativa encontrada</h2>
        <p class="mt-2 text-sm text-white/50">Ajuste os filtros para explorar o roadmap.</p>
      </section>

      <section v-if="overview.history.length" class="border-t border-white/10 pt-10">
        <p class="bm-kicker">Historico de entregas</p>
        <h2 class="mt-2 font-display text-3xl font-black uppercase">O que mudou</h2>
        <div class="mt-5 grid gap-3">
          <article v-for="update in overview.history.slice(0, 12)" :key="update.id" class="grid gap-2 border-l border-white/15 py-2 pl-5 md:grid-cols-[180px_1fr]">
            <div><p class="text-xs font-black text-ember">{{ formatDate(update.createdAt) }}</p><p class="mt-1 text-xs text-white/35">{{ update.roadmapTitle }}</p></div>
            <div><h3 class="font-display text-lg font-black">{{ update.title }}</h3><p class="mt-1 text-sm leading-6 text-white/55">{{ update.content }}</p></div>
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
.roadmap-field { min-height: 44px; border: 1px solid rgb(255 255 255 / .12); background: rgb(255 255 255 / .055); padding: 0 14px; color: white; font-size: 13px; font-weight: 700; outline: none; }
.roadmap-field:focus { border-color: rgb(230 95 58 / .75); }
.roadmap-field option { background: #090909; }
</style>
