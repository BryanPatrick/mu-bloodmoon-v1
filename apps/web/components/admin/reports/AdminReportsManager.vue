<template>
  <section class="space-y-4">
    <header class="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="bm-kicker">Inteligência operacional</p>
        <h1 class="font-display text-2xl font-black">Central de relatórios</h1>
        <p class="mt-1 max-w-3xl text-xs text-white/55">
          Indicadores administrativos com filtros, permissões, exportação e rastreabilidade.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="canExport"
          icon="i-lucide-file-spreadsheet"
          color="neutral"
          variant="soft"
          :loading="exporting === 'csv'"
          @click="download('csv')"
        >
          CSV
        </UButton>
        <UButton
          v-if="canExport"
          icon="i-lucide-sheet"
          color="neutral"
          variant="soft"
          :loading="exporting === 'xlsx'"
          @click="download('xlsx')"
        >
          XLSX
        </UButton>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="loading" @click="loadReport">
          Atualizar
        </UButton>
      </div>
    </header>

    <div v-if="options.categories.length" class="grid gap-3">
      <nav class="flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Categorias dos relatórios">
        <button
          v-for="item in options.categories"
          :key="item.key"
          class="shrink-0 border-b-2 px-3 py-2 text-xs font-black transition"
          :class="filters.category === item.key ? 'border-ember text-white' : 'border-transparent text-white/45 hover:text-white'"
          type="button"
          @click="selectCategory(item.key)"
        >
          {{ item.label }}
        </button>
      </nav>

      <form class="bm-panel grid gap-2 rounded-md p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" @submit.prevent="loadReport">
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Data inicial
          <input v-model="filters.dateFrom" type="date" class="bm-admin-input mt-1">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Data final
          <input v-model="filters.dateTo" type="date" class="bm-admin-input mt-1">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Módulo
          <input v-model.trim="filters.module" class="bm-admin-input mt-1" placeholder="Todos">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Colaborador
          <select v-model="filters.userId" class="bm-admin-input mt-1">
            <option value="">Todos</option>
            <option v-for="admin in options.administrators" :key="admin.id" :value="admin.id">
              {{ admin.name || admin.username }}
            </option>
          </select>
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Status
          <input v-model.trim="filters.status" class="bm-admin-input mt-1" placeholder="Todos">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Prioridade
          <input v-model.trim="filters.priority" class="bm-admin-input mt-1" placeholder="Todas">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Tipo
          <input v-model.trim="filters.type" class="bm-admin-input mt-1" placeholder="Todos">
        </label>
        <label class="text-[10px] font-black uppercase tracking-wider text-white/42">
          Resultado
          <input v-model.trim="filters.result" class="bm-admin-input mt-1" placeholder="Todos">
        </label>
        <div class="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
          <UButton type="submit" icon="i-lucide-list-filter" :loading="loading">Aplicar filtros</UButton>
          <UButton type="button" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" @click="resetFilters">
            Limpar
          </UButton>
          <span v-if="report" class="ml-auto self-center text-[10px] text-white/35">
            Gerado em {{ formatDateTime(report.generatedAt) }}
          </span>
        </div>
      </form>
    </div>

    <AdminEmptyState
      v-if="!loading && !options.categories.length"
      title="Nenhum relatório disponível"
      description="Sua conta não possui permissão para visualizar categorias de relatórios."
    />

    <div v-if="loading && !report" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <div v-for="item in 5" :key="item" class="bm-panel h-20 animate-pulse rounded-md bg-white/5" />
    </div>

    <template v-if="report">
      <section>
        <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p class="bm-kicker">{{ report.title }}</p>
            <h2 class="font-display text-lg font-black">Resumo do período</h2>
          </div>
          <div class="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider">
            <span class="rounded border border-white/10 bg-white/5 px-2 py-1 text-white/55">
              {{ formatDate(report.period.from) }} a {{ formatDate(report.period.to) }}
            </span>
            <span
              v-if="report.category === 'store' || report.category === 'marketplace'"
              class="rounded border px-2 py-1"
              :class="report.financialVisible ? 'border-emerald-400/25 text-emerald-300' : 'border-amber-400/25 text-amber-300'"
            >
              {{ report.financialVisible ? 'Financeiro autorizado' : 'Financeiro protegido' }}
            </span>
          </div>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
          <div
            v-for="item in report.summary"
            :key="item.key"
            class="bm-panel min-h-20 rounded-md p-3"
          >
            <small class="block text-[9px] font-black uppercase tracking-wider text-white/38">{{ item.label }}</small>
            <strong class="mt-2 block break-words text-lg">{{ formatValue(item.value) }}</strong>
            <span v-if="item.sensitive" class="mt-1 block text-[9px] uppercase tracking-wider text-amber-300/75">Dado restrito</span>
          </div>
        </div>
      </section>

      <section v-for="group in report.groups" :key="group.key" class="bm-panel overflow-hidden rounded-md">
        <header class="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
          <h2 class="text-xs font-black uppercase tracking-wider text-white/75">{{ group.label }}</h2>
          <span class="text-[10px] text-white/35">{{ group.rows.length }} registros</span>
        </header>
        <div v-if="group.rows.length" class="overflow-x-auto">
          <table class="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr class="border-b border-white/8 bg-white/[0.025] text-[9px] uppercase tracking-wider text-white/38">
                <th v-for="column in columns(group.rows)" :key="column" class="whitespace-nowrap px-3 py-2">
                  {{ columnLabel(column) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in group.rows" :key="`${group.key}-${index}`" class="border-b border-white/6 last:border-0">
                <td v-for="column in columns(group.rows)" :key="column" class="max-w-sm px-3 py-2 align-top text-white/65">
                  <span class="line-clamp-3 break-words">{{ formatValue(row[column]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="px-3 py-5 text-center text-xs text-white/38">Sem registros para os filtros selecionados.</p>
      </section>

      <aside v-if="report.notes?.length" class="border-l-2 border-ember/50 bg-ember/5 px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-wider text-ember">Notas de leitura</p>
        <ul class="mt-2 grid gap-1 text-xs text-white/55">
          <li v-for="note in report.notes" :key="note">• {{ note }}</li>
        </ul>
      </aside>
    </template>

    <AdminEmptyState
      v-if="errorMessage"
      title="Não foi possível gerar o relatório"
      :description="errorMessage"
    />
  </section>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type {
  AdminReportCategory,
  AdminReportOptions,
  AdminReportQuery,
  AdminReportResult
} from '~/composables/useAdminReportsApi'

const api = useAdminReportsApi()
const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuth()
const canExport = computed(() => hasPermission(permissions.adminReportsExport))
const loading = ref(false)
const exporting = ref<'' | 'csv' | 'xlsx'>('')
const errorMessage = ref('')
const report = ref<AdminReportResult | null>(null)
const options = ref<AdminReportOptions>({
  categories: [],
  administrators: [],
  formats: [],
  financialVisible: false
})

const defaultDates = () => {
  const today = new Date()
  const from = new Date(today.getTime() - 30 * 86400000)
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: today.toISOString().slice(0, 10) }
}

const filters = reactive<AdminReportQuery>({
  category: String(route.query.category || 'team') as AdminReportCategory,
  ...defaultDates(),
  module: '',
  userId: '',
  status: '',
  priority: '',
  type: '',
  result: ''
})

const apiMessage = (error: unknown) => {
  const value = error as { data?: { message?: string | string[] }; message?: string }
  const message = value?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || value?.message || 'Falha inesperada ao consultar a API.'
}

const loadOptions = async () => {
  try {
    options.value = await api.options()
    if (!options.value.categories.some((item) => item.key === filters.category)) {
      filters.category = options.value.categories[0]?.key
    }
  } catch (error) {
    errorMessage.value = apiMessage(error)
  }
}

const loadReport = async () => {
  if (!filters.category) return
  loading.value = true
  errorMessage.value = ''
  try {
    report.value = await api.report({ ...filters })
  } catch (error) {
    report.value = null
    errorMessage.value = apiMessage(error)
  } finally {
    loading.value = false
  }
}

const selectCategory = async (category: AdminReportCategory) => {
  filters.category = category
  await router.replace({ query: { ...route.query, category } })
  await loadReport()
}

watch(
  () => route.query.category,
  async (value) => {
    const category = String(value || '')
    if (!options.value.categories.some((item) => item.key === category) || filters.category === category) return
    filters.category = category as AdminReportCategory
    await loadReport()
  }
)

const resetFilters = async () => {
  Object.assign(filters, {
    category: filters.category,
    ...defaultDates(),
    module: '',
    userId: '',
    status: '',
    priority: '',
    type: '',
    result: ''
  })
  await loadReport()
}

const download = async (format: 'csv' | 'xlsx') => {
  if (!canExport.value || !filters.category) return
  exporting.value = format
  errorMessage.value = ''
  try {
    const payload = await api.exportReport({ ...filters, format })
    const bytes = payload.encoding === 'base64'
      ? Uint8Array.from(atob(payload.content), (character) => character.charCodeAt(0))
      : payload.content
    const blob = new Blob([bytes], { type: payload.contentType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = payload.filename
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = apiMessage(error)
  } finally {
    exporting.value = ''
  }
}

const columns = (rows: Array<Record<string, unknown>>) => {
  const result: string[] = []
  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) if (!result.includes(key)) result.push(key)
  }
  return result
}

const columnLabels: Record<string, string> = {
  key: 'Item',
  count: 'Quantidade',
  name: 'Nome',
  username: 'Usuário',
  module: 'Módulo',
  action: 'Ação',
  status: 'Status',
  result: 'Resultado',
  priority: 'Prioridade',
  role: 'Perfil',
  occurrences: 'Ocorrências',
  averageMinutes: 'Média (min)',
  averageHours: 'Média (h)'
}

const columnLabel = (value: string) =>
  columnLabels[value] || value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return value.toLocaleString('pt-BR')
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).replaceAll('_', ' ')
}

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(value))
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

onMounted(async () => {
  await loadOptions()
  await loadReport()
})
</script>
