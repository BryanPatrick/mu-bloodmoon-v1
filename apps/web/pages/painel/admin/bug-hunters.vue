<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Beta · Bug Hunters · area administrativa</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">Triagem de relatos</h1>
        <p class="mt-2 text-sm font-semibold text-white/60">Relatos reproduziveis enviados por jogadores. Nao confundir com tickets de suporte (contas/pagamentos pessoais).</p>
      </header>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="bm-panel rounded-md p-3 text-center"><p class="text-2xl font-black">{{ metrics?.total ?? '-' }}</p><p class="text-xs text-white/50">Total</p></div>
        <div class="bm-panel rounded-md p-3 text-center"><p class="text-2xl font-black">{{ metrics?.open ?? '-' }}</p><p class="text-xs text-white/50">Abertos</p></div>
        <div class="bm-panel rounded-md p-3 text-center"><p class="text-2xl font-black">{{ metrics?.confirmed ?? '-' }}</p><p class="text-xs text-white/50">Confirmados</p></div>
        <div class="bm-panel rounded-md p-3 text-center"><p class="text-2xl font-black">{{ metrics?.resolved ?? '-' }}</p><p class="text-xs text-white/50">Resolvidos</p></div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select v-model="filters.status" class="bm-admin-field w-auto" @change="load"><option value="">Todos os status</option><option v-for="s in statuses" :key="s" :value="s">{{ statusLabels[s] }}</option></select>
        <select v-model="filters.category" class="bm-admin-field w-auto" @change="load"><option value="">Todas as categorias</option><option v-for="c in categories" :key="c" :value="c">{{ categoryLabels[c] }}</option></select>
        <a :href="exportUrl" class="bm-admin-chip" target="_blank">Exportar CSV</a>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div class="grid gap-2">
          <button v-for="r in reports" :key="r.id" class="bm-panel grid gap-1 rounded-md p-3 text-left" :class="{ 'border-ember/60': selected?.id === r.id }" type="button" @click="open(r.id)">
            <div class="flex items-center justify-between gap-3"><strong class="text-sm">{{ r.title }}</strong><span class="bm-admin-chip">{{ statusLabels[r.status] || r.status }}</span></div>
            <p class="text-xs text-white/50">{{ categoryLabels[r.category] }} · {{ r.account?.username }} · severidade jogador: {{ severityLabels[r.playerSeverity] }}{{ r.staffSeverity ? ` · staff: ${severityLabels[r.staffSeverity]}` : '' }}</p>
          </button>
          <p v-if="!reports.length" class="text-sm text-white/50">Nenhum relato encontrado com estes filtros.</p>
        </div>

        <article v-if="selected" class="bm-panel grid gap-4 rounded-md p-4">
          <header class="grid gap-1">
            <h3 class="font-display text-lg font-black">{{ selected.title }}</h3>
            <p class="text-xs text-white/50">{{ selected.account?.username }} ({{ selected.account?.email }}){{ selected.characterName ? ` · personagem: ${selected.characterName}` : '' }}</p>
          </header>
          <dl class="grid gap-2 text-sm">
            <div><dt class="font-bold text-white/70">Descricao</dt><dd class="text-white/60">{{ selected.description }}</dd></div>
            <div><dt class="font-bold text-white/70">Passos</dt><dd class="whitespace-pre-line text-white/60">{{ selected.stepsToReproduce }}</dd></div>
            <div><dt class="font-bold text-white/70">Esperado</dt><dd class="text-white/60">{{ selected.expectedBehavior }}</dd></div>
            <div><dt class="font-bold text-white/70">Observado</dt><dd class="text-white/60">{{ selected.actualBehavior }}</dd></div>
            <div v-if="selected.contextNote"><dt class="font-bold text-white/70">Contexto</dt><dd class="text-white/60">{{ selected.contextNote }}</dd></div>
            <div v-if="selected.attachmentRef"><dt class="font-bold text-white/70">Evidencia</dt><dd><a :href="selected.attachmentRef" class="text-ember underline" target="_blank">{{ selected.attachmentRef }}</a></dd></div>
          </dl>

          <div class="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
            <label class="grid gap-1 text-xs"><span class="font-bold text-white/60">Status</span>
              <select v-model="statusForm.status" class="bm-admin-field"><option v-for="s in statuses" :key="s" :value="s">{{ statusLabels[s] }}</option></select>
            </label>
            <label class="grid gap-1 text-xs"><span class="font-bold text-white/60">Severidade (avaliacao da equipe)</span>
              <select v-model="staffSeverityValue" class="bm-admin-field"><option value="">-</option><option v-for="s in severities" :key="s" :value="s">{{ severityLabels[s] }}</option></select>
            </label>
          </div>
          <div class="grid gap-2">
            <input v-model="statusForm.reason" class="bm-admin-field" minlength="5" placeholder="Justificativa da mudanca de status (min. 5 caracteres)">
            <div class="flex flex-wrap gap-2">
              <button class="bm-admin-primary" type="button" @click="applyStatus">Aplicar status</button>
              <button class="bm-admin-chip" type="button" @click="applyStaffSeverity">Definir severidade</button>
            </div>
          </div>

          <label class="grid gap-1 text-xs"><span class="font-bold text-white/60">Atribuir a</span>
            <input v-model="assigneeId" class="bm-admin-field" placeholder="accountId do responsavel">
            <button class="bm-admin-chip mt-1 w-fit" type="button" @click="applyAssign">Atribuir</button>
          </label>

          <div class="grid gap-2 border-t border-white/10 pt-3">
            <h4 class="text-xs font-black uppercase tracking-wide text-white/50">Historico completo (inclui notas internas)</h4>
            <div v-for="ev in selected.events" :key="ev.id" class="rounded-md p-2 text-xs" :class="ev.isInternal ? 'bg-amber-500/10' : 'bg-white/[0.04]'">
              <div class="flex items-center justify-between gap-2 text-white/45">
                <span>{{ ev.type }}{{ ev.isInternal ? ' · INTERNO' : '' }}{{ ev.actor ? ` · ${ev.actor.username}` : '' }}</span>
                <span>{{ new Date(ev.createdAt).toLocaleString('pt-BR') }}</span>
              </div>
              <p v-if="ev.message" class="mt-1 text-white/70">{{ ev.message }}</p>
            </div>
          </div>

          <div class="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
            <div class="grid gap-1">
              <textarea v-model="replyText" class="bm-admin-field min-h-16" placeholder="Resposta visivel ao jogador"/>
              <button class="bm-admin-primary w-fit" type="button" @click="sendReply">Responder ao jogador</button>
            </div>
            <div class="grid gap-1">
              <textarea v-model="noteText" class="bm-admin-field min-h-16" placeholder="Nota interna (nunca visivel ao jogador)"/>
              <button class="bm-admin-chip w-fit" type="button" @click="sendNote">Adicionar nota interna</button>
            </div>
          </div>

          <div class="grid gap-2 border-t border-white/10 pt-3">
            <h4 class="text-xs font-black uppercase tracking-wide text-white/50">Elegibilidade de recompensa (Bug Hunter)</h4>
            <p class="text-xs text-white/45">Isto NAO paga nada automaticamente -- apenas registra um fato de elegibilidade para geracao posterior em Recompensas de Beta.</p>
            <input v-model="rewardForm.betaCycleId" class="bm-admin-field" placeholder="Ciclo de Beta (ex: open-beta-2026-09)">
            <input v-model="rewardForm.justification" class="bm-admin-field" placeholder="Justificativa (min. 10 caracteres)">
            <button class="bm-admin-chip w-fit" type="button" @click="recordEligibility">Registrar elegibilidade</button>
            <p v-if="rewardFeedback" class="text-xs font-bold text-emerald-300">{{ rewardFeedback }}</p>
          </div>
        </article>
        <p v-else class="text-sm text-white/50">Selecione um relato para ver os detalhes.</p>
      </div>
    </section>
  </ManagementShell>
</template>
<script setup lang="ts">
import { bugReportCategories, bugReportSeverities, bugReportStatuses, type BugHuntersMetrics, type BugReportDetail } from '~/composables/useBugHuntersApi'

const api = useBugHuntersApi()
const categories = bugReportCategories; const severities = bugReportSeverities; const statuses = bugReportStatuses
const categoryLabels: Record<string, string> = {
  LAUNCHER: 'Launcher', LOGIN_ACCOUNT: 'Login / Conta', GAMEPLAY: 'Jogabilidade', MAP_MONSTER: 'Mapa / Monstro',
  ITEM: 'Item', EVENT: 'Evento', QUEST: 'Quest', VIP: 'VIP', STORE_PAYMENT: 'Loja / Pagamento',
  MARKETPLACE: 'Marketplace', GUILD: 'Guilda', COMMUNITY: 'Comunidade', PORTAL: 'Portal', PERFORMANCE: 'Desempenho', OTHER: 'Outro'
}
const severityLabels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Critica' }
const statusLabels: Record<string, string> = {
  OPEN: 'Aberto', TRIAGE: 'Em triagem', NEEDS_INFO: 'Aguardando informacoes', CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvido', CLOSED: 'Encerrado', DUPLICATE: 'Duplicado', NOT_A_BUG: 'Nao e um bug'
}

const reports = ref<BugReportDetail[]>([])
const selected = ref<BugReportDetail | null>(null)
const metrics = ref<BugHuntersMetrics | null>(null)
const filters = reactive({ status: '', category: '' })
const statusForm = reactive({ status: 'OPEN', reason: '' })
const staffSeverityValue = ref('')
const assigneeId = ref('')
const replyText = ref('')
const noteText = ref('')
const rewardForm = reactive({ betaCycleId: '', justification: '' })
const rewardFeedback = ref('')
const exportUrl = computed(() => api.exportUrl({ status: filters.status, category: filters.category }))

const load = async () => { try { reports.value = await api.listReports({ status: filters.status || undefined, category: filters.category || undefined }) } catch { reports.value = [] } }
const loadMetrics = async () => { try { metrics.value = await api.metrics() } catch { metrics.value = null } }

const open = async (id: string) => {
  try { selected.value = await api.getReport(id); statusForm.status = selected.value.status; statusForm.reason = ''; staffSeverityValue.value = selected.value.staffSeverity || ''; assigneeId.value = '' } catch { selected.value = null }
}

const refreshSelected = async () => { if (selected.value) await open(selected.value.id); await load(); await loadMetrics() }

const applyStatus = async () => { if (!selected.value) return; try { await api.changeStatus(selected.value.id, statusForm.status, statusForm.reason); await refreshSelected() } catch { /* validation message shown via native alert fallback */ } }
const applyStaffSeverity = async () => { if (!selected.value || !staffSeverityValue.value) return; try { await api.setStaffSeverity(selected.value.id, staffSeverityValue.value); await refreshSelected() } catch { /* keep state */ } }
const applyAssign = async () => { if (!selected.value) return; try { await api.assign(selected.value.id, assigneeId.value); await refreshSelected() } catch { /* keep state */ } }
const sendReply = async () => { if (!selected.value || !replyText.value.trim()) return; try { await api.reply(selected.value.id, replyText.value); replyText.value = ''; await refreshSelected() } catch { /* keep state */ } }
const sendNote = async () => { if (!selected.value || !noteText.value.trim()) return; try { await api.internalNote(selected.value.id, noteText.value); noteText.value = ''; await refreshSelected() } catch { /* keep state */ } }
const recordEligibility = async () => {
  if (!selected.value) return
  try { await api.recordRewardEligibility(selected.value.id, rewardForm.betaCycleId, rewardForm.justification); rewardFeedback.value = 'Elegibilidade registrada.'; rewardForm.justification = '' }
  catch { rewardFeedback.value = 'Nao foi possivel registrar -- revise ciclo e justificativa.' }
}

onMounted(async () => { await load(); await loadMetrics() })
useSeoMeta({ title: 'Bug Hunters -- Triagem' })
</script>
