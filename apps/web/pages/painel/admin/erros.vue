<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Monitoramento"
        title="Central de erros"
        description="Incidentes agrupados, ocorrencias, investigacao, responsavel e resolucao em uma unica linha do tempo."
      >
        <UButton color="neutral" variant="soft" :loading="loading" @click="load">
          <RefreshCw class="size-4" />
          Atualizar
        </UButton>
      </AdminObservabilityHeader>
      <AdminObservabilityNav />

      <form class="bm-panel grid gap-3 rounded-md p-3 lg:grid-cols-[1fr_160px_160px_170px_auto]" @submit.prevent="applyFilters">
        <input v-model="filters.search" class="bm-admin-input" type="search" placeholder="Codigo, mensagem, rota ou correlacao">
        <input v-model="filters.module" class="bm-admin-input" placeholder="Modulo">
        <select v-model="filters.severity" class="bm-admin-input">
          <option value="">Severidades</option>
          <option v-for="value in severities" :key="value" :value="value">{{ value }}</option>
        </select>
        <select v-model="filters.status" class="bm-admin-input">
          <option value="">Todos os status</option>
          <option v-for="value in statuses" :key="value" :value="value">{{ value }}</option>
        </select>
        <div class="flex gap-2">
          <UButton type="submit">Filtrar</UButton>
          <UButton color="neutral" variant="ghost" square aria-label="Limpar filtros" @click="clearFilters"><X class="size-4" /></UButton>
        </div>
      </form>

      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>

      <section v-if="items.length" class="grid gap-3">
        <article
          v-for="item in items"
          :key="item.id"
          class="bm-panel grid gap-3 rounded-md border-l-2 p-4 xl:grid-cols-[110px_1fr_150px_150px_90px] xl:items-center"
          :class="severityBorder(item.severity)"
        >
          <div>
            <span class="rounded-sm px-2 py-1 text-[10px] font-black" :class="severityClass(item.severity)">{{ item.severity }}</span>
            <p class="mt-2 text-[10px] font-black uppercase text-white/40">{{ item.module }}</p>
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-black">{{ item.errorCode || item.publicMessage }}</p>
            <p class="mt-1 truncate text-xs font-semibold text-white/55">{{ item.publicMessage }}</p>
            <p class="mt-1 truncate font-mono text-[10px] text-white/35">{{ item.requestMethod || '-' }} {{ item.requestPath || '-' }}</p>
          </div>
          <div>
            <p class="text-[10px] font-black uppercase text-white/40">Ocorrencias</p>
            <p class="mt-1 font-display text-xl font-black">{{ item.occurrenceCount }}</p>
          </div>
          <div>
            <span class="rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black">{{ item.status }}</span>
            <p class="mt-2 truncate text-[10px] text-white/45">{{ item.assignedTo || 'Sem responsavel' }}</p>
          </div>
          <UButton color="neutral" variant="soft" size="xs" :loading="opening === item.id" @click="openDetail(item.id)">Tratar</UButton>
        </article>
      </section>
      <AdminEmptyState v-else-if="!loading" title="Nenhum erro encontrado" description="Nao existem incidentes para os filtros selecionados." :icon="ShieldCheck" />

      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-white/45">{{ total }} grupos de erro</p>
        <div class="flex items-center gap-2">
          <UButton color="neutral" variant="soft" square :disabled="page <= 1 || loading" @click="changePage(page - 1)"><ChevronLeft class="size-4" /></UButton>
          <span class="text-xs font-black">Pagina {{ page }} de {{ totalPages }}</span>
          <UButton color="neutral" variant="soft" square :disabled="page >= totalPages || loading" @click="changePage(page + 1)"><ChevronRight class="size-4" /></UButton>
        </div>
      </div>

      <UModal v-model:open="detailsOpen" title="Tratamento do incidente" description="Detalhes tecnicos aparecem somente para quem possui permissao completa.">
        <template #body>
          <div v-if="selected" class="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
            <div class="grid gap-3 sm:grid-cols-2">
              <AuditField label="Modulo" :value="selected.module" />
              <AuditField label="Correlacao" :value="selected.correlationId || '-'" mono />
              <AuditField label="Primeira ocorrencia" :value="formatDate(selected.firstOccurredAt)" />
              <AuditField label="Ultima ocorrencia" :value="formatDate(selected.lastOccurredAt)" />
            </div>
            <div class="rounded-md border border-white/10 bg-black/20 p-3">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Mensagem interna</p>
              <p class="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/70">{{ selected.internalMessage || 'Detalhe protegido.' }}</p>
              <pre v-if="selected.stackTrace" class="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-sm bg-black/40 p-3 font-mono text-[10px] leading-4 text-red-100/70">{{ selected.stackTrace }}</pre>
            </div>

            <form v-if="canManage" class="grid gap-3 rounded-md border border-white/10 p-3 sm:grid-cols-2" @submit.prevent="saveError">
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45">Status
                <select v-model="edit.status" class="bm-admin-input"><option v-for="value in statuses" :key="value" :value="value">{{ value }}</option></select>
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45">Responsavel
                <input v-model="edit.assignedTo" class="bm-admin-input" placeholder="ID ou identificacao interna">
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45">Tarefa relacionada
                <input v-model="edit.taskId" class="bm-admin-input" placeholder="ID da tarefa">
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45">Motivo
                <input v-model="edit.reason" class="bm-admin-input" placeholder="Motivo da alteracao">
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45 sm:col-span-2">Investigacao
                <textarea v-model="edit.investigation" class="bm-admin-textarea" rows="3" placeholder="Hipotese, testes e conclusoes parciais" />
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45 sm:col-span-2">Solucao
                <textarea v-model="edit.resolution" class="bm-admin-textarea" rows="3" placeholder="Obrigatoria ao marcar como RESOLVED" />
              </label>
              <label class="grid gap-1 text-[10px] font-black uppercase text-white/45 sm:col-span-2">Evidencia
                <textarea v-model="edit.evidence" class="bm-admin-textarea" rows="2" placeholder="URL, arquivo, commit, consulta ou observacao verificavel" />
              </label>
              <div class="sm:col-span-2"><UButton type="submit" :loading="saving"><Save class="size-4" /> Salvar tratamento</UButton></div>
            </form>

            <section>
              <p class="bm-kicker">Linha do tempo</p>
              <div class="mt-3 grid gap-2">
                <article v-for="entry in selected.timeline || []" :key="String(entry.id)" class="rounded-md border border-white/8 bg-white/[0.035] p-3">
                  <div class="flex justify-between gap-3"><b class="text-xs">{{ entry.type }}</b><span class="text-[10px] text-white/40">{{ formatDate(String(entry.createdAt)) }}</span></div>
                  <p class="mt-2 text-xs leading-5 text-white/65">{{ entry.description }}</p>
                </article>
              </div>
            </section>
            <section>
              <p class="bm-kicker">Ocorrencias recentes</p>
              <div class="mt-3 grid gap-2">
                <article v-for="entry in selected.occurrences || []" :key="String(entry.id)" class="grid gap-1 rounded-md border border-white/8 bg-white/[0.025] p-3 sm:grid-cols-[150px_1fr]">
                  <span class="text-[10px] text-white/40">{{ formatDate(String(entry.occurredAt)) }}</span>
                  <span class="font-mono text-[10px] text-white/60">{{ entry.correlationId || 'sem correlacao' }}</span>
                </article>
              </div>
            </section>
          </div>
        </template>
      </UModal>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, RefreshCw, Save, ShieldCheck, X } from 'lucide-vue-next'
import type { SystemErrorRecord } from '~/composables/useAdminObservabilityApi'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Central de erros' })
const route = useRoute()
const api = useAdminObservabilityApi()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission(permissions.adminErrorsManage))
const items = ref<SystemErrorRecord[]>([])
const selected = ref<SystemErrorRecord | null>(null)
const loading = ref(false)
const saving = ref(false)
const opening = ref('')
const errorMessage = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = 25
const severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
const statuses = ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'WAITING', 'RESOLVED', 'IGNORED', 'REOPENED']
const filters = reactive({
  search: String(route.query.busca || ''),
  module: String(route.query.modulo || ''),
  severity: '',
  status: ''
})
const edit = reactive({ status: 'NEW', assignedTo: '', taskId: '', reason: '', investigation: '', resolution: '', evidence: '' })
const detailsOpen = computed({ get: () => Boolean(selected.value), set: (value) => { if (!value) selected.value = null } })
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

onMounted(load)
async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.errors({ ...filters, page: page.value, pageSize })
    items.value = response.items
    total.value = response.total
  } catch (error) {
    items.value = []
    errorMessage.value = 'Nao foi possivel carregar a central de erros.'
    console.error(error)
  } finally { loading.value = false }
}
async function openDetail(id: string) {
  opening.value = id
  try {
    selected.value = await api.error(id)
    Object.assign(edit, {
      status: selected.value.status,
      assignedTo: selected.value.assignedTo || '',
      taskId: selected.value.taskId || '',
      reason: '',
      investigation: '',
      resolution: selected.value.resolution || '',
      evidence: ''
    })
  } catch (error) {
    errorMessage.value = 'Nao foi possivel abrir o incidente.'
    console.error(error)
  } finally { opening.value = '' }
}
async function saveError() {
  if (!selected.value) return
  saving.value = true
  try {
    selected.value = await api.updateError(selected.value.id, {
      ...edit,
      assignedTo: edit.assignedTo || null,
      taskId: edit.taskId || null,
      evidence: edit.evidence ? { reference: edit.evidence } : undefined
    })
    await load()
  } catch (error) {
    errorMessage.value = 'Nao foi possivel salvar o tratamento.'
    console.error(error)
  } finally { saving.value = false }
}
async function applyFilters() { page.value = 1; await load() }
async function clearFilters() { Object.assign(filters, { search: '', module: '', severity: '', status: '' }); page.value = 1; await load() }
async function changePage(next: number) { page.value = next; await load() }
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const severityClass = (value: string) => ({
  'bg-sky-400/15 text-sky-200': value === 'INFO',
  'bg-amber-400/15 text-amber-100': value === 'WARNING',
  'bg-red-400/15 text-red-200': value === 'ERROR',
  'bg-fuchsia-400/15 text-fuchsia-100': value === 'CRITICAL'
})
const severityBorder = (value: string) => ({
  'border-l-sky-400/60': value === 'INFO',
  'border-l-amber-400/60': value === 'WARNING',
  'border-l-red-400/60': value === 'ERROR',
  'border-l-fuchsia-400/70': value === 'CRITICAL'
})
</script>

<style scoped>
.bm-admin-input, .bm-admin-textarea {
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding: 0.65rem 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  outline: none;
}
.bm-admin-input option { background: #111; }
</style>
