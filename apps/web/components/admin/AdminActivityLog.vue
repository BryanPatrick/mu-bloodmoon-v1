<template>
  <div class="grid gap-4">
    <AdminObservabilityHeader :eyebrow="eyebrow" :title="title" :description="description">
      <div class="flex gap-2">
        <UButton v-if="kind === 'work' && canCreate" color="primary" @click="createOpen = true">
          <Plus class="size-4" /> Registrar trabalho
        </UButton>
        <UButton color="neutral" variant="soft" :loading="loading" @click="load">
          <RefreshCw class="size-4" /> Atualizar
        </UButton>
      </div>
    </AdminObservabilityHeader>
    <AdminObservabilityNav />

    <form class="bm-panel grid gap-3 rounded-md p-3 lg:grid-cols-[1fr_180px_180px_auto]" @submit.prevent="applyFilters">
      <input v-model="filters.search" class="bm-activity-input" type="search" placeholder="Buscar descrição, ação, entidade ou correlação">
      <input v-model="filters.module" class="bm-activity-input" placeholder="Módulo">
      <select v-model="filters.result" class="bm-activity-input">
        <option value="">{{ kind === 'work' ? 'Todos os resultados' : 'Todas severidades' }}</option>
        <option v-for="option in filterOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <div class="flex gap-2">
        <UButton type="submit">Filtrar</UButton>
        <UButton color="neutral" variant="ghost" square aria-label="Limpar" @click="clearFilters"><X class="size-4" /></UButton>
      </div>
    </form>

    <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>

    <section v-if="items.length" class="grid gap-2">
      <article v-for="item in items" :key="item.id" class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-[145px_130px_1fr_130px] lg:items-start">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Data</p>
          <p class="mt-1 text-xs font-bold text-white/70">{{ formatDate(itemDate(item)) }}</p>
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Módulo</p>
          <p class="mt-1 text-xs font-black uppercase text-ember">{{ item.module }}</p>
        </div>
        <div class="min-w-0">
          <p class="text-xs font-black uppercase">{{ itemAction(item) }}</p>
          <p class="mt-1 text-xs font-semibold leading-5 text-white/62">{{ item.description }}</p>
          <p v-if="item.correlationId" class="mt-2 truncate font-mono text-[10px] text-white/35">ID {{ item.correlationId }}</p>
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{{ kind === 'work' ? 'Resultado' : 'Severidade' }}</p>
          <span class="mt-1 inline-flex rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black">{{ itemResult(item) }}</span>
        </div>
      </article>
    </section>

    <AdminEmptyState v-else-if="!loading" :title="emptyTitle" :description="emptyDescription" :icon="kind === 'work' ? ClipboardCheck : Activity" />

    <div class="flex items-center justify-between">
      <p class="text-xs font-bold text-white/45">{{ total }} registros</p>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" square :disabled="page <= 1 || loading" aria-label="Página anterior" @click="changePage(page - 1)"><ChevronLeft class="size-4" /></UButton>
        <span class="text-xs font-black">{{ page }} / {{ totalPages }}</span>
        <UButton color="neutral" variant="soft" square :disabled="page >= totalPages || loading" aria-label="Próxima página" @click="changePage(page + 1)"><ChevronRight class="size-4" /></UButton>
      </div>
    </div>

    <UModal v-model:open="createOpen" title="Registrar trabalho" description="Registro manual para atividades que não são geradas automaticamente.">
      <template #body>
        <form class="grid gap-3" @submit.prevent="submitWorkLog">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="grid gap-1 text-xs font-black text-white/65">Módulo<input v-model="workForm.module" required class="bm-activity-input"></label>
            <label class="grid gap-1 text-xs font-black text-white/65">Ação<input v-model="workForm.action" required class="bm-activity-input"></label>
            <label class="grid gap-1 text-xs font-black text-white/65">Tipo da entidade<input v-model="workForm.entityType" required class="bm-activity-input"></label>
            <label class="grid gap-1 text-xs font-black text-white/65">ID da entidade<input v-model="workForm.entityId" class="bm-activity-input"></label>
            <label class="grid gap-1 text-xs font-black text-white/65">ID da tarefa<input v-model="workForm.taskId" class="bm-activity-input"></label>
            <label class="grid gap-1 text-xs font-black text-white/65">Resultado
              <select v-model="workForm.result" class="bm-activity-input"><option v-for="option in workResults" :key="option">{{ option }}</option></select>
            </label>
          </div>
          <label class="grid gap-1 text-xs font-black text-white/65">Descrição<textarea v-model="workForm.description" required class="bm-activity-input min-h-24 py-3" /></label>
          <label class="grid gap-1 text-xs font-black text-white/65">Evidência ou referência<textarea v-model="workForm.evidence" class="bm-activity-input min-h-20 py-3" placeholder="URL, arquivo, commit ou observação" /></label>
          <p v-if="formError" class="text-xs font-bold text-red-200">{{ formError }}</p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="createOpen = false">Cancelar</UButton>
            <UButton type="submit" :loading="saving">Salvar registro</UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { Activity, ChevronLeft, ChevronRight, ClipboardCheck, Plus, RefreshCw, X } from 'lucide-vue-next'
import { permissions } from '~/data/security'
import type { OperationalRecord, WorkLogRecord } from '~/composables/useAdminObservabilityApi'

const props = defineProps<{
  kind: 'work' | 'events'
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
}>()

const route = useRoute()
const api = useAdminObservabilityApi()
const { hasPermission, loadSession, user } = useAuth()
const items = ref<Array<WorkLogRecord | OperationalRecord>>([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const loading = ref(false)
const errorMessage = ref('')
const createOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const filters = reactive({
  search: props.kind === 'events' ? String(route.query.busca || '') : '',
  module: props.kind === 'events' ? String(route.query.modulo || '') : '',
  result: props.kind === 'events' ? String(route.query.severidade || '') : ''
})
const workResults = ['SUCCESS', 'PARTIAL', 'FAILURE', 'CANCELLED']
const filterOptions = computed(() => props.kind === 'work' ? workResults : ['INFO', 'WARNING', 'ERROR', 'CRITICAL'])
const canCreate = computed(() => hasPermission(permissions.adminWorkLogsManage))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const workForm = reactive({
  module: '',
  action: '',
  entityType: '',
  entityId: '',
  taskId: '',
  result: 'SUCCESS',
  description: '',
  evidence: ''
})

onMounted(async () => {
  loadSession()
  await load()
})

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const ownActivityUserId =
      props.kind === 'work' && route.query.usuario === 'me'
        ? user.value?.id
        : undefined
    const response = props.kind === 'work'
      ? await api.workLogs({
          ...filters,
          actorUserId: ownActivityUserId,
          page: page.value,
          pageSize
        })
      : await api.events({ search: filters.search, module: filters.module, severity: filters.result, page: page.value, pageSize })
    items.value = response.items
    total.value = response.total
  } catch (error) {
    items.value = []
    errorMessage.value = 'Não foi possível carregar os registros pela API.'
    console.error(error)
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.usuario,
  async () => {
    if (props.kind !== 'work') return
    page.value = 1
    await load()
  }
)
const applyFilters = async () => { page.value = 1; await load() }
const clearFilters = async () => { Object.assign(filters, { search: '', module: '', result: '' }); page.value = 1; await load() }
const changePage = async (value: number) => { page.value = value; await load() }
const itemDate = (item: WorkLogRecord | OperationalRecord) => 'occurredAt' in item ? item.occurredAt : item.createdAt
const itemAction = (item: WorkLogRecord | OperationalRecord) => 'eventType' in item ? item.eventType : item.action
const itemResult = (item: WorkLogRecord | OperationalRecord) => 'severity' in item ? item.severity : item.result
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

const submitWorkLog = async () => {
  saving.value = true
  formError.value = ''
  try {
    await api.createWorkLog({
      ...workForm,
      entityId: workForm.entityId || null,
      taskId: workForm.taskId || null,
      evidence: workForm.evidence ? { reference: workForm.evidence } : undefined
    })
    createOpen.value = false
    Object.assign(workForm, { module: '', action: '', entityType: '', entityId: '', taskId: '', result: 'SUCCESS', description: '', evidence: '' })
    await load()
  } catch (error) {
    formError.value = 'Revise os campos e tente novamente.'
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.bm-activity-input {
  min-height: 2.5rem;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding-inline: 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  outline: none;
}
.bm-activity-input option { background: #111; color: white; }
</style>
