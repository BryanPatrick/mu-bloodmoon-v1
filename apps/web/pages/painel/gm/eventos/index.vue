<template>
  <ManagementShell>
    <div class="border-b border-white/10 pb-6">
      <p class="bm-kicker">Operação de jogo</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Eventos</h1>
      <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
        Acompanhamento e execução de eventos operacionais. Toda execução é registrada como <code class="rounded bg-black/30 px-1.5 py-0.5 text-xs">PORTAL_ONLY</code>
        -- o portal não afirma que o jogo foi alterado, apenas que a operação foi registrada aqui.
      </p>
    </div>

    <section class="mt-6 bm-panel rounded-md p-5">
      <h2 class="font-display text-xl font-black uppercase">Agenda (próximos)</h2>
      <div class="mt-4 grid gap-2">
        <div v-for="entry in agenda" :key="entry.id" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
          <div>
            <strong>{{ entry.definitionName }}</strong>
            <p class="mt-1 text-xs text-white/45">{{ formatDate(entry.startsAt) }}{{ entry.recurrenceNote ? ` · ${entry.recurrenceNote}` : '' }}</p>
          </div>
          <button
            v-if="canExecute"
            class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black hover:border-ember/50"
            type="button"
            @click="startRun(entry.definitionId, entry.id)"
          >
            Iniciar
          </button>
        </div>
        <p v-if="!agenda.length" class="py-4 text-center text-sm text-white/45">Nenhum evento agendado.</p>
      </div>
    </section>

    <section class="mt-6 bm-panel rounded-md p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-xl font-black uppercase">Execuções</h2>
        <select v-model="activeStatus" class="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="">Todas</option>
          <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </div>

      <div class="mt-4 grid gap-3">
        <article v-for="run in runs" :key="run.id" class="rounded-md border border-white/10 bg-white/[0.04] p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(run.status)">{{ statusLabel(run.status) }}</span>
              <strong>{{ run.definitionName }}</strong>
            </div>
            <span class="text-xs text-white/45">{{ run.origin }}</span>
          </div>
          <div class="mt-2 grid gap-1 text-xs text-white/45 sm:grid-cols-2">
            <span v-if="run.startedBy">Iniciado por {{ run.startedBy }}{{ run.startedAt ? ` em ${formatDate(run.startedAt)}` : '' }}</span>
            <span v-if="run.endedBy">Encerrado por {{ run.endedBy }}{{ run.endedAt ? ` em ${formatDate(run.endedAt)}` : '' }}</span>
            <span v-if="run.cancelledBy">Cancelado por {{ run.cancelledBy }}: {{ run.cancelReason }}</span>
            <span v-if="run.problemNote">Problema: {{ run.problemNote }}</span>
          </div>

          <div v-if="canExecute" class="mt-3 flex flex-wrap gap-2">
            <button v-if="run.status === 'ACTIVE'" class="rounded-md border border-white/10 px-3 py-2 text-xs font-black hover:border-ember/50" type="button" @click="endRun(run.id)">Encerrar</button>
            <button v-if="run.status !== 'CANCELLED' && run.status !== 'COMPLETED'" class="rounded-md border border-white/10 px-3 py-2 text-xs font-black hover:border-ember/50" type="button" @click="reportProblem(run.id)">Registrar problema</button>
            <button v-if="run.status === 'COMPLETED' && !run.hasResult" class="rounded-md border border-white/10 px-3 py-2 text-xs font-black hover:border-ember/50" type="button" @click="submitResult(run.id)">Registrar resultado</button>
            <button v-if="canCancel && ['SCHEDULED','ACTIVE','PROBLEM_REPORTED'].includes(run.status)" class="rounded-md border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs font-black text-amber-100" type="button" @click="cancelRun(run.id)">Cancelar</button>
            <button v-if="canValidate && run.hasResult" class="rounded-md border border-white/10 px-3 py-2 text-xs font-black hover:border-ember/50" type="button" @click="openValidate(run.id)">Validar resultado</button>
          </div>
        </article>
        <p v-if="!runs.length" class="py-6 text-center text-sm font-bold text-white/55">Nenhuma execução registrada.</p>
      </div>
      <p v-if="actionError" class="mt-3 text-xs font-bold text-blood-200">{{ actionError }}</p>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { GmEventRun, GmEventRunStatus, GmEventScheduleEntry } from '~/composables/useGmEventsApi'
import { permissions } from '~/data/security'

const gmEventsApi = useGmEventsApi()
const { hasPermission } = useAuth()
useSeoMeta({ title: 'Eventos GM' })

const canExecute = computed(() => hasPermission(permissions.gmEventsExecute))
const canCancel = computed(() => hasPermission(permissions.gmEventsCancel))
const canValidate = computed(() => hasPermission(permissions.gmEventsResultsValidate))

const statuses: GmEventRunStatus[] = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'PROBLEM_REPORTED']
const statusLabels: Record<GmEventRunStatus, string> = {
  SCHEDULED: 'Agendado',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  PROBLEM_REPORTED: 'Problema reportado'
}
const statusLabel = (status: GmEventRunStatus) => statusLabels[status] || status
const statusClass = (status: GmEventRunStatus) => ({
  'bg-cyan-500/15 text-cyan-100': status === 'SCHEDULED',
  'bg-amber-500/15 text-amber-100': status === 'ACTIVE' || status === 'PROBLEM_REPORTED',
  'bg-emerald-500/15 text-emerald-100': status === 'COMPLETED',
  'bg-white/10 text-white/55': status === 'CANCELLED'
})

const agenda = ref<GmEventScheduleEntry[]>([])
const runs = ref<GmEventRun[]>([])
const activeStatus = ref<GmEventRunStatus | ''>('')
const actionError = ref('')

const loadAgenda = async () => { try { agenda.value = await gmEventsApi.agenda() } catch { agenda.value = [] } }
const loadRuns = async () => {
  try {
    const result = await gmEventsApi.listRuns({ status: activeStatus.value || undefined, pageSize: 50 })
    runs.value = result.data
  } catch {
    runs.value = []
  }
}

watch(activeStatus, loadRuns)
onMounted(() => { loadAgenda(); loadRuns() })

const startRun = async (definitionId: string, scheduleId: string) => {
  actionError.value = ''
  try { await gmEventsApi.startRun(definitionId, scheduleId); await loadRuns() }
  catch { actionError.value = 'Não foi possível iniciar o evento.' }
}
const endRun = async (id: string) => {
  actionError.value = ''
  try { await gmEventsApi.endRun(id); await loadRuns() }
  catch { actionError.value = 'Não foi possível encerrar o evento.' }
}
const reportProblem = async (id: string) => {
  const note = window.prompt('Descreva o problema observado:')?.trim()
  if (!note) return
  actionError.value = ''
  try { await gmEventsApi.reportProblem(id, note); await loadRuns() }
  catch { actionError.value = 'Não foi possível registrar o problema.' }
}
const cancelRun = async (id: string) => {
  const reason = window.prompt('Motivo do cancelamento (mínimo 5 caracteres):')?.trim()
  if (!reason || reason.length < 5) { actionError.value = 'É necessário um motivo com pelo menos 5 caracteres para cancelar.'; return }
  actionError.value = ''
  try { await gmEventsApi.cancelRun(id, reason); await loadRuns() }
  catch { actionError.value = 'Não foi possível cancelar o evento.' }
}
const submitResult = async (id: string) => {
  const summary = window.prompt('Resumo do resultado do evento:')?.trim()
  if (!summary) return
  const participantsRaw = window.prompt('Número de participantes (opcional):')?.trim()
  const participantCount = participantsRaw ? Number.parseInt(participantsRaw, 10) : undefined
  actionError.value = ''
  try { await gmEventsApi.submitResult(id, summary, Number.isFinite(participantCount) ? participantCount : undefined); await loadRuns() }
  catch { actionError.value = 'Não foi possível registrar o resultado.' }
}
const openValidate = async (id: string) => {
  const approve = window.confirm('Validar este resultado? Cancelar para invalidar em vez disso.')
  actionError.value = ''
  try {
    if (approve) {
      await gmEventsApi.validateResult(id, 'VALIDATED')
    } else {
      const reason = window.prompt('Motivo da invalidação (mínimo 5 caracteres):')?.trim()
      if (!reason || reason.length < 5) { actionError.value = 'É necessário um motivo com pelo menos 5 caracteres para invalidar.'; return }
      await gmEventsApi.validateResult(id, 'INVALIDATED', reason)
    }
    await loadRuns()
  } catch {
    actionError.value = 'Não foi possível validar o resultado.'
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>
