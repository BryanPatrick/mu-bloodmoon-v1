<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminRoadmapView)" class="grid gap-6">
      <div class="flex flex-col gap-6 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="max-w-4xl">
          <p class="bm-kicker">Desenvolvimento</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">O que falta implementar</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Visao organizada das proximas entregas do site com base nas referencias, imagens e dados tecnicos ja coletados.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[520px]">
          <select v-model="activeArea" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todas">Todas as areas</option>
            <option v-for="area in roadmapAreas" :key="area" class="bg-zinc-950 text-white" :value="area">{{ area }}</option>
          </select>
          <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Todos status</option>
            <option v-for="status in roadmapStatusLabels" :key="status" class="bg-zinc-950 text-white" :value="status">{{ status }}</option>
          </select>
          <input
            v-model="query"
            class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar"
            type="search"
          >
        </div>
      </div>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <section class="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="priority in roadmapPriorityLabels"
            :key="priority"
            class="bm-button-glass rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition"
            :class="{ 'bm-nav-link-active': activePriority === priority }"
            type="button"
            @click="activePriority = activePriority === priority ? 'Todas' : priority"
          >
            Prioridade {{ priority }}
          </button>
        </div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-white/45">
          {{ filteredItems.length }} de {{ implementationRoadmap.length }} itens
        </p>
      </section>

      <section class="grid gap-6">
        <div v-for="group in groupedItems" :key="group.area" class="grid gap-4">
          <div class="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">Area</p>
              <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">{{ group.area }}</h2>
            </div>
            <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ group.items.length }} itens</span>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <article v-for="item in group.items" :key="item.title" class="bm-panel rounded-md p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="font-display text-2xl font-black leading-tight text-white">{{ item.title }}</h3>
                  <p class="mt-3 text-sm font-semibold leading-7 text-white/68">{{ item.summary }}</p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(item.status)">
                    {{ item.status }}
                  </span>
                  <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="priorityClass(item.priority)">
                    {{ item.priority }}
                  </span>
                </div>
              </div>

              <div class="mt-5 grid gap-4 lg:grid-cols-2">
                <div class="rounded-md border border-white/10 bg-black/20 p-4">
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-ember">Base coletada</p>
                  <ul class="mt-3 grid gap-2">
                    <li v-for="entry in item.collectedData" :key="entry" class="flex gap-2 text-sm font-semibold leading-6 text-white/68">
                      <span class="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
                      <span>{{ entry }}</span>
                    </li>
                  </ul>
                </div>

                <div class="rounded-md border border-white/10 bg-black/20 p-4">
                  <p class="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Proximos passos</p>
                  <ol class="mt-3 grid gap-2">
                    <li v-for="(step, index) in item.nextSteps" :key="step" class="flex gap-3 text-sm font-semibold leading-6 text-white/68">
                      <span class="grid size-5 shrink-0 place-items-center rounded-sm bg-white/10 text-[10px] font-black text-white">{{ index + 1 }}</span>
                      <span>{{ step }}</span>
                    </li>
                  </ol>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div v-if="filteredItems.length === 0" class="bm-panel rounded-md p-8 text-center">
        <p class="bm-kicker">Nada encontrado</p>
        <h2 class="mt-2 font-display text-3xl font-black uppercase">Nenhuma pendencia nesse filtro</h2>
        <p class="mt-3 text-sm font-semibold text-white/60">Ajuste area, status, prioridade ou busca para consultar outros itens.</p>
      </div>
    </div>

    <div v-else class="bm-panel rounded-md p-6">
      <p class="bm-kicker">Administracao</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Acesso restrito</h1>
      <p class="mt-3 text-sm font-semibold leading-7 text-white/68">
        A lista de implementacoes fica disponivel apenas para contas administrativas.
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { implementationRoadmap, roadmapAreas, roadmapPriorityLabels, roadmapStatusLabels, type RoadmapPriority, type RoadmapStatus } from '~/data/implementationRoadmap'
import { permissions } from '~/data/security'

const { hasPermission, loadSession } = useAuth()

useSeoMeta({ title: 'O que falta implementar' })

onMounted(loadSession)

const activeArea = ref('Todas')
const activeStatus = ref<RoadmapStatus | 'Todos'>('Todos')
const activePriority = ref<RoadmapPriority | 'Todas'>('Todas')
const query = ref('')

const filteredItems = computed(() => {
  const search = query.value.trim().toLowerCase()

  return implementationRoadmap.filter((item) => {
    const matchesArea = activeArea.value === 'Todas' || item.area === activeArea.value
    const matchesStatus = activeStatus.value === 'Todos' || item.status === activeStatus.value
    const matchesPriority = activePriority.value === 'Todas' || item.priority === activePriority.value
    const haystack = [
      item.title,
      item.area,
      item.status,
      item.priority,
      item.summary,
      ...item.collectedData,
      ...item.nextSteps
    ].join(' ').toLowerCase()
    const matchesSearch = !search || haystack.includes(search)

    return matchesArea && matchesStatus && matchesPriority && matchesSearch
  })
})

const groupedItems = computed(() => {
  return roadmapAreas
    .map((area) => ({
      area,
      items: filteredItems.value.filter((item) => item.area === area)
    }))
    .filter((group) => group.items.length > 0)
})

const summaryCards = computed(() => [
  { label: 'Total mapeado', value: implementationRoadmap.length },
  { label: 'Prioridade alta', value: implementationRoadmap.filter((item) => item.priority === 'Alta').length },
  { label: 'Com base coletada', value: implementationRoadmap.filter((item) => item.status === 'Base coletada').length },
  { label: 'Em andamento', value: implementationRoadmap.filter((item) => item.status === 'Em andamento').length },
  { label: 'Bloqueados', value: implementationRoadmap.filter((item) => item.status === 'Bloqueado').length }
])

const statusClass = (status: RoadmapStatus) => {
  const classes: Record<RoadmapStatus, string> = {
    'A fazer': 'bg-white/10 text-white/72',
    'Em andamento': 'bg-sky-500/15 text-sky-100',
    'Bloqueado': 'bg-blood-700/30 text-blood-100',
    'Base coletada': 'bg-emerald-500/15 text-emerald-100',
    Validar: 'bg-amber-500/15 text-amber-100'
  }

  return classes[status]
}

const priorityClass = (priority: RoadmapPriority) => {
  const classes: Record<RoadmapPriority, string> = {
    Alta: 'bg-blood-700/35 text-blood-100',
    Media: 'bg-ember/20 text-amber-100',
    Baixa: 'bg-white/10 text-white/60'
  }

  return classes[priority]
}
</script>
