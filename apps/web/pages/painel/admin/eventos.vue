<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.gmEventsView)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Operação de jogo</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Eventos</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Configuração de definições e agenda de eventos operacionais. GM não cria nem edita nada aqui -- apenas opera o que foi configurado.
          </p>
        </div>
        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[560px]">
          <select v-model="filterStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="">Todos status</option>
            <option class="bg-zinc-950 text-white" value="ACTIVE">Ativo</option>
            <option class="bg-zinc-950 text-white" value="INACTIVE">Inativo</option>
          </select>
          <input v-model="filterCategory" class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70" placeholder="Categoria">
          <select v-model="filterMode" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="">Todos os modos</option>
            <option class="bg-zinc-950 text-white" value="AUTOMATED">Automatizado</option>
            <option class="bg-zinc-950 text-white" value="MANUAL_GM">Manual (GM)</option>
            <option class="bg-zinc-950 text-white" value="HYBRID">Híbrido</option>
          </select>
        </div>
      </div>

      <button v-if="!showCreate" class="bm-admin-primary w-fit" type="button" @click="showCreate = true">Nova definição de evento</button>
      <section v-if="showCreate" class="bm-panel grid gap-3 rounded-md p-5">
        <h2 class="font-display text-xl font-black uppercase">Nova definição</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <input v-model="createForm.key" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Chave única (ex: golden-invasion)">
          <input v-model="createForm.name" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Nome">
          <input v-model="createForm.category" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Categoria (ex: invasion)">
          <select v-model="createForm.executionMode" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="MANUAL_GM">Manual (GM)</option>
            <option class="bg-zinc-950 text-white" value="HYBRID">Híbrido</option>
            <option class="bg-zinc-950 text-white" value="AUTOMATED">Automatizado (sem executor ainda)</option>
          </select>
        </div>
        <textarea v-model="createForm.description" class="min-h-20 rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Descrição (opcional)"></textarea>
        <div class="flex gap-2">
          <button class="bm-admin-primary w-fit" type="button" @click="submitCreate">Criar</button>
          <button class="bm-admin-action w-fit" type="button" @click="showCreate = false">Cancelar</button>
        </div>
        <p v-if="formError" class="text-xs font-bold text-blood-200">{{ formError }}</p>
      </section>

      <section class="grid gap-4">
        <article v-for="definition in definitions" :key="definition.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="definition.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/10 text-white/55'">
                  {{ definition.status === 'ACTIVE' ? 'Ativo' : 'Inativo' }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">{{ definition.category }}</span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">{{ modeLabel(definition.executionMode) }}</span>
              </div>
              <h2 class="mt-3 font-display text-2xl font-black">{{ definition.name }}</h2>
              <p class="mt-1 text-xs font-bold text-white/45">{{ definition.key }} · criado por {{ definition.createdBy }}</p>
              <p v-if="definition.description" class="mt-2 text-sm text-white/60">{{ definition.description }}</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 xl:w-52 xl:grid-cols-1">
              <button class="bm-admin-action" type="button" @click="openDetail(definition.id)">Gerenciar</button>
              <button class="bm-admin-action" type="button" @click="toggleStatus(definition)">{{ definition.status === 'ACTIVE' ? 'Desativar' : 'Ativar' }}</button>
            </div>
          </div>
        </article>
        <p v-if="!definitions.length" class="rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm font-bold text-white/55">Nenhuma definição encontrada.</p>
      </section>

      <section v-if="detail" class="bm-panel grid gap-4 rounded-md p-5">
        <div class="flex items-center justify-between gap-3">
          <div><p class="bm-kicker">Gerenciar</p><h2 class="mt-1 font-display text-2xl font-black uppercase">{{ detail.name }}</h2></div>
          <button class="bm-admin-action" type="button" @click="detail = null">Fechar</button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <input v-model="editForm.name" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Nome">
          <input v-model="editForm.category" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Categoria">
          <select v-model="editForm.executionMode" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="MANUAL_GM">Manual (GM)</option>
            <option class="bg-zinc-950 text-white" value="HYBRID">Híbrido</option>
            <option class="bg-zinc-950 text-white" value="AUTOMATED">Automatizado (sem executor ainda)</option>
          </select>
        </div>
        <textarea v-model="editForm.description" class="min-h-20 rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Descrição"></textarea>
        <button class="bm-admin-primary w-fit" type="button" @click="submitEdit">Salvar alterações</button>

        <h3 class="mt-2 font-display text-lg font-black uppercase">Agenda</h3>
        <div class="grid gap-2">
          <div v-for="schedule in detail.schedules" :key="schedule.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div>
              <strong>{{ formatDate(schedule.startsAt) }}</strong>
              <p v-if="schedule.recurrenceNote" class="mt-1 text-xs text-white/45">{{ schedule.recurrenceNote }}</p>
            </div>
            <div class="flex gap-2">
              <button class="bm-admin-action" type="button" @click="editSchedule(schedule)">Editar</button>
              <button class="bm-admin-action" type="button" @click="removeSchedule(schedule.id)">Remover</button>
            </div>
          </div>
          <p v-if="!detail.schedules.length" class="text-sm text-white/45">Nenhum horário agendado.</p>
        </div>
        <form class="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" @submit.prevent="submitSchedule">
          <input v-model="scheduleForm.startsAt" type="datetime-local" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400">
          <input v-model="scheduleForm.recurrenceNote" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Recorrência (opcional, texto livre)">
          <button class="bm-admin-primary" type="submit">{{ editingScheduleId ? 'Salvar horário' : 'Adicionar horário' }}</button>
        </form>
        <button v-if="editingScheduleId" class="bm-admin-action w-fit" type="button" @click="cancelScheduleEdit">Cancelar edição</button>

        <h3 class="mt-2 font-display text-lg font-black uppercase">Histórico</h3>
        <div class="grid gap-2">
          <div v-for="entry in history" :key="entry.id" class="rounded-md border border-white/10 bg-black/25 p-3 text-xs">
            <div class="flex items-center justify-between gap-3">
              <strong class="text-white/70">{{ entry.action }}</strong>
              <span class="text-white/45">{{ formatDate(entry.createdAt) }}</span>
            </div>
            <p class="mt-1 text-white/45">{{ entry.actorUsername || 'sistema' }}{{ entry.reason ? ` · ${entry.reason}` : '' }}</p>
          </div>
          <p v-if="!history.length" class="text-sm text-white/45">Nenhum evento de auditoria ainda.</p>
        </div>

        <p v-if="detailError" class="text-xs font-bold text-blood-200">{{ detailError }}</p>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { GmEventAuditEntry, GmEventDefinition, GmEventDefinitionDetail, GmEventDefinitionStatus, GmEventExecutionMode, GmEventScheduleEntry } from '~/composables/useGmEventsAdminApi'
import { permissions } from '~/data/security'

const { hasPermission, loadSession } = useAuth()
const eventsApi = useGmEventsAdminApi()

useSeoMeta({ title: 'Eventos - Administração' })
onMounted(() => { loadSession(); void loadDefinitions() })

const definitions = ref<GmEventDefinition[]>([])
const filterStatus = ref<GmEventDefinitionStatus | ''>('')
const filterCategory = ref('')
const filterMode = ref<GmEventExecutionMode | ''>('')

const showCreate = ref(false)
const formError = ref('')
const createForm = reactive({ key: '', name: '', category: '', description: '', executionMode: 'MANUAL_GM' as GmEventExecutionMode })

const detail = ref<GmEventDefinitionDetail | null>(null)
const detailError = ref('')
const history = ref<GmEventAuditEntry[]>([])
const editForm = reactive({ name: '', category: '', description: '', executionMode: 'MANUAL_GM' as GmEventExecutionMode })
const scheduleForm = reactive({ startsAt: '', recurrenceNote: '' })
const editingScheduleId = ref<string | null>(null)

const toLocalInput = (iso: string) => {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const editSchedule = (schedule: GmEventScheduleEntry) => {
  editingScheduleId.value = schedule.id
  scheduleForm.startsAt = toLocalInput(schedule.startsAt)
  scheduleForm.recurrenceNote = schedule.recurrenceNote || ''
}

const cancelScheduleEdit = () => {
  editingScheduleId.value = null
  scheduleForm.startsAt = ''
  scheduleForm.recurrenceNote = ''
}

const modeLabels: Record<GmEventExecutionMode, string> = { AUTOMATED: 'Automatizado', MANUAL_GM: 'Manual (GM)', HYBRID: 'Híbrido' }
const modeLabel = (mode: GmEventExecutionMode) => modeLabels[mode] || mode

const loadDefinitions = async () => {
  try {
    definitions.value = await eventsApi.listDefinitions({
      status: filterStatus.value || undefined,
      category: filterCategory.value || undefined,
      executionMode: filterMode.value || undefined
    })
  } catch {
    definitions.value = []
  }
}
watch([filterStatus, filterCategory, filterMode], loadDefinitions)

const submitCreate = async () => {
  formError.value = ''
  if (!createForm.key.trim() || !createForm.name.trim() || !createForm.category.trim()) {
    formError.value = 'Preencha chave, nome e categoria.'
    return
  }
  try {
    await eventsApi.createDefinition({ ...createForm })
    createForm.key = ''; createForm.name = ''; createForm.category = ''; createForm.description = ''; createForm.executionMode = 'MANUAL_GM'
    showCreate.value = false
    await loadDefinitions()
  } catch {
    formError.value = 'Não foi possível criar a definição. Confira se a chave já existe.'
  }
}

const toggleStatus = async (definition: GmEventDefinition) => {
  const nextStatus: GmEventDefinitionStatus = definition.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const reason = window.prompt(`Motivo para ${nextStatus === 'ACTIVE' ? 'ativar' : 'desativar'} "${definition.name}" (mínimo 5 caracteres):`)?.trim()
  if (!reason || reason.length < 5) return
  try {
    await eventsApi.updateDefinition(definition.id, { status: nextStatus, reason })
    await loadDefinitions()
  } catch {
    formError.value = 'Não foi possível alterar o status.'
  }
}

const openDetail = async (id: string) => {
  detailError.value = ''
  try {
    detail.value = await eventsApi.getDefinition(id)
    editForm.name = detail.value.name
    editForm.category = detail.value.category
    editForm.description = detail.value.description || ''
    editForm.executionMode = detail.value.executionMode
    history.value = await eventsApi.definitionHistory(id)
  } catch {
    detailError.value = 'Não foi possível carregar esta definição.'
  }
}

const submitEdit = async () => {
  if (!detail.value) return
  detailError.value = ''
  const modeChanged = editForm.executionMode !== detail.value.executionMode
  let reason: string | undefined
  if (modeChanged) {
    reason = window.prompt('Motivo para alterar o modo de execução (mínimo 5 caracteres):')?.trim()
    if (!reason || reason.length < 5) { detailError.value = 'Motivo obrigatório para alterar o modo de execução.'; return }
  }
  try {
    await eventsApi.updateDefinition(detail.value.id, { ...editForm, reason })
    await openDetail(detail.value.id)
    await loadDefinitions()
  } catch {
    detailError.value = 'Não foi possível salvar as alterações.'
  }
}

const submitSchedule = async () => {
  if (!detail.value || !scheduleForm.startsAt) return
  detailError.value = ''
  try {
    const startsAt = new Date(scheduleForm.startsAt).toISOString()
    const recurrenceNote = scheduleForm.recurrenceNote || undefined
    if (editingScheduleId.value) {
      await eventsApi.updateSchedule(detail.value.id, editingScheduleId.value, { startsAt, recurrenceNote: recurrenceNote ?? null })
    } else {
      await eventsApi.createSchedule(detail.value.id, { startsAt, recurrenceNote })
    }
    cancelScheduleEdit()
    await openDetail(detail.value.id)
  } catch {
    detailError.value = editingScheduleId.value ? 'Não foi possível salvar o horário.' : 'Não foi possível adicionar o horário.'
  }
}

const removeSchedule = async (scheduleId: string) => {
  if (!detail.value) return
  if (!window.confirm('Remover este horário da agenda?')) return
  detailError.value = ''
  try {
    await eventsApi.deleteSchedule(detail.value.id, scheduleId)
    await openDetail(detail.value.id)
  } catch {
    detailError.value = 'Não foi possível remover -- este horário já pode ter uma execução registrada.'
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>
