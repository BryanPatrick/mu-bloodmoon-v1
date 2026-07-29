<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Auditoria"
        title="Ações administrativas"
        description="Registro imutável de alterações, responsáveis, resultados e contexto de cada operação administrativa."
      >
        <UButton color="neutral" variant="soft" :loading="loading" @click="load">
          <RefreshCw class="size-4" />
          Atualizar
        </UButton>
      </AdminObservabilityHeader>

      <AdminObservabilityNav />

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{{ card.label }}</p>
          <p class="mt-2 font-display text-2xl font-black">{{ card.value }}</p>
        </article>
      </section>

      <form class="bm-panel grid gap-3 rounded-md p-3 lg:grid-cols-[1fr_180px_160px_160px_auto]" @submit.prevent="applyFilters">
        <input v-model="filters.search" class="bm-admin-input" type="search" placeholder="Buscar ação, entidade, usuário ou correlação">
        <input v-model="filters.module" class="bm-admin-input" placeholder="Módulo">
        <select v-model="filters.result" class="bm-admin-input">
          <option value="">Todos os resultados</option>
          <option v-for="value in results" :key="value" :value="value">{{ value }}</option>
        </select>
        <select v-model="filters.severity" class="bm-admin-input">
          <option value="">Todas severidades</option>
          <option v-for="value in severities" :key="value" :value="value">{{ value }}</option>
        </select>
        <div class="flex gap-2">
          <UButton type="submit">Filtrar</UButton>
          <UButton color="neutral" variant="ghost" square aria-label="Limpar filtros" @click="clearFilters">
            <X class="size-4" />
          </UButton>
        </div>
      </form>

      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
        {{ errorMessage }}
      </p>

      <section v-if="items.length" class="overflow-hidden rounded-md border border-white/10 bg-white/[0.025]">
        <div class="hidden grid-cols-[130px_110px_1fr_150px_110px_90px] gap-3 border-b border-white/10 bg-white/[0.045] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45 xl:grid">
          <span>Data</span><span>Módulo</span><span>Ação e entidade</span><span>Responsável</span><span>Resultado</span><span>Detalhes</span>
        </div>
        <article v-for="item in items" :key="item.id" class="grid gap-3 border-b border-white/8 px-4 py-3 last:border-0 xl:grid-cols-[130px_110px_1fr_150px_110px_90px] xl:items-center">
          <p class="text-xs font-bold text-white/60">{{ formatDate(item.createdAt) }}</p>
          <span class="w-fit rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black uppercase text-white/65">{{ item.module }}</span>
          <div class="min-w-0">
            <p class="truncate text-xs font-black uppercase text-ember">{{ item.action }}</p>
            <p class="mt-1 truncate text-xs font-semibold text-white/55">{{ item.targetType }}{{ item.targetId ? ` · ${item.targetId}` : '' }}</p>
            <p v-if="item.correlationId" class="mt-1 truncate font-mono text-[10px] text-white/35">ID {{ item.correlationId }}</p>
          </div>
          <div>
            <p class="text-xs font-black">{{ item.actorUsername || 'system' }}</p>
            <p class="text-[10px] uppercase text-white/40">{{ item.actorRole || 'SYSTEM' }}</p>
          </div>
          <span class="w-fit rounded-sm px-2 py-1 text-[10px] font-black" :class="resultClass(item.result)">{{ item.result }}</span>
          <UButton color="neutral" variant="soft" size="xs" @click="selected = item">Ver</UButton>
        </article>
      </section>

      <AdminEmptyState
        v-else-if="!loading"
        title="Nenhuma ação encontrada"
        description="Ajuste os filtros ou aguarde novas operações administrativas."
        :icon="FileSearch"
      />

      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-white/45">{{ total }} registros</p>
        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="soft" square :disabled="page <= 1 || loading" aria-label="Página anterior" @click="changePage(page - 1)"><ChevronLeft class="size-4" /></UButton>
          <span class="text-xs font-black">Página {{ page }} de {{ totalPages }}</span>
          <UButton color="neutral" variant="soft" square :disabled="page >= totalPages || loading" aria-label="Próxima página" @click="changePage(page + 1)"><ChevronRight class="size-4" /></UButton>
        </div>
      </div>

      <UModal v-model:open="detailsOpen" title="Detalhes da auditoria" description="Dados protegidos e histórico da operação.">
        <template #body>
          <div v-if="selected" class="grid gap-3 text-sm">
            <div class="grid gap-3 sm:grid-cols-2">
              <AuditField label="Ação" :value="selected.action" />
              <AuditField label="Módulo" :value="selected.module" />
              <AuditField label="Entidade" :value="`${selected.targetType}:${selected.targetId || '-'}`" />
              <AuditField label="Correlação" :value="selected.correlationId || '-'" mono />
              <AuditField label="Motivo" :value="selected.reason || '-'" />
              <AuditField label="Resultado" :value="selected.result" />
            </div>
            <AuditJsonBlock title="Antes" :value="selected.beforeData" />
            <AuditJsonBlock title="Depois" :value="selected.afterData" />
            <AuditJsonBlock title="Metadados" :value="selected.metadata" />
          </div>
        </template>
      </UModal>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, FileSearch, RefreshCw, X } from 'lucide-vue-next'
import type { AuditRecord } from '~/composables/useAdminObservabilityApi'

useSeoMeta({ title: 'Ações administrativas' })

const api = useAdminObservabilityApi()
const { loadSession } = useAuth()
const items = ref<AuditRecord[]>([])
const selected = ref<AuditRecord | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = 30
const summary = ref<Record<string, number | boolean>>({})
const filters = reactive({ search: '', module: '', result: '', severity: '' })
const results = ['SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED']
const severities = ['info', 'warning', 'error', 'critical']
const detailsOpen = computed({
  get: () => Boolean(selected.value),
  set: (value) => { if (!value) selected.value = null }
})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const summaryCards = computed(() => [
  { label: 'Auditorias', value: Number(summary.value.auditEvents || 0) },
  { label: 'Trabalhos', value: Number(summary.value.workLogs || 0) },
  { label: 'Eventos', value: Number(summary.value.operationalEvents || 0) },
  { label: 'Erros abertos', value: Number(summary.value.openErrors || 0) },
  { label: 'Críticos', value: Number(summary.value.criticalErrors || 0) },
  { label: 'Alertas', value: Number(summary.value.openAlerts || 0) }
])

onMounted(async () => {
  loadSession()
  await load()
})

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [response, summaryResponse] = await Promise.all([
      api.audit({ ...filters, page: page.value, pageSize }),
      api.summary()
    ])
    items.value = response.items
    total.value = response.total
    summary.value = summaryResponse
  } catch (error) {
    items.value = []
    errorMessage.value = 'Não foi possível carregar a auditoria pela API.'
    console.error(error)
  } finally {
    loading.value = false
  }
}

const applyFilters = async () => {
  page.value = 1
  await load()
}
const clearFilters = async () => {
  Object.assign(filters, { search: '', module: '', result: '', severity: '' })
  page.value = 1
  await load()
}
const changePage = async (next: number) => {
  page.value = next
  await load()
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const resultClass = (result: string) => ({
  'bg-emerald-400/15 text-emerald-200': result === 'SUCCESS',
  'bg-red-400/15 text-red-200': result === 'FAILURE' || result === 'DENIED',
  'bg-amber-400/15 text-amber-100': result === 'PARTIAL'
})
</script>

<style scoped>
.bm-admin-input {
  min-height: 2.5rem;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding: 0 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  outline: none;
}
.bm-admin-input:focus { border-color: rgb(248 113 113 / 0.55); }
.bm-admin-input option { background: #111; color: white; }
</style>
